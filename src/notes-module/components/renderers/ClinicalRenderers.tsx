import React from 'react';
import {
    ArrowLeft,
    Calendar,
    Edit3,
    PenTool
} from 'lucide-react';

// Interfaces
interface NoteSection {
    title: string;
    body: string;
}

export interface NoteSectionEnhanced extends NoteSection {
    data?: any;
}

// ----------------------------------------------------------------------------
// RENDERERS
// ----------------------------------------------------------------------------

export const AssessmentRenderer: React.FC<{ assessments: any[] }> = ({ assessments }) => {
    if (!assessments || !Array.isArray(assessments)) return null;
    return (
        <div className="mt-4 space-y-2">
            {assessments.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.diagnosis}</span>
                        {a.type && <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{a.type}</span>}
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md">{a.icd10 || 'N/A'}</span>
                        {a.primary && <span className="text-[9px] font-black text-emerald-500 uppercase mt-1">Primary</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const OBPregnancyRenderer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const fields = [
        { label: 'Age at Menopause', value: data.age_at_menopause },
        { label: 'Total Pregnancy', value: data.total_pregnancy },
        { label: 'Full Term', value: data.full_term },
        { label: 'Pre Term', value: data.pre_term },
        { label: 'Miscarriages', value: data.miscarriages },
        { label: 'Living', value: data.living }
    ];
    return (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            {fields.map((f, i) => (
                <div key={i} className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{f.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{f.value || '—'}</span>
                </div>
            ))}
        </div>
    );
};

export const DetailedSocialHistoryRenderer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const groups = [
        {
            title: 'Identity & Status',
            fields: [
                { label: 'Cultural background', value: data.cultural_background },
                { label: 'Immigration status', value: data.immigration_status },
                { label: 'Marital Status', value: data.marital_status },
                { label: 'Children', value: data.children }
            ]
        },
        {
            title: 'Socioeconomics',
            fields: [
                { label: 'Education Level', value: data.education_level },
                { label: 'Employment/ Occupation', value: data.employment_occupation },
                { label: 'Household/ Living Situation', value: data.living_situation || data.household_living_situation },
                { label: 'Religion', value: data.religion }
            ]
        },
        {
            title: 'Preferences & Lifestyle',
            fields: [
                { label: 'Interests and Hobbies', value: data.interests_hobbies },
                { label: 'Sexual orientation/ preference', value: data.sexual_orientation },
                { label: 'Nicotine use/ Smoking status', value: data.nicotine_use }
            ]
        },
        {
            title: 'Risk & Legal',
            fields: [
                { label: 'Drug or alcohol abuse history', value: data.drug_alcohol_history },
                { label: 'Trauma, Abuse or Neglect history', value: data.trauma_abuse_history },
                { label: 'Legal problems', value: data.legal_problems },
                { label: 'Firearms or any other weapons in the house', value: data.weapons_in_house }
            ]
        }
    ];

    return (
        <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group, i) => (
                    <div key={i} className="space-y-3">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">{group.title}</h4>
                        <div className="space-y-2">
                            {group.fields.map((f, j) => (
                                <div key={j} className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-500 lowercase first-letter:uppercase">{f.label}:</span>
                                    <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{f.value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ReviewOfSymptomsRenderer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    return (
        <div className="mt-4 space-y-6">
            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                <h4 className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Positive:</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">{data.positive || '—'}</p>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Negative:</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {data.negative || '—'}
                </p>
            </div>
        </div>
    );
};

export const DetailedMSERenderer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const items = [
        { label: 'General Appearance', value: data.general_appearance },
        { label: 'Attitude and behavior', value: data.attitude_and_behavior },
        { label: 'Psychomotor', value: data.psychomotor },
        { label: 'Speech', value: data.speech },
        { label: 'Mood', value: data.mood },
        { label: 'Affect', value: data.affect },
        { label: 'Thought Process', value: data.thought_process },
        { label: 'Thought Content', value: data.thought_content },
        { label: 'Orientation', value: data.orientation },
        { label: 'Recent memory', value: data.recent_memory },
        { label: 'Remote Memory', value: data.remote_memory },
        { label: 'Attention/Concentration', value: data.attention_concentration },
        { label: 'Insight', value: data.insight },
        { label: 'Judgment', value: data.judgment },
        { label: 'Reliability of Information', value: data.reliability_of_information },
        { label: 'Impulse Control', value: data.impulse_control },
        { label: 'Motivation', value: data.motivation },
        { label: 'Energy', value: data.energy },
        { label: 'Homicidal Ideation', value: data.homicidal_ideation },
        { label: 'Suicidal Ideation', value: data.suicidal_ideation }
    ];

    return (
        <div className="mt-4 space-y-3">
            {items.map((item, i) => (
                <div key={i} className="flex gap-4 border-b border-slate-50 dark:border-slate-800/50 pb-2">
                    <span className="w-1/3 text-xs font-bold text-slate-400 uppercase tracking-tight">{item.label}:</span>
                    <span className="w-2/3 text-sm text-slate-800 dark:text-slate-200">{item.value || '—'}</span>
                </div>
            ))}
        </div>
    );
};

export const SmartHPIRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text || text === 'Not recorded') return null;

    const lines = text.split('\n');
    const thBlock: string[] = [];
    const prBlock: string[] = [];
    const clinicalPoints: string[] = [];
    let currentBlock: 'th' | 'pr' | 'clinical' | null = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        const upLine = trimmed.toUpperCase();

        if (upLine.includes('TELEHEALTH:')) { currentBlock = 'th'; return; }
        if (upLine.includes('PRESENCIAL:')) { currentBlock = 'pr'; return; }

        if (/^\d+[-.)]/.test(trimmed)) {
            currentBlock = 'clinical';
        }

        if (currentBlock === 'th') thBlock.push(line);
        else if (currentBlock === 'pr') prBlock.push(line);
        else clinicalPoints.push(line);
    });

    const clinicalItems: { num: string, content: string }[] = [];
    let currentItem: { num: string, content: string } | null = null;

    clinicalPoints.forEach(line => {
        const trimmed = line.trim();
        const match = trimmed.match(/^(\d+)[-.)]\s*(.*)/);
        if (match) {
            if (currentItem) clinicalItems.push(currentItem);
            currentItem = { num: match[1], content: match[2] };
        } else if (trimmed) {
            if (currentItem) {
                currentItem.content += ' ' + trimmed;
            } else {
                clinicalItems.push({ num: '•', content: trimmed });
            }
        }
    });
    if (currentItem) clinicalItems.push(currentItem);

    return (
        <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3">
                {thBlock.length > 0 && (
                    <div className="p-4 bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-2xl">
                        <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Telehealth Metadata:</h4>
                        <div className="text-[11px] text-slate-800 dark:text-slate-200">{thBlock.join(' ').trim()}</div>
                    </div>
                )}
                {prBlock.length > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">In-Person Metadata:</h4>
                        <div className="text-[11px] text-slate-800 dark:text-slate-200">{prBlock.join(' ').trim()}</div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {clinicalItems.map((item, i) => (
                    <div key={i} className="group flex gap-4 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/50">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                            {item.num}
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 font-sans pt-1">
                            {item.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TestScreeningRenderer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const tools = [
        { id: 'PHQ-9', value: data.phq9, label: '*PHQ-9* PHQ-9: Scored-' },
        { id: 'GAD-7', value: data.gad7, label: '*GAD-7* GAD-7: Scored-' },
        { id: 'MMSE', value: data.mmse, label: '*MMSE* MMSE: Scored-' },
        { id: 'MDQ', value: data.mdq, label: '*MDQ*' },
        { id: 'PCL-5', value: data.pcl5, label: '*PCL-5 (PTSD CHECKLIST)*' },
        { id: 'BPRS', value: data.bprs, label: 'BPRS:' },
        { id: 'AIMS', value: data.aims, label: 'AIMS:' },
        { id: 'ADHD SRS', value: data.adhd_srs, label: 'Adult ADHD SRS:' },
        { id: 'CAGE', value: data.cage, label: 'CAGE:' },
        { id: 'DAST-10', value: data.dast10, label: 'DAST-10:' },
        { id: 'Suicide Risk', value: data.suicide_risk, label: 'Suicide Risk Assessment:' }
    ];

    return (
        <div className="mt-4 space-y-3">
            {tools.map((tool, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 gap-2 flex flex-col">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{tool.label}</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 italic">
                        {tool.value || '—'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SmartListRenderer: React.FC<{ items: string[]; title?: string; icon?: React.ReactNode }> = ({ items, title, icon }) => {
    const filteredItems = items.filter(item => item && !item.includes('Not reported') && !item.includes('Not recorded'));
    if (!filteredItems || filteredItems.length === 0) return null;
    return (
        <div className="space-y-2">
            {title && (
                <h5 className="text-[9px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    {icon}
                    {title}
                </h5>
            )}
            <ul className="space-y-2">
                {filteredItems.map((item, i) => (
                    <li key={i} className="flex gap-3 group">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-300 dark:bg-indigo-600 mt-1.5 group-hover:scale-125 transition-transform" />
                        <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-sans italic">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const ComprehensivePlanRenderer: React.FC<{ data: any; title: string }> = ({ data, title }) => {
    if (!data) return null;
    const normalizedTitle = title.toLowerCase();

    if (normalizedTitle.includes('disposition')) {
        const items = data.disposition_list || (data.narrative ? data.narrative.split('\n').filter((l: string) => l.trim().startsWith('•') || l.trim().startsWith('-')).map((l: string) => l.trim().replace(/^[•-]\s*/, '')) : []);

        return (
            <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <SmartListRenderer
                    items={items}
                    title="Disposition & Follow-Up Plan"
                    icon={<Calendar className="w-3 h-3" />}
                />
            </div>
        );
    }

    if (normalizedTitle.includes('patient education')) {
        let eduList = data.education_list || data.patient_education_list || [];
        const instructions = data.instructions_and_recommendations || data.recommendations || '';

        if (eduList.length === 0 && data.narrative) {
            eduList = data.narrative.split('\n')
                .filter((l: string) => l.trim().startsWith('•') || l.trim().startsWith('-') || /^\d+[.)]/.test(l.trim()))
                .map((l: string) => l.trim().replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, ''));
        }

        return (
            <div className="mt-4 space-y-4">
                <div className="p-5 border-2 border-indigo-50 dark:border-indigo-900/20 rounded-2xl bg-white/50 dark:bg-transparent">
                    <SmartListRenderer
                        items={eduList}
                        title="Patient Education & Instructions"
                        icon={<PenTool className="w-3 h-3" />}
                    />
                    {eduList.length === 0 && data.narrative && !instructions && (
                        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 italic">{data.narrative}</p>
                    )}
                </div>
                {instructions && (
                    <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                        <h5 className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-80">Instructions & Recommendations:</h5>
                        <p className="text-[11px] font-bold leading-relaxed">{instructions}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-6">
            {(data.lab_results || data.review_labs_ekg_results_from_pcp) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Review labs/ EKG results from PCP:</h4>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{data.lab_results || data.review_labs_ekg_results_from_pcp || '—'}</p>
                </div>
            )}

            <div className="p-5 border-2 border-indigo-50 dark:border-indigo-900/20 rounded-2xl bg-white/50 dark:bg-transparent">
                <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3">Non-Pharmacological Interventions:</h4>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic mb-4">
                    {data.non_pharmacological_interventions || data.narrative || '45 minutes of Supportive Psychotherapy/ Psychoeducation provided to the patient...'}
                </p>
                {(data.psychotherapy_rec || data.recommended_individual_psychotherapy) && (
                    <div className="text-xs text-slate-800 dark:text-slate-200 font-medium border-t border-indigo-50 dark:border-indigo-900/20 pt-3 flex gap-3">
                        <div className="text-indigo-500 mt-1"><ArrowLeft className="w-3 h-3 rotate-180" /></div>
                        {data.psychotherapy_rec || data.recommended_individual_psychotherapy}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <Edit3 className="w-3 h-3" />
                    Pharmacological Interventions / EFORCSE
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    The need for pharmacological interventions will be assessed on each encounter with the patient...
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { label: 'Start:', value: data.start },
                        { label: 'Continue:', value: data.continue },
                        { label: 'Switch:', value: data.switch },
                        { label: 'Discontinue:', value: data.discontinue },
                    ].map((item, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-200 transition-colors">
                            <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1">{item.label}</span>
                            <div className="text-sm text-slate-900 dark:text-slate-100 font-serif">{item.value || '—'}</div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800/50 rounded-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">EFORCSE Checked:</span>
                    </div>
                    <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black shadow-sm">
                        SCORE: {data.eforcse_score || 'N/A'}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-auto">
                        Last dispensed: <span className="text-slate-900 dark:text-slate-200 font-bold">{data.last_controlled_medication_dispensed || data.last_controlled_dispensed || '—'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DynamicFieldRenderer: React.FC<{ label: string; value: any; depth?: number }> = ({ label, value, depth = 0 }) => {
    const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'boolean') {
        return (
            <div className="flex items-center gap-2 py-1 border-b border-indigo-50/50 last:border-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider min-w-[120px]">{formatLabel(label)}:</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {value ? 'Yes' : 'No'}
                </span>
            </div>
        );
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return null;

        if (typeof value[0] === 'string') {
            return (
                <div className="py-2 border-b border-indigo-50/50 last:border-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{formatLabel(label)}</span>
                    <ul className="list-disc pl-4 space-y-1">
                        {value.map((item, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif italic">{item}</li>)}
                    </ul>
                </div>
            );
        }

        if (typeof value[0] === 'object') {
            return (
                <div className="py-3 border-b border-indigo-50/50 last:border-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">{formatLabel(label)} (List)</span>
                    <div className="space-y-3 pl-2">
                        {value.map((item: any, i: number) => (
                            <div key={i} className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 text-sm">
                                {Object.entries(item).map(([k, v]) => (
                                    <div key={k} className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-1 last:mb-0">
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase min-w-[100px]">{formatLabel(k)}:</span>
                                        <span className="text-slate-700 dark:text-slate-300 font-serif">{v ? String(v) : "—"}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    }

    if (typeof value === 'object' && depth < 2) {
        const entries = Object.entries(value);
        if (entries.length === 0) return null;
        return (
            <div className="py-2 border-b border-indigo-50/50 last:border-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">{formatLabel(label)}</span>
                <div className="pl-3 border-l-2 border-indigo-100 dark:border-indigo-800 space-y-1">
                    {entries.map(([k, v]) => (
                        <DynamicFieldRenderer key={k} label={k} value={v} depth={depth + 1} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2 py-2 border-b border-indigo-50/50 last:border-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider min-w-[140px] pt-0.5">{formatLabel(label)}:</span>
            <span className="text-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed flex-1">{String(value)}</span>
        </div>
    );
};
