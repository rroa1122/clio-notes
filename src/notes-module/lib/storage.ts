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
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    diagnoses?: string | null;

    // New Fields
    ssn?: string | null;
    address?: string | null;
    citizenship?: string | null;
    case_manager?: string | null;
    insurance_company?: string | null;

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('[Storage] getNotes called without authenticated user.');
                return [];
            }

            // Fast path: use cached clinicId if available
            let clinicId = cachedClinicId;
            if (!clinicId) {
                // Try RPC first (faster on server-side RLS context)
                const { data: cid } = await supabase.rpc('get_my_clinic_id');
                if (cid) {
                    clinicId = cid;
                    cachedClinicId = clinicId;
                } else {
                    // Fallback to profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('clinic_id')
                        .eq('id', user.id)
                        .single();
                    clinicId = profile?.clinic_id || null;
                    if (clinicId) cachedClinicId = clinicId;
                }
            }

            // Fetch only necessary columns or a slimmed down version if performance is an issue
            // For now, since we store everything in 'content', we fetch '*'
            let query = supabase.from('notes').select('*');

            // Option 1 Approach: Independent Case Manager sees ALL their notes regardless of clinic
            query = query.eq('user_id', user.id);

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(100); // Reasonable limit for history

            if (error) throw error;

            // Map database columns back to our Note interface
            // Content column stores the entire JSON structure
            return data.map((row: any) => ({
                ...row.content,
                // Ensure ID matches the row ID just in case
                id: row.id,
                created_at: row.created_at, // Include for History fallback
                signature_status: row.signature_status,
                signature_data: row.signature_data,
                supervisor_email: row.supervisor_email
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("Cannot save note: No user logged in.");
                return;
            }

            // Get Clinic ID for Multi-Tenancy
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            // Upsert into Supabase with clinic_id
            const { error } = await supabase
                .from('notes')
                .upsert({
                    id: note.id,
                    user_id: user.id,
                    clinic_id: profile?.clinic_id, // Link to clinic
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
                        description: `Guardó/Modificó la nota clínica del paciente ${patientName}`,
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user");

            const fingerprint = await computeFingerprint(noteData);

            // Get Clinic ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            const noteId = noteData.id || crypto.randomUUID();
            const { error } = await supabase
                .from('notes')
                .upsert({
                    id: noteId,
                    user_id: user.id,
                    clinic_id: profile?.clinic_id,
                    content: noteData,
                    patient_id: noteData.patient_id,
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
                    description: `Generó/Guardó nota clínica analizada para el paciente ${patientName}`,
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
        if (cachedClinicId) return cachedClinicId;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            if (profile?.clinic_id) {
                cachedClinicId = profile.clinic_id;
            }
            return profile?.clinic_id || null;
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
                        description: `Eliminó la nota clínica del paciente ${patientName}`,
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return DEFAULT_TEMPLATES;

            // Get Clinic ID for scoping
            let clinicId = cachedClinicId;
            if (!clinicId) {
                const { data: cid } = await supabase.rpc('get_my_clinic_id');
                clinicId = cid || null;
                if (clinicId) cachedClinicId = clinicId;
            }

            if (!clinicId) {
                // Fallback to profile check if RPC fails
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single();
                clinicId = profile?.clinic_id || null;
            }

            // Build inclusive query: Show if (clinic matches OR is public OR is user's own)
            let baseQuery = supabase.from('templates').select('*');

            // --- IMPROVED RESILIENCE: Wait for clinicId if we know we are signed in ---
            if (!clinicId) {
                console.log('[Storage] clinicId missing, attempting resolution...');
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single();
                clinicId = profile?.clinic_id || null;
                if (clinicId) cachedClinicId = clinicId;
            }

            let filterString = `user_id.eq.${user.id},is_public.eq.true`;
            if (clinicId) {
                filterString += `,clinic_id.eq.${clinicId}`;
            } else {
                // If we STILL don't have it, we might be in a race.
                // We'll proceed but this is why we get empty results有时.
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
                        .eq('id', user.id)
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Clinic ID for Multi-Tenancy (Resilient fetch)
            let clinicId = cachedClinicId;
            if (!clinicId) {
                const { data: cid } = await supabase.rpc('get_my_clinic_id');
                if (cid) {
                    clinicId = cid;
                    cachedClinicId = clinicId;
                } else {
                    // Fallback to profile check if RPC fails or isn't created yet
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('clinic_id')
                        .eq('id', user.id)
                        .single();
                    clinicId = profile?.clinic_id || null;
                    if (clinicId) cachedClinicId = clinicId;
                }
            }

            const upsertData = templates.map(t => ({
                id: t.id,
                name: t.name,
                version: t.version,
                category: t.category,
                content: t.content,
                definition: t.definition,
                user_id: user.id,
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("No authenticated user");
            }

            // Get Clinic ID for Multi-Tenancy (Resilient fetch)
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
                        .eq('id', user.id)
                        .single();
                    clinicId = profile?.clinic_id || null;
                    if (clinicId) cachedClinicId = clinicId;
                }
            }

            const upsertData = {
                id: template.id,
                name: template.name,
                version: template.version,
                category: template.category,
                content: template.content,
                definition: template.definition,
                user_id: user.id,
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
            let query = supabase
                .from('patients')
                .select('*')
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
            const { data, error } = await supabase
                .from('patients')
                .select('*')
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
                        description: `Eliminó el expediente del paciente ${patientName} (ID: ${patientId})`,
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
                    description: `Eliminó el expediente del paciente ${patientName} (ID: ${patientId})`,
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user");

            // Get Clinic ID for Multi-Tenancy (Resilient fetch)
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
                        .eq('id', user.id)
                        .single();
                    clinicId = profile?.clinic_id || null;
                    if (clinicId) cachedClinicId = clinicId;
                }
            }

            // [LOGIC] Check if patient exists by name if no ID is provided to prevent duplicates
            let targetId = patient.id;
            if (!targetId && patient.full_name) {
                const { data: existing } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('full_name', patient.full_name)
                    .eq('clinic_id', clinicId)
                    .is('deleted_at', null)
                    .maybeSingle();
                
                if (existing) {
                    targetId = existing.id;
                    console.log(`[Storage] Matching patient found by name: ${patient.full_name} (${targetId})`);
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
                    user_id: user.id,
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
                    description: `${isUpdate ? 'Modificó' : 'Creó'} el expediente del paciente ${data.full_name}`,
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
