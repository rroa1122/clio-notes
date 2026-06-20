import { useState, useEffect } from 'react';
import { Save, Building, PhoneCall, MapPin, Printer, User, CreditCard, Hash, Activity, UserCheck, ShieldCheck, PenTool, Eraser, Settings as SettingsIcon } from 'lucide-react';
import { settingsService, type ClinicSettings, type UserProfile } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SignatureModal from '../notes-module/components/SignatureModal';

export function Settings() {
    const { user, refreshUser } = useAuth();
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'clinic' | 'supervision' | 'signatures'>('profile');
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'user' | 'supervisor' }>({ open: false, type: 'user' });

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
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user?.id, user?.clinic_id]);

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
            toast.error("Failed to save settings");
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50/50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium text-sm">Loading configurations...</p>
            </div>
        </div>
    );

    const tabs = [
        { id: 'profile', label: 'Professional Profile', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'clinic', label: 'Clinic Information', icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'supervision', label: 'Clinical Supervision', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'signatures', label: 'Digital Signatures', icon: PenTool, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-background/95 border-b border-border/60 px-8 py-4 shadow-soft">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-950 rounded-xl shadow-sm">
                            <SettingsIcon size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Settings</h1>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Personal & clinic configuration</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saved}
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${saved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/10'
                            }`}
                    >
                        <Save size={16} className={saved ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                        {saved ? 'Changes Saved' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 py-10">
                <div className="grid grid-cols-12 gap-10">
                    {/* Sidebar Navigation */}
                    <div className="col-span-12 lg:col-span-3 space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive
                                        ? `${tab.bg} ${tab.color} shadow-sm border border-slate-200/50`
                                        : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="col-span-12 lg:col-span-9">
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                            {activeTab === 'profile' && profile && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center gap-5 pb-6 border-b border-slate-50">
                                        <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                                            <User size={28} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Professional Profile</h2>
                                            <p className="text-sm font-medium text-slate-500">Your professional credentials and contact details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField
                                            label="First Name"
                                            value={profile.first_name}
                                            onChange={(val) => handleProfileChange('first_name', val)}
                                            placeholder="Jane"
                                        />
                                        <InputField
                                            label="Last Name"
                                            value={profile.last_name}
                                            onChange={(val) => handleProfileChange('last_name', val)}
                                            placeholder="Doe"
                                        />
                                        <InputField
                                            label="Professional Title"
                                            value={profile.professional_title}
                                            onChange={(val) => handleProfileChange('professional_title', val)}
                                            placeholder="MD, NP, LCSW..."
                                            icon={Activity}
                                        />
                                        <InputField
                                            label="NPI Number"
                                            value={profile.npi}
                                            onChange={(val) => handleProfileChange('npi', val)}
                                            placeholder="10-digit NPI"
                                            icon={Hash}
                                        />
                                        <InputField
                                            label="License ID"
                                            value={profile.license_id}
                                            onChange={(val) => handleProfileChange('license_id', val)}
                                            placeholder="State license number"
                                        />
                                        <InputField
                                            label="Direct Work Phone"
                                            value={profile.phone}
                                            onChange={(val) => handleProfileChange('phone', val)}
                                            placeholder="(555) 000-0000"
                                            icon={PhoneCall}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'supervision' && settings && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center gap-5 pb-6 border-b border-slate-50">
                                        <div className="size-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                                            <UserCheck size={28} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Supervision</h2>
                                            <p className="text-sm font-medium text-slate-500">License verification and oversight data</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <InputField
                                                label="Supervisor Name"
                                                value={settings.supervisorName || ''}
                                                onChange={(val) => handleClinicChange('supervisorName', val)}
                                                placeholder="Enter supervisor's full name"
                                            />
                                        </div>
                                        <InputField
                                            label="Supervisor License"
                                            value={settings.supervisorLicense || ''}
                                            onChange={(val) => handleClinicChange('supervisorLicense', val)}
                                            placeholder="License number"
                                        />
                                        <InputField
                                            label="Supervisor NPI"
                                            value={settings.supervisorNpi || ''}
                                            onChange={(val) => handleClinicChange('supervisorNpi', val)}
                                            placeholder="10-digit NPI"
                                            icon={Hash}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'clinic' && settings && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center gap-5 pb-6 border-b border-slate-50">
                                        <div className="size-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                            <Building size={28} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinic Information</h2>
                                            <p className="text-sm font-medium text-slate-500">Business identity and facility details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <InputField
                                                label="Clinic Name"
                                                value={settings.clinicName}
                                                onChange={(val) => handleClinicChange('clinicName', val)}
                                                placeholder="Enter clinic name"
                                            />
                                        </div>
                                        <InputField
                                            label="Tax ID / EIN"
                                            value={settings.tax_id}
                                            onChange={(val) => handleClinicChange('tax_id', val)}
                                            placeholder="Professional tax identifier"
                                            icon={CreditCard}
                                        />
                                        <InputField
                                            label="Clinic NPI (Group)"
                                            value={settings.npi_group}
                                            onChange={(val) => handleClinicChange('npi_group', val)}
                                            placeholder="Group NPI number"
                                            icon={Hash}
                                        />
                                        <InputField
                                            label="Main Phone"
                                            value={settings.phone}
                                            onChange={(val) => handleClinicChange('phone', val)}
                                            placeholder="(555) 000-0000"
                                            icon={PhoneCall}
                                        />
                                        <InputField
                                            label="Fax Number"
                                            value={settings.fax}
                                            onChange={(val) => handleClinicChange('fax', val)}
                                            placeholder="(555) 000-0000"
                                            icon={Printer}
                                        />
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2 px-1">
                                                <MapPin size={12} className="text-slate-400" /> Physical Address
                                            </label>
                                            <textarea
                                                value={settings.address}
                                                onChange={(e) => handleClinicChange('address', e.target.value)}
                                                className="w-full h-32 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/20 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none shadow-inner"
                                                placeholder="123 Medical Center Dr, Suite 100&#10;City, State, Zip"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}


                            {activeTab === 'signatures' && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center gap-5 pb-6 border-b border-slate-50">
                                        <div className="size-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100/50">
                                            <PenTool size={28} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Digital Signatures</h2>
                                            <p className="text-sm font-medium text-slate-500">Pre-recorded professional validations</p>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        {/* Case Manager Signature */}
                                        <section className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">My Professional Signature</h3>
                                                {profile?.signature_url && (
                                                    <button
                                                        onClick={() => clearSignature('user')}
                                                        className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                                                    >
                                                        <Eraser size={12} /> Clear Current
                                                    </button>
                                                )}
                                            </div>

                                            <div
                                                onClick={() => setSigModal({ open: true, type: 'user' })}
                                                className="group relative cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl h-40 bg-slate-50/30 flex items-center justify-center transition-all hover:border-amber-400/50 hover:bg-amber-50/30"
                                            >
                                                {profile?.signature_url ? (
                                                    <img src={profile.signature_url} alt="My Signature" className="max-h-32 object-contain" />
                                                ) : (
                                                    <div className="text-center group-hover:scale-105 transition-transform">
                                                        <div className="mx-auto size-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                                            <PenTool size={24} className="text-slate-400 group-hover:text-amber-600" />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-400 group-hover:text-slate-600">Click to record your signature</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>


                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Security Note Footer */}
                        <div className="mt-8 flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-100/50 border border-slate-200/50">
                            <ShieldCheck size={14} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Data is encrypted and stored securely following HIPAA standards</p>
                        </div>
                    </div>
                </div>
            </div>

            <SignatureModal
                isOpen={sigModal.open}
                onClose={() => setSigModal({ open: false, type: 'user' })}
                onSave={handleSignatureSave}
                title={sigModal.type === 'user' ? "Professional Signature" : "Supervisor Signature"}
            />
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text" }: any) {
    return (
        <div className="group space-y-2.5">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1 group-focus-within:text-slate-600 transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-slate-400 transition-colors group-focus-within:text-slate-500" />}
                    {label}
                </span>
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-slate-50/20 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-slate-400 transition-all placeholder:text-slate-300 shadow-sm"
                placeholder={placeholder}
            />
        </div>
    );
}
