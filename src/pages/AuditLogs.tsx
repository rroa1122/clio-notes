import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Calendar,
    Search,
    User,
    RefreshCw,
    Download,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Users
} from 'lucide-react';
import { toast } from 'sonner';

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

export function AuditLogs() {
    const { user } = useAuth();
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

    const isAuthorized = user?.role === 'admin' || user?.email === 'reinier.roa2.0@gmail.com';

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
            if (selectedWorker) {
                query = query.eq('user_id', selectedWorker);
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
            toast.error('No se pudieron cargar las trazas.');
        } finally {
            setLoading(false);
        }
    }, [user?.clinic_id, selectedWorker, descriptionSearch, datePreset, currentPage]);

    useEffect(() => {
        if (isAuthorized) {
            fetchWorkers();
        }
    }, [isAuthorized, fetchWorkers]);

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs();
        }
    }, [isAuthorized, fetchLogs]);

    // Reset page to 1 when filters change
    const handleFilterChange = () => {
        setCurrentPage(1);
    };

    // CSV Export
    const handleExport = async () => {
        if (!user?.clinic_id) return;
        try {
            toast.loading('Generando reporte...');
            let query = supabase
                .from('audit_logs')
                .select('created_at, user_name, user_email, action, description')
                .eq('clinic_id', user.clinic_id);

            if (selectedWorker) query = query.eq('user_id', selectedWorker);
            if (descriptionSearch.trim()) query = query.ilike('description', `%${descriptionSearch}%`);

            if (datePreset !== 'all') {
                const date = new Date();
                if (datePreset === 'today') date.setHours(0, 0, 0, 0);
                else if (datePreset === '7days') date.setDate(date.getDate() - 7);
                else if (datePreset === '30days') date.setDate(date.getDate() - 30);
                query = query.gte('created_at', date.toISOString());
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(2000); // Reasonable limit for CSV
            
            toast.dismiss();
            if (error) throw error;
            if (!data || data.length === 0) {
                toast.info('No hay trazas para exportar.');
                return;
            }

            // Convert data to CSV format
            const headers = ['Fecha', 'Trabajador', 'Email', 'Accion', 'Descripcion'];
            const csvRows = [
                headers.join(','),
                ...data.map(row => {
                    const formattedDate = new Date(row.created_at).toLocaleString('es-ES');
                    const escapedDesc = row.description.replace(/"/g, '""');
                    const escapedName = row.user_name.replace(/"/g, '""');
                    return `"${formattedDate}","${escapedName}","${row.user_email}","${row.action}","${escapedDesc}"`;
                })
            ];

            const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_trazas_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Reporte CSV descargado con éxito.');
        } catch (e) {
            console.error('Error exporting CSV:', e);
            toast.error('Error al exportar el reporte.');
        }
    };

    // Date formatting helper (matches screenshot look)
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace('.', '');
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

    if (!isAuthorized) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-slate-950/20 border border-slate-800 rounded-3xl backdrop-blur-sm">
                <div className="size-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 mb-4 animate-bounce">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">Acceso No Autorizado</h1>
                <p className="text-slate-400 max-w-md text-sm">
                    Esta sección contiene registros de auditoría confidenciales regulados bajo HIPAA. Solo los administradores autorizados de la empresa pueden acceder a este historial.
                </p>
            </div>
        );
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto text-slate-100 font-sans">
            {/* Header Path */}
            <div className="flex flex-col gap-1">
                <div className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>Inicio</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-400">Trazas de la Empresa</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-3">
                        {totalCount.toLocaleString()} <span className="text-lg font-medium text-slate-400">Trazas Registradas</span>
                    </h1>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/80 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Main Filters and Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Sidebar Filters */}
                <div className="lg:col-span-1 bg-[#0d0f1e] border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-400 border-b border-white/10 pb-3">
                        <Users size={16} />
                        Filtros de Auditoría
                    </div>

                    {/* Filter 1: Trabajador */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trabajador</label>
                        <div className="relative">
                            <select
                                value={selectedWorker}
                                onChange={(e) => { setSelectedWorker(e.target.value); handleFilterChange(); }}
                                className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Todos los trabajadores</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.full_name || w.email}
                                    </option>
                                ))}
                            </select>
                            <User className="absolute right-3.5 top-3.5 size-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Filter 2: Descripción */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={descriptionSearch}
                                onChange={(e) => { setDescriptionSearch(e.target.value); handleFilterChange(); }}
                                placeholder="Buscar acción o palabra clave..."
                                className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-500 transition-all"
                            />
                            <Search className="absolute right-3.5 top-3.5 size-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Filter 3: Rango de Fecha Presets */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Período de Tiempo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['today', '7days', '30days', 'all'] as const).map((preset) => {
                                const labels = {
                                    today: 'Hoy',
                                    '7days': 'Últimos 7 días',
                                    '30days': 'Últimos 30 días',
                                    all: 'Todo el historial'
                                };
                                return (
                                    <button
                                        key={preset}
                                        onClick={() => { setDatePreset(preset); handleFilterChange(); }}
                                        className={`h-9 text-xs rounded-xl font-semibold border transition-all duration-200 ${
                                            datePreset === preset
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
                        className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                    >
                        <Download size={15} />
                        Generar Reporte
                    </button>
                </div>

                {/* Right Table Section */}
                <div className="lg:col-span-3 bg-[#0d0f1e] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left">
                                    <th className="pb-4 w-1/4">Trabajador</th>
                                    <th className="pb-4 w-1/4">Fecha</th>
                                    <th className="pb-4 w-2/4">Descripción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                                {loading ? (
                                    // Skeleton loading states
                                    Array.from({ length: 6 }).map((_, idx) => (
                                        <tr key={idx} className="animate-pulse">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-800" />
                                                    <div className="h-4 w-24 bg-slate-800 rounded" />
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="h-4 w-32 bg-slate-800 rounded" />
                                            </td>
                                            <td className="py-4">
                                                <div className="h-4 w-3/4 bg-slate-800 rounded" />
                                            </td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-slate-500 text-sm italic">
                                            No se encontraron trazas de auditoría con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {getInitials(log.user_name)}
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="font-semibold text-slate-200 truncate">{log.user_name}</span>
                                                        <span className="text-[10px] text-slate-500 truncate">{log.user_email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-slate-400 text-xs font-mono">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="py-4 text-slate-200 font-medium">
                                                {log.description}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 mt-6">
                            <span className="text-xs text-slate-500">
                                Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount.toLocaleString()} Trazas
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:border-slate-800 disabled:hover:text-slate-400 transition-all cursor-pointer"
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
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <span className="text-slate-600 px-1">...</span>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`size-8 text-xs font-bold rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700`}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:border-slate-800 disabled:hover:text-slate-400 transition-all cursor-pointer"
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
