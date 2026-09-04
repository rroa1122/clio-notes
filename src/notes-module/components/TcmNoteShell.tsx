import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ClioNote, Template } from '../types';
import { storage } from '../lib/storage';
import { DEFAULT_TEMPLATES, TCM_DOMAINS } from '../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { 
    Save, CheckCircle2, CheckCircle, X, PenTool, Plus, Trash2, Copy, Check, AlertCircle, Lock,
    Calendar, Printer, Edit3, FileText, User, Activity, ClipboardList, MapPin, Clock, 
    Stethoscope, Briefcase, Info, ListTodo, History, Cpu, RefreshCw, ArrowLeft, Building2
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
    const domainKey = domain.path.split('.').pop() || '';

    // 1. First priority: explicit domain assignment from n8n / DB / state
    if (mergedNote.services?.domains_selected && typeof mergedNote.services.domains_selected[domainKey] === 'boolean') {
        isChecked = mergedNote.services.domains_selected[domainKey];
    } else if (Array.isArray(mergedNote.domains) && mergedNote.domains.length > 0) {
        isChecked = mergedNote.domains.includes(domainKey);
    } else if (isVaccinationAssistanceNote || isOtcNote) {
        isChecked = domain.path === 'services.domains_selected.2_physical_health_medical_dental';
    } else if (isHurricaneNote) {
        isChecked = domain.path === 'services.domains_selected.12_other';
    } else if (isStsNote || isDppNote) {
        isChecked = domain.path === 'services.domains_selected.10_transportation';
    } else if (isMhvNote) {
        isChecked = domainKey === '1_mental_health_substance_abuse' || Boolean(mergedNote.services?.domains_selected?.[domainKey]);
    } else if (isLtcNote) {
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
                className="flex items-center gap-2.5 py-1 px-1.5 transition-all group rounded-lg cursor-default"
            >
                <div className={`size-4 flex items-center justify-center shrink-0 rounded border transition-all ${isChecked ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-transparent border-slate-300 dark:border-slate-700/80 text-transparent'}`}>
                    {isChecked && <Check size={10} className="text-white stroke-[3.5]" />}
                </div>
                <span className={`text-[10.5px] select-none transition-colors ${isChecked ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>
                    {domain.label}
                </span>
            </div>
            {isChecked && isOtcNote && domain.path === 'services.domains_selected.2_physical_health_medical_dental' && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border border-indigo-500 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[3.5]" />
                    </div>
                    <span className="text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-300">
                        Over the counter (OTC) medications.
                    </span>
                </div>
            )}
            {isChecked && isStsNote && domain.path === 'services.domains_selected.10_transportation' && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border border-indigo-500 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[3.5]" />
                    </div>
                    <span className="text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-300">
                        Special Transportation Services (STS).
                    </span>
                </div>
            )}
            {isChecked && isDppNote && domain.path === 'services.domains_selected.10_transportation' && (
                <div className="pl-6 flex items-center gap-2 py-0.5 select-none">
                    <div className="size-3.5 flex items-center justify-center rounded border border-indigo-500 bg-indigo-600 text-white">
                        <Check size={8} className="stroke-[3.5]" />
                    </div>
                    <span className="text-[9.5px] font-medium text-indigo-300 dark:text-indigo-300">
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
                    className={`w-full transition-all duration-200 bg-slate-900/40 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-slate-100 placeholder:text-slate-500 focus:bg-slate-900/80 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 outline-none ${className}`}
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
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [noteOverrides, setNoteOverrides] = useState<any>({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(
        (note as any)?.id || (note as any)?._id || (note as any)?.noteId || null
    );
    const [isSaved, setIsSaved] = useState(
        !!((note as any)?.id || (note as any)?._id || (note as any)?.noteId)
    );
    const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

    const [cmSignatureImg, setCmSignatureImg] = useState<string | null>(null);
    const [supSignatureImg, setSupSignatureImg] = useState<string | null>(null);
    const [activeSigType, setActiveSigType] = useState<'cm' | 'sup' | null>(null);
    const [copyingSection, setCopyingSection] = useState<string | null>(null);

    useEffect(() => {
        const currentId = (note as any)?.id || (note as any)?._id || (note as any)?.noteId;
        if (currentId) {
            setLastSavedId(currentId);
            setIsSaved(true);
        }
    }, [(note as any)?.id, (note as any)?._id, (note as any)?.noteId]);

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

    const lastNotifiedTaskRef = React.useRef<string | null>(null);

    const loadSyncStatus = React.useCallback(async () => {
        const noteIdToSync = note?.id || lastSavedId;
        if (!noteIdToSync) return;
        try {
            const { data, error } = await supabase
                .from('amexzone_note_tasks')
                .select('id, status, error_message, result_summary')
                .eq('note_id', noteIdToSync)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setSyncTask(data || null);

            // Parse result_summary JSON if available
            let parsedSummary: any = null;
            if (data?.result_summary) {
                try {
                    parsedSummary = typeof data.result_summary === 'string' ? JSON.parse(data.result_summary) : data.result_summary;
                } catch (e) {}
            }

            // If task just completed and adjusted times were saved, sync state back into Clio
            if (data && data.status === 'completed' && parsedSummary?.time_adjusted && lastNotifiedTaskRef.current !== data.id) {
                lastNotifiedTaskRef.current = data.id;
                
                const { data: updatedDbNote } = await supabase
                    .from('notes')
                    .select('content')
                    .eq('id', noteIdToSync)
                    .maybeSingle();

                if (updatedDbNote && updatedDbNote.content) {
                    const freshContent = updatedDbNote.content;
                    const jointSvcs = freshContent.joint_services || [];
                    setNoteOverrides((prev: any) => {
                        const next = {
                            ...prev,
                            encounter: freshContent.encounter,
                            joint_services: jointSvcs
                        };
                        jointSvcs.forEach((js: any, idx: number) => {
                            next[`joint_services.${idx}.encounter.time_in`] = js.encounter?.time_in;
                            next[`joint_services.${idx}.encounter.time_out`] = js.encounter?.time_out;
                            next[`joint_services.${idx}.encounter.time_range`] = js.encounter?.time_range;
                        });
                        if (freshContent.encounter) {
                            next['encounter.time_in'] = freshContent.encounter.time_in;
                            next['encounter.time_out'] = freshContent.encounter.time_out;
                            next['encounter.time_range'] = freshContent.encounter.time_range;
                        }
                        return next;
                    });

                    const actualSvcs = parsedSummary.actual_services || [];
                    const summaryTimes = actualSvcs.map((s: any) => `${s.nombre || `Servicio #${s.servicio_num}`}: ${s.hora_inicio?.slice(0, 5)} - ${s.hora_fin?.slice(0, 5)}`).join(', ');
                    toast.info(`🕒 Horarios actualizados en Clio para coincidir con Amexzone${summaryTimes ? ` (${summaryTimes})` : ''}`, {
                        duration: 7000
                    });
                }
            }
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
            
            // Synchronize DOS / Visit Date across note when updated
            const isDosUpdate = path === 'encounter.dos_date' || path === 'meta.visitDate' || path === 'meta.dos_date' || /^joint_services\.\d+\.encounter\.dos_date$/.test(path);
            if (isDosUpdate) {
                next['encounter.dos_date'] = newValue;
                next['meta.dos_date'] = newValue;
                next['meta.visitDate'] = newValue;
                
                // If editing primary, top-level, or first visit date, cascade date to all joint services
                if (path === 'encounter.dos_date' || path === 'meta.visitDate' || path === 'joint_services.0.encounter.dos_date') {
                    if (mergedNote.joint_services && Array.isArray(mergedNote.joint_services)) {
                        mergedNote.joint_services.forEach((_: any, idx: number) => {
                            next[`joint_services.${idx}.encounter.dos_date`] = newValue;
                        });
                    }
                }
            }

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

    const handleApplySuggestedTimeAndRetry = async (suggestedTime: string) => {
        try {
            const errorMsg = syncTask?.error_message || '';
            const currentJointServices = mergedNote?.joint_services || [];
            
            // 1. Identify which service suffered the collision
            let targetServiceIndex = 0;
            const idxMatch = errorMsg.match(/\[SERVICE_INDEX:(\d+)\]/i);
            const numMatch = errorMsg.match(/Servicio\s*#(\d+)/i);
            
            if (idxMatch) {
                targetServiceIndex = parseInt(idxMatch[1], 10);
            } else if (numMatch) {
                targetServiceIndex = Math.max(0, parseInt(numMatch[1], 10) - 1);
            } else if (currentJointServices.length > 1) {
                // Check if any specific joint service time is referenced in the error message
                const matchedIdx = currentJointServices.findIndex((js: any) => {
                    const jsIn = js.encounter?.time_in || js.appointment?.start_time;
                    return jsIn && errorMsg.includes(jsIn);
                });
                if (matchedIdx !== -1) {
                    targetServiceIndex = matchedIdx;
                }
            }

            // 2. Get duration for the target service
            const targetSvc = (currentJointServices.length > targetServiceIndex)
                ? currentJointServices[targetServiceIndex]
                : mergedNote;
            const currentEncounter = targetSvc?.encounter || mergedNote?.encounter || {};
            const dur = parseInt(currentEncounter.duration || '60', 10) || 60;
            
            // 3. Calculate time_out from suggestedTime + duration
            let tOut = '';
            const match = suggestedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
                let h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                const mer = (match[3] || 'AM').toUpperCase();
                if (mer === 'PM' && h < 12) h += 12;
                if (mer === 'AM' && h === 12) h = 0;
                const totalMins = h * 60 + m + dur;
                let endH = Math.floor(totalMins / 60) % 24;
                const endM = totalMins % 60;
                const endMer = endH >= 12 ? 'PM' : 'AM';
                let endH12 = endH % 12;
                if (endH12 === 0) endH12 = 12;
                tOut = `${String(endH12).padStart(2, '0')}:${String(endM).padStart(2, '0')} ${endMer}`;
            }

            const timeRangeStr = tOut ? `${suggestedTime} - ${tOut}` : suggestedTime;

            let updatedEncounter: any = mergedNote?.encounter || {};
            if (targetServiceIndex === 0) {
                updatedEncounter = {
                    ...updatedEncounter,
                    time_in: suggestedTime,
                    time_out: tOut || updatedEncounter.time_out,
                    time_range: timeRangeStr
                };
            }

            const updatedJointServices = currentJointServices.map((js: any, idx: number) => {
                if (idx === targetServiceIndex) {
                    return {
                        ...js,
                        encounter: {
                            ...(js.encounter || {}),
                            time_in: suggestedTime,
                            time_out: tOut || js.encounter?.time_out,
                            time_range: timeRangeStr
                        }
                    };
                }
                return js;
            });

            const targetId = lastSavedId || (note as any)?.id;
            const updatedNote = {
                ...mergedNote,
                id: targetId,
                encounter: updatedEncounter,
                joint_services: updatedJointServices
            };

            setNoteOverrides((prev: any) => {
                const next = {
                    ...prev,
                    encounter: updatedEncounter,
                    joint_services: updatedJointServices,
                    [`joint_services.${targetServiceIndex}.encounter.time_in`]: suggestedTime,
                    [`joint_services.${targetServiceIndex}.encounter.time_out`]: tOut,
                    [`joint_services.${targetServiceIndex}.encounter.time_range`]: timeRangeStr,
                };
                if (targetServiceIndex === 0) {
                    next['encounter.time_in'] = suggestedTime;
                    next['encounter.time_out'] = tOut;
                    next['encounter.time_range'] = timeRangeStr;
                }
                return next;
            });

            try {
                const saved = await storage.saveAnalyzedNote(updatedNote);
                if (saved && saved.id) {
                    setLastSavedId(saved.id);
                }
            } catch (saveErr) {
                console.error("Error saving updated note to storage:", saveErr);
            }

            const svcLabel = currentJointServices.length > 1 ? `Servicio #${targetServiceIndex + 1}` : 'Encuentro';
            toast.success(`Horario de ${svcLabel} actualizado a ${timeRangeStr}. Sincronizando con Amexzone...`);
            
            await handleSyncWithEhr(updatedNote);
        } catch (e) {
            console.error('Error applying suggested time:', e);
            handleSyncWithEhr();
        }
    };

    const handleSyncWithEhr = async (overrideNote?: any) => {
        // Disregard React MouseEvent or non-note objects passed by button onClick handlers
        const isEvent = overrideNote && (overrideNote.nativeEvent || overrideNote.target || typeof overrideNote.preventDefault === 'function');
        const effectiveOverride = (isEvent || !overrideNote || typeof overrideNote !== 'object') ? null : overrideNote;
        const note = (effectiveOverride || mergedNote) as any;
        let noteIdToSync = note.id || lastSavedId;

        // Auto-save using duplicate-safe saveAnalyzedNote if no ID is present yet
        if (!noteIdToSync) {
            try {
                const autoSaved = await storage.saveAnalyzedNote(note);
                if (autoSaved && autoSaved.id) {
                    noteIdToSync = autoSaved.id;
                    setLastSavedId(autoSaved.id);
                    setIsSaved(true);
                    if (onSaveComplete) onSaveComplete(true);
                }
            } catch (autoErr) {
                console.error("Auto-save before sync error:", autoErr);
            }
        }

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
                templateId === 'tcm_sts_obtain_note' ||
                templateId === 'tcm_sts_complete_note' ||
                templateId === 'tcm_sts_submit_pcp_note' ||
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
                    isChecked = domain.path === 'services.domains_selected.11_legal_immigration';
                } else if (isHousingAssistanceNote) {
                    isChecked = domain.path === 'services.domains_selected.7_housing_shelter';
                } else if (isSnapRecertificationNote) {
                    isChecked = domain.path === 'services.domains_selected.8_economic_financial';
                } else {
                    const domainKey = domain.path.split('.').pop() || '';
                    isChecked = Boolean(note.services?.domains_selected?.[domainKey]);
                }

                if (isChecked) {
                    const domainKey = domain.path.split('.').pop() || '';
                    activeDomains.push(domainKey);
                }
            });

            // If no domains selected via rules, fallback to checking raw domains_selected object
            if (activeDomains.length === 0 && note.services?.domains_selected) {
                Object.entries(note.services.domains_selected).forEach(([key, val]) => {
                    if (val) activeDomains.push(key);
                });
            }

            // Default fallback if still empty
            if (activeDomains.length === 0) {
                activeDomains.push('1_mental_health_substance_abuse');
            }

            const extractSummaryNotes = (svc: any): string => {
                if (!svc) return "";
                if (svc.narrative?.summary_notes && typeof svc.narrative.summary_notes === 'string' && svc.narrative.summary_notes.trim()) {
                    return svc.narrative.summary_notes.trim();
                }
                if (svc.narrative?.clinical_narrative && typeof svc.narrative.clinical_narrative === 'string' && svc.narrative.clinical_narrative.trim()) {
                    return svc.narrative.clinical_narrative.trim();
                }
                if (svc.narrative?.summary && typeof svc.narrative.summary === 'string' && svc.narrative.summary.trim()) {
                    return svc.narrative.summary.trim();
                }
                if (svc.summary_notes && typeof svc.summary_notes === 'string' && svc.summary_notes.trim()) {
                    return svc.summary_notes.trim();
                }
                if (svc.clinical_narrative && typeof svc.clinical_narrative === 'string' && svc.clinical_narrative.trim()) {
                    return svc.clinical_narrative.trim();
                }
                if (svc.narratives?.assessment && typeof svc.narratives.assessment === 'string' && svc.narratives.assessment.trim()) {
                    return svc.narratives.assessment.trim();
                }
                if (svc.narrative?.assessment && typeof svc.narrative.assessment === 'string' && svc.narrative.assessment.trim()) {
                    return svc.narrative.assessment.trim();
                }
                if (svc.notes && typeof svc.notes === 'string' && svc.notes.trim()) {
                    return svc.notes.trim();
                }
                if (svc.joint_services && Array.isArray(svc.joint_services) && svc.joint_services.length > 0) {
                    const nestedTexts = svc.joint_services
                        .map((sub: any) => extractSummaryNotes(sub))
                        .filter((t: string) => Boolean(t.trim()));
                    if (nestedTexts.length > 0) {
                        return nestedTexts.join('\n\n');
                    }
                }
                return "";
            };

            const globalOutcomeText = (
                (mergedNote as any)?.narrative?.outcome_of_services ||
                (mergedNote as any)?.outcome_of_services ||
                (mergedNote as any)?.narrative?.outcome ||
                (note as any)?.narrative?.outcome_of_services ||
                (note as any)?.outcome_of_services ||
                (note as any)?.narrative?.outcome ||
                ""
            );

            const globalNextStepsText = (
                (mergedNote as any)?.narrative?.next_steps ||
                (mergedNote as any)?.next_steps ||
                (mergedNote as any)?.narrative?.plan ||
                (note as any)?.narrative?.next_steps ||
                (note as any)?.next_steps ||
                (note as any)?.narrative?.plan ||
                ""
            );

            // Universal Service Flattening:
            // Flatten nested joint_services so every clinical sub-service is dispatched with its exact title, times and narrative
            const flattenedServicesList: any[] = [];
            const rawServices = (note.joint_services && note.joint_services.length > 0)
                ? note.joint_services
                : [note];

            rawServices.forEach((s: any) => {
                if (s.joint_services && Array.isArray(s.joint_services) && s.joint_services.length > 0) {
                    s.joint_services.forEach((sub: any) => {
                        flattenedServicesList.push({
                            ...sub,
                            parentServiceTitle: s._frontend_service_title || s.services?.service_focus_title || s.subTemplate,
                            parentTemplateId: s.template_id,
                            narrative: {
                                ...(sub.narrative || {}),
                                summary_notes: extractSummaryNotes(sub) || extractSummaryNotes(s),
                                outcome_of_services: sub.narrative?.outcome_of_services || s.narrative?.outcome_of_services || globalOutcomeText,
                                next_steps: sub.narrative?.next_steps || s.narrative?.next_steps || globalNextStepsText
                            }
                        });
                    });
                } else {
                    flattenedServicesList.push({
                        ...s,
                        narrative: {
                            ...(s.narrative || {}),
                            summary_notes: extractSummaryNotes(s),
                            outcome_of_services: s.narrative?.outcome_of_services || globalOutcomeText,
                            next_steps: s.narrative?.next_steps || globalNextStepsText
                        }
                    });
                }
            });

            const todayDateStr = new Date().toISOString().split('T')[0];
            const primaryVisitDate = note.joint_services?.[0]?.encounter?.dos_date
                || note.encounter?.dos_date 
                || note.service_date 
                || note.date_of_service 
                || note.meta?.dos_date 
                || note.meta?.service_date 
                || note.meta?.visitDate 
                || todayDateStr;

            const patAny = (note.patient as any) || {};

            const calculateEndTime = (timeInStr: string, durationMin: number): string => {
                if (!timeInStr) return "10:15 AM";
                const match = timeInStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                if (!match) return "10:15 AM";
                let h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                const mer = (match[3] || 'AM').toUpperCase();
                if (mer === 'PM' && h < 12) h += 12;
                if (mer === 'AM' && h === 12) h = 0;
                
                const totalMinutes = h * 60 + m + (durationMin > 0 ? durationMin : 15);
                let outH = Math.floor(totalMinutes / 60) % 24;
                const outM = totalMinutes % 60;
                const outMer = outH >= 12 ? 'PM' : 'AM';
                outH = outH % 12;
                if (outH === 0) outH = 12;
                return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')} ${outMer}`;
            };

            const compiledServices = flattenedServicesList.map((svc: any) => {
                let svcDomains = activeDomains;
                if (svc.services?.domains_selected) {
                    const customDomains: string[] = [];
                    TCM_DOMAINS.forEach(domain => {
                        const directKey = domain.path.split('.').pop()!;
                        if (svc.services?.domains_selected?.[directKey]) {
                            customDomains.push(directKey);
                        }
                    });
                    if (customDomains.length > 0) {
                        svcDomains = customDomains;
                    }
                } else if (Array.isArray(svc.domains) && svc.domains.length > 0) {
                    svcDomains = svc.domains;
                }

                const svcTitle = svc.services?.service_focus_title 
                    || svc.subTemplate 
                    || svc.encounter?.sub_template 
                    || svc._frontend_service_title 
                    || svc.parentServiceTitle
                    || svc.encounter?.primary_service_provided 
                    || (svc === mergedNote ? (mergedNote.services?.service_focus_title || mergedNote.subTemplate) : "")
                    || "TCM Progress Note";

                const svcTimeIn = svc.encounter?.time_in || svc.appointment?.start_time || svc.encounter?.start_time || "10:00 AM";
                const svcDur = svc.encounter?.duration_minutes || svc.encounter?.duration || "15";
                let svcTimeOut = svc.encounter?.time_out || svc.appointment?.end_time || svc.encounter?.end_time || "";
                if (!svcTimeOut) {
                    svcTimeOut = calculateEndTime(svcTimeIn, parseInt(String(svcDur), 10) || 15);
                }
                const svcUnits = svc.encounter?.billing_units || svc.encounter?.units || String(Math.max(1, Math.round((parseInt(String(svcDur), 10) || 15) / 15)));
                const svcPos = svc.encounter?.pos || "11 - Office";

                const summaryNotes = extractSummaryNotes(svc);

                return {
                    service_type: svcTitle,
                    encounter: {
                        dos_date: svc.encounter?.dos_date || primaryVisitDate,
                        time_in: svcTimeIn,
                        time_out: svcTimeOut,
                        duration: svcDur,
                        units: svcUnits,
                        pos: svcPos
                    },
                    narrative: {
                        summary_notes: summaryNotes,
                        outcome_of_services: svc.narrative?.outcome_of_services || svc.outcome_of_services || globalOutcomeText || "",
                        next_steps: svc.narrative?.next_steps || svc.next_steps || globalNextStepsText || ""
                    },
                    domains: svcDomains
                };
            });

            // Pre-Sync Safety Validation:
            const totalTextLength = compiledServices.reduce((acc: number, s: any) => acc + (s.narrative?.summary_notes?.length || 0), 0);
            if (totalTextLength === 0) {
                toast.error(
                    language === 'es'
                        ? 'La nota no contiene texto en la narrativa clínica (Summary Notes). Por favor completa el contenido antes de sincronizar.'
                        : 'The note contains no clinical narrative text. Please complete the content before synchronizing.',
                    { duration: 6000 }
                );
                return;
            }

            // Construct single unified payload with all services
            const payload = {
                patient_emr_id: patAny.emr_id || patAny.id || patAny.account_number || (patAny.emr ? patAny.emr.replace(/\D/g, '') : '') || "",
                amexzone_id: patAny.amexzone_id || patAny.id_amexzone || "",
                patient_id: patAny.id || "",
                patient_name: patAny.full_name || "",
                patient_dob: patAny.dob || "",
                visit_date: primaryVisitDate,
                services: compiledServices,
                outcome_of_services: globalOutcomeText,
                next_steps: globalNextStepsText,
                // Top-level fallbacks for backward compatibility
                encounter: compiledServices[0]?.encounter || {},
                narrative: {
                    ...(compiledServices[0]?.narrative || {}),
                    summary_notes: compiledServices[0]?.narrative?.summary_notes || "",
                    outcome_of_services: globalOutcomeText,
                    next_steps: globalNextStepsText
                },
                domains: compiledServices[0]?.domains || activeDomains,
                service_type: compiledServices[0]?.service_type || ""
            };

            const { error: insertError } = await supabase
                .from('amexzone_note_tasks')
                .insert({
                    note_id: noteIdToSync,
                    user_id: user?.id,
                    clinic_id: user?.clinic_id || clinicSettings?.id || null,
                    patient_name: mergedNote.patient?.full_name || note.patient?.full_name || 'Desconocido',
                    patient_dob: mergedNote.patient?.dob || note.patient?.dob || null,
                    visit_date: primaryVisitDate,
                    note_text: '[TCM_PROGRESS_NOTE]\n' + JSON.stringify(payload),
                    status: 'pending'
                });

            if (insertError) throw insertError;

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
                <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] no-print max-w-[95vw]">
                    <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/40 rounded-full transition-all duration-300">
                        <button
                            disabled={isSigned}
                            onClick={() => setIsEditMode(!isEditMode)}
                            title={isSigned ? 'Note is Locked' : (isEditMode ? 'Done Editing' : 'Edit Note')}
                            className={`size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
                                isSigned
                                ? 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border/40'
                                : isEditMode 
                                ? 'bg-foreground text-background shadow-md active:scale-95' 
                                : 'bg-transparent text-foreground hover:bg-secondary border border-transparent hover:border-border/60 active:scale-95'
                            }`}
                        >
                            {isSigned ? <Lock size={15} /> : (isEditMode ? <Check size={15} /> : <Edit3 size={15} />)}
                            <span className="hidden sm:inline">{isSigned ? 'Locked' : (isEditMode ? 'Done' : 'Edit')}</span>
                        </button>
 
                        <div className="w-[1px] h-4 sm:h-5 bg-border/80 mx-0.5" />
 
                        <button
                            onClick={handlePrint}
                            title="Print Note"
                            className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-transparent text-foreground hover:bg-secondary hover:text-primary font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-border/60 active:scale-95 cursor-pointer group shrink-0"
                        >
                            <Printer size={15} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Print</span>
                        </button>

                        <div className="w-[1px] h-4 sm:h-5 bg-border/80 mx-0.5" />

                        {(() => {
                            const isPending = syncTask?.status === 'pending';
                            const isProcessing = isSyncing || syncTask?.status === 'processing';
                            const isCompleted = syncTask?.status === 'completed';
                            const isFailed = syncTask?.status === 'failed';

                            if (isFailed) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => setIsSyncErrorModalOpen(true)}
                                        title="Sync Failed - Click for details"
                                        className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-rose-500/20 active:scale-95 cursor-pointer shadow-sm shrink-0"
                                    >
                                        <AlertCircle size={15} className="text-rose-500 animate-pulse" />
                                        <span className="hidden sm:inline">Sync Failed (Details)</span>
                                    </button>
                                );
                            }

                            if (isCompleted) {
                                return (
                                    <button
                                        onClick={handleSyncWithEhr}
                                        title="Note synchronized with Amexzone. Click to re-sync."
                                        className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-emerald-500/20 active:scale-95 cursor-pointer group shrink-0"
                                    >
                                        <CheckCircle2 size={15} className="text-emerald-500" />
                                        <span className="hidden sm:inline">Synced</span>
                                    </button>
                                );
                            }

                            if (isPending) {
                                return (
                                    <button
                                        disabled
                                        title="In Queue..."
                                        className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-amber-500/20 opacity-90 cursor-not-allowed animate-pulse shrink-0"
                                    >
                                        <RefreshCw size={15} className="animate-spin text-amber-500" />
                                        <span className="hidden sm:inline">In Queue...</span>
                                    </button>
                                );
                            }

                            if (isProcessing) {
                                return (
                                    <button
                                        disabled
                                        title="Syncing with EHR..."
                                        className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-cyan-500/20 opacity-90 cursor-not-allowed animate-pulse shrink-0"
                                    >
                                        <RefreshCw size={15} className="animate-spin text-cyan-500" />
                                        <span className="hidden sm:inline">Syncing...</span>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    onClick={handleSyncWithEhr}
                                    title="Sync with EHR"
                                    className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-transparent text-foreground hover:bg-secondary hover:text-cyan-500 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-border/60 active:scale-95 cursor-pointer group shrink-0"
                                >
                                    <Cpu size={15} className="group-hover:scale-110 transition-transform text-cyan-500" />
                                    <span className="hidden sm:inline">Sync</span>
                                </button>
                            );
                        })()}
 
                        {!isSigned && (
                            <>
                                <div className="w-[1px] h-4 sm:h-5 bg-border/80 mx-0.5" />
 
                                <button
                                    onClick={handleSaveNote}
                                    disabled={isSaving}
                                    title={isSaving ? 'Saving...' : (isSaved ? 'Saved' : 'Save Note')}
                                    className={`size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-5 sm:py-2 rounded-full font-bold whitespace-nowrap text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
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
                                    <span className="hidden sm:inline">{isSaving ? 'Saving' : (isSaved ? 'Saved' : 'Save')}</span>
                                </button>
 
                                <div className="w-[1px] h-4 sm:h-5 bg-border/80 mx-0.5" />
 
                                <button
                                    onClick={() => setIsRequestSignatureModalOpen(true)}
                                    title="Sign Note"
                                    className="size-9 sm:size-auto flex items-center justify-center gap-1.5 sm:px-4 sm:py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
                                >
                                    <PenTool size={15} />
                                    <span className="hidden sm:inline">Sign</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap');

                .document-canvas-wrapper { 
                    background: transparent !important;
                    padding: 0 !important; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    min-height: auto;
                    border-radius: 0;
                }

                .document-page { 
                    background-color: white; 
                    width: 100%; 
                    max-width: 100%; 
                    min-height: 11in; 

                    padding: 0.5in 0.6in; 
                    box-shadow: 0 20px 45px -15px rgba(0,0,0,0.06);
                    border: 1px solid #e2e8f0; 
                    border-radius: 2rem;
                    position: relative; 
                    margin-bottom: 4rem; 
                    /* PREMIUM TYPOGRAPHY */
                    font-family: 'Inter', sans-serif !important;
                    color: #1e293b;
                    line-height: 1.6;
                    transition: all 0.3s ease;
                }

                @media screen and (max-width: 640px) {
                    .document-page {
                        padding: 1.25rem 0.875rem !important;
                        border-radius: 1.25rem !important;
                        margin-bottom: 2rem !important;
                        min-height: auto !important;
                    }
                }

                /* ON-SCREEN DARK MODE PREVIEW - FORCES WHITE BACKGROUND ONLY WHEN PRINTING */
                .dark .document-canvas-wrapper {
                    background: transparent !important;
                }
                .dark .document-page { 
                    background-color: #070c18 !important; 
                    color: #cbd5e1 !important; 
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    border-radius: 1.5rem !important;
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
                .dark .document-page .border-slate-50,
                .dark .document-page .border-slate-100,
                .dark .document-page .border-slate-200,
                .dark .document-page .border-slate-300 {
                    border-color: rgba(51, 65, 85, 0.5) !important;
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



            {/* Time Conflict Warning Banner */}
            {!isConflictLoading && (confidence === 'low' || conflicts.length > 0) && (
                <div className="no-print w-full pb-4 flex items-center justify-center">
                    <div className="w-full max-w-[1050px]">
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
                        <div className="flex justify-between items-end w-full border-b border-slate-100 pb-3 sm:pb-4 mb-2">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-[20px] sm:text-[26px] font-black text-slate-900 tracking-tight leading-none uppercase font-sans">
                                    Progress Note
                                </h1>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    DOS: {formatDosDate(mergedNote.joint_services?.[0]?.encounter?.dos_date || mergedNote.encounter?.dos_date || (mergedNote as any).meta?.dos_date || (mergedNote as any).meta?.visitDate || (mergedNote as any).appointment?.date_of_service)}
                                </span>
                            </div>
                            {clinicSettings?.logoUrl && (
                                <div className="h-10 sm:h-12 flex items-center justify-end">
                                    <img
                                        src={clinicSettings.logoUrl}
                                        alt="Clinic Logo"
                                        className="max-h-full max-w-[120px] sm:max-w-[180px] object-contain"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Patient & Facility Grid - SIDE BY SIDE 2-COLUMN COMPACT */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-x-8 mb-2 items-start">
                            {/* Left: Patient Info */}
                            <div className="flex flex-col items-start group/patient relative w-full min-w-0">
                                <div className="absolute -top-6 right-0 no-print opacity-0 group-hover/patient:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(`Patient: ${mergedNote.patient?.full_name}\nDOB: ${mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toLocaleDateString() : '—'}\nCase No: ${mergedNote.patient?.account_number || mergedNote.patient?.case_no || '—'}\nSex: ${mergedNote.patient?.sex_at_birth || '—'}`, "Patient Info", "patient")}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded transition-colors ${copyingSection === 'patient' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[9px] sm:text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                    >
                                        {copyingSection === 'patient' ? <Check size={11} /> : <Copy size={11} />}
                                        <span className="hidden sm:inline">{copyingSection === 'patient' ? 'Copied' : 'Copy Patient'}</span>
                                    </button>
                                </div>
                                <div className="label-small text-slate-400 mb-1 flex items-center gap-1 h-4 text-[9px] sm:text-[10px]">
                                    <User size={11} className="text-indigo-400 shrink-0" />
                                    <span className="tracking-wider font-bold">CLIENT</span>
                                </div>
                                {isEditMode ? (
                                    <div className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 sm:p-2.5 space-y-1.5 sm:space-y-2 mt-0.5">
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={mergedNote.patient?.full_name || ''}
                                                onChange={(e) => handleUpdateField('patient.full_name', e.target.value)}
                                                placeholder="Patient Full Name"
                                                className="w-full bg-transparent border-0 border-b border-slate-700/60 focus:border-indigo-400 pb-1 text-[11px] sm:text-[13px] font-black text-slate-100 uppercase tracking-tight outline-none placeholder:text-slate-500 truncate"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-x-2 sm:gap-y-1.5 pt-0.5">
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[9px] min-w-[34px] sm:min-w-[50px]">Case:</span>
                                                <input
                                                    type="text"
                                                    value={mergedNote.patient?.account_number || mergedNote.patient?.case_no || ''}
                                                    onChange={(e) => handleUpdateField('patient.account_number', e.target.value)}
                                                    placeholder="—"
                                                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-200 outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[9px] min-w-[26px] sm:min-w-[32px]">Sex:</span>
                                                <input
                                                    type="text"
                                                    value={mergedNote.patient?.sex_at_birth || ''}
                                                    onChange={(e) => handleUpdateField('patient.sex_at_birth', e.target.value)}
                                                    placeholder="—"
                                                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-200 outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[9px] min-w-[34px] sm:min-w-[50px]">Tel:</span>
                                                <input
                                                    type="text"
                                                    value={mergedNote.patient?.phone || mergedNote.patient?.mobile || ''}
                                                    onChange={(e) => handleUpdateField('patient.phone', e.target.value)}
                                                    placeholder="—"
                                                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-200 outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[9px] min-w-[26px] sm:min-w-[32px]">DOB:</span>
                                                <input
                                                    type="date"
                                                    value={mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleUpdateField('patient.dob', e.target.value)}
                                                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-md px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-200 outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[12px] sm:text-[14px] font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight flex items-center w-full mb-0.5 h-5 min-w-0" title={mergedNote.patient?.full_name || '—'}>
                                            <span className="truncate">{mergedNote.patient?.full_name || '—'}</span>
                                        </div>
                                        <div className="w-full space-y-[2px] mt-1 min-w-0">
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] h-[16px] min-w-0">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Case:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">{mergedNote.patient?.account_number || mergedNote.patient?.case_no || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] h-[16px] min-w-0">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Sex:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">{mergedNote.patient?.sex_at_birth || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] h-[16px] min-w-0">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Tel:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">{mergedNote.patient?.phone || mergedNote.patient?.mobile || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] h-[16px] min-w-0">
                                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">DOB:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none whitespace-nowrap">
                                                    {mergedNote.patient?.dob ? new Date(mergedNote.patient.dob + 'T12:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "—"}
                                                </span>
                                                <span className="text-slate-400 font-semibold text-[9px] hidden sm:inline ml-0.5 leading-none shrink-0">
                                                    ({mergedNote.patient?.dob ? Math.floor((new Date().getTime() - new Date(mergedNote.patient.dob + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "--"}yo)
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
 
                            {/* Right: Facility Info */}
                            <div className="flex flex-col items-end text-right group/facility relative w-full min-w-0">
                                <div className="label-small text-slate-400 mb-1 justify-end flex items-center gap-1 h-4 text-[9px] sm:text-[10px]">
                                    <span className="tracking-wider font-bold">FACILITY</span>
                                    <Building2 size={11} className="text-indigo-400 shrink-0" />
                                </div>
                                <div className="text-[12px] sm:text-[14px] font-black text-slate-900 dark:text-white mb-0.5 leading-none uppercase tracking-tight flex items-center justify-end h-5 w-full min-w-0" title={clinicSettings?.clinicName || "Independent Practice"}>
                                    <span className="truncate">{clinicSettings?.clinicName || "Independent Practice"}</span>
                                </div>
                                <div className="space-y-[2px] mt-1 w-full min-w-0">
                                    <div className="flex items-center justify-end gap-x-1 h-[16px] text-[10px] sm:text-[11px] min-w-0">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Fax:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">{clinicSettings?.fax || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1 h-[16px] text-[10px] sm:text-[11px] min-w-0">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Tel:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">{clinicSettings?.phone || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1 h-[16px] text-[10px] sm:text-[11px] min-w-0">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0">Email:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none lowercase truncate max-w-[95px] sm:max-w-none" title={clinicSettings?.email || "—"}>
                                            {clinicSettings?.email || "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1 min-h-[16px] text-[10px] sm:text-[11px] min-w-0">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] sm:text-[10px] shrink-0 whitespace-nowrap">Dir:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight text-right truncate max-w-[95px] sm:max-w-none" title={clinicSettings?.address || "—"}>
                                            {clinicSettings?.address || "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="gradient-divider" />



                        {/* Title Sections & Summaries - Dynamic Mapping for Joint Notes */}
                        {(() => {
                            const isJoint = !!(mergedNote.joint_services && mergedNote.joint_services.length > 0);
                            const rawServices = (isJoint ? mergedNote.joint_services : [mergedNote]) || [];
                            
                            // Flatten any nested joint_services so every step renders its own clinical narrative and details
                            const servicesToRender: any[] = [];
                            rawServices.forEach((s: any) => {
                                if (s.joint_services && Array.isArray(s.joint_services) && s.joint_services.length > 0) {
                                    s.joint_services.forEach((sub: any) => {
                                        servicesToRender.push({
                                            ...sub,
                                            patient: sub.patient || s.patient || mergedNote.patient,
                                            facility: sub.facility || s.facility || mergedNote.facility,
                                            staff: sub.staff || s.staff || mergedNote.staff,
                                            signatures: sub.signatures || s.signatures || mergedNote.signatures,
                                            template_id: sub.template_id || s.template_id || mergedNote.template_id,
                                            diagnoses: sub.diagnoses || s.diagnoses || mergedNote.diagnoses
                                        });
                                    });
                                } else {
                                    servicesToRender.push(s);
                                }
                            });

                            return servicesToRender.map((svc: any, svcIndex: number) => {
                                const svcSummary = svc.narrative?.summary_notes || svc.narrative?.clinical_narrative || svc.narrative?.summary || svc.narrative?.narrative || svc.summary_notes || svc.summary || svc.clinical_narrative || svc.raw_model_text || svc.text || "";
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
                                                        <div className="mt-1 bg-slate-50/50 dark:!bg-slate-950/40 border border-slate-200/70 dark:!border-slate-800/80 rounded-2xl p-2.5 sm:p-3.5 print:bg-transparent print:border-0 print:p-0">
                                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 items-center">
                                                                {/* 1. Date */}
                                                                <div className="flex flex-col gap-0.5 items-center text-center">
                                                                    <span className="label-small !mb-0 text-[9px]">Date</span>
                                                                    <div className="value-text text-[12px] flex items-center justify-center">
                                                                        {isEditMode ? (
                                                                            <input
                                                                                type="date"
                                                                                value={svc.encounter?.dos_date || (svc as any).meta?.visitDate || ''}
                                                                                onChange={(e) => handleUpdateField(`${pathPrefix}encounter.dos_date`, e.target.value)}
                                                                                className="bg-slate-900/50 border border-slate-700/60 px-2.5 py-1 text-[11px] font-bold text-slate-200 rounded-full hover:border-slate-500 focus:border-indigo-400 transition-all outline-none w-[110px]"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-bold">{formatDosDate(svc.encounter?.dos_date || (svc as any).meta?.visitDate)}</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 2. Time Range */}
                                                                <div className="flex flex-col gap-0.5 items-center text-center">
                                                                    <span className="label-small !mb-0 text-[9px]">Time Range</span>
                                                                    <div className="value-text whitespace-nowrap text-[12px] flex items-center justify-center">
                                                                        {isEditMode ? (
                                                                            <div className="flex items-center gap-1.5 no-print">
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <button className="text-center px-2.5 py-0.5 text-[10.5px] font-bold min-w-[58px] sm:min-w-[70px] bg-slate-900/50 border border-slate-700/60 rounded-full hover:bg-slate-800 transition-colors text-indigo-300">
                                                                                            {svcTimeStart || "Start"}
                                                                                        </button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900/95 backdrop-blur-md" side="bottom" align="center">
                                                                                        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 text-center">
                                                                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Encounter Start</span>
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

                                                                                <span className="text-slate-500 font-bold">-</span>

                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <button className="text-center px-2.5 py-0.5 text-[10.5px] font-bold min-w-[58px] sm:min-w-[70px] bg-slate-900/50 border border-slate-700/60 rounded-full hover:bg-slate-800 transition-colors text-indigo-300">
                                                                                            {svcTimeEnd || "End"}
                                                                                        </button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900/95 backdrop-blur-md" side="bottom" align="center">
                                                                                        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 text-center">
                                                                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Encounter End</span>
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

                                                                {/* 3. POS */}
                                                                <div className="flex flex-col gap-0.5 items-center text-center">
                                                                    <span className="label-small !mb-0 text-[9px]">POS</span>
                                                                    <div className="value-text text-[12px]">
                                                                        <GhostInput
                                                                            value={svc.encounter?.location_name || (svc.encounter as any)?.place_of_service_name || (((svc.subTemplate || svc._frontend_service_title || mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("otc")) ? "11 - Office" : "12 - Home")}
                                                                            isEditMode={isEditMode}
                                                                            onChange={(val) => handleUpdateField(`${pathPrefix}encounter.location_name`, val)}
                                                                            className="text-center !rounded-full"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* 4. Combined Duration & Units - Mobile only */}
                                                                <div className="flex sm:hidden flex-col gap-0.5 items-center text-center">
                                                                    <span className="label-small !mb-0 text-[9px]">Duration · Units</span>
                                                                    <div className="value-text text-[12px] flex items-center justify-center gap-1.5 font-bold">
                                                                        {isEditMode ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <GhostInput
                                                                                    value={svc.encounter?.duration}
                                                                                    isEditMode={true}
                                                                                    onChange={(val) => handleUpdateField(`${pathPrefix}encounter.duration`, val)}
                                                                                    className="text-center !rounded-full !px-1.5 !py-0.5 !text-[11px] w-12"
                                                                                    placeholder="min"
                                                                                />
                                                                                <span className="text-[10px] text-slate-400 font-bold">m ·</span>
                                                                                <GhostInput
                                                                                    value={svc.encounter?.billing_units || svc.encounter?.units || ''}
                                                                                    isEditMode={true}
                                                                                    onChange={(val) => {
                                                                                        handleUpdateField(`${pathPrefix}encounter.billing_units`, val);
                                                                                        handleUpdateField(`${pathPrefix}encounter.units`, val);
                                                                                    }}
                                                                                    className="text-center !rounded-full !px-1.5 !py-0.5 !text-[11px] w-10"
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="text-[10px] text-slate-400 font-bold">u</span>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <span>{svc.encounter?.duration || 0} min</span>
                                                                                <span className="text-slate-300 dark:text-slate-600 font-normal">·</span>
                                                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-black border border-indigo-100 dark:border-indigo-800">
                                                                                    {svc.encounter?.billing_units || svc.encounter?.units || 0}u
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 5. Duration - Desktop only */}
                                                                <div className="hidden sm:flex flex-col gap-0.5 items-center text-center">
                                                                    <span className="label-small !mb-0 text-[9px]">Duration</span>
                                                                    <div className="value-text text-[12px] flex items-center justify-center gap-1">
                                                                        <GhostInput
                                                                            value={svc.encounter?.duration}
                                                                            isEditMode={isEditMode}
                                                                            onChange={(val) => handleUpdateField(`${pathPrefix}encounter.duration`, val)}
                                                                            className="text-center !rounded-full !px-2 !py-0.5 !text-[12px] w-14"
                                                                            placeholder="min"
                                                                        />
                                                                        {!isEditMode && <span className="text-[10px] text-slate-400 font-bold">min</span>}
                                                                    </div>
                                                                </div>

                                                                {/* 6. Units - Desktop only */}
                                                                <div className="hidden sm:flex flex-col gap-0.5 items-center text-center">
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
                                                                                className="text-center !rounded-full !px-2 !py-0.5 !text-[11px] w-14"
                                                                                placeholder="0"
                                                                            />
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-black border border-indigo-100 dark:border-indigo-800">
                                                                                {svc.encounter?.billing_units || svc.encounter?.units || 0}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 7. Service Focus - Spans full width */}
                                                                <div className="col-span-2 sm:col-span-5 mt-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                                                    <div className="value-text !text-[13.5px] sm:!text-[15px] font-black text-indigo-950 dark:text-white tracking-tight leading-tight">
                                                                        {isEditMode ? (
                                                                            <div className="flex items-center gap-2.5 bg-slate-900/50 border border-slate-700/60 hover:border-slate-600 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 transition-all">
                                                                                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase whitespace-nowrap">Service Focus:</span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={(() => {
                                                                                        const rawTitle = svc.services?.service_focus_title || svc.encounter?.sub_template || (mergedNote as any).meta?.subTemplate || "";
                                                                                        const subTitle = (svc.subTemplate || svc._frontend_service_title || svc.encounter?.primary_service_provided || "").trim();
                                                                                        if (['OTC Obt', 'OTC Comp', 'OTC Sub'].includes(subTitle)) return subTitle;
                                                                                        if (subTitle.toLowerCase().includes('otc obt') || rawTitle.toLowerCase().includes('otc obt')) return 'OTC Obt';
                                                                                        if (subTitle.toLowerCase().includes('otc comp') || rawTitle.toLowerCase().includes('otc comp')) return 'OTC Comp';
                                                                                        if (subTitle.toLowerCase().includes('otc sub') || rawTitle.toLowerCase().includes('otc sub')) return 'OTC Sub';
                                                                                        return rawTitle || "TCM Progress Note";
                                                                                    })()}
                                                                                    onChange={(e) => handleUpdateField(`${pathPrefix}${svc.services?.service_focus_title ? 'services.service_focus_title' : 'encounter.sub_template'}`, e.target.value)}
                                                                                    placeholder="Enter encounter subject..."
                                                                                    className="w-full bg-transparent border-0 outline-none text-[13px] sm:text-[14px] font-bold text-slate-100 placeholder:text-slate-500 focus:ring-0 focus:outline-none"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center py-0.5">
                                                                                <span className="text-[9px] font-black tracking-widest text-indigo-500/80 dark:text-indigo-400 uppercase mr-2 sm:hidden">Focus:</span>
                                                                                <span>
                                                                                    {(() => {
                                                                                        const rawTitle = svc.services?.service_focus_title || svc.encounter?.sub_template || (mergedNote as any).meta?.subTemplate || "";
                                                                                        const subTitle = (svc.subTemplate || svc._frontend_service_title || svc.encounter?.primary_service_provided || "").trim();
                                                                                        if (['OTC Obt', 'OTC Comp', 'OTC Sub'].includes(subTitle)) return subTitle;
                                                                                        if (subTitle.toLowerCase().includes('otc obt') || rawTitle.toLowerCase().includes('otc obt')) return 'OTC Obt';
                                                                                        if (subTitle.toLowerCase().includes('otc comp') || rawTitle.toLowerCase().includes('otc comp')) return 'OTC Comp';
                                                                                        if (subTitle.toLowerCase().includes('otc sub') || rawTitle.toLowerCase().includes('otc sub')) return 'OTC Sub';
                                                                                        return rawTitle || "TCM Progress Note";
                                                                                    })()}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </section>

                                                    <section className="print-section mt-4 print-avoid">
                                                        <SectionHeader title="INFORMATION & DOMAINS" icon={ListTodo} />
                                                        <div className="mt-0.5 px-0.5">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-x-2 sm:gap-y-0.5">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2 items-start">
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
                                                        value={(() => {
                                                            const raw = mergedNote.narrative?.outcome_of_services || "";
                                                            if (isEditMode) return raw;
                                                            // Deduplicate identical paragraphs
                                                            const parts = raw.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
                                                            const seen = new Set<string>();
                                                            const unique: string[] = [];
                                                            parts.forEach((p: string) => {
                                                                const key = p.toLowerCase().replace(/\s+/g, ' ');
                                                                if (!seen.has(key)) {
                                                                    seen.add(key);
                                                                    unique.push(p);
                                                                }
                                                            });
                                                            return unique.join('\n\n');
                                                        })()}
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
                                                        value={(() => {
                                                            const raw = mergedNote.narrative?.next_steps || "";
                                                            if (isEditMode) return raw;
                                                            // Deduplicate identical paragraphs
                                                            const parts = raw.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
                                                            const seen = new Set<string>();
                                                            const unique: string[] = [];
                                                            parts.forEach((p: string) => {
                                                                const key = p.toLowerCase().replace(/\s+/g, ' ');
                                                                if (!seen.has(key)) {
                                                                    seen.add(key);
                                                                    unique.push(p);
                                                                }
                                                            });
                                                            return unique.join('\n\n');
                                                        })()}
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
                            <div className="flex justify-between items-center border-b border-slate-100/40 dark:border-slate-800/60 pb-0.5">
                                <h2 className="text-[9px] font-black text-slate-900 tracking-[0.25em] uppercase leading-none">Diagnoses</h2>
                            </div>
                            <div className="mt-1 p-2 bg-slate-50/30 dark:!bg-slate-950/40 rounded-xl border border-slate-100/50 dark:!border-slate-800/80">
                                {(() => {
                                    const isOtc = (
                                        (mergedNote.subTemplate || "").toLowerCase().includes("otc") ||
                                        (mergedNote._frontend_service_title || "").toLowerCase().includes("otc") ||
                                        (mergedNote.encounter?.primary_service_provided || "").toLowerCase().includes("otc")
                                    );
                                    const rawList = Array.isArray(mergedNote.diagnoses) ? mergedNote.diagnoses : [];
                                    const seen = new Set<string>();
                                    const list: Array<{ icd10: string; name: string }> = [];

                                    rawList.forEach((diag: any) => {
                                        let code = diag.icd10 || '';
                                        let name = diag.name || '';
                                        if (!code && name) {
                                            const match = name.match(/^\(?([A-Z]\d[0-9A-Z]?(?:\.[0-9A-Z]{1,4})?)\)?\s*[:-]?\s*(.*)$/i);
                                            if (match) {
                                                code = match[1].toUpperCase();
                                                name = match[2].trim() || name;
                                            }
                                        }
                                        const key = (code || name).toLowerCase().replace(/[^a-z0-9]/g, '');
                                        if (key && !seen.has(key)) {
                                            seen.add(key);
                                            list.push({ icd10: code, name: name });
                                        }
                                    });

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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 mt-6">
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
                onApplySuggestedTimeAndRetry={handleApplySuggestedTimeAndRetry}
                isRetrying={isSyncing}
                patientName={mergedNote?.patient?.full_name || (mergedNote as any)?.meta?.patientName}
                visitDate={mergedNote?.joint_services?.[0]?.encounter?.dos_date || mergedNote?.encounter?.dos_date || (mergedNote as any)?.meta?.dos_date || (mergedNote as any)?.meta?.visitDate || (mergedNote as any)?.date_of_service}
            />
        </div>
    );
};

export default TcmNoteShell;
