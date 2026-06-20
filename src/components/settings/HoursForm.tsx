import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { MOCK_SETTINGS } from '../../data';

export const HoursForm: React.FC = () => {
    const [hours, setHours] = useState(MOCK_SETTINGS.hours);

    return (
        <div className="card">
            <h3 className="card-title flex items-center gap-2">
                <Clock size={20} className="text-primary" />
                Clinic Hours
            </h3>

            <div className="flex flex-col gap-4">
                <div className="form-group">
                    <label className="form-label">Monday - Friday</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="time"
                            className="form-input"
                            value={hours.mon_fri.start}
                            onChange={(e) => setHours({ ...hours, mon_fri: { ...hours.mon_fri, start: e.target.value } })}
                        />
                        <span className="text-secondary">to</span>
                        <input
                            type="time"
                            className="form-input"
                            value={hours.mon_fri.end}
                            onChange={(e) => setHours({ ...hours, mon_fri: { ...hours.mon_fri, end: e.target.value } })}
                        />
                    </div>
                </div>

                <div className="form-group flex items-center justify-between">
                    <label className="form-label mb-0">Enable Weekend Hours</label>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={hours.weekend_enabled}
                            onChange={(e) => setHours({ ...hours, weekend_enabled: e.target.checked })}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    );
};
