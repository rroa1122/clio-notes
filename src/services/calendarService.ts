
import { supabase } from '../lib/supabaseClient';

// This interface represents the single source of truth for an event in the UI,
// mapped from the Supabase 'events' table.
export interface CalendarEvent {
    id: string;
    calendar_id: string;
    start_at: string;
    end_at: string;
    status: 'booked' | 'cancelled';
    approval_status: 'PENDING' | 'CONFIRMED';
    source: string;

    // Patient Information
    patient_id?: string;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_name?: string; // Legacy / Combined
    patient_dob?: string;
    patient_last4?: string;

    // Insurance Details
    insurance_carrier?: string;
    insurance_member_id?: string;

    // Additional Info
    visit_type?: string;
    cancel_reason?: string;
    external_ref?: string;
    created_at: string;
    updated_at: string;

    // Approval Details
    created_by_name?: string;
    confirmed_at?: string;
    confirmed_by?: string;
}

/**
 * Maps a raw Supabase database row to our unified CalendarEvent interface.
 */
export function mapSupabaseToCalendarEvent(row: any): CalendarEvent {
    if (!row) return {} as CalendarEvent;

    // Split name if first/last aren't explicitly in DB but name is
    let firstName = row.patient_first_name;
    let lastName = row.patient_last_name;

    if (!firstName && row.patient_name) {
        const parts = row.patient_name.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }

    return {
        id: row.id,
        calendar_id: row.calendar_id,
        start_at: row.start_at,
        end_at: row.end_at,
        status: row.status,
        approval_status: row.approval_status || 'CONFIRMED',
        source: row.source,

        // Patient
        patient_id: row.patient_id,
        patient_first_name: firstName || '',
        patient_last_name: lastName || '',
        patient_name: row.patient_name || row.patient_id || `${firstName || ''} ${lastName || ''}`.trim(),
        patient_dob: row.patient_dob || row.dob, // Swap order to prioritize specialized clinical column
        patient_last4: row.patient_phone_last4 || row.patient_last4,

        // Insurance
        insurance_carrier: row.insurance || row.insurance_carrier,
        insurance_member_id: row.member_id || row.insurance_member_id,

        // Info
        visit_type: row.visit_type || (row.source === 'ai_voice' ? 'Automated Booking' : 'Consultation'),
        cancel_reason: row.cancel_reason,
        external_ref: row.external_ref,
        created_at: row.created_at,
        updated_at: row.updated_at,

        // Approval
        created_by_name: row.created_by_name,
        confirmed_at: row.confirmed_at,
        confirmed_by: row.confirmed_by
    };
}

let cachedCalendarId: string | null = null;

export async function getActiveCalendarId(): Promise<string> {
    if (cachedCalendarId) return cachedCalendarId;
    try {
        const { data, error } = await supabase
            .from('calendars')
            .select('id')
            .eq('is_active', true)
            .limit(1);
        if (error) {
            console.error('Error fetching active calendar:', error);
            return '90debfe2-3399-4135-8a78-33794291800c';
        }
        if (data && data.length > 0) {
            cachedCalendarId = data[0].id;
            return data[0].id;
        }
    } catch (err) {
        console.error('Failed to resolve active calendar:', err);
    }
    return '90debfe2-3399-4135-8a78-33794291800c';
}

export const calendarService = {
    clearCache() {
        cachedCalendarId = null;
    },

    async fetchEventsForRange(rangeStart: string, rangeEnd: string, showCancelled: boolean) {
        const calendarId = await getActiveCalendarId();
        let query = supabase
            .from('events')
            .select('*')
            .eq('calendar_id', calendarId)
            .lt('start_at', rangeEnd)
            .gt('end_at', rangeStart);

        if (!showCancelled) {
            query = query.neq('status', 'cancelled');
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapSupabaseToCalendarEvent);
    },

    async createEvent(event: Partial<CalendarEvent>) {
        const isAIVoice = event.source === 'ai_voice' || event.source === 'clio';
        const calendarId = await getActiveCalendarId();

        // Map UI properties to DB columns
        const dbEvent: any = {
            ...event,
            calendar_id: calendarId,
            status: 'booked',
            approval_status: isAIVoice ? 'PENDING' : 'CONFIRMED',
            source: event.source || 'app',
            insurance: (event as any).insurance_carrier,
            member_id: (event as any).insurance_member_id,
            dob: (event as any).patient_dob
        };

        // Clean up UI-only properties
        delete dbEvent.insurance_carrier;
        delete dbEvent.insurance_member_id;
        delete dbEvent.patient_dob;

        const { data, error } = await supabase
            .from('events')
            .insert([dbEvent])
            .select()
            .single();

        if (error) throw error;
        return mapSupabaseToCalendarEvent(data);
    },

    async cancelEvent(id: string, reason: string) {
        const { data, error } = await supabase
            .from('events')
            .update({
                status: 'cancelled',
                cancel_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapSupabaseToCalendarEvent(data);
    },

    async deleteEvent(id: string) {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async confirmEvent(id: string, confirmedBy: string) {
        const { data, error } = await supabase
            .from('events')
            .update({
                approval_status: 'CONFIRMED',
                confirmed_at: new Date().toISOString(),
                confirmed_by: confirmedBy,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapSupabaseToCalendarEvent(data);
    },

    async updateEvent(id: string, updates: Partial<CalendarEvent>) {
        // Map UI properties to DB columns
        const dbUpdates: any = { ...updates };

        if ((updates as any).insurance_carrier !== undefined) {
            dbUpdates.insurance = (updates as any).insurance_carrier;
            delete dbUpdates.insurance_carrier;
        }
        if ((updates as any).insurance_member_id !== undefined) {
            dbUpdates.member_id = (updates as any).insurance_member_id;
            delete dbUpdates.insurance_member_id;
        }
        if ((updates as any).patient_dob !== undefined) {
            dbUpdates.dob = (updates as any).patient_dob;
            delete dbUpdates.patient_dob;
        }

        // Clean up internal properties
        delete dbUpdates.id;
        delete dbUpdates.created_at;

        const { data, error } = await supabase
            .from('events')
            .update({
                ...dbUpdates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapSupabaseToCalendarEvent(data);
    }
};
