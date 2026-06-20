import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomSelectProps {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    icon: React.ReactNode;
    minimalist?: boolean;
}

export const CustomSelect = ({ label, value, options, onChange, icon, minimalist }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="medical-input-group" ref={containerRef} style={{ userSelect: 'none' }}>
            <label style={{ userSelect: 'none', fontSize: minimalist ? '0.65rem' : 'inherit', textTransform: minimalist ? 'uppercase' : 'none', opacity: minimalist ? 0.6 : 1, fontWeight: minimalist ? 700 : 'inherit' }}>{label}</label>
            <div className="input-wrapper" style={{
                position: 'relative',
                background: minimalist ? 'transparent' : 'inherit',
                border: minimalist ? 'none' : 'inherit',
                boxShadow: minimalist ? 'none' : 'inherit',
                paddingLeft: minimalist ? 0 : 'inherit'
            }}>
                <div className="field-icon" style={{ zIndex: 10, userSelect: 'none', left: minimalist ? '0' : '1rem' }}>{icon}</div>

                <div
                    className="medical-input"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: '1rem',
                        paddingLeft: minimalist ? '2rem' : '3rem',
                        background: minimalist ? 'transparent' : 'inherit',
                        border: minimalist ? 'none' : 'inherit',
                        borderBottom: minimalist ? '1px solid var(--md-sys-color-outline-variant)' : 'inherit',
                        borderRadius: minimalist ? 0 : 'inherit',
                        userSelect: 'none'
                    }}
                >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {value}
                    </span>
                    <ChevronDown
                        size={18}
                        style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            opacity: 0.5
                        }}
                    />
                </div>

                {isOpen && (
                    <div className="custom-dropdown-menu animate-entry" style={{
                        position: 'absolute',
                        top: '120%',
                        left: 0,
                        right: 0,
                        background: 'var(--md-sys-color-surface-container-high)',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        zIndex: 100,
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '0.5rem'
                    }}>
                        {options.map((option) => (
                            <div
                                key={option}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: option === value ? 'rgba(0, 137, 121, 0.1)' : 'transparent',
                                    color: option === value ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)',
                                    marginBottom: '2px',
                                    fontSize: '0.9rem',
                                    fontWeight: option === value ? 600 : 400
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--md-sys-color-surface-container-highest)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = option === value ? 'rgba(0, 137, 121, 0.1)' : 'transparent'}
                            >
                                {option}
                                {option === value && <Check size={16} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface ModernDateInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minimalist?: boolean;
}

export const ModernDateInput = ({ label, value, onChange, minimalist }: ModernDateInputProps) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calendar logic state
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setDisplayValue(`${d}/${m}/${y}`);
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                if (!isNaN(dateObj.getTime())) {
                    setCurrentMonth(dateObj);
                }
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/\D/g, '');
        if (input.length > 2) input = input.slice(0, 2) + '/' + input.slice(2);
        if (input.length > 5) input = input.slice(0, 5) + '/' + input.slice(5);
        if (input.length > 10) input = input.slice(0, 10);
        setDisplayValue(input);
        if (input.length === 10) {
            const [d, m, y] = input.split('/');
            const date = new Date(`${y}-${m}-${d}`);
            if (!isNaN(date.getTime())) onChange(`${y}-${m}-${d}`);
        } else if (input === '') {
            onChange('');
        }
    };

    const handleDateSelect = (day: number) => {
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth() + 1;
        const formattedDate = `${y}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        onChange(formattedDate);
        setIsCalendarOpen(false);
    };

    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: React.ReactNode[] = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const isSelected = value === `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            days.push(
                <div
                    key={d}
                    onClick={() => handleDateSelect(d)}
                    style={{
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem',
                        background: isSelected ? 'var(--md-sys-color-primary)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'inherit'
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-highest)')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                    {d}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="medical-input-group" ref={containerRef}>
            <label style={{ fontSize: minimalist ? '0.65rem' : 'inherit', textTransform: minimalist ? 'uppercase' : 'none', opacity: minimalist ? 0.6 : 1, fontWeight: minimalist ? 700 : 'inherit' }}>{label}</label>
            <div className="input-wrapper" style={{
                background: minimalist ? 'transparent' : 'inherit',
                border: minimalist ? 'none' : 'inherit',
                boxShadow: minimalist ? 'none' : 'inherit',
                paddingLeft: minimalist ? 0 : 'inherit'
            }}>
                <div
                    className="field-icon"
                    style={{ zIndex: 10, cursor: 'pointer', pointerEvents: 'auto', left: minimalist ? '0' : '1rem' }}
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                    <Calendar size={18} />
                </div>
                <input
                    type="text"
                    className="medical-input"
                    value={displayValue}
                    onChange={handleInputChange}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    style={{
                        letterSpacing: '0.05em',
                        paddingLeft: minimalist ? '2rem' : '3rem',
                        background: minimalist ? 'transparent' : 'inherit',
                        border: minimalist ? 'none' : 'inherit',
                        borderBottom: minimalist ? '1px solid var(--md-sys-color-outline-variant)' : 'inherit',
                        borderRadius: minimalist ? 0 : 'inherit'
                    }}
                    onClick={() => setIsCalendarOpen(true)}
                />

                {isCalendarOpen && (
                    <div className="custom-calendar-popup animate-entry" style={{
                        position: 'absolute', top: '120%', left: 0, zIndex: 100,
                        background: 'var(--md-sys-color-surface-container-high)',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        borderRadius: '16px', padding: '1rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: '280px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20} /></button>
                            <span style={{ fontWeight: '600' }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}><ChevronRight size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                            {renderCalendarDays()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
