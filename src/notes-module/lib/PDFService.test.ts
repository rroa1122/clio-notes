import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPDFServiceErrorMessage, getWebhookUrl, PDFService, PDFServiceError } from './PDFService';

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('PDFService', () => {
    it('routes known templates and preserves the medical fallback', () => {
        expect(getWebhookUrl('tcm_progress_note')).toBe('https://n8n.clinicflow.dev/webhook/tcm-note');
        expect(getWebhookUrl('tcm_assessment_note')).toBe('https://n8n.clinicflow.dev/webhook/tcm-assessment-note');
        expect(getWebhookUrl('unknown-template')).toBe('https://n8n.clinicflow.dev/webhook/medical-note');
        expect(getWebhookUrl()).toBe('https://n8n.clinicflow.dev/webhook/medical-note');
    });

    it('parses a valid JSON response without making a real network request', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ pdf_url: 'https://example.test/note.pdf', structured_note: { ok: true } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
        ));
        vi.stubGlobal('fetch', fetchMock);

        const response = await PDFService._sendRequest('{}', 'application/json');

        expect(response.mode).toBe('url');
        expect(response.url).toBe('https://example.test/note.pdf');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty successful response instead of treating it as a note', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        await expect(PDFService._sendRequest('{}', 'application/json')).rejects.toMatchObject({
            code: 'EMPTY_RESPONSE',
            status: 200,
        });
    });

    it('rejects invalid JSON instead of returning an empty success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{invalid', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        await expect(PDFService._sendRequest('{}', 'application/json')).rejects.toMatchObject({
            code: 'INVALID_JSON',
            status: 200,
        });
    });

    it('does not expose the raw server response in HTTP errors', async () => {
        const privateServerMessage = 'internal stack and sensitive payload';
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(privateServerMessage, {
            status: 500,
            headers: { 'content-type': 'text/plain' },
        })));

        let caught: unknown;
        try {
            await PDFService._sendRequest('{}', 'application/json');
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(PDFServiceError);
        expect(caught).toMatchObject({ code: 'HTTP_ERROR', status: 500 });
        expect((caught as Error).message).not.toContain(privateServerMessage);
    });

    it('preserves cancellation so the UI can distinguish it from a failure', async () => {
        const abortError = new Error('cancelled');
        abortError.name = 'AbortError';
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

        await expect(PDFService._sendRequest('{}', 'application/json')).rejects.toBe(abortError);
    });

    it('wraps network failures in a safe actionable error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket details')));

        await expect(PDFService._sendRequest('{}', 'application/json')).rejects.toMatchObject({
            code: 'REQUEST_FAILED',
            message: 'Unable to reach the note service. Please try again.',
        });
    });

    it('converts failures to safe user-facing messages', () => {
        const serverFailure = new PDFServiceError('HTTP_ERROR', 'internal', 503);
        const unknownFailure = new Error('private implementation detail');

        expect(getPDFServiceErrorMessage(serverFailure)).toContain('HTTP 503');
        expect(getPDFServiceErrorMessage(serverFailure)).toContain('Nothing was saved');
        expect(getPDFServiceErrorMessage(unknownFailure)).not.toContain(unknownFailure.message);
    });
});
