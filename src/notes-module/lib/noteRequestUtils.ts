const PLACEHOLDER_AUDIO_BYTES = 100;

export interface AudioUploadPayload {
    blob: Blob;
    isPlaceholder: boolean;
}

export const createAudioUploadPayload = (audioBlob: Blob | null | undefined): AudioUploadPayload => {
    if (audioBlob && audioBlob.size > 0) {
        return { blob: audioBlob, isPlaceholder: false };
    }

    return {
        blob: new Blob([new Uint8Array(PLACEHOLDER_AUDIO_BYTES)], { type: 'audio/webm' }),
        isPlaceholder: true,
    };
};

