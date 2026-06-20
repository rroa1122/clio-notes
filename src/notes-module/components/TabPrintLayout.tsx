import React from 'react';
import { Note, StructuredNote } from '../lib/storage';

interface TabPrintLayoutProps {
    note: Note;
    isEditing?: boolean;
    onUpdate?: (changes: Partial<Note>) => void;
}

const TabPrintLayout: React.FC<TabPrintLayoutProps> = ({ note, isEditing, onUpdate }) => {
    const { structured_note, sections, meta, sections_by_title } = note;

    // Helper to get content with priority: sections_by_title -> structured_note -> default
    const getSectionContent = (titleKey: string, fallbackPath?: any): string | undefined => {
        // 1. Check sections_by_title (Header priority)
        // Normalize keys slightly to match loose headers
        if (sections_by_title) {
            const norm = titleKey.toLowerCase();
            const found = Object.keys(sections_by_title).find(k => k.toLowerCase().includes(norm));
            if (found) return sections_by_title[found];
        }

        // 2. Check structured_note (Fallback)
        if (fallbackPath) return fallbackPath;

        return undefined;
    };

    const handleStructuredChange = (section: keyof StructuredNote, field: string, value: any) => {
        if (!structured_note || !onUpdate) return;
        const updated = { ...structured_note };
        if (field) {
            (updated[section] as any) = { ...(updated[section] as any), [field]: value };
        } else {
            (updated[section] as any) = value;
        }
        onUpdate({ structured_note: updated });
    };

    // --- SUB-COMPONENTS FOR LAYOUT ---

    const SectionHeader = ({ title, className = '' }: { title: string, className?: string }) => (
        <div className={`border-b border-black mb-1 mt-4 print:border-black ${className}`}>
            <h3 className="text-[10pt] font-bold uppercase text-black tracking-tighter">{title}</h3>
        </div>
    );

    const SubHeader = ({ title }: { title: string }) => (
        <div className="mb-1 mt-2">
            <h4 className="text-[9pt] font-bold uppercase underline text-black">{title}</h4>
        </div>
    );

    const NarrativeBlock = ({ content, isEditing, onEdit }: { content?: string, isEditing?: boolean, onEdit?: (val: string) => void }) => {
        if (isEditing && onEdit) {
            return (
                <textarea
                    value={content || ''}
                    onChange={(e) => onEdit(e.target.value)}
                    className="w-full p-2 border border-black rounded-none text-[10pt] min-h-[100px] font-serif"
                />
            );
        }
        return (
            <div className="text-[10pt] leading-snug whitespace-pre-wrap text-black font-serif">
                {content || '—'}
            </div>
        );
    };

    const ListBlock = ({ items, emptyText = 'None' }: { items?: string[], emptyText?: string }) => {
        if (!items || items.length === 0) return <span className="text-[9pt] italic">{emptyText}</span>;
        return (
            <ul className="list-disc pl-4 text-[9pt]">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        );
    };

    // --- RENDER ---

    const today = new Date().toLocaleDateString();

    return (
        <div className="bg-white min-h-screen font-serif text-black p-8 max-w-[850px] mx-auto print:max-w-none print:p-0 leading-tight">

            {/* --- PAGE 1: HEADER & DEMOGRAPHICS --- */}

            {/* Header Grid */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 mb-2">
                {/* 1. PATIENT (Left) */}
                <div className="flex flex-col">
                    <h3 className="font-bold text-[10pt] mb-1">CLIENT</h3>
                    <div className="border border-black p-2 h-full flex flex-col justify-between">
                        <div>
                            <p className="font-bold uppercase text-[12pt]">{structured_note?.patient?.full_name || meta.patientName || 'PATIENT NAME'}</p>
                            <p className="text-[10pt] mt-1">{structured_note?.patient?.address || 'Address Not Recorded'}</p>
                        </div>
                        <div className="mt-4 text-[9pt]">
                            <p>Phone: {structured_note?.patient?.phone}</p>
                        </div>
                    </div>
                </div>

                {/* 2. FACILITY (Center) */}
                <div className="flex flex-col">
                    <h3 className="font-bold text-[10pt] mb-1">FACILITY</h3>
                    <div className="border border-black p-2 h-full text-center flex flex-col items-center">
                        <h2 className="font-bold uppercase text-[11pt]">{structured_note?.facility?.facility_name || 'Steps Therapy Center'}</h2>
                        <p className="text-[9pt] mt-1">{structured_note?.facility?.facility_address || '14400 NW 77TH CT, Suite 100\nMiami Lakes, FL 33016'}</p>
                        <p className="text-[9pt] mt-1">
                            Ph: {structured_note?.facility?.facility_phone || '786-410-6073'}
                            {structured_note?.facility?.facility_fax && ` • Fax: ${structured_note?.facility.facility_fax}`}
                        </p>
                    </div>
                </div>

                {/* 3. ENCOUNTER (Right) */}
                <div className="flex flex-col">
                    <h3 className="font-bold text-[10pt] mb-1">ENCOUNTER</h3>
                    <div className="border border-black p-2 h-full text-[9pt]">
                        <div className="grid grid-cols-[80px_1fr] gap-x-1 gap-y-1">
                            <span className="font-bold">Office Visit</span>
                            <span></span>
                            <span className="font-bold">NOTE TYPE</span>
                            <span className="uppercase">{structured_note?.meta?.note_type || 'Psychiatry Initial In Person'}</span>
                            <span className="font-bold">SEEN BY</span>
                            <span className="uppercase">{structured_note?.provider?.provider_name || meta.provider}</span>
                            <span className="font-bold">DATE</span>
                            <span>{structured_note?.appointment?.date_of_service || meta.visitDate}</span>
                            <span className="font-bold">AGE AT DOS</span>
                            <span>{structured_note?.patient?.age || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chief Complaint */}
            <div className="mb-4">
                <SectionHeader title="Chief Complaint" />
                <div className="text-[10pt]">{getSectionContent('chief', structured_note?.chief_complaint) || '—'}</div>
            </div>

            {/* Demographics Box (Keep primarily structured/meta as it's specific) */}
            <div className="border border-black p-2 mb-4">
                <h3 className="font-bold text-[10pt] mb-2 uppercase border-b border-black w-fit">Client identifying details and demographics</h3>
                <div className="grid grid-cols-4 gap-4 text-[9pt]">
                    <div className="flex flex-col"><span className="font-bold">SEX</span><span>{structured_note?.patient?.sex || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">DATE OF BIRTH</span><span>{structured_note?.patient?.dob || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">DATE OF DEATH</span><span>{structured_note?.patient?.date_of_death || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">PRN</span><span>{structured_note?.patient?.account_number || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">RACE</span><span>{structured_note?.patient?.race || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">ETHNICITY</span><span>{structured_note?.patient?.ethnicity || '—'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">PREF. LANGUAGE</span><span>{structured_note?.patient?.preferred_language || 'English'}</span></div>
                    <div className="flex flex-col"><span className="font-bold">STATUS</span><span>{structured_note?.patient?.status || 'Active'}</span></div>
                </div>
            </div>

            {/* --- PAGE 2: VITALS --- */}


            {/* Vitals */}
            <section className="mb-8">
                <SectionHeader title="Vitals for this encounter" />
                <div className="w-full border border-black text-[10pt]">
                    <div className="grid grid-cols-[1fr_80px_80px] bg-gray-100 border-b border-black font-bold text-[9pt]">
                        <div className="p-1 border-r border-black"></div>
                        <div className="p-1 text-center border-r border-black">{structured_note?.appointment?.date_of_service || meta.visitDate}</div>
                        <div className="p-1 text-center">{structured_note?.appointment?.start_time || '10:00 AM'}</div>
                    </div>
                    {[
                        { label: 'Height', val: structured_note?.vital_signs?.vitals_list?.[0]?.height },
                        { label: 'Weight', val: structured_note?.vital_signs?.vitals_list?.[0]?.weight },
                        { label: 'BMI', val: structured_note?.vital_signs?.vitals_list?.[0]?.bmi },
                        { label: 'Temperature', val: structured_note?.vital_signs?.vitals_list?.[0]?.temperature },
                        { label: 'BP', val: structured_note?.vital_signs?.vitals_list?.[0]?.bp },
                        { label: 'Pulse', val: structured_note?.vital_signs?.vitals_list?.[0]?.pulse },
                        { label: 'Respiration', val: structured_note?.vital_signs?.vitals_list?.[0]?.respiratory_rate },
                        { label: 'O2 Saturation', val: structured_note?.vital_signs?.vitals_list?.[0]?.o2_saturation }
                    ].map((row, i) => (
                        <div key={i} className="grid grid-cols-[1fr_160px] border-b border-black last:border-b-0 text-[9pt]">
                            <div className="p-1 border-r border-black font-bold uppercase pl-2">{row.label}</div>
                            <div className="p-1 text-center">{row.val || '—'}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- PAGE 3: HISTORY & MEDICATIONS --- */}

            {/* Allergies - Split Categories */}
            <section className="mb-4">
                <SectionHeader title="Allergies" />
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <SubHeader title="Drug Allergies" />
                        <ListBlock items={structured_note?.allergies_detailed?.drug} emptyText="No Known Drug Allergies" />
                    </div>
                    <div>
                        <SubHeader title="Food Allergies" />
                        <ListBlock items={structured_note?.allergies_detailed?.food} emptyText="No Known Food Allergies" />
                    </div>
                    <div>
                        <SubHeader title="Environmental Allergies" />
                        <ListBlock items={structured_note?.allergies_detailed?.environmental} emptyText="No Known Environmental Allergies" />
                    </div>
                </div>
            </section>

            {/* Medications */}
            <section className="mb-4">
                <SectionHeader title="Current medication list" />
                <NarrativeBlock content={getSectionContent('medication', '')} />
                <div className="border border-black text-[9pt] mt-2">
                    <div className="grid grid-cols-4 font-bold bg-gray-100 p-1 border-b border-black">
                        <span>Medication</span>
                        <span>Sig</span>
                        <span>Start Date</span>
                        <span>Prescriber</span>
                    </div>
                    {structured_note?.current_medications?.length ? structured_note.current_medications.map((med, i) => (
                        <div key={i} className="grid grid-cols-4 p-1 border-b border-black last:border-b-0">
                            <span className="font-bold uppercase">{med.name}</span>
                            <span>{med.dose} {med.frequency}</span>
                            <span>{med.start_date || '—'}</span>
                            <span>{med.prescriber || 'External'}</span>
                        </div>
                    )) : <div className="p-1 italic">None reported</div>}
                </div>
            </section>

            {/* Histories */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <SectionHeader title="Past Psychiatric History" />
                    <NarrativeBlock content={getSectionContent('psychiatric history', structured_note?.history?.past_psychiatric_history?.[0])} />
                </div>
                <div>
                    <SectionHeader title="Medical History" />
                    <NarrativeBlock content={getSectionContent('medical history', structured_note?.history?.medical_history?.[0])} />
                </div>
                <div>
                    <SectionHeader title="Surgical History" />
                    <ListBlock items={structured_note?.history?.surgical_history} />
                </div>
                <div>
                    <SectionHeader title="Family History" />
                    <ListBlock items={structured_note?.history?.family_history} />
                </div>
                <div>
                    <SectionHeader title="Social History" />
                    <ListBlock items={structured_note?.history?.social_history} />
                </div>
            </div>


            {/* --- PAGE 4-8: CLINICAL--- */}

            {/* --- PAGE 4-8: CLINICAL --- */}

            {/* 1. SAFETY ASSESSMENT (Priority) */}
            <section className="mb-4">
                <SectionHeader title="Safety Assessment" />
                <NarrativeBlock content={getSectionContent('safety assessment', structured_note?.safety_assessment || sections.safetyAssessment)} />
            </section>

            {/* 2. SUBJECTIVE / HPI */}
            <section className="mb-4">
                <SectionHeader title="Subjective" />
                <SubHeader title="History of Present Illness" />

                {/* Encounter Details from n8n (Render if present, else just narrative) */}
                {(structured_note?.history_of_present_illness?.telehealth || sections.telehealth) && (
                    <div className="mb-3 p-2 border border-black bg-gray-50">
                        <div className="text-[8pt] font-bold uppercase text-black mb-1">TELEHEALTH:</div>
                        <NarrativeBlock
                            content={structured_note?.history_of_present_illness?.telehealth || sections.telehealth}
                            isEditing={isEditing}
                            onEdit={(val) => handleStructuredChange('history_of_present_illness', 'telehealth', val)}
                        />
                    </div>
                )}

                <NarrativeBlock
                    content={getSectionContent('history of present illness', structured_note?.history_of_present_illness?.narrative)}
                    isEditing={isEditing}
                    onEdit={(val) => handleStructuredChange('history_of_present_illness', 'narrative', val)}
                />
            </section>

            {/* 3. REVIEW OF SYSTEMS */}
            <section className="mb-4">
                <SectionHeader title="Review of Systems" />
                <NarrativeBlock content={getSectionContent('review of systems', '') || getSectionContent('review of signs and symptoms', '')} />
            </section>

            {/* 4. OBJECTIVE / MSE */}
            <section className="mb-4">
                <SectionHeader title="Objective" />

                {/* MSE Narrative fallback */}
                <NarrativeBlock content={getSectionContent('objective', '') || getSectionContent('exam', '') || getSectionContent('mental status', '')} />

                {/* MSE Grid (if available in structured_note, which we kept as fallback) */}
                {structured_note?.exam?.psychiatry_mse && (
                    <div className="mb-4 mt-2">
                        <SubHeader title="Mental Status Examination (Structured)" />
                        <div className="border border-black text-[9pt]">
                            {Object.entries(structured_note.exam.psychiatry_mse).map(([key, value]: [string, any]) => (
                                <div key={key} className={`flex border-b border-black last:border-b-0`}>
                                    <div className="w-[120px] bg-gray-100 font-bold p-1 border-r border-black uppercase text-[8pt] flex items-center print:bg-gray-200">
                                        {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="p-1 flex-1 uppercase">
                                        {value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* 5. DIAGNOSIS / ASSESSMENT */}
            <section className="mb-4">
                <SectionHeader title="Assessment / Diagnosis" />
                <NarrativeBlock content={getSectionContent('assessment', '') || getSectionContent('diagnosis', '')} />

                {/* Structured Diagnostics List as Backup */}
                {structured_note?.assessments && structured_note.assessments.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {structured_note.assessments.map((dx, i) => (
                            <div key={i} className="flex gap-4 text-[10pt]">
                                <span className="font-bold min-w-[60px]">{dx.icd10 || '—'}</span>
                                <span className="uppercase">{dx.diagnosis}</span>
                                <span className="text-gray-500 italic text-[9pt]">({dx.type || 'Primary'})</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 6. PLAN */}
            <section className="mb-4">
                <SectionHeader title="Plan and Interventions" />
                <NarrativeBlock content={getSectionContent('plan', '') || getSectionContent('treatment plan', '')} />
            </section>

            {/* 7. PATIENT EDUCATION */}
            <section className="mb-4">
                <SectionHeader title="Client Education" />
                <NarrativeBlock content={getSectionContent('patient education', structured_note?.patient_education?.narrative)} />
            </section>

            {/* UNMAPPED DYNAMIC SECTIONS - Ensuring "todas las sections" are shown */}
            {(note.sections_by_title || note.dynamic_sections) && (
                <section className="mb-4">
                    <SectionHeader title="Additional Notes" />
                    {/* Iterate over sections_by_title first if available */}
                    {note.sections_by_title ?
                        Object.entries(note.sections_by_title).map(([key, val]) => {
                            const title = key.toLowerCase();
                            const handled = [
                                'chief', 'vitals', 'allergies', 'medication', 'medical history',
                                'surgical history', 'family history', 'social history', 'psychiatric history',
                                'hpi', 'history of present', 'review of systems', 'objective', 'mental status',
                                'assessment', 'diagnosis', 'plan', 'treatment', 'education', 'follow up', 'safety'
                            ];
                            // Loosely filter handled
                            if (handled.some(h => title.includes(h))) return null;

                            return (
                                <div key={key} className="mb-4">
                                    <SubHeader title={key} />
                                    <NarrativeBlock content={val} />
                                </div>
                            );
                        })
                        : note.dynamic_sections?.map((sec, idx) => (
                            <div key={idx} className="mb-4">
                                <SubHeader title={sec.title} />
                                <NarrativeBlock content={sec.body} />
                            </div>
                        ))}
                </section>
            )}

            <div className="mt-4 border-2 border-black p-2 text-[10pt] text-center font-bold uppercase mb-8">
                Follow Up: {structured_note?.follow_up?.interval || sections.dispositionFollowUp || '—'}
                <p className="text-[9pt] font-normal normal-case">{structured_note?.follow_up?.instructions}</p>
            </div>


            {/* FOOTER / SIGNATURE */}
            <footer className="mt-12 pt-4 border-t-2 border-black flex justify-between items-end break-inside-avoid">
                <div className="text-[9pt] text-left">
                    <p>Page 1 / 1</p>
                    <p className="font-bold uppercase mt-2">Generated by: {structured_note?.provider?.provider_name || meta.provider} on {today} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex flex-col gap-1 w-[40%] items-end text-right">
                    {structured_note?.sign_off?.signature_image || note.signature?.dataUrl ? (
                        <img
                            src={structured_note?.sign_off?.signature_image || note.signature?.dataUrl}
                            className="h-12 object-contain mix-blend-multiply mb-[-10px]"
                            alt="Signature"
                        />
                    ) : <div className="h-10"></div>}
                    <div className="border-t border-black w-full"></div>
                    <p className="font-bold text-[10pt] uppercase">{structured_note?.sign_off?.electronically_signed_by || meta.provider}</p>
                    <p className="text-[9pt] italic">Electronically Signed</p>
                </div>
            </footer>
        </div>
    );
};

export default TabPrintLayout;
