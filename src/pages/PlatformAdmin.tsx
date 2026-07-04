import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Users,
    Shield,
    Calendar,
    Award,
    CreditCard,
    Terminal,
    FileText,
    Users2,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DoctorProfile {
    id: string;
    email: string;
    full_name: string;
    first_name: string;
    last_name: string;
    professional_title: string;
    npi: string;
    license_id: string;
    created_at: string;
    subscription_tier: string;
    patientsCount?: number;
    notesCount?: number;
    loadingStats?: boolean;
}

export function PlatformAdmin() {
    const { impersonateUser, stopImpersonating, isImpersonating, user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

    const handlePlanChange = async (doctorId: string, newTier: string) => {
        try {
            setUpdatingPlanId(doctorId);
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_tier: newTier })
                .eq('id', doctorId);

            if (error) throw error;

            setDoctors(prev => prev.map(d => d.id === doctorId ? {
                ...d,
                subscription_tier: newTier
            } : d));

            toast.success('Subscription plan updated successfully.');
        } catch (err) {
            console.error('Failed to update subscription tier:', err);
            toast.error('Failed to update subscription plan.');
        } finally {
            setUpdatingPlanId(null);
        }
    };

    const filteredDoctors = doctors.filter((doc) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const docName = (doc.full_name || `${doc.first_name} ${doc.last_name}`).toLowerCase();
        return (
            docName.includes(q) ||
            doc.email.toLowerCase().includes(q) ||
            doc.npi.toLowerCase().includes(q)
        );
    });

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedDoctors: DoctorProfile[] = (data || []).map((doc: {
                id: string;
                email?: string;
                full_name?: string;
                first_name?: string;
                last_name?: string;
                professional_title?: string;
                npi?: string;
                license_id?: string;
                created_at?: string;
                subscription_tier?: string;
            }) => ({
                id: doc.id,
                email: doc.email || '',
                full_name: doc.full_name || '',
                first_name: doc.first_name || '',
                last_name: doc.last_name || '',
                professional_title: doc.professional_title || 'Doctor',
                npi: doc.npi || '',
                license_id: doc.license_id || '',
                created_at: doc.created_at || '',
                subscription_tier: doc.subscription_tier || 'free',
                patientsCount: 0,
                notesCount: 0,
                loadingStats: true
            }));

            setDoctors(mappedDoctors);

            // Fetch statistics in background for each doctor
            mappedDoctors.forEach(async (doc) => {
                try {
                    const [patientsRes, notesRes] = await Promise.all([
                        supabase
                            .from('patients')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', doc.id)
                            .is('deleted_at', null),
                        supabase
                            .from('notes')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', doc.id)
                    ]);

                    setDoctors(prev => prev.map(d => d.id === doc.id ? {
                        ...d,
                        patientsCount: patientsRes.count || 0,
                        notesCount: notesRes.count || 0,
                        loadingStats: false
                    } : d));
                } catch (statError) {
                    console.error(`Failed to fetch stats for doctor ${doc.id}:`, statError);
                    setDoctors(prev => prev.map(d => d.id === doc.id ? {
                        ...d,
                        loadingStats: false
                    } : d));
                }
            });

        } catch (err) {
            console.error('Failed to load doctors list:', err);
            toast.error('Failed to load registered doctors list.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    const handleImpersonate = async (doctor: DoctorProfile) => {
        const confirmMsg = `¿Estás seguro de que quieres entrar en modo impersonación para ${doctor.full_name || doctor.email}? Verás la aplicación exactamente como él/ella.`;
        if (window.confirm(confirmMsg)) {
            await impersonateUser(doctor.id);
            navigate('/notes/new');
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDoctors();
    };

    return (
        <div className="bg-slate-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200/80 mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Platform Administration</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">Manage registered providers and debug issues</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={loading || refreshing}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all hover:shadow-sm active:scale-95 disabled:opacity-50"
                            title="Refresh statistics"
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        </button>

                        {isImpersonating && (
                            <button
                                onClick={async () => {
                                    await stopImpersonating();
                                    fetchDoctors();
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                            >
                                Stop Impersonating
                            </button>
                        )}
                    </div>
                </div>

                {/* Dashboard Stats Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Providers</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{loading ? '...' : doctors.length}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Users2 size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Patients</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {loading ? '...' : doctors.reduce((acc, doc) => acc + (doc.patientsCount || 0), 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Notes</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {loading ? '...' : doctors.reduce((acc, doc) => acc + (doc.notesCount || 0), 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <FileText size={20} />
                        </div>
                    </div>
                </div>

                {/* Doctors Directory Table */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Registered Medical Providers</h2>
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold sm:ml-3">
                                {filteredDoctors.length} / {doctors.length} Users
                            </span>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72 shrink-0">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email o NPI..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-slate-500 font-medium text-sm">Loading doctors list...</p>
                        </div>
                    ) : filteredDoctors.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">
                            <p className="font-semibold text-sm">No registered doctors match your criteria.</p>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold mt-2 underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Provider Identity</th>
                                        <th className="px-6 py-4">Credentials</th>
                                        <th className="px-6 py-4">Activity</th>
                                        <th className="px-6 py-4 text-center">Plan</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {filteredDoctors.map((doctor) => {
                                        const docName = doctor.full_name || `${doctor.first_name} ${doctor.last_name}`.trim() || doctor.email.split('@')[0];
                                        const dateReg = doctor.created_at ? new Date(doctor.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        }) : 'N/A';

                                        const isSelf = doctor.id === currentUser?.id;

                                        return (
                                            <tr key={doctor.id} className="hover:bg-slate-50/30 transition-colors">
                                                {/* Provider Name and Email */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                                                            <img
                                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=818cf8&color=fff&bold=true`}
                                                                alt={docName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                                                {docName}
                                                                {isSelf && (
                                                                    <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase">You</span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-medium mt-0.5">{doctor.email}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Professional Credentials */}
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                    <div className="space-y-1">
                                                        {doctor.professional_title && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Award size={13} className="text-slate-400" />
                                                                <span>{doctor.professional_title}</span>
                                                            </div>
                                                        )}
                                                        {doctor.license_id && (
                                                            <div>License: <strong className="text-slate-700">{doctor.license_id}</strong></div>
                                                        )}
                                                        {doctor.npi && (
                                                            <div>NPI: <strong className="text-slate-700">{doctor.npi}</strong></div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Activity Statistics */}
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={13} className="text-slate-400" />
                                                            <span>Reg: {dateReg}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <span>Patients: <strong className="text-slate-700">{doctor.loadingStats ? '...' : doctor.patientsCount}</strong></span>
                                                            <span>Notes: <strong className="text-slate-700">{doctor.loadingStats ? '...' : doctor.notesCount}</strong></span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Subscription Tier Dropdown */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="relative inline-flex items-center justify-center">
                                                        {updatingPlanId === doctor.id ? (
                                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <select
                                                                value={doctor.subscription_tier}
                                                                onChange={(e) => handlePlanChange(doctor.id, e.target.value)}
                                                                className={`appearance-none bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-all outline-none text-center text-slate-700 ${
                                                                    doctor.subscription_tier === 'pro'
                                                                        ? 'bg-indigo-50/50 border-indigo-100 text-indigo-700 hover:bg-indigo-50 font-black'
                                                                        : doctor.subscription_tier === 'premium'
                                                                        ? 'bg-amber-50/50 border-amber-100 text-amber-700 hover:bg-amber-50 font-black'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-500 font-semibold'
                                                                }`}
                                                            >
                                                                <option value="free">Free</option>
                                                                <option value="premium">Premium</option>
                                                                <option value="pro">Pro</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleImpersonate(doctor)}
                                                        disabled={isSelf}
                                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm mx-auto ${
                                                            isSelf
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow active:scale-95'
                                                        }`}
                                                        title={isSelf ? 'Cannot impersonate yourself' : `Log in as ${docName}`}
                                                    >
                                                        <Terminal size={14} className={isSelf ? 'opacity-50' : 'text-slate-500'} />
                                                        <span>Impersonar</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
