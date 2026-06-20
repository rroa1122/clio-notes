import { supabase } from '../lib/supabaseClient';

export interface AuditLogParams {
    action: 'ACCESS' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SIGN' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
    description: string;
    targetType?: 'patient' | 'note' | 'event' | 'auth' | 'template';
    targetId?: string;
}

// Caché en memoria para evitar consultas repetidas al perfil en la misma sesión
let cachedProfile: { full_name: string | null; clinic_id: string | null } | null = null;

export const auditService = {
    logAction: async ({ action, description, targetType, targetId }: AuditLogParams): Promise<void> => {
        try {
            // 1. Obtener el usuario autenticado
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let userName = user.email?.split('@')[0] || 'Trabajador';
            let clinicId: string | null = null;

            // 2. Intentar usar el perfil en caché o consultar la base de datos
            if (cachedProfile) {
                userName = cachedProfile.full_name || userName;
                clinicId = cachedProfile.clinic_id;
            } else {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, clinic_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    cachedProfile = {
                        full_name: profile.full_name,
                        clinic_id: profile.clinic_id
                    };
                    userName = profile.full_name || userName;
                    clinicId = profile.clinic_id;
                }
            }

            // 3. Insertar la traza en la base de datos
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                user_email: user.email || '',
                user_name: userName,
                action,
                description,
                target_type: targetType,
                target_id: targetId,
                clinic_id: clinicId
            });
        } catch (e) {
            console.error('Error al guardar log de auditoría:', e);
        }
    },

    clearCache: () => {
        cachedProfile = null;
    }
};
