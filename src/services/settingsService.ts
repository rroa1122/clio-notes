import { supabase } from '../lib/supabaseClient';

export interface BusinessHours {
    start: string;
    end: string;
    closed: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    first_name: string;
    last_name: string;
    npi: string;
    professional_title: string;
    license_id: string;
    phone: string;
    signature_url: string;
    role: string;
    clinic_id?: string;
    setup_complete: boolean;
    subscription_tier?: string;
}

export interface ClinicSettings {
    id: string;
    clinicName: string;
    forwardingNumber: string;
    address: string;
    phone: string;
    fax: string;
    email: string;
    website: string;
    logoUrl: string;
    timezone: string;
    tax_id: string;
    npi_group: string;
    supervisorName?: string;
    supervisorLicense?: string;
    supervisorNpi?: string;
    supervisorSignatureUrl?: string;
    businessHours: Record<string, BusinessHours>;
    integrations: {
        ems: boolean;
        email: boolean;
    };
}

// Mock data for features not yet in DB
const DEFAULT_BUSINESS_HOURS: Record<string, BusinessHours> = {
    monday: { start: '09:00', end: '17:00', closed: false },
    tuesday: { start: '09:00', end: '17:00', closed: false },
    wednesday: { start: '09:00', end: '17:00', closed: false },
    thursday: { start: '09:00', end: '17:00', closed: false },
    friday: { start: '09:00', end: '16:00', closed: false },
    saturday: { start: '10:00', end: '14:00', closed: true },
    sunday: { start: '10:00', end: '14:00', closed: true },
};

const DEFAULT_INTEGRATIONS = {
    ems: false,
    email: true,
};

export const settingsService = {
    /**
     * Fetches clinical profile for the current user
     */
    async fetchProfile(userId: string): Promise<UserProfile | null> {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (!profile) return null;

            return {
                id: profile.id,
                email: profile.email || '',
                full_name: profile.full_name || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                npi: profile.npi || '',
                professional_title: profile.professional_title || '',
                license_id: profile.license_id || '',
                phone: profile.phone || '',
                signature_url: profile.signature_url || '',
                role: profile.role || 'doctor',
                clinic_id: profile.clinic_id,
                setup_complete: !!profile.setup_complete
            };
        } catch (err) {
            console.error('Error fetching profile:', err);
            throw err;
        }
    },

    /**
     * Updates profile fields in Supabase
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
        try {
            // Extract only editable professional fields to avoid Supabase/RLS conflicts with id/email
            const { id, email, clinic_id, setup_complete, ...editableFields } = updates;

            const { error } = await supabase
                .from('profiles')
                .update(editableFields)
                .eq('id', userId);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating profile:', err);
            throw err;
        }
    },

    /**
     * Fetches clinic settings, merging real DB data with mock operational data
     */
    async fetchSettings(clinicId: string): Promise<ClinicSettings | null> {
        try {
            const { data: clinic, error } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', clinicId)
                .single();

            if (error) throw error;
            if (!clinic) return null;

            // Map DB fields to UI model
            return {
                id: clinic.id,
                clinicName: clinic.name || '',
                forwardingNumber: clinic.phone || '', // Using phone as forwarding number for now
                phone: clinic.phone || '',
                fax: clinic.fax || '',
                email: clinic.email || '',
                address: clinic.address || '',
                website: clinic.website || '',
                logoUrl: '', // Column logo_url does not exist in clinics table
                timezone: clinic.settings?.timezone || 'UTC',
                tax_id: clinic.tax_id || '',
                npi_group: clinic.npi_group || '',
                supervisorName: clinic.settings?.supervisor_name || '',
                supervisorLicense: clinic.settings?.supervisor_license || '',
                supervisorNpi: clinic.settings?.supervisor_npi || '',
                supervisorSignatureUrl: clinic.settings?.supervisor_signature_url || '',
                // Hybrid: merge with mocks
                businessHours: DEFAULT_BUSINESS_HOURS,
                integrations: DEFAULT_INTEGRATIONS
            };
        } catch (err) {
            console.error('Error fetching settings:', err);
            throw err;
        }
    },

    /**
     * Updates real clinic fields in Supabase
     */
    async updateSettings(clinicId: string, settings: Partial<ClinicSettings>): Promise<void> {
        try {
            // Extract only the fields that exist in the DB
            const dbUpdates: any = {};
            if (settings.clinicName !== undefined) dbUpdates.name = settings.clinicName;
            if (settings.phone !== undefined) dbUpdates.phone = settings.phone;
            if (settings.fax !== undefined) dbUpdates.fax = settings.fax;
            if (settings.email !== undefined) dbUpdates.email = settings.email;
            if (settings.address !== undefined) dbUpdates.address = settings.address;
            if (settings.website !== undefined) dbUpdates.website = settings.website;
            // logo_url column does not exist in clinics table, skipping
            if (settings.tax_id !== undefined) dbUpdates.tax_id = settings.tax_id;
            if (settings.npi_group !== undefined) dbUpdates.npi_group = settings.npi_group;

            // Handle supervisor fields in JSONB settings for now as per Setup.tsx logic
            if (settings.supervisorName !== undefined || settings.supervisorLicense !== undefined || settings.supervisorNpi !== undefined || settings.supervisorSignatureUrl !== undefined || settings.timezone !== undefined) {
                // We need the current settings to merge
                const { data: current } = await supabase.from('clinics').select('settings').eq('id', clinicId).single();
                dbUpdates.settings = {
                    ...(current?.settings || {}),
                    ...(settings.supervisorName !== undefined && { supervisor_name: settings.supervisorName }),
                    ...(settings.supervisorLicense !== undefined && { supervisor_license: settings.supervisorLicense }),
                    ...(settings.supervisorNpi !== undefined && { supervisor_npi: settings.supervisorNpi }),
                    ...(settings.supervisorSignatureUrl !== undefined && { supervisor_signature_url: settings.supervisorSignatureUrl }),
                    ...(settings.timezone !== undefined && { timezone: settings.timezone })
                };
            }

            const { error } = await supabase
                .from('clinics')
                .update(dbUpdates)
                .eq('id', clinicId);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating settings:', err);
            throw err;
        }
    },

    /**
     * Creates new clinic settings for an independent case manager
     */
    async createSettings(userId: string, settings: Partial<ClinicSettings>): Promise<string> {
        try {
            const clinicPayload = {
                name: settings.clinicName || 'Independent Practice',
                phone: settings.phone || '',
                fax: settings.fax || '',
                email: settings.email || '',
                address: settings.address || '',
                website: settings.website || '',
                tax_id: settings.tax_id || '',
                npi_group: settings.npi_group || '',
                settings: {
                    timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    supervisor_name: settings.supervisorName || '',
                    supervisor_license: settings.supervisorLicense || '',
                    supervisor_npi: settings.supervisorNpi || '',
                    supervisor_signature_url: settings.supervisorSignatureUrl || ''
                }
            };

            const { data: newClinic, error: createError } = await supabase
                .from('clinics')
                .insert(clinicPayload)
                .select()
                .single();

            if (createError) throw createError;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ clinic_id: newClinic.id })
                .eq('id', userId);

            if (profileError) throw profileError;

            return newClinic.id;
        } catch (err) {
            console.error('Error creating settings:', err);
            throw err;
        }
    }
};
