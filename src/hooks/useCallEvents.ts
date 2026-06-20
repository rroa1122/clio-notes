
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface CallEvent {
    id: string;
    clinic_id: string | null;
    vapi_call_id: string;
    event_type: string;
    customer_number: string | null;
    started_at: string;
    duration_seconds: number;
    recording_url: string | null;
    vapi_summary: string | null;
    short_summary: string | null;
    transcript: string | null;
    caller_name: string | null;
    phone_number: string | null;
    main_intent: string | null;
    urgency: string | null;
    call_outcome: string | null;
    appointment_preference: string | null;
    missing_information: string[] | null;
    recommended_next_action: string | null;
    tags: string[] | null;
    status: string;
    created_at: string;
}

export function useCallEvents() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<CallEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const fetchInitial = useCallback(async (user: any) => {
        if (!user) {
            console.log("[useCallEvents] fetchInitial skipped: no user provided");
            return;
        }


        try {
            setLoading(true);
            let activeClinicId = user.clinic_id;

            // Second-Chance Logic: If clinic_id is missing from auth context, fetch user profile directly
            if (!activeClinicId) {
                console.log("[useCallEvents] clinic_id missing from auth session, attempting profile recovery...");
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single();

                if (profileErr) {
                    console.error("[useCallEvents] Profile recovery failed:", profileErr);
                } else if (profile?.clinic_id) {
                    console.log("[useCallEvents] Profile recovery success! found clinic_id:", profile.clinic_id);
                    activeClinicId = profile.clinic_id;
                }
            }

            let query = supabase.from('clinic_call_intakes').select('*');

            const { data, error } = await query
                .order('started_at', { ascending: false, nullsFirst: false })
                .limit(50);

            if (error) throw error;

            setEvents(data || []);
        } catch (err: any) {
            console.error('[useCallEvents] Error fetching initial call events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); // No external dependencies now, user is passed in

    useEffect(() => {
        if (!authLoading && authUser) {
            fetchInitial(authUser);
        }

        const channel = supabase
            .channel('call_events_stream')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'clinic_call_intakes' },
                (payload) => {
                    const newEvent = payload.new as CallEvent;
                    // Dedupe: find if exists by id
                    setEvents((prev) => {
                        const exists = prev.some(e => e.id === newEvent.id);
                        if (exists) return prev;

                        return [newEvent, ...prev].slice(0, 100); // Keep last 100
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'clinic_call_intakes' },
                (payload) => {
                    const updatedEvent = payload.new as CallEvent;
                    setEvents((prev) =>
                        prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
                    );
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime subscribed to call_events');
                    setIsConnected(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn('Realtime disconnected:', status);
                    setIsConnected(false);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [authUser?.id, authLoading, fetchInitial]);

    const refetch = useCallback(async () => {
        await fetchInitial(authUser);
    }, [authUser, fetchInitial]);

    return { events, loading, error, isConnected, refetch };
}
