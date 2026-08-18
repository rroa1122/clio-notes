import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Loader2, Check, User } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { storage, type Patient } from '../lib/storage';
import { cn } from "@/lib/utils";
import { useLanguage } from '../../context/LanguageContext';

interface PatientSelectorProps {
    onSelect: (patient: Patient) => void;
    onInputChange?: (value: string) => void;
    onCreateNew: () => void;
}

function getInitials(name?: string): string {
    if (!name || !name.trim()) return 'PT';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PatientSelector({ onSelect, onInputChange, onCreateNew }: PatientSelectorProps) {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // If the user is currently focusing the input, do not close the dropdown
                const inputEl = containerRef.current.querySelector('input');
                if (document.activeElement === inputEl) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                const searchResults = await storage.searchPatients(query);
                setResults(searchResults);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsLoading(false);
            }
        }, query.trim() ? 300 : 0);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors z-10 pointer-events-none" />
                <Input
                    type="text"
                    placeholder={t('record.search_patient_placeholder', 'Search patient registry...')}
                    className="!pl-11 !pr-11 h-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 focus-visible:ring-4 focus-visible:ring-indigo-500/15 dark:focus-visible:ring-indigo-400/20 focus-visible:border-indigo-500/50 dark:focus-visible:border-indigo-400/50 focus-visible:ring-offset-0 text-[13px] font-medium text-slate-900 dark:text-slate-100 transition-all duration-200 shadow-xs focus-visible:shadow-[0_0_20px_-3px_rgba(99,102,241,0.18)]"
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        onInputChange?.(val);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 group/tooltip z-20">
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onCreateNew}
                        className="h-8 w-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-200/60 dark:hover:border-indigo-800/60 border border-slate-200/40 dark:border-slate-700/40 transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
                    >
                        <UserPlus size={15} strokeWidth={2} />
                    </Button>
                    {/* Custom Crisp Tooltip */}
                    <div className="absolute bottom-[calc(100%+6px)] right-0 whitespace-nowrap pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50">
                        <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 dark:text-slate-200 text-[11px] font-normal tracking-tight py-1 px-2.5 rounded-md shadow-md border border-slate-700/70 antialiased leading-none">
                            {language === 'es' ? "Crear nuevo paciente" : "Create New Patient"}
                        </div>
                        <div className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950" />
                    </div>
                </div>
            </div>
 
            {isOpen && (results.length > 0 || isLoading) && (
                <Card className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] shadow-2xl shadow-indigo-500/10 dark:shadow-black/60 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {isLoading ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-indigo-500/60 dark:text-indigo-400/60" size={24} />
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{language === 'es' ? "Buscando..." : "Searching..."}</span>
                            </div>
                        ) : (
                            results.map((patient) => (
                                <button
                                    key={patient.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onSelect(patient);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/20 dark:hover:border-indigo-500/25 transition-all duration-200 group/item text-left cursor-pointer active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/25 dark:via-purple-500/25 dark:to-blue-500/25 border border-indigo-200/70 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs tracking-wider shadow-2xs group-hover/item:scale-105 group-hover/item:border-indigo-400/50 transition-all duration-200 shrink-0">
                                            {getInitials(patient.full_name)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors truncate">
                                                {patient.full_name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight truncate">
                                                    {patient.dob ? `${language === 'es' ? 'F. Nac' : 'DOB'}: ${patient.dob}` : (language === 'es' ? 'Sin fecha de nacimiento' : 'No DOB recorded')}
                                                </span>
                                                {patient.emr_id && (
                                                    <>
                                                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                                                        <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                                                            #{patient.emr_id}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="size-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                                        <Check size={13} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}

