import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MessageSquareWarning, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { supabase } from '../../lib/supabaseClient';

/**
 * Supervisor feedback loop (CM side):
 *  1. The CM pastes what the supervisor wrote about this note.
 *  2. Clio (n8n `supervisor-feedback-analyze`) classifies it, proposes the correction of this
 *     note and a rule for the CM's future notes of this template.
 *  3. The CM applies the correction with one click. The rule is saved as "pending": it only
 *     reaches future notes after a Clio admin approves it (documentation_rules).
 */

const ANALYZE_URL = 'https://n8n.clinicflow.dev/webhook/supervisor-feedback-analyze';
const FIELDS = ['summary_notes', 'outcome_of_services', 'next_steps'] as const;
type NarrField = typeof FIELDS[number];

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
    too_short: { es: 'Nota corta', en: 'Note too short' },
    missing_key_point: { es: 'Falta un punto importante', en: 'Missing key point' },
    omitted_data: { es: 'Dato omitido', en: 'Omitted data' },
    wording: { es: 'Redacción', en: 'Wording' },
    incorrect_data: { es: 'Dato incorrecto', en: 'Incorrect data' },
    format: { es: 'Formato', en: 'Format' },
    other: { es: 'Otro', en: 'Other' },
};

const FIELD_LABELS: Record<NarrField, { es: string; en: string }> = {
    summary_notes: { es: 'Narrativa', en: 'Narrative' },
    outcome_of_services: { es: 'Outcome', en: 'Outcome' },
    next_steps: { es: 'Next Steps', en: 'Next Steps' },
};

type ServiceOption = { idx: number; title: string; templateId: string; narrative: Record<string, string> };

interface AnalyzeResult {
    category?: string;
    section?: string;
    ai_summary?: string;
    change_explanation?: string;
    revised?: Partial<Record<NarrField, string>>;
    rule_text?: string;
    rule_applies_to_template?: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    note: any;
    noteId: string | null;
    patientId?: string | null;
    userId?: string | null;
    clinicId?: string | null;
    defaultSupervisorName?: string;
    language: string;
    onApply: (updates: Array<{ path: string; value: string }>) => void;
}

export const SupervisorFeedbackDialog: React.FC<Props> = ({
    open, onClose, note, noteId, patientId, userId, clinicId, defaultSupervisorName, language, onApply,
}) => {
    const es = language === 'es';
    const services: ServiceOption[] = useMemo(() => {
        const joint = Array.isArray(note?.joint_services) ? note.joint_services : [];
        if (joint.length > 1) {
            return joint.map((s: any, i: number) => ({
                idx: i,
                title: s?.services?.service_focus_title || s?.subTemplate || s?._frontend_service_title || `Service ${i + 1}`,
                templateId: s?.template_id || s?.meta?.template_id || '',
                narrative: s?.narrative || {},
            }));
        }
        const single = joint[0] || note || {};
        return [{
            idx: -1,
            title: note?.services?.service_focus_title || single?.services?.service_focus_title || '',
            templateId: note?.meta?.template_id || single?.template_id || single?.meta?.template_id || '',
            narrative: { ...(single?.narrative || {}), ...(note?.narrative || {}) },
        }];
    }, [note]);

    const [serviceIdx, setServiceIdx] = useState(0);
    const [supervisorName, setSupervisorName] = useState(defaultSupervisorName || '');
    const [feedbackText, setFeedbackText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalyzeResult | null>(null);
    const [feedbackId, setFeedbackId] = useState<string | null>(null);
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        if (open) {
            setServiceIdx(0);
            setSupervisorName(defaultSupervisorName || '');
            setFeedbackText('');
            setResult(null);
            setFeedbackId(null);
            setApplied(false);
        }
    }, [open, defaultSupervisorName]);

    const svc = services[Math.min(serviceIdx, services.length - 1)];

    const analyze = async () => {
        if (!feedbackText.trim()) {
            toast.error(es ? 'Pega el comentario del supervisor.' : 'Paste the supervisor comment.');
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(ANALYZE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedback_text: feedbackText.trim(),
                    supervisor_name: supervisorName.trim(),
                    template_id: svc.templateId,
                    service_title: svc.title,
                    narrative: {
                        summary_notes: svc.narrative?.summary_notes || '',
                        outcome_of_services: svc.narrative?.outcome_of_services || '',
                        next_steps: svc.narrative?.next_steps || '',
                    },
                }),
            });
            const raw = await res.json();
            let data: any = Array.isArray(raw) ? raw[0] : raw;
            if (data?.json) data = data.json;
            if (!res.ok || !data || (!data.revised && !data.ai_summary)) throw new Error('empty analysis');
            const analysis: AnalyzeResult = data;
            setResult(analysis);

            // Record the feedback and the proposed rule (pending admin approval)
            if (userId) {
                const { data: fb, error: fbErr } = await supabase
                    .from('supervisor_feedback')
                    .insert({
                        user_id: userId,
                        clinic_id: clinicId || null,
                        note_id: noteId || null,
                        patient_id: patientId || null,
                        template_id: svc.templateId || null,
                        service_title: svc.title || null,
                        supervisor_name: supervisorName.trim() || null,
                        feedback_text: feedbackText.trim(),
                        category: CATEGORY_LABELS[analysis.category || ''] ? analysis.category : 'other',
                        section: analysis.section || null,
                        ai_summary: analysis.ai_summary || null,
                        proposed_correction: JSON.stringify(analysis.revised || {}),
                    })
                    .select('id')
                    .single();
                if (fbErr) throw fbErr;
                setFeedbackId(fb.id);
                if (analysis.rule_text && analysis.rule_text.trim()) {
                    const { data: rule, error: ruleErr } = await supabase
                        .from('documentation_rules')
                        .insert({
                            scope: 'profile',
                            user_id: userId,
                            clinic_id: clinicId || null,
                            template_id: analysis.rule_applies_to_template === false ? null : (svc.templateId || null),
                            category: analysis.category || null,
                            rule_text: analysis.rule_text.trim(),
                            source_feedback_ids: [fb.id],
                            status: 'pending',
                        })
                        .select('id')
                        .single();
                    if (!ruleErr && rule) {
                        await supabase.from('supervisor_feedback').update({ rule_id: rule.id }).eq('id', fb.id);
                    }
                }
            }
        } catch (err) {
            console.error('Supervisor feedback analysis failed', err);
            toast.error(es ? 'No se pudo analizar el comentario. Intenta de nuevo.' : 'Could not analyze the comment. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const changedFields = (result?.revised ? FIELDS.filter(f => typeof result.revised?.[f] === 'string' && result.revised[f]!.trim() && result.revised[f]!.trim() !== String(svc.narrative?.[f] || '').trim()) : []);

    const applyCorrection = async () => {
        if (!result?.revised || changedFields.length === 0) return;
        const updates: Array<{ path: string; value: string }> = [];
        const topNarr = note?.narrative || {};
        changedFields.forEach(f => {
            const oldText = String(svc.narrative?.[f] || '');
            const newText = String(result.revised![f]);
            if (svc.idx >= 0) {
                updates.push({ path: `joint_services.${svc.idx}.narrative.${f}`, value: newText });
                // The merged top-level narrative holds this service's text too
                const top = String(topNarr?.[f] || '');
                if (oldText && top.includes(oldText)) updates.push({ path: `narrative.${f}`, value: top.split(oldText).join(newText) });
            } else {
                updates.push({ path: `narrative.${f}`, value: newText });
                if (Array.isArray(note?.joint_services) && note.joint_services.length === 1) {
                    updates.push({ path: `joint_services.0.narrative.${f}`, value: newText });
                }
            }
        });
        onApply(updates);
        setApplied(true);
        if (feedbackId) {
            await supabase.from('supervisor_feedback').update({ applied_to_note: true, applied_at: new Date().toISOString() }).eq('id', feedbackId);
        }
        toast.success(es ? 'Corrección aplicada a la nota. Revisa y guarda.' : 'Correction applied to the note. Review and save.');
    };

    const cat = result?.category && CATEGORY_LABELS[result.category] ? CATEGORY_LABELS[result.category] : null;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="no-print max-w-[640px] max-h-[88vh] overflow-y-auto p-6 rounded-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl">
                <DialogHeader className="pb-1 text-left">
                    <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <MessageSquareWarning size={17} className="text-indigo-500" />
                        {es ? 'Comentario del supervisor' : 'Supervisor feedback'}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-slate-500 dark:text-slate-400 pt-1">
                        {es
                            ? 'Pega lo que te escribió el supervisor. Clio propone la corrección de esta nota y una regla para tus próximas notas de este servicio (la regla la aprueba un admin).'
                            : 'Paste what the supervisor wrote. Clio proposes the correction of this note and a rule for your future notes of this service (an admin approves the rule).'}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 space-y-3">
                    {services.length > 1 && (
                        <label className="block">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{es ? 'Servicio' : 'Service'}</span>
                            <select
                                value={serviceIdx}
                                onChange={(e) => { setServiceIdx(Number(e.target.value)); setResult(null); }}
                                className="mt-1 w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[13px] text-slate-800 dark:text-slate-100"
                            >
                                {services.map((s, i) => <option key={i} value={i}>{s.title || `Service ${i + 1}`}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="block">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{es ? 'Supervisor' : 'Supervisor'}</span>
                        <input
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="mt-1 w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[13px] text-slate-800 dark:text-slate-100"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{es ? 'Comentario (tal cual)' : 'Comment (as written)'}</span>
                        <textarea
                            rows={4}
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder={es ? 'Ej.: La nota está corta, no mencionas la próxima cita con el psiquiatra.' : 'E.g.: The note is short, you do not mention the next psychiatric appointment.'}
                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[13px] leading-snug text-slate-800 dark:text-slate-100"
                        />
                    </label>

                    {!result && (
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">
                                {es ? 'Cancelar' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={analyze}
                                className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                {es ? 'Analizar' : 'Analyze'}
                            </button>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {cat && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                        {es ? cat.es : cat.en}
                                    </span>
                                )}
                                {result.section && <span className="text-[11px] text-slate-500">{result.section}</span>}
                            </div>
                            {result.ai_summary && <p className="text-[12.5px] text-slate-700 dark:text-slate-200">{result.ai_summary}</p>}
                            {result.change_explanation && <p className="text-[12px] text-slate-500 dark:text-slate-400">{result.change_explanation}</p>}

                            {changedFields.length > 0 ? changedFields.map(f => (
                                <div key={f} className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                        {es ? `${FIELD_LABELS[f].es} corregida` : `Corrected ${FIELD_LABELS[f].en}`}
                                    </p>
                                    <p className="mt-1 whitespace-pre-line text-[12px] leading-snug text-slate-700 dark:text-slate-200">{result.revised![f]}</p>
                                </div>
                            )) : (
                                <p className="text-[12px] text-slate-500">{es ? 'Clio no propone cambios en el texto de esta nota.' : 'Clio proposes no text changes for this note.'}</p>
                            )}

                            {result.rule_text && (
                                <div className="rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 p-2.5">
                                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        {es ? 'Regla propuesta para tus próximas notas' : 'Proposed rule for your future notes'}
                                    </p>
                                    <p className="mt-1 text-[12px] text-slate-700 dark:text-slate-200">{result.rule_text}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        {es ? 'Pendiente de aprobación por un admin de Clio. Solo aplicará a tu perfil.' : 'Pending approval by a Clio admin. It will only apply to your profile.'}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">
                                    {applied ? (es ? 'Cerrar' : 'Close') : (es ? 'No aplicar' : 'Do not apply')}
                                </button>
                                {changedFields.length > 0 && !applied && (
                                    <button
                                        type="button"
                                        onClick={applyCorrection}
                                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold"
                                    >
                                        {es ? 'Aplicar a la nota' : 'Apply to note'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SupervisorFeedbackDialog;
