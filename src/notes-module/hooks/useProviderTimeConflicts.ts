import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ClioNote } from '../types';
import { storage } from '../lib/storage';
import { extractNormalizedTimeRange, areOverlapping } from '../lib/conflictUtils';
import { useAuth } from '../../context/AuthContext';

export interface ConflictNote {
    id: string;
    patientName: string;
    startTime: string;
    endTime: string;
    date: string;
}

export const useProviderTimeConflicts = (note: ClioNote | null) => {
    const { user } = useAuth();
    const [conflicts, setConflicts] = useState<ConflictNote[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [confidence, setConfidence] = useState<'high' | 'low'>('high');

    const checkConflicts = useCallback(async () => {
        if (!note || !user) return;

        const currentRange = extractNormalizedTimeRange(note);
        setConfidence(currentRange.confidence);

        // If confidence is low, we don't flag conflicts (avoid false positives)
        if (currentRange.confidence === 'low' || !currentRange.startAtISO || !currentRange.endAtISO) {
            setConflicts([]);
            return;
        }

        setIsLoading(true);
        try {
            const clinicId = await storage.getClinicId();
            if (!clinicId) return;

            // Strict Window: Query notes created/updated around the service date (±2 days)
            // This is a safety measure to avoid fetching the entire clinic history.
            const serviceDate = new Date(currentRange.startAtISO);
            const windowStart = new Date(serviceDate);
            windowStart.setDate(serviceDate.getDate() - 2);
            const windowEnd = new Date(serviceDate);
            windowEnd.setDate(serviceDate.getDate() + 2);

            const { data, error } = await supabase
                .from('notes')
                .select('id, content, patient_id')
                .eq('clinic_id', clinicId)
                .neq('id', (note as any).id || 'new-note')
                .gte('created_at', windowStart.toISOString())
                .lte('created_at', windowEnd.toISOString());

            if (error) throw error;

            const foundConflicts: ConflictNote[] = [];

            data?.forEach((row: any) => {
                const otherNote = { ...row.content, id: row.id, patient_id: row.patient_id } as ClioNote;
                const otherRange = extractNormalizedTimeRange(otherNote);

                if (
                    otherRange.confidence === 'high' &&
                    otherRange.provider === currentRange.provider &&
                    otherRange.startAtISO &&
                    otherRange.endAtISO &&
                    areOverlapping(
                        currentRange.startAtISO!,
                        currentRange.endAtISO!,
                        otherRange.startAtISO,
                        otherRange.endAtISO
                    )
                ) {
                    const otherNoteAny = otherNote as any;
                    foundConflicts.push({
                        id: row.id,
                        patientName: otherNoteAny.patient?.full_name || otherNoteAny.meta?.patientName || otherNoteAny.patient_name || 'Unknown Patient',
                        startTime: otherNoteAny.appointment?.start_time || otherNoteAny.encounter?.time_in || '—',
                        endTime: otherNoteAny.appointment?.end_time || otherNoteAny.encounter?.time_out || '—',
                        date: new Date(otherRange.startAtISO).toLocaleDateString()
                    });
                }
            });

            setConflicts(foundConflicts);
        } catch (err) {
            console.error('Error checking conflicts:', err);
        } finally {
            setIsLoading(false);
        }
    }, [note, user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            checkConflicts();
        }, 1200); // Debounce

        return () => clearTimeout(timer);
    }, [checkConflicts]);

    return { conflicts, isLoading, confidence };
};
