# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-11-04
- **Rama Actual:** `feat/tcm-templates-v2`
- **Estado de Compilación (`npm run build`):** ✅ Limpio (0 errores)
- **Estado de Producción (`clinicflow.dev`):** ✅ Desplegado al 100% (Frontend + n8n + RPA Bot + Selector Minimalista de Encuentro)

---

## Lo que ya está Completado y Desplegado en Producción
1. **Rediseño Estético del Popover de Calendario & Horas (`CalendarWithTimePresets`):**
   - **Glassmorphism HUD:** Fondo obsidiana profundo `dark:bg-[#0c111d]/95` con `backdrop-blur-2xl`, borde `border-slate-800/80`, esquinas `rounded-3xl` (`24px`) y sombra con aura violeta.
   - **Tipografía y Jerarquía:** Encabezados uppercase con espaciado amplio `tracking-[0.12em]`, días de la semana `SUN, MON, TUE...` compactos y limpios.
   - **Visualización START / END:** Cajas tipo píldora `--:--` en la cabecera que reflejan el estado de hora seleccionado.
   - **Rango ampliado:** Soporte desde las **06:00 AM** hasta las **21:00 (9:00 PM)** con slots de 15 min para cubrir visitas y citas tempranas.
   - **Botones y Acciones:** Botones de hora redondeados (`rounded-2xl`), gradiente característico de Clio (`from-indigo-600 to-violet-600`), indicador discreto para `isToday` y botón "Continuar / Continue" en píldora con micro-interacción `active:scale-95`.
2. **Platform Admins & Pantalla de Reglas (`/admin/rules`):**
   - Flag `is_platform_admin` configurado en `profiles` para `reinier.roa2.0@gmail.com` y `asleylegidos@gmail.com`.
   - Pantalla `src/pages/DocumentationRules.tsx` desplegada en `https://notes.clinicflow.dev/admin/rules`.
   - Diálogo `SupervisorFeedbackDialog.tsx` integrado en `TcmNoteShell.tsx` para captura de feedback directo en las notas.
3. **Supervisor Feedback Loop (Base de Datos & Reglas por Perfil):**
   - Creada y aplicada la migración `supabase_supervisor_feedback.sql`.
   - Tablas `public.supervisor_feedback` y `public.documentation_rules` con RLS, índices, triggers y vista `supervisor_feedback_panel` activas en Supabase.
4. **Templates TCM v2 (Commits de Claude / alegidos):**
   - **Formato determinista de nombres de pacientes:** "First Last" en la primera mención y luego primer nombre.
   - **Badges `[CONFIRM]` clickeables interactivos:** Permiten al clínico resolver y completar los datos directamente en la nota y sincronizar con la ficha del paciente.
   - **Títulos oficiales de intake:** Actualizados para todos los templates de admisión.
   - **Develop Assessment y Adult Certification v2:** Templates enriquecidos con estándares oficiales de la agencia.
   - **Seguridad y Orientación:** Restauración de reglas de orientación y seguridad por excepción.
   - **Eliminación de narración de vacíos (Gap Narration):** Se eliminaron frases redundantes de datos faltantes en los prompts y en el frontend (`stripGapNarration`).
   - **Modal de confirmación interactivo en Clio:** Diálogo propio con opciones para completar TCM Social o continuar.
5. **Exportación e Integración de los 10 Workflows de n8n:**
   - Todos los 10 workflows ahora residen formalmente en `scratch/`.
   - Se configuró [`scratch/sync_all_workflows.cjs`](scratch/sync_all_workflows.cjs) de forma multiplataforma (Windows y Linux en GitHub Actions) para inyectar los 10 workflows en la base de datos de n8n.
6. **Mascota Interactiva Petal Guide de Clio (`ClioPetalGuide`):**
   - Creado `src/components/ui/clio-petal-guide.tsx`.
   - Diseño ultra-minimalista estilo Grok: silueta monocromática pura con dos ojos verticales tipo cápsula negra (`#09090b`), parpadeo sutil y seguimiento interactivo del cursor del mouse.
7. **CI/CD Automático de GitHub Actions (`deploy.yml`):**
   - Configurado para escuchar ramas `main` y `feat/**` / `feat/*`, desplegando automáticamente en cada push de Claude o el equipo.
   - Se configuró el secreto `VPS_SSH_KEY` en GitHub Actions.
8. **Protocolo de Colaboración Multi-Agente (Anti-Conflicto):**
   - Documentado en `brain/SYSTEM_MAP.md` sección 6 para evitar bloqueos y colisiones entre Claude y Antigravity.

---

## Próximos Pasos
- Inyectar reglas aprobadas de `documentation_rules` en el payload de `Record.tsx` hacia n8n.
- Actualizar el mapeo de servicios en `amexzone-bot/worker.js` cuando se definan los nombres finales de los nuevos templates para Amexzone EHR.
