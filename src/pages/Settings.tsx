import { useState, useEffect } from 'react';
import { 
    Save, 
    Building, 
    PhoneCall, 
    MapPin, 
    Printer, 
    User, 
    CreditCard, 
    Hash, 
    Activity, 
    UserCheck, 
    ShieldCheck, 
    PenTool, 
    Eraser, 
    Lock, 
    Settings as SettingsIcon, 
    Mail, 
    Check, 
    Star,
    CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { settingsService, type ClinicSettings, type UserProfile } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import SignatureModal from '../notes-module/components/SignatureModal';

export function Settings() {
    const { user, refreshUser, setIsLocked } = useAuth();
    const { t, language } = useLanguage();
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'clinic' | 'supervision' | 'signatures' | 'billing'>(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'billing' || tab === 'profile' || tab === 'clinic' || tab === 'supervision' || tab === 'signatures') {
            return tab;
        }
        return 'profile';
    });
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'user' | 'supervisor' }>({ open: false, type: 'user' });
    const [noteCount, setNoteCount] = useState<number>(0);

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
            } catch (err) {
                console.error("Failed to load settings", err);
                setProfile({
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name || 'Reinier',
                    last_name: user.last_name || 'Roa',
                    full_name: `${user.first_name || 'Reinier'} ${user.last_name || 'Roa'}`,
                    phone: '',
                    signature_url: '',
                    setup_complete: true,
                    npi: user.npi || '1234567890',
                    professional_title: user.professional_title || 'MD, PhD',
                    license_id: user.license_id || 'LIC-998877',
                    role: user.role
                });
                setSettings({
                    id: '',
                    clinicName: 'Clio Medical Center',
                    forwardingNumber: '',
                    phone: '(555) 123-4567',
                    fax: '(555) 987-6543',
                    email: user.email,
                    address: '100 Healthcare Way, Suite 400',
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

    const handleSave = async () => {
        const loadingToast = toast.loading(language === 'es' ? "Guardando configuración..." : "Saving settings...");
        try {
            const promises: Promise<void>[] = [];
            if (profile && user?.id) {
                if (profile.screen_lock_passcode) {
                    localStorage.setItem(`clio_screen_lock_passcode_${user.id}`, profile.screen_lock_passcode);
                } else {
                    localStorage.removeItem(`clio_screen_lock_passcode_${user.id}`);
                }
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
            toast.success(language === 'es' ? "Configuración guardada exitosamente" : "Settings saved successfully");
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(language === 'es' ? "Error al guardar" : "Failed to save settings");
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[450px]">
            <div className="flex flex-col items-center gap-3">
                <div className="size-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                    {language === 'es' ? "Cargando..." : "Loading..."}
                </p>
            </div>
        </div>
    );

    const tabs = [
        { id: 'profile', label: language === 'es' ? 'Perfil Profesional' : 'Professional Profile', icon: User },
        { id: 'clinic', label: language === 'es' ? 'Información Clínica' : 'Clinic Info', icon: Building },
        { id: 'supervision', label: language === 'es' ? 'Supervisión' : 'Supervision', icon: ShieldCheck },
        { id: 'signatures', label: language === 'es' ? 'Firmas Digitales' : 'Signatures', icon: PenTool },
        { id: 'billing', label: language === 'es' ? 'Plan y Facturación' : 'Plan & Billing', icon: CreditCard },
    ];

    return (
        <div className="flex flex-col animate-in fade-in duration-300 max-w-5xl mx-auto w-full px-4 pt-4 lg:pt-6 pb-16">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 relative">
                
                {/* Header & Primary Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800/80">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <SettingsIcon className="size-6 text-indigo-500" />
                            {language === 'es' ? "Configuración y Preferencias" : "Settings & Preferences"}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                            {language === 'es' 
                                ? "Gestiona tus credenciales, información de clínica, firmas digitales y seguridad." 
                                : "Manage your credentials, facility details, digital signatures, and security."}
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saved}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md self-start sm:self-auto shrink-0 cursor-pointer",
                            saved 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 border border-indigo-500"
                        )}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 size={15} className="text-emerald-500 animate-in zoom-in-50" />
                                {language === 'es' ? 'Guardado' : 'Saved'}
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
                            </>
                        )}
                    </button>
                </div>

                {/* Navigation Pills Bar */}
                <div className="bg-slate-50/70 dark:bg-slate-950/50 backdrop-blur-md p-1.5 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-sm w-full flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 justify-start md:justify-around mb-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer",
                                    isActive
                                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-800"
                                        : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border border-transparent"
                                )}
                            >
                                <Icon size={14} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Contents */}
                <div className="animate-in fade-in duration-200">
                    
                    {/* [PROFILE TAB] */}
                    {activeTab === 'profile' && profile && (
                        <div className="space-y-5">
                            {/* Personal & Professional Info Unified Grid */}
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User size={14} className="text-indigo-500" />
                                        {language === 'es' ? "Identidad Profesional y Credenciales" : "Professional Identity & Credentials"}
                                    </h3>
                                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                        {language === 'es' ? "Impreso en los registros clínicos" : "Printed on clinical records"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <InputField
                                        label={language === 'es' ? "Primer Nombre" : "First Name"}
                                        value={profile.first_name}
                                        onChange={(val: string) => handleProfileChange('first_name', val)}
                                        placeholder="Reinier"
                                    />
                                    <InputField
                                        label={language === 'es' ? "Apellidos" : "Last Name"}
                                        value={profile.last_name}
                                        onChange={(val: string) => handleProfileChange('last_name', val)}
                                        placeholder="Roa Parets"
                                    />
                                    <InputField
                                        label={language === 'es' ? "Título Profesional" : "Professional Title"}
                                        value={profile.professional_title}
                                        onChange={(val: string) => handleProfileChange('professional_title', val)}
                                        placeholder="TCM / Case Manager"
                                        icon={Activity}
                                    />
                                    <InputField
                                        label={language === 'es' ? "Nº de Licencia / Staff ID" : "License / Staff ID"}
                                        value={profile.license_id}
                                        onChange={(val: string) => handleProfileChange('license_id', val)}
                                        placeholder="354543543"
                                        icon={Hash}
                                    />
                                </div>
                            </div>

                            {/* Security PIN Code Card */}
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Lock size={14} className="text-indigo-500" />
                                            {language === 'es' ? "Bloqueo Rápido de Pantalla (PIN)" : "Quick Screen Lock (4-Digit PIN)"}
                                        </h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                            {language === 'es' 
                                                ? "Bloquea al instante la pantalla sin cerrar tu sesión activa." 
                                                : "Quickly locks the screen without logging you out when away."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <input
                                            type="password"
                                            maxLength={4}
                                            value={profile.screen_lock_passcode || ''}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
                                                handleProfileChange('screen_lock_passcode', digits);
                                            }}
                                            placeholder="••••"
                                            className="w-28 h-11 text-center font-black tracking-widest text-base rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 shadow-sm"
                                        />
                                        {profile.screen_lock_passcode && profile.screen_lock_passcode.length === 4 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (user?.id) {
                                                        localStorage.setItem(`clio_screen_lock_passcode_${user.id}`, profile.screen_lock_passcode || '');
                                                        sessionStorage.setItem('clio_screen_locked', 'true');
                                                        setIsLocked(true);
                                                    }
                                                }}
                                                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer"
                                            >
                                                <Lock size={13} />
                                                {language === 'es' ? "Probar Bloqueo" : "Test Lock"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [CLINIC TAB] */}
                    {activeTab === 'clinic' && settings && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building size={14} className="text-indigo-500" />
                                {language === 'es' ? "Información del Centro Médico" : "Clinic Facility Information"}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-2">
                                    <InputField
                                        label={language === 'es' ? "Nombre de la Clínica" : "Clinic Name"}
                                        value={settings.clinicName}
                                        onChange={(val: string) => handleClinicChange('clinicName', val)}
                                        placeholder="ARC MENTAL HEALTH"
                                        icon={Building}
                                    />
                                </div>

                                <InputField
                                    label={language === 'es' ? "Teléfono" : "Phone"}
                                    value={settings.phone}
                                    onChange={(val: string) => handleClinicChange('phone', val)}
                                    placeholder="+1 (754) 231-2714"
                                    icon={PhoneCall}
                                />
                                <InputField
                                    label={language === 'es' ? "Fax" : "Fax"}
                                    value={settings.fax}
                                    onChange={(val: string) => handleClinicChange('fax', val)}
                                    placeholder="786-657-3097"
                                    icon={Printer}
                                />

                                <div className="sm:col-span-2">
                                    <InputField
                                        label={language === 'es' ? "Email Institucional" : "Facility Email"}
                                        value={settings.email || ''}
                                        onChange={(val: string) => handleClinicChange('email', val)}
                                        placeholder="contact@arcmentalhealth.com"
                                        icon={Mail}
                                    />
                                </div>

                                <div className="sm:col-span-2 space-y-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        <span className="flex items-center gap-2">
                                            <MapPin size={13} className="text-indigo-500" />
                                            {language === 'es' ? "Dirección" : "Address"}
                                        </span>
                                    </label>
                                    <textarea
                                        value={settings.address}
                                        onChange={(e) => handleClinicChange('address', e.target.value)}
                                        className="w-full h-20 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none shadow-sm"
                                        placeholder="14400 NW 77th Ct, Suite 100, Miami Lakes, FL 33016"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [SUPERVISION TAB] */}
                    {activeTab === 'supervision' && settings && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <UserCheck size={14} className="text-indigo-500" />
                                {language === 'es' ? "Supervisor Clínico Asignado" : "Assigned Clinical Supervisor"}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <InputField
                                    label={language === 'es' ? "Nombre del Supervisor" : "Supervisor Name"}
                                    value={settings.supervisorName || ''}
                                    onChange={(val: string) => handleClinicChange('supervisorName', val)}
                                    placeholder="Lolieht Acosta"
                                    icon={UserCheck}
                                />
                                <InputField
                                    label={language === 'es' ? "Licencia del Supervisor" : "Supervisor License"}
                                    value={settings.supervisorLicense || ''}
                                    onChange={(val: string) => handleClinicChange('supervisorLicense', val)}
                                    placeholder="SW123456"
                                    icon={Hash}
                                />
                                <div className="sm:col-span-2">
                                    <InputField
                                        label={language === 'es' ? "Email del Supervisor" : "Supervisor Email"}
                                        value={settings.supervisorEmail || ''}
                                        onChange={(val: string) => handleClinicChange('supervisorEmail', val)}
                                        placeholder="supervisor@arcmentalhealth.com"
                                        icon={Mail}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [SIGNATURES TAB] */}
                    {activeTab === 'signatures' && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <PenTool size={14} className="text-indigo-500" />
                                    {language === 'es' ? "Firma Digital Registrada" : "Registered Digital Signature"}
                                </h3>
                                {profile?.signature_url && (
                                    <button
                                        onClick={() => clearSignature('user')}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    >
                                        <Eraser size={13} /> {language === 'es' ? "Borrar Firma" : "Clear"}
                                    </button>
                                )}
                            </div>

                            <div
                                onClick={() => setSigModal({ open: true, type: 'user' })}
                                className="group relative cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-3xl h-36 bg-white dark:bg-slate-950/60 flex items-center justify-center transition-all hover:shadow-sm"
                            >
                                {profile?.signature_url ? (
                                    <div className="relative w-full h-full flex items-center justify-center p-4">
                                        <img src={profile.signature_url} alt="My Signature" className="max-h-28 object-contain filter drop-shadow-sm transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                                            <span className="bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md border border-slate-700">
                                                {language === 'es' ? "Clic para editar firma" : "Click to edit signature"}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="mx-auto size-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <PenTool size={18} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                                            {language === 'es' ? "Clic aquí para dibujar y registrar tu firma" : "Click here to record your signature"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* [BILLING TAB] */}
                    {activeTab === 'billing' && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <CreditCard size={14} className="text-indigo-500" />
                                {language === 'es' ? "Plan y Cuota de Uso" : "Plan & Quota Usage"}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {language === 'es' ? "Plan Actual" : "Current Plan"}
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                                            {user?.subscription_tier || 'FREE'}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            {language === 'es' ? "Activo" : "Active"}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {language === 'es' ? "Notas Creadas" : "Notes Generated"}
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                                            {noteCount} {language === 'es' ? "notas" : "notes"}
                                        </span>
                                        <span className="text-xs font-bold text-indigo-500">
                                            {user?.subscription_tier === 'pro' ? '∞ Ilimitado' : '50 Max'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SignatureModal
                isOpen={sigModal.open}
                onClose={() => setSigModal({ open: false, type: 'user' })}
                onSave={handleSignatureSave}
                title={sigModal.type === 'user' 
                    ? (language === 'es' ? "Firma Profesional" : "Professional Signature") 
                    : (language === 'es' ? "Firma del Supervisor" : "Supervisor Signature")}
            />
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", ...props }: any) {
    return (
        <div className="group space-y-2">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 group-focus-within:text-indigo-500 transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={13} className="text-indigo-500 shrink-0" />}
                    {label}
                </span>
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                placeholder={placeholder}
                {...props}
            />
        </div>
    );
}
