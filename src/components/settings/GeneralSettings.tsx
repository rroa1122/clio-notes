import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { MOCK_SETTINGS } from '../../data';

export const GeneralSettings: React.FC = () => {
    const [duration, setDuration] = useState(MOCK_SETTINGS.appt_duration_min);
    const [escalate, setEscalate] = useState(MOCK_SETTINGS.escalate_low_confidence);

    return (
        <div className="card">
            <h3 className="card-title flex items-center gap-2">
                <SettingsIcon size={20} className="text-primary" />
                General Configuration
            </h3>

            <div className="flex flex-col gap-6">
                <div className="form-group">
                    <label className="form-label">Default Appointment Duration (min)</label>
                    <select
                        className="form-select"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                    >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                    </select>
                </div>

                <div className="form-group flex items-center justify-between">
                    <div>
                        <label className="form-label mb-0 block">Escalate Low Confidence</label>
                        <span className="text-xs text-secondary">Automatically flag calls where AI is unsure</span>
                    </div>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={escalate}
                            onChange={(e) => setEscalate(e.target.checked)}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    );
};
