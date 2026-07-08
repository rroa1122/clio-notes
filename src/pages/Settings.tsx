import { useState, useEffect } from 'react';
import { Save, Building, PhoneCall, MapPin, Printer, User, CreditCard, Hash, Activity, UserCheck, ShieldCheck, PenTool, Eraser, Lock, Settings as SettingsIcon, Mail, Check, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { settingsService, type ClinicSettings, type UserProfile } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import SignatureModal from '../notes-module/components/SignatureModal';
import { AmexzoneSyncTab } from '../components/AmexzoneSyncTab';

export function Settings() {
    const { user, refreshUser } = useAuth();
    const { t, language } = useLanguage();
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'clinic' | 'supervision' | 'signatures' | 'billing' | 'amexzone'>(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'billing' || tab === 'profile' || tab === 'clinic' || tab === 'supervision' || tab === 'signatures' || tab === 'amexzone') {
            return tab;
        }
        return 'profile';
    });
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'user' | 'supervisor' }>({ open: false, type: 'user' });
    const [noteCount, setNoteCount] = useState<number>(0);

    // MFA States
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaEnrolling, setMfaEnrolling] = useState(false);
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaQrUri, setMfaQrUri] = useState<string | null>(null);
    const [mfaCodeInput, setMfaCodeInput] = useState('');
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [mfaSuccess, setMfaSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const [profileData, settingsData] = await Promise.all([
                    settingsService.fetchProfile(user.id),
                    user.clinic_id ? settingsService.fetchSettings(user.clinic_id) : Promise.resolve(null)
                ]);
                setProfile(profileData);
                setSettings(settingsData || {
                    id: '',
                    clinicName: '',
                    forwardingNumber: '',
                    phone: '',
                    fax: '',
                    email: '',
                    address: '',
                    website: '',
                    logoUrl: '',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    tax_id: '',
                    npi_group: '',
                    supervisorName: '',
                    supervisorLicense: '',
                    supervisorNpi: '',
                    supervisorSignatureUrl: '',
                    businessHours: {
                        monday: { start: '09:00', end: '17:00', closed: false },
                        tuesday: { start: '09:00', end: '17:00', closed: false },
                        wednesday: { start: '09:00', end: '17:00', closed: false },
                        thursday: { start: '09:00', end: '17:00', closed: false },
                        friday: { start: '09:00', end: '16:00', closed: false },
                        saturday: { start: '10:00', end: '14:00', closed: true },
                        sunday: { start: '10:00', end: '14:00', closed: true },
                    },
                    integrations: { ems: false, email: true }
                });

                // Fetch MFA status
                const { data: mfaData, error: mfaErr } = await supabase.auth.mfa.listFactors();
                if (!mfaErr && mfaData) {
                    setMfaEnabled(mfaData.all.some(factor => factor.status === 'verified'));
                }
            } catch (err) {
                console.error("Failed to load settings", err);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user?.id, user?.clinic_id]);

    useEffect(() => {
        const fetchNoteCount = async () => {
            if (!user?.id) return;
            try {
                const { count, error } = await supabase
                    .from('notes')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                if (!error && count !== null) {
                    setNoteCount(count);
                }
            } catch (err) {
                console.error("Failed to fetch note count", err);
            }
        };
        fetchNoteCount();
    }, [user?.id]);

    const handleEnableMfa = async () => {
        setMfaError(null);
        setMfaSuccess(false);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: user?.email || 'Clio Notes User'
            });
            if (error) throw error;

            setMfaFactorId(data.id);
            setMfaSecret(data.totp.secret);
            setMfaQrCode(data.totp.qr_code);
            setMfaQrUri(data.totp.uri);
            setMfaEnrolling(true);
        } catch (err: any) {
            console.error("MFA enroll error:", err);
            setMfaError(err.message || "Failed to start 2FA enrollment");
        }
    };

    const handleVerifyMfa = async () => {
        if (!mfaCodeInput || mfaCodeInput.length !== 6) {
            setMfaError("Please enter a valid 6-digit code");
            return;
        }
        setMfaError(null);
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: mfaFactorId!
            });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: mfaFactorId!,
                challengeId: challengeData.id,
                code: mfaCodeInput
            });
            if (verifyError) throw verifyError;

            setMfaEnabled(true);
            setMfaEnrolling(false);
            setMfaCodeInput('');
            setMfaSuccess(true);
            toast.success("Multi-Factor Authentication enabled successfully!");
        } catch (err: any) {
            console.error("MFA verification error:", err);
            setMfaError(err.message || "Failed to verify 2FA code. Please try again.");
        }
    };

    const handleDisableMfa = async () => {
        if (!window.confirm("Are you sure you want to disable Multi-Factor Authentication? This will make your account less secure under HIPAA guidelines.")) {
            return;
        }
        setMfaError(null);
        try {
            const { data: mfaData, error: listError } = await supabase.auth.mfa.listFactors();
            if (listError) throw listError;

            const verifiedFactors = mfaData.all.filter(factor => factor.status === 'verified');
            if (verifiedFactors.length === 0) {
                setMfaEnabled(false);
                return;
            }

            for (const factor of verifiedFactors) {
                const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                    factorId: factor.id
                });
                if (unenrollError) throw unenrollError;
            }

            setMfaEnabled(false);
            setMfaEnrolling(false);
            toast.success("Multi-Factor Authentication disabled successfully.");
        } catch (err: any) {
            console.error("MFA unenroll error:", err);
            setMfaError(err.message || "Failed to disable 2FA");
        }
    };

    const handleClinicChange = (field: string, value: any) => {
        if (!settings) return;
        setSettings(prev => {
            if (!prev) return null;
            return { ...prev, [field]: value };
        });
        setSaved(false);
    };

    const handleProfileChange = (field: string, value: any) => {
        if (!profile) return;
        setProfile(prev => {
            if (!prev) return null;
            return { ...prev, [field]: value };
        });
        setSaved(false);
    };

    const handleSignatureSave = (signatureData: string) => {
        if (sigModal.type === 'user') {
            handleProfileChange('signature_url', signatureData);
        } else {
            handleClinicChange('supervisorSignatureUrl', signatureData);
        }
        setSigModal({ open: false, type: 'user' });
        toast.success(`${sigModal.type === 'user' ? 'Professional' : 'Supervisor'} signature captured`);
    };

    const clearSignature = (type: 'user' | 'supervisor') => {
        if (type === 'user') {
            handleProfileChange('signature_url', '');
        } else {
            handleClinicChange('supervisorSignatureUrl', '');
        }
        toast.info("Signature cleared");
    };

    const handleSelectPlan = async (newTier: string) => {
        if (!user?.id) return;
        const loadingToast = toast.loading(language === 'es' ? "Actualizando plan de suscripción..." : "Updating subscription plan...");
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_tier: newTier })
                .eq('id', user.id);

            if (error) throw error;

            await refreshUser();
            toast.dismiss(loadingToast);
            toast.success(language === 'es' ? `¡Plan actualizado a ${newTier.toUpperCase()} con éxito!` : `Plan updated to ${newTier.toUpperCase()} successfully!`);
        } catch (err) {
            console.error("Failed to update subscription plan:", err);
            toast.dismiss(loadingToast);
            toast.error(language === 'es' ? "Error al actualizar el plan de suscripción" : "Failed to update subscription plan");
        }
    };

    const handleSave = async () => {
        const loadingToast = toast.loading("Saving configuration...");
        try {
            const promises: Promise<void>[] = [];
            if (profile && user?.id) {
                promises.push(settingsService.updateProfile(user.id, profile));
            }
            if (settings) {
                if (user?.clinic_id) {
                    promises.push(settingsService.updateSettings(user.clinic_id, settings));
                } else if (user?.id) {
                    const createPromise = settingsService.createSettings(user.id, settings).then(() => { return; });
                    promises.push(createPromise);
                }
            }

            await Promise.all(promises);
            await refreshUser();
            setSaved(true);
            toast.dismiss(loadingToast);
            toast.success("All settings saved successfully");
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(language === 'es' ? "Error al guardar la configuración" : "Failed to save settings");
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50/50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium text-sm">{language === 'es' ? "Cargando configuraciones..." : "Loading configurations..."}</p>
            </div>
        </div>
    );

    const tabs = [
        { id: 'profile', label: language === 'es' ? 'Perfil Profesional' : 'Professional Profile', icon: User, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20 font-black' },
        { id: 'clinic', label: language === 'es' ? 'Información de la Clínica' : 'Clinic Information', icon: Building, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20 font-black' },
        { id: 'supervision', label: language === 'es' ? 'Supervisión Clínica' : 'Clinical Supervision', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 font-black' },
        { id: 'signatures', label: language === 'es' ? 'Firmas Digitales' : 'Digital Signatures', icon: PenTool, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 font-black' },
        { id: 'billing', label: language === 'es' ? 'Plan y Facturación' : 'Plan & Billing', icon: CreditCard, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/20 font-black' },
        { id: 'amexzone', label: language === 'es' ? 'Sincronización Amexzone' : 'Amexzone Sync', icon: SettingsIcon, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/20 font-black' },
    ];
    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-4 pt-4 lg:pt-8 h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] lg:h-[calc(100vh-9rem)] mb-4">
            <div className="grid grid-cols-12 gap-10 flex-1 h-full min-h-0">
                {/* Sidebar Navigation */}
                <div className="col-span-12 lg:col-span-3 flex flex-col h-full">
                    <div className="bg-card rounded-[2rem] border border-border/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] p-6 space-y-1.5 flex flex-col h-full bg-surface dark:bg-slate-900">
                        <div className="px-3 mb-4 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-0.5">
                                {language === 'es' ? "Configuración" : "System Config"}
                            </span>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 pl-0.5 leading-tight">
                                {t('nav.settings', 'Settings')}
                            </h2>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${isActive
                                            ? `${tab.bg} ${tab.color} shadow-sm ring-1 ring-slate-100 dark:ring-white/5`
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="col-span-12 lg:col-span-9 flex flex-col h-full min-h-0">
                    <div className="bg-card rounded-[2rem] border border-border/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-full bg-surface dark:bg-slate-900">
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'profile' && profile && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-slate-900 flex items-center justify-center border border-indigo-100/50 dark:border-slate-800">
                                                <User size={28} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'es' ? "Perfil Profesional" : "Professional Profile"}</h2>
                                                <p className="text-sm font-medium text-slate-500">{language === 'es' ? "Tus credenciales profesionales y detalles de contacto" : "Your professional credentials and contact details"}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saved}
                                            className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 shrink-0 ${saved
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                                : 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90 hover:shadow-lg hover:shadow-indigo-500/15'
                                                }`}
                                        >
                                            <Save size={16} className={saved ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                                            {saved ? (language === 'es' ? 'Cambios Guardados' : 'Changes Saved') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Section 1: Personal Details */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <User size={12} className="text-slate-400" /> {language === 'es' ? "Detalles Personales" : "Personal Details"}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <InputField
                                                    label={language === 'es' ? "Primer Nombre" : "First Name"}
                                                    value={profile.first_name}
                                                    onChange={(val) => handleProfileChange('first_name', val)}
                                                    placeholder={language === 'es' ? "Nombre" : "Jane"}
                                                />
                                                <InputField
                                                    label={language === 'es' ? "Apellidos" : "Last Name"}
                                                    value={profile.last_name}
                                                    onChange={(val) => handleProfileChange('last_name', val)}
                                                    placeholder={language === 'es' ? "Apellidos" : "Doe"}
                                                />
                                            </div>
                                        </div>

                                        {/* Section 2: Professional Credentials */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <Activity size={12} className="text-slate-400" /> {language === 'es' ? "Credenciales Profesionales" : "Professional Credentials"}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <InputField
                                                    label={language === 'es' ? "Título Profesional" : "Professional Title"}
                                                    value={profile.professional_title}
                                                    onChange={(val) => handleProfileChange('professional_title', val)}
                                                    placeholder="MD, NP, LCSW..."
                                                    icon={Activity}
                                                />
                                                <InputField
                                                     label={language === 'es' ? "Nº de Licencia" : "License #"}
                                                     value={profile.license_id}
                                                     onChange={(val) => handleProfileChange('license_id', val)}
                                                     placeholder={language === 'es' ? "Número de licencia estatal" : "State license number"}
                                                     icon={Hash}
                                                 />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'supervision' && settings && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-slate-900 flex items-center justify-center border border-emerald-100/50 dark:border-slate-800">
                                                <UserCheck size={28} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'es' ? "Supervisión Clínica" : "Clinical Supervision"}</h2>
                                                <p className="text-sm font-medium text-slate-500">{language === 'es' ? "Verificación de licencia y datos de supervisión" : "License verification and oversight data"}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saved}
                                            className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 shrink-0 ${saved
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                                : 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90 hover:shadow-lg hover:shadow-indigo-500/15'
                                                }`}
                                        >
                                            <Save size={16} className={saved ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                                            {saved ? (language === 'es' ? 'Cambios Guardados' : 'Changes Saved') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Section 1: Supervisor Info */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <UserCheck size={12} className="text-slate-400" /> {language === 'es' ? "Perfil del Supervisor" : "Supervisor Profile"}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <InputField
                                                    label={language === 'es' ? "Nombre del Supervisor" : "Supervisor Name"}
                                                    value={settings.supervisorName || ''}
                                                    onChange={(val) => handleClinicChange('supervisorName', val)}
                                                    placeholder={language === 'es' ? "Ingrese el nombre completo del supervisor" : "Enter supervisor's full name"}
                                                />
                                                <InputField
                                                    label={language === 'es' ? "Email del Supervisor" : "Supervisor Email"}
                                                    value={settings.supervisorEmail || ''}
                                                    onChange={(val) => handleClinicChange('supervisorEmail', val)}
                                                    placeholder="supervisor@example.com"
                                                    icon={Mail}
                                                />
                                                <div className="md:col-span-2">
                                                     <InputField
                                                         label={language === 'es' ? "Licencia del Supervisor" : "Supervisor License"}
                                                         value={settings.supervisorLicense || ''}
                                                         onChange={(val) => handleClinicChange('supervisorLicense', val)}
                                                         placeholder={language === 'es' ? "Número de licencia" : "License number"}
                                                     />
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'clinic' && settings && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center border border-blue-100/50 dark:border-slate-800">
                                                <Building size={28} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'es' ? "Información de la Clínica" : "Clinic Information"}</h2>
                                                <p className="text-sm font-medium text-slate-500">{language === 'es' ? "Identidad comercial y detalles del centro" : "Business identity and facility details"}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saved}
                                            className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 shrink-0 ${saved
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                                : 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90 hover:shadow-lg hover:shadow-indigo-500/15'
                                                }`}
                                        >
                                            <Save size={16} className={saved ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                                            {saved ? (language === 'es' ? 'Cambios Guardados' : 'Changes Saved') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Section 1: Clinic Identity */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <Building size={12} className="text-slate-400" /> {language === 'es' ? "Perfil de la Clínica" : "Clinic Profile"}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label={language === 'es' ? "Nombre de la Clínica" : "Clinic Name"}
                                                        value={settings.clinicName}
                                                        onChange={(val) => handleClinicChange('clinicName', val)}
                                                        placeholder={language === 'es' ? "Ingrese el nombre de la clínica" : "Enter clinic name"}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex flex-col gap-2">
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                                                        {language === 'es' ? "Logo de la Clínica" : "Clinic Logo"}
                                                    </label>
                                                    <div className="flex items-center gap-5 bg-card dark:bg-slate-900 p-4 rounded-xl border border-border/80 shadow-sm">
                                                        {settings.logoUrl ? (
                                                            <div className="relative size-16 rounded-xl border border-border/80 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                                                                <img src={settings.logoUrl} alt="Clinic Logo" className="max-h-full max-w-full object-contain" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleClinicChange('logoUrl', '')}
                                                                    className="absolute top-0.5 right-0.5 size-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md text-xs font-bold leading-none"
                                                                    title={language === 'es' ? "Quitar Logo" : "Remove Logo"}
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="size-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-400">
                                                                <Building size={20} />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-1.5">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => {
                                                                            handleClinicChange('logoUrl', reader.result as string);
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                                className="hidden"
                                                                id="clinic-logo-upload"
                                                            />
                                                            <label
                                                                htmlFor="clinic-logo-upload"
                                                                className="px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm flex items-center gap-1.5 w-fit"
                                                            >
                                                                {language === 'es' ? "Subir Imagen" : "Upload Image"}
                                                            </label>
                                                            <p className="text-[10px] text-slate-400 font-semibold">{language === 'es' ? "Soporta PNG, JPG o SVG. Máx 500KB recomendado." : "Supports PNG, JPG, or SVG. Max 500KB recommended."}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Contact & Location */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <MapPin size={12} className="text-slate-400" /> {language === 'es' ? "Contacto y Ubicación" : "Contact & Location"}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <InputField
                                                    label={language === 'es' ? "Teléfono Principal" : "Main Phone"}
                                                    value={settings.phone}
                                                    onChange={(val) => handleClinicChange('phone', val)}
                                                    placeholder="(555) 000-0000"
                                                    icon={PhoneCall}
                                                />
                                                <InputField
                                                    label={language === 'es' ? "Número de Fax" : "Fax Number"}
                                                    value={settings.fax}
                                                    onChange={(val) => handleClinicChange('fax', val)}
                                                    placeholder="(555) 000-0000"
                                                    icon={Printer}
                                                />
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label={language === 'es' ? "Email de la Clínica" : "Clinic Email"}
                                                        value={settings.email || ''}
                                                        onChange={(val) => handleClinicChange('email', val)}
                                                        placeholder="clinic@example.com"
                                                        icon={Mail}
                                                    />
                                                </div>
                                                <div className="group md:col-span-2 space-y-2.5">
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 group-focus-within:text-[#6366f1] transition-colors">
                                                        <span className="flex items-center gap-2">
                                                            <MapPin size={12} className="text-slate-400 transition-colors group-focus-within:text-[#6366f1]" /> {language === 'es' ? "Dirección Física" : "Physical Address"}
                                                        </span>
                                                    </label>
                                                    <textarea
                                                        value={settings.address}
                                                        onChange={(e) => handleClinicChange('address', e.target.value)}
                                                        className="w-full h-32 px-5 py-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm font-semibold text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#6366f1]/60 focus:bg-white dark:focus:bg-slate-950 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none shadow-sm"
                                                        placeholder={language === 'es' ? "Dirección física de la clínica" : "123 Medical Center Dr, Suite 100\nCity, State, Zip"}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'signatures' && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-amber-50 dark:bg-slate-900 flex items-center justify-center border border-amber-100/50 dark:border-slate-800">
                                                <PenTool size={28} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'es' ? "Firmas Digitales" : "Digital Signatures"}</h2>
                                                <p className="text-sm font-medium text-slate-500">{language === 'es' ? "Validaciones profesionales grabadas previamente" : "Pre-recorded professional validations"}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saved}
                                            className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 shrink-0 ${saved
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                                : 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90 hover:shadow-lg hover:shadow-indigo-500/15'
                                                }`}
                                        >
                                            <Save size={16} className={saved ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                                            {saved ? (language === 'es' ? 'Cambios Guardados' : 'Changes Saved') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 flex items-center gap-2">
                                                <PenTool size={12} className="text-slate-400" /> {language === 'es' ? "Registro de Firmas" : "Signature Registry"}
                                            </h3>
                                            <div className="bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                                                {/* Case Manager Signature */}
                                                <section className="space-y-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{language === 'es' ? "Mi Firma Profesional" : "My Professional Signature"}</h4>
                                                        {profile?.signature_url && (
                                                            <button
                                                                onClick={() => clearSignature('user')}
                                                                className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                                                            >
                                                                <Eraser size={12} /> {language === 'es' ? "Borrar Firma" : "Clear Current"}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div
                                                         onClick={() => setSigModal({ open: true, type: 'user' })}
                                                          className="group relative cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-40 bg-card flex items-center justify-center transition-all hover:border-[#6366f1]/50 hover:bg-[#6366f1]/5 dark:hover:bg-[#6366f1]/10 hover:shadow-sm"
                                                     >
                                                         {profile?.signature_url ? (
                                                             <div className="relative w-full h-full flex items-center justify-center p-4">
                                                                 <img src={profile.signature_url} alt="My Signature" className="max-h-32 object-contain filter drop-shadow-sm transition-transform group-hover:scale-105" />
                                                                 <div className="absolute inset-0 bg-[#6366f1]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                                                     <span className="bg-popover/90 backdrop-blur-sm text-xs font-black text-[#6366f1] px-4 py-2 rounded-xl shadow-md border border-[#6366f1]/10">{language === 'es' ? "Haga clic para editar la firma" : "Click to edit signature"}</span>
                                                                 </div>
                                                             </div>
                                                         ) : (
                                                             <div className="text-center transition-all duration-300">
                                                                 <div className="mx-auto size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-[#6366f1]/15 transition-colors">
                                                                     <PenTool size={24} className="text-slate-400 group-hover:text-[#6366f1] transition-colors" />
                                                                 </div>
                                                                 <p className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{language === 'es' ? "Haga clic para registrar su firma" : "Click to record your signature"}</p>
                                                             </div>
                                                         )}
                                                     </div>
                                                </section>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'billing' && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
                                        <div className="size-14 rounded-2xl bg-violet-50 dark:bg-slate-900 flex items-center justify-center border border-violet-100/50 dark:border-slate-800">
                                            <CreditCard size={28} className="text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'es' ? "Plan y Facturación" : "Plan & Billing"}</h2>
                                            <p className="text-sm font-medium text-slate-500">{language === 'es' ? "Administre su suscripción, detalles de facturación y pagos" : "Manage your subscription, billing details, and payments"}</p>
                                        </div>
                                    </div>

                                    {/* Section 1: Plan Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl space-y-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{language === 'es' ? "Plan Activo" : "Active Plan"}</h3>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                                        user?.subscription_tier === 'pro'
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'
                                                            : user?.subscription_tier === 'premium'
                                                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                        {user?.subscription_tier || 'free'}
                                                    </span>
                                                    <p className="text-xs text-slate-400 font-semibold mt-2">
                                                        {user?.subscription_tier === 'pro' ? (language === 'es' ? 'Integración de EMR Profesional + Notas Ilimitadas' : 'Professional EMR Integration + Unlimited Notes') :
                                                         user?.subscription_tier === 'premium' ? (language === 'es' ? 'Notas Ilimitadas' : 'Unlimited Notes') : (language === 'es' ? 'Límite de 5 notas' : 'Limit of 5 notes')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Note Limit Progress Bar for Free Users */}
                                            {user?.subscription_tier === 'free' ? (
                                                <div className="space-y-2 pt-2">
                                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                                        <span>{language === 'es' ? "Uso de Notas" : "Note Usage"}</span>
                                                        <span>{noteCount} / 5 {language === 'es' ? "notas" : "notes"}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                                        <div 
                                                            className={`rounded-full h-2 transition-all duration-500 ${
                                                                noteCount >= 4 ? 'bg-red-500' : 'bg-indigo-600'
                                                            }`} 
                                                            style={{ width: `${Math.min(100, (noteCount / 5) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 pt-2">
                                                    <span className="text-xs font-bold text-slate-500 block">{language === 'es' ? "Uso de Notas" : "Note Usage"}</span>
                                                    <span className="text-sm font-black text-emerald-600">{language === 'es' ? "Notas Ilimitadas" : "Unlimited Notes"}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 2: Payment Method */}
                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{language === 'es' ? "Método de Pago" : "Payment Method"}</h3>
                                                <div className="flex items-center gap-3 bg-card dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                        <CreditCard size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{language === 'es' ? "Visa terminada en 4242" : "Visa ending in 4242"}</p>
                                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{language === 'es' ? "Vence" : "Expires"} 12/2028</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => toast.info(language === 'es' ? 'Integración de pasarela de pago en progreso...' : 'Payment gateway integration in progress...')}
                                                className="w-full mt-4 bg-card border border-border/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-all shadow-sm active:scale-95 text-center"
                                            >
                                                {language === 'es' ? "Actualizar Método de Pago" : "Update Payment Method"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section: Available Plans */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-[11px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-widest px-1">{language === 'es' ? "Planes Disponibles" : "Available Plans"}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Free Plan Card */}
                                            <div className={`bg-card dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between transition-all ${
                                                user?.subscription_tier === 'free' || !user?.subscription_tier
                                                    ? 'border-slate-300 dark:border-slate-700 ring-2 ring-slate-100 dark:ring-slate-950/20 shadow-sm'
                                                    : 'border-border/60 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100">Plan Free</h4>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Basic Access</p>
                                                    </div>
                                                    <ul className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-emerald-500 font-bold shrink-0" /> {language === 'es' ? "Límite de 5 notas clínicas" : "Limit of 5 clinical notes"}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-emerald-500 font-bold shrink-0" /> {language === 'es' ? "Plantillas estándar" : "Standard templates"}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-emerald-500 font-bold shrink-0" /> {language === 'es' ? "Firma digital" : "Digital signature"}
                                                        </li>
                                                    </ul>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectPlan('free')}
                                                    disabled={user?.subscription_tier === 'free' || !user?.subscription_tier}
                                                    className={`w-full mt-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 text-center ${
                                                        user?.subscription_tier === 'free' || !user?.subscription_tier
                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                            : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                                    }`}
                                                >
                                                    {user?.subscription_tier === 'free' || !user?.subscription_tier ? (language === 'es' ? 'Plan Activo' : 'Active Plan') : (language === 'es' ? 'Seleccionar Plan' : 'Select Plan')}
                                                </button>
                                            </div>

                                            {/* Premium Plan Card */}
                                            <div className={`bg-card dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between transition-all relative ${
                                                user?.subscription_tier === 'premium'
                                                    ? 'border-violet-400 dark:border-violet-600 ring-2 ring-violet-50 dark:ring-violet-950/20 shadow-md shadow-violet-500/5'
                                                    : 'border-border/60 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}>
                                                <div className="absolute top-4 right-4 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Popular</div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100">Plan Premium</h4>
                                                        <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wider mt-1">Most Popular</p>
                                                    </div>
                                                    <ul className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                                            <Star size={14} className="text-violet-500 fill-violet-500 font-bold shrink-0" /> {language === 'es' ? <span><strong>Notas clínicas ilimitadas</strong></span> : <span><strong>Unlimited</strong> clinical notes</span>}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-violet-500 font-bold shrink-0" /> {language === 'es' ? "Firma clínica de supervisor" : "Supervisor clinical sign-off"}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-violet-500 font-bold shrink-0" /> {language === 'es' ? "Soporte de asistente IA Premium" : "Premium AI assistant support"}
                                                        </li>
                                                    </ul>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectPlan('premium')}
                                                    disabled={user?.subscription_tier === 'premium'}
                                                    className={`w-full mt-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 text-center ${
                                                        user?.subscription_tier === 'premium'
                                                            ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 cursor-not-allowed border border-violet-100 dark:border-violet-900/50 font-black'
                                                            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/10'
                                                    }`}
                                                >
                                                    {user?.subscription_tier === 'premium' ? (language === 'es' ? 'Plan Activo' : 'Active Plan') : (language === 'es' ? 'Seleccionar Plan' : 'Select Plan')}
                                                </button>
                                            </div>

                                            {/* Pro Plan Card */}
                                            <div className={`bg-card dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between transition-all ${
                                                user?.subscription_tier === 'pro'
                                                    ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-50 dark:ring-indigo-950/20 shadow-md shadow-indigo-500/5'
                                                    : 'border-border/60 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100">Plan Pro</h4>
                                                        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mt-1">Advanced Clinics</p>
                                                    </div>
                                                    <ul className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-indigo-500 font-bold shrink-0" /> {language === 'es' ? "Todo lo de Premium" : "Everything in Premium"}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-indigo-500 font-bold shrink-0" /> {language === 'es' ? "Integración con sistemas EMR / EHR" : "EMR / EHR systems integration"}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check size={14} className="text-indigo-500 font-bold shrink-0" /> {language === 'es' ? "Soporte de desarrollador prioritario" : "Priority developer support"}
                                                        </li>
                                                    </ul>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectPlan('pro')}
                                                    disabled={user?.subscription_tier === 'pro'}
                                                    className={`w-full mt-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 text-center ${
                                                        user?.subscription_tier === 'pro'
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 cursor-not-allowed border border-indigo-100 dark:border-indigo-900/50 font-black'
                                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/10'
                                                    }`}
                                                >
                                                    {user?.subscription_tier === 'pro' ? (language === 'es' ? 'Plan Activo' : 'Active Plan') : (language === 'es' ? 'Seleccionar Plan' : 'Select Plan')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Billing History */}
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-widest px-1">{language === 'es' ? "Historial de Facturación" : "Billing History"}</h3>
                                        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <th className="px-6 py-3.5">{language === 'es' ? "Fecha de Factura" : "Invoice Date"}</th>
                                                        <th className="px-6 py-3.5">{language === 'es' ? "Descripción" : "Description"}</th>
                                                        <th className="px-6 py-3.5">{language === 'es' ? "Monto" : "Amount"}</th>
                                                        <th className="px-6 py-3.5">{language === 'es' ? "Estado" : "Status"}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                    <tr>
                                                        <td className="px-6 py-3.5">{language === 'es' ? "1 de jul. de 2026" : "Jul 1, 2026"}</td>
                                                        <td className="px-6 py-3.5">{language === 'es' ? "Suscripción a Clio Notes (Mensual)" : "Clio Notes Subscription (Monthly)"}</td>
                                                        <td className="px-6 py-3.5">$0.00</td>
                                                        <td className="px-6 py-3.5"><span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase">{language === 'es' ? "Pagado" : "Paid"}</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-3.5">{language === 'es' ? "1 de jun. de 2026" : "Jun 1, 2026"}</td>
                                                        <td className="px-6 py-3.5">{language === 'es' ? "Suscripción a Clio Notes (Mensual)" : "Clio Notes Subscription (Monthly)"}</td>
                                                        <td className="px-6 py-3.5">$0.00</td>
                                                        <td className="px-6 py-3.5"><span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase">{language === 'es' ? "Pagado" : "Paid"}</span></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'amexzone' && (
                                <AmexzoneSyncTab />
                            )}
                        </div>

                        {/* Security Note Footer inside the card at the bottom */}
                        <div className="flex-none flex items-center justify-center gap-2 p-4 border-t border-border/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                            <ShieldCheck size={14} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">
                                {language === 'es' ? "Los datos están cifrados y se almacenan de forma segura siguiendo los estándares de HIPAA" : "Data is encrypted and stored securely following HIPAA standards"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <SignatureModal
                isOpen={sigModal.open}
                onClose={() => setSigModal({ open: false, type: 'user' })}
                onSave={handleSignatureSave}
                title={sigModal.type === 'user' ? (language === 'es' ? "Firma Profesional" : "Professional Signature") : (language === 'es' ? "Firma del Supervisor" : "Supervisor Signature")}
            />
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text" }: any) {
    return (
        <div className="group space-y-2.5">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 group-focus-within:text-[#6366f1] transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-slate-400 transition-colors group-focus-within:text-[#6366f1]" />}
                    {label}
                </span>
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-12 px-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#6366f1]/60 transition-all shadow-sm"
                placeholder={placeholder}
            />
        </div>
    );
}

