export type CallOutcome = 'BOOKED' | 'RESCHEDULED' | 'CANCELED' | 'FAQ' | 'ESCALATED' | 'ERROR';
export type CallConfidence = 'High' | 'Med' | 'Low';

export interface ExtractedFields {
  name?: string;
  reason_for_visit?: string;
  visit_type?: string;
  preferred_time?: string;
  insurance?: string;
}

export interface Call {
  call_id: string;
  timestamp: string; // ISO string
  duration_sec: number;
  outcome: CallOutcome;
  caller_name: string;
  caller_phone: string;
  requested_provider?: string;
  requested_datetime?: string;
  confidence: CallConfidence;
  transcript: Array<{ role: 'clio' | 'caller'; text: string; time: number }>;
  extracted_fields: ExtractedFields;
  notes?: string;
  is_resolved?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  active: boolean;
}

export interface ClinicSettings {
  hours: {
    mon_fri: { start: string; end: string };
    weekend_enabled: boolean;
  };
  providers: Provider[];
  appt_duration_min: number;
  escalate_low_confidence: boolean;
}

// MOCK DATA

export const MOCK_PROVIDERS: Provider[] = [
  { id: 'p1', name: 'Dr. Sarah Smith', active: true },
  { id: 'p2', name: 'Dr. James Chen', active: true },
  { id: 'p3', name: 'Dr. Emily Johnson', active: false },
];

export const MOCK_SETTINGS: ClinicSettings = {
  hours: {
    mon_fri: { start: '09:00', end: '17:00' },
    weekend_enabled: false,
  },
  providers: MOCK_PROVIDERS,
  appt_duration_min: 60,
  escalate_low_confidence: true,
};

const generateTranscript = (outcome: CallOutcome): Array<{ role: 'clio' | 'caller'; text: string; time: number }> => {
  const base = [
    { role: 'clio', text: "Thank you for calling Bayside Medical. I'm Clio, an automated assistant. How can I help you today?", time: 0 },
  ];
  
  if (outcome === 'BOOKED') {
    return [
      ...base,
      { role: 'caller', text: "Hi, I'd like to schedule an appointment for a check-up.", time: 5 },
      { role: 'clio', text: "I can help with that. Are you a new or returning patient?", time: 12 },
      { role: 'caller', text: "Returning. My name is John Doe.", time: 18 },
      { role: 'clio', text: "Thanks John. When are you looking to come in?", time: 24 },
      { role: 'caller', text: "Next Tuesday morning if possible.", time: 30 },
      { role: 'clio', text: "I have an opening at 10:00 AM with Dr. Smith. Does that work?", time: 38 },
      { role: 'caller', text: "Yes, that's perfect.", time: 45 },
      { role: 'clio', text: "Great. You are booked for next Tuesday at 10:00 AM. You'll receive a confirmation text shortly.", time: 52 },
    ] as any;
  }
  
  if (outcome === 'ESCALATED') {
    return [
      ...base,
      { role: 'caller', text: "I have a really complex billing question about my last surgery.", time: 6 },
      { role: 'clio', text: "I understand. Could you provide your date of birth for verification?", time: 14 },
      { role: 'caller', text: "It's... well, I'd rather speak to a human.", time: 20 },
      { role: 'clio', text: "I can connect you to our billing department. Please hold while I transfer you.", time: 28 },
    ] as any;
  }

  return [
    ...base,
    { role: 'caller', text: "What are your hours?", time: 5 },
    { role: 'clio', text: "We are open Monday through Friday from 9 AM to 5 PM.", time: 10 },
    { role: 'caller', text: "Okay, thanks.", time: 15 },
  ] as any;
};

export const MOCK_CALLS: Call[] = [
  {
    call_id: 'c_101',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    duration_sec: 120,
    outcome: 'BOOKED',
    caller_name: 'Alice Williams',
    caller_phone: '(555) 123-4567',
    requested_provider: 'Dr. Sarah Smith',
    requested_datetime: '2025-12-24T10:00:00',
    confidence: 'High',
    transcript: generateTranscript('BOOKED'),
    extracted_fields: { name: 'Alice Williams', visit_type: 'Check-up', preferred_time: 'Morning' },
    is_resolved: true,
  },
  {
    call_id: 'c_102',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    duration_sec: 45,
    outcome: 'FAQ',
    caller_name: 'Unknown',
    caller_phone: '(555) 987-6543',
    confidence: 'High',
    transcript: generateTranscript('FAQ'),
    extracted_fields: { reason_for_visit: 'Hours inquiry' },
    is_resolved: true,
  },
  {
    call_id: 'c_103',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    duration_sec: 240,
    outcome: 'ESCALATED',
    caller_name: 'Robert Brown',
    caller_phone: '(555) 555-5555',
    confidence: 'Low',
    transcript: generateTranscript('ESCALATED'),
    extracted_fields: { name: 'Robert Brown', reason_for_visit: 'Billing' },
    is_resolved: false,
  },
  {
    call_id: 'c_104',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    duration_sec: 300,
    outcome: 'ERROR',
    caller_name: 'Unknown',
    caller_phone: '(555) 111-2222',
    confidence: 'Low',
    transcript: generateTranscript('ESCALATED'), // Reuse escalated transcript for error mock
    extracted_fields: {},
    is_resolved: false,
  },
  {
    call_id: 'c_105',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 1 day 1 hour ago
    duration_sec: 180,
    outcome: 'BOOKED',
    caller_name: 'Michael Davis',
    caller_phone: '(555) 333-4444',
    requested_provider: 'Dr. James Chen',
    confidence: 'High',
    transcript: generateTranscript('BOOKED'),
    extracted_fields: { name: 'Michael Davis', visit_type: 'Follow-up' },
    is_resolved: true,
  },
  // Add more calls to fill the list
  ...Array.from({ length: 15 }).map((_, i) => ({
    call_id: `c_20${i}`,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 2)).toISOString(),
    duration_sec: 60 + Math.floor(Math.random() * 300),
    outcome: ['BOOKED', 'FAQ', 'CANCELED', 'RESCHEDULED'][Math.floor(Math.random() * 4)] as CallOutcome,
    caller_name: `Caller ${i}`,
    caller_phone: `(555) 000-00${i < 10 ? '0' + i : i}`,
    confidence: 'High' as CallConfidence,
    transcript: generateTranscript('FAQ'),
    extracted_fields: {},
    is_resolved: true,
  }))
];
