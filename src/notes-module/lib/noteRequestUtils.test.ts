import { describe, expect, it } from 'vitest';
import { createAudioUploadPayload } from './noteRequestUtils';

describe('createAudioUploadPayload', () => {
    it('preserves a real recording unchanged', () => {
        const recording = new Blob(['real audio'], { type: 'audio/webm' });

        const result = createAudioUploadPayload(recording);

        expect(result.blob).toBe(recording);
        expect(result.isPlaceholder).toBe(false);
    });

    it.each([null, undefined, new Blob([], { type: 'audio/webm' })])(
        'creates a non-empty placeholder for missing or empty audio',
        (recording) => {
            const result = createAudioUploadPayload(recording);

            expect(result.isPlaceholder).toBe(true);
            expect(result.blob.type).toBe('audio/webm');
            expect(result.blob.size).toBe(100);
        },
    );
});

