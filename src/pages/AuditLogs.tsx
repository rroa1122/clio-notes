import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Search,
    User,
    RefreshCw,
    Download,
    ChevronLeft,
    ChevronRight,
    Clock,
    Activity,
    LogIn,
    Eye,
    PlusCircle,
    Trash2,
    FileCheck,
    Printer,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    action: string;
    description: string;
    target_type: string | null;
    target_id: string | null;
    clinic_id: string | null;
    created_at: string;
}

interface WorkerProfile {
    id: string;
    full_name: string | null;
    email: string;
}

const translateDescription = (desc: string, language: string): string => {
    if (!desc) return '';
    if (language === 'es') return desc;
    
    // Exact matches
    const exactMatches: Record<string, string> = {
        'Cerró sesión voluntariamente': 'Logged out voluntarily',
        'Inició sesión en el sistema': 'Logged into the system',
        'Sesión cerrada automáticamente por inactividad (15 minutos)': 'Session closed automatically due to inactivity (15 minutes)'
    };
    
    if (exactMatches[desc]) {
        return exactMatches[desc];
    }
    
    // Regexp matches
    if (desc.startsWith('Accedió al expediente del paciente ')) {
        return desc.replace('Accedió al expediente del paciente ', 'Accessed patient chart for ');
    }
    if (desc.startsWith('Creó el expediente del paciente ')) {
        return desc.replace('Creó el expediente del paciente ', 'Created patient chart for ');
    }
    if (desc.startsWith('Eliminó el expediente del paciente ')) {
        return desc.replace('Eliminó el expediente del paciente ', 'Deleted patient chart for ');
    }
    if (desc.startsWith('Modificó el expediente del paciente ')) {
        return desc.replace('Modificó el expediente del paciente ', 'Modified patient chart for ');
    }
    if (desc.startsWith('Guardó/Modificó la nota clínica del paciente ')) {
        return desc.replace('Guardó/Modificó la nota clínica del paciente ', 'Saved/Modified clinical note for patient ');
    }
    if (desc.startsWith('Generó/Guardó nota clínica analizada para el paciente ')) {
        return desc.replace('Generó/Guardó nota clínica analizada para el paciente ', 'Generated/Saved analyzed clinical note for patient ');
    }
    if (desc.startsWith('Eliminó la nota clínica del paciente ')) {
        return desc.replace('Eliminó la nota clínica del paciente ', 'Deleted clinical note for patient ');
    }
    if (desc.startsWith('Imprimió/Exportó a PDF la nota clínica del paciente ')) {
        return desc.replace('Imprimió/Exportó a PDF la nota clínica del paciente ', 'Printed/Exported to PDF clinical note for patient ');
    }
    if (desc.startsWith('Solicitó firma digital de ') && desc.includes(' para la nota clínica del paciente ')) {
        return desc
            .replace('Solicitó firma digital de ', 'Requested digital signature from ')
            .replace(' para la nota clínica del paciente ', ' for clinical note of patient ');
    }
    
    return desc;
};

const getActionTypeInfo = (desc: string = '', action: string = '', language: string = 'es') => {
    const lower = (desc + ' ' + action).toLowerCase();
    
    if (lower.includes('eliminó') || lower.includes('delete')) {
        return {
            label: language === 'es' ? 'Eliminación' : 'Deletion',
            color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            icon: <Trash2 size={12} className="shrink-0" />
        };
    }
    if (lower.includes('inició sesión') || lower.includes('cerró sesión') || lower.includes('login') || lower.includes('logout') || lower.includes('auth')) {
        return {
            label: language === 'es' ? 'Autenticación' : 'Auth',
            color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            icon: <LogIn size={12} className="shrink-0" />
        };
    }
    if (lower.includes('firma') || lower.includes('sign')) {
        return {
            label: language === 'es' ? 'Firma' : 'Signature',
            color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
            icon: <FileCheck size={12} className="shrink-0" />
        };
    }
    if (lower.includes('imprimió') || lower.includes('pdf') || lower.includes('export') || lower.includes('print')) {
        return {
            label: language === 'es' ? 'Exportación' : 'Export',
            color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            icon: <Printer size={12} className="shrink-0" />
        };
    }
    if (lower.includes('creó') || lower.includes('generó') || lower.includes('guardó') || lower.includes('create') || lower.includes('save')) {
        return {
            label: language === 'es' ? 'Registro' : 'Record',
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            icon: <PlusCircle size={12} className="shrink-0" />
        };
    }
    if (lower.includes('accedió') || lower.includes('access') || lower.includes('view') || lower.includes('read')) {
        return {
            label: language === 'es' ? 'Consulta' : 'View',
            color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            icon: <Eye size={12} className="shrink-0" />
        };
    }

    return {
        label: language === 'es' ? 'Actividad' : 'Activity',
        color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        icon: <Activity size={12} className="shrink-0" />
    };
};

export function AuditLogs() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filter states
    const [selectedWorker, setSelectedWorker] = useState<string>('');
    const [descriptionSearch, setDescriptionSearch] = useState<string>('');
    const [datePreset, setDatePreset] = useState<'today' | '7days' | '30days' | 'all'>('30days');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const isAdmin = user?.role === 'admin' || user?.email === 'reinier.roa2.0@gmail.com';

    // Fetch Workers for the filter dropdown
    const fetchWorkers = useCallback(async () => {
        if (!user?.clinic_id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('clinic_id', user.clinic_id)
                .order('full_name', { ascending: true });

            if (error) throw error;
            setWorkers(data || []);
        } catch (e) {
            console.error('Error fetching workers:', e);
        }
    }, [user?.clinic_id]);

    // Fetch Logs based on filters
    const fetchLogs = useCallback(async () => {
        if (!user?.clinic_id) return;
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .eq('clinic_id', user.clinic_id);

            // Apply Filters
            if (isAdmin) {
                if (selectedWorker) {
                    query = query.eq('user_id', selectedWorker);
                }
            } else {
                query = query.eq('user_id', user.id);
            }
            if (descriptionSearch.trim()) {
                query = query.ilike('description', `%${descriptionSearch}%`);
            }

            // Date Preset Filter
            if (datePreset !== 'all') {
                const date = new Date();
                if (datePreset === 'today') {
                    date.setHours(0, 0, 0, 0);
                } else if (datePreset === '7days') {
                    date.setDate(date.getDate() - 7);
                } else if (datePreset === '30days') {
                    date.setDate(date.getDate() - 30);
                }
                query = query.gte('created_at', date.toISOString());
            }

            // Pagination and Order
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setLogs(data || []);
            setTotalCount(count || 0);
        } catch (e: any) {
            console.error('Error fetching logs:', e);
            toast.error(language === 'es' ? 'Error al cargar los registros.' : 'Failed to load audit logs.');
        } finally {
            setLoading(false);
        }
    }, [user?.clinic_id, user?.id, isAdmin, selectedWorker, descriptionSearch, datePreset, currentPage, language]);

    useEffect(() => {
        if (isAdmin) {
            fetchWorkers();
        }
    }, [isAdmin, fetchWorkers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleFilterChange = () => {
        setCurrentPage(1);
    };

    // CSV Export
    const handleExport = async () => {
        if (!user?.clinic_id) return;
        try {
            toast.loading(language === 'es' ? 'Generando reporte...' : 'Generating report...');
            let query = supabase
                .from('audit_logs')
                .select('created_at, user_name, user_email, action, description')
                .eq('clinic_id', user.clinic_id);

            if (isAdmin) {
                if (selectedWorker) query = query.eq('user_id', selectedWorker);
            } else {
                query = query.eq('user_id', user.id);
            }
            if (descriptionSearch.trim()) query = query.ilike('description', `%${descriptionSearch}%`);

            if (datePreset !== 'all') {
                const date = new Date();
                if (datePreset === 'today') date.setHours(0, 0, 0, 0);
                else if (datePreset === '7days') date.setDate(date.getDate() - 7);
                else if (datePreset === '30days') date.setDate(date.getDate() - 30);
                query = query.gte('created_at', date.toISOString());
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);
            
            toast.dismiss();
            if (error) throw error;
            if (!data || data.length === 0) {
                toast.info(language === 'es' ? 'No hay registros para exportar.' : 'No logs to export.');
                return;
            }

            const headers = ['Date', 'Worker', 'Email', 'Action', 'Description'];
            const csvRows = [
                headers.join(','),
                ...data.map(row => {
                    const formattedDate = new Date(row.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
                    const escapedDesc = translateDescription(row.description, language).replace(/"/g, '""');
                    const escapedName = row.user_name.replace(/"/g, '""');
                    return `"${formattedDate}","${escapedName}","${row.user_email}","${row.action}","${escapedDesc}"`;
                })
            ];

            const csvContent = '\uFEFF' + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(language === 'es' ? 'Reporte CSV descargado con éxito.' : 'CSV report downloaded successfully.');
        } catch (e) {
            console.error('Error exporting CSV:', e);
            toast.error(language === 'es' ? 'Error al exportar reporte.' : 'Failed to export report.');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 lg:pt-8 pb-20 space-y-6 animate-in fade-in duration-300">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {language === 'es' ? 'Registro de Auditoría' : 'Audit Logs'}
                        </h1>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 px-2.5 py-0.5 rounded-full">
                            {totalCount.toLocaleString()} {language === 'es' ? 'registros' : 'logs'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'es' 
                            ? 'Trazabilidad y registro inmutable de accesos y modificaciones en el sistema' 
                            : 'Immutable traceability and activity log of system actions and chart accesses'}
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                        title={language === 'es' ? 'Actualizar' : 'Refresh'}
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''} />
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Download size={15} />
                        <span>{language === 'es' ? 'Exportar CSV' : 'Export CSV'}</span>
                    </button>
                </div>
            </div>

            {/* Main Unified Card */}
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl overflow-visible shadow-sm">
                
                {/* Horizontal Integrated Filter Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder={language === 'es' ? "Buscar acción, paciente o palabra..." : "Search action, patient or keyword..."}
                                value={descriptionSearch}
                                onChange={(e) => { setDescriptionSearch(e.target.value); handleFilterChange(); }}
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-xs"
                            />
                            {descriptionSearch && (
                                <button
                                    onClick={() => { setDescriptionSearch(''); handleFilterChange(); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs p-1 cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Worker Selector */}
                        {isAdmin && (
                            <div className="relative sm:w-56">
                                <select
                                    value={selectedWorker}
                                    onChange={(e) => { setSelectedWorker(e.target.value); handleFilterChange(); }}
                                    className="w-full pl-3 pr-8 py-2 text-xs bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors shadow-xs appearance-none cursor-pointer font-medium"
                                >
                                    <option value="" className="dark:bg-slate-950">{language === 'es' ? "Todos los profesionales" : "All Workers"}</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id} className="dark:bg-slate-950">
                                            {w.full_name || w.email}
                                        </option>
                                    ))}
                                </select>
                                <User className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Date Preset Segmented Control */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                        {(['today', '7days', '30days', 'all'] as const).map((preset) => {
                            const labels = {
                                today: language === 'es' ? 'Hoy' : 'Today',
                                '7days': language === 'es' ? '7 Días' : '7 Days',
                                '30days': language === 'es' ? '30 Días' : '30 Days',
                                all: language === 'es' ? 'Todo' : 'All'
                            };
                            const isSelected = datePreset === preset;
                            return (
                                <button
                                    key={preset}
                                    onClick={() => { setDatePreset(preset); handleFilterChange(); }}
                                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {labels[preset]}
                                </button>
                            );
                        })}
                    </div>

                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/80 dark:border-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-900/50">
                                <th className="py-3.5 px-6 w-1/4">{language === 'es' ? "Profesional" : "Worker"}</th>
                                <th className="py-3.5 px-6 w-1/4">{language === 'es' ? "Fecha y Hora" : "Date & Time"}</th>
                                <th className="py-3.5 px-6 w-2/4">{language === 'es' ? "Acción Realizada" : "Action & Description"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, idx) => (
                                    <tr key={idx} className="animate-pulse">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800" />
                                                <div className="space-y-1">
                                                    <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                                        {language === 'es' ? "No se encontraron registros con los filtros seleccionados." : "No audit logs found with the selected filters."}
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const actionType = getActionTypeInfo(log.description, log.action, language);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors group">
                                            {/* Worker */}
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center font-semibold text-xs shrink-0">
                                                        {getInitials(log.user_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                            {log.user_name || log.user_email?.split('@')[0]}
                                                        </p>
                                                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                                                            {log.user_email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                                                    <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                    <span>{formatDate(log.created_at)}</span>
                                                </div>
                                            </td>

                                            {/* Description with Action Pill */}
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-start sm:items-center gap-2.5 flex-col sm:flex-row">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border shrink-0 ${actionType.color}`}>
                                                        {actionType.icon}
                                                        <span>{actionType.label}</span>
                                                    </span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed text-xs">
                                                        {translateDescription(log.description, language)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Clean Minimal Pagination Bar */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {language === 'es'
                                ? `Mostrando ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} de ${totalCount.toLocaleString()} registros`
                                : `Showing ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount.toLocaleString()} logs`}
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all cursor-pointer shadow-2xs"
                                title={language === 'es' ? "Página anterior" : "Previous page"}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                                let pageNum = idx + 1;
                                if (currentPage > 3) {
                                    pageNum = currentPage - 3 + idx;
                                }
                                if (pageNum > totalPages) return null;

                                const isCurrent = currentPage === pageNum;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`size-8 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                            isCurrent
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                    <span className="text-slate-400 px-1 font-semibold text-xs">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="size-8 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all cursor-pointer shadow-2xs"
                                title={language === 'es' ? "Página siguiente" : "Next page"}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
