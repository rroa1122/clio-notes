import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('privacy regression guards', () => {
  it('does not log imported patient payloads or generated clinical narratives', () => {
    const patientCreate = readSource('../notes-module/components/PatientCreateModal.tsx');
    const patientDetail = readSource('../pages/PatientDetail.tsx');
    const record = readSource('../notes-module/pages/Record.tsx');

    expect(patientCreate).not.toContain('IMPORT DATA RECEIVED FROM BOT');
    expect(patientCreate).not.toContain('NEW FORM STATE UPDATED');
    expect(patientDetail).not.toContain('Received data from n8n:');
    expect(patientDetail).not.toContain('Extracted tcm_social_needs payload:');
    expect(record).not.toContain('Individual outcomes:');
    expect(record).not.toContain('Individual next steps:');
    expect(record).not.toContain('Synthesis response:');
  });

  it('does not include patient or account identifiers in operational logs', () => {
    const auth = readSource('../context/AuthContext.tsx');
    const storage = readSource('../notes-module/lib/storage.ts');
    const bootstrap = readSource('../notes-module/lib/userBootstrap.ts');

    expect(auth).not.toContain("Session found for:', session.user.email");
    expect(storage).not.toContain('patient.full_name} (${targetId})');
    expect(bootstrap).not.toContain('Starting for user ${userId} (${email})');
  });

  it('shows raw error details only in local development', () => {
    const appBoundary = readSource('../components/ErrorBoundary.tsx');
    const notesBoundary = readSource('../notes-module/components/ErrorBoundary.tsx');

    expect(appBoundary).toContain('import.meta.env.DEV && this.state.error');
    expect(notesBoundary).toContain('import.meta.env.DEV && this.state.error');
  });
});
