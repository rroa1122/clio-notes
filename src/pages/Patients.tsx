
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
        <div className="flex flex-col animate-in fade-in duration-700 max-w-7xl mx-auto w-full px-6 pt-8 pb-12">
            <div className="flex flex-col bg-white border border-slate-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden min-h-[80vh]">
                
                {/* Header Section - Premium Refinement */}
                <div className="flex flex-col gap-6 p-10 pb-8 bg-white shrink-0">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-[0.2em] pl-1">Clinical Directory</span>
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Clients</h1>
                            <div className="flex items-center gap-2.5 mt-1">
                                <div className={cn(
                                    "size-2 rounded-full", 
                                    isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-tactile-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                )} />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    {isLoading ? "Syncing..." : `${patients.length} active records`}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-[350px] group/search">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-all duration-300 pointer-events-none">
                                    <Search size={18} strokeWidth={2.5} />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Search directory..."
                                    className="!pl-12 h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-[6px] focus:ring-primary/5 focus:border-primary/20 transition-all text-[15px] font-medium placeholder:text-slate-400 shadow-none"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                            <Button
                                className="rounded-2xl font-bold gap-2.5 h-12 px-8 shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all text-[14px] bg-primary hover:bg-primary/90"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                <UserPlus className="h-5 w-5" strokeWidth={2.5} />
                                <span>New Client</span>
                            </Button>
                        </div>
                    </div>

                    {/* Table Headers (Simulated) */}
                    <div className="grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Client Identity</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Date of Birth</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">EMR ID / MRN</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Registered</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-20 text-right">Actions</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    <div className="flex flex-col gap-2.5">
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
                                        className="grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 items-center px-4 h-16 bg-white border border-slate-100 rounded-xl hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group/row"
                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                    >
                                        {/* Identity */}
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="size-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-semibold text-[12px] border border-slate-100 group-hover/row:bg-primary/10 group-hover/row:text-primary transition-all duration-300">
                                                {patient.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-600 text-[14px] truncate group-hover/row:text-primary transition-colors tracking-tight">
                                                    {patient.full_name}
                                                </span>
                                                {patient.phone && (
                                                    <span className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
                                                        {patient.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* DOB */}
                                        <span className="text-[11px] text-slate-500 font-medium font-mono">
                                            {patient.dob && !isNaN(new Date(patient.dob).getTime())
                                                ? format(new Date(patient.dob), 'MMM d, yyyy')
                                                : <span className="text-slate-300 italic font-normal">—</span>}
                                        </span>

                                        {/* ID */}
                                        <div>
                                            {patient.emr_id ? (
                                                <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-400 border-none uppercase tracking-widest">
                                                    {patient.emr_id}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-300 italic font-normal text-[11px]">—</span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                                            {patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : '—'}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-1 w-20">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5 opacity-0 group-hover/row:opacity-100 transition-all"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
                                            >
                                                <ExternalLink size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "size-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-all",
                                                    isDeleting === patient.id && "animate-pulse text-red-500 opacity-100"
                                                )}
                                                disabled={isDeleting === patient.id}
                                                onClick={(e) => confirmDelete(e, patient.id, patient.full_name)}
                                            >
                                                {isDeleting === patient.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </Button>
                                        </div>
                                    </div>
                                </TiltCard>
                            ))
                        )}
                    </div>
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
