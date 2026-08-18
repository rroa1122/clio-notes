/**
 * Human-friendly error translation and categorization service for Amexzone / EHR synchronization.
 */

export interface FormattedSyncError {
    category: 'billing' | 'auth' | 'system' | 'validation';
    categoryLabel: string;
    title: string;
    description: string;
    actionHint: string;
    isRetryable: boolean;
    rawError: string;
}

export function formatSyncError(rawError?: string | null): FormattedSyncError {
    const errorStr = (rawError || '').trim();

    if (!errorStr) {
        return {
            category: 'system',
            categoryLabel: 'Error Desconocido',
            title: 'Fallo de Sincronización',
            description: 'Ocurrió un error no especificado durante la comunicación con Amexzone.',
            actionHint: 'Intenta sincronizar nuevamente. Si el problema persiste, contacta a soporte.',
            isRetryable: true,
            rawError: ''
        };
    }

    const lower = errorStr.toLowerCase();

    // 1. Unidades Aprobadas / Facturación (Approved Units)
    if (lower.includes('no approved units') || lower.includes('unidades aprobadas') || lower.includes('non-billable') || lower.includes('units for progress note')) {
        return {
            category: 'billing',
            categoryLabel: 'Facturación / Unidades',
            title: 'Sin Unidades Aprobadas en Amexzone',
            description: 'Amexzone rechazó el registro porque el paciente no tiene Unidades Aprobadas (Approved Units) vigentes para la fecha del servicio.',
            actionHint: 'Verifica y renueva las unidades autorizadas en el perfil del paciente dentro de Amexzone, o comunícate con el equipo de facturación.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 2. Paciente no encontrado / EMR ID inválido
    if (lower.includes('paciente no encontrado') || lower.includes('patient not found') || lower.includes('no se encontró al paciente')) {
        return {
            category: 'validation',
            categoryLabel: 'Validación de Paciente',
            title: 'Paciente no encontrado en Amexzone',
            description: 'El bot no pudo localizar el expediente de este paciente con el nombre o ID registrado.',
            actionHint: 'Asegúrate de que el paciente esté registrado en Amexzone y que su nombre o EMR ID coincidan exactamente con Clio.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 3. Sesión Bloqueada / Abierta en otra pestaña
    if (lower.includes('otra pestaña') || lower.includes('another tab') || lower.includes('session lock') || lower.includes('bloqueado')) {
        return {
            category: 'system',
            categoryLabel: 'Sesión Concurrente',
            title: 'Expediente Bloqueado en Amexzone',
            description: 'El expediente del paciente está abierto en otra pestaña o dispositivo dentro de Amexzone.',
            actionHint: 'Cierra cualquier otra pestaña abierta con este paciente en tu navegador y vuelve a presionar Sincronizar.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 4. Credenciales / PIN / Autenticación / 2FA
    if (lower.includes('pin') || lower.includes('password') || lower.includes('código de acceso') || lower.includes('2fa') || lower.includes('mfa') || lower.includes('login')) {
        return {
            category: 'auth',
            categoryLabel: 'Acceso y Credenciales',
            title: 'Verificación de Acceso Requerida',
            description: 'Amexzone solicitó confirmación de credenciales, PIN de seguridad o verificación en dos pasos (2FA).',
            actionHint: 'Dirígete al Portal de Sincronización (/sync) para verificar tu PIN o confirmar el código de seguridad recibido.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 5. Cita / Encuentro duplicado o conflicto explícito de horario
    if (lower.includes('already exist') || lower.includes('ya existe') || lower.includes('conflicto de horario') || lower.includes('cita duplicada') || lower.includes('overlapping appointment')) {
        return {
            category: 'validation',
            categoryLabel: 'Validación de Citas',
            title: 'Conflicto en Calendario de Amexzone',
            description: 'Amexzone detectó una cita previa registrada o un conflicto de horario para la fecha seleccionada.',
            actionHint: 'Revisa las citas en el perfil de Amexzone para asegurarte de que no haya un encuentro duplicado en el mismo rango horario.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 6. Timeout / Elemento no encontrado / Conexión lenta
    if (lower.includes('timeout') || lower.includes('exceeded') || lower.includes('navigation timeout') || lower.includes('waiting for locator')) {
        return {
            category: 'system',
            categoryLabel: 'Tiempo de Espera',
            title: 'Tiempo de Espera Agotado en Amexzone',
            description: 'Amexzone tardó más de lo esperado en responder o la página tardó en cargar sus componentes.',
            actionHint: 'Los servidores de Amexzone pueden estar lentos en este momento. Presiona "Reintentar" para volver a procesar.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // Default Fallback
    return {
        category: 'system',
        categoryLabel: 'Aviso del Sistema',
        title: 'Error de Sincronización',
        description: errorStr.length > 200 ? `${errorStr.substring(0, 197)}...` : errorStr,
        actionHint: 'Verifica los detalles en el Portal de Sincronización o presiona Reintentar para intentarlo nuevamente.',
        isRetryable: true,
        rawError: errorStr
    };
}
