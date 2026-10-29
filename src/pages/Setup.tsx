import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../notes-module/context/ThemeContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    User,
    Building2,
    UserCheck,
    Settings2,
    CheckCircle2,
    ArrowRight,
    PenTool,
    ShieldCheck,
    Sun,
    Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import SignatureModal from '../notes-module/components/SignatureModal';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const SPECIALTIES = [
    { id: 'psychiatry', title: 'Mental Health / Psychiatry', icon: User, description: 'Psychiatric evaluations, PHQ-9, medication management.' },
    { id: 'tcm', title: 'Transitional Care (TCM)', icon: UserCheck, description: 'Post-discharge follow-up, case management, domain-based notes.' },
    { id: 'clinical', title: 'Clinical / General', icon: Building2, description: 'General medical visits, SOAP notes, H&P examinations.' }
];

const STEP_CONFIG = {
    1: { required: ['first_name', 'last_name', 'professional_title'], optional: false },
    2: { required: ['role'], optional: false },
    3: { required: ['name', 'address', 'email'], optional: false },
    4: { required: [], optional: true },
    5: { required: [], optional: true },
    6: { required: [], optional: false }
};

export const Setup: React.FC = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<Step>(1);
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'user' | 'supervisor' }>({ open: false, type: 'user' });

    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        npi: '',
        professional_title: '',
        license_id: '',
        role: '',
        signature_url: ''
    });

    const [clinicData, setClinicData] = useState({
        id: '',
        name: '',
        address: '',
        phone: '',
        fax: '',
        email: '',
        supervisor_name: '',
        supervisor_license: '',
        supervisor_npi: '',
        supervisor_signature_url: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        default_template_id: ''
    });

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                if (profile) {
                    setProfileData({
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        npi: profile.npi || '',
                        professional_title: profile.professional_title || '',
                        license_id: profile.license_id || '',
                        role: profile.role || '',
                        signature_url: profile.signature_url || ''
                    });

                    if (profile.clinic_id) {
                        const { data: clinic, error: clinicError } = await supabase
                            .from('clinics')
                            .select('*')
                            .eq('id', profile.clinic_id)
                            .single();

                        if (clinicError) throw clinicError;

                        if (clinic) {
                            setClinicData({
                                id: clinic.id,
                                name: clinic.name || '',
                                address: clinic.address || '',
                                phone: clinic.phone || '',
                                fax: clinic.fax || '',
                                email: clinic.email || '',
                                supervisor_name: clinic.settings?.supervisor_name || '',
                                supervisor_license: clinic.settings?.supervisor_license || '',
                                supervisor_npi: clinic.settings?.supervisor_npi || '',
                                supervisor_signature_url: clinic.settings?.supervisor_signature_url || '',
                                timezone: clinic.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                                default_template_id: clinic.default_template_id || ''
                            });
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error loading setup data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const validateFields = (currentStep: Step): Record<string, string> => {
        const newErrors: Record<string, string> = {};
        const config = STEP_CONFIG[currentStep];
        const data: any = (currentStep <= 2) ? profileData : clinicData;

        config.required.forEach(field => {
            if (!data[field]?.trim()) {
                newErrors[field] = 'Required';
            }
        });

        return newErrors;
    };

    const saveStep = async (targetStep: Step) => {
        setSaving(true);
        try {
            if (targetStep <= 2 || targetStep === 4) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        first_name: profileData.first_name,
                        last_name: profileData.last_name,
                        npi: profileData.npi,
                        professional_title: profileData.professional_title,
                        license_id: profileData.license_id,
                        role: profileData.role,
                        signature_url: profileData.signature_url
                    })
                    .eq('id', user!.id);
                if (error) throw error;
            }

            if (targetStep >= 3) {
                const clinicPayload = {
                    name: clinicData.name,
                    address: clinicData.address,
                    phone: clinicData.phone,
                    fax: clinicData.fax,
                    email: clinicData.email,
                    settings: {
                        timezone: clinicData.timezone,
                        supervisor_name: clinicData.supervisor_name,
                        supervisor_license: clinicData.supervisor_license,
                        supervisor_npi: clinicData.supervisor_npi,
                        supervisor_signature_url: clinicData.supervisor_signature_url
                    }
                };

                if (!clinicData.id) {
                    const { data: newClinic, error: createError } = await supabase
                        .from('clinics')
                        .insert(clinicPayload)
                        .select()
                        .single();

                    if (createError) throw createError;
                    if (newClinic) {
                        setClinicData(prev => ({ ...prev, id: newClinic.id }));
                        await supabase.from('profiles').update({ clinic_id: newClinic.id }).eq('id', user!.id);
                    }
                } else {
                    const { error } = await supabase.from('clinics').update(clinicPayload).eq('id', clinicData.id);
                    if (error) throw error;
                }
            }
            return true;
        } catch (err: any) {
            toast.error(`Failed to save: ${err.message}`);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleNext = async () => {
        const fieldErrors = validateFields(step);
        if (Object.keys(fieldErrors).length > 0) {
            toast.error("Please fill in required fields");
            return;
        }

        const success = await saveStep(step);
        if (success && step < 6) setStep((s) => (s + 1) as Step);
    };

    const handleBack = () => { if (step > 1) setStep((s) => (s - 1) as Step); };

    const handleFinish = async () => {
        setSaving(true);
        try {
            await supabase.from('profiles').update({ setup_complete: true }).eq('id', user!.id);
            const { storage } = await import('../notes-module/lib/storage');
            await storage.seedTemplatesBySpecialty(profileData.role);
            window.location.href = '/notes/new';
        } catch (err) {
            toast.error('Failed to finalize setup');
            setSaving(false);
        }
    };

    const handleSignatureCaptured = (signatureData: string) => {
        if (sigModal.type === 'user') {
            setProfileData(prev => ({ ...prev, signature_url: signatureData }));
        } else {
            setClinicData(prev => ({ ...prev, supervisor_signature_url: signatureData }));
        }
        setSigModal({ open: false, type: 'user' });
        toast.success("Signature saved");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const steps = [
        { id: 1, title: 'Provider', icon: User, description: 'Identity' },
        { id: 2, title: 'Specialty', icon: Settings2, description: 'Focus' },
        { id: 3, title: 'Facility', icon: Building2, description: 'Practice' },
        { id: 4, title: 'Supervisor', icon: ShieldCheck, description: 'Oversight' },
        { id: 5, title: 'Signature', icon: PenTool, description: 'Digital sign' },
        { id: 6, title: 'Review', icon: CheckCircle2, description: 'Finish' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start p-6 lg:p-12 overflow-y-auto relative transition-colors duration-300">
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] dark:bg-[#0B1020]/[0.4] pointer-events-none" />

            <button
                type="button"
                onClick={toggleTheme}
                className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            <div className="max-w-[960px] w-full mx-auto relative z-10">
                <div className="mb-8 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        <span>Account Setup</span>
                        <div className="size-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                        <span className="text-[#6366f1]">Step {step} of 6</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-slate-200 dark:border-slate-800/60">
                            <nav className="space-y-1.5">
                                {steps.map((s) => (
                                    <button
                                        key={s.id}
                                        disabled={step < s.id}
                                        onClick={() => step > s.id && setStep(s.id as Step)}
                                        className={cn(
                                            "w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all",
                                            step === s.id
                                                ? "bg-[#6366f1]/10 border border-[#6366f1]/20"
                                                : step > s.id
                                                    ? "opacity-80 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
                                                    : "opacity-40"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-8 rounded-xl flex items-center justify-center text-xs font-black",
                                            step === s.id
                                                ? "bg-[#6366f1] text-white"
                                                : step > s.id
                                                    ? "bg-emerald-500/15 text-emerald-500"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        )}>
                                            {step > s.id ? <CheckCircle2 className="size-4" /> : s.id}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100">{s.title}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{s.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <Card className="rounded-[2.5rem] shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl min-h-[480px] flex flex-col border border-slate-200 dark:border-slate-800/60">
                            <CardContent className="flex-1 p-8 sm:p-10 space-y-8">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">
                                    {steps.find(s => s.id === step)?.title}
                                </h2>

                                {step === 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">First Name *</Label>
                                            <Input value={profileData.first_name} onChange={e => setProfileData({ ...profileData, first_name: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="Jane" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Last Name *</Label>
                                            <Input value={profileData.last_name} onChange={e => setProfileData({ ...profileData, last_name: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="Doe" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Title *</Label>
                                            <Input value={profileData.professional_title} onChange={e => setProfileData({ ...profileData, professional_title: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="MD, NP, TCM..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">NPI</Label>
                                            <Input value={profileData.npi} onChange={e => setProfileData({ ...profileData, npi: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="10 digits" />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="grid grid-cols-1 gap-3.5">
                                        {SPECIALTIES.map(spec => (
                                            <button
                                                key={spec.id}
                                                onClick={() => setProfileData({ ...profileData, role: spec.id })}
                                                className={cn(
                                                    "flex items-center gap-5 p-5 rounded-2xl border text-left transition-all cursor-pointer",
                                                    profileData.role === spec.id
                                                        ? "bg-[#6366f1]/10 border-[#6366f1] ring-2 ring-[#6366f1]/20"
                                                        : "bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <div className={cn(
                                                    "size-12 rounded-xl flex items-center justify-center shrink-0",
                                                    profileData.role === spec.id ? "bg-[#6366f1] text-white" : "bg-slate-200/70 dark:bg-slate-800 text-slate-500"
                                                )}>
                                                    <spec.icon className="size-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{spec.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{spec.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Facility Name *</Label>
                                            <Input value={clinicData.name} onChange={e => setClinicData({ ...clinicData, name: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="Agency name" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Address *</Label>
                                            <Input value={clinicData.address} onChange={e => setClinicData({ ...clinicData, address: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="Street address" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Email *</Label>
                                            <Input value={clinicData.email} onChange={e => setClinicData({ ...clinicData, email: e.target.value })} className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" placeholder="Contact email" />
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Supervisor Full Name</Label>
                                            <Input
                                                value={clinicData.supervisor_name}
                                                onChange={e => setClinicData({ ...clinicData, supervisor_name: e.target.value })}
                                                className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                                                placeholder="Jane Smith, MD"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Supervisor License</Label>
                                                <Input
                                                    value={clinicData.supervisor_license}
                                                    onChange={e => setClinicData({ ...clinicData, supervisor_license: e.target.value })}
                                                    className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                                                    placeholder="License ID"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Supervisor NPI</Label>
                                                <Input
                                                    value={clinicData.supervisor_npi}
                                                    onChange={e => setClinicData({ ...clinicData, supervisor_npi: e.target.value })}
                                                    className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                                                    placeholder="10-digit NPI"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="max-w-md mx-auto w-full space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Digital Signature</Label>
                                        <div
                                            onClick={() => setSigModal({ open: true, type: 'user' })}
                                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-40 flex items-center justify-center cursor-pointer hover:border-[#6366f1] transition-all overflow-hidden bg-slate-50/50 dark:bg-slate-950/40"
                                        >
                                            {profileData.signature_url ? (
                                                <img src={profileData.signature_url} className="max-h-32 dark:invert" alt="Signature" />
                                            ) : (
                                                <div className="text-center text-slate-400 font-bold text-xs">
                                                    <PenTool className="mx-auto mb-2" size={20} /> Click to Sign
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 6 && (
                                    <div className="space-y-5 bg-slate-50 dark:bg-slate-950/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="grid grid-cols-2 gap-6 font-bold text-sm">
                                            <div>
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Provider</p>
                                                <p className="text-slate-900 dark:text-white">{profileData.first_name} {profileData.last_name}, {profileData.professional_title}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Supervisor</p>
                                                <p className="text-slate-900 dark:text-white">{clinicData.supervisor_name || 'None'}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Facility</p>
                                                <p className="text-slate-900 dark:text-white">{clinicData.name}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Status</p>
                                                <p className="text-emerald-500 flex items-center gap-1.5 text-xs"><ShieldCheck size={15} /> Ready</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <div className="p-8 sm:p-10 pt-0 flex gap-4">
                                {step > 1 && (
                                    <Button onClick={handleBack} variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase tracking-wider text-xs">
                                        Back
                                    </Button>
                                )}
                                <Button
                                    onClick={step === 6 ? handleFinish : handleNext}
                                    disabled={saving}
                                    className="flex-[2] h-12 rounded-xl bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-[#6366f1]/20 cursor-pointer"
                                >
                                    {saving ? 'Saving...' : step === 6 ? 'Finish Setup' : 'Continue'} <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <SignatureModal
                isOpen={sigModal.open}
                onClose={() => setSigModal({ open: false, type: 'user' })}
                onSave={handleSignatureCaptured}
                title={sigModal.type === 'user' ? "Clinician Signature" : "Supervisor Signature"}
            />
        </div>
    );
};
