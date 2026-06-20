
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Call, KPI } from '../data/mockData';
import { CALLS } from '../data/mockData';
import { mapEventToCall } from '../lib/webhookUtils';
import { useCallEvents } from '../hooks/useCallEvents';

interface CallsContextType {
    calls: Call[];
    loading: boolean;
    isPolling: boolean;
    refreshCalls: () => Promise<void>;
    addCall: (call: Call) => void;
    kpis: KPI;
    realtimeConnected: boolean;
}

const CallsContext = createContext<CallsContextType | undefined>(undefined);

export function CallsProvider({ children }: { children: ReactNode }) {
    const { events, loading: eventsLoading, isConnected, refetch } = useCallEvents();
    const [manualCalls, setManualCalls] = useState<Call[]>([]);
    const [seenIds] = useState<Set<string>>(new Set());

    // Merge mock data with real-time events and manual injections
    const calls = useMemo(() => {
        const eventCalls = events.map(mapEventToCall);

        // Combine all sources (excluding legacy mock data for production isolation)
        const allSources = [...manualCalls, ...eventCalls];

        // Dedupe and sort
        const unique: Call[] = [];
        const ids = new Set<string>();

        allSources.forEach(call => {
            if (!ids.has(call.id)) {
                ids.add(call.id);
                unique.push(call);
            }
        });

        return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [events, manualCalls]);

    // Initial load: Add already present IDs to seenSet
    useEffect(() => {
        calls.forEach(c => seenIds.add(c.id));
    }, [calls, seenIds]);

    const addCall = (call: Call) => {
        if (!seenIds.has(call.id)) {
            seenIds.add(call.id);
            setManualCalls(prev => [call, ...prev]);
        }
    };

    // Expose global handler for manual debugging
    useEffect(() => {
        (window as any).handlePacket = (json: any) => {
            console.log("Packet manually injected:", json);
            // This could be mapped to a call if needed, or just skip as we have realtime now
        };
        return () => {
            delete (window as any).handlePacket;
        }
    }, []);

    // Derived KPIs
    const kpis: KPI = useMemo(() => {
        return {
            totalCalls: calls.length,
            totalPatients: new Set(calls.map(c => c.patientName)).size,
            appointmentsBooked: calls.filter(call => {
                const summary = (call.summary || "").toLowerCase();
                const hasBookingKeywords = summary.includes('booked') || summary.includes('scheduled') ||
                    summary.includes('confirmó') || summary.includes('cita') ||
                    summary.includes('agendó') || summary.includes('confirm');
                const isBooked = call.outcome === 'appointment_booked' || hasBookingKeywords;
                return (isBooked && !summary.includes('cancelled')) || !!call.extractedData?.requestedDate;
            }).length,
            resolutionRate: Math.round((calls.filter(c => c.status === 'resolved').length / (calls.length || 1)) * 100),
            escalations: calls.filter(c => c.outcome === 'escalated_human').length,
            lowConfidence: calls.filter(c => c.confidenceScore < 70).length,
            avgDurationSec: Math.floor(calls.reduce((acc, c) => acc + c.durationSeconds, 0) / (calls.length || 1)),
            missedCalls: calls.filter(c => (c.outcome as string) === 'spam').length
        };
    }, [calls]);

    return (
        <CallsContext.Provider value={{
            calls,
            loading: eventsLoading,
            isPolling: false, // Legacy field
            refreshCalls: refetch,
            addCall,
            kpis,
            realtimeConnected: isConnected
        }}>
            {children}
        </CallsContext.Provider>
    );
}

export function useCalls() {
    const context = useContext(CallsContext);
    if (context === undefined) {
        throw new Error('useCalls must be used within a CallsProvider');
    }
    return context;
}
