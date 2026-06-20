import { type Call, type TranscriptLine, type Speaker } from '../data/mockData';
import { type CallEvent } from '../hooks/useCallEvents';

function parseTranscriptText(text: string | null): TranscriptLine[] {
    if (!text) return [];

    // Check if it's already structured or has labeled turns
    const turnRegex = /(AI|User|Assistant|Caller|Clio|System|Paciente):\s*/gi;
    if (!turnRegex.test(text)) {
        return [{ id: '1', time: 0, speaker: 'Caller', text }];
    }

    // Reset regex index for splitting
    turnRegex.lastIndex = 0;
    const parts = text.split(turnRegex);

    const segments: TranscriptLine[] = [];
    let timeOffset = 0;

    // Handle potential text before the first label
    if (parts[0].trim()) {
        segments.push({
            id: `pt-0`,
            time: 0,
            speaker: 'Caller',
            text: parts[0].trim()
        });
        timeOffset += 2;
    }

    for (let i = 1; i < parts.length; i += 2) {
        const label = parts[i].toLowerCase();
        const content = parts[i + 1]?.trim();

        if (!content) continue;

        const speaker: Speaker = (['ai', 'assistant', 'clio', 'system'].includes(label)) ? 'CLIO' : 'Caller';

        segments.push({
            id: `pt-${segments.length + 1}`,
            time: timeOffset,
            speaker,
            text: content
        });

        // Mock time progression based on text length
        timeOffset += Math.max(3, Math.floor(content.length / 20));
    }

    return segments;
}

export function mapEventToCall(event: CallEvent): Call {
    // Determine status mapping
    let mappedStatus: 'resolved' | 'action_required' | 'requires_followup' | 'new' = 'new';
    if (event.status === 'resolved') mappedStatus = 'resolved';
    else if (event.status === 'contacted') mappedStatus = 'requires_followup';
    else if (event.status === 'in_review') mappedStatus = 'action_required';

    // Fallback names
    const patientName = event.caller_name || event.customer_number || 'Unknown Caller';
    const patientPhone = event.phone_number || event.customer_number || 'Unknown Number';

    return {
        id: event.id,
        patientName,
        patientPhone,
        timestamp: event.started_at || event.created_at || new Date().toISOString(),
        durationSeconds: event.duration_seconds || 0,
        status: mappedStatus,
        outcome: (event.call_outcome || 'inquiry_answered') as any,
        summary: event.short_summary || event.vapi_summary || 'No summary available.',
        confidenceScore: 95, // AI extracted data is generally high confidence
        audioUrl: event.recording_url || undefined,
        extractedData: {
            reason: event.main_intent || 'General Inquiry',
            requestedDate: event.appointment_preference || undefined,
            urgency: event.urgency || 'low',
            missingInformation: event.missing_information || [],
            recommendedAction: event.recommended_next_action || undefined,
        },
        transcript: parseTranscriptText(event.transcript),
        timeline: [], // Timeline is no longer populated from raw events directly, can be added later if needed
        tags: event.tags || []
    };
}
