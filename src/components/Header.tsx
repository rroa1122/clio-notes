import React from 'react';
import { Search, Calendar } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="header">
            <div className="header-search">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search calls, patients, or outcomes..."
                    className="search-input"
                />
            </div>

            <div className="header-actions">
                <button className="date-filter-btn">
                    <Calendar size={18} />
                    <span>Last 7 Days</span>
                </button>
            </div>
        </header>
    );
};
