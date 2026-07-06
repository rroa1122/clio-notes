
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { storage, type Patient } from '../notes-module/lib/storage';
import { Search, Calendar, MoreHorizontal, UserPlus, Users2, Trash2, ExternalLink, Loader2 } from 'lucide-react';
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
    if ('AEIOU'.includes(char)) return 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300';
    if ('BCDFG'.includes(char)) return 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300';
    if ('HJKLM'.includes(char)) return 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300';
    if ('NPQRS'.includes(char)) return 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300';
    return 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300';
};

export function Patients() {
    const { t, language } = useLanguage();
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
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-4 pt-4 lg:pt-8 h-auto lg:h-[calc(100vh-10rem)] mb-2">
            <div className="flex flex-col lg:flex-1 bg-transparent md:bg-surface dark:md:bg-slate-900 rounded-[2rem] shadow-none md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border-0 md:border border-border/60 overflow-visible lg:overflow-hidden relative h-auto lg:h-full">
                {/* Card Header area matching the history timeline filters */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 px-8 py-8 bg-surface border-b border-border/60 z-20 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 pl-1 leading-tight">
                            {t('nav.clients', 'Clients')}
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5 pl-1">
                            <div className={cn(
                                "size-2 rounded-full", 
                                isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-tactile-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            )} />
                            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {isLoading ? (language === 'es' ? "Sincronizando..." : "Syncing...") : (language === 'es' ? "Directorio Clínico" : "Clinical Directory")}
                            </span>
                        </div>
                    </div>

                    {/* Nav Right - Search & Add Client button */}
                    <div className="flex flex-col gap-2 flex-1 max-w-[500px] w-full">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5" />
                                {language === 'es' ? "Filtrar Directorio" : "Filter Patients"}
                            </span>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-500 flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                {t('patients.new_patient', 'New Client')}
                            </button>
                        </div>
                        <div className="flex items-center border border-border/80 rounded-2xl px-4 h-[52px] bg-card shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <div className="text-slate-400 mr-3 pointer-events-none flex-shrink-0">
                                <Search className="w-4 h-4" />
                            </div>
                            <Input
                                type="text"
                                placeholder={t('patients.search_placeholder', 'Search by name, DOB, or case number...')}
                                className="h-full w-full bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-visible lg:flex-1 lg:overflow-y-auto">
                                        {/* Desktop View */}
                    <div className="hidden lg:block">
                        <Table>
                            <TableHeader className="sticky top-0 bg-surface dark:bg-slate-900 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                <TableRow className="hover:bg-transparent border-b border-border/60">
                                    <TableHead className="px-8 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider pl-8">
                                        {t('record.client_identity', 'Client Identity')}
                                    </TableHead>
                                    <TableHead className="py-4 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                        {t('patient.label.dob', 'Date of Birth')}
                                    </TableHead>
                                    <TableHead className="py-4 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                        {t('patient.label.case_number', 'EMR ID / MRN')}
                                    </TableHead>
                                    <TableHead className="py-4 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                        {t('patients.table.created', 'Registered')}
                                    </TableHead>
                                    <TableHead className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider pr-8">
                                        {t('patients.table.actions', 'Actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && patients.length === 0 ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5} className="px-8 py-4 pl-8">
                                                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse w-full opacity-50" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : patients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-8 py-16 text-center">
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
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    patients.map((patient) => (
                                        <TableRow
                                            key={patient.id}
                                            onClick={() => navigate(`/patients/${patient.id}`)}
                                            className="cursor-pointer group h-16 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors border-b border-slate-100/60 dark:border-slate-800/80 last:border-b-0"
                                        >
                                            {/* Identity */}
                                            <TableCell className="px-8 py-3 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "size-10 rounded-2xl flex items-center justify-center font-bold text-[14px] shrink-0 transition-transform duration-300 group-hover:scale-105",
                                                        getInitialsTheme(patient.full_name)
                                                    )}>
                                                        {patient.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight leading-snug">
                                                            {patient.full_name}
                                                        </span>
                                                        {patient.phone ? (
                                                            <span className="text-[12px] text-slate-400 dark:text-slate-400 font-normal mt-0.5 leading-none">
                                                                {patient.phone}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[12px] text-slate-300 dark:text-slate-500 italic font-normal mt-0.5 leading-none">
                                                                {language === 'es' ? 'Sin teléfono de contacto' : 'No contact phone'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* DOB */}
                                            <TableCell className="py-3 text-[13px] text-slate-500 dark:text-slate-300 font-medium">
                                                {patient.dob && !isNaN(new Date(patient.dob).getTime())
                                                    ? format(new Date(patient.dob), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })
                                                    : <span className="text-slate-300 dark:text-slate-600 italic font-normal">—</span>}
                                            </TableCell>

                                            {/* ID */}
                                            <TableCell className="py-3">
                                                {patient.emr_id ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/20 dark:border-slate-800">
                                                        {patient.emr_id}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-700 italic font-normal text-[13px]">—</span>
                                                )}
                                            </TableCell>

                                            {/* Date */}
                                            <TableCell className="py-3 text-[13px] text-slate-400 dark:text-slate-300 font-medium">
                                                {patient.created_at ? format(new Date(patient.created_at), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM d, yyyy', { locale: language === 'es' ? es : undefined }) : '—'}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-8 py-3 text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 rounded-lg text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/25 transition-all opacity-0 group-hover:opacity-100 duration-200"
                                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                                    >
                                                        <ExternalLink size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            "size-8 rounded-lg text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/50 transition-all opacity-0 group-hover:opacity-100 duration-200",
                                                            isDeleting === patient.id && "animate-pulse text-red-500 opacity-100"
                                                        )}
                                                        disabled={isDeleting === patient.id}
                                                        onClick={(e) => confirmDelete(e, patient.id, patient.full_name)}
                                                    >
                                                        {isDeleting === patient.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
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
                                                <span className="font-bold text-slate-850 dark:text-slate-200 text-sm tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
                                                    {patient.full_name}
                                                </span>
                                                {patient.emr_id && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 shrink-0">
                                                        {patient.emr_id}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-tight">
                                                <span>
                                                    {patient.dob ? `${language === 'es' ? 'F. Nac: ' : 'DOB: '}${format(new Date(patient.dob), language === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')}` : (language === 'es' ? 'Sin fecha nac.' : 'No DOB')}
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
