import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
    ArrowLeft,
    PenTool,
    Eraser,
    ShieldCheck,
    AlertCircle
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
    2: { required: ['role'], optional: false }, // Use role from Step 2
    3: { required: ['name', 'address', 'email'], optional: false },
    4: { required: [], optional: true },
    5: { required: [], optional: true }, // Signatures step
    6: { required: [], optional: false }  // Review step
};

export const Setup: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<Step>(1);
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'user' | 'supervisor' }>({ open: false, type: 'user' });

    // Validation & State
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [skippedSteps, setSkippedSteps] = useState<number[]>([]);

    // Data State
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

    // Load Initial Data
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
                newErrors[field] = 'This field is required';
            }
        });

        return newErrors;
    };

    const saveStep = async (targetStep: Step) => {
        setSaving(true);
        try {
            if (targetStep <= 2 || targetStep === 4) {
                // Save Profile fields
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
                // Save Clinic fields
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
            setErrors(fieldErrors);
            setTouched(Object.keys(fieldErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
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
        toast.success(`${sigModal.type === 'user' ? 'Case manager' : 'Supervisor'} signature captured successfully`);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading setup...</div>;

    const steps = [
        { id: 1, title: 'Case Manager', icon: User, description: 'Identity' },
        { id: 2, title: 'Specialty', icon: Settings2, description: 'Clinical focus' },
        { id: 3, title: 'Facility', icon: Building2, description: 'Agency info' },
        { id: 4, title: 'Supervisor', icon: ShieldCheck, description: 'Clinical Oversight' },
        { id: 5, title: 'Signatures', icon: PenTool, description: 'Validations' },
        { id: 6, title: 'Finish', icon: CheckCircle2, description: 'Confirmation' },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-start p-6 lg:p-12 overflow-y-auto">
            <div className="max-w-[980px] w-full mx-auto relative z-10">
                <div className="mb-8 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        <span>Setup</span>
                        <div className="size-1 bg-slate-200 rounded-full" />
                        <span className="text-slate-500">Step {step} of 6</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
                            <nav className="space-y-2">
                                {steps.map((s) => (
                                    <button
                                        key={s.id}
                                        disabled={step < s.id}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-[1.25rem] text-left transition-all",
                                            step === s.id ? "bg-indigo-50 border-indigo-100 shadow-sm" : "opacity-40"
                                        )}
                                    >
                                        <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-black", step === s.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                                            {step > s.id ? <CheckCircle2 className="size-4" /> : s.id}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black tracking-tight text-slate-900">{s.title}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{s.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <Card className="rounded-[2.5rem] shadow-2xl overflow-hidden bg-white min-h-[500px] flex flex-col border-none">
                            <CardContent className="flex-1 p-10 space-y-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">{steps.find(s => s.id === step)?.title}</h2>

                                {step === 1 && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">First Name *</Label>
                                            <Input value={profileData.first_name} onChange={e => setProfileData({ ...profileData, first_name: e.target.value })} className="rounded-xl h-12" placeholder="Jane" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Last Name *</Label>
                                            <Input value={profileData.last_name} onChange={e => setProfileData({ ...profileData, last_name: e.target.value })} className="rounded-xl h-12" placeholder="Doe" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Title *</Label>
                                            <Input value={profileData.professional_title} onChange={e => setProfileData({ ...profileData, professional_title: e.target.value })} className="rounded-xl h-12" placeholder="MD, NP..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">NPI</Label>
                                            <Input value={profileData.npi} onChange={e => setProfileData({ ...profileData, npi: e.target.value })} className="rounded-xl h-12" placeholder="10 digits" />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="grid grid-cols-1 gap-4">
                                        {SPECIALTIES.map(spec => (
                                            <button
                                                key={spec.id}
                                                onClick={() => setProfileData({ ...profileData, role: spec.id })}
                                                className={cn("flex items-start gap-6 p-6 rounded-[1.5rem] border text-left transition-all", profileData.role === spec.id ? "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/20" : "bg-white border-slate-200")}
                                            >
                                                <div className={cn("size-12 rounded-2xl flex items-center justify-center", profileData.role === spec.id ? "bg-indigo-600 text-white" : "bg-slate-100")}><spec.icon /></div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{spec.title}</p>
                                                    <p className="text-xs text-slate-400">{spec.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Facility Name *</Label>
                                            <Input value={clinicData.name} onChange={e => setClinicData({ ...clinicData, name: e.target.value })} className="rounded-xl h-12" placeholder="Agency name" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Physical Address *</Label>
                                            <Input value={clinicData.address} onChange={e => setClinicData({ ...clinicData, address: e.target.value })} className="rounded-xl h-12" placeholder="Address line" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Email *</Label>
                                            <Input value={clinicData.email} onChange={e => setClinicData({ ...clinicData, email: e.target.value })} className="rounded-xl h-12" placeholder="Contact email" />
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Supervisor's Full Name</Label>
                                            <Input
                                                value={clinicData.supervisor_name}
                                                onChange={e => setClinicData({ ...clinicData, supervisor_name: e.target.value })}
                                                className="rounded-xl h-12"
                                                placeholder="Jane Smith, MD"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Supervisor License</Label>
                                                <Input
                                                    value={clinicData.supervisor_license}
                                                    onChange={e => setClinicData({ ...clinicData, supervisor_license: e.target.value })}
                                                    className="rounded-xl h-12"
                                                    placeholder="License ID"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Supervisor NPI</Label>
                                                <Input
                                                    value={clinicData.supervisor_npi}
                                                    onChange={e => setClinicData({ ...clinicData, supervisor_npi: e.target.value })}
                                                    className="rounded-xl h-12"
                                                    placeholder="10-digit NPI"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-8">
                                        <div className="max-w-md mx-auto">
                                            <div className="space-y-4">
                                                <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">My Digital Signature</Label>
                                                <div onClick={() => setSigModal({ open: true, type: 'user' })} className="border-2 border-dashed border-slate-200 rounded-2xl h-40 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden bg-slate-50/20">
                                                    {profileData.signature_url ? (
                                                        <img src={profileData.signature_url} className="max-h-32" />
                                                    ) : (
                                                        <div className="text-center text-slate-400 font-bold text-xs"><PenTool className="mx-auto mb-2" size={20} /> Record My Signature</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 6 && (
                                    <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                                        <div className="grid grid-cols-2 gap-8 font-bold text-sm">
                                            <div className="col-span-1">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Provider</p>
                                                <p className="text-slate-900">{profileData.first_name} {profileData.last_name}, {profileData.professional_title}</p>
                                            </div>
                                            <div className="col-span-1">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Supervisor</p>
                                                <p className="text-slate-900">{clinicData.supervisor_name || 'Not Recorded'}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Facility</p>
                                                <p className="text-slate-900">{clinicData.name}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] uppercase text-slate-400 mb-1">Status</p>
                                                <p className="text-emerald-600 flex items-center gap-1"><ShieldCheck size={14} /> Ready to Deploy</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <div className="p-10 pt-0 flex gap-4">
                                {step > 1 && <Button onClick={handleBack} variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase tracking-wider text-xs">Back</Button>}
                                <Button
                                    onClick={step === 6 ? handleFinish : handleNext}
                                    className="flex-[2] h-12 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-wider text-xs hover:bg-slate-800"
                                >
                                    {step === 6 ? 'Start Documentation' : 'Continue'} <ArrowRight className="ml-2 size-4" />
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
