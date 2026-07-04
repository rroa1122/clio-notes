import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Calendar,
    Search,
    User,
    RefreshCw,
    Download,
    ChevronLeft,
    ChevronRight,
    Users
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

export function AuditLogs() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
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

    const isAuthorized = true;
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
                // Non-admins can only see their own logs
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
            toast.error('Failed to load audit logs.');
        } finally {
            setLoading(false);
        }
    }, [user?.clinic_id, user?.id, isAdmin, selectedWorker, descriptionSearch, datePreset, currentPage]);

    useEffect(() => {
        if (isAdmin) {
            fetchWorkers();
        }
    }, [isAdmin, fetchWorkers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset page to 1 when filters change
    const handleFilterChange = () => {
        setCurrentPage(1);
    };

    // CSV Export
    const handleExport = async () => {
        if (!user?.clinic_id) return;
        try {
            toast.loading('Generating report...');
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
                toast.info('No logs to export.');
                return;
            }

            // Convert data to CSV format
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
            toast.success('CSV report downloaded successfully.');
        } catch (e) {
            console.error('Error exporting CSV:', e);
            toast.error('Failed to export report.');
        }
    };

    // Date formatting helper
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

    // Get initials helper for avatar
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
        <div className="space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
            {/* Header Path */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {totalCount.toLocaleString()} <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{language === 'es' ? "Registros de Auditoría" : "Logs Registered"}</span>
                </h1>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {language === 'es' ? "Actualizar" : "Refresh"}
                </button>
            </div>

            {/* Main Filters and Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                    <div className="lg:col-span-1 bg-card border border-border/60 rounded-3xl p-6 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 border-b border-border/60 pb-3">
                        <Users size={16} />
                        {language === 'es' ? "Filtros de Auditoría" : "Audit Filters"}
                    </div>
 
                    {/* Filter 1: Worker */}
                    {isAdmin && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 px-1">{language === 'es' ? "Profesional" : "Worker"}</label>
                            <div className="relative">
                                <select
                                    value={selectedWorker}
                                    onChange={(e) => { setSelectedWorker(e.target.value); handleFilterChange(); }}
                                    className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-[#6366f1]/5 focus:border-[#6366f1]/60 transition-all appearance-none cursor-pointer font-semibold"
                                >
                                    <option value="" className="dark:bg-slate-950">{language === 'es' ? "Todos los profesionales" : "All Workers"}</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id} className="dark:bg-slate-950">
                                            {w.full_name || w.email}
                                        </option>
                                    ))}
                                </select>
                                <User className="absolute right-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
 
                    {/* Filter 2: Description */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 px-1">{language === 'es' ? "Descripción" : "Description"}</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={descriptionSearch}
                                onChange={(e) => { setDescriptionSearch(e.target.value); handleFilterChange(); }}
                                placeholder={language === 'es' ? "Buscar acción o palabra clave..." : "Search action or keyword..."}
                                className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-[#6366f1]/5 focus:border-[#6366f1]/60 placeholder-slate-300 dark:placeholder-slate-600 transition-all font-semibold"
                             />
                            <Search className="absolute right-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Filter 3: Time Range Presets */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 px-1">{language === 'es' ? "Período de Tiempo" : "Time Period"}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['today', '7days', '30days', 'all'] as const).map((preset) => {
                                const labels = {
                                    today: language === 'es' ? 'Hoy' : 'Today',
                                    '7days': language === 'es' ? 'Últimos 7 días' : 'Last 7 Days',
                                    '30days': language === 'es' ? 'Últimos 30 días' : 'Last 30 Days',
                                    all: language === 'es' ? 'Todo el historial' : 'All History'
                                };
                                return (
                                    <button
                                        key={preset}
                                        onClick={() => { setDatePreset(preset); handleFilterChange(); }}
                                        className={`h-9 text-xs rounded-xl font-bold transition-all duration-200 border ${
                                            datePreset === preset
                                                ? 'bg-[#6366f1] border-[#6366f1] text-white shadow-md shadow-indigo-500/10 dark:shadow-none'
                                                : 'bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {labels[preset]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Report Export Button */}
                    <button
                        onClick={handleExport}
                        className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-indigo-500/20 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                    >
                        <Download size={15} />
                        {language === 'es' ? "Exportar Reporte" : "Export Report"}
                    </button>
                </div>

                {/* Right Table Section */}
                <div className="lg:col-span-3 bg-card border border-border/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">
                                    <th className="pb-4 w-1/4">{language === 'es' ? "Profesional" : "Worker"}</th>
                                    <th className="pb-4 w-1/4">{language === 'es' ? "Fecha" : "Date"}</th>
                                    <th className="pb-4 w-2/4">{language === 'es' ? "Descripción" : "Description"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                {loading ? (
                                    // Skeleton loading states
                                    Array.from({ length: 6 }).map((_, idx) => (
                                        <tr key={idx} className="animate-pulse">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                                                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                                            </td>
                                            <td className="py-4">
                                                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                                            </td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-slate-400 text-sm italic font-medium">
                                            {language === 'es' ? "No se encontraron registros de auditoría con los filtros seleccionados." : "No audit logs found with the selected filters."}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {getInitials(log.user_name)}
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{log.user_name}</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate font-semibold">{log.user_email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-slate-500 dark:text-slate-300 text-xs font-mono font-medium">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="py-4 text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                                                {translateDescription(log.description, language)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-850 pt-6 mt-6">
                            <span className="text-xs text-slate-400 font-bold">
                                {language === 'es'
                                    ? `Mostrando ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} de ${totalCount.toLocaleString()} Registros`
                                    : `Showing ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount.toLocaleString()} Logs`}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-border/80 bg-card text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-border/80 disabled:hover:bg-card transition-all cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                                    // Simple pagination sliding window
                                    let pageNum = idx + 1;
                                    if (currentPage > 3) {
                                        pageNum = currentPage - 3 + idx;
                                    }
                                    if (pageNum > totalPages) return null;
 
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`size-8 text-xs font-bold rounded-lg border transition-all ${
                                                currentPage === pageNum
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'bg-card border-border/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
 
                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <span className="text-slate-300 px-1 font-bold">...</span>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="size-8 text-xs font-bold rounded-lg border bg-card border-border/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
 
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-border/80 bg-card text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-border/80 disabled:hover:bg-card transition-all cursor-pointer"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
