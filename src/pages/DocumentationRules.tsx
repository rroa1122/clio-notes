import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ShieldCheck, XCircle, BarChart3, Archive, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Clio admins: approve the rules proposed from supervisor feedback and watch the rejection panel.
 * A rule approved with scope "profile" reaches only that CM's future notes of that template.
 * "Agency" or "Global" promotes it when the same comment repeats across profiles/supervisors.
 */

type Rule = {
    id: string; scope: 'profile' | 'clinic' | 'global'; user_id: string | null; clinic_id: string | null;
    template_id: string | null; category: string | null; rule_text: string; source_feedback_ids: string[];
    status: 'pending' | 'approved' | 'rejected' | 'retired'; review_note: string | null; created_at: string; reviewed_at: string | null;
};
type Feedback = {
    id: string; user_id: string; clinic_id: string | null; template_id: string | null; service_title: string | null;
    supervisor_name: string | null; feedback_text: string; category: string | null; ai_summary: string | null;
    applied_to_note: boolean; rule_id: string | null; created_at: string;
};
type PanelRow = { template_id: string | null; category: string | null; feedback_count: number; cm_count: number; supervisor_count: number; clinic_count: number; first_seen: string; last_seen: string };

const CATEGORY_ES: Record<string, string> = {
    too_short: 'Nota corta', missing_key_point: 'Falta un punto importante', omitted_data: 'Dato omitido',
    wording: 'Redacción', incorrect_data: 'Dato incorrecto', format: 'Formato', other: 'Otro',
};
const TEMPLATE_ES: Record<string, string> = {
    tcm_case_assignment_note: 'New Referral', tcm_initial_home_visit_note: 'Initial Home Visit',
    tcm_gather_psy_note: 'PSY Records', tcm_gather_pcp_note: 'PCP Records', tcm_pc_emergency_contact_note: 'Emergency Contact',
    tcm_assessment_note: 'Develop Assessment', tcm_adult_certification_note: 'Adult Certification',
    tcm_service_plan_note: 'Initial Service Plan Development', tcm_service_plan_discussion: 'Discuss and Sign Initial Services Plan',
};
const tplName = (t: string | null) => (t ? (TEMPLATE_ES[t] || t) : 'Todos los templates');
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '');

export const DocumentationRules: React.FC = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const es = language === 'es';
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [tab, setTab] = useState<'pending' | 'active' | 'panel'>('pending');
    const [rules, setRules] = useState<Rule[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [panel, setPanel] = useState<PanelRow[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [edits, setEdits] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: adminFlag } = await supabase.rpc('is_clio_admin');
            setIsAdmin(Boolean(adminFlag));
            if (!adminFlag) return;
            const [{ data: r }, { data: f }, { data: p }] = await Promise.all([
                supabase.from('documentation_rules').select('*').order('created_at', { ascending: false }),
                supabase.from('supervisor_feedback').select('id,user_id,clinic_id,template_id,service_title,supervisor_name,feedback_text,category,ai_summary,applied_to_note,rule_id,created_at').order('created_at', { ascending: false }).limit(500),
                supabase.from('supervisor_feedback_panel').select('*'),
            ]);
            setRules((r || []) as Rule[]);
            setFeedback((f || []) as Feedback[]);
            setPanel(((p || []) as PanelRow[]).sort((a, b) => b.feedback_count - a.feedback_count));
            const ids = Array.from(new Set([...(r || []).map((x: any) => x.user_id), ...(f || []).map((x: any) => x.user_id)].filter(Boolean)));
            if (ids.length) {
                const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
                const map: Record<string, string> = {};
                (profs || []).forEach((pr: any) => { map[pr.id] = pr.full_name || pr.email || pr.id.slice(0, 8); });
                setNames(map);
            }
        } catch (err) {
            console.error('Documentation rules load failed', err);
            toast.error(es ? 'No se pudieron cargar las reglas.' : 'Could not load the rules.');
        } finally {
            setLoading(false);
        }
    }, [es]);

    useEffect(() => { load(); }, [load]);

    const feedbackById = useMemo(() => Object.fromEntries(feedback.map(f => [f.id, f])), [feedback]);
    const who = (id: string | null) => (id ? (names[id] || id.slice(0, 8)) : '');

    // Same template + category proposed for 2+ different CMs = candidate for agency/global
    const repeated = useMemo(() => {
        const groups: Record<string, { template_id: string | null; category: string | null; users: Set<string>; rules: Rule[] }> = {};
        rules.filter(r => r.scope === 'profile' && r.status !== 'rejected').forEach(r => {
            const k = `${r.template_id || '*'}|${r.category || '*'}`;
            if (!groups[k]) groups[k] = { template_id: r.template_id, category: r.category, users: new Set(), rules: [] };
            if (r.user_id) groups[k].users.add(r.user_id);
            groups[k].rules.push(r);
        });
        return Object.values(groups).filter(g => g.users.size >= 2).sort((a, b) => b.users.size - a.users.size);
    }, [rules]);

    const review = async (rule: Rule, status: Rule['status'], scope?: Rule['scope']) => {
        setBusyId(rule.id);
        try {
            const patch: any = {
                status,
                reviewed_by: (user as any)?.id || null,
                reviewed_at: new Date().toISOString(),
                rule_text: (edits[rule.id] ?? rule.rule_text).trim(),
            };
            if (scope) {
                patch.scope = scope;
                if (scope === 'clinic' && !rule.clinic_id) {
                    const fb = rule.source_feedback_ids.map(id => feedbackById[id]).find(Boolean);
                    patch.clinic_id = fb?.clinic_id || null;
                    if (!patch.clinic_id) throw new Error(es ? 'Esta regla no tiene agencia asociada.' : 'This rule has no agency.');
                }
            }
            const { error } = await supabase.from('documentation_rules').update(patch).eq('id', rule.id);
            if (error) throw error;
            toast.success(es ? 'Regla actualizada.' : 'Rule updated.');
            await load();
        } catch (err: any) {
            toast.error(err?.message || (es ? 'No se pudo actualizar.' : 'Update failed.'));
        } finally {
            setBusyId(null);
        }
    };

    const scopeLabel = (r: Rule) => r.scope === 'profile' ? `${es ? 'Solo' : 'Only'} ${who(r.user_id)}` : r.scope === 'clinic' ? (es ? 'Toda la agencia' : 'Whole agency') : (es ? 'Global (todo Clio)' : 'Global (all Clio)');

    if (isAdmin === false) {
        return (
            <div className="p-8 text-center text-sm text-slate-500">
                {es ? 'Esta sección es solo para los admins de Clio.' : 'This section is for Clio admins only.'}
            </div>
        );
    }

    const pending = rules.filter(r => r.status === 'pending');
    const active = rules.filter(r => r.status === 'approved');

    const RuleCard: React.FC<{ r: Rule; mode: 'pending' | 'active' }> = ({ r, mode }) => (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold">{tplName(r.template_id)}</span>
                {r.category && <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold">{CATEGORY_ES[r.category] || r.category}</span>}
                <span className="text-slate-500">{scopeLabel(r)}</span>
                <span className="text-slate-400">· {fmtDate(r.created_at)}</span>
            </div>
            {r.source_feedback_ids.map(id => feedbackById[id]).filter(Boolean).map(f => (
                <div key={f!.id} className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 p-2.5 text-[12px]">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        {es ? 'Comentario de' : 'Comment from'} {f!.supervisor_name || (es ? 'supervisor' : 'supervisor')} · CM {who(f!.user_id)}
                    </p>
                    <p className="mt-1 italic text-slate-700 dark:text-slate-200">"{f!.feedback_text}"</p>
                    {f!.ai_summary && <p className="mt-1 text-slate-500">{f!.ai_summary}</p>}
                </div>
            ))}
            {mode === 'pending' ? (
                <textarea
                    rows={3}
                    value={edits[r.id] ?? r.rule_text}
                    onChange={(e) => setEdits(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100"
                />
            ) : (
                <p className="text-[13px] text-slate-800 dark:text-slate-100">{r.rule_text}</p>
            )}
            <div className="flex flex-wrap gap-2">
                {mode === 'pending' && (
                    <>
                        <button disabled={busyId === r.id} onClick={() => review(r, 'approved', 'profile')} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold inline-flex items-center gap-1 disabled:opacity-60">
                            {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            {es ? 'Aprobar para este CM' : 'Approve for this CM'}
                        </button>
                        <button disabled={busyId === r.id} onClick={() => review(r, 'rejected')} className="h-8 px-3 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[12px] font-semibold inline-flex items-center gap-1">
                            <XCircle size={13} /> {es ? 'Rechazar' : 'Reject'}
                        </button>
                    </>
                )}
                {mode === 'active' && (
                    <>
                        {r.scope === 'profile' && (
                            <button disabled={busyId === r.id} onClick={() => review(r, 'approved', 'clinic')} className="h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-[12px] font-semibold inline-flex items-center gap-1">
                                <Users size={13} /> {es ? 'Subir a toda la agencia' : 'Promote to agency'}
                            </button>
                        )}
                        {r.scope !== 'global' && (
                            <button disabled={busyId === r.id} onClick={() => review(r, 'approved', 'global')} className="h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-[12px] font-semibold inline-flex items-center gap-1">
                                <ShieldCheck size={13} /> {es ? 'Subir a global' : 'Promote to global'}
                            </button>
                        )}
                        <button disabled={busyId === r.id} onClick={() => review(r, 'retired')} className="h-8 px-3 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[12px] font-semibold inline-flex items-center gap-1">
                            <Archive size={13} /> {es ? 'Retirar' : 'Retire'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">
            <div>
                <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-500" />
                    {es ? 'Reglas de documentación' : 'Documentation rules'}
                </h1>
                <p className="text-[12.5px] text-slate-500 mt-1">
                    {es
                        ? 'Reglas propuestas desde los comentarios de los supervisores. Aprobadas, se aplican solo a las notas futuras del CM (o de la agencia / global si las subes). Nunca cambian el template base.'
                        : 'Rules proposed from supervisor comments. Once approved they apply only to the CM future notes (or agency / global if promoted). They never change the base template.'}
                </p>
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 w-fit">
                {([
                    ['pending', `${es ? 'Pendientes' : 'Pending'} (${pending.length})`],
                    ['active', `${es ? 'Activas' : 'Active'} (${active.length})`],
                    ['panel', es ? 'Panel de rechazos' : 'Rejection panel'],
                ] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setTab(k)} className={`px-3 h-8 rounded-lg text-[12px] font-bold ${tab === k ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>
                ))}
            </div>

            {loading ? (
                <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : tab === 'pending' ? (
                <div className="space-y-3">
                    {pending.length === 0 && <p className="text-[13px] text-slate-500">{es ? 'No hay reglas pendientes.' : 'No pending rules.'}</p>}
                    {pending.map(r => <RuleCard key={r.id} r={r} mode="pending" />)}
                </div>
            ) : tab === 'active' ? (
                <div className="space-y-3">
                    {active.length === 0 && <p className="text-[13px] text-slate-500">{es ? 'No hay reglas activas.' : 'No active rules.'}</p>}
                    {active.map(r => <RuleCard key={r.id} r={r} mode="active" />)}
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                        <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Users size={14} /> {es ? 'Se repite en varios CMs (candidatas a agencia o global)' : 'Repeated across CMs (agency/global candidates)'}</h2>
                        {repeated.length === 0 ? (
                            <p className="mt-2 text-[12.5px] text-slate-500">{es ? 'Todavía no hay comentarios repetidos entre perfiles.' : 'No repeated comments across profiles yet.'}</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {repeated.map((g, i) => (
                                    <li key={i} className="text-[12.5px] text-slate-700 dark:text-slate-200">
                                        <span className="font-bold">{tplName(g.template_id)}</span> · {CATEGORY_ES[g.category || ''] || g.category || ''} · {g.users.size} CMs
                                        <ul className="ml-4 list-disc text-slate-500">{g.rules.slice(0, 3).map(r => <li key={r.id}>{r.rule_text}</li>)}</ul>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-x-auto">
                        <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><BarChart3 size={14} /> {es ? 'Comentarios por template y tipo' : 'Comments by template and type'}</h2>
                        <table className="mt-2 w-full text-[12.5px]">
                            <thead>
                                <tr className="text-left text-slate-400 text-[11px] uppercase">
                                    <th className="py-1 pr-3">Template</th><th className="pr-3">{es ? 'Tipo' : 'Type'}</th><th className="pr-3">{es ? 'Comentarios' : 'Comments'}</th><th className="pr-3">CMs</th><th className="pr-3">{es ? 'Supervisores' : 'Supervisors'}</th><th className="pr-3">{es ? 'Agencias' : 'Agencies'}</th><th>{es ? 'Último' : 'Last'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {panel.length === 0 && <tr><td colSpan={7} className="py-2 text-slate-500">{es ? 'Sin comentarios todavía.' : 'No comments yet.'}</td></tr>}
                                {panel.map((p, i) => (
                                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                                        <td className="py-1.5 pr-3">{tplName(p.template_id)}</td>
                                        <td className="pr-3">{CATEGORY_ES[p.category || ''] || p.category || ''}</td>
                                        <td className="pr-3 font-bold">{p.feedback_count}</td>
                                        <td className="pr-3">{p.cm_count}</td>
                                        <td className="pr-3">{p.supervisor_count}</td>
                                        <td className="pr-3">{p.clinic_count}</td>
                                        <td>{fmtDate(p.last_seen)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                        <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-500">{es ? 'Últimos comentarios' : 'Latest comments'}</h2>
                        <ul className="mt-2 space-y-2">
                            {feedback.slice(0, 20).map(f => (
                                <li key={f.id} className="text-[12.5px] text-slate-700 dark:text-slate-200">
                                    <span className="text-slate-400">{fmtDate(f.created_at)} · {tplName(f.template_id)} · CM {who(f.user_id)} · {f.supervisor_name || ''}</span>
                                    <br />"{f.feedback_text}" {f.applied_to_note ? <span className="text-emerald-600 text-[11px] font-bold">· {es ? 'aplicado' : 'applied'}</span> : null}
                                </li>
                            ))}
                            {feedback.length === 0 && <li className="text-slate-500">{es ? 'Sin comentarios todavía.' : 'No comments yet.'}</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentationRules;
