import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecorderCard } from './RecorderCard';

describe('RecorderCard component', () => {
    it('renders idle standby state with start recording button and mic title', () => {
        const handleAudioReady = vi.fn();
        const handleDiscard = vi.fn();

        const html = renderToStaticMarkup(
            <RecorderCard onAudioReady={handleAudioReady} onDiscard={handleDiscard} />
        );

        expect(html).toContain('Clinical Audio Recorder');
        expect(html).toContain('Ready to Record');
        expect(html).toContain('Start Recording');
        expect(html).toContain('STANDBY');
    });

    it('applies custom className if provided', () => {
        const handleAudioReady = vi.fn();
        const handleDiscard = vi.fn();

        const html = renderToStaticMarkup(
            <RecorderCard onAudioReady={handleAudioReady} onDiscard={handleDiscard} className="test-recorder-class" />
        );

        expect(html).toContain('test-recorder-class');
    });
});
