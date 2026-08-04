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

        const blocksToCheck = (note.joint_services && note.joint_services.length > 0)
            ? note.joint_services
            : [note];

        setIsLoading(true);
        try {
            const clinicId = await storage.getClinicId();
            if (!clinicId) return;

            const allFoundConflicts: ConflictNote[] = [];
            let lowestConfidence: 'high' | 'low' = 'high';
            const fallbackProvider = user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || '') : '';

            for (const block of blocksToCheck) {
                const currentRange = extractNormalizedTimeRange(block as ClioNote, fallbackProvider);
                if (currentRange.confidence === 'low') {
                    lowestConfidence = 'low';
                    continue;
                }
                if (!currentRange.startAtISO || !currentRange.endAtISO) continue;

                // Strict Window: Query notes around the block service date (±2 days)
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

                data?.forEach((row: any) => {
                    const otherNote = { ...row.content, id: row.id, patient_id: row.patient_id } as ClioNote;
                    const otherBlocks = (otherNote.joint_services && otherNote.joint_services.length > 0)
                        ? otherNote.joint_services
                        : [otherNote];

                    otherBlocks.forEach((otherBlock: any) => {
                        const otherRange = extractNormalizedTimeRange(otherBlock, fallbackProvider);
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
                            allFoundConflicts.push({
                                id: row.id,
                                patientName: otherNote.patient?.full_name || (otherNote as any).meta?.patientName || (otherNote as any).patient_name || 'Unknown Patient',
                                startTime: otherBlock.encounter?.time_in || otherBlock.appointment?.start_time || '—',
                                endTime: otherBlock.encounter?.time_out || otherBlock.appointment?.end_time || '—',
                                date: new Date(otherRange.startAtISO).toLocaleDateString()
                            });
                        }
                    });
                });
            }

            setConfidence(lowestConfidence);
            setConflicts(allFoundConflicts);
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
