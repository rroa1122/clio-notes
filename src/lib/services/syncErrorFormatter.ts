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
    suggestedTime?: string;
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

    // Extract suggested time if present
    let suggestedTime: string | undefined = undefined;
    let suggestedEndTime: string | undefined = undefined;
    const sugMatch = errorStr.match(/\[SUGGESTED_TIME:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)\]/i) ||
                     errorStr.match(/Horario libre recomendado en Amexzone:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)(?:\s*(?:a|-)\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?))?/i) ||
                     errorStr.match(/Horario disponible recomendado en Amexzone:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)(?:\s*(?:a|-)\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?))?/i) ||
                     errorStr.match(/sugerencia(?:\s+de\s+horario)?:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)/i);
    if (sugMatch) {
        suggestedTime = sugMatch[1].trim();
        if (sugMatch[2]) suggestedEndTime = sugMatch[2].trim();
    } else {
        // Fallback: Extract end time from collision string (e.g., "de 04:22 PM a 05:19 PM") and round up to next standard 5-min interval
        const collisionMatch = errorStr.match(/(?:de\s+[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?\s*(?:a|-)\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)|hasta\s+(?:las\s+)?([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?))/i);
        const colEnd = collisionMatch ? (collisionMatch[1] || collisionMatch[2]) : null;
        if (colEnd) {
            const matchTime = colEnd.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (matchTime) {
                let h = parseInt(matchTime[1], 10);
                const m = parseInt(matchTime[2], 10);
                const mer = (matchTime[3] || 'PM').toUpperCase();
                let totalMins = (h % 12) * 60 + m;
                if (mer === 'PM') totalMins += 12 * 60;
                
                // Add 3-5 min margin and round up to next multiple of 5
                const nextSafeMins = Math.ceil((totalMins + 3) / 5) * 5;
                let newH = Math.floor(nextSafeMins / 60) % 24;
                const newM = nextSafeMins % 60;
                const newMer = newH >= 12 ? 'PM' : 'AM';
                let newH12 = newH % 12;
                if (newH12 === 0) newH12 = 12;

                suggestedTime = `${String(newH12).padStart(2, '0')}:${String(newM).padStart(2, '0')} ${newMer}`;
            }
        }
    }

    // Clean display error string (strip [SUGGESTED_TIME: ...], [SERVICE_INDEX: ...])
    const cleanDisplayError = errorStr
        .replace(/\[SUGGESTED_TIME:[^\]]+\]/gi, '')
        .replace(/\[SERVICE_INDEX:[^\]]+\]/gi, '')
        .trim();

    // 0. Horario Ocupado / Superposición de Horario / Conflicto
    if (lower.includes('conflicto') || lower.includes('superposici') || lower.includes('overlap') || lower.includes('horario no permitido') || lower.includes('existe un servicio')) {
        const svcMatch = errorStr.match(/\[SERVICE_INDEX:(\d+)\]/i);
        const svcNum = svcMatch ? parseInt(svcMatch[1], 10) + 1 : null;
        
        // Extract service name in collision e.g. "En el Servicio #3 (Submit STS)"
        const mySvcNameMatch = errorStr.match(/En el Servicio #\d+\s*\(([^)]+)\)/i);
        const mySvcName = mySvcNameMatch ? mySvcNameMatch[1].trim() : '';

        // Extract colliding patient and service: "Existe un servicio (Educate Freebee transport link) de Esneldo Gomez Gomez de 05:29 PM a 06:27 PM"
        const colDetailsMatch = errorStr.match(/Existe un servicio\s*(?:\(([^)]+)\))?\s*de\s+([A-Za-zÁ-ÿ\s]+?)\s+de\s+([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)\s*(?:a|-)\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)/i);

        let friendlyDescription = '';
        if (colDetailsMatch) {
            const collidedService = colDetailsMatch[1]?.trim();
            const collidedPatient = colDetailsMatch[2]?.trim();
            const colStart = colDetailsMatch[3]?.trim();
            const colEnd = colDetailsMatch[4]?.trim();

            const svcPrefix = svcNum ? `El Servicio #${svcNum}${mySvcName ? ` (${mySvcName})` : ''}` : 'Este servicio';
            friendlyDescription = `${svcPrefix} no se puede guardar a esa hora porque en Amexzone ya existe una cita agendada para ${collidedPatient ? `"${collidedPatient}"` : 'otro paciente'}${collidedService ? ` (${collidedService})` : ''} de ${colStart} a ${colEnd}.`;
        } else {
            friendlyDescription = 'Amexzone rechazó el servicio debido a que el horario seleccionado coincide con otra cita ya agendada en tu calendario.';
        }

        const titleText = svcNum 
            ? `Horario Ocupado en Amexzone (Servicio #${svcNum}${mySvcName ? `: ${mySvcName}` : ''})`
            : 'Horario Ocupado en Amexzone';

        return {
            category: 'validation',
            categoryLabel: 'Conflicto de Horario',
            title: titleText,
            description: friendlyDescription,
            actionHint: suggestedTime 
                ? `Amexzone detectó que el horario libre disponible es a las ${suggestedTime}. Haz clic en el botón morado para aplicarlo automáticamente.`
                : 'Modifica la hora del servicio en Clio para seleccionar un horario libre y vuelve a sincronizar.',
            isRetryable: true,
            suggestedTime,
            rawError: errorStr
        };
    }

    // 1. Unidades Aprobadas / Facturación (Approved Units)
    if (lower.includes('no approved units') || lower.includes('unidades aprobadas') || lower.includes('non-billable') || lower.includes('units for progress note') || lower.includes('no tiene unidades')) {
        return {
            category: 'billing',
            categoryLabel: 'Facturación / Unidades',
            title: 'Sin Unidades Aprobadas en Amexzone',
            description: 'Amexzone indica que este paciente no cuenta con unidades aprobadas (Approved Units) vigentes para la fecha del servicio.',
            actionHint: 'Modifica la fecha de la visita en Clio a un día donde el paciente tenga unidades vigentes, o renueva las unidades autorizadas en Amexzone.',
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
            description: 'El bot no pudo localizar el expediente de este paciente en Amexzone con el nombre o ID registrado.',
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
            title: 'Expediente Abierto en otra Ventana',
            description: 'Amexzone bloqueó el acceso porque la ficha de este paciente está abierta en otra pestaña o dispositivo.',
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
            title: 'Verificación de PIN Requerida',
            description: 'Amexzone solicitó confirmación de tu PIN de seguridad o clave de acceso.',
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
            title: 'Cita ya Existente en Amexzone',
            description: 'Amexzone detectó que ya existe una cita previamente registrada para este paciente en el mismo horario.',
            actionHint: 'Revisa las citas en el perfil de Amexzone para asegurarte de no duplicar el encuentro.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // 6. Timeout / Elemento no encontrado / Conexión lenta
    if (lower.includes('timeout') || lower.includes('exceeded') || lower.includes('navigation timeout') || lower.includes('waiting for locator')) {
        return {
            category: 'system',
            categoryLabel: 'Tiempo de Espera',
            title: 'Tiempo de Espera Agotado',
            description: 'Los servidores de Amexzone tardaron más de lo esperado en responder.',
            actionHint: 'Presiona "Reintentar" para volver a enviar la nota.',
            isRetryable: true,
            rawError: errorStr
        };
    }

    // Default Fallback
    return {
        category: 'system',
        categoryLabel: 'Aviso de Sincronización',
        title: 'Detalle de Sincronización',
        description: errorStr.length > 200 ? `${errorStr.substring(0, 197)}...` : errorStr,
        actionHint: 'Verifica los detalles o presiona Reintentar para intentarlo nuevamente.',
        isRetryable: true,
        rawError: errorStr
    };
}
