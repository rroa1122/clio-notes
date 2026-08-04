
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';

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
    const [activeClinicId, setActiveClinicId] = useState<string | null>(null);

    const fetchInitial = useCallback(async (user: User | null) => {
        if (!user) {
            setEvents([]);
            setActiveClinicId(null);
            setLoading(false);
            return;
        }


        try {
            setLoading(true);
            setError(null);
            let activeClinicId = user.clinic_id;

            // Second-Chance Logic: If clinic_id is missing from auth context, fetch user profile directly
            if (!activeClinicId) {
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single();

                if (profileErr) {
                    throw new Error('Clinic context is unavailable.');
                } else if (profile?.clinic_id) {
                    activeClinicId = profile.clinic_id;
                }
            }

            if (!activeClinicId) {
                setActiveClinicId(null);
                setEvents([]);
                setError('Clinic context is unavailable.');
                return;
            }

            setActiveClinicId(activeClinicId);

            const { data, error } = await supabase
                .from('clinic_call_intakes')
                .select('*')
                .eq('clinic_id', activeClinicId)
                .order('started_at', { ascending: false, nullsFirst: false })
                .limit(50);

            if (error) throw error;

            setEvents(data || []);
        } catch {
            setEvents([]);
            setError('Unable to load call events.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && authUser) {
            fetchInitial(authUser);
        } else if (!authLoading) {
            fetchInitial(null);
        }
    }, [authUser, authLoading, fetchInitial]);

    useEffect(() => {
        if (!activeClinicId) return;

        const channel = supabase
            .channel(`call_events_stream:${activeClinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'clinic_call_intakes',
                    filter: `clinic_id=eq.${activeClinicId}`
                },
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
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinic_call_intakes',
                    filter: `clinic_id=eq.${activeClinicId}`
                },
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
    }, [activeClinicId]);

    const refetch = useCallback(async () => {
        await fetchInitial(authUser);
    }, [authUser, fetchInitial]);

    return { events, loading, error, isConnected, refetch };
}
