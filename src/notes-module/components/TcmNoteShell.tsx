import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ClioNote, Template } from '../types';
import { storage } from '../lib/storage';
import { DEFAULT_TEMPLATES, TCM_DOMAINS } from '../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { 
    Save, CheckCircle2, CheckCircle, X, PenTool, Plus, Trash2, Copy, Check, AlertCircle, Lock,
    Calendar, Printer, Edit3, FileText, User, Activity, ClipboardList, MapPin, Clock, 
    Stethoscope, Briefcase, Info, ListTodo, History, Cpu, RefreshCw, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { TimeSpinner } from '../../components/ui/time-spinner';
import { Button } from '../../components/ui/button';
import SignatureModal from './SignatureModal';
import { useProviderTimeConflicts } from '../hooks/useProviderTimeConflicts';
import { TimeConflictBanner } from './TimeConflictBanner';
import { areOverlapping, extractNormalizedTimeRange } from '../lib/conflictUtils';
import { settingsService, type ClinicSettings } from '../../services/settingsService';
import { SyncErrorModal } from './SyncErrorModal';
import { formatSyncError } from '../../lib/services/syncErrorFormatter';

const getValueByPath = (obj: any, path: string) => {
    if (!path) return undefined;
    const directVal = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (directVal !== undefined && directVal !== null && directVal !== '') return directVal;

    if (path === 'note.summary_notes' || path === 'narrative.summary_notes' || path === 'summary_notes') {
        return obj.narrative?.summary_notes || obj.narrative?.clinical_narrative || obj.narrative?.summary || obj.narrative?.narrative || obj.summary_notes || obj.summary || obj.clinical_narrative || obj.raw_model_text;
    }
    if (path === 'note.outcome_of_services' || path === 'narrative.outcome_of_services' || path === 'outcome_of_services') {
        return obj.narrative?.outcome_of_services || obj.outcome_of_services || obj.outcome;
    }
    if (path === 'note.next_steps' || path === 'narrative.next_steps' || path === 'next_steps') {
        return obj.narrative?.next_steps || obj.next_steps || obj.plan;
    }
    return directVal;
};

const formatValueForPrint = (value: any): string | null => {
    if (value == null) return null;
    if (typeof value === "string") {
        const v = value.trim();
        if (!v || v === "not_reported") return null;
        return v;
    }
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "yes" : "no";

    if (Array.isArray(value)) {
        if (!value.length) return null;
        if (value.every(x => typeof x === "string" || typeof x === "number")) {
            return value.map(String).join("\n");
        }
    }
    return null;
};

const highlightWarnings = (text: any): React.ReactNode => {
    if (text == null) return '';
    const textStr = String(text);
    const warningRegex = /(not reported during the visit|not reported|not documented|was not reported|were not reported|no reportado|no documentado|not available|not specified)/gi;
    
    const parts = textStr.split(warningRegex);
    if (parts.length === 1) return textStr;
    
    return (
        <>
            {parts.map((part, idx) => {
                if (part.match(warningRegex)) {
                    return (
                        <span 
                            key={idx} 
                            className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/30 px-1.5 py-0.5 rounded font-semibold italic text-[11px] inline-flex items-center gap-0.5 mx-0.5 leading-none"
                        >
                            ⚠️ {part}
                        </span>
                    );
                }
                return part;
            })}
        </>
    );
};

const formatDosDate = (rawDate: string | null | undefined): string => {
    if (!rawDate) return "N/A";
    try {
        let dateObj;
        if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = rawDate.split('-');
            dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
        } else {
            dateObj = new Date(rawDate);
        }
        if (isNaN(dateObj.getTime())) return rawDate;
        return dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return rawDate;
    }
};

const isValidLayout = (layout: any): layout is any[] => {
    if (!Array.isArray(layout)) return false;
    return layout.every(section =>
        typeof section === 'object' &&
        section !== null &&
        typeof section.title === 'string' &&
        Array.isArray(section.fields) &&
        section.fields.every((field: any) =>
            typeof field === 'object' &&
            field !== null &&
            typeof field.label === 'string' &&
            typeof field.path === 'string'
        )
    );
};

const setValueByPath = (obj: any, path: string, value: any) => {
    if (!path) return obj;
    const parts = path.split('.');
    const next = { ...obj };
    let current = next;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        const isNextPartArray = !isNaN(Number(nextPart));
        
        const currentVal = current[part];
        
        if (isNextPartArray) {
            current[part] = Array.isArray(currentVal) ? [...currentVal] : [];
        } else {
            current[part] = (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal)) 
                ? { ...currentVal } 
                : {};
        }
        current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    return next;
};

const normalizeText = (text: any) => {
    if (typeof text !== 'string') return '';
    return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
};

const getMiamiTodayString = () => {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).format(new Date());
};

const PrintLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-medium uppercase tracking-wider text-[#1a1a1a] mb-1 print-border-b pb-0.5 mt-6 first:mt-0">
        {children}
    </div>
);

const SectionHeader = ({ title, onCopy, isCopied, icon: Icon }: { title: string, onCopy?: () => void, isCopied?: boolean, icon?: any }) => (
    <div className="flex items-center justify-between mb-1 mt-4 first:mt-1 group/section relative">
        <div className="label-small !mb-0">
            {Icon && <Icon size={12} className="text-indigo-400" />}
            {title}
        </div>
        {onCopy && (
            <button
                onClick={onCopy}
                className={`no-print ${isCopied ? 'opacity-100 bg-green-50 text-green-600 border-green-100' : 'opacity-0 group-hover/section:opacity-100 bg-blue-50 text-blue-600 border-blue-100'} p-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm border`}
                title={`Copy ${title}`}
            >
                {isCopied ? <Check size={11} /> : <Copy size={11} />}
                <span className="text-[9px] font-bold uppercase tracking-tight">{isCopied ? 'Copied' : 'Copy Section'}</span>
            </button>
        )}
    </div>
);

const DomainItem = ({ domain, mergedNote, isEditMode, handleUpdateField, parentTemplateId }: any) => {
    const isOtcNote = (
        (mergedNote.subTemplate || "").toLowerCase().includes("otc") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("otc") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("otc")
    );

    const templateId = parentTemplateId || mergedNote.template_id || mergedNote.templateId || mergedNote.meta?.template_id;
    const isHurricaneNote = (
        templateId === 'tcm_hurricane_addendum_note' ||
        templateId === 'tcm_hurricane_update_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("hurricane") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("hurricane") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("hurricane") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("hurricane")
    );

    const isStsNote = (
        templateId === 'tcm_sts_complete_note' ||
        templateId === 'tcm_sts_collect_note' ||
        templateId === 'tcm_sts_submit_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("sts") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("sts") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("sts") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("sts")
    );

    const isDppNote = (
        templateId === 'tcm_dpp_obtain_note' ||
        templateId === 'tcm_dpp_complete_note' ||
        templateId === 'tcm_dpp_submit_pcp_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("dpp") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("handicap") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("dpp") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("dpp") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("dpp") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("handicap")
    );

    const isMhvNote = (
        templateId === 'tcm_mhv_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("mhv") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("monthly home visit") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("mhv") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("monthly home visit") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("mhv") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("mhv")
    );

    const isLtcNote = (
        templateId?.startsWith('tcm_ltc_') ||
        (mergedNote.subTemplate || "").toLowerCase().includes("ltc") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("ltc") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("ltc") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("ltc")
    );

    const isDonationObtainNote = (
        templateId === 'tcm_donation_obtain_note' ||
        templateId === 'tcm_cleaning_donation_gather_note' ||
        templateId === 'tcm_cleaning_donation_obtain_note' ||
        templateId === 'tcm_clothing_donation_gather_note' ||
        templateId === 'tcm_clothing_donation_obtain_note' ||
        templateId === 'tcm_food_donation_gather_note' ||
        templateId === 'tcm_food_donation_obtain_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("obtain supply") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("cleaning donation") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("clothing donation") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("food donation") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("obtain supply") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("cleaning donation") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("clothing donation") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("food donation") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("obtain supply") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("cleaning donation") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("clothing donation") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("food donation") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("upd food donat") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("obt food donat") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("upd cloth donat") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("obt cloth donat") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("cleaning donation") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("clothing donation") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("food donation")
    );

    const isVaccinationAssistanceNote = (
        templateId === 'tcm_vaccination_assistance_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("vaccination") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("vaccination") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("vaccination") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("update hepatitis") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("coordinate hepatitis") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("assisted hepatitis")
    );

    const isApptCoordNote = (
        templateId === 'tcm_provider_appt_coord_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("appt coord") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("appt coord") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("appt coord") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("appointment coordination")
    );

    const isUscisAssistanceNote = (
        templateId === 'tcm_uscis_assistance_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("uscis") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("uscis") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("uscis") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("uscis")
    );

    const isHousingAssistanceNote = (
        templateId === 'tcm_housing_assistance_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("housing") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("housing") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("housing") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("housing")
    );

    const isSnapRecertificationNote = (
        templateId === 'tcm_snap_recertification_note' ||
        (mergedNote.subTemplate || "").toLowerCase().includes("food stamp") ||
        (mergedNote.subTemplate || "").toLowerCase().includes("snap") ||
        (mergedNote._frontend_service_title || "").toLowerCase().includes("snap") ||
        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("snap") ||
        (mergedNote.services?.service_focus_title || "").toLowerCase().includes("snap")
    );

    // Exactly one domain checked: Hurricane -> #12, OTC -> #2, STS -> #10, otherwise -> #1
    let isChecked = false;
    if (isHurricaneNote) {
        isChecked = domain.path === 'services.domains_selected.12_other';
    } else if (isOtcNote || isVaccinationAssistanceNote) {
        isChecked = domain.path === 'services.domains_selected.2_physical_health_medical_dental';
    } else if (isStsNote || isDppNote) {
        isChecked = domain.path === 'services.domains_selected.10_transportation';
    } else if (isMhvNote) {
        const domainKey = domain.path.split('.').pop() || '';
        isChecked = domainKey === '1_mental_health_substance_abuse' || Boolean(mergedNote.services?.domains_selected?.[domainKey]);
    } else if (isLtcNote) {
        const domainKey = domain.path.split('.').pop() || '';
        isChecked = domainKey === '1_mental_health_substance_abuse' || domainKey === '6_activities_of_daily_living' || Boolean(mergedNote.services?.domains_selected?.[domainKey]);
    } else if (isDonationObtainNote) {
        isChecked = domain.path === 'services.domains_selected.9_basic_needs';
    } else if (isApptCoordNote) {
        const titleLower = (mergedNote.services?.service_focus_title || "").toLowerCase();
        const narrLower = (mergedNote.narrative?.summary_notes || "").toLowerCase();
        const wantsPsych = titleLower.includes("psych") || titleLower.includes("mental");
        const wantsPcp = titleLower.includes("pcp") || titleLower.includes("primary care") || titleLower.includes("medical") || titleLower.includes("specialist");
        const wantsTrans = titleLower.includes("transport") || titleLower.includes("nemt") || narrLower.includes("transportation") || narrLower.includes("nemt") || narrLower.includes("saferide");
        
        if (domain.path === 'services.domains_selected.1_mental_health_substance_abuse') {
            isChecked = wantsPsych || (!wantsPsych && !wantsPcp && !wantsTrans);
        } else if (domain.path === 'services.domains_selected.2_physical_health_medical_dental') {
            isChecked = wantsPcp;
        } else if (domain.path === 'services.domains_selected.10_transportation') {
            isChecked = wantsTrans;
        } else {
            isChecked = false;
        }
    } else if (isUscisAssistanceNote) {
        const narrLower = (mergedNote.narrative?.summary_notes || "").toLowerCase();
        const wantsAdl = narrLower.includes("form") || narrLower.includes("paperwork") || narrLower.includes("document") || narrLower.includes("organize") || narrLower.includes("residency");
        const wantsPsych = narrLower.includes("anxiety") || narrLower.includes("anxious") || narrLower.includes("emotional support") || narrLower.includes("reassurance");
        
        if (domain.path === 'services.domains_selected.11_legal_immigration') {
            isChecked = true;
        } else if (domain.path === 'services.domains_selected.6_activities_of_daily_living') {
            isChecked = wantsAdl;
        } else if (domain.path === 'services.domains_selected.1_mental_health_substance_abuse') {
            isChecked = wantsPsych;
        } else {
            isChecked = false;
        }
    } else if (isHousingAssistanceNote) {
        isChecked = domain.path === 'services.domains_selected.7_housing_shelter';
    } else if (isSnapRecertificationNote) {
        isChecked = domain.path === 'services.domains_selected.8_economic_financial';
    } else {
        isChecked = domain.path === 'services.domains_selected.1_mental_health_substance_abuse';
    }

    return (
        <div className="flex flex-col gap-1 w-full">
            <div
                className={`flex items-center gap-2.5 py-1.5 px-2.5 transition-all group border border-transparent ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-100/30 dark:border-indigo-900/30 rounded-lg' : 'rounded-lg'} cursor-default`}
            >
                <div className={`size-4 flex items-center justify-center shrink-0 rounded-md border-2 transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600 scale-105 shadow-sm shadow-indigo-100' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    {isChecked && <Check size={10} className="text-white stroke-[4]" />}
                </div>
                <span className={`text-[10px] font-bold select-none transition-colors ${isChecked ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {domain.label}
                </span>
            </div>
            {isChecked && domain.path === 'services.domains_selected.2_physical_health_medical_dental' && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border-2 border-indigo-600 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[4]" />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-900 dark:text-indigo-250">
                        Over the counter (OTC) medications.
                    </span>
                </div>
            )}
            {isChecked && domain.path === 'services.domains_selected.10_transportation' && isStsNote && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border-2 border-indigo-600 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[4]" />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-900 dark:text-indigo-250">
                        Special Transportation Services (STS).
                    </span>
                </div>
            )}
            {isChecked && domain.path === 'services.domains_selected.10_transportation' && isDppNote && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border-2 border-indigo-600 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[4]" />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-900 dark:text-indigo-250">
                        Disabled Parking Permit (DPP).
                    </span>
                </div>
            )}
        </div>
    );
};

const convertTo24h = (time12h: string): string => {
    if (!time12h || typeof time12h !== 'string') return "";
    const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return time12h;
    let [_, hours, minutes, period] = match;
    let h = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
};

const convertTo12h = (time24h: string): string => {
    if (!time24h) return "";
    const [hours, minutes] = time24h.split(':');
    let h = parseInt(hours, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${period}`;
};

const CustomPrintHeader = ({ note, clinicSettings, isEditMode, onUpdateField }: { note: ClioNote, clinicSettings?: ClinicSettings | null, isEditMode?: boolean, onUpdateField?: (path: string, val: any) => void }) => {
    const rawDate = note.encounter?.dos_date || (note as any).meta?.visitDate;
    const dateInputRef = useRef<HTMLInputElement>(null);

    const dos = (() => {
        if (!rawDate) return "N/A";
        try {
            let dateObj;
            if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Parse local explicitly to avoid UTC shift
                const [y, m, d] = rawDate.split('-');
                dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
            } else {
                dateObj = new Date(rawDate);
            }
            if (isNaN(dateObj.getTime())) return rawDate;
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return rawDate;
        }
    })();

    // Split clinic name for logo style if it contains "Mental Health" or similar
    const clinicName = clinicSettings?.clinicName || "";
    const nameParts = clinicName.split(' ');
    const firstPart = nameParts[0];
    const restParts = nameParts.slice(1).join(' ');

    return (
        <div className="flex justify-between items-start w-full mb-10 pb-8 border-b border-slate-100/50">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 no-print-flex">
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                        Progress Note
                    </div>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            {isEditMode ? "Encounter Date" : dos}
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-col mt-1">
                    <h1 className="text-[52px] font-black text-slate-900 tracking-tighter leading-[0.9] uppercase font-sans">
                        {note.patient?.full_name || "New Patient"}
                    </h1>
                    {isEditMode && (
                        <div className="mt-4 flex items-center gap-2 group/date-header no-print">
                            <Calendar size={14} className="text-indigo-400" />
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={rawDate || ''}
                                onChange={(e) => onUpdateField?.('encounter.dos_date', e.target.value)}
                                className="bg-slate-50 border border-slate-100 px-3 py-1 text-[11px] font-black text-indigo-900 uppercase rounded-lg hover:bg-white hover:border-indigo-200 transition-all outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end gap-4">
                <div className="flex flex-col items-end text-right">
                    <div className="label-small !text-indigo-400 !mb-1 justify-end">Record Status</div>
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Authenticated</span>
                        <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
                            <Check size={14} className="text-white stroke-[4]" />
                        </div>
                    </div>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100 mr-4 hidden sm:block" />
                
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none mb-1">Clinician Note</div>
                    <div className="text-[11px] font-bold text-slate-500 italic">Electronic Signature Pending</div>
                </div>
            </div>
        </div>
    );
};

const CustomPrintFooter = ({ note }: { note: ClioNote }) => (
    <tfoot className="print-only-footer hidden print:table-footer-group w-full">
        <tr>
            <td className="px-[0.3in] pb-[0.04in] pt-4">
                <div className="print-only-footer-content flex justify-between items-center py-2 border-t-[0.5px] border-[#a3a3a3]">
                    <div className="text-[9px] text-[#404040]">
                        {note.patient?.full_name} ({(note as any).patient?.account_number || (note as any).patient?.emr || "—"})
                    </div>
                    <div className="text-[9px] text-[#404040]">
                        Page <span className="page-number text-[9px]"></span>
                    </div>
                </div>
            </td>
        </tr>
    </tfoot>
);

const GhostInput = ({
    value,
    onChange,
    isEditMode,
    placeholder = "—",
    className = "",
    type = "text",
    onBlur
}: {
    value: any;
    onChange: (val: any) => void;
    isEditMode: boolean;
    placeholder?: string;
    className?: string;
    type?: string;
    onBlur?: () => void;
}) => {
    return (
        <div className={`relative flex items-center w-full ${isEditMode ? 'group/ghost' : ''}`}>
            {isEditMode ? (
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`w-full transition-all duration-300 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 text-[13px] font-bold text-indigo-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none shadow-sm ${className}`}
                />
            ) : (
                <span className={`inline-block break-words ${className}`}>
                    {highlightWarnings(value)}
                </span>
            )}
        </div>
    );
};

const GhostTextarea = ({
    value,
    onChange,
    isEditMode,
    placeholder = "No content documented.",
    className = ""
}: {
    value: any;
    onChange: (val: any) => void;
    isEditMode: boolean;
    placeholder?: string;
    className?: string;
}) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const target = textareaRef.current;
        if (target) {
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
        }
    };

    React.useLayoutEffect(() => {
        if (isEditMode) {
            const timer = setTimeout(adjustHeight, 0);
            return () => clearTimeout(timer);
        }
    }, [isEditMode, value]);

    return (
        <div className={`relative w-full ${isEditMode ? 'group/ghost' : ''}`}>
            {isEditMode ? (
                <textarea
                    ref={textareaRef}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        adjustHeight();
                        e.target.select();
                    }}
                    placeholder={placeholder}
                    className={`w-full transition-all duration-300 resize-none overflow-hidden bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-3 text-[13px] font-medium text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none shadow-sm leading-relaxed ${className}`}
                    rows={1}
                    style={{ height: 'auto', minHeight: '80px' }}
                    onInput={adjustHeight}
                />
            ) : (
                <div className={`w-full text-[13px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap ${className}`}>
                    {value ? highlightWarnings(value) : <span className="text-slate-300 italic">{placeholder}</span>}
                </div>
            )}
        </div>
    );
};

const PrintValue = ({
    value,
    field,
    isEditMode,
    onChange,
    mergedNote
}: {
    value: any;
    field?: any;
    isEditMode: boolean;
    onChange: (val: any) => void;
    mergedNote: ClioNote;
}) => {
    const displayedValue = formatValueForPrint(value);
    const isComplex = Array.isArray(value) && value.length > 0 && typeof value[0] === 'object';
    const isArrayOfStrings = Array.isArray(value) && (value.length === 0 || typeof value[0] === 'string');
    const isEditable = !isComplex && field?.path && field.path !== '__static';
    const textContent = displayedValue || field?.defaultText;

    const [copyingField, setCopyingField] = useState<string | null>(null);

    const handleCopy = async (text: string, fieldId: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopyingField(fieldId);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopyingField(null), 2000);
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    if (isEditMode && isEditable) {
        const inputClasses = "w-full text-[13px] px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white dark:bg-slate-900/50 font-normal leading-relaxed transition-all placeholder:text-slate-300 shadow-sm";

        if (field?.type === 'date') {
            return (
                <DatePicker 
                    date={value || ''} 
                    setDate={onChange} 
                    className="w-full text-[13px] h-[38px] border-slate-300 rounded-md shadow-sm"
                />
            );
        }
        if (field?.type === 'number') {
            return <input type="number" value={value || ''} onFocus={(e) => e.target.select()} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
        }
        return (
            <textarea
                value={isArrayOfStrings ? (value as string[]).join('\n') : (displayedValue || field?.defaultText || '')}
                onChange={(e) => {
                    const val = e.target.value;
                    if (isArrayOfStrings) {
                        onChange(val.split('\n').filter((s: string) => s.trim() !== ''));
                    } else {
                        onChange(val);
                    }
                }}
                onFocus={(e) => e.target.select()}
                className={`${inputClasses} min-h-[60px] resize-y`}
                rows={isArrayOfStrings ? Math.max(3, (value as string[]).length) : (displayedValue && displayedValue.length > 60 ? 3 : 1)}
            />
        );
    }

    return (
        <div className="relative group/field container-copy">
            {!textContent ? (
                <p className="text-[11.5pt] text-slate-300 italic leading-relaxed">Not reported</p>
            ) : (
                <div className={`text-[11.5pt] ${displayedValue ? 'text-black font-medium' : 'text-slate-500 italic font-medium'} leading-relaxed whitespace-pre-wrap`}>
                    {displayedValue || "—"}
                </div>
            )}
            {textContent && (
                <button
                    onClick={() => handleCopy(textContent, field?.path || 'static')}
                    className="absolute top-0 right-0 z-10 p-1.5 rounded-bl-lg bg-blue-600 text-white shadow-md transition-all opacity-0 group-hover/field:opacity-100 no-print flex items-center gap-1 hover:bg-blue-700 active:scale-95"
                    title="Copy section text"
                >
                    {copyingField === (field?.path || 'static') ? <Check size={12} /> : <Copy size={12} />}
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Copy</span>
                </button>
            )}
        </div>
    );
};

interface TcmNoteShellProps {
    note: ClioNote;
    hideToolbar?: boolean;
    isStandalone?: boolean;
    onSaveComplete?: (saved: boolean) => void;
    onPrint?: () => void;
}

const TcmNoteShell: React.FC<TcmNoteShellProps> = ({
    note,
    hideToolbar = false,
    isStandalone = false,
    onSaveComplete,
    onPrint
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [noteOverrides, setNoteOverrides] = useState<any>({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

    const [cmSignatureImg, setCmSignatureImg] = useState<string | null>(null);
    const [supSignatureImg, setSupSignatureImg] = useState<string | null>(null);
    const [activeSigType, setActiveSigType] = useState<'cm' | 'sup' | null>(null);
    const [copyingSection, setCopyingSection] = useState<string | null>(null);
    const [lastSavedId, setLastSavedId] = useState<string | null>(
        (note as any)?.id || (note as any)?._id || (note as any)?.noteId || null
    );

    // Signature Request States
    const [isRequestSignatureModalOpen, setIsRequestSignatureModalOpen] = useState(false);
    const [supervisorEmailInput, setSupervisorEmailInput] = useState('');
    const [isRequestingSignature, setIsRequestingSignature] = useState(false);

    // --- Add Joint Note Overlap Check State ---
    const [hasInternalTimeConflict, setHasInternalTimeConflict] = useState(false);
    const [focusedTimeKey, setFocusedTimeKey] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncTask, setSyncTask] = useState<{ status: string; error_message: string | null } | null>(null);
    const [isSyncErrorModalOpen, setIsSyncErrorModalOpen] = useState(false);

    const loadSyncStatus = React.useCallback(async () => {
        const noteIdToSync = note?.id || lastSavedId;
        if (!noteIdToSync) return;
        try {
            const { data, error } = await supabase
                .from('amexzone_note_tasks')
                .select('status, error_message')
                .eq('note_id', noteIdToSync)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setSyncTask(data || null);
        } catch (err) {
            console.error('Error loading note sync status:', err);
        }
    }, [note?.id, lastSavedId]);

    useEffect(() => {
        loadSyncStatus();
        const interval = setInterval(loadSyncStatus, 5000);
        return () => clearInterval(interval);
    }, [loadSyncStatus]);

    const handleRequestSignature = async () => {
        if (!supervisorEmailInput || !supervisorEmailInput.includes('@')) {
            toast.error("Please enter a valid supervisor email");
            return;
        }

        const targetId = lastSavedId || (mergedNote as any).id;

        if (!targetId) {
            toast.error("Please save the note before requesting a signature.");
            return;
        }

        setIsRequestingSignature(true);
        try {
            const token = crypto.randomUUID();

            const { data, error: dbError } = await supabase
                .from('notes')
                .update({
                    supervisor_email: supervisorEmailInput,
                    signature_token: token,
                    signature_status: 'pending'
                })
                .eq('id', targetId)
                .select();

            if (dbError) throw dbError;

            if (!data || data.length === 0) {
                toast.error("You must save this note before requesting a signature.");
                setIsRequestingSignature(false);
                return;
            }

            const protocol = window.location.protocol;
            const host = window.location.host;
            const signatureLink = `${protocol}//${host}/sign-note/${token}`;

            const response = await fetch('https://n8n.clinicflow.dev/webhook/signNotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supervisorEmail: supervisorEmailInput,
                    patientName: mergedNote.patient?.full_name || 'Patient',
                    signatureLink: signatureLink,
                    caseManagerName: (user as any)?.user_metadata?.full_name || user?.email || 'Case Manager'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Webhook returned ${response.status}: ${errText}`);
            }

            toast.success("Signature request sent successfully");

            try {
                const { auditService } = await import('../../services/auditService');
                await auditService.logAction({
                    action: 'UPDATE',
                    description: `Requested digital signature from ${supervisorEmailInput} for clinical note of patient ${mergedNote.patient?.full_name || 'Patient'}`,
                    targetType: 'note',
                    targetId: targetId
                });
            } catch (auditErr) {
                console.error('Error writing audit log for requestSignature:', auditErr);
            }

            setIsRequestSignatureModalOpen(false);
            setSupervisorEmailInput('');

        } catch (err: any) {
            console.error("Signature request error:", err);
            toast.error(err.message || "Failed to request signature. Please try again.");
        } finally {
            setIsRequestingSignature(false);
        }
    };

    const handleSaveSignature = (dataUrl: string) => {
        const today = getMiamiTodayString();
        if (activeSigType === 'cm') {
            setCmSignatureImg(dataUrl);
            handleUpdateField('signatures.cm_signature_path', dataUrl);
            handleUpdateField('signatures.cm_signed_date', today);
        } else if (activeSigType === 'sup') {
            setSupSignatureImg(dataUrl);
            handleUpdateField('signatures.sup_signature_path', dataUrl);
            handleUpdateField('signatures.sup_signed_date', today);
        }
        setActiveSigType(null);
    };

    const handleSignatureClick = (type: 'cm' | 'sup') => {
        const today = getMiamiTodayString();
        if (type === 'cm' && (user as any)?.signature_url) {
            setCmSignatureImg((user as any).signature_url);
            handleUpdateField('signatures.cm_signature_path', (user as any).signature_url);
            handleUpdateField('signatures.cm_signed_date', today);
            toast.success("Signed automatically with your saved signature");
        } else if (type === 'sup' && clinicSettings?.supervisorSignatureUrl) {
            setSupSignatureImg(clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signature_path', clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signed_date', today);
            toast.success("Supervisor signed automatically");
        } else {
            setActiveSigType(type);
        }
    };

    useEffect(() => {
        const handleBeforePrint = () => {
            const isDark = document.documentElement.classList.contains('dark');
            if (isDark) {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
                (window as any).__wasDarkBeforePrint = true;
            }
        };
        const handleAfterPrint = () => {
            if ((window as any).__wasDarkBeforePrint) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
                (window as any).__wasDarkBeforePrint = false;
            }
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const fetched = await storage.getTemplates();
                setTemplates(fetched);
            } catch (err) {
                console.error("TcmNoteShell: Failed to load templates:", err);
            } finally {
                setIsLoadingTemplates(false);
            }
        };

        const loadClinicSettings = async () => {
            if (user?.clinic_id) {
                try {
                    const settings = await settingsService.fetchSettings(user.clinic_id);
                    setClinicSettings(settings);
                } catch (err) {
                    console.error("TcmNoteShell: Failed to load clinic settings:", err);
                }
            }
        };

        loadTemplates();
        loadClinicSettings();
    }, [user?.clinic_id]);

    const mergedNote = useMemo(() => {
        let result = { ...note };
        if (lastSavedId && !result.id) {
            result.id = lastSavedId;
        }
        Object.keys(noteOverrides).forEach(path => {
            result = setValueByPath(result, path, noteOverrides[path]);
        });
        if (lastSavedId) {
            result.id = lastSavedId;
        }
        return result;
    }, [note, noteOverrides, lastSavedId]);

    const isSigned = useMemo(() => {
        return (mergedNote as any).signature_status === 'signed';
    }, [mergedNote]);

    useEffect(() => {
        if (isSigned && isEditMode) {
            setIsEditMode(false);
        }
    }, [isSigned, isEditMode]);

    const { conflicts, confidence, isLoading: isConflictLoading } = useProviderTimeConflicts(mergedNote);

    useEffect(() => {
        if (!mergedNote.joint_services || mergedNote.joint_services.length < 2) {
            const singleSvc = mergedNote.joint_services && mergedNote.joint_services.length === 1 
                ? mergedNote.joint_services[0] 
                : mergedNote;
            const range = extractNormalizedTimeRange(singleSvc);
            if (range.startAtISO && range.endAtISO && range.endAtISO < range.startAtISO) {
                setHasInternalTimeConflict(true);
            } else {
                setHasInternalTimeConflict(false);
            }
            return;
        }

        let overlap = false;
        const services = mergedNote.joint_services;

        for (let i = 0; i < services.length; i++) {
            const svcI = { ...services[i] };
            if (!svcI.encounter?.dos_date) {
                if (!svcI.encounter) svcI.encounter = { mode: 'in-person' } as any;
                svcI.encounter.dos_date = mergedNote.encounter?.dos_date || (mergedNote as any).meta?.visitDate;
            }

            const rangeA = extractNormalizedTimeRange(svcI);

            // Self-validation (inverted time)
            if (rangeA.startAtISO && rangeA.endAtISO && rangeA.endAtISO < rangeA.startAtISO) {
                overlap = true;
                break;
            }

            // Cross-validation
            for (let j = i + 1; j < services.length; j++) {
                const svcJ = { ...services[j] };
                if (!svcJ.encounter?.dos_date) {
                    if (!svcJ.encounter) svcJ.encounter = { mode: 'in-person' } as any;
                    svcJ.encounter.dos_date = mergedNote.encounter?.dos_date || (mergedNote as any).meta?.visitDate;
                }
                const rangeB = extractNormalizedTimeRange(svcJ);

                if (rangeA.startAtISO && rangeA.endAtISO && rangeB.startAtISO && rangeB.endAtISO) {
                    if (areOverlapping(rangeA.startAtISO, rangeA.endAtISO, rangeB.startAtISO, rangeB.endAtISO)) {
                        overlap = true;
                        break;
                    }
                }
            }
            if (overlap) break;
        }
        setHasInternalTimeConflict(overlap);
    }, [mergedNote]);

    const handleUpdateField = (path: string, newValue: any) => {
        setNoteOverrides((prev: any) => {
            const next = { ...prev, [path]: newValue };
            
            // Auto-calculate duration and units when time range changes
            const match = path.match(/^(?:(.*?\.)|)encounter\.(time_in|time_out)$/);
            if (match) {
                const prefix = match[1] || '';
                
                const timeInPath = `${prefix}encounter.time_in`;
                const timeOutPath = `${prefix}encounter.time_out`;
                
                const getTime = (p: string) => next.hasOwnProperty(p) ? next[p] : getValueByPath(note, p);
                
                const timeIn = getTime(timeInPath);
                const timeOut = getTime(timeOutPath);

                const parseTime = (timeStr: string) => {
                    if (!timeStr) return null;
                    const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})\s*(am|pm)?$/i);
                    if (!match) return null;
                    let hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);
                    const period = match[3]?.toLowerCase();
                    if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;
                    if (period === 'pm' && hours < 12) hours += 12;
                    if (period === 'am' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                };

                const startMins = parseTime(timeIn);
                const endMins = parseTime(timeOut);
                
                if (startMins !== null && endMins !== null) {
                    let duration = endMins - startMins;
                    if (duration < 0) duration += 24 * 60;
                    
                    const units = Math.floor(duration / 15) + (duration % 15 >= 8 ? 1 : 0);
                    
                    next[`${prefix}encounter.duration`] = duration.toString();
                    next[`${prefix}encounter.billing_units`] = units.toString();
                    next[`${prefix}encounter.units`] = units.toString();
                }
            }
            
            return next;
        });
        setIsSaved(false);
        if (onSaveComplete) onSaveComplete(false);
    };

    const handleTimeChange = (val: string, path: string, currentFullValue: string) => {
        let clean = val.replace(/[^\d:]/g, '');
        let parts = clean.split(':');
        let hr = parts[0] || '';
        let min = parts.length > 1 ? parts.slice(1).join('') : undefined;

        if (hr.length > 2) {
            min = hr.slice(2) + (min || '');
            hr = hr.slice(0, 2);
        }
        
        const hrNum = parseInt(hr, 10);
        if (hrNum > 12) hr = '12';
        if (hr === '00') hr = '12';
        
        if (min !== undefined) {
            min = min.replace(/[^\d]/g, '');
            if (min.length > 2) min = min.slice(0, 2);
            const minNum = parseInt(min, 10);
            if (minNum > 59) min = '59';
            clean = `${hr}:${min}`;
        } else {
            clean = hr + (val.endsWith(':') ? ':' : '');
        }

        const period = (currentFullValue || "").toUpperCase().includes('PM') ? 'PM' : 'AM';
        const formattedTime = clean ? `${clean} ${period}` : ` ${period}`;
        
        handleUpdateField(path, formattedTime);
    };

    const handleTimeBlur = (path: string, currentFullValue: string) => {
        let clean = (currentFullValue || "").replace(/AM|PM/gi, '').trim();
        if (clean) {
            let [h, m] = clean.split(':');
            h = h || '12';
            m = m || '00';
            if (h.length === 1) h = `0${h}`;
            if (m.length === 1) m = `${m}0`;
            const period = (currentFullValue || "").toUpperCase().includes('PM') ? 'PM' : 'AM';
            handleUpdateField(path, `${h}:${m} ${period}`);
        }
    };

    const handleCopy = async (text: string, label: string, sectionKey?: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`Copied ${label} to clipboard`);
            if (sectionKey) {
                setCopyingSection(sectionKey);
                setTimeout(() => setCopyingSection(null), 2000);
            }
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleCopySection = (title: string, fields: { label: string, value: any }[]) => {
        let text = `[${title.toUpperCase()}]\n`;
        fields.forEach(f => {
            const val = formatValueForPrint(f.value);
            if (val && val !== "Not reported") {
                text += `${f.label}: ${val}\n`;
            }
        });
        navigator.clipboard.writeText(text.trim());
        toast.success(`Copied ${title} to clipboard`);
    };

    const handleSaveNote = async () => {
        if (!user) return;
        
        if (hasInternalTimeConflict || (conflicts && conflicts.length > 0)) {
            toast.error("Cannot save note with overlapping times. Please resolve time conflicts first.");
            return;
        }

        setIsSaving(true);
        try {
            const noteToSave = { ...mergedNote };
            if (lastSavedId) {
                noteToSave.id = lastSavedId;
            }
            const savedNoteResult = await storage.saveAnalyzedNote(noteToSave);
            if (savedNoteResult && savedNoteResult.id) {
                setLastSavedId(savedNoteResult.id);
            }
            setIsSaved(true);
            if (onSaveComplete) onSaveComplete(true);
            toast.success("Saved to Clinical History");
        } catch (err) {
            toast.error("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const handleSyncWithEhr = async () => {
        const note = mergedNote as any;
        const noteIdToSync = note.id || lastSavedId;
        if (!noteIdToSync) {
            toast.error("Please save the note before exporting to EHR.");
            return;
        }

        setIsSyncing(true);
        try {
            // Verify integration exists and is connected
            const { data: integration, error: intError } = await supabase
                .from('provider_integrations')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (intError) throw intError;

            if (!integration || integration.mfa_status !== 'connected') {
                if (integration && integration.mfa_status === 'expired') {
                    toast.error("Your Amexzone session has expired. Please open the 'Clio Sync' extension and click 'Sync Active Session'.");
                } else {
                    toast.error("Please connect your EHR integration in settings first.");
                }
                return;
            }

            // Build active domains list matching visual DomainItem rules
            const activeDomains: string[] = [];
            const isOtcNote = (
                (note.subTemplate || "").toLowerCase().includes("otc") ||
                (note._frontend_service_title || "").toLowerCase().includes("otc") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("otc")
            );
            const templateId = note.template_id || note.templateId || note.meta?.template_id;
            const isHurricaneNote = (
                templateId === 'tcm_hurricane_addendum_note' ||
                templateId === 'tcm_hurricane_update_note' ||
                (note.subTemplate || "").toLowerCase().includes("hurricane") ||
                (note._frontend_service_title || "").toLowerCase().includes("hurricane") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("hurricane") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("hurricane")
            );
            const isStsNote = (
                templateId === 'tcm_sts_complete_note' ||
                templateId === 'tcm_sts_collect_note' ||
                templateId === 'tcm_sts_submit_note' ||
                (note.subTemplate || "").toLowerCase().includes("sts") ||
                (note._frontend_service_title || "").toLowerCase().includes("sts") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("sts") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("sts")
            );
            const isDppNote = (
                templateId === 'tcm_dpp_obtain_note' ||
                templateId === 'tcm_dpp_complete_note' ||
                templateId === 'tcm_dpp_submit_pcp_note' ||
                (note.subTemplate || "").toLowerCase().includes("dpp") ||
                (note.subTemplate || "").toLowerCase().includes("handicap") ||
                (note._frontend_service_title || "").toLowerCase().includes("dpp") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("dpp") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("dpp") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("handicap")
            );
            const isMhvNote = (
                templateId === 'tcm_mhv_note' ||
                (note.subTemplate || "").toLowerCase().includes("mhv") ||
                (note.subTemplate || "").toLowerCase().includes("monthly home visit") ||
                (note._frontend_service_title || "").toLowerCase().includes("mhv") ||
                (note._frontend_service_title || "").toLowerCase().includes("monthly home visit") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("mhv") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("mhv")
            );

            const isLtcNote = (
                templateId?.startsWith('tcm_ltc_') ||
                (note.subTemplate || "").toLowerCase().includes("ltc") ||
                (note._frontend_service_title || "").toLowerCase().includes("ltc") ||
                (note.encounter?.primary_service_provided || "").toLowerCase().includes("ltc") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("ltc")
            );
            const isDonationObtainNote = (
                templateId === 'tcm_mhv_obtain_donation_note' ||
                templateId === 'tcm_donation_obtain_note' ||
                templateId === 'tcm_cleaning_donation_gather_note' ||
                templateId === 'tcm_cleaning_donation_obtain_note' ||
                templateId === 'tcm_clothing_donation_gather_note' ||
                templateId === 'tcm_clothing_donation_obtain_note' ||
                templateId === 'tcm_food_donation_gather_note' ||
                templateId === 'tcm_food_donation_obtain_note' ||
                (note.subTemplate || "").toLowerCase().includes("mhv + obt") ||
                (note.subTemplate || "").toLowerCase().includes("obtain clothing") ||
                (note.subTemplate || "").toLowerCase().includes("cleaning donation") ||
                (note.subTemplate || "").toLowerCase().includes("clothing donation") ||
                (note.subTemplate || "").toLowerCase().includes("food donation") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("obtain donation") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("mhv + obt") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("cleaning donation") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("clothing donation") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("food donation")
            );
            const isApptCoordNote = (
                templateId === 'tcm_provider_appt_coord_note' ||
                (note.subTemplate || "").toLowerCase().includes("appt") ||
                (note.subTemplate || "").toLowerCase().includes("appointment") ||
                (note._frontend_service_title || "").toLowerCase().includes("appt") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("appointment")
            );
            const isUscisAssistanceNote = (
                templateId === 'tcm_uscis_assistance_note' ||
                (note.subTemplate || "").toLowerCase().includes("uscis") ||
                (note.subTemplate || "").toLowerCase().includes("immigration") ||
                (note._frontend_service_title || "").toLowerCase().includes("uscis") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("uscis")
            );
            const isHousingAssistanceNote = (
                templateId === 'tcm_housing_assistance_note' ||
                (note.subTemplate || "").toLowerCase().includes("housing") ||
                (note.subTemplate || "").toLowerCase().includes("shelter") ||
                (note._frontend_service_title || "").toLowerCase().includes("housing") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("housing")
            );
            const isSnapRecertificationNote = (
                templateId === 'tcm_snap_recertification_note' ||
                (note.subTemplate || "").toLowerCase().includes("food stamp") ||
                (note.subTemplate || "").toLowerCase().includes("snap") ||
                (note._frontend_service_title || "").toLowerCase().includes("snap") ||
                (note.services?.service_focus_title || "").toLowerCase().includes("snap")
            );
            const isVaccinationAssistanceNote = (
                templateId === 'tcm_vaccination_assistance_note' ||
                (note.subTemplate || "").toLowerCase().includes("vaccin") ||
                (note._frontend_service_title || "").toLowerCase().includes("vaccin")
            );

            TCM_DOMAINS.forEach((domain) => {
                let isChecked = false;
                if (isHurricaneNote) {
                    isChecked = domain.path === 'services.domains_selected.12_other';
                } else if (isOtcNote || isVaccinationAssistanceNote) {
                    isChecked = domain.path === 'services.domains_selected.2_physical_health_medical_dental';
                } else if (isStsNote || isDppNote) {
                    isChecked = domain.path === 'services.domains_selected.10_transportation';
                } else if (isMhvNote) {
                    const domainKey = domain.path.split('.').pop() || '';
                    isChecked = domainKey === '1_mental_health_substance_abuse' || Boolean(note.services?.domains_selected?.[domainKey]);
                } else if (isLtcNote) {
                    const domainKey = domain.path.split('.').pop() || '';
                    isChecked = domainKey === '1_mental_health_substance_abuse' || domainKey === '6_activities_of_daily_living' || Boolean(note.services?.domains_selected?.[domainKey]);
                } else if (isDonationObtainNote) {
                    isChecked = domain.path === 'services.domains_selected.9_basic_needs';
                } else if (isApptCoordNote) {
                    const titleLower = (note.services?.service_focus_title || "").toLowerCase();
                    const narrLower = (note.narrative?.summary_notes || "").toLowerCase();
                    const wantsPsych = titleLower.includes("psych") || titleLower.includes("mental");
                    const wantsPcp = titleLower.includes("pcp") || titleLower.includes("primary care") || titleLower.includes("medical") || titleLower.includes("specialist");
                    const wantsTrans = titleLower.includes("transport") || titleLower.includes("nemt") || narrLower.includes("transportation") || narrLower.includes("nemt") || narrLower.includes("saferide");
                    
                    if (domain.path === 'services.domains_selected.1_mental_health_substance_abuse') {
                        isChecked = wantsPsych || (!wantsPsych && !wantsPcp && !wantsTrans);
                    } else if (domain.path === 'services.domains_selected.2_physical_health_medical_dental') {
                        isChecked = wantsPcp;
                    } else if (domain.path === 'services.domains_selected.10_transportation') {
                        isChecked = wantsTrans;
                    }
                } else if (isUscisAssistanceNote) {
                    const narrLower = (note.narrative?.summary_notes || "").toLowerCase();
                    const wantsAdl = narrLower.includes("form") || narrLower.includes("paperwork") || narrLower.includes("document") || narrLower.includes("organize") || narrLower.includes("residency");
                    const wantsPsych = narrLower.includes("anxiety") || narrLower.includes("anxious") || narrLower.includes("emotional support") || narrLower.includes("reassurance");
                    
                    if (domain.path === 'services.domains_selected.11_legal_immigration') {
                        isChecked = true;
                    } else if (domain.path === 'services.domains_selected.6_activities_of_daily_living') {
                        isChecked = wantsAdl;
                    } else if (domain.path === 'services.domains_selected.1_mental_health_substance_abuse') {
                        isChecked = wantsPsych;
                    }
                } else if (isHousingAssistanceNote) {
                    isChecked = domain.path === 'services.domains_selected.7_housing_shelter';
                } else if (isSnapRecertificationNote) {
                    isChecked = domain.path === 'services.domains_selected.8_economic_financial';
                } else {
                    isChecked = domain.path === 'services.domains_selected.1_mental_health_substance_abuse';
                }

                if (isChecked) {
                    activeDomains.push(domain.path.split('.').pop()!);
                }
            });

            const isJoint = !!(mergedNote.joint_services && mergedNote.joint_services.length > 0);
            const servicesToSync = (isJoint ? mergedNote.joint_services : [mergedNote]) || [];

            const todayDateStr = new Date().toISOString().split('T')[0];
            for (const svc of servicesToSync) {
                const effectiveVisitDate = svc.encounter?.dos_date 
                    || (svc as any).service_date 
                    || (svc as any).date_of_service 
                    || mergedNote.encounter?.dos_date 
                    || (mergedNote as any).service_date 
                    || (mergedNote as any).date_of_service 
                    || (mergedNote as any).meta?.dos_date 
                    || (mergedNote as any).meta?.service_date 
                    || (mergedNote as any).meta?.visitDate 
                    || note.encounter?.dos_date 
                    || note.meta?.visitDate 
                    || todayDateStr;

                const patAny = (mergedNote.patient as any) || (note.patient as any) || {};

                // Construct JSON payload for this specific service block
                const payload = {
                    patient_emr_id: patAny.emr_id || patAny.id || patAny.account_number || (patAny.emr ? patAny.emr.replace(/\D/g, '') : '') || "",
                    amexzone_id: patAny.amexzone_id || patAny.id_amexzone || "",
                    patient_id: patAny.id || "",
                    patient_name: patAny.full_name || "",
                    patient_dob: patAny.dob || "",
                    visit_date: effectiveVisitDate,
                    encounter: {
                        dos_date: effectiveVisitDate,
                        time_in: svc.encounter?.time_in || mergedNote.encounter?.time_in || "",
                        time_out: svc.encounter?.time_out || mergedNote.encounter?.time_out || "",
                        duration: svc.encounter?.duration_minutes || svc.encounter?.duration || mergedNote.encounter?.duration_minutes || mergedNote.encounter?.duration || "",
                        units: svc.encounter?.units || mergedNote.encounter?.units || "",
                        pos: svc.encounter?.pos || mergedNote.encounter?.pos || ""
                    },
                    narrative: {
                        summary_notes: svc.narrative?.summary_notes || mergedNote.narrative?.summary_notes || "",
                        outcome_of_services: svc.narrative?.outcome_of_services || mergedNote.narrative?.outcome_of_services || "",
                        next_steps: svc.narrative?.next_steps || mergedNote.narrative?.next_steps || ""
                    },
                    domains: activeDomains,
                    service_type: svc.subTemplate || svc.services?.service_focus_title || mergedNote.subTemplate || mergedNote.services?.service_focus_title || ""
                };

                const { error: insertError } = await supabase
                    .from('amexzone_note_tasks')
                    .insert({
                        note_id: noteIdToSync,
                        user_id: user?.id,
                        clinic_id: user?.clinic_id || clinicSettings?.id || null,
                        patient_name: mergedNote.patient?.full_name || note.patient?.full_name || 'Desconocido',
                        patient_dob: mergedNote.patient?.dob || note.patient?.dob || null,
                        visit_date: effectiveVisitDate,
                        note_text: '[TCM_PROGRESS_NOTE]\n' + JSON.stringify(payload),
                        status: 'pending'
                    });

                if (insertError) throw insertError;
            }

            toast.success("Progress Note queued for synchronization!");
            loadSyncStatus();
        } catch (err: any) {
            console.error("Error queueing EHR task:", err);
            toast.error(err.message || "Failed to queue EHR sync task");
        } finally {
            setIsSyncing(false);
        }
    };

    // Calc helpers
    const rawDuration = mergedNote.encounter?.duration_minutes || mergedNote.encounter?.duration;
    const durationValue = rawDuration ? `${rawDuration} min` : "—";
    const unitsValue = mergedNote.encounter?.units || (rawDuration ? (Math.floor(parseInt(String(rawDuration), 10) / 15) + (parseInt(String(rawDuration), 10) % 15 >= 8 ? 1 : 0)).toString() : "—");

    const posValue = (() => {
        const code = (mergedNote.encounter?.pos || "").trim();
        return code || "—";
    })();

    const timeRangeValue = (() => {
        const start = mergedNote.encounter?.time_in || (mergedNote as any).appointment?.start_time || (mergedNote.encounter as any)?.start_time;
        const end = mergedNote.encounter?.time_out || (mergedNote as any).appointment?.end_time || (mergedNote.encounter as any)?.end_time;

        if (start && end) return `${start} — ${end}`;
        if (start || end) return start || end;
        return "—";
    })();

    return (
        <div className={`tcm-print-shell ${!isStandalone ? 'max-w-[1050px] mx-auto' : ''}`} style={{ minHeight: '100%' }}>

            {/* FLOATING TOOLBAR - MODERN CLINICAL HUD */}
            {!hideToolbar && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] no-print max-w-[95vw]">
                    <div className="flex items-center gap-1.5 p-2 bg-card/95 dark:bg-card/90 backdrop-blur-2xl border border-border/80 shadow-2xl shadow-primary/10 dark:shadow-black/50 rounded-full ring-1 ring-primary/10 transition-all duration-300">
                        <button
                            disabled={isSigned}
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                isSigned
                                ? 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border/40'
                                : isEditMode 
                                ? 'bg-foreground text-background shadow-md active:scale-95' 
                                : 'bg-transparent text-foreground hover:bg-secondary border border-transparent hover:border-border/60 active:scale-95'
                            }`}
                        >
                            {isSigned ? <Lock size={15} /> : (isEditMode ? <Check size={15} /> : <Edit3 size={15} />)}
                            <span>{isSigned ? 'Locked' : (isEditMode ? 'Done' : 'Edit')}</span>
                        </button>
 
                        <div className="w-[1px] h-6 bg-border/80 mx-0.5" />
 
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-transparent text-foreground hover:bg-secondary hover:text-primary font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-border/60 active:scale-95 cursor-pointer group"
                        >
                            <Printer size={15} className="group-hover:scale-110 transition-transform" />
                            <span>Print</span>
                        </button>

                        <div className="w-[1px] h-6 bg-border/80 mx-0.5" />

                        <div className="flex items-center gap-2">
                            <button
                                disabled={isSyncing || syncTask?.status === 'pending' || syncTask?.status === 'processing'}
                                onClick={handleSyncWithEhr}
                                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-transparent text-foreground hover:bg-secondary hover:text-cyan-500 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-border/60 active:scale-95 cursor-pointer group disabled:opacity-50"
                            >
                                {isSyncing || syncTask?.status === 'pending' || syncTask?.status === 'processing' ? (
                                    <RefreshCw size={15} className="animate-spin text-cyan-500" />
                                ) : (
                                    <Cpu size={15} className="group-hover:scale-110 transition-transform text-cyan-500" />
                                )}
                                <span>{isSyncing || syncTask?.status === 'pending' || syncTask?.status === 'processing' ? 'Syncing' : 'Sync'}</span>
                            </button>
                            {(() => {
                                if (!syncTask) return null;
                                switch (syncTask.status) {
                                    case 'pending':
                                        return (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                                <span className="size-1.5 rounded-full bg-amber-500" />
                                                Queued
                                            </span>
                                        );
                                    case 'processing':
                                        return (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 animate-pulse">
                                                <span className="size-1.5 rounded-full bg-cyan-500" />
                                                Syncing...
                                            </span>
                                        );
                                    case 'completed':
                                        return (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                Synced
                                            </span>
                                        );
                                    case 'failed': {
                                        const formatted = formatSyncError(syncTask.error_message);
                                        return (
                                            <button 
                                                type="button"
                                                onClick={() => setIsSyncErrorModalOpen(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer group/syncerr active:scale-95 shadow-sm"
                                                title="Haz clic para ver el motivo y cómo resolverlo"
                                            >
                                                <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                <span className="max-w-[140px] truncate">{formatted.title}</span>
                                                <span className="underline ml-0.5 opacity-80 group-hover/syncerr:opacity-100 text-[9px]">Detalles</span>
                                            </button>
                                        );
                                    }
                                    default:
                                        return null;
                                }
                            })()}
                        </div>
 
                        {!isSigned && (
                            <>
                                <div className="w-[1px] h-6 bg-border/80 mx-0.5" />
 
                                <button
                                    onClick={handleSaveNote}
                                    disabled={isSaving}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer ${
                                        isSaved 
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:-translate-y-0.5'
                                    } disabled:opacity-50`}
                                >
                                    {isSaving ? (
                                        <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : isSaved ? (
                                        <CheckCircle size={15} />
                                    ) : (
                                        <Save size={15} />
                                    )}
                                    <span>{isSaving ? 'Saving' : (isSaved ? 'Saved' : 'Save')}</span>
                                </button>
 
                                <div className="w-[1px] h-6 bg-border/80 mx-0.5" />
 
                                <button
                                    onClick={() => setIsRequestSignatureModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-95 cursor-pointer"
                                >
                                    <PenTool size={15} />
                                    <span>Sign</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap');

                .document-canvas-wrapper { 
                    background: #f8fafc;
                    padding: 1.5rem 2rem 2rem 2rem; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    min-height: 100vh;
                    border-radius: 24px;
                }

                /* CUSTOM SCROLLBAR */
                .document-canvas-wrapper::-webkit-scrollbar { width: 6px; }
                .document-canvas-wrapper::-webkit-scrollbar-track { background: transparent; }
                .document-canvas-wrapper::-webkit-scrollbar-thumb { 
                    background: #e2e8f0; 
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .document-canvas-wrapper::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

                .document-page { 
                    background-color: white; 
                    width: 100%; 
                    max-width: 100%; 
                    min-height: 11in; 

                    padding: 0.4in 0.5in; 
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1);
                    border: none; 
                    border-radius: 48px;
                    position: relative; 
                    margin-bottom: 4rem; 
                    /* PREMIUM TYPOGRAPHY */
                    font-family: 'Inter', sans-serif !important;
                    color: #1e293b;
                    line-height: 1.6;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* ON-SCREEN DARK MODE PREVIEW - FORCES WHITE BACKGROUND ONLY WHEN PRINTING */
                .dark .document-canvas-wrapper {
                    background: #090d16 !important;
                }
                .dark .document-page { 
                    background-color: #0f172a !important; 
                    color: #cbd5e1 !important; 
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.05) !important;
                }
                .dark .document-page .text-slate-900,
                .dark .document-page h1,
                .dark .document-page h2,
                .dark .document-page h3,
                .dark .document-page h4 {
                    color: #f8fafc !important;
                }
                .dark .document-page .text-slate-800 {
                    color: #e2e8f0 !important;
                }
                .dark .document-page .text-slate-700 {
                    color: #f1f5f9 !important;
                }
                .dark .document-page .text-slate-600 {
                    color: #cbd5e1 !important;
                }
                .dark .document-page .text-slate-500 {
                    color: #cbd5e1 !important;
                }
                .dark .document-page .text-slate-400 {
                    color: #94a3b8 !important;
                }
                .dark .document-page .value-text {
                    color: #f1f5f9 !important;
                }
                .dark .document-page .gradient-divider {
                    background: linear-gradient(to right, transparent, #1e293b 10%, #1e293b 90%, transparent) !important;
                }
                .dark .document-page .border-slate-100 {
                    border-color: #1e293b !important;
                }
                .dark .document-page .border-slate-200 {
                    border-color: #334155 !important;
                }
                .dark .document-page div[class*="bg-slate-50"] {
                    background-color: rgba(2, 6, 23, 0.55) !important;
                }
                .dark .document-page .bg-white {
                    background-color: #0f172a !important;
                }
                .dark .document-page .text-indigo-900,
                .dark .document-page .text-indigo-950 {
                    color: #a5b4fc !important;
                }
                .dark .document-page .bg-indigo-50\/40 {
                    background-color: rgba(99, 102, 241, 0.15) !important;
                }
                .dark .document-page .border-indigo-100\/30 {
                    border-color: rgba(99, 102, 241, 0.2) !important;
                }
                .dark .document-page .group.cursor-pointer:hover,
                .dark .document-page .group\/diag:hover,
                .dark .document-page [class*="hover:bg-white"]:hover,
                .dark .document-page [class*="hover:bg-slate-50"]:hover,
                .dark .document-page [class*="hover:bg-slate-100"]:hover {
                    background-color: #1e293b !important;
                }
                .dark .document-page .group:hover .group-hover\:text-slate-700 {
                    color: #cbd5e1 !important;
                }
                .dark .document-page .text-indigo-600 {
                    color: #a5b4fc !important;
                }
                .dark .document-page .bg-indigo-50\/50 {
                    background-color: rgba(99, 102, 241, 0.15) !important;
                }
                .dark .document-page .bg-blue-50 {
                    background-color: rgba(59, 130, 246, 0.15) !important;
                    color: #60a5fa !important;
                    border-color: rgba(59, 130, 246, 0.25) !important;
                }
                .dark .document-page .bg-green-50 {
                    background-color: rgba(34, 197, 94, 0.15) !important;
                    color: #4ade80 !important;
                    border-color: rgba(34, 197, 94, 0.25) !important;
                }
                .dark .document-page .bg-indigo-50 {
                    background-color: rgba(99, 102, 241, 0.12) !important;
                }
                .document-page .diagnoses-badge {
                    color: #4f46e5 !important;
                    background-color: rgba(239, 246, 255, 0.9) !important;
                    border: 1px solid rgba(199, 210, 254, 0.5) !important;
                }
                .dark .document-page .diagnoses-badge {
                    color: #c7d2fe !important;
                    background-color: rgba(30, 27, 75, 0.75) !important;
                    border: 1px solid rgba(99, 102, 241, 0.35) !important;
                }
                .dark .document-page .text-indigo-700 {
                    color: #a5b4fc !important;
                }
                .dark .document-page .border-indigo-100 {
                    border-color: rgba(99, 102, 241, 0.25) !important;
                }
                .dark .document-page .border-slate-100\/50,
                .dark .document-page .border-slate-200\/80 {
                    border-color: rgba(255, 255, 255, 0.08) !important;
                }
                .dark .document-page input,
                .dark .document-page select,
                .dark .document-page textarea {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }
                .dark .document-page input:focus,
                .dark .document-page select:focus,
                .dark .document-page textarea:focus {
                    background-color: #0f172a !important;
                    border-color: #6366f1 !important;
                }

                /* Floating action bar in dark mode */
                .dark .fixed.bottom-12.left-1\/2 > div {
                    background-color: rgba(15, 23, 42, 0.8) !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button {
                    background-color: #1e293b !important;
                    color: #cbd5e1 !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button:hover {
                    background-color: #334155 !important;
                    color: #f1f5f9 !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button.bg-indigo-600 {
                    background-color: #4f46e5 !important;
                    color: white !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button.bg-indigo-600:hover {
                    background-color: #4338ca !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button.bg-slate-900 {
                    background-color: #f8fafc !important;
                    color: #0f172a !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button.bg-slate-900:hover {
                    background-color: #e2e8f0 !important;
                }
                .dark .fixed.bottom-12.left-1\/2 button.bg-emerald-500 {
                    background-color: #10b981 !important;
                    color: white !important;
                }
                .dark .fixed.bottom-12.left-1\/2 .bg-slate-200\/50 {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                }

                .document-page h1, .document-page h2, .document-page h3, .label-small {
                    font-family: 'Outfit', sans-serif !important;
                }

                /* DASHBOARD STYLE LABELS */
                .label-small {
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .value-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.5;
                }

                /* GRADIENT DIVIDER */
                .gradient-divider {
                    height: 1px;
                    width: 100%;
                    background: linear-gradient(to right, transparent, #f1f5f9 10%, #f1f5f9 90%, transparent);
                    margin: 0.75rem 0;
                }

                @page {
                    size: letter portrait;
                    margin-top: 0.25in;
                    margin-bottom: 0.6in;
                    margin-left: 0.3in;
                    margin-right: 0.3in;
                    
                    @bottom-left {
                        content: "${mergedNote.patient?.full_name} (${(mergedNote as any).patient?.account_number || (mergedNote as any).patient?.emr || '—'})";
                        font-family: sans-serif;
                        font-size: 9px;
                        color: #404040;
                        border-top: 0.5px solid #a3a3a3;
                        padding-top: 8px;
                        vertical-align: top;
                    }
                    
                    @bottom-center {
                        content: "";
                        border-top: 0.5px solid #a3a3a3;
                        padding-top: 8px;
                        vertical-align: top;
                    }
                    
                    @bottom-right {
                        content: "Page " counter(page);
                        font-family: sans-serif;
                        font-size: 9px;
                        color: #404040;
                        border-top: 0.5px solid #a3a3a3;
                        padding-top: 8px;
                        vertical-align: top;
                    }
                }

                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        transform: none !important;
                        transition: none !important;
                        animation: none !important;
                    }
                    /* High-specificity ancestor reset to bypass Tailwind flexbox/padding overrides */
                    html,
                    body,
                    html body #root,
                    html body #root div:has(#note-print-root),
                    html body #root main:has(#note-print-root) {
                        display: block !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                    }
                    .document-canvas-wrapper { 
                        padding: 0 !important; 
                        background: white !important; 
                        border-radius: 0 !important;
                        min-height: 0 !important;
                        display: block !important;
                    }
                    table#note-print-root.document-page,
                    .document-page {
                        display: table !important;
                        width: 100% !important;
                        max-width: none !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        color: #1e293b !important;
                        background-color: white !important; 
                        padding: 0 !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                    }
                    table#note-print-root > tbody {
                        display: table-row-group !important;
                        width: 100% !important;
                    }
                    table#note-print-root > tbody > tr {
                        display: table-row !important;
                        width: 100% !important;
                    }
                    table#note-print-root > tbody > tr > td {
                        display: table-cell !important;
                        width: 100% !important;
                        padding-top: 0.25in !important;
                        padding-bottom: 0.5in !important;
                        padding-left: 0.3in !important;
                        padding-right: 0.3in !important;
                        box-sizing: border-box !important;
                    }
                    .print-only-footer {
                        display: table-footer-group !important;
                        position: static !important;
                        width: 100% !important;
                    }
                    .page-number::after {
                        content: counter(page) !important;
                    }
                    .document-page .text-slate-400 {
                        color: #94a3b8 !important;
                    }
                    .document-page .text-slate-500,
                    .document-page .text-slate-600 {
                        color: #64748b !important;
                    }
                    .document-page .text-indigo-400 {
                        color: #818cf8 !important;
                    }
                    .document-page .label-small {
                        color: #94a3b8 !important;
                    }
                    .gradient-divider { 
                        background: transparent !important;
                        background-image: none !important;
                        border-bottom: 1.5px solid #cbd5e1 !important; 
                        height: 1px !important;
                        margin: 0.75rem 0 !important;
                    }
                    .print-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    h1, h2, h3, h4, h5, h6, .label-small {
                        break-after: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .no-print { display: none !important; }
                }
                @media screen {
                    table#note-print-root,
                    table#note-print-root > tbody,
                    table#note-print-root > tbody > tr,
                    table#note-print-root > tbody > tr > td {
                        display: block !important;
                    }
                }
            `}</style>



            {/* Time Conflict Warning Banner outside the canvas, on the white background above the grey */}
            {!isConflictLoading && (confidence === 'low' || conflicts.length > 0) && (
                <div className="no-print w-full px-8 pt-0 pb-2.5 bg-white dark:bg-slate-950 flex items-center justify-center -mt-2 md:-mt-4">
                    <div className="w-full max-w-[950px]">
                        <TimeConflictBanner conflicts={conflicts} confidence={confidence} isLoading={isConflictLoading} />
                    </div>
                </div>
            )}

            <div className="document-canvas-wrapper no-print-bg">
                <table id="note-print-root" className="document-page border-collapse">
                    <tbody className="note-content-wrapper">
                        <tr>
                            <td>
                                <div className="space-y-6">
                        {/* Header with Title and Logo */}
                        <div className="flex justify-between items-end w-full border-b border-slate-100 pb-4 mb-2">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none uppercase font-sans">
                                    Progress Note
                                </h1>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    DOS: {formatDosDate(mergedNote.encounter?.dos_date || (mergedNote as any).meta?.dos_date || (mergedNote as any).meta?.visitDate)}
                                </span>
                            </div>
                            {clinicSettings?.logoUrl && (
                                <div className="h-12 flex items-center justify-end">
                                    <img
                                        src={clinicSettings.logoUrl}
                                        alt="Clinic Logo"
                                        className="max-h-full max-w-[180px] object-contain"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Patient & Facility Grid - TIGHTER & ALIGNED */}
                        <div className="grid grid-cols-2 gap-x-8 mb-2 items-start">
                            {/* Left: Patient Info */}
                            <div className="flex flex-col items-start group/patient relative w-full">
                                <div className="absolute -top-6 right-0 no-print opacity-0 group-hover/patient:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(`Patient: ${mergedNote.patient?.full_name}\nDOB: ${mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toLocaleDateString() : '—'}\nCase No: ${mergedNote.patient?.account_number || mergedNote.patient?.case_no || '—'}\nSex: ${mergedNote.patient?.sex_at_birth || '—'}`, "Patient Info", "patient")}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copyingSection === 'patient' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                    >
                                        {copyingSection === 'patient' ? <Check size={12} /> : <Copy size={12} />}
                                        {copyingSection === 'patient' ? 'Copied' : 'Copy Patient'}
                                    </button>
                                </div>
                                <div className="label-small text-slate-400 mb-1 flex items-center h-4">
                                    <User size={11} className="text-indigo-400" />
                                    CLIENT IDENTITY
                                </div>
                                <div className="text-[14px] font-black text-slate-900 dark:text-white mb-0.5 leading-none uppercase tracking-tight flex items-center gap-2 h-5 w-full">
                                    <GhostInput
                                        value={mergedNote.patient?.full_name}
                                        isEditMode={isEditMode}
                                        onChange={(val) => handleUpdateField('patient.full_name', val)}
                                        placeholder="Patient Name"
                                        className="!px-0 !bg-transparent !border-0 !shadow-none !text-[14px] !font-black !text-slate-900 dark:!text-white !uppercase !tracking-tight !h-auto !py-0"
                                    />
                                </div>
                                <div className="space-y-[2px] mt-1 w-full">
                                    <div className="flex items-center gap-1.5 text-[11px] h-[16px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Case No:</span>
                                        <div className="flex items-center">
                                            {isEditMode ? (
                                                <GhostInput
                                                    value={mergedNote.patient?.account_number || mergedNote.patient?.case_no}
                                                    isEditMode={true}
                                                    onChange={(val) => handleUpdateField('patient.account_number', val)}
                                                    placeholder="—"
                                                    className="!px-2 !py-0.5 !text-[12px] !h-6"
                                                />
                                            ) : (
                                                <span className="font-semibold text-slate-800 leading-none">{mergedNote.patient?.account_number || mergedNote.patient?.case_no || "—"}</span>
                                            )}
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-1.5 text-[11px] h-[16px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sex:</span>
                                        <div className="flex items-center">
                                            {isEditMode ? (
                                                <GhostInput
                                                    value={mergedNote.patient?.sex_at_birth}
                                                    isEditMode={true}
                                                    onChange={(val) => handleUpdateField('patient.sex_at_birth', val)}
                                                    placeholder="—"
                                                    className="!px-2 !py-0.5 !text-[12px] !h-6"
                                                />
                                            ) : (
                                                <span className="font-semibold text-slate-800 leading-none">{mergedNote.patient?.sex_at_birth || "—"}</span>
                                            )}
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-1.5 text-[11px] h-[16px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Mobile:</span>
                                        <div className="flex items-center">
                                            {isEditMode ? (
                                                <GhostInput
                                                    value={mergedNote.patient?.phone || mergedNote.patient?.mobile}
                                                    isEditMode={true}
                                                    onChange={(val) => handleUpdateField('patient.phone', val)}
                                                    placeholder="—"
                                                    className="!px-2 !py-0.5 !text-[12px] !h-6"
                                                />
                                            ) : (
                                                <span className="font-semibold text-slate-800 leading-none">{mergedNote.patient?.phone || mergedNote.patient?.mobile || "—"}</span>
                                            )}
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-1.5 text-[11px] h-[16px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">DOB:</span>
                                        <div className="flex items-center gap-1">
                                            {isEditMode ? (
                                                <GhostInput
                                                    type="date"
                                                    value={mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toISOString().split('T')[0] : ''}
                                                    onChange={(val) => handleUpdateField('patient.dob', val)}
                                                    isEditMode={true}
                                                    className="!px-2 !py-0.5 !text-[12px] !h-6"
                                                />
                                            ) : (
                                                <>
                                                    <span className="font-semibold text-slate-800 leading-none">{mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}</span>
                                                    <span className="text-slate-400 font-semibold text-[10px] ml-1 leading-none">({mergedNote.patient?.dob ? Math.floor((new Date().getTime() - new Date(mergedNote.patient.dob + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "--"} years old)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
 
                            {/* Right: Facility Info */}
                            <div className="flex flex-col items-end text-right group/facility relative w-full">
                                <div className="label-small text-slate-400 mb-1 justify-end flex items-center h-4">
                                    FACILITY INFO
                                    <MapPin size={12} className="text-indigo-400" />
                                </div>
                                <div className="text-[14px] font-black text-slate-900 mb-0.5 leading-none uppercase tracking-tight flex items-center justify-end h-5 w-full">
                                    {clinicSettings?.clinicName || "Independent Practice"}
                                </div>
                                <div className="space-y-[2px] mt-1 w-full">
                                    <div className="flex items-center justify-end gap-x-1.5 h-[16px] text-[11px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Fax:</span>
                                        <span className="font-semibold text-slate-800 leading-none">{clinicSettings?.fax || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1.5 h-[16px] text-[11px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Phone:</span>
                                        <span className="font-semibold text-slate-800 leading-none">{clinicSettings?.phone || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1.5 h-[16px] text-[11px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Email:</span>
                                        <span className="font-semibold text-slate-800 leading-none lowercase">{clinicSettings?.email || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1.5 h-[16px] text-[11px]">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Address:</span>
                                        <span className="font-semibold text-slate-800 leading-none max-w-[200px] truncate">{clinicSettings?.address || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="gradient-divider" />



                        {/* Title Sections & Summaries - Dynamic Mapping for Joint Notes */}
                        {(() => {
                            const isJoint = !!(mergedNote.joint_services && mergedNote.joint_services.length > 0);
                            const servicesToRender = (isJoint ? mergedNote.joint_services : [mergedNote]) || [];

                            return servicesToRender.map((svc: any, svcIndex: number) => {
                                const svcSummary = svc.narrative?.summary_notes || svc.narrative?.clinical_narrative || svc.narrative?.summary || svc.narrative?.narrative || svc.summary_notes || svc.summary || svc.clinical_narrative || svc.raw_model_text || "";
                                const pathPrefix = isJoint ? `joint_services.${svcIndex}.` : "";

                                return (
                                    <div key={svcIndex} className="pb-4">
                                        {(() => {
                                            const svcTimeStart = svc.encounter?.time_in || svc.appointment?.start_time || svc.encounter?.start_time;
                                            const svcTimeEnd = svc.encounter?.time_out || svc.appointment?.end_time || svc.encounter?.end_time;
                                            const svcTimeRange = svcTimeStart && svcTimeEnd ? `${svcTimeStart} - ${svcTimeEnd}` : (svcTimeStart || svcTimeEnd || "—");

                                            return (
                                                <>
                                                    <section className="print-section print-avoid">
                                                        <SectionHeader title="VISIT DETAILS" icon={Stethoscope} />
                                                        <div className="grid grid-cols-5 gap-4">
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Date</span>
                                                                <div className="value-text text-[12px] flex items-center justify-center">
                                                                    {isEditMode ? (
                                                                        <input
                                                                            type="date"
                                                                            value={svc.encounter?.dos_date || (svc as any).meta?.visitDate || ''}
                                                                            onChange={(e) => handleUpdateField(`${pathPrefix}encounter.dos_date`, e.target.value)}
                                                                            className="bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11px] font-bold text-indigo-900 rounded-lg hover:bg-white hover:border-indigo-200 transition-all outline-none w-[110px]"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-bold">{formatDosDate(svc.encounter?.dos_date || (svc as any).meta?.visitDate)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">POS</span>
                                                                <div className="value-text text-[12px]">
                                                                    <GhostInput
                                                                        value={svc.encounter?.location_name || (svc.encounter as any)?.place_of_service_name || (((svc.subTemplate || svc._frontend_service_title || mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("otc")) ? "11 - Office" : "12 - Home")}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}encounter.location_name`, val)}
                                                                        className="text-center"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Time Range</span>
                                                                <div className="value-text whitespace-nowrap text-[12px] flex items-center justify-center">
                                                                    {isEditMode ? (
                                                                        <div className="flex items-center gap-1 no-print">
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <button className="text-center px-2 py-1 text-[11px] font-bold w-[85px] bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors text-indigo-900">
                                                                                        {svcTimeStart || "Start"}
                                                                                    </button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-xl bg-white/95 backdrop-blur-md" side="bottom" align="center">
                                                                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-center">
                                                                                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Encounter Start</span>
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <TimeSpinner 
                                                                                            initialTimeStr={svcTimeStart}
                                                                                            onConfirm={(val) => {
                                                                                                handleTimeChange(val, `${pathPrefix}encounter.time_in`, svcTimeStart);
                                                                                                handleTimeBlur(`${pathPrefix}encounter.time_in`, val);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>

                                                                            <span className="text-slate-400 font-bold">-</span>

                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <button className="text-center px-2 py-1 text-[11px] font-bold w-[85px] bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors text-indigo-900">
                                                                                        {svcTimeEnd || "End"}
                                                                                    </button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-xl bg-white/95 backdrop-blur-md" side="bottom" align="center">
                                                                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-center">
                                                                                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Encounter End</span>
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <TimeSpinner 
                                                                                            initialTimeStr={svcTimeEnd}
                                                                                            onConfirm={(val) => {
                                                                                                handleTimeChange(val, `${pathPrefix}encounter.time_out`, svcTimeEnd);
                                                                                                handleTimeBlur(`${pathPrefix}encounter.time_out`, val);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold">{svcTimeRange}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Duration</span>
                                                                <div className="value-text text-[12px] flex items-center justify-center gap-1">
                                                                    <GhostInput
                                                                        value={svc.encounter?.duration}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}encounter.duration`, val)}
                                                                        className="text-center !px-2 !py-0.5 !h-6 !text-[12px] w-12"
                                                                        placeholder="min"
                                                                    />
                                                                    {!isEditMode && <span className="text-[10px] text-slate-400 font-bold">min</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Units</span>
                                                                <div className="value-text">
                                                                    {isEditMode ? (
                                                                        <GhostInput
                                                                            value={svc.encounter?.billing_units || svc.encounter?.units || ''}
                                                                            isEditMode={true}
                                                                            onChange={(val) => {
                                                                                handleUpdateField(`${pathPrefix}encounter.billing_units`, val);
                                                                                handleUpdateField(`${pathPrefix}encounter.units`, val);
                                                                            }}
                                                                            className="text-center !px-2 !py-0.5 !h-6 !text-[11px] w-12"
                                                                            placeholder="0"
                                                                        />
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black border border-indigo-100">
                                                                            {svc.encounter?.billing_units || svc.encounter?.units || 0}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-5 mt-3 pt-3 border-t border-slate-100/60">
                                                                <div className="value-text !text-[16px] font-black text-indigo-950 dark:text-white tracking-tight leading-tight">
                                                                    <GhostInput
                                                                        value={(() => {
                                                                            const rawTitle = svc.services?.service_focus_title || svc.encounter?.sub_template || (mergedNote as any).meta?.subTemplate || "";
                                                                            const subTitle = (svc.subTemplate || svc._frontend_service_title || svc.encounter?.primary_service_provided || "").trim();
                                                                            if (['OTC Obt', 'OTC Comp', 'OTC Sub'].includes(subTitle)) return subTitle;
                                                                            if (subTitle.toLowerCase().includes('otc obt') || rawTitle.toLowerCase().includes('otc obt')) return 'OTC Obt';
                                                                            if (subTitle.toLowerCase().includes('otc comp') || rawTitle.toLowerCase().includes('otc comp')) return 'OTC Comp';
                                                                            if (subTitle.toLowerCase().includes('otc sub') || rawTitle.toLowerCase().includes('otc sub')) return 'OTC Sub';
                                                                            return rawTitle || "TCM Progress Note";
                                                                        })()}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}${svc.services?.service_focus_title ? 'services.service_focus_title' : 'encounter.sub_template'}`, val)}
                                                                        placeholder="Enter encounter subject..."
                                                                        className="!px-0 !bg-transparent !border-0 !shadow-none !text-[16px] !font-black !text-indigo-950 dark:!text-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </section>

                                                    <section className="print-section mt-4 print-avoid">
                                                        <SectionHeader title="INFORMATION & DOMAINS" icon={ListTodo} />
                                                        <div className="mt-0.5 px-0.5">
                                                            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                                                                {TCM_DOMAINS.map((domain) => (
                                                                    <DomainItem
                                                                        key={domain.path}
                                                                        domain={domain}
                                                                        mergedNote={svc}
                                                                        parentTemplateId={mergedNote.template_id || mergedNote.templateId || mergedNote.meta?.template_id}
                                                                        isEditMode={isEditMode}
                                                                        handleUpdateField={(path, val) => handleUpdateField(`${pathPrefix}${path}`, val)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </section>

                                                    <section className="print-section group/section relative pb-2 mt-4">
                                                        <SectionHeader
                                                            title="CLINICAL NARRATIVE"
                                                            icon={ClipboardList}
                                                            onCopy={() => handleCopy(svcSummary || "", "Summary", `summary_${svcIndex}`)}
                                                            isCopied={copyingSection === `summary_${svcIndex}`}
                                                        />
                                                        <div className="mt-1 bg-slate-50/50 dark:!bg-slate-950/40 border border-slate-200/80 dark:!border-slate-800/80 rounded-2xl p-3 relative group/narrative">
                                                            <GhostTextarea
                                                                value={svcSummary}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField(`${pathPrefix}narrative.summary_notes`, val)}
                                                                placeholder="Enter clinical summary..."
                                                                className="value-text !text-[13px] !font-medium leading-relaxed"
                                                            />
                                                        </div>
                                                    </section>
                                                </>
                                            );
                                        })()}
                                    </div>
                                );
                            });
                        })()}

                        {/* Outcome & Plan - Only show if unique or in edit mode */}
                        {(() => {
                            const normalizedSummary = normalizeText(mergedNote.narrative?.summary_notes);
                            const normalizedOutcome = normalizeText(mergedNote.narrative?.outcome_of_services);
                            const normalizedPlan = normalizeText(mergedNote.narrative?.next_steps);

                            const showOutcome = isEditMode || (normalizedOutcome === "" || normalizedOutcome !== normalizedSummary);
                            const showPlan = isEditMode || (normalizedPlan === "" || normalizedPlan !== normalizedSummary);

                            if (!showOutcome && !showPlan) return null;

                            return (
                                <section className="print-section mb-0 print-avoid">
                                    <div className="grid grid-cols-2 gap-2 items-start">
                                        {showOutcome && (
                                            <div className="group/section relative">
                                                <SectionHeader
                                                    title="Outcome"
                                                    icon={Activity}
                                                    onCopy={() => handleCopy(mergedNote.narrative?.outcome_of_services || "", "Outcome", "outcome")}
                                                    isCopied={copyingSection === 'outcome'}
                                                />
                                                <div className="mt-1 p-3 bg-slate-50/30 dark:!bg-slate-950/40 rounded-xl border border-slate-100/50 dark:!border-slate-800/80">
                                                    <GhostTextarea
                                                        value={mergedNote.narrative?.outcome_of_services}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('narrative.outcome_of_services', val)}
                                                        placeholder="Enter outcome..."
                                                        className="value-text !text-[12px] leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {showPlan && (
                                            <div className="group/section relative">
                                                <SectionHeader
                                                    title="Follow-up Plan"
                                                    icon={Calendar}
                                                    onCopy={() => handleCopy(mergedNote.narrative?.next_steps || "", "Plan", "plan")}
                                                    isCopied={copyingSection === 'plan'}
                                                />
                                                <div className="mt-1 p-3 bg-slate-50/30 dark:!bg-slate-950/40 rounded-xl border border-slate-100/50 dark:!border-slate-800/80">
                                                    <GhostTextarea
                                                        value={mergedNote.narrative?.next_steps}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('narrative.next_steps', val)}
                                                        placeholder="Enter next steps..."
                                                        className="value-text !text-[12px] leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            );
                        })()}

                        <section className="print-section mt-2 mb-1 group/diagnoses relative print-avoid">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-0.5">
                                <h2 className="text-[9px] font-black text-slate-900 tracking-[0.25em] uppercase leading-none">Diagnoses</h2>
                            </div>
                            <div className="mt-1 p-2 bg-slate-50/30 dark:!bg-slate-950/40 rounded-xl border border-slate-100/50 dark:!border-slate-800/80">
                                {(() => {
                                    const isOtc = (
                                        (mergedNote.subTemplate || "").toLowerCase().includes("otc") ||
                                        (mergedNote._frontend_service_title || "").toLowerCase().includes("otc") ||
                                        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("otc")
                                    );
                                    const list = Array.isArray(mergedNote.diagnoses) ? mergedNote.diagnoses : [];
                                    const diagnosesToRender = (isOtc && list.length > 0) ? [list[0]] : list;

                                    if (diagnosesToRender.length > 0) {
                                        return (
                                            <div className="space-y-1 w-full">
                                                {diagnosesToRender.map((diag: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 py-1 px-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all group/diag border border-transparent">
                                                        {(isEditMode || diag.icd10) && (
                                                            <div className="diagnoses-badge text-[11px] font-black min-w-[55px] tracking-wider px-2 py-0.5 rounded-md text-center shrink-0 shadow-sm">
                                                                <GhostInput
                                                                    value={diag.icd10}
                                                                    isEditMode={isEditMode}
                                                                    onChange={(val) => {
                                                                        const next = [...list];
                                                                        next[idx] = { ...next[idx], icd10: val };
                                                                        handleUpdateField('diagnoses', next);
                                                                    }}
                                                                    placeholder="CODE"
                                                                    className="text-center"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="value-text flex-1 !font-bold text-slate-700 text-[12px] flex flex-col gap-0.5">
                                                            <GhostInput
                                                                value={diag.name}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => {
                                                                    const next = [...list];
                                                                    next[idx] = { ...next[idx], name: val };
                                                                    handleUpdateField('diagnoses', next);
                                                                }}
                                                                placeholder="Diagnosis name..."
                                                            />
                                                            <span className="text-[10px] text-slate-400 font-bold tracking-tight select-none">
                                                                Type: Rule-Out
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    } else {
                                        return <p className="text-[10px] text-slate-400 text-center py-2">No diagnoses documented</p>;
                                    }
                                })()}
                            </div>
                        </section>

                        {/* Signatures */}
                        <div className="mt-6 pt-4 border-t border-slate-100" style={{ breakInside: 'avoid' }}>
                            <div className="flex items-start gap-4 mb-2">
                                    <History size={14} className="text-indigo-400 mt-1 shrink-0" />
                                    <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed max-w-[550px] opacity-80">
                                        I certify that I provided the above services following all clinical policies, procedures, and ethical guidelines.
                                        This document is the result of an authenticated electronic health record process.
                                    </p>
                            </div>

                            <div className="grid grid-cols-2 gap-16 mt-6">
                                {/* Case Manager */}
                                <div className="space-y-1">
                                    <div
                                        onClick={() => handleSignatureClick('cm')}
                                        className="min-h-[44px] flex items-center justify-center pb-1 cursor-pointer group/sig relative"
                                    >
                                        {(mergedNote.signatures?.cm_signature_path || cmSignatureImg) ? (
                                            <img
                                                src={mergedNote.signatures?.cm_signature_path || cmSignatureImg}
                                                alt="Case Manager Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 opacity-30 group-hover/sig:opacity-70 transition-opacity">
                                                <PenTool className="w-2.5 h-2.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Signature Required</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-b border-slate-200"></div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-0.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight leading-none mb-0.5">
                                                {mergedNote.signatures?.cm_name ||
                                                    (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.name) ||
                                                    "Clinician"}
                                            </span>
                                            {(user as any)?.npi && (
                                                <span className="text-[8px] font-medium text-slate-500 leading-none mb-1">
                                                    {(user as any).npi}
                                                </span>
                                            )}
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Case Manager Signature</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                                {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Date of Signature</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Supervisor */}
                                <div className={`space-y-1 ${((mergedNote as any).signature_status === 'signed' || mergedNote.signatures?.sup_signature_path || supSignatureImg) ? 'opacity-100' : 'opacity-40'}`}>
                                    <div
                                        className="min-h-[44px] flex items-center justify-center pb-1 relative cursor-default"
                                    >
                                        {((mergedNote as any).signature_status === 'signed' && (mergedNote as any).signature_data) ? (
                                            <img
                                                src={(mergedNote as any).signature_data}
                                                alt="Supervisor Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (mergedNote.signatures?.sup_signature_path || supSignatureImg) ? (
                                            <img
                                                src={mergedNote.signatures?.sup_signature_path || supSignatureImg}
                                                alt="Supervisor Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <PenTool className="w-2.5 h-2.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Signature Required</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-b border-slate-200"></div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-0.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight leading-none mb-0.5">
                                                {mergedNote.signatures?.sup_name || clinicSettings?.supervisorName || "Supervisor"}
                                            </span>
                                            {clinicSettings?.supervisorNpi && (
                                                <span className="text-[8px] font-medium text-slate-500 leading-none mb-1">
                                                    {clinicSettings.supervisorNpi}
                                                </span>
                                            )}
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Supervisor Signature</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                                {((mergedNote as any).signature_status === 'signed' && (mergedNote as any).signed_at)
                                                    ? new Date((mergedNote as any).signed_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                                    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Date of Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </td></tr></tbody>
            </table>
            </div>
            <SignatureModal
                isOpen={activeSigType !== null}
                onClose={() => setActiveSigType(null)}
                onSave={handleSaveSignature}
                title={activeSigType === 'cm' ? "Case Manager Signature" : "Supervisor Signature"}
            />
            {isRequestSignatureModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 tracking-tight">Request Supervisor Signature</h3>
                            <button onClick={() => setIsRequestSignatureModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Enter the supervisor's email address below. They will receive a secure link to review and electronically sign this progress note.
                            </p>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Supervisor Email</label>
                            <input
                                type="email"
                                value={supervisorEmailInput}
                                onChange={(e) => setSupervisorEmailInput(e.target.value)}
                                placeholder="dr.smith@clinicflow.com"
                                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsRequestSignatureModalOpen(false)}
                                disabled={isRequestingSignature}
                                className="px-4 py-2 rounded-md font-medium text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestSignature}
                                disabled={isRequestingSignature || !supervisorEmailInput}
                                className="px-4 py-2 rounded-md font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isRequestingSignature ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <SyncErrorModal 
                isOpen={isSyncErrorModalOpen}
                onClose={() => setIsSyncErrorModalOpen(false)}
                errorMessage={syncTask?.error_message}
                onRetry={handleSyncWithEhr}
                isRetrying={isSyncing}
                patientName={mergedNote?.patient?.full_name || (mergedNote as any)?.meta?.patientName}
                visitDate={mergedNote?.encounter?.dos_date || (mergedNote as any)?.date_of_service}
            />
        </div>
    );
};

export default TcmNoteShell;
