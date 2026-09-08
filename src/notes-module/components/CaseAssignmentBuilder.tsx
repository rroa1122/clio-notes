import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Check, Plus, Trash2, Copy, Sparkles, Clock, User, Building2,
    CheckCircle2, ListTodo, Activity, MapPin, Calendar, ChevronDown, Layers,
    Shield, Stethoscope, AlertCircle, Phone, Home
} from 'lucide-react';
import { toast } from 'sonner';
import {
    CaseAssignmentFormData,
    DEFAULT_CASE_ASSIGNMENT_FORM,
    NEXT_STEPS_OPTIONS,
    PRESET_OPTIONS,
    generateCaseAssignmentNarrative,
    generateCaseAssignmentOutcome,
    generateCaseAssignmentNextSteps
} from '../lib/caseAssignmentGenerator';
import { TCM_DOMAINS } from '../lib/constants';
import { searchDiagnoses, type DiagnosisCode } from '../lib/diagnosisCatalog';
import type { ClioNote } from '../types';

interface CaseAssignmentBuilderProps {
    patient?: any;
    clinicSettings?: any;
    userProfile?: any;
    currentUser?: any;
    initialDate?: string;
    initialTimeIn?: string;
    onGenerateNote: (note: ClioNote) => void;
    onAddToJointNote?: (service: {
        id: string;
        subTemplate: string;
        templateId: string;
        duration: number;
        serviceDate: string;
        timeIn: string;
        timeOut: string;
        units: string;
        manualText: string;
        customTemplateText?: string;
        structuredNote?: any;
    }) => void;
    onClose?: () => void;
}

export const CaseAssignmentBuilder: React.FC<CaseAssignmentBuilderProps> = ({
    patient,
    clinicSettings,
    userProfile,
    currentUser,
    initialDate,
    initialTimeIn,
    onGenerateNote,
    onAddToJointNote,
    onClose
}) => {
    // 1. Form State
    const [formData, setFormData] = useState<CaseAssignmentFormData>(() => {
        const pName = patient?.full_name || '';
        const pFirst = patient?.first_name || (pName.split(' ')[0] || '');
        const pPhone = patient?.phone || patient?.mobile || '';
        const pGender = (patient?.sex_at_birth || patient?.gender || 'female').toLowerCase();
        const pAddress = patient?.address || '';

        // Extract any existing diagnoses
        const existingDiags: string[] = [];
        if (Array.isArray(patient?.diagnoses)) {
            patient.diagnoses.forEach((d: any) => {
                if (typeof d === 'string' && d.trim()) existingDiags.push(d.trim());
                else if (d?.name) existingDiags.push(d.name);
            });
        }

        return {
            ...DEFAULT_CASE_ASSIGNMENT_FORM,
            client_full_name: pName || 'Jane Doe',
            client_first_name: pFirst || 'Jane',
            client_phone: pPhone || '(305) 555-0199',
            client_gender: pGender.startsWith('m') ? 'male' : 'female',
            address: pAddress || '123 Main St, Apt 4B, Miami, FL 33101',
            agency_name: clinicSettings?.clinicName || 'Advanced Recovery & Counseling, LLC',
            psychiatric_diagnoses: existingDiags.length > 0 ? existingDiags : ['Major Depressive Disorder'],
            blocksEnabled: { ...DEFAULT_CASE_ASSIGNMENT_FORM.blocksEnabled }
        };
    });

    // 2. Metadata State
    const [dosDate, setDosDate] = useState<string>(() => {
        if (initialDate) return initialDate;
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [timeIn, setTimeIn] = useState<string>(initialTimeIn || '10:00 AM');
    const [durationMin, setDurationMin] = useState<number>(30); // Default 30 min
    const [pos] = useState<string>('11 - Office'); // Fixed default for Case Assignment
    const [cptCode] = useState<string>('T1017');

    // Auto-calculate units: 1 unit = 15 min (30 min -> 2 units)
    const units = useMemo(() => {
        return Math.floor(durationMin / 15) + (durationMin % 15 >= 8 ? 1 : 0);
    }, [durationMin]);

    // Auto-calculate Time Out
    const timeOut = useMemo(() => {
        if (!timeIn) return '';
        const match = timeIn.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return '';
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = (match[3] || 'AM').toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const totalMinutes = (hours * 60 + minutes + durationMin) % (24 * 60);
        let endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endMeridiem = endHours >= 12 ? 'PM' : 'AM';
        endHours = endHours % 12 || 12;
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} ${endMeridiem}`;
    }, [timeIn, durationMin]);

    // Staff
    const [caseManagerName, setCaseManagerName] = useState<string>(() => {
        if (userProfile?.first_name && userProfile?.last_name) {
            return `${userProfile.first_name} ${userProfile.last_name}`;
        }
        return currentUser?.name || currentUser?.email || 'Case Manager';
    });
    const [caseManagerLic, setCaseManagerLic] = useState<string>(userProfile?.license_number || 'TCM-1092');
    const [supervisorName, setSupervisorName] = useState<string>(clinicSettings?.supervisorName || 'Dr. Smith, LCSW');
    const [supervisorLic, setSupervisorLic] = useState<string>(clinicSettings?.supervisorLicense || 'SW-44821');

    // 3. Domains Selection (#1 Mental Health checked by default)
    const [domainsSelected, setDomainsSelected] = useState<Record<string, boolean>>({
        '1_mental_health_substance_abuse': true,
        '2_physical_health_medical_dental': false,
        '3_vocational_employment_job_training': false,
        '4_school_education': false,
        '5_recreational_social_support': false,
        '6_activities_of_daily_living': false,
        '7_housing_shelter': false,
        '8_economic_financial': false,
        '9_basic_needs': false,
        '10_transportation': false,
        '11_legal_immigration': false,
        '12_other': false
    });

    // 4. Outcome & Next Steps State
    const [outcomeText, setOutcomeText] = useState<string>(() => generateCaseAssignmentOutcome(formData));
    const [selectedNextStepId, setSelectedNextStepId] = useState<string>(NEXT_STEPS_OPTIONS[0].id);
    const [nextStepsText, setNextStepsText] = useState<string>(() => generateCaseAssignmentNextSteps(formData));

    // Update Outcome & Next Steps when client name changes if unmodified
    useEffect(() => {
        setOutcomeText(generateCaseAssignmentOutcome(formData));
        const matched = NEXT_STEPS_OPTIONS.find(o => o.id === selectedNextStepId);
        if (matched) {
            setNextStepsText(generateCaseAssignmentNextSteps(formData, matched.template));
        }
    }, [formData.client_first_name, formData.client_full_name]);

    // 5. Diagnoses State (multi-diagnoses, with ICD-10 search and Type Rule-Out)
    const [diagnoses, setDiagnoses] = useState<Array<{ icd10: string; name: string; type: string }>>([
        { icd10: 'F32.9', name: 'Major depressive disorder, single episode, unspecified', type: 'Rule-Out' }
    ]);
    const [dxSearchQuery, setDxSearchQuery] = useState<string>('');
    const [showDxDropdown, setShowDxDropdown] = useState<boolean>(false);

    const filteredCatalog = useMemo(() => {
        if (!dxSearchQuery.trim()) return [];
        return searchDiagnoses(dxSearchQuery).slice(0, 6);
    }, [dxSearchQuery]);

    // 6. Live Generated Narrative
    const liveNarrative = useMemo(() => {
        return generateCaseAssignmentNarrative(formData);
    }, [formData]);

    // Helper to toggle block
    const toggleBlock = (blockNum: keyof typeof formData.blocksEnabled) => {
        setFormData(prev => ({
            ...prev,
            blocksEnabled: {
                ...prev.blocksEnabled,
                [blockNum]: !prev.blocksEnabled[blockNum]
            }
        }));
    };

    // Helper to toggle array item
    const toggleArrayItem = (key: keyof Pick<CaseAssignmentFormData, 'psychiatric_diagnoses' | 'symptoms' | 'psychosocial_stressors' | 'medical_specialties' | 'identified_needs' | 'risk_factors'>, item: string) => {
        setFormData(prev => {
            const current = prev[key] || [];
            const exists = current.includes(item);
            const next = exists ? current.filter(x => x !== item) : [...current, item];
            return { ...prev, [key]: next };
        });
    };

    // Add Diagnosis
    const handleAddDiagnosis = (code: string, name: string) => {
        setDiagnoses(prev => [...prev, { icd10: code, name: name, type: 'Rule-Out' }]);
        setDxSearchQuery('');
        setShowDxDropdown(false);
    };

    const handleRemoveDiagnosis = (index: number) => {
        setDiagnoses(prev => prev.filter((_, i) => i !== index));
    };

    // Validation
    const validate = (): boolean => {
        if (!dosDate) {
            toast.error('Date of Service (DOS) is required.');
            return false;
        }
        if (!caseManagerName.trim()) {
            toast.error('Case Manager name is required.');
            return false;
        }
        if (!supervisorName.trim()) {
            toast.error('Supervisor name is required.');
            return false;
        }
        const hasDomain = Object.values(domainsSelected).some(Boolean);
        if (!hasDomain) {
            toast.error('Please select at least one Service Domain (#1 to #12).');
            return false;
        }
        if (diagnoses.length === 0 || !diagnoses[0].name.trim()) {
            toast.error('Please document at least one diagnosis.');
            return false;
        }
        if (!liveNarrative.trim()) {
            toast.error('Clinical narrative is empty. Please enable at least one block.');
            return false;
        }
        return true;
    };

    // Build ClioNote Object
    const buildClioNote = (): ClioNote => {
        const clientFirst = formData.client_first_name.trim();
        const clientFull = formData.client_full_name.trim();

        const fullNote: ClioNote = {
            id: `clio-ca-${Date.now()}`,
            template_id: 'tcm_case_assignment_note',
            patient_id: patient?.id,
            patient: {
                full_name: clientFull,
                first_name: clientFirst,
                dob: patient?.dob || '1980-01-01',
                sex_at_birth: formData.client_gender === 'male' ? 'Male' : 'Female',
                account_number: patient?.account_number || patient?.case_no || 'EMR-1090',
                case_no: patient?.case_no || 'CASE-2026-01',
                phone: formData.client_phone,
                mobile: formData.client_phone,
                address: formData.address
            },
            facility: {
                name: formData.agency_name,
                address: clinicSettings?.physicalAddress || '1200 Brickell Ave, Suite 800, Miami, FL 33131',
                phone: clinicSettings?.mainPhone || '(305) 500-1020',
                fax: clinicSettings?.faxNumber || '(305) 500-1021',
                email: clinicSettings?.clinicEmail || 'intake@advancedrecovery.com'
            },
            encounter: {
                dos_date: dosDate,
                pos: '11 - Office',
                location_name: '11 - Office',
                place_of_service_name: '11 - Office',
                service_location: '11 - Office',
                time_in: timeIn,
                time_out: timeOut,
                duration: durationMin.toString(),
                duration_minutes: durationMin.toString(),
                units: units.toString(),
                billing_units: units.toString(),
                cpt_code: cptCode,
                primary_service_provided: 'Case Assigned',
                sub_template: 'Case Assigned'
            },
            services: {
                service_focus_title: 'Case Assigned',
                domains_selected: domainsSelected
            },
            narrative: {
                summary_notes: liveNarrative,
                clinical_narrative: liveNarrative,
                outcome_of_services: outcomeText,
                next_steps: nextStepsText
            },
            diagnoses: diagnoses.map(d => ({
                icd10: d.icd10,
                name: d.name,
                type: d.type || 'Rule-Out'
            })),
            signatures: {
                cm_name: caseManagerName,
                cm_license: caseManagerLic,
                cm_signature_date: dosDate,
                sup_name: supervisorName,
                sup_license: supervisorLic,
                supervisor_signature_date: dosDate
            },
            meta: {
                template_id: 'tcm_case_assignment_note',
                subTemplate: 'Case Assigned',
                generated_at: new Date().toISOString()
            }
        };

        return fullNote;
    };

    // Actions
    const handleGenerate = () => {
        if (!validate()) return;
        const note = buildClioNote();
        toast.success('Case Assignment note generated successfully!');
        onGenerateNote(note);
    };

    const handleAddToJoint = () => {
        if (!validate()) return;
        if (!onAddToJointNote) {
            handleGenerate();
            return;
        }

        const note = buildClioNote();
        onAddToJointNote({
            id: `svc-ca-${Date.now()}`,
            subTemplate: 'Case Assigned',
            templateId: 'tcm_case_assignment_note',
            duration: durationMin * 60,
            serviceDate: dosDate,
            timeIn: timeIn,
            timeOut: timeOut,
            units: units.toString(),
            manualText: liveNarrative,
            structuredNote: note
        });
        toast.success('Case Assigned (30 min / 2 units / POS 11) added to Joint Encounter!');
        if (onClose) onClose();
    };

    return (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in duration-300">
            {/* Header / Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                        <FileText size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Case Assignment Template Builder
                            </h2>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
                                11 - Office
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Initial referral review, client intake telephone contact & initial home visit coordination.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    {onAddToJointNote && (
                        <button
                            type="button"
                            onClick={handleAddToJoint}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                            <Plus size={14} className="text-indigo-500" />
                            Add to Joint Note
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleGenerate}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-1.5"
                    >
                        <Sparkles size={14} />
                        Generate Progress Note
                    </button>
                </div>
            </div>

            {/* 1. Service Metadata Card */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock size={13} className="text-indigo-500" /> Service Metadata & Schedule
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                        CPT Code: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{cptCode}</strong> (Targeted Case Management)
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* DOS */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Service (DOS)</label>
                        <input
                            type="date"
                            value={dosDate}
                            onChange={(e) => setDosDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Time In */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Time In</label>
                        <input
                            type="text"
                            value={timeIn}
                            onChange={(e) => setTimeIn(e.target.value)}
                            placeholder="10:00 AM"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duration (min)</label>
                        <input
                            type="number"
                            min="15"
                            step="15"
                            value={durationMin}
                            onChange={(e) => setDurationMin(Math.max(15, parseInt(e.target.value, 10) || 15))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Time Out (autocalculated) */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Time Out (Auto)</label>
                        <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {timeOut || '10:30 AM'}
                        </div>
                    </div>

                    {/* Units (autocalculated) */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billing Units</label>
                        <div className="w-full bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 rounded-xl px-2.5 py-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                            <span>{units} units</span>
                            <span className="text-[9px] font-bold text-indigo-400">(15m = 1u)</span>
                        </div>
                    </div>

                    {/* POS */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Place of Service</label>
                        <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {pos}
                        </div>
                    </div>
                </div>

                {/* Case Manager & Supervisor Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <User size={15} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Case Manager</label>
                            <input
                                type="text"
                                value={caseManagerName}
                                onChange={(e) => setCaseManagerName(e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-slate-300 dark:border-slate-700 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                                placeholder="Case Manager Name"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Shield size={15} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Clinical Supervisor</label>
                            <input
                                type="text"
                                value={supervisorName}
                                onChange={(e) => setSupervisorName(e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-slate-300 dark:border-slate-700 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                                placeholder="Supervisor Name"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Information — Services (Domains) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <ListTodo size={14} className="text-indigo-500" /> 2. Information — Services (Domains)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        #1 Mental Health / Substance Abuse marked by default
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-slate-50/40 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    {TCM_DOMAINS.map((domain) => {
                        const key = domain.path.split('.').pop() || '';
                        const isChecked = Boolean(domainsSelected[key]);
                        return (
                            <label
                                key={domain.path}
                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                                    isChecked
                                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        setDomainsSelected(prev => ({
                                            ...prev,
                                            [key]: e.target.checked
                                        }));
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 size-3.5"
                                />
                                <span className="truncate">{domain.label}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* 3. Form Variables & 11 Narrative Blocks */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Activity size={14} className="text-indigo-500" /> 3. Summary (Notes) — Narrative Blocks & Variables
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                        Single Continuous Clinical Paragraph (Past Tense, Formal 3rd Person)
                    </span>
                </div>

                {/* Patient Information Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Client Full Name</label>
                        <input
                            type="text"
                            value={formData.client_full_name}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    client_full_name: val,
                                    client_first_name: val.split(' ')[0] || prev.client_first_name
                                }));
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Client First Name</label>
                        <input
                            type="text"
                            value={formData.client_first_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, client_first_name: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Client Telephone</label>
                        <input
                            type="text"
                            value={formData.client_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Agency Name</label>
                        <input
                            type="text"
                            value={formData.agency_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, agency_name: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>

                {/* Narrative Blocks Grid */}
                <div className="space-y-3">
                    {/* Bloque 1 */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[1]}
                                    onChange={() => toggleBlock(1)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 1 — Recepción y revisión de la referral</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                Opening Referral
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 pl-6 leading-relaxed">
                            "The Targeted Case Manager (TCM) received and reviewed a Case Manager's Referral for a newly assigned case for services. After reviewing the referral with the supervisor, the TCM signed the referral form and began collecting all necessary information required for the admission process. Following this review, the TCM accepted {formData.client_full_name || '[Client Name]'}'s case for Targeted Case Management services."
                        </p>
                    </div>

                    {/* Bloque 2 */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[2]}
                                    onChange={() => toggleBlock(2)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 2 — Contacto telefónico inicial</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Phone Introduction
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 pl-6 leading-relaxed">
                            "The TCM successfully contacted {formData.client_first_name || '[First Name]'} by phone at {formData.client_phone || '[Phone]'} and introduced herself as a Targeted Case Manager from {formData.agency_name}. The purpose of the call and the receipt of a referral for Targeted Case Management services were explained."
                        </p>
                    </div>

                    {/* Bloque 3 */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[3]}
                                    onChange={() => toggleBlock(3)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 3 — Verificación de duplicidad de servicios</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                Duplication Check
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 pl-6 leading-relaxed">
                            "The TCM verified whether {formData.client_first_name || '[First Name]'} was currently receiving Targeted Case Management services from another agency, which she denied."
                        </p>
                    </div>

                    {/* Bloque 4 — Síntomas y Diagnósticos */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[4]}
                                    onChange={() => toggleBlock(4)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 4 — Síntomas psiquiátricos reportados</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                Psychiatric Symptoms
                            </span>
                        </div>
                        <div className="pl-6 space-y-2">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Diagnósticos Psiquiátricos:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_OPTIONS.psychiatric_diagnoses.map(dx => (
                                        <button
                                            key={dx}
                                            type="button"
                                            onClick={() => toggleArrayItem('psychiatric_diagnoses', dx)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                                formData.psychiatric_diagnoses.includes(dx)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                            }`}
                                        >
                                            {dx}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Síntomas Reportados:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_OPTIONS.symptoms.map(sym => (
                                        <button
                                            key={sym}
                                            type="button"
                                            onClick={() => toggleArrayItem('symptoms', sym)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                                formData.symptoms.includes(sym)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                            }`}
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloque 5 — Estresores psicosociales */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[5]}
                                    onChange={() => toggleBlock(5)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 5 — Estresores psicosociales / red de apoyo</span>
                            </label>
                        </div>
                        <div className="pl-6 flex flex-wrap gap-1.5">
                            {PRESET_OPTIONS.psychosocial_stressors.map(st => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => toggleArrayItem('psychosocial_stressors', st)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                        formData.psychosocial_stressors.includes(st)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bloque 6 — Complejidad médica */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[6]}
                                    onChange={() => toggleBlock(6)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 6 — Complejidad médica y coordinación de cuidados</span>
                            </label>
                        </div>
                        <div className="pl-6 flex flex-wrap gap-1.5">
                            {PRESET_OPTIONS.medical_specialties.map(spec => (
                                <button
                                    key={spec}
                                    type="button"
                                    onClick={() => toggleArrayItem('medical_specialties', spec)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                        formData.medical_specialties.includes(spec)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bloque 7 — Adherencia a medicamentos */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={formData.blocksEnabled[7]}
                                onChange={() => toggleBlock(7)}
                                className="rounded text-indigo-600 size-4"
                            />
                            <span>Bloque 7 — Adherencia a medicamentos</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 pl-6 leading-relaxed">
                            "Concerns regarding medication adherence were identified given the complexity of her extensive medication regimen and the recent need for a dosage adjustment."
                        </p>
                    </div>

                    {/* Bloque 8 — Necesidades identificadas */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[8]}
                                    onChange={() => toggleBlock(8)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 8 — Necesidades identificadas</span>
                            </label>
                        </div>
                        <div className="pl-6 flex flex-wrap gap-1.5">
                            {PRESET_OPTIONS.identified_needs.map(nd => (
                                <button
                                    key={nd}
                                    type="button"
                                    onClick={() => toggleArrayItem('identified_needs', nd)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                        formData.identified_needs.includes(nd)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {nd}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bloque 9 — Situación de vivienda */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[9]}
                                    onChange={() => toggleBlock(9)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 9 — Situación de vivienda</span>
                            </label>
                        </div>
                        <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Living Situation</label>
                                <input
                                    type="text"
                                    value={formData.living_situation}
                                    onChange={(e) => setFormData(prev => ({ ...prev, living_situation: e.target.value }))}
                                    placeholder="alone in a rented apartment"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Client Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="123 Main St, Apt 4B, Miami, FL 33101"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bloque 10 — Justificación de necesidad médica */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={formData.blocksEnabled[10]}
                                    onChange={() => toggleBlock(10)}
                                    className="rounded text-indigo-600 size-4"
                                />
                                <span>Bloque 10 — Justificación de necesidad médica (clave para facturación)</span>
                            </label>
                        </div>
                        <div className="pl-6 flex flex-wrap gap-1.5">
                            {PRESET_OPTIONS.risk_factors.map(rf => (
                                <button
                                    key={rf}
                                    type="button"
                                    onClick={() => toggleArrayItem('risk_factors', rf)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                        formData.risk_factors.includes(rf)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {rf}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bloque 11 — Transición a la visita domiciliaria */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-white dark:bg-slate-900">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={formData.blocksEnabled[11]}
                                onChange={() => toggleBlock(11)}
                                className="rounded text-indigo-600 size-4"
                            />
                            <span>Bloque 11 — Transición a la visita domiciliaria</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 pl-6 leading-relaxed">
                            "In response, the TCM requested her address to coordinate an in-person visit. Later that day, the TCM conducted a face-to-face visit at {formData.client_first_name || '[First Name]'}'s residence to assess her needs, strengths, and barriers and to initiate the admission and evaluation process. {formData.client_first_name || '[First Name]'} was cooperative, communicative, and receptive throughout the visit."
                        </p>
                    </div>
                </div>

                {/* Live Preview Box */}
                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" /> Live Clinical Narrative Preview
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(liveNarrative);
                                toast.success('Narrative copied to clipboard');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 flex items-center gap-1"
                        >
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                        {liveNarrative || <span className="italic text-slate-400">No narrative blocks active.</span>}
                    </p>
                </div>
            </div>

            {/* 4. Outcome of Service(s) y Next Step(s) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Outcome */}
                <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Outcome of Service(s)
                    </label>
                    <textarea
                        rows={3}
                        value={outcomeText}
                        onChange={(e) => setOutcomeText(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                </div>

                {/* Next Steps */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Next Step(s)
                        </label>
                        {/* Dropdown for alternatives */}
                        <div className="relative">
                            <select
                                value={selectedNextStepId}
                                onChange={(e) => {
                                    const nextId = e.target.value;
                                    setSelectedNextStepId(nextId);
                                    const match = NEXT_STEPS_OPTIONS.find(o => o.id === nextId);
                                    if (match) {
                                        setNextStepsText(generateCaseAssignmentNextSteps(formData, match.template));
                                    }
                                }}
                                className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold px-2 py-1 outline-none cursor-pointer"
                            >
                                {NEXT_STEPS_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <textarea
                        rows={3}
                        value={nextStepsText}
                        onChange={(e) => setNextStepsText(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* 5. Section "Diagnoses" */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Stethoscope size={14} className="text-indigo-500" /> 5. Diagnoses (ICD-10 Autocomplete & Type)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                        Default Type: Rule-Out
                    </span>
                </div>

                {/* Autocomplete Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={dxSearchQuery}
                        onChange={(e) => {
                            setDxSearchQuery(e.target.value);
                            setShowDxDropdown(true);
                        }}
                        onFocus={() => setShowDxDropdown(true)}
                        placeholder="Type diagnosis name or ICD-10 code (e.g. Major Depressive, F32.9, Anxiety...)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />

                    {showDxDropdown && filteredCatalog.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {filteredCatalog.map(item => (
                                <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => handleAddDiagnosis(item.code, item.description)}
                                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                                >
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.description}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black text-[10px]">
                                        {item.code}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* List of active diagnoses */}
                <div className="space-y-1.5">
                    {diagnoses.map((dx, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60"
                        >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-mono font-black text-[11px] border border-slate-200 dark:border-slate-700 shrink-0">
                                    {dx.icd10 || 'CODE'}
                                </span>
                                <input
                                    type="text"
                                    value={dx.name}
                                    onChange={(e) => {
                                        const next = [...diagnoses];
                                        next[idx] = { ...next[idx], name: e.target.value };
                                        setDiagnoses(next);
                                    }}
                                    className="flex-1 bg-transparent border-0 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                                />
                                <select
                                    value={dx.type || 'Rule-Out'}
                                    onChange={(e) => {
                                        const next = [...diagnoses];
                                        next[idx] = { ...next[idx], type: e.target.value };
                                        setDiagnoses(next);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded px-2 py-1 outline-none"
                                >
                                    <option value="Rule-Out">Rule-Out</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Primary">Primary</option>
                                    <option value="Secondary">Secondary</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRemoveDiagnosis(idx)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors ml-2"
                                title="Remove diagnosis"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. Signature Block Preview */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-start gap-2 bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <Shield size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">
                        By signing below, I certify that I provided the above services following all applicable policies and procedures.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Case Manager</span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{caseManagerName} (LIC: {caseManagerLic})</div>
                        <div className="text-[10px] text-slate-400">Date: {dosDate}</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Supervisor</span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{supervisorName} (LIC: {supervisorLic})</div>
                        <div className="text-[10px] text-slate-400">Date: {dosDate}</div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                )}
                {onAddToJointNote && (
                    <button
                        type="button"
                        onClick={handleAddToJoint}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                        <Plus size={15} className="text-indigo-500" />
                        Add to Joint Note (Same Day Visit)
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleGenerate}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                >
                    <Sparkles size={15} />
                    Generate Progress Note
                </button>
            </div>
        </div>
    );
};
