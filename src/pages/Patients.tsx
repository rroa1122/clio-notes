
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage, type Patient } from '../notes-module/lib/storage';
import { Search, Calendar, MoreHorizontal, UserPlus, Users2, Trash2, ExternalLink, Loader2, SlidersHorizontal, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
    if ('AEIOU'.includes(char)) return 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100/30 dark:border-indigo-900/30';
    if ('BCDFG'.includes(char)) return 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100/30 dark:border-emerald-900/30';
    if ('HJKLM'.includes(char)) return 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-100/30 dark:border-purple-900/30';
    if ('NPQRS'.includes(char)) return 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-100/30 dark:border-amber-900/30';
    return 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-100/30 dark:border-blue-900/30';
};

export function Patients() {
    const { t, language } = useLanguage();
    const { isLocked } = useAuth();
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
            toast.error(language === 'es' ? "Error al cargar el directorio de pacientes" : "Failed to load patient directory");
        } finally {
            setIsLoading(false);
        }
    }, [language]);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    // Handle unlocking: reset search term and refresh full list
    useEffect(() => {
        const handleUnlock = () => {
            setSearchTerm('');
            loadPatients('');
        };
        window.addEventListener('clio_screen_unlocked', handleUnlock);
        return () => window.removeEventListener('clio_screen_unlocked', handleUnlock);
    }, [loadPatients]);

    useEffect(() => {
        if (!isLocked) {
            loadPatients(searchTerm);
        }
    }, [isLocked, loadPatients]);

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
            toast.success(language === 'es' ? `${patientToDelete.name} eliminado del directorio` : `${patientToDelete.name} removed from directory`);
            setPatientToDelete(null);
        } catch (err) {
            console.error("Delete failed:", err);
            toast.error(language === 'es' ? "Error al eliminar el registro del cliente" : "Failed to delete client record");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-2 sm:px-4 pt-1 lg:pt-3 h-auto lg:h-[calc(100vh-6.5rem)] mb-2">
            <div className="flex flex-col lg:flex-1 bg-transparent md:bg-surface md:dark:bg-slate-900 rounded-[2rem] shadow-none md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border-0 md:border border-border/60 overflow-visible lg:overflow-hidden relative h-auto lg:h-full">
                {/* Card Header area matching the history timeline filters */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-8 py-6 bg-surface border-b border-slate-105 dark:border-slate-800/80 z-20 shrink-0">
                    {/* Column 1 - Clinical Directory Stats (4/12 width) */}
                    <div className="md:col-span-4 flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-2.5">
                            <Users2 className="w-3 h-3 text-slate-400" />
                            {language === 'es' ? "Directorio Clínico" : "Clinical Directory"}
                        </span>
                        <div className="flex items-center border border-slate-200/50 dark:border-slate-800/50 rounded-[28px] px-5 h-11 bg-slate-50/30 dark:bg-slate-950/10 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.01)] hover:border-emerald-500/30 dark:hover:border-emerald-500/20 hover:bg-emerald-50/5 dark:hover:bg-emerald-950/5 transition-all duration-300 cursor-default">
                            <div className="size-2 rounded-full bg-emerald-500 animate-tactile-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] mr-3 shrink-0" />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                {patients.length} {patients.length === 1 ? (language === 'es' ? 'Paciente' : 'Client') : (language === 'es' ? 'Pacientes' : 'Clients')}
                            </span>
                        </div>
                    </div>

                    {/* Column 2, 3, 4 - Filter & Add Patient (8/12 width) */}
                    <div className="md:col-span-8 flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between w-full px-2.5">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                                {language === 'es' ? "Filtrar Directorio" : "Filter Registry"}
                            </span>
                            
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-500 flex items-center gap-1.5 transition-colors bg-transparent border-0 cursor-pointer"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                {t('patients.new_patient', 'New Client')}
                            </button>
                        </div>
                        
                        <div className="flex items-center border border-slate-200/80 dark:border-slate-800/80 rounded-[28px] px-5 h-11 bg-slate-50/50 dark:bg-slate-950/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                            <div className="text-slate-400 mr-3 pointer-events-none flex-shrink-0">
                                <Search className="w-4 h-4" />
                            </div>
                            <Input
                                id="patient_search_query"
                                name="patient_search_query"
                                type="text"
                                placeholder={t('patients.search_placeholder', 'Search by name, DOB, or case number...')}
                                className="h-full w-full bg-transparent border-0 p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-650"
                                value={searchTerm}
                                onChange={handleSearch}
                                autoComplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                data-bwignore="true"
                                data-form-type="other"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-visible lg:flex-1 lg:overflow-y-auto">                    {/* Desktop View */}                    <div className="hidden lg:block py-4 px-8">
                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-4 -mx-8 px-14 pb-3.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800/80 mb-5">
                            <div className="col-span-4">{t('record.client_identity', 'Client Identity')}</div>
                            <div className="col-span-3">{t('patient.label.dob', 'Date of Birth')}</div>
                            <div className="col-span-2">{t('patient.label.case_number', 'EMR ID / MRN')}</div>
                            <div className="col-span-2">{t('patients.table.created', 'Registered')}</div>
                            <div className="col-span-1 text-right pr-2">{t('patients.table.actions', 'Actions')}</div>
                        </div>

                        {/* Body Rows */}
                        <div className="space-y-3.5">
                            {isLoading && patients.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/40 dark:border-slate-800/40 rounded-full animate-pulse opacity-50" />
                                ))
                            ) : patients.length === 0 ? (
                                <div className="py-16 text-center">
                                    <EmptyState
                                        icon={searchTerm ? Search : Users2}
                                        title={searchTerm ? (language === 'es' ? "No se encontraron resultados" : "No results found") : (language === 'es' ? "Directorio Vacío" : "Directory Empty")}
                                        description={searchTerm ? (language === 'es' ? `No pudimos encontrar ningún registro que coincida con "${searchTerm}".` : `We couldn't find any record matching "${searchTerm}".`) : (language === 'es' ? "Tu directorio clínico está vacío." : "Your clinical directory is empty.")}
                                        action={searchTerm ? {
                                            label: language === 'es' ? "Limpiar Búsqueda" : "Clear Search",
                                            onClick: () => {
                                                setSearchTerm('');
                                                loadPatients();
                                            }
                                        } : undefined}
                                    />
                                </div>
                            ) : (
                                patients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                        className="grid grid-cols-12 gap-4 items-center border border-slate-100 dark:border-slate-800 bg-surface dark:bg-slate-900/60 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/5 hover:border-indigo-300/80 dark:hover:border-indigo-800/60 rounded-full px-6 py-2.5 transition-all duration-300 cursor-pointer group shadow-[0_4px_16px_-4px_rgba(99,102,241,0.02)] dark:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(99,102,241,0.18)] dark:hover:shadow-[0_12px_45px_-8px_rgba(0,0,0,0.55)]"
                                    >
                                        {/* Identity: Avatar + Name + Phone */}
                                        <div className="col-span-4 flex items-center gap-3.5 min-w-0">
                                            <div className={cn(
                                                "size-10 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0 transition-all duration-300 group-hover:scale-105 shadow-sm",
                                                getInitialsTheme(patient.full_name)
                                            )}>
                                                {patient.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate transition-colors tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                    {patient.full_name}
                                                </span>
                                                {patient.phone ? (
                                                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                                                        {patient.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-350 dark:text-slate-600 italic font-bold mt-0.5 leading-none">
                                                        {language === 'es' ? 'Sin teléfono de contacto' : 'No contact phone'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* DOB */}
                                        <div className="col-span-3 flex items-center min-w-0">
                                            {patient.dob && !isNaN(new Date(patient.dob + "T00:00:00").getTime()) ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-500/70 dark:text-indigo-400/60 shrink-0" />
                                                    {format(new Date(patient.dob + "T00:00:00"), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-650 italic font-normal ml-5">—</span>
                                            )}
                                        </div>

                                        {/* Case Number */}
                                        <div className="col-span-2 flex items-center">
                                            {patient.emr_id ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-0.5 rounded-full border border-indigo-100/30 dark:border-indigo-900/30">
                                                    <Tag className="w-2.5 h-2.5 opacity-80 shrink-0" />
                                                    {patient.emr_id}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700 italic font-normal text-xs">—</span>
                                            )}
                                        </div>

                                        {/* Registered At */}
                                        <div className="col-span-2 flex items-center min-w-0">
                                            {patient.created_at ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-500/50 dark:text-indigo-400/40 shrink-0" />
                                                    {format(new Date(patient.created_at), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                                                </span>
                                            ) : (
                                                <span className="text-slate-350 dark:text-slate-650 italic font-normal ml-5">—</span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 rounded-full text-slate-400 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 border border-transparent hover:border-indigo-105 dark:hover:border-indigo-500/25 transition-all opacity-0 group-hover:opacity-100 duration-200"
                                                onClick={() => navigate(`/patients/${patient.id}`)}
                                            >
                                                <ExternalLink size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "size-8 rounded-full text-slate-400 dark:text-slate-455 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50 transition-all opacity-0 group-hover:opacity-100 duration-200",
                                                    isDeleting === patient.id && "animate-pulse text-rose-500 opacity-100"
                                                )}
                                                disabled={isDeleting === patient.id}
                                                onClick={(e) => confirmDelete(e, patient.id, patient.full_name)}
                                            >
                                                {isDeleting === patient.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="block lg:hidden space-y-4 px-4 pb-6">
                        {isLoading && patients.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/40 animate-pulse flex items-center gap-4">
                                    <div className="size-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2.5">
                                        <div className="h-4 bg-slate-200/60 dark:bg-slate-800 rounded animate-pulse w-2/3" />
                                        <div className="h-3 bg-slate-200/60 dark:bg-slate-800 rounded animate-pulse w-1/3" />
                                    </div>
                                </div>
                            ))
                        ) : patients.length === 0 ? (
                            <div className="py-16 text-center">
                                <EmptyState
                                    icon={searchTerm ? Search : Users2}
                                    title={searchTerm ? (language === 'es' ? "No se encontraron resultados" : "No results found") : (language === 'es' ? "Directorio Vacío" : "Directory Empty")}
                                    description={searchTerm ? (language === 'es' ? `No pudimos encontrar ningún registro que coincida con "${searchTerm}".` : `We couldn't find any record matching "${searchTerm}".`) : (language === 'es' ? "Tu directorio clínico está vacío." : "Your clinical directory is empty.")}
                                    action={searchTerm ? {
                                        label: language === 'es' ? "Limpiar Búsqueda" : "Clear Search",
                                        onClick: () => {
                                            setSearchTerm('');
                                            loadPatients();
                                        }
                                    } : undefined}
                                />
                            </div>
                        ) : (
                            patients.map((patient) => (
                                <div 
                                    key={patient.id} 
                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                    className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/60 shadow-sm hover:shadow-md hover:border-indigo-500/25 active:scale-[0.99] transition-all duration-300 flex items-center justify-between group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "size-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105",
                                            getInitialsTheme(patient.full_name)
                                        )}>
                                            {patient.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className="font-bold text-foreground text-sm tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
                                                    {patient.full_name}
                                                </span>
                                                {patient.emr_id && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 shrink-0">
                                                        {patient.emr_id}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-semibold tracking-tight">
                                                <span>
                                                    {patient.dob ? `${language === 'es' ? 'F. Nac: ' : 'DOB: '}${format(new Date(patient.dob + "T00:00:00"), language === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')}` : (language === 'es' ? 'Sin fecha nac.' : 'No DOB')}
                                                </span>
                                                {patient.phone && (
                                                    <>
                                                        <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                        <span className="truncate">{patient.phone}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
                                            onClick={(e) => confirmDelete(e, patient.id, patient.full_name)}
                                        >
                                            <Trash2 size={15} />
                                        </Button>
                                    </div>
                                </div>
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
                        <DialogTitle>{language === 'es' ? "Eliminar registro de cliente" : "Delete Client Record"}</DialogTitle>
                        <DialogDescription>
                            {language === 'es' 
                                ? `¿Está seguro de que desea eliminar a ${patientToDelete?.name}? Esta acción ocultará el registro del directorio, pero se preservará el historial de interacciones.`
                                : `Are you sure you want to delete ${patientToDelete?.name}? This action will hide the record from the directory, though interaction history will be preserved.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-3 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPatientToDelete(null)}
                            disabled={!!isDeleting}
                        >
                            {t('patient.cancel', 'Cancel')}
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
                                    {language === 'es' ? "Eliminando..." : "Deleting..."}
                                </>
                            ) : (
                                language === 'es' ? "Eliminar Cliente" : "Delete Client"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
