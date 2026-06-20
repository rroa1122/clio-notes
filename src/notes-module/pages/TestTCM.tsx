
import React, { useState } from 'react';
import TcmNoteShell from '../components/TcmNoteShell';

const initialMockNote = {
    id: 'test-note',
    patient_id: 'p1',
    patient: {
        full_name: 'John Doe',
        dob: '1980-01-01',
        emr: '12345',
        case_no: 'C-98765',
        sex: 'Male',
        mobile: '(555) 555-5555',
        age: 44,
        sex_at_birth: 'Male',
        account_number: 'MRN-123'
    },
    facility: {
        name: 'Clio Health Center',
        address: '123 Health Way, Miami, FL 33133',
        phone: '(305) 555-0123',
        fax: '(305) 555-0124',
        email: 'info@cliohealth.com',
        facility_name: 'Clio Health Center',
        facility_address: '123 Health Way, Miami, FL 33133',
        facility_phone: '(305) 555-0123',
        facility_fax: '(305) 555-0124',
        facility_email: 'info@cliohealth.com'
    },
    encounter: {
        dos_date: '2026-02-09',
        pos: '11 - Office',
        pos_full: '11 - Office',
        time_in: '10:00 AM',
        time_out: '10:45 AM',
        duration: '45',
        duration_minutes: 45,
        units: 1
    },
    services: {
        domains_selected: {
            "1_mental_health_substance_abuse": "yes"
        }
    },
    staff: {
        case_manager_name: 'Sarah Smith',
        case_manager_lic: 'LCSW-1234',
        supervisor_name: 'Dr. Emily Jones',
        supervisor_lic: 'MD-9876'
    },
    visit: {
        dos_date: '2026-02-09'
    },
    narrative: {
        summary_notes: 'Patient presented for TCM session. Reported stable mood.',
        outcome_of_services: 'Service delivered as planned.',
        next_steps: 'Follow up next week.'
    },
    diagnosis: {
        primary_diagnosis_name: 'Generalized Anxiety Disorder',
        icd10_code: 'F41.1',
        icd10_description: 'Generalized anxiety disorder'
    },
    meta: {
        template_id: 'tcm_progress_note',
        visitDate: '2026-02-09'
    }
};

export const TestTCM = () => {
    // We need to manage state here to see updates
    const [note, setNote] = useState(initialMockNote);

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <TcmNoteShell
                note={note as any}
                isStandalone={true}
            // We need to pass an onChange handler if TcmNoteShell supports it for standalone mode,
            // BUT TcmNoteShell uses internal state management for edits when in standalone?
            // Let's check TcmNoteShell implementation.
            // It seems TcmNoteShell uses `mergedNote` derived from props + local state?
            // Actually, TcmNoteShell has `handleUpdateField` which updates `mergedNote`.
            // So it should work mostly self-contained for the UI test.
            />
        </div>
    );
};
