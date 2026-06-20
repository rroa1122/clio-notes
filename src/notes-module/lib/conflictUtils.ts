import { ClioNote } from '../types';

export interface NormalizedTimeRange {
    provider: string;
    startAtISO: string | null;
    endAtISO: string | null;
    confidence: 'high' | 'low';
}

/**
 * Parses a 12h (AM/PM) or 24h time string into HH:mm format.
 */
export const parseTimeTo24h = (timeStr: string): string | null => {
    if (!timeStr || timeStr === '—') return null;

    // Handle AM/PM
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2];
        const ampm = ampmMatch[3].toUpperCase();

        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Handle HH:mm or HH:mm:ss
    const simpleMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (simpleMatch) {
        const hours = parseInt(simpleMatch[1]);
        const minutes = simpleMatch[2];
        if (hours >= 0 && hours < 24) {
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
    }

    return null;
};

/**
 * Normalizes a date and time string into an ISO string.
 * Assumes YYYY-MM-DD or MM/DD/YYYY format for date.
 */
export const toISO = (dateStr: string | null, timeStr: string | null): string | null => {
    if (!dateStr || !timeStr) return null;

    const time24 = parseTimeTo24h(timeStr);
    if (!time24) return null;

    try {
        let year = '';
        let month = '';
        let day = '';

        // Handle ISO-ish format (YYYY-MM-DD...)
        const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            [, year, month, day] = isoMatch;
        } else {
            // Handle MM/DD/YYYY
            const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (usMatch) {
                year = usMatch[3];
                month = usMatch[1].padStart(2, '0');
                day = usMatch[2].padStart(2, '0');
            }
        }

        if (!year || !month || !day) {
            // Fallback to Date if patterns fail, but beware of TZ
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            year = d.getFullYear().toString();
            month = (d.getMonth() + 1).toString().padStart(2, '0');
            day = d.getDate().toString().padStart(2, '0');
        }

        return `${year}-${month}-${day}T${time24}:00.000Z`;
    } catch (e) {
        return null;
    }
};

/**
 * Extracts provider and normalized time range from a ClioNote.
 * Handles both Standard and TCM structures.
 */
export const extractNormalizedTimeRange = (note: ClioNote): NormalizedTimeRange => {
    const getValidStr = (...args: (string | null | undefined)[]): string | null => {
        for (const arg of args) {
            if (arg && typeof arg === 'string' && arg.trim() !== '' && arg.trim() !== '—') {
                return arg.trim();
            }
        }
        return null;
    };

    let provider = '';
    let dateStr: string | null = null;
    let startTimeStr: string | null = null;
    let endTimeStr: string | null = null;

    // 1. Try Standard Note Paths
    provider = getValidStr(note.provider?.provider_name, note.meta?.provider) || '';
    dateStr = getValidStr(note.appointment?.date_of_service, note.meta?.visitDate, note.meta?.visit_date);
    startTimeStr = getValidStr(note.appointment?.start_time);
    endTimeStr = getValidStr(note.appointment?.end_time);

    // 2. Try TCM Note Paths (if standard failed or for TCM specific fields)
    if (note.meta?.template_id?.startsWith('tcm_')) {
        provider = getValidStr(provider, note.staff?.case_manager_name) || '';
        dateStr = getValidStr(dateStr, note.encounter?.dos_date);
        startTimeStr = getValidStr(startTimeStr, note.encounter?.time_in);
        endTimeStr = getValidStr(endTimeStr, note.encounter?.time_out);
    }

    const startAtISO = toISO(dateStr, startTimeStr);
    const endAtISO = toISO(dateStr, endTimeStr);

    const confidence = (provider && startAtISO && endAtISO) ? 'high' : 'low';

    return {
        provider,
        startAtISO,
        endAtISO,
        confidence
    };
};

/**
 * Checks if two time ranges overlap.
 * start_at < new_end_at AND end_at > new_start_at
 */
export const areOverlapping = (
    startA: string,
    endA: string,
    startB: string,
    endB: string
): boolean => {
    // Exclusion: if one range starts exactly when the other ends, it's NOT an overlap.
    return startA < endB && endA > startB;
};
