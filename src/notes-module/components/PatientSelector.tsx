import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Loader2, Check, User } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { storage, type Patient } from '../lib/storage';
import { cn } from "@/lib/utils";

interface PatientSelectorProps {
    onSelect: (patient: Patient) => void;
    onInputChange?: (value: string) => void;
    onCreateNew: () => void;
}

export function PatientSelector({ onSelect, onInputChange, onCreateNew }: PatientSelectorProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                const searchResults = await storage.searchPatients(query);
                setResults(searchResults);
                setIsOpen(true);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    placeholder="Search patient registry..."
                    className="!pl-12 !pr-10 h-12 rounded-full bg-white border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:ring-offset-0 text-sm font-medium text-slate-900 transition-all duration-200"
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        onInputChange?.(val);
                    }}
                    onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onCreateNew}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                    title="Add New Patient"
                >
                    <UserPlus size={16} />
                </Button>
            </div>

            {isOpen && (results.length > 0 || isLoading) && (
                <Card className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] shadow-[0_10px_40px_rgba(15,23,42,0.15)] rounded-xl p-1.5 border-slate-200/60 bg-white animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
                        {isLoading ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-primary/40" size={24} />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Searching...</span>
                            </div>
                        ) : (
                            results.map((patient) => (
                                <button
                                    key={patient.id}
                                    onClick={() => {
                                        onSelect(patient);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group/item text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                            <User size={14} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{patient.full_name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {patient.dob ? `DOB: ${patient.dob}` : 'No DOB recorded'}
                                            </span>
                                        </div>
                                    </div>
                                    <Check size={16} className="text-primary opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
