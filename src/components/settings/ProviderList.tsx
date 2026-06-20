import React, { useState } from 'react';
import { Users, User } from 'lucide-react';
import { MOCK_SETTINGS } from '../../data';

export const ProviderList: React.FC = () => {
    const [providers, setProviders] = useState(MOCK_SETTINGS.providers);

    const toggleProvider = (id: string) => {
        setProviders(providers.map(p =>
            p.id === id ? { ...p, active: !p.active } : p
        ));
    };

    return (
        <div className="card">
            <h3 className="card-title flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Providers
            </h3>

            <div className="flex flex-col gap-3">
                {providers.map(provider => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${provider.active ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                <User size={16} />
                            </div>
                            <span className={provider.active ? 'font-medium' : 'text-secondary'}>
                                {provider.name}
                            </span>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={provider.active}
                                onChange={() => toggleProvider(provider.id)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                ))}
            </div>

            <button className="btn-link mt-4">+ Add New Provider</button>
        </div>
    );
};
