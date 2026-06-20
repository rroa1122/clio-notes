import { useState, useRef } from 'react';
import {
    UserPlus,
    X,
    Loader2,
    User,
    Calendar,
    Phone,
    Mail,
    Shield,
    Briefcase,
    MapPin,
    Stethoscope,
    Brain,
    Activity,
    HeartPulse,
    ClipboardList,
    BadgeCheck,
    Stethoscope as DoctorIcon,
    Brain as PsychIcon,
    FileText,
    Save,
    Store,
    Plus,
    UploadCloud
} from 'lucide-react';
import { extractPatientData } from '../../lib/services/patientIntakeService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storage, type Patient } from '../lib/storage';
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { searchDiagnoses, type DiagnosisCode } from '../lib/diagnosisCatalog';
import { cn } from "@/lib/utils";

interface PatientCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (patient: Patient) => void;
    context?: 'directory' | 'encounter';
}

export function PatientCreateModal({ isOpen, onClose, onCreated, context = 'encounter' }: PatientCreateModalProps) {
    const [formData, setFormData] = useState<Partial<Patient>>({
        full_name: '',
        dob: '',
        phone: '',
        email: '',
        emr_id: '',
        gender: '',
        diagnoses: '',
        ssn: '',
        address: '',
        citizenship: '',
        case_manager: '',
        insurance_company: '',
        pcp_name: '',
        pcp_clinic_name: '',
        pcp_phone: '',
        pcp_address: '',
        pcp_conditions: '',
        pcp_medications: '',
        psych_name: '',
        psych_phone: '',
        psych_address: '',
        psych_conditions: '',
        psych_medications: '',
        pharmacy_name: '',
        pharmacy_phone: '',
        pharmacy_fax: '',
        pharmacy_address: '',
        presenting_problems: ''
    });

    const [suggestions, setSuggestions] = useState<DiagnosisCode[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState('client');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let file: File | null = null;
        if ('dataTransfer' in e) {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                file = e.dataTransfer.files[0];
            }
        } else if ('target' in e) {
            if (e.target?.files && e.target.files[0]) {
                file = e.target.files[0];
            }
        }

        if (!file) return;

        setIsExtracting(true);
        try {
            const extractedData = await extractPatientData(file);
            
            const newPatientData = {
                ...formData,
                ...extractedData,
            } as Patient;

            setFormData(prev => ({ ...prev, ...extractedData }));

            if (!newPatientData.full_name) {
                toast.warning("Datos extraídos, pero falta el nombre. Por favor completa el formulario.");
                return;
            }

            const newPatient = await storage.upsertPatient(newPatientData);
            
            if (newPatient) {
                toast.success("Paciente creado automáticamente", { icon: "✨" });
                onCreated(newPatient);
                onClose();
                setFormData({ full_name: '', dob: '', phone: '', email: '', emr_id: '', gender: '' });
            } else {
                toast.error("Error al guardar el paciente");
            }
        } catch (error) {
            console.error("Extraction error:", error);
            toast.error("Error al extraer datos del documento");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleFieldChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name) {
            toast.error("Full name is required");
            return;
        }

        setIsSaving(true);
        try {
            const newPatient = await storage.upsertPatient({
                ...formData,
            } as Patient);

            if (newPatient) {
                toast.success("Client created successfully");
                onCreated(newPatient);
                onClose();
                // Reset form
                setFormData({ full_name: '', dob: '', phone: '', email: '', emr_id: '', gender: '' });
            } else {
                toast.error("Database returned no data - Possible permission issue");
            }
        } catch (err) {
            console.error("Failed to create patient:", err);
            toast.error(err instanceof Error ? err.message : "Failed to create client record");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[1024px] p-0 overflow-hidden rounded-[2.5rem] border-slate-200/50 shadow-2xl bg-white/95 backdrop-blur-2xl">
                <div className="flex flex-col h-[85vh] md:h-auto max-h-[90vh]">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 -z-10" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="size-14 rounded-[20px] bg-white text-indigo-600 flex items-center justify-center border border-indigo-50 shadow-sm">
                                    <UserPlus size={28} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                                            Register New Patient
                                        </DialogTitle>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                                            Clinical Intake
                                        </Badge>
                                    </div>
                                    <DialogDescription className="text-[11px] font-black text-slate-400 mt-2.5 tracking-[0.05em] uppercase opacity-70">
                                        Establish a new medical record with comprehensive clinical coordination.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                        {/* Tabs Navigation */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-8 bg-slate-50/30 border-b border-slate-100/50 py-3">
                                <TabsList className="bg-slate-50/50 backdrop-blur-md p-1 h-12 rounded-full border border-slate-200/50 shadow-sm w-full flex items-stretch gap-1">
                                    <PremiumTrigger value="client" label="Client" icon={User} theme="indigo" />
                                    <PremiumTrigger value="pcp" label="Primary Care Physician" icon={DoctorIcon} theme="emerald" />
                                    <PremiumTrigger value="psych" label="Psychiatric" icon={PsychIcon} theme="purple" />
                                    <PremiumTrigger value="pharmacy" label="Pharmacy" icon={Store} theme="amber" />
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto px-10 py-10 custom-scrollbar bg-slate-100/40">
                                {/* [CLIENT TAB] */}
                                <TabsContent value="client" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {/* AI Extraction Dropzone */}
                                    <div 
                                        className={cn(
                                            "mb-10 relative rounded-[2rem] border border-dashed border-indigo-200 bg-indigo-50/20 overflow-hidden transition-all duration-500 group",
                                            isExtracting ? "border-indigo-400 bg-indigo-50/40 shadow-inner" : "hover:border-indigo-300 hover:bg-white hover:shadow-[0_20px_50px_-20px_rgba(79,70,229,0.1)] focus-within:border-indigo-400 focus-within:bg-white"
                                        )}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleFileUpload}
                                    >
                                        <input 
                                            type="file" 
                                            id="intake-upload" 
                                            accept=".pdf,image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                            onChange={handleFileUpload}
                                            disabled={isExtracting}
                                        />
                                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center relative z-0">
                                            {isExtracting ? (
                                                <div className="animate-in fade-in duration-500 flex flex-col items-center">
                                                    <div className="size-16 rounded-3xl bg-indigo-100/50 text-indigo-500 flex items-center justify-center mb-5 relative group-hover:scale-110 transition-transform">
                                                        <Loader2 className="absolute h-7 w-7 animate-spin text-indigo-600" />
                                                        <FileText className="h-7 w-7 opacity-20" />
                                                    </div>
                                                    <h3 className="text-[15px] font-black text-indigo-950 uppercase tracking-[0.2em] mb-1">Analyzing...</h3>
                                                    <p className="text-[11px] font-bold text-indigo-500/70 tracking-tight">Extracting patient demographics and clinical data.</p>
                                                </div>
                                            ) : (
                                                <div className="animate-in fade-in duration-500 flex flex-col items-center transition-transform group-hover:-translate-y-1">
                                                    <div className="size-16 rounded-[22px] bg-white text-indigo-500 flex items-center justify-center shadow-md mb-5 border border-indigo-50 ring-8 ring-indigo-50/30 group-hover:scale-110 transition-all duration-500">
                                                        <UploadCloud size={28} />
                                                    </div>
                                                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-[0.25em] mb-3">Upload Clinical Intake</h3>
                                                    <p className="text-[11px] font-bold text-slate-400 max-w-sm mb-5 leading-relaxed tracking-wide opacity-80">Drag and drop forms to <span className="text-indigo-500 font-black">auto-fill</span> the profile using Health AI.</p>
                                                    <Badge variant="outline" className="bg-white/80 backdrop-blur border-slate-200/50 text-slate-400 font-black px-4 py-1.5 text-[9px] uppercase tracking-widest rounded-full shadow-sm">
                                                        PDF • JPG • PNG
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={cn("transition-all duration-700", isExtracting && "opacity-40 blur-[4px] pointer-events-none scale-[0.98]")}>
                                        <div className="bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <PremiumGlassField icon={User} label="Full Legal Name" name="full_name" value={formData.full_name} onChange={handleFieldChange} theme="indigo" placeholder="E.g. Alice Wonder" required />
                                                <PremiumGlassField icon={Calendar} label="Date of Birth" name="dob" value={formData.dob} onChange={handleFieldChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={BadgeCheck} label="Citizenship Status" name="citizenship" value={formData.citizenship} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Shield} label="SSN / National ID" name="ssn" value={formData.ssn} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Phone} label="Primary Contact" name="phone" value={formData.phone} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Mail} label="Email Address" name="email" value={formData.email} onChange={handleFieldChange} theme="indigo" type="email" />
                                                <PremiumGlassField icon={MapPin} label="Residential Address" name="address" value={formData.address} onChange={handleFieldChange} theme="indigo" className="col-span-2" />
                                            </div>
                                        </div>

                                        <div className="mt-8 bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <div className="col-span-2 mb-2">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">Coordination & Emergency</h4>
                                                </div>
                                                <PremiumGlassField icon={User} label="Race" name="race" value={formData.race} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={User} label="Ethnicity" name="ethnicity" value={formData.ethnicity} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={User} label="Preferred Language" name="preferred_language" value={formData.preferred_language} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Briefcase} label="Case Manager" name="case_manager" value={formData.case_manager} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Phone} label="Emergency Contact" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={User} label="Relation" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Phone} label="Emergency Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleFieldChange} theme="indigo" className="col-span-2" />
                                            </div>
                                        </div>

                                        <div className="mt-8 bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <div className="col-span-2 mb-2">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">Billing & Insurance</h4>
                                                </div>
                                                <PremiumGlassField icon={Shield} label="Insurance Carrier" name="insurance_company" value={formData.insurance_company} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Shield} label="Member ID" name="insurance_id" value={formData.insurance_id} onChange={handleFieldChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="mt-8 bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                            <div className="space-y-6">
                                                <div className="mb-2">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">Clinical Overview</h4>
                                                </div>
                                                <PremiumGlassField icon={ClipboardList} label="Primary Case Narrative" name="presenting_problems" value={formData.presenting_problems} onChange={handleFieldChange} theme="indigo" isTextarea large className="col-span-2" />
                                                
                                                <div className="space-y-4 px-0.5 mt-8 border-t border-slate-100 pt-8">
                                                    <div className="flex items-center gap-3 transition-transform duration-300 hover:translate-x-1">
                                                        <div className="size-6 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500 relative border border-indigo-100/50">
                                                            <Activity size={13} className="relative z-10" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none opacity-90">Diagnostic Registry (ICD-10)</p>
                                                    </div>

                                                    <div className="relative group">
                                                        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                        <div className="rounded-[24px] border border-slate-200/60 bg-white transition-all duration-500 relative overflow-hidden group-focus-within:border-indigo-300 group-focus-within:ring-4 group-focus-within:ring-indigo-500/5 shadow-sm">
                                                            <textarea
                                                                className="w-full min-h-[120px] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 py-4 text-[14px] font-bold text-slate-900 placeholder:text-slate-300 resize-none leading-relaxed relative z-10"
                                                                value={formData.diagnoses || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    handleFieldChange('diagnoses', val);
                                                                    const lines = val.split('\n');
                                                                    const lastLine = lines[lines.length - 1].trim();
                                                                    if (lastLine.length >= 2) {
                                                                        const results = searchDiagnoses(lastLine);
                                                                        setSuggestions(results);
                                                                    } else {
                                                                        setSuggestions([]);
                                                                    }
                                                                }}
                                                                placeholder="Enter code or description (e.g. I10 or Hypertension)..."
                                                            />
                                                        </div>

                                                        {suggestions.length > 0 && (
                                                            <div className="absolute z-50 bottom-full mb-3 left-0 w-full bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                <div className="p-4 border-b border-slate-50 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest px-8">
                                                                    Clinical Suggestions
                                                                </div>
                                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                    {suggestions.map((s) => (
                                                                        <button
                                                                            key={s.code}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const lines = (formData.diagnoses || '').split('\n');
                                                                                lines[lines.length - 1] = `${s.code} - ${s.description} `;
                                                                                handleFieldChange('diagnoses', lines.join('\n') + '\n');
                                                                                setSuggestions([]);
                                                                            }}
                                                                            className="w-full text-left px-8 py-4 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 last:border-0 group flex items-center justify-between gap-4"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded shadow-tiny shrink-0">{s.code}</span>
                                                                                <span className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{s.description}</span>
                                                                            </div>
                                                                            <Plus size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [PCP TAB] */}
                                <TabsContent value="pcp" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <PremiumGlassField icon={DoctorIcon} label="PCP Name" name="pcp_name" value={formData.pcp_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Store} label="PCP Clinic Name" name="pcp_clinic_name" value={formData.pcp_clinic_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Phone} label="PCP Phone" name="pcp_phone" value={formData.pcp_phone} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={MapPin} label="PCP Practice Address" name="pcp_address" value={formData.pcp_address} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Activity} label="Physical Conditions" name="pcp_conditions" value={formData.pcp_conditions} onChange={handleFieldChange} theme="emerald" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Current Medications" name="pcp_medications" value={formData.pcp_medications} onChange={handleFieldChange} theme="emerald" isTextarea />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [PSYCH TAB] */}
                                <TabsContent value="psych" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <PremiumGlassField icon={Brain} label="Psychiatrist Name" name="psych_name" value={formData.psych_name} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={Phone} label="Psych Phone" name="psych_phone" value={formData.psych_phone} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={MapPin} label="Clinic Address" name="psych_address" value={formData.psych_address} onChange={handleFieldChange} theme="purple" className="col-span-2" />
                                            <PremiumGlassField icon={Activity} label="Mental Conditions" name="psych_conditions" value={formData.psych_conditions} onChange={handleFieldChange} theme="purple" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Psychiatric Medications" name="psych_medications" value={formData.psych_medications} onChange={handleFieldChange} theme="purple" isTextarea />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [PHARMACY TAB] */}
                                <TabsContent value="pharmacy" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="bg-white/70 border border-slate-200/50 rounded-[2rem] p-8 shadow-sm">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <PremiumGlassField icon={Store} label="Pharmacy Name" name="pharmacy_name" value={formData.pharmacy_name} onChange={handleFieldChange} theme="amber" />
                                            <PremiumGlassField icon={Phone} label="Pharmacy Phone" name="pharmacy_phone" value={formData.pharmacy_phone} onChange={handleFieldChange} theme="amber" />
                                            <PremiumGlassField icon={MapPin} label="Pharmacy Address" name="pharmacy_address" value={formData.pharmacy_address} onChange={handleFieldChange} theme="amber" className="col-span-2" />
                                            <PremiumGlassField icon={FileText} label="Pharmacy Fax" name="pharmacy_fax" value={formData.pharmacy_fax} onChange={handleFieldChange} theme="amber" />
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Footer Actions */}
                        <div className="px-10 py-7 border-t border-slate-100/60 bg-white/50 backdrop-blur-md flex items-center justify-between gap-6">
                            <div className="hidden md:flex items-center gap-3 ml-2">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ready for validation</span>
                            </div>

                            <div className="flex items-center gap-4 flex-1 md:flex-none">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 md:w-32 h-12 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors"
                                >
                                    Discard
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !formData.full_name}
                                    className="flex-1 md:px-12 h-12 rounded-full font-black text-[10px] uppercase tracking-[0.15em] bg-indigo-950 hover:bg-indigo-900 text-white border border-indigo-800/20 shadow-xl shadow-indigo-200/50 gap-3 transition-all active:scale-[0.97] group/btn relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Establishing...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={15} className="text-indigo-300 group-hover/btn:scale-110 transition-transform" />
                                            Register Patient
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog >
    );
}

// [SUB-COMPONENTS]

function PremiumTrigger({ value, label, icon: Icon, theme }: { value: string, label: string, icon: any, theme: string }) {
    const themeShadows: Record<string, string> = {
        indigo: "data-[state=active]:shadow-indigo-100/50 data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50/50",
        emerald: "data-[state=active]:shadow-emerald-100/50 data-[state=active]:text-emerald-600 data-[state=active]:bg-emerald-50/50",
        purple: "data-[state=active]:shadow-purple-100/50 data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50/50",
        blue: "data-[state=active]:shadow-blue-100/50 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50/50",
        amber: "data-[state=active]:shadow-amber-100/50 data-[state=active]:text-amber-600 data-[state=active]:bg-amber-50/50"
    };

    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex-1 rounded-full flex items-center justify-center gap-2.5 px-4 h-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 text-slate-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-200/40 border border-transparent data-[state=active]:border-slate-100 group",
                themeShadows[theme]
            )}
        >
            <Icon size={14} className="opacity-60 group-data-[state=active]:opacity-100 group-hover:scale-110 transition-all duration-300" />
            <span className="shrink-0">{label}</span>
        </TabsTrigger>
    );
}

interface ModalFieldProps {
    icon: any;
    label: string;
    name: string;
    value?: string | null;
    onChange: (name: string, value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    isTextarea?: boolean;
    large?: boolean;
    required?: boolean;
    theme: 'indigo' | 'emerald' | 'purple' | 'blue' | 'amber';
}

function PremiumGlassField({ icon: Icon, label, name, value, onChange, placeholder, type = 'text', className, isTextarea, large, required, theme }: ModalFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const iconBgThemes = {
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-100/50",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-100/50",
        purple: "bg-purple-500/10 text-purple-500 border-purple-100/50",
        blue: "bg-blue-500/10 text-blue-500 border-blue-100/50",
        amber: "bg-amber-500/10 text-amber-500 border-amber-100/50"
    };

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-3 ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
                <div className={cn("size-6 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                    <div className="absolute inset-0 blur-md opacity-0 group-hover:opacity-60 transition-opacity bg-current" />
                    <Icon size={13} className="relative z-10" />
                </div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none opacity-90">
                    {label} {required && <span className="text-red-500">*</span>}
                </p>
            </div>

            <div className={cn(
                "rounded-[28px] border border-slate-200/70 bg-white transition-all duration-300 relative overflow-hidden",
                "shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]",
                "hover:shadow-[0_12px_24px_-10px_rgba(var(--primary-rgb),0.2)] hover:-translate-y-[2px] hover:border-primary/30",
                "focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5",
                isTextarea ? (large ? "min-h-[160px]" : "min-h-[110px]") : "h-11"
            )}>

                {isTextarea ? (
                        <textarea
                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 py-4 text-[14px] font-bold text-slate-900 placeholder:text-slate-300 resize-none leading-relaxed shadow-none hover:shadow-none"
                            value={value || ''}
                            onChange={(e) => onChange(name, e.target.value)}
                            placeholder={placeholder || `Document ${label.toLowerCase()}...`}
                        />
                ) : (
                    <div className="relative h-full flex items-center px-0">
                        {type === 'date' ? (
                            <DatePicker 
                                date={value || ''} 
                                setDate={(newDate) => onChange(name, newDate)} 
                                className="w-full h-full bg-transparent border-none shadow-none ring-0 focus-within:ring-0 px-6 font-bold text-slate-800"
                                placeholder={placeholder || "MM/DD/YYYY"}
                                mode="input"
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                type={type}
                                className={cn(
                                    "w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 text-[14px] font-bold text-slate-900 placeholder:text-slate-300 leading-none shadow-none hover:shadow-none"
                                )}
                                value={value || ''}
                                onChange={(e) => onChange(name, e.target.value)}
                                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
