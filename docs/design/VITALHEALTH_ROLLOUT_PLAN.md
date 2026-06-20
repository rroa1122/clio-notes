# Vitalhealth Redesign Rollout Plan

## Overview
This document outlines the strategic migration of the Clio Dashboard to the **Vitalhealth Visual Language**. The goal is to achieve a premium, clinical, enterprise SaaS aesthetic (Linear/Stripe-grade) through incremental, non-breaking UI updates.

---

## A) Design Audit: Current State

### Inconsistencies identified:
- **Typography Hierarchy**: Various pages use non-standardized heading sizes and font weights (e.g., `Overview` vs `Record`).
- **Spacing Incoherence**: Inconsistent padding scales (mix of `p-6`, `p-8`, `md:p-12`). Lack of a strict 4px grid outside of the newly polished `/notes/new`.
- **Corner Radii**: Mix of `rounded-md`, `rounded-xl`, and `rounded-[24px]`.
- **Shadows**: Some surfaces lack depth, while others use hard-coded shadows instead of theme-level tokens.

### Core Component Inventory:
- **Navigation**: Sidebar, Header.
- **Layout**: MainLayout, PageHeader, SectionHeader.
- **Data Display**: Table, Card, Badge, KPI-Tile.
- **Inputs**: Input, Select, Textarea, Button, Tabs.
- **Feedback**: Dialog, Toast, Skeleton.

---

## B) Proposed Token System (Vitalhealth Spec)

| Token Type | Value / Spec | Intent |
| :--- | :--- | :--- |
| **Background** | `hsl(210, 40%, 98.5%)` | Softly tinted "off-white" for page canvas. |
| **Surface** | `hsl(0, 0%, 100%)` | Pure white cards to "pop" off the tinted BG. |
| **Primary** | `hsl(231, 80%, 55%)` | Indigo clinical primary (Linear style). |
| **Secondary** | `hsl(210, 40%, 96.1%)` | Muted background for secondary actions/hover. |
| **Border** | `hsl(214, 32%, 91%)` | Subtle grey "hairline" borders. |
| **Radius (Card)** | `1.5rem` (24px) | Generous, soft rounded corners for high-level cards. |
| **Radius (Input)** | `0.75rem` (12px) | Functional, modern rounding for controls. |
| **Radius (Button)** | `0.625rem` (10px)| Tactile feel for primary actions. |
| **Shadow (Soft)** | `0 4px 20px -4px rgba(0,0,0,0.03)` | Level 1: Subtle elevation for small cards. |
| **Shadow (Elevated)**| `0 20px 50px rgba(0,0,0,0.04)` | Level 2: Deep, soft depth for primary page containers. |
| **Spacing Scale** | `4/8/12/16/24/32/40/64` | Multiples of 4 for strict rhythm. |

---

## C) Component Standardization Plan

### 1. Primitives (Phase A)
- **Button**: Unify `h-10` vs `h-11`, refine variants (Ghost, Outline), update focus rings.
- **Input/Select**: Standardize `h-11`, background colors, and primary focus states.
- **Card**: Standardize `CardHeader` padding and spacing between title/description.

### 2. High-Dependency Components (Phase B)
- **Sidebar**: Update background tint and active state glow.
- **Table**: Move to a minimalist, row-highlight centered design with refined dividers.

---

## D) Incremental Rollout Phases

| Phase | Target Route | Focus | Output |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation | Update `tailwind.config.js` with new tokens + `index.css`. | [TOKEN_BASELINE] |
| **Phase 2** | Dashboard | Calendar cards, KPI metrics, Layout spacing. | [DASHBOARD_VITAL] |
| **Phase 3** | /notes/new | Sync existing manual polish with new token system. | [NOTES_NEW_SYNC] |
| **Phase 4** | List Views | Calls History + Patients Directory (Table standardization).| [LISTS_VITAL] |
| **Phase 5** | Details | Call Detail + Patient Detail (if applicable). | [DETAILS_VITAL] |
| **Phase 6** | Extras | Templates, Settings, Auth screens. | [EXTRAS_VITAL] |

---

## E) Risk & Rollback Strategy

### Risk Assessment:
- **Layout Shift**: Standardizing padding might shift alignment in complex grids (Calendar).
- **Specificity Overrides**: Existing `.clio-notes-new` styles might clash with global tokens.
- **Accessibility**: Changing contrast must not dip below WCAG AA for clinical data.

### Rollback Strategy:
1. **Granular Commits**: Each phase must be a single, revertible commit.
2. **Visual QA**: Browser subagent will capture "After" screenshots for comparison against `docs/design/baseline/`.
3. **Safety First**: No business logic changes allowed. If a component refactor requires logic changes, it will be skipped and flagged.
4. **Immediate Revert**: `git checkout main -- [filepath]` if a migration fails visual audit.

---
*Prepared by Senior Product/Frontend Agent for Clio Health Dashboard Rollout.*
