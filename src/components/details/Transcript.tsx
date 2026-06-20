import React from 'react';
import type { Call } from '../../data';

interface TranscriptProps {
    transcript: Call['transcript'];
}

export const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card flex-1 flex flex-col min-h-[400px]">
            <h3 className="card-title">Transcript</h3>
            <div className="transcript-container flex-1 overflow-y-auto pr-2">
                {transcript.map((entry, index) => (
                    <div key={index} className={`transcript-entry ${entry.role}`}>
                        <div className="transcript-meta">
                            <span className="transcript-role">{entry.role === 'clio' ? 'CLIO' : 'Caller'}</span>
                            <span className="transcript-time">{formatTime(entry.time)}</span>
                        </div>
                        <div className="transcript-text">{entry.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
