import { subMinutes, subDays, addDays, format } from 'date-fns';

// --- Types ---

export type CallStatus = 'resolved' | 'action_required' | 'requires_followup' | 'new';
export type CallOutcome = 'appointment_booked' | 'appointment_cancelled' | 'inquiry_answered' | 'escalated_human' | 'voicemail' | 'spam';
export type Speaker = 'CLIO' | 'Caller';

export interface TranscriptLine {
    id: string;
    time: number; // in seconds
    speaker: Speaker;
    text: string;
}

export interface CallTimelineEvent {
    id: string;
    timestamp: string;
    type: 'start' | 'intent_detect' | 'kb_lookup' | 'availability_check' | 'booking' | 'escalation' | 'end';
    description: string;
    status: 'success' | 'warning' | 'error';
}

export interface Call {
    id: string;
    patientName: string; // Masked usually, but mock names here
    patientPhone: string;
    timestamp: string; // ISO string
    durationSeconds: number;
    outcome: CallOutcome;
    status: CallStatus;
    confidenceScore: number; // 0-100
    flagReason?: string;
    summary: string;
    transcript: TranscriptLine[];
    timeline: CallTimelineEvent[];
    extractedData: {
        reason: string;
        callId?: string;
        requestedDate?: string;
        visitType?: string;
        insurance?: string;
        insurance_carrier?: string;
        insurance_member_id?: string;
        dob?: string;
        memberId?: string;
        preferredProvider?: string;
        urgency?: string;
        missingInformation?: string[];
        recommendedAction?: string;
    };
    tags: string[];
    assignedTo?: string;
    audioUrl?: string; // Mock URL
}

export interface KPI {
    totalCalls: number;
    totalPatients?: number;
    appointmentsBooked: number;
    resolutionRate: number; // Percentage
    escalations: number;
    lowConfidence: number;
    avgDurationSec: number;
    missedCalls: number;
}

// --- Mock Data Generators ---

const now = new Date();

const SAMPLE_TRANSCRIPT_BOOKING: TranscriptLine[] = [
    { id: '1', time: 0, speaker: 'CLIO', text: "Thank you for calling Dr. Smith's Dental Clinic. I'm Clio, the automated assistant. How can I help you today?" },
    { id: '2', time: 4, speaker: 'Caller', text: "Hi, I have a really bad toothache, I need to see someone as soon as possible." },
    { id: '3', time: 9, speaker: 'CLIO', text: "I'm sorry to hear that. I can help frequent patients with emergency bookings. Are you a new patient or have you visited us before?" },
    { id: '4', time: 15, speaker: 'Caller', text: "I've been there before, my name is Sarah Conner." },
    { id: '5', time: 20, speaker: 'CLIO', text: "Thanks Sarah. I have pulled up your record. I have an opening today at 2:00 PM or tomorrow at 9:00 AM. Which works best?" },
    { id: '6', time: 28, speaker: 'Caller', text: "2:00 PM today please, it really hurts." },
    { id: '7', time: 32, speaker: 'CLIO', text: "I've booked you for an emergency exam today at 2:00 PM. Please bring your insurance card. Drive safely." },
];

const SAMPLE_TIMELINE_BOOKING: CallTimelineEvent[] = [
    { id: 't1', timestamp: subMinutes(now, 10).toISOString(), type: 'start', description: 'Call started', status: 'success' },
    { id: 't2', timestamp: subMinutes(now, 9.9).toISOString(), type: 'intent_detect', description: 'Intent: Emergency Appointment', status: 'success' },
    { id: 't3', timestamp: subMinutes(now, 9.8).toISOString(), type: 'availability_check', description: 'Checked slots: Found 2', status: 'success' },
    { id: 't4', timestamp: subMinutes(now, 9.5).toISOString(), type: 'booking', description: 'Hold created: 2:00 PM', status: 'success' },
    { id: 't5', timestamp: subMinutes(now, 9.2).toISOString(), type: 'end', description: 'Call completed successfully', status: 'success' },
];

export const CALLS: Call[] = [
    {
        id: 'c-1001',
        patientName: 'Sarah Conner',
        patientPhone: '(555) ***-1234',
        timestamp: subMinutes(now, 15).toISOString(),
        durationSeconds: 145,
        outcome: 'appointment_booked',
        status: 'resolved',
        confidenceScore: 98,
        summary: 'Existing patient called with toothache. Booked emergency slot for today at 2pm.',
        transcript: SAMPLE_TRANSCRIPT_BOOKING,
        timeline: SAMPLE_TIMELINE_BOOKING,
        extractedData: {
            reason: 'Toothache / Emergency',
            requestedDate: format(now, "yyyy-MM-dd") + " 14:00",
            visitType: 'Emergency Exam',
            preferredProvider: 'Dr. Sarah Smith',
        },
        tags: ['emergency', 'dental', 'booked'],
    },
    {
        id: 'c-1004',
        patientName: 'Emily Blunt',
        patientPhone: '(555) ***-2222',
        timestamp: subDays(now, 1).toISOString(),
        durationSeconds: 180,
        outcome: 'appointment_booked',
        status: 'resolved',
        confidenceScore: 92,
        summary: 'Routine cleaning booked for next Tuesday.',
        transcript: [],
        timeline: [],
        extractedData: {
            reason: 'Cleaning',
            requestedDate: format(subDays(now, 1), "yyyy-MM-dd") + " 09:30",
            visitType: 'Hygiene',
        },
        tags: ['hygiene', 'booked'],
    },
    {
        id: 'c-1006',
        patientName: 'Mark Ruffalo',
        patientPhone: '(555) ***-7777',
        timestamp: subDays(now, 2).toISOString(),
        durationSeconds: 120,
        outcome: 'appointment_booked',
        status: 'resolved',
        confidenceScore: 95,
        summary: 'Follow-up appointment for filling.',
        transcript: [],
        timeline: [],
        extractedData: {
            reason: 'Filling Follow-up',
            requestedDate: format(addDays(now, 1), "yyyy-MM-dd") + " 11:00",
            visitType: 'Follow-up',
        },
        tags: ['follow-up', 'booked'],
    }
];

// --- API Helpers ---

export const getCalls = (): Promise<Call[]> => {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => resolve([...CALLS]), 300);
    });
};

export const getCallById = (id: string): Promise<Call | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(CALLS.find((c) => c.id === id)), 200);
    });
};

export const updateCallStatus = (id: string, status: CallStatus): Promise<void> => {
    const call = CALLS.find(c => c.id === id);
    if (call) call.status = status;
    return Promise.resolve();
}

export const getKPIs = (): KPI => {
    return {
        totalCalls: 142,
        appointmentsBooked: 86,
        resolutionRate: 92,
        escalations: 5,
        lowConfidence: 3,
        avgDurationSec: 135,
        missedCalls: 2,
    };
};

export const ANALYSIS_DATA = [
    { name: 'Mon', calls: 30, booked: 20 },
    { name: 'Tue', calls: 45, booked: 32 },
    { name: 'Wed', calls: 38, booked: 25 },
    { name: 'Thu', calls: 50, booked: 35 },
    { name: 'Fri', calls: 42, booked: 28 },
    { name: 'Sat', calls: 15, booked: 10 },
    { name: 'Sun', calls: 5, booked: 2 },
];

export interface Patient {
    id: string;
    name: string;
    phone: string;
    lastVisit?: string;
    nextAppointment?: string;
    tags: string[];
    totalCalls: number;
}

const MOCK_PATIENTS: Patient[] = [
    { id: 'p1', name: 'Sarah Conner', phone: '(555) ***-1234', lastVisit: '2023-10-15', nextAppointment: '2023-12-23', tags: ['vip', 'anxious'], totalCalls: 5 },
    { id: 'p2', name: 'John Doe', phone: '(555) ***-9876', lastVisit: '2023-11-01', tags: ['medicaid', 'billing-issues'], totalCalls: 3 },
    { id: 'p3', name: 'Emily Blunt', phone: '(555) ***-2222', nextAppointment: '2023-12-28', tags: ['hygiene'], totalCalls: 1 },
    { id: 'p4', name: 'Michael Scott', phone: '(555) ***-1111', lastVisit: '2023-09-20', tags: ['ortho'], totalCalls: 8 },
    { id: 'p5', name: 'James Halpert', phone: '(555) ***-3333', tags: ['new-patient'], totalCalls: 1 },
];

export const getPatients = (): Promise<Patient[]> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_PATIENTS), 300);
    });
};

export interface Settings {
    clinicName: string;
    forwardingNumber: string;
    timezone: string;
    businessHours: {
        monday: { start: string, end: string, closed: boolean };
        tuesday: { start: string, end: string, closed: boolean };
        wednesday: { start: string, end: string, closed: boolean };
        thursday: { start: string, end: string, closed: boolean };
        friday: { start: string, end: string, closed: boolean };
        saturday: { start: string, end: string, closed: boolean };
        sunday: { start: string, end: string, closed: boolean };
    };
    integrations: {
        ems: boolean;
        slack: boolean;
        email: boolean;
    };
}

let MOCK_SETTINGS: Settings = {
    clinicName: "Dr. Smith's Dental Clinic",
    forwardingNumber: "555-0199",
    timezone: "America/New_York",
    businessHours: {
        monday: { start: "09:00", end: "17:00", closed: false },
        tuesday: { start: "09:00", end: "17:00", closed: false },
        wednesday: { start: "09:00", end: "17:00", closed: false },
        thursday: { start: "09:00", end: "17:00", closed: false },
        friday: { start: "09:00", end: "13:00", closed: false },
        saturday: { start: "00:00", end: "00:00", closed: true },
        sunday: { start: "00:00", end: "00:00", closed: true },
    },
    integrations: {
        ems: true,
        slack: false,
        email: true,
    }
};

export const getSettings = (): Promise<Settings> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ ...MOCK_SETTINGS }), 300);
    });
};

export const updateSettings = (newSettings: Partial<Settings>): Promise<void> => {
    MOCK_SETTINGS = { ...MOCK_SETTINGS, ...newSettings };
    return Promise.resolve();
};
