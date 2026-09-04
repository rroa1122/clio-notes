import { supabase } from '../../lib/supabaseClient';
import type {
    Note,
    NoteSection,
    NoteSections,
    StructuredNote,
    Template,
    AppSettings
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from './constants';

let cachedClinicId: string | null = null;
let isBootstrapping = false;

export type { Note, NoteSection, NoteSections, StructuredNote, Template, AppSettings };


export interface Patient {
    id: string;
    user_id: string;
    clinic_id?: string | null;
    full_name: string;
    first_name?: string | null;
    last_name?: string | null;
    dob?: string | null;
    phone?: string | null;
    email?: string | null;
    gender?: string | null;
    emr_id?: string | null;
    amexzone_id?: string | null;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    diagnoses?: string | null;
    allergies?: string | null;

    // New Fields
    ssn?: string | null;
    address?: string | null;
    citizenship?: string | null;
    case_manager?: string | null;
    insurance_company?: string | null;
    case_number?: string | null;

    // Contacto de Emergencia
    emergency_contact_name?: string | null;
    emergency_contact_relation?: string | null;
    emergency_contact_phone?: string | null;

    // Billing & Insurance
    insurance_id?: string | null;

    // Demografía Extendida
    race?: string | null;
    ethnicity?: string | null;
    preferred_language?: string | null;

    // Preferred Pharmacy
    pharmacy_name?: string | null;
    pharmacy_phone?: string | null;
    pharmacy_fax?: string | null;
    pharmacy_address?: string | null;

    // PCP Coordination
    pcp_name?: string | null;
    pcp_clinic_name?: string | null;
    pcp_phone?: string | null;
    pcp_address?: string | null;
    pcp_conditions?: string | null;
    pcp_medications?: string | null;

    // Psychiatric Coordination
    psych_name?: string | null;
    psych_phone?: string | null;
    psych_address?: string | null;
    psych_conditions?: string | null;
    psych_medications?: string | null;

    // Clinical Intake
    presenting_problems?: string | null;

    // TCM Social Needs
    tcm_social_needs?: Record<string, any> | null;
    otc_benefit?: Record<string, any> | null;
}

/**
 * Generates a deterministic fingerprint for a note to prevent duplicates.
 */
async function computeFingerprint(data: any): Promise<string> {
    // Stable stringify: Sort keys to ensure same object always produces same string
    const stableStringify = (obj: any): string => {
        if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
        if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
        const keys = Object.keys(obj).sort();
        return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
    };

    const str = stableStringify(data);
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCurrentUserId(): Promise<string> {
    if (typeof window !== 'undefined') {
        const impersonatedId = sessionStorage.getItem('clio_impersonating_user_id');
        if (impersonatedId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email === 'reinier.roa2.0@gmail.com') {
                return impersonatedId;
            }
        }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");
    return user.id;
}

async function getCurrentClinicId(userId: string): Promise<string | null> {
    if (typeof window !== 'undefined') {
        const impersonatedId = sessionStorage.getItem('clio_impersonating_user_id');
        if (impersonatedId && userId === impersonatedId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', impersonatedId)
                .single();
            return profile?.clinic_id || null;
        }
    }
    
    let clinicId = cachedClinicId;
    if (!clinicId) {
        const { data: cid } = await supabase.rpc('get_my_clinic_id');
        if (cid) {
            clinicId = cid;
            cachedClinicId = clinicId;
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', userId)
                .single();
            clinicId = profile?.clinic_id || null;
            if (clinicId) cachedClinicId = clinicId;
        }
    }
    return clinicId;
}

export const storage = {
    getSettings: (): AppSettings => {
        const saved = localStorage.getItem('clio_settings');
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    },

    saveSettings: (settings: AppSettings) => {
        localStorage.setItem('clio_settings', JSON.stringify(settings));
    },

    // --- SUPABASE MIGRATION: NOTES ---

    getNotes: async (): Promise<Note[]> => {
        try {
            const userId = await getCurrentUserId();
            let clinicId = await getCurrentClinicId(userId);

            // Fetch only necessary columns or a slimmed down version if performance is an issue
            // For now, since we store everything in 'content', we fetch '*'
            let query = supabase.from('notes').select('*');

            // Option 1 Approach: Independent Case Manager sees ALL their notes regardless of clinic
            query = query.eq('user_id', userId);

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(100); // Reasonable limit for history

            if (error) throw error;

            // Fetch latest sync tasks for these notes
            const noteIds = (data || []).map((row: any) => row.id).filter(Boolean);
            const taskMap: Record<string, { status: string; error_message?: string }> = {};

            if (noteIds.length > 0) {
                try {
                    const { data: tasks } = await supabase
                        .from('amexzone_note_tasks')
                        .select('note_id, status, error_message, created_at')
                        .in('note_id', noteIds)
                        .order('created_at', { ascending: true });

                    if (tasks) {
                        tasks.forEach((t: any) => {
                            if (t.note_id) {
                                taskMap[t.note_id] = { status: t.status, error_message: t.error_message };
                            }
                        });
                    }
                } catch (taskErr) {
                    console.warn('Could not load sync tasks:', taskErr);
                }
            }

            // Map database columns back to our Note interface
            // Content column stores the entire JSON structure
            return data.map((row: any) => ({
                ...row.content,
                // Ensure ID matches the row ID just in case
                id: row.id,
                created_at: row.created_at, // Include for History fallback
                signature_status: row.signature_status,
                signature_data: row.signature_data,
                supervisor_email: row.supervisor_email,
                sync_status: taskMap[row.id]?.status || row.content?.sync_status || (row.signature_status === 'signed' ? 'completed' : 'pending'),
                sync_error: taskMap[row.id]?.error_message || row.content?.sync_error
            })) || [];
        } catch (e) {
            console.error('Supabase fetch exception:', e);
            return [];
        }
    },

    getNotesCount: async (userId: string): Promise<number> => {
        try {
            const { count, error } = await supabase
                .from('notes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) throw error;
            return count || 0;
        } catch (e) {
            console.error('Supabase fetch count exception:', e);
            return 0;
        }
    },

    getNotesByPatient: async (patientId: string): Promise<Note[]> => {
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map((row: any) => ({
                ...row.content,
                id: row.id,
                created_at: row.created_at,
                patient_id: row.patient_id,
                signature_status: row.signature_status,
                signature_data: row.signature_data,
                supervisor_email: row.supervisor_email
            })) || [];
        } catch (e) {
            console.error('getNotesByPatient exception:', e);
            return [];
        }
    },

    getNote: async (id: string): Promise<Note | null> => {
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) return null;
            return {
                ...data.content,
                id: data.id,
                created_at: data.created_at,
                signature_status: data.signature_status,
                signature_data: data.signature_data,
                supervisor_email: data.supervisor_email
            } as Note;
        } catch (e) {
            console.error('Supabase getNote exception:', e);
            return null;
        }
    },

    getLastNoteId: (): string | null => {
        return localStorage.getItem('lastNoteId');
    },

    saveNote: async (note: Note) => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            // Upsert into Supabase with clinic_id
            const { error } = await supabase
                .from('notes')
                .upsert({
                    id: note.id,
                    user_id: userId,
                    clinic_id: clinicId, // Link to clinic
                    content: note, // Store the whole object as JSONB
                    patient_id: (note as any).patient_id,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error saving note to Supabase:', error);
            } else {
                // Registrar log de auditoría
                try {
                    const patientId = (note as any).patient_id;
                    let patientName = 'Desconocido';
                    if (patientId) {
                        const p = await storage.getPatient(patientId);
                        if (p) patientName = p.full_name;
                    }
                    const { auditService } = await import('../../services/auditService');
                    await auditService.logAction({
                        action: 'UPDATE',
                        description: `Saved/Modified clinical note for patient ${patientName}`,
                        targetType: 'note',
                        targetId: note.id
                    });
                } catch (auditErr) {
                    console.error('Error writing audit log for saveNote:', auditErr);
                }
            }

            // Still save last ID locally for convenience
            localStorage.setItem('lastNoteId', note.id);

        } catch (e) {
            console.error('Supabase saveNote exception:', e);
        }
    },

    saveAnalyzedNote: async (noteData: any) => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            const fingerprint = await computeFingerprint(noteData);

            let noteId = noteData.id;
            const patientId = noteData.patient_id || noteData.patient?.id;
            const dosDate = noteData.encounter?.dos_date || noteData.joint_services?.[0]?.encounter?.dos_date || noteData.meta?.visitDate;

            // If no explicit ID is provided, look for an existing note matching patient + dos_date + user to prevent duplicates
            if (!noteId && patientId && dosDate && userId) {
                try {
                    const { data: existingRows } = await supabase
                        .from('notes')
                        .select('id, content')
                        .eq('user_id', userId)
                        .eq('patient_id', patientId)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (existingRows && existingRows.length > 0) {
                        for (const row of existingRows) {
                            const existingDos = row.content?.encounter?.dos_date || row.content?.joint_services?.[0]?.encounter?.dos_date || row.content?.meta?.visitDate;
                            if (existingDos === dosDate) {
                                noteId = row.id;
                                break;
                            }
                        }
                    }
                } catch (findErr) {
                    console.error('Error finding existing note to prevent duplication:', findErr);
                }
            }

            if (!noteId) {
                noteId = crypto.randomUUID();
            }

            noteData.id = noteId;
            const { error } = await supabase
                .from('notes')
                .upsert({
                    id: noteId,
                    user_id: userId,
                    clinic_id: clinicId,
                    content: noteData,
                    patient_id: patientId || null,
                    fingerprint: fingerprint,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            // Registrar log de auditoría
            try {
                let patientName = 'Desconocido';
                if (noteData.patient_id) {
                    const p = await storage.getPatient(noteData.patient_id);
                    if (p) patientName = p.full_name;
                }
                const { auditService } = await import('../../services/auditService');
                await auditService.logAction({
                    action: 'CREATE',
                    description: `Generated/Saved analyzed clinical note for patient ${patientName}`,
                    targetType: 'note',
                    targetId: noteId
                });
            } catch (auditErr) {
                console.error('Error writing audit log for saveAnalyzedNote:', auditErr);
            }

            return { success: true, fingerprint, id: noteId };
        } catch (e: any) {
            console.error('saveAnalyzedNote error:', e);
            throw e;
        }
    },

    getClinicId: async (): Promise<string | null> => {
        try {
            const userId = await getCurrentUserId();
            return await getCurrentClinicId(userId);
        } catch (e) {
            console.error('getClinicId error:', e);
            return null;
        }
    },

    seedTemplatesBySpecialty: async (specialty: string) => {
        console.log(`[Storage] Skipping seeding for provider (Centralized Model enabled)`);
        localStorage.setItem('clio_templates_seeded_v1', 'true');
    },

    deleteNote: async (id: string) => {
        try {
            // Obtener detalles del paciente para la traza antes de eliminar
            const note = await storage.getNote(id);
            let patientName = 'Desconocido';
            if (note && (note as any).patient_id) {
                const p = await storage.getPatient((note as any).patient_id);
                if (p) patientName = p.full_name;
            }

            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Error deleting note:", error);
            } else {
                // Registrar log de auditoría
                try {
                    const { auditService } = await import('../../services/auditService');
                    await auditService.logAction({
                        action: 'DELETE',
                        description: `Deleted clinical note for patient ${patientName}`,
                        targetType: 'note',
                        targetId: id
                    });
                } catch (auditErr) {
                    console.error('Error writing audit log for deleteNote:', auditErr);
                }
            }
        } catch (e) {
            console.error('Supabase deleteNote exception:', e);
        }
    },

    getTemplates: async (): Promise<Template[]> => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            // Build inclusive query: Show if (clinic matches OR is public OR is user's own)
            let baseQuery = supabase.from('templates').select('*');

            let filterString = `user_id.eq.${userId},is_public.eq.true`;
            if (clinicId) {
                filterString += `,clinic_id.eq.${clinicId}`;
            } else {
                // If we STILL don't have it, we might be in a race.
                // We'll proceed but this is why we get empty results sometimes.
                filterString += `,clinic_id.is.null`;
                console.warn('[Storage] Fetching templates without clinicId context');
            }

            const { data, error } = await baseQuery
                .or(filterString)
                .order('name', { ascending: true });


            if (error) {
                console.error('Error fetching templates:', error);
                throw error; // Propagate error so UI can show it
            }


            if (!data || data.length === 0) {
                // Only seed if this is truly the first time (check localStorage flag)
                const hasSeeded = localStorage.getItem('clio_templates_seeded_v1');
                if (!hasSeeded) {
                    console.log('No templates found and never seeded, seeking specialty for seeding...');
                    // Try to get specialty from profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', userId)
                        .single();

                    if (profile?.role) {
                        await storage.seedTemplatesBySpecialty(profile.role);
                        // Refresh data
                        return storage.getTemplates();
                    }

                    console.log('No specialty found, marking seeding finished...');
                    localStorage.setItem('clio_templates_seeded_v1', 'true');
                    return [];
                }
                return [];
            }

            const mappedData = data.map((row: any) => ({
                id: row.id,
                version: row.version,
                name: row.name,
                category: row.category,
                description: row.description,
                thumbnail: row.thumbnail,
                user_id: row.user_id,
                clinic_id: row.clinic_id,
                content: row.content,
                definition: row.definition,
                is_public: row.is_public,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

            // De-duplicate by name, prioritizing global master templates (public + no user_id or specific user_id)
            const uniqueTemplates: Record<string, Template> = {};
            mappedData.forEach(t => {
                const existing = uniqueTemplates[t.name];
                // Prioritize master templates over any residual personal ones
                if (!existing || t.is_public) {
                    uniqueTemplates[t.name] = t;
                }
            });

            return Object.values(uniqueTemplates);
        } catch (e) {
            console.error('getTemplates exception:', e);
            return DEFAULT_TEMPLATES;
        }
    },

    saveTemplates: async (templates: Template[]) => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            const upsertData = templates.map(t => ({
                id: t.id,
                name: t.name,
                version: t.version,
                category: t.category,
                content: t.content,
                definition: t.definition,
                user_id: userId,
                clinic_id: clinicId, // Ensure clinic_id is always present
                is_public: t.is_public ?? true,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('templates')
                .upsert(upsertData);

            if (error) {
                console.error('Error saving templates to Supabase:', error);
                throw error;
            }

            // Mark as seeded if we just saved defaults or any templates
            localStorage.setItem('clio_templates_seeded_v1', 'true');

            // Also save locally as a cache (optional but good for offline/perf)
            localStorage.setItem('clio_templates', JSON.stringify(templates));
        } catch (e: any) {
            console.error('saveTemplates exception:', e);
            throw e; // Re-throw so UI can handle it
        }
    },

    saveTemplate: async (template: Template) => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            const upsertData = {
                id: template.id,
                name: template.name,
                version: template.version,
                category: template.category,
                content: template.content,
                definition: template.definition,
                user_id: userId,
                clinic_id: clinicId,
                is_public: template.is_public ?? false,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('templates')
                .upsert(upsertData);

            if (error) {
                console.error('Error saving template to Supabase:', error);
                throw error;
            }

            // Update local cache
            const saved = localStorage.getItem('clio_templates');
            if (saved) {
                const existing: Template[] = JSON.parse(saved);
                const updated = existing.map(t => t.id === template.id ? template : t);
                if (!existing.some(t => t.id === template.id)) {
                    updated.push(template);
                }
                localStorage.setItem('clio_templates', JSON.stringify(updated));
            }
        } catch (e) {
            console.error('saveTemplate exception:', e);
            throw e;
        }
    },

    deleteTemplate: async (id: string) => {
        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting template from Supabase:', error);
                throw error;
            }

            // Update local cache
            const saved = localStorage.getItem('clio_templates');
            if (saved) {
                const existing: Template[] = JSON.parse(saved);
                const updated = existing.filter(t => t.id !== id);
                localStorage.setItem('clio_templates', JSON.stringify(updated));
            }
        } catch (e) {
            console.error('deleteTemplate exception:', e);
            throw e;
        }
    },

    getActiveTemplateId: (): string => {
        return localStorage.getItem('clio_active_template_id') || 'tcm_progress_note';
    },


    setActiveTemplateId: (id: string) => {
        localStorage.setItem('clio_active_template_id', id);
    },

    // --- PATIENTS ---

    getPatients: async (options?: { limit?: number, offset?: number }): Promise<Patient[]> => {
        try {
            const userId = await getCurrentUserId();
            let query = supabase
                .from('patients')
                .select('*')
                .eq('user_id', userId)
                .is('deleted_at', null)
                .order('full_name', { ascending: true });

            if (options?.limit) query = query.limit(options.limit);
            if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('getPatients exception:', e);
            return [];
        }
    },

    getPatient: async (id: string): Promise<Patient | null> => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error('getPatient exception:', e);
            return null;
        }
    },

    searchPatients: async (queryText: string): Promise<Patient[]> => {
        try {
            const userId = await getCurrentUserId();
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', userId)
                .is('deleted_at', null)
                .or(`full_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,emr_id.ilike.%${queryText}%`)
                .order('full_name', { ascending: true })
                .limit(20);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('searchPatients exception:', e);
            return [];
        }
    },

    deletePatient: async (patientId: string): Promise<void> => {
        try {
            // Obtener el paciente antes de borrarlo para registrar su nombre
            const patient = await storage.getPatient(patientId);
            const patientName = patient?.full_name || 'Desconocido';

            // Try RPC first (bypasses RLS if configured)
            const { error: rpcError } = await supabase.rpc('delete_patient_secure', { patient_id: patientId });

            if (!rpcError) {
                // Registrar log de auditoría
                try {
                    const { auditService } = await import('../../services/auditService');
                    await auditService.logAction({
                        action: 'DELETE',
                        description: `Deleted patient chart for ${patientName} (ID: ${patientId})`,
                        targetType: 'patient',
                        targetId: patientId
                    });
                } catch (auditErr) {
                    console.error('Error writing audit log for deletePatient:', auditErr);
                }
                return;
            }

            // Fallback to direct update if RPC fails/doesn't exist
            console.warn("RPC delete failed, trying direct update:", rpcError);
            const { error } = await supabase
                .from('patients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', patientId);

            if (error) throw error;

            // Registrar log de auditoría
            try {
                const { auditService } = await import('../../services/auditService');
                await auditService.logAction({
                    action: 'DELETE',
                    description: `Deleted patient chart for ${patientName} (ID: ${patientId})`,
                    targetType: 'patient',
                    targetId: patientId
                });
            } catch (auditErr) {
                console.error('Error writing audit log for deletePatient:', auditErr);
            }
        } catch (e) {
            console.error('deletePatient exception:', e);
            throw e;
        }
    },

    upsertPatient: async (patient: Partial<Patient>): Promise<Patient | null> => {
        try {
            const userId = await getCurrentUserId();
            const clinicId = await getCurrentClinicId(userId);

            // [LOGIC] Check if patient exists by amexzone_id or name if no ID is provided to prevent duplicates
            let targetId = patient.id;
            if (!targetId) {
                if (patient.amexzone_id) {
                    const { data: existingByAmex } = await supabase
                        .from('patients')
                        .select('id')
                        .eq('amexzone_id', patient.amexzone_id)
                        .eq('user_id', userId)
                        .is('deleted_at', null)
                        .maybeSingle();
                    if (existingByAmex) {
                        targetId = existingByAmex.id;
                        console.log('[Storage] Existing patient match found by amexzone_id:', targetId);
                    }
                }
                if (!targetId && patient.full_name) {
                    const { data: existingByName } = await supabase
                        .from('patients')
                        .select('id')
                        .ilike('full_name', patient.full_name)
                        .eq('user_id', userId)
                        .is('deleted_at', null)
                        .maybeSingle();
                    if (existingByName) {
                        targetId = existingByName.id;
                        console.log('[Storage] Existing patient match found by full_name:', targetId);
                    }
                }
            }

            const isUpdate = !!targetId;

            // Prevent empty string date syntax errors in Postgres
            const sanitizedPatient = { ...patient };
            if (sanitizedPatient.dob === '') {
                sanitizedPatient.dob = null;
            }

            const { data, error } = await supabase
                .from('patients')
                .upsert({
                    ...sanitizedPatient,
                    id: targetId, // Use existing ID if found, or undefined (DB will generate)
                    user_id: userId,
                    clinic_id: clinicId,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase upsert error:", error);
                throw new Error(error.message || "Failed to save to database");
            }

            // Registrar log de auditoría
            try {
                const { auditService } = await import('../../services/auditService');
                await auditService.logAction({
                    action: isUpdate ? 'UPDATE' : 'CREATE',
                    description: `${isUpdate ? 'Modified' : 'Created'} patient chart for ${data.full_name}`,
                    targetType: 'patient',
                    targetId: data.id
                });
            } catch (auditErr) {
                console.error('Error writing audit log for upsertPatient:', auditErr);
            }

            return data;
        } catch (e: any) {
            console.error('upsertPatient exception:', e);
            throw new Error(e.message || "Internal saving error");
        }
    }
};
