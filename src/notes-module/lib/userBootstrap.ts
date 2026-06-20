import { supabase } from '../../lib/supabaseClient';

export interface BootstrapResult {
    profile: any;
    clinic: any;
    isNewUser: boolean;
}

/**
 * Ensures that for a given Auth User, a Profile and a Clinic exist.
 * - If profile missing -> create it.
 * - If clinic missing (and profile has no clinic) -> create default clinic and link.
 * - Sets setup_complete = false for new profiles.
 */
export async function ensureUserBootstrap(userId: string, email: string): Promise<BootstrapResult> {
    console.log(`[Bootstrap] Starting for user ${userId} (${email})`);

    try {
        // 1. Check existing profile
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('[Bootstrap] Error fetching profile:', profileError);
            throw profileError;
        }

        let isNewUser = false;
        let clinic = null;

        // 2. If no profile, create one
        if (!profile) {
            console.log('[Bootstrap] Profile not found. Creating new profile sequence.');
            isNewUser = true;

            // 2a. Create a new Clinic first (1-to-1 mapping for now for ease of bootstrapping)
            // In future, this could search for an invite code or existing org.
            const { data: newClinic, error: clinicError } = await supabase
                .from('clinics')
                .insert({
                    name: 'My Private Clinic',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
                })
                .select()
                .single();

            if (clinicError) {
                console.error('[Bootstrap] Failed to create default clinic:', clinicError);
                throw clinicError;
            }
            clinic = newClinic;

            // 2b. Create the Profile linked to this clinic
            const { data: newProfile, error: createProfileError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: email,
                    full_name: '', // Don't guess anymore
                    first_name: '',
                    last_name: '',
                    role: 'doctor', // Default role
                    clinic_id: newClinic.id,
                    setup_complete: false
                })
                .select()
                .single();

            if (createProfileError) {
                console.error('[Bootstrap] Failed to create profile:', createProfileError);
                throw createProfileError;
            }
            profile = newProfile;
            console.log('[Bootstrap] Successfully created profile and clinic.');

        } else {
            // 3. Profile exists - Ensure integrity (has clinic?)
            if (!profile.clinic_id) {
                console.warn('[Bootstrap] Profile exists but has no clinic_id. Fixing...');
                // Create backup clinic
                const { data: newClinic, error: clinicError } = await supabase
                    .from('clinics')
                    .insert({
                        name: 'My Backfilled Clinic',
                        timezone: 'UTC'
                    })
                    .select()
                    .single();

                if (!clinicError && newClinic) {
                    await supabase
                        .from('profiles')
                        .update({ clinic_id: newClinic.id })
                        .eq('id', userId);
                    profile.clinic_id = newClinic.id;
                    clinic = newClinic;
                }
            } else {
                // Fetch existing clinic data for return
                const { data: existingClinic } = await supabase
                    .from('clinics')
                    .select('*')
                    .eq('id', profile.clinic_id)
                    .single();
                clinic = existingClinic;
            }
        }

        return {
            profile,
            clinic,
            isNewUser
        };

    } catch (e) {
        console.error('[Bootstrap] Critical failure:', e);
        throw e;
    }
}
