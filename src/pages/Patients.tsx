
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, type Patient } from '../notes-module/lib/storage';
import { Search, Calendar, MoreHorizontal, UserPlus, Users2, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../components/ui/table';
import { PageHeader } from '../components/ui/page-header';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

import { PatientCreateModal } from '../notes-module/components/PatientCreateModal';
import { TiltCard } from '../components/ui/tilt-card';
import { cn } from '../lib/utils';

const getInitialsTheme = (name: string) => {
    const char = name ? name.charAt(0).toUpperCase() : '?';
    if ('AEIOU'.includes(char)) return 'bg-indigo-50/70 text-indigo-600';
    if ('BCDFG'.includes(char)) return 'bg-emerald-50/70 text-emerald-600';
    if ('HJKLM'.includes(char)) return 'bg-purple-50/70 text-purple-600';
    if ('NPQRS'.includes(char)) return 'bg-amber-50/70 text-amber-600';
    return 'bg-blue-50/70 text-blue-600';
};

export function Patients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [patientToDelete, setPatientToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const navigate = useNavigate();
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadPatients = useCallback(async (query?: string) => {
        setIsLoading(true);
        try {
            const data = query
                ? await storage.searchPatients(query)
                : await storage.getPatients();
            setPatients(data);
        } catch (err) {
            console.error("Failed to load patients:", err);
            toast.error("Failed to load patient directory");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            loadPatients(value);
        }, 300);
    };

    const confirmDelete = (e: React.MouseEvent, patientId: string, patientName: string) => {
        e.stopPropagation();
        setPatientToDelete({ id: patientId, name: patientName });
    };

    const executeDelete = async () => {
        if (!patientToDelete) return;

        setIsDeleting(patientToDelete.id);
        try {
            await storage.deletePatient(patientToDelete.id);
            setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
            toast.success(`${patientToDelete.name} removed from directory`);
            setPatientToDelete(null);
        } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to delete client record");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="max-w-[1100px] mx-auto p-4 lg:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header Section - Premium Refinement */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100/60 relative">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Clients</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={cn(
                            "size-2 rounded-full", 
                            isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-tactile-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        )} />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                            {isLoading ? "Syncing..." : `${patients.length} active records`}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 md:w-[320px] group/search">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-600 transition-colors pointer-events-none">
                            <Search size={16} strokeWidth={2.5} />
                        </div>
                        <Input
                            type="text"
                            placeholder="Search directory..."
                            className="!pl-11 h-11 rounded-full bg-slate-50 border border-slate-200/50 focus:bg-white focus:ring-[4px] focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all text-[13px] font-medium placeholder:text-slate-400 shadow-sm"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <Button
                        className="h-11 px-7 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 transform active:scale-95 group"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <UserPlus className="h-4.5 w-4.5 text-indigo-200 group-hover:text-white transition-colors" strokeWidth={2.5} />
                        <span className="text-[11px] uppercase tracking-[0.15em]">New Client</span>
                    </Button>
                </div>
            </header>

            {/* Table Headers (Simulated) */}
            <div className="grid grid-cols-[2.5fr,1.2fr,1.2fr,1.2fr,auto] gap-6 px-6 py-2 no-print mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Client Identity</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EMR ID / MRN</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 text-right pr-2">Actions</span>
            </div>

            <div className="flex-1">
                <div className="flex flex-col gap-3.5">
                        {isLoading && patients.length === 0 ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse w-full border border-slate-100" />
                            ))
                        ) : patients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                <EmptyState
                                    icon={searchTerm ? Search : Users2}
                                    title={searchTerm ? "No results found" : "Directory Empty"}
                                    description={searchTerm ? `We couldn't find any record matching "${searchTerm}".` : "Your clinical directory is empty."}
                                    action={searchTerm ? {
                                        label: "Clear Search",
                                        onClick: () => {
                                            setSearchTerm('');
                                            loadPatients();
                                        }
                                    } : undefined}
                                />
                            </div>
                        ) : (
                            patients.map((patient) => (
                                <TiltCard key={patient.id} intensity={3} scale={1.005}>
                                    <div 
                                        className="grid grid-cols-[2.5fr,1.2fr,1.2fr,1.2fr,auto] gap-6 items-center py-4 px-6 bg-white border border-slate-100 rounded-3xl hover:border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer group/row"
                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                    >
                                        {/* Identity */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn(
                                                "size-11 rounded-2xl flex items-center justify-center font-bold text-[14px] shrink-0 transition-transform duration-300 group-hover/row:scale-105",
                                                getInitialsTheme(patient.full_name)
                                            )}>
                                                {patient.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-900 text-[15px] truncate group-hover/row:text-primary transition-colors tracking-tight leading-snug">
                                                    {patient.full_name}
                                                </span>
                                                {patient.phone ? (
                                                    <span className="text-[13px] text-slate-400 font-normal mt-0.5 leading-none">
                                                        {patient.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-[13px] text-slate-300 italic font-normal mt-0.5 leading-none">
                                                        No contact phone
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* DOB */}
                                        <span className="text-[13px] text-slate-500 font-medium">
                                            {patient.dob && !isNaN(new Date(patient.dob).getTime())
                                                ? format(new Date(patient.dob), 'MMM d, yyyy')
                                                : <span className="text-slate-300 italic font-normal">—</span>}
                                        </span>

                                        {/* ID */}
                                        <div>
                                            {patient.emr_id ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100/70 text-slate-600 border border-slate-200/20">
                                                    {patient.emr_id}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 italic font-normal text-[13px]">—</span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <span className="text-[13px] text-slate-400 font-medium">
                                            {patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : '—'}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-1 w-20">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-9 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all opacity-0 group-hover/row:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
                                            >
                                                <ExternalLink size={15} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "size-9 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all opacity-0 group-hover/row:opacity-100",
                                                    isDeleting === patient.id && "animate-pulse text-red-500 opacity-100"
                                                )}
                                                disabled={isDeleting === patient.id}
                                                onClick={(e) => confirmDelete(e, patient.id, patient.full_name)}
                                            >
                                                {isDeleting === patient.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                                            </Button>
                                        </div>
                                    </div>
                                </TiltCard>
                            ))
                        )}
                    </div>
                </div>

            <PatientCreateModal
                isOpen={isCreateModalOpen}
                context="directory"
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={(newPatient) => {
                    setPatients(prev => [newPatient, ...prev]);
                    setIsCreateModalOpen(false);
                }}
            />

            <Dialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Client Record</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {patientToDelete?.name}? This action will hide the record from the directory, though interaction history will be preserved.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-3 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPatientToDelete(null)}
                            disabled={!!isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={executeDelete}
                            disabled={!!isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Client'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
