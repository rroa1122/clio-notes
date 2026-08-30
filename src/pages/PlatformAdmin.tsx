import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import {
    Shield,
    FileText,
    Users,
    RefreshCw,
    UserPlus,
    Trash2,
    X,
    Loader2,
    CheckCircle2,
    Eye,
    EyeOff,
    Copy,
    Check,
    Edit3,
    Search,
    ChevronDown,
    ArrowUpRight,
    AlertTriangle
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
    role?: string;
    patientsCount?: number;
    notesCount?: number;
    loadingStats?: boolean;
}

const TITLE_PRESETS = [
    'TCM Specialist',
    'CBHCM',
    'Case Manager',
    'Psychiatrist',
    'Doctor / Physician',
    'Nurse Practitioner',
    'Clinical Director'
];

const PLAN_OPTIONS = [
    { value: 'free', label: 'Free', dotColor: 'bg-slate-400', textColor: 'text-slate-300' },
    { value: 'premium', label: 'Premium', dotColor: 'bg-amber-400', textColor: 'text-amber-300' },
    { value: 'pro', label: 'Pro', dotColor: 'bg-indigo-400', textColor: 'text-indigo-300' }
];

const ROLE_OPTIONS = [
    { value: 'doctor', labelEs: 'Proveedor', labelEn: 'Provider' },
    { value: 'super_admin', labelEs: 'Super Admin', labelEn: 'Super Admin' }
];

function getInitials(name: string, email: string): string {
    const clean = (name || '').trim();
    if (clean) {
        const parts = clean.split(' ').filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    }
    return (email || 'CL').slice(0, 2).toUpperCase();
}

export function PlatformAdmin() {
    const { impersonateUser, stopImpersonating, isImpersonating, user: currentUser } = useAuth();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

    // Active open dropdown for table plans
    const [activePlanMenuId, setActivePlanMenuId] = useState<string | null>(null);
    const planMenuRef = useRef<HTMLDivElement | null>(null);

    // Modal Create States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedCreds, setCopiedCreds] = useState(false);
    const [createdUserSummary, setCreatedUserSummary] = useState<{ email: string; pass: string; name: string } | null>(null);

    const [createForm, setCreateForm] = useState({
        full_name: '',
        email: '',
        password: '',
        professional_title: 'TCM Specialist',
        subscription_tier: 'free',
        role: 'doctor'
    });

    // Modal Edit States
    const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        professional_title: '',
        subscription_tier: 'free',
        role: 'doctor',
        new_password: ''
    });

    // Delete State
    const [userToDelete, setUserToDelete] = useState<DoctorProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Close plan dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (planMenuRef.current && !planMenuRef.current.contains(e.target as Node)) {
                setActivePlanMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePlanChange = async (doctorId: string, newTier: string) => {
        try {
            setActivePlanMenuId(null);
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

            toast.success(language === 'es' ? 'Plan actualizado con éxito.' : 'Subscription plan updated successfully.');
        } catch (err) {
            console.error('Failed to update subscription tier:', err);
            toast.error(language === 'es' ? 'Error al actualizar el plan.' : 'Failed to update subscription plan.');
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
            (doc.professional_title || '').toLowerCase().includes(q)
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
                role?: string;
            }) => ({
                id: doc.id,
                email: doc.email || '',
                full_name: doc.full_name || '',
                first_name: doc.first_name || '',
                last_name: doc.last_name || '',
                professional_title: doc.professional_title || 'TCM Specialist',
                npi: doc.npi || '',
                license_id: doc.license_id || '',
                created_at: doc.created_at || '',
                subscription_tier: doc.subscription_tier || 'free',
                role: doc.role || 'doctor',
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
            toast.error(language === 'es' ? 'Error al cargar la lista de proveedores.' : 'Failed to load registered doctors list.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    const handleImpersonate = async (doctor: DoctorProfile) => {
        const confirmMsg = language === 'es'
            ? `¿Deseas entrar al sistema como ${doctor.full_name || doctor.email}?`
            : `Are you sure you want to impersonate ${doctor.full_name || doctor.email}?`;
        if (window.confirm(confirmMsg)) {
            await impersonateUser(doctor.id);
            navigate('/notes/new');
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDoctors();
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.email || !createForm.password) {
            toast.error(language === 'es' ? 'Email y contraseña son obligatorios' : 'Email and password are required');
            return;
        }
        if (createForm.password.length < 6) {
            toast.error(language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
            return;
        }

        try {
            setIsCreating(true);
            const { error } = await supabase.rpc('admin_create_user', {
                new_email: createForm.email,
                new_password: createForm.password,
                new_full_name: createForm.full_name,
                new_professional_title: createForm.professional_title || 'TCM Specialist',
                new_license_id: '',
                new_npi: '',
                new_subscription_tier: createForm.subscription_tier,
                new_role: createForm.role
            });

            if (error) throw error;

            toast.success(
                language === 'es' 
                    ? `Usuario ${createForm.full_name || createForm.email} creado exitosamente.` 
                    : `User ${createForm.full_name || createForm.email} created successfully.`
            );

            setCreatedUserSummary({
                name: createForm.full_name || createForm.email,
                email: createForm.email,
                pass: createForm.password
            });

            setCreateForm({
                full_name: '',
                email: '',
                password: '',
                professional_title: 'TCM Specialist',
                subscription_tier: 'free',
                role: 'doctor'
            });

            fetchDoctors();
        } catch (err: any) {
            console.error('Error creating user:', err);
            toast.error(err.message || (language === 'es' ? 'Error al crear el usuario.' : 'Failed to create user.'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenEdit = (doctor: DoctorProfile) => {
        setEditingDoctor(doctor);
        setEditForm({
            full_name: doctor.full_name || '',
            professional_title: doctor.professional_title || 'TCM Specialist',
            subscription_tier: doctor.subscription_tier || 'free',
            role: doctor.role || 'doctor',
            new_password: ''
        });
        setShowEditPassword(false);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoctor) return;

        try {
            setIsUpdating(true);
            const { error } = await supabase.rpc('admin_update_user', {
                target_user_id: editingDoctor.id,
                new_full_name: editForm.full_name,
                new_professional_title: editForm.professional_title,
                new_role: editForm.role,
                new_subscription_tier: editForm.subscription_tier,
                new_password: editForm.new_password ? editForm.new_password : null
            });

            if (error) throw error;

            toast.success(language === 'es' ? 'Proveedor actualizado con éxito.' : 'Provider updated successfully.');
            setEditingDoctor(null);
            fetchDoctors();
        } catch (err: any) {
            console.error('Error updating doctor:', err);
            toast.error(err.message || (language === 'es' ? 'Error al actualizar el usuario.' : 'Failed to update user.'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCopyCredentials = () => {
        if (!createdUserSummary) return;
        const text = `Clio Notes Login Credentials:\nURL: https://notes.clinicflow.dev\nEmail: ${createdUserSummary.email}\nPassword: ${createdUserSummary.pass}`;
        navigator.clipboard.writeText(text);
        setCopiedCreds(true);
        toast.success(language === 'es' ? 'Credenciales copiadas al portapapeles' : 'Credentials copied to clipboard');
        setTimeout(() => setCopiedCreds(false), 3000);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            setIsDeleting(true);
            const { error } = await supabase.rpc('admin_delete_user', {
                target_user_id: userToDelete.id
            });

            if (error) throw error;

            toast.success(
                language === 'es' 
                    ? `Usuario ${userToDelete.full_name || userToDelete.email} eliminado correctamente.` 
                    : `User ${userToDelete.full_name || userToDelete.email} deleted successfully.`
            );

            setUserToDelete(null);
            fetchDoctors();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            toast.error(err.message || (language === 'es' ? 'Error al eliminar el usuario.' : 'Failed to delete user.'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 lg:pt-8 pb-20 space-y-8 animate-in fade-in duration-300">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {language === 'es' ? 'Platform Administration' : 'Platform Administration'}
                        </h1>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 px-2.5 py-0.5 rounded-full">
                            {doctors.length} {language === 'es' ? 'users' : 'users'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'es' ? 'User access, roles and system metrics' : 'User access, roles and system metrics'}
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                        title={language === 'es' ? 'Actualizar' : 'Refresh'}
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''} />
                    </button>

                    <button
                        onClick={() => {
                            setCreatedUserSummary(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <UserPlus size={15} />
                        <span>{language === 'es' ? 'New user' : 'New user'}</span>
                    </button>

                    {isImpersonating && (
                        <button
                            onClick={async () => {
                                await stopImpersonating();
                                fetchDoctors();
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            {language === 'es' ? 'Salir de impersonación' : 'Exit impersonation'}
                        </button>
                    )}
                </div>
            </div>

            {/* Clean Minimal Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'es' ? 'Providers' : 'Providers'}
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {loading ? '...' : doctors.length}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {doctors.filter(d => d.role === 'super_admin').length} {language === 'es' ? 'admins' : 'admins'}
                        </span>
                    </div>
                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Shield size={18} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'es' ? 'Patients' : 'Patients'}
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {loading ? '...' : doctors.reduce((acc, doc) => acc + (doc.patientsCount || 0), 0)}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {language === 'es' ? 'Total registered' : 'Total registered'}
                        </span>
                    </div>
                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'es' ? 'Clinical Notes' : 'Clinical Notes'}
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {loading ? '...' : doctors.reduce((acc, doc) => acc + (doc.notesCount || 0), 0)}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {language === 'es' ? 'Generated in system' : 'Generated in system'}
                        </span>
                    </div>
                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <FileText size={18} />
                    </div>
                </div>
            </div>

            {/* Providers Directory Minimal Table */}
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl overflow-visible shadow-sm">
                
                {/* Search Header */}
                <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {language === 'es' ? 'User Directory' : 'User Directory'}
                    </h2>

                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder={language === 'es' ? "Search user or email..." : "Search user or email..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 size={24} className="animate-spin text-indigo-500 dark:text-slate-500" />
                        <p className="text-xs text-slate-500">
                            {language === 'es' ? 'Loading directory...' : 'Loading directory...'}
                        </p>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-xs">
                            {language === 'es' ? 'No users found.' : 'No users found.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="py-3.5 px-6">{language === 'es' ? 'User' : 'User'}</th>
                                    <th className="py-3.5 px-6">{language === 'es' ? 'Specialty' : 'Specialty'}</th>
                                    <th className="py-3.5 px-6">{language === 'es' ? 'Activity' : 'Activity'}</th>
                                    <th className="py-3.5 px-6">{language === 'es' ? 'Plan' : 'Plan'}</th>
                                    <th className="py-3.5 px-6 text-right">{language === 'es' ? 'Actions' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                                {filteredDoctors.map((doctor) => {
                                    const docName = doctor.full_name || `${doctor.first_name} ${doctor.last_name}`.trim() || doctor.email.split('@')[0];
                                    const isSelf = doctor.id === currentUser?.id;
                                    const initials = getInitials(docName, doctor.email);
                                    
                                    const pCount = doctor.patientsCount || 0;
                                    const nCount = doctor.notesCount || 0;

                                    const currentPlanObj = PLAN_OPTIONS.find(p => p.value === doctor.subscription_tier) || PLAN_OPTIONS[0];

                                    return (
                                        <tr key={doctor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors group">
                                            
                                            {/* User & Email */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center font-medium text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-900 dark:text-slate-100">{docName}</span>
                                                            {isSelf && (
                                                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
                                                                    {language === 'es' ? 'You' : 'You'}
                                                                </span>
                                                            )}
                                                            {doctor.role === 'super_admin' && (
                                                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-1.5 py-0.5 rounded">
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{doctor.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Specialty */}
                                            <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">
                                                {doctor.professional_title || 'TCM Specialist'}
                                            </td>

                                            {/* Activity (Minimal text) */}
                                            <td className="py-4 px-6">
                                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                                    <span>{doctor.loadingStats ? '...' : pCount} {pCount === 1 ? 'patient' : 'patients'}</span>
                                                    <span className="text-slate-300 dark:text-slate-600 mx-1.5">·</span>
                                                    <span>{doctor.loadingStats ? '...' : nCount} {nCount === 1 ? 'note' : 'notes'}</span>
                                                </div>
                                            </td>

                                            {/* Custom Styled Plan Dropdown */}
                                            <td className="py-4 px-6 relative">
                                                {updatingPlanId === doctor.id ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                        <Loader2 size={13} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                                                        <span>{language === 'es' ? 'Saving...' : 'Saving...'}</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative inline-block" ref={activePlanMenuId === doctor.id ? planMenuRef : null}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActivePlanMenuId(activePlanMenuId === doctor.id ? null : doctor.id)}
                                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/40 hover:bg-slate-200/80 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 text-xs font-medium transition-all cursor-pointer group/btn"
                                                        >
                                                            <span className={`size-2 rounded-full ${currentPlanObj.dotColor}`} />
                                                            <span className="text-slate-700 dark:text-slate-300 font-medium">{currentPlanObj.label}</span>
                                                            <ChevronDown size={13} className="text-slate-400 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-300 transition-colors" />
                                                        </button>

                                                        {/* Floating Custom Menu */}
                                                        {activePlanMenuId === doctor.id && (
                                                            <div className="absolute left-0 top-full mt-1.5 w-36 bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                                                {PLAN_OPTIONS.map((plan) => {
                                                                    const isSelected = doctor.subscription_tier === plan.value;
                                                                    return (
                                                                        <button
                                                                            key={plan.value}
                                                                            type="button"
                                                                            onClick={() => handlePlanChange(doctor.id, plan.value)}
                                                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                                                                isSelected
                                                                                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-semibold'
                                                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`size-2 rounded-full ${plan.dotColor}`} />
                                                                                <span>{plan.label}</span>
                                                                            </div>
                                                                            {isSelected && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Ghost Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleImpersonate(doctor)}
                                                        disabled={isSelf}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                            isSelf
                                                                ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-500'
                                                                : 'text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                                                        }`}
                                                        title={isSelf ? 'Cannot impersonate yourself' : `Access as ${docName}`}
                                                    >
                                                        <span>{language === 'es' ? 'Access' : 'Access'}</span>
                                                        <ArrowUpRight size={13} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenEdit(doctor)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                        title={`Edit ${docName}`}
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() => setUserToDelete(doctor)}
                                                        disabled={isSelf}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            isSelf
                                                                ? 'opacity-20 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                                                : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer'
                                                        }`}
                                                        title={isSelf ? '' : `Delete ${docName}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SLEEK MINIMAL CREATE USER MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-150 flex flex-col">
                        
                        {/* Clean Minimal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-transparent">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {language === 'es' ? 'Register new user' : 'Register new user'}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {language === 'es' ? 'Create login credentials for Clio Notes' : 'Create login credentials for Clio Notes'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body with Spacious Minimal Layout */}
                        <div className="p-6 sm:p-7">
                            {createdUserSummary ? (
                                <div className="space-y-5 py-1">
                                    <div className="size-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={22} />
                                    </div>

                                    <div className="text-center space-y-1">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {language === 'es' ? 'User created successfully' : 'User created successfully'}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {language === 'es' ? 'Share these credentials with the user:' : 'Share these credentials with the user:'}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Name:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{createdUserSummary.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Email:</span>
                                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{createdUserSummary.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Password:</span>
                                            <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">{createdUserSummary.pass}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleCopyCredentials}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                        >
                                            {copiedCreds ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
                                            <span>{copiedCreds ? 'Copied' : 'Copy credentials'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateUser} className="space-y-4" autoComplete="off">
                                    
                                    {/* Full Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Full name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            autoComplete="off"
                                            placeholder="Dr. Carlos Mendoza"
                                            value={createForm.full_name}
                                            onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Email address *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            autoComplete="new-password"
                                            placeholder="carlos@clinicflow.dev"
                                            value={createForm.email}
                                            onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Initial password *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                minLength={6}
                                                autoComplete="one-time-code"
                                                placeholder="••••••••••••"
                                                value={createForm.password}
                                                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Specialty */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Specialty / Title
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="TCM Specialist"
                                            value={createForm.professional_title}
                                            onChange={e => setCreateForm({ ...createForm, professional_title: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {TITLE_PRESETS.map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setCreateForm({ ...createForm, professional_title: preset })}
                                                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                                                        createForm.professional_title === preset
                                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 font-semibold'
                                                            : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Plan & Role Segmented Cards */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Tier
                                            </label>
                                            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                                {PLAN_OPTIONS.map((plan) => (
                                                    <button
                                                        key={plan.value}
                                                        type="button"
                                                        onClick={() => setCreateForm({ ...createForm, subscription_tier: plan.value })}
                                                        className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                                            createForm.subscription_tier === plan.value
                                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {plan.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Role
                                            </label>
                                            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                                {ROLE_OPTIONS.map((r) => (
                                                    <button
                                                        key={r.value}
                                                        type="button"
                                                        onClick={() => setCreateForm({ ...createForm, role: r.value })}
                                                        className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                                            createForm.role === r.value
                                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {r.labelEn}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                        >
                                            {isCreating ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <span>Create user</span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SLEEK MINIMAL EDIT USER MODAL */}
            {editingDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-150 flex flex-col">
                        
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-transparent">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Edit user
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{editingDoctor.email}</p>
                            </div>
                            <button
                                onClick={() => setEditingDoctor(null)}
                                className="size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 sm:p-7 space-y-4" autoComplete="off">
                            
                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>

                            {/* Specialty */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Specialty / Title
                                </label>
                                <input
                                    type="text"
                                    value={editForm.professional_title}
                                    onChange={e => setEditForm({ ...editForm, professional_title: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {TITLE_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, professional_title: preset })}
                                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                                                editForm.professional_title === preset
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 font-semibold'
                                                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tier and Role Selector Cards */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Tier
                                    </label>
                                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                        {PLAN_OPTIONS.map((plan) => (
                                            <button
                                                key={plan.value}
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, subscription_tier: plan.value })}
                                                className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                                    editForm.subscription_tier === plan.value
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {plan.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                        {ROLE_OPTIONS.map((r) => (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, role: r.value })}
                                                className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                                    editForm.role === r.value
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {r.labelEn}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        New password
                                    </label>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Optional
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showEditPassword ? "text" : "password"}
                                        minLength={6}
                                        autoComplete="new-password"
                                        placeholder="Leave blank to keep current"
                                        value={editForm.new_password}
                                        onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
                                        className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    {editForm.new_password && (
                                        <button
                                            type="button"
                                            onClick={() => setShowEditPassword(!showEditPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                                        >
                                            {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                    type="button"
                                    onClick={() => setEditingDoctor(null)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save changes</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE USER CONFIRMATION MODAL */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="size-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                            <AlertTriangle size={18} />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                Delete this user?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                This will permanently delete <strong className="text-slate-800 dark:text-slate-200">{userToDelete.full_name || userToDelete.email}</strong>.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between">
                                <span>Patients:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{userToDelete.patientsCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Notes:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{userToDelete.notesCount || 0}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                                {isDeleting ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Deleting...</span>
                                    </span>
                                ) : (
                                    <span>Yes, delete</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
