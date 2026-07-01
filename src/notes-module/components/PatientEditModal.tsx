import { useState, useEffect, useRef } from 'react';
import { User, X, Loader2, Save, CreditCard, Stethoscope, Brain, ClipboardList, Phone, MapPin, Store, FileText, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { storage, type Patient } from '../lib/storage';
import { toast } from "sonner";
import { searchDiagnoses, type DiagnosisCode } from '../lib/diagnosisCatalog';
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface PatientEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    onUpdated: (patient: Patient) => void;
}

export function PatientEditModal({ isOpen, onClose, patient, onUpdated }: PatientEditModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        phone: '',
        email: '',
        emr_id: '',
        gender: '',
        diagnoses: '',
        ssn: '',
        citizenship: '',
        case_manager: '',
        insurance_company: '',
        address: '',
        // PCP
        pcp_name: '',
        pcp_clinic_name: '',
        pcp_phone: '',
        pcp_address: '',
        pcp_conditions: '',
        pcp_medications: '',
        // Psych
        psych_name: '',
        psych_phone: '',
        psych_address: '',
        psych_conditions: '',
        psych_medications: '',
        // Pharmacy
        pharmacy_name: '',
        pharmacy_phone: '',
        pharmacy_fax: '',
        pharmacy_address: '',
        // Clinical
        presenting_problems: ''
    });

    const [activeTab, setActiveTab] = useState("client");
    const [suggestions, setSuggestions] = useState<DiagnosisCode[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (patient) {
            setFormData({
                first_name: patient.first_name || patient.full_name.split(' ')[0] || '',
                last_name: patient.last_name || patient.full_name.split(' ').slice(1).join(' ') || '',
                dob: patient.dob || '',
                phone: patient.phone || '',
                email: patient.email || '',
                emr_id: patient.emr_id || '',
                gender: patient.gender || '',
                diagnoses: patient.diagnoses || '',
                ssn: patient.ssn || '',
                citizenship: patient.citizenship || '',
                case_manager: patient.case_manager || '',
                insurance_company: patient.insurance_company || '',
                address: patient.address || '',
                pcp_name: patient.pcp_name || '',
                pcp_clinic_name: patient.pcp_clinic_name || '',
                pcp_phone: patient.pcp_phone || '',
                pcp_address: patient.pcp_address || '',
                pcp_conditions: patient.pcp_conditions || '',
                pcp_medications: patient.pcp_medications || '',
                psych_name: patient.psych_name || '',
                psych_phone: patient.psych_phone || '',
                psych_address: patient.psych_address || '',
                psych_conditions: patient.psych_conditions || '',
                psych_medications: patient.psych_medications || '',
                pharmacy_name: patient.pharmacy_name || '',
                pharmacy_phone: patient.pharmacy_phone || '',
                pharmacy_fax: patient.pharmacy_fax || '',
                pharmacy_address: patient.pharmacy_address || '',
                presenting_problems: patient.presenting_problems || ''
            });
        }
    }, [patient]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        if (!fullName) {
            toast.error("Full name is required");
            return;
        }

        setIsSaving(true);
        try {
            const sanitizedData: Partial<Patient> = {
                ...formData,
                id: patient.id,
                full_name: fullName,
                // Ensure nulls for empty strings in Supabase
                dob: formData.dob || null,
                phone: formData.phone || null,
                email: formData.email || null,
                emr_id: formData.emr_id || null,
                gender: formData.gender || null,
                diagnoses: formData.diagnoses || null,
                ssn: formData.ssn || null,
                citizenship: formData.citizenship || null,
                case_manager: formData.case_manager || null,
                insurance_company: formData.insurance_company || null,
                address: formData.address || null,
                pcp_name: formData.pcp_name || null,
                pcp_clinic_name: formData.pcp_clinic_name || null,
                pcp_phone: formData.pcp_phone || null,
                pcp_address: formData.pcp_address || null,
                pcp_conditions: formData.pcp_conditions || null,
                pcp_medications: formData.pcp_medications || null,
                psych_name: formData.psych_name || null,
                psych_phone: formData.psych_phone || null,
                psych_address: formData.psych_address || null,
                psych_conditions: formData.psych_conditions || null,
                psych_medications: formData.psych_medications || null,
                pharmacy_name: formData.pharmacy_name || null,
                pharmacy_phone: formData.pharmacy_phone || null,
                pharmacy_fax: formData.pharmacy_fax || null,
                pharmacy_address: formData.pharmacy_address || null,
                presenting_problems: formData.presenting_problems || null
            };

            const updatedPatient = await storage.upsertPatient(sanitizedData);
            if (updatedPatient) {
                toast.success("Profile updated successfully");
                onUpdated(updatedPatient);
                onClose();
            }
        } catch (err) {
            console.error("Failed to update patient:", err);
            toast.error("Failed to update patient record");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                className="sm:max-w-[700px] h-[90vh] max-h-[90vh] rounded-[32px] border-slate-200 bg-white shadow-full p-0 overflow-hidden translate-x-0 translate-y-0 inset-0 m-auto flex flex-col"
            >
                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    <DialogHeader className="p-8 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm border border-primary/5">
                                <User size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Edit Client</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-slate-500">
                                    Manage comprehensive administrative and clinical identifiers.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid grid-cols-4 w-full h-12 bg-slate-50 p-1 rounded-2xl mb-8 border border-slate-100">
                                <TabsTrigger value="client" className="rounded-xl text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">CLIENT</TabsTrigger>
                                <TabsTrigger value="pcp" className="rounded-xl text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">PCP</TabsTrigger>
                                <TabsTrigger value="psych" className="rounded-xl text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">PSYCH</TabsTrigger>
                                <TabsTrigger value="pharmacy" className="rounded-xl text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">PHARMACY</TabsTrigger>
                            </TabsList>

                            {/* TAB 1: CLIENT */}
                            <TabsContent value="client" className="space-y-6 mt-0 outline-none">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">First Name</Label>
                                        <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Last Name</Label>
                                        <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_company" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Insurance Company</Label>
                                        <Input id="insurance_company" value={formData.insurance_company} onChange={(e) => setFormData(p => ({ ...p, insurance_company: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dob" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth</Label>
                                        <DatePicker 
                                            date={formData.dob} 
                                            setDate={(val) => setFormData(p => ({ ...p, dob: val }))} 
                                            className="h-11 rounded-2xl bg-slate-50/50 border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="citizenship" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Citizenship</Label>
                                        <Select value={formData.citizenship} onValueChange={(val) => setFormData(p => ({ ...p, citizenship: val }))}>
                                            <SelectTrigger className="h-11 rounded-2xl bg-slate-50/50 border-slate-200">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="US Citizen">US Citizen</SelectItem>
                                                <SelectItem value="Resident">Resident</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone</Label>
                                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ssn" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">SSN (Masked)</Label>
                                        <Input id="ssn" value={formData.ssn} onChange={(e) => setFormData(p => ({ ...p, ssn: e.target.value }))} placeholder="XXX-XX-XXXX" className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="case_manager" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Case Manager</Label>
                                        <Input id="case_manager" value={formData.case_manager} onChange={(e) => setFormData(p => ({ ...p, case_manager: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="address" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Home Address</Label>
                                        <Input id="address" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>

                                    {/* Appended Clinical Data */}
                                    <div className="col-span-2 space-y-4 mt-6 pt-6 border-t border-slate-100/50">
                                        <div className="space-y-2 border border-slate-100 rounded-[20px] p-6 bg-white shadow-sm">
                                            <Label htmlFor="presenting_problems" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Presenting Problem</Label>
                                            <Textarea id="presenting_problems" value={formData.presenting_problems} onChange={(e) => setFormData(p => ({ ...p, presenting_problems: e.target.value }))} className="min-h-[130px] rounded-2xl bg-slate-50/50 border-slate-200 font-medium leading-relaxed focus-visible:ring-indigo-500" />
                                        </div>

                                        <div className="space-y-2 relative border border-slate-100 rounded-[20px] p-6 bg-white shadow-sm">
                                            <Label htmlFor="diagnoses" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Official Diagnoses (ICD-10)</Label>
                                            <div className="relative">
                                                <Textarea
                                                    id="diagnoses"
                                                    value={formData.diagnoses}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData(p => ({ ...p, diagnoses: val }));
                                                        const lines = val.split('\n');
                                                        const lastLine = lines[lines.length - 1].trim();
                                                        if (lastLine.length >= 2) {
                                                            const results = searchDiagnoses(lastLine);
                                                            setSuggestions(results);
                                                        } else {
                                                            setSuggestions([]);
                                                        }
                                                    }}
                                                    className="min-h-[90px] rounded-2xl bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
                                                />

                                                {suggestions.length > 0 && (
                                                    <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Codes</div>
                                                        <div className="max-h-[160px] overflow-y-auto">
                                                            {suggestions.map((s) => (
                                                                <button key={s.code} type="button" onClick={() => {
                                                                    const lines = formData.diagnoses.split('\n');
                                                                    lines[lines.length - 1] = `${s.code} - ${s.description}`;
                                                                    setFormData(p => ({ ...p, diagnoses: lines.join('\n') + '\n' }));
                                                                    setSuggestions([]);
                                                                }} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">{s.code}</span>
                                                                        <span className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{s.description}</span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: PCP */}
                            <TabsContent value="pcp" className="space-y-6 mt-0 outline-none">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">PCP Name</Label>
                                        <Input id="pcp_name" value={formData.pcp_name} onChange={(e) => setFormData(p => ({ ...p, pcp_name: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_clinic_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">PCP Clinic Name</Label>
                                        <Input id="pcp_clinic_name" value={formData.pcp_clinic_name} onChange={(e) => setFormData(p => ({ ...p, pcp_clinic_name: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">PCP Phone</Label>
                                        <Input id="pcp_phone" value={formData.pcp_phone} onChange={(e) => setFormData(p => ({ ...p, pcp_phone: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_address" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">PCP Address</Label>
                                        <Input id="pcp_address" value={formData.pcp_address} onChange={(e) => setFormData(p => ({ ...p, pcp_address: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_conditions" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Physical Conditions</Label>
                                        <Textarea id="pcp_conditions" value={formData.pcp_conditions} onChange={(e) => setFormData(p => ({ ...p, pcp_conditions: e.target.value }))} className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pcp_medications" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Medications</Label>
                                        <Textarea id="pcp_medications" value={formData.pcp_medications} onChange={(e) => setFormData(p => ({ ...p, pcp_medications: e.target.value }))} className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 3: PSYCH */}
                            <TabsContent value="psych" className="space-y-6 mt-0 outline-none">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="psych_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Psychiatrist Name</Label>
                                        <Input id="psych_name" value={formData.psych_name} onChange={(e) => setFormData(p => ({ ...p, psych_name: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="psych_phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Psych Phone</Label>
                                        <Input id="psych_phone" value={formData.psych_phone} onChange={(e) => setFormData(p => ({ ...p, psych_phone: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="psych_address" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Psychiatrist Address</Label>
                                        <Input id="psych_address" value={formData.psych_address} onChange={(e) => setFormData(p => ({ ...p, psych_address: e.target.value }))} className="h-11 rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="psych_conditions" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mental Conditions</Label>
                                        <Textarea id="psych_conditions" value={formData.psych_conditions} onChange={(e) => setFormData(p => ({ ...p, psych_conditions: e.target.value }))} className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="psych_medications" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Medications</Label>
                                        <Textarea id="psych_medications" value={formData.psych_medications} onChange={(e) => setFormData(p => ({ ...p, psych_medications: e.target.value }))} className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200" />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 4: PHARMACY */}
                            <TabsContent value="pharmacy" className="mt-0 outline-none animate-in fade-in zoom-in-95 duration-200">
                                <div className="grid grid-cols-2 gap-6 relative">
                                    <div className="absolute -inset-4 bg-amber-50/50 rounded-3xl -z-10" />
                                    <div className="space-y-2">
                                        <Label htmlFor="pharmacy_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Pharmacy Name</Label>
                                        <div className="relative">
                                            <Store className="text-amber-500 absolute left-4 top-3.5" size={18} />
                                            <Input id="pharmacy_name" value={formData.pharmacy_name} onChange={(e) => setFormData(p => ({ ...p, pharmacy_name: e.target.value }))} className="h-12 pl-12 rounded-2xl bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200" placeholder="E.g. CVS Pharmacy" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pharmacy_phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="text-amber-500 absolute left-4 top-3.5" size={18} />
                                            <Input id="pharmacy_phone" value={formData.pharmacy_phone} onChange={(e) => setFormData(p => ({ ...p, pharmacy_phone: e.target.value }))} className="h-12 pl-12 rounded-2xl bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200" placeholder="(555) 123-4567" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="pharmacy_address" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Pharmacy Address</Label>
                                        <div className="relative">
                                            <MapPin className="text-amber-500 absolute left-4 top-3.5" size={18} />
                                            <Input id="pharmacy_address" value={formData.pharmacy_address} onChange={(e) => setFormData(p => ({ ...p, pharmacy_address: e.target.value }))} className="h-12 pl-12 rounded-2xl bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200" placeholder="123 Main St..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pharmacy_fax" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Fax Number</Label>
                                        <div className="relative">
                                            <FileText className="text-amber-500 absolute left-4 top-3.5" size={18} />
                                            <Input id="pharmacy_fax" value={formData.pharmacy_fax} onChange={(e) => setFormData(p => ({ ...p, pharmacy_fax: e.target.value }))} className="h-12 pl-12 rounded-2xl bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200" placeholder="(555) 987-6543" />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>


                        </Tabs>
                    </div>

                    <DialogFooter className="p-8 pt-4 border-t border-slate-100 bg-slate-50/30 flex flex-row gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-100/80 transition-all">Cancel</Button>
                        <Button type="submit" disabled={isSaving} className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <div className="flex items-center gap-2"><Save size={20} /><span>Update Patient</span></div>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
