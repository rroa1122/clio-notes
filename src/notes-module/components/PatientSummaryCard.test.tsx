import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientSummaryCard } from './PatientSummaryCard';
import type { Patient } from '../lib/storage';

describe('PatientSummaryCard component', () => {
    const mockPatient: Patient = {
        id: 'pat-123',
        user_id: 'usr-456',
        full_name: 'Jane Doe',
        dob: '1985-06-15',
        emr_id: 'EMR-98765'
    };

    it('renders patient name, DOB, and ID correctly with high contrast badge styles', () => {
        const handleReset = vi.fn();
        const html = renderToStaticMarkup(
            <PatientSummaryCard patient={mockPatient} onReset={handleReset} />
        );

        expect(html).toContain('Jane Doe');
        expect(html).toContain('DOB:');
        expect(html).toContain('1985-06-15');
        expect(html).toContain('ID:');
        expect(html).toContain('EMR-98765');
        expect(html).toContain('Change');
        expect(html).toContain('font-mono');
    });

    it('renders gracefully without DOB or EMR ID', () => {
        const patientMinimal: Patient = {
            id: 'pat-min',
            user_id: 'usr-1',
            full_name: 'John Smith'
        };

        const html = renderToStaticMarkup(
            <PatientSummaryCard patient={patientMinimal} onReset={() => {}} />
        );

        expect(html).toContain('John Smith');
        expect(html).not.toContain('DOB:');
        expect(html).not.toContain('ID:');
        expect(html).toContain('Change');
    });

    it('applies custom className if provided', () => {
        const html = renderToStaticMarkup(
            <PatientSummaryCard patient={mockPatient} onReset={() => {}} className="custom-summary-card" />
        );

        expect(html).toContain('custom-summary-card');
    });
});
