import React, { useState } from 'react';
import { CheckCircle, Flag, MessageSquare } from 'lucide-react';

export const ActionPanel: React.FC = () => {
    const [notes, setNotes] = useState('');

    return (
        <div className="card">
            <h3 className="card-title">Staff Actions</h3>

            <div className="flex flex-col gap-3 mb-6">
                <button className="btn-action btn-resolve">
                    <CheckCircle size={18} />
                    Mark as Resolved
                </button>
                <button className="btn-action btn-callback">
                    <MessageSquare size={18} />
                    Create Callback Task
                </button>
                <button className="btn-action btn-flag">
                    <Flag size={18} />
                    Flag for Review
                </button>
            </div>

            <div className="notes-section">
                <label className="text-sm font-medium text-secondary mb-2 block">Internal Notes</label>
                <textarea
                    className="notes-input"
                    placeholder="Add notes about this call..."
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
        </div>
    );
};
