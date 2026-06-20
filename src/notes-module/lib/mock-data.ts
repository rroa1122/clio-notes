import type { Clinic, User, Call, Appointment, AppointmentStatus, CallFlag } from "../types";
import { subDays, subHours, subMinutes, addMinutes } from "date-fns";

export const clinics: Clinic[] = [
    { id: "clinic-1", name: "Green Valley Medical Center", timezone: "America/Los_Angeles" },
    { id: "clinic-2", name: "Blue Ridge Health", timezone: "America/New_York" },
];

export const users: User[] = [
    { id: "user-1", clinic_id: "clinic-1", name: "Dr. Sarah Jenkins", email: "sarah@greenvalley.com", role: "owner" },
    { id: "user-2", clinic_id: "clinic-1", name: "Mark Wilson", email: "mark@greenvalley.com", role: "manager" },
    { id: "user-3", clinic_id: "clinic-2", name: "Dr. James Miller", email: "james@blueridge.com", role: "owner" },
];

const INTENTS = ["Book Appointment", "Reschedule", "Cancel Appointment", "General Inquiry", "Insurance Question"];
const PROVIDERS = ["Dr. Jenkins", "Dr. Smith", "Dr. Miller", "Dr. Lee"];
const REASONS = ["Annual Checkup", "Flu Symptoms", "Follow-up", "Blood Work", "Consultation"];

const generateCalls = (clinicId: string, count: number): Call[] => {
    const calls: Call[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const startTime = subMinutes(subHours(subDays(now, Math.floor(i / 10)), i % 10), Math.floor(Math.random() * 60));
        const durationSec = Math.floor(Math.random() * 300) + 30;
        const endTime = addMinutes(startTime, durationSec / 60);
        const intent = INTENTS[Math.floor(Math.random() * INTENTS.length)];
        const flags: CallFlag[] = Math.random() > 0.8 ? ["needs_review"] : ["ok"];
        if (Math.random() > 0.9) flags.push("transfer");

        calls.push({
            id: `call-${clinicId}-${i}`,
            clinic_id: clinicId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            caller_masked: `+1 (555) ***-${1000 + i}`,
            intent,
            outcome: flags.includes("transfer") ? "Transferred to Human" : "Handled by AI",
            duration_sec: durationSec,
            minutes: Math.ceil(durationSec / 60),
            cost_usd: parseFloat((durationSec * 0.15).toFixed(2)),
            transcript: `Patient calling to ${intent.toLowerCase()}. AI handled the request and confirmed details.`,
            recording_url: "https://example.com/recording.mp3",
            summary_bullets: [
                `Patient requested to ${intent.toLowerCase()}.`,
                "Verified insurance information.",
                flags.includes("transfer") ? "Transferred to front desk as requested." : "Successfully completed the request."
            ],
            extracted: {
                patient_name: ["John Doe", "Jane Smith", "Robert Brown", "Alice Johnson"][Math.floor(Math.random() * 4)],
                requested_date_time: addMinutes(startTime, 1440).toISOString(),
                provider: PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)],
                reason: REASONS[Math.floor(Math.random() * REASONS.length)],
            },
            tool_calls: [
                {
                    ts: startTime.toISOString(),
                    tool_name: "check_availability",
                    payload_preview: JSON.stringify({ provider: "Dr. Jenkins", date: "2025-12-25" }),
                    result_preview: JSON.stringify({ available_slots: ["09:00", "10:00", "14:00"] }),
                }
            ],
            flags,
            is_reviewed: false,
        });
    }
    return calls;
};

const generateAppointments = (clinicId: string, calls: Call[], count: number): Appointment[] => {
    const appointments: Appointment[] = [];
    const statuses: AppointmentStatus[] = ["scheduled", "confirmed", "cancelled", "rescheduled"];

    for (let i = 0; i < count; i++) {
        const call = calls[i % calls.length];
        appointments.push({
            id: `apt-${clinicId}-${i}`,
            clinic_id: clinicId,
            source_call_id: call.id,
            patient_name: call.extracted.patient_name,
            provider: call.extracted.provider,
            start_time: call.extracted.requested_date_time,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            created_by_agent: true,
        });
    }
    return appointments;
};

export const mockCallsClinic1 = generateCalls("clinic-1", 35);
export const mockCallsClinic2 = generateCalls("clinic-2", 25);
export const allMockCalls = [...mockCallsClinic1, ...mockCallsClinic2];

export const mockAppointmentsClinic1 = generateAppointments("clinic-1", mockCallsClinic1, 15);
export const mockAppointmentsClinic2 = generateAppointments("clinic-2", mockCallsClinic2, 10);
export const allMockAppointments = [...mockAppointmentsClinic1, ...mockAppointmentsClinic2];

export const mockStatsClinic1 = {
    totalCalls: 124,
    bookings: 42,
    conversionRate: 33.8,
    avgDuration: "2m 14s"
};
