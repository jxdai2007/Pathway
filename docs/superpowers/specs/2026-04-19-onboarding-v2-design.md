# Onboarding v2 — Design Spec

**Date**: 2026-04-19
**Branch**: `onboarding-v2` (parallel to notebook cluster on `main`)
**Status**: design approved, ready for implementation plan

---

## 1. Goal

Extend the current 10-step onboarding into an adaptive, data-driven flow that captures five new signals (horizons, satisfaction, blocker, pivot, communities) plus transfer-student branching — and that **visually matches the paper-notebook aesthetic of the pathway page** so the onboarding → pathway handoff feels like turning the page of the same notebook.

The new signals feed the Claude prompt via a clean seam (`formatStudentContext`) that the locked-for-this-branch notebook cluster integrates with one import and one line of concatenation after their work merges.

## 2. Non-goals

- Editing `lib/claude.ts` (locked by notebook cluster).
- Editing `components/notebook/*` or `components/tree/*` (locked).
- Importing from `components/notebook/*` — visual assets are cloned into `components/onboarding/` to avoid merge coupling.
- Resume / LinkedIn parsing — separate spec, separate branch.
- Email generation / send from cards — partly already in `outreach_email_draft`; send is deferred post-notebook.
- Mobile / tablet layouts.
- Saving or resuming partial onboarding.
- Identity inference from any external source.

## 3. Parallel-safety contract

Files this branch **writes**:
- `lib/schemas.ts` — additions go at the bottom, below the existing `Cite / Node / ExpandRequest` block. Additive only.
- `store/profile.ts` — type widened from `IntakeProfile` to `IntakeProfileV2` (superset; zero runtime change).
- `data/ucla/personas.json` — existing entries extended with optional v2 fields; Priya added.
- `components/onboarding/**` — new engine shell, per-step components, cloned rough primitives, cloned paper CSS.
- `lib/onboarding-engine.ts` — new file.
- `lib/student-context.ts` — new file (the Claude seam).
- Test files colocated in `lib/` and `components/onboarding/steps/`.

Files this branch **does not touch**:
- `lib/claude.ts`, `lib/notebook-engine.ts`, `lib/filter.ts`, `lib/fallback.ts`, `lib/freehand.ts`, `lib/stages.ts`.
- `app/api/expand-node/route.ts`.
- `store/pathway.ts`.
- `components/notebook/**`, `components/tree/**`.

Merge strategy: if both this branch and the notebook cluster extend `lib/schemas.ts`, keep both additions — they are additive and cannot conflict because notebook additions live in the `Cite/Node/ExpandRequest` block and v2 additions live at the bottom.

## 4. Data model (`lib/schemas.ts` additions, appended to bottom)

```ts
// ─────────────────────────────────────────────────────────
// Onboarding v2 additions
// Appended at bottom to avoid merge conflicts with notebook
// cluster's Cite/Node/ExpandRequest block.
// ─────────────────────────────────────────────────────────

export const HorizonsSchema      = z.number().int().min(1).max(10);
export const SatisfactionSchema  = z.number().int().min(1).max(5);

export const BlockerEnum = z.enum([
  'too_many_options',
  'dont_know_whats_out_there',
  'none',
]);

export const CommunityTagEnum = z.enum([
  'first_gen', 'transfer', 'veteran', 'international',
  'lgbtq_plus', 'disability', 'religious', 'cultural_org',
  'none', 'prefer_not_to_say',
]);

export const PivotSignalSchema = z.object({
  triggered:    z.boolean(),
  pivot_from:   z.string().max(120).optional(),
  pivot_target: z.string().max(120).optional(),
});

export const TransferProfileSchema = z.object({
  prior_school:    z.string().max(80),
  terms_remaining: z.number().int().min(1).max(12),
});

export const IntakeProfileV2Ext = z.object({
  horizons:     HorizonsSchema.optional(),
  satisfaction: SatisfactionSchema.optional(),
  blocker:      BlockerEnum.optional(),
  communities:  z.array(CommunityTagEnum).max(6).optional(),
  pivot:        PivotSignalSchema.optional(),
  transfer:     TransferProfileSchema.optional(),
  is_transfer:  z.boolean().optional(),
});

export const IntakeProfileV2Schema = IntakeProfileSchema.merge(IntakeProfileV2Ext);
export type IntakeProfileV2 = z.infer<typeof IntakeProfileV2Schema>;
```

Rationale: merging an optional extension produces a strict superset. Every existing consumer of `IntakeProfile` accepts `IntakeProfileV2` without change. Type-level only.

## 5. Adaptive engine (`lib/onboarding-engine.ts` — new file)

Pure, side-effect-free, no React. One exported registry plus navigation helpers.

```ts
import type { IntakeProfileV2 } from '@/lib/schemas';

export type StepId =
  | 'welcome' | 'year' | 'major' | 'transfer_ask' | 'transfer_detail'
  | 'hours' | 'aid' | 'firstgen' | 'communities'
  | 'interests' | 'horizons' | 'mode' | 'satisfaction' | 'pivot'
  | 'adjacent' | 'blocker' | 'goal'
  | 'confirm';

export type Phase = 'basics' | 'situation' | 'direction' | 'confirm';

export interface StepDef {
  id: StepId;
  phase: Phase;
  showWhen:   (p: Partial<IntakeProfileV2>) => boolean;
  canAdvance: (p: Partial<IntakeProfileV2>) => boolean;
}

export const STEPS: StepDef[] = [
  { id: 'welcome',         phase: 'basics',    showWhen: () => true,
    canAdvance: () => true },
  { id: 'year',            phase: 'basics',    showWhen: () => true,
    canAdvance: p => !!p.year },
  { id: 'major',           phase: 'basics',    showWhen: () => true,
    canAdvance: p => !!p.major_category },
  { id: 'transfer_ask',    phase: 'basics',    showWhen: () => true,
    canAdvance: p => p.is_transfer !== undefined },
  // R1: transfer=true injects prior-school + terms-remaining slide
  { id: 'transfer_detail', phase: 'basics',
    showWhen:   p => p.is_transfer === true,
    canAdvance: p => !!p.transfer?.prior_school
                   && p.transfer?.terms_remaining !== undefined },
  { id: 'hours',           phase: 'situation', showWhen: () => true,
    canAdvance: p => p.hours_per_week !== undefined },
  { id: 'aid',             phase: 'situation', showWhen: () => true,
    canAdvance: p => !!p.aid_status },
  { id: 'firstgen',        phase: 'situation', showWhen: () => true,
    canAdvance: p => p.first_gen !== undefined },
  { id: 'communities',     phase: 'situation', showWhen: () => true,
    canAdvance: () => true }, // skip-able (empty selection valid)
  { id: 'interests',       phase: 'direction', showWhen: () => true,
    canAdvance: p => (p.interests?.length ?? 0) >= 1 },
  { id: 'horizons',        phase: 'direction', showWhen: () => true,
    canAdvance: p => p.horizons !== undefined },
  { id: 'mode',            phase: 'direction', showWhen: () => true,
    canAdvance: p => !!p.mode },
  { id: 'satisfaction',    phase: 'direction', showWhen: () => true,
    canAdvance: p => p.satisfaction !== undefined },
  // R4: satisfaction ≤ 2 OR user flags pivot → show pivot slide
  { id: 'pivot',           phase: 'direction',
    showWhen:   p => (p.satisfaction ?? 5) <= 2 || p.pivot?.triggered === true,
    canAdvance: p => !!p.pivot?.pivot_from && !!p.pivot?.pivot_target },
  // R3: horizons ≥ 7 → show adjacent-fields slide
  { id: 'adjacent',        phase: 'direction',
    showWhen: p => (p.horizons ?? 5) >= 7,
    canAdvance: () => true },
  // R6/R7: blocker biases the Claude prompt (effect in formatStudentContext)
  { id: 'blocker',         phase: 'direction', showWhen: () => true,
    canAdvance: p => !!p.blocker },
  { id: 'goal',            phase: 'direction', showWhen: () => true,
    canAdvance: () => true },
  { id: 'confirm',         phase: 'confirm',   showWhen: () => true,
    canAdvance: () => true },
];

export function nextStep(current: StepId, p: Partial<IntakeProfileV2>): StepId | null {
  const i = STEPS.findIndex(s => s.id === current);
  for (let j = i + 1; j < STEPS.length; j++) if (STEPS[j].showWhen(p)) return STEPS[j].id;
  return null;
}

export function prevStep(current: StepId, p: Partial<IntakeProfileV2>): StepId | null {
  const i = STEPS.findIndex(s => s.id === current);
  for (let j = i - 1; j >= 0; j--) if (STEPS[j].showWhen(p)) return STEPS[j].id;
  return null;
}

export function visibleSteps(p: Partial<IntakeProfileV2>): StepDef[] {
  return STEPS.filter(s => s.showWhen(p));
}

export function phaseProgress(
  current: StepId,
  p: Partial<IntakeProfileV2>,
): { phase: Phase; index: number; total: number } {
  const visible = visibleSteps(p);
  const cur = visible.find(s => s.id === current);
  if (!cur) return { phase: 'basics', index: 0, total: 0 };
  const phaseSteps = visible.filter(s => s.phase === cur.phase);
  return {
    phase: cur.phase,
    index: phaseSteps.findIndex(s => s.id === current),
    total: phaseSteps.length,
  };
}
```

### Branching rules (summary)

| Rule | Trigger | Effect |
|------|---------|--------|
| R1 | `is_transfer === true` | inject `transfer_detail` slide |
| R2 | *dropped* — `communities` always shown; empty selection is valid |
| R3 | `horizons ≥ 7` | inject `adjacent` slide |
| R4 | `satisfaction ≤ 2` OR user taps "I want to pivot" | inject `pivot` slide |
| R5 | N/A | auto-inferred from `communities` array; no separate slide |
| R6 | `blocker === 'too_many_options'` | `formatStudentContext` emits narrow-focus bias |
| R7 | `blocker === 'dont_know_whats_out_there'` | `formatStudentContext` emits broaden-discovery bias |

R2 was simplified vs the original brief: gating communities on `horizons` required horizons to come before it in the flow, but horizons is in Phase 3 and communities is in Phase 2. Dropping the skip keeps phase order natural; empty selection is the fast path (one click on "prefer not to share").

## 6. UI — notebook aesthetic

The onboarding flow is presented as pages of the **same paper notebook** the user will land on after confirming. Same paper background, same red margin line, same Caveat (display) + Kalam (body) cursive pairing, same rough-drawn outlines for choice cards, same sticky-note visual for the pivot slide.

### 6.1 Visual assets — cloned, not imported

To stay parallel-safe, these assets are **cloned** into `components/onboarding/`:

- `components/onboarding/onboarding.module.css` — clones the paper background, ruled lines, red margin, edge vignette, and animation keyframes from `components/notebook/notebook.module.css`. The classnames are prefixed `ob*` (e.g., `.obPaper`, `.obMargin`, `.obStickyDrop`) so the two CSS modules cannot clash.
- `components/onboarding/rough.tsx` — exports `ObRoughRect`, `ObFreehandUnderline`, `ObFreehandCheck`, `ObFreehandStrike`, `ObFreehandArrow`. Each is a small (~30 line) React component that uses `roughjs` directly, same API shape as the notebook equivalents but independently maintained.

Fonts are already loaded globally in `app/layout.tsx` (`--font-caveat`, `--font-kalam`). No font work needed.

After the notebook cluster merges, a follow-up cleanup PR can dedupe these into a shared `components/shared/` module. Out of scope for this branch.

### 6.2 File layout

```
components/onboarding/
├── Onboarding.tsx             # shell: engine loop, header, keyboard nav, persona demo
├── SlideShell.tsx             # EXISTING — updated to notebook aesthetic
├── GoalSuggestions.tsx        # EXISTING — visual polish only
├── PhaseHeader.tsx            # NEW — phase ribbon + hand-drawn tick ruler + demo menu
├── DemoMenu.tsx               # NEW — Maya / Priya / Raj dropdown
├── onboarding.module.css      # NEW — paper/margin/animation clone, ob* prefix
├── rough.tsx                  # NEW — minimal rough primitives (5 exports)
└── steps/
    ├── types.ts               # NEW — StepProps interface
    ├── WelcomeStep.tsx
    ├── YearStep.tsx
    ├── MajorStep.tsx
    ├── TransferAskStep.tsx
    ├── TransferDetailStep.tsx
    ├── HoursStep.tsx
    ├── AidStep.tsx
    ├── FirstGenStep.tsx
    ├── CommunitiesStep.tsx
    ├── InterestsStep.tsx
    ├── HorizonsStep.tsx
    ├── ModeStep.tsx
    ├── SatisfactionStep.tsx
    ├── PivotStep.tsx
    ├── AdjacentStep.tsx
    ├── BlockerStep.tsx
    ├── GoalStep.tsx
    └── ConfirmStep.tsx
```

### 6.3 Step contract

```ts
// components/onboarding/steps/types.ts
import type { IntakeProfileV2 } from '@/lib/schemas';

export interface StepProps {
  profile:     Partial<IntakeProfileV2>;
  update:      (patch: Partial<IntakeProfileV2>) => void;
  advance:     () => void;  // calls engine.nextStep
  autoAdvance: () => void;  // 180ms debounced advance (single-choice slides)
}
```

Each step is 40–80 lines, focused, unit-testable.

### 6.4 Header layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Pathway · a working notebook          [▾ Demo · Maya ▾]         │  ← Caveat title + corner tab
│  Basics   ·   Situation   ·  Direction   ·   Confirm             │  ← phases, current in ink-red
│  ├──●──┤                                                         │  ← hand-drawn sub-ruler for current phase
└─────────────────────────────────────────────────────────────────┘
                           ┃  ← red margin line continues down page
```

- Phase names in Caveat, current phase color `var(--ink-red)`, others `var(--ink-muted)`.
- Sub-ruler: one hand-drawn line with tick marks equal to visible-steps-in-current-phase; filled tick at current index. Draws with the same `draw-on` keyframe used by rough SVGs.
- Demo menu: corner-tab dropdown with a 1° rotation (hand-drawn feel) — Caveat label, Kalam list items with tagline.

### 6.5 Step visual language

- **Welcome**: full-paper landing page. Caveat title `"The mentor who's been at UCLA for ten years."` over ruled paper. Red margin visible. CTA is a rough-outlined button with Caveat red label `Let's start →`.
- **Single-choice slides** (`year`, `aid`, `firstgen`, `transfer_ask`, `mode`, `blocker`, `satisfaction`): vertical stack of `ObRoughRect`-outlined choice cards; selected card shows `ObFreehandCheck` at its right; unselected cards get a subtle `ObFreehandStrike` on hover to telegraph toggle. 180 ms auto-advance on pick.
- **Free-text slides** (`major`, `transfer_detail.prior_school`, `goal`): input styled as "write on the line" — no border box, just Kalam text sitting on a single ruled line. Caret is large + ink-navy.
- **Interests**: Kalam chips, `ObRoughRect` outline. Selected chips fill with paper-2; capped at 3 with live counter below.
- **Hours**: hand-drawn horizontal ruler with tick at each hour, draggable marker (Kalam number label floats above). Replaces native `<input type=range>`.
- **Horizons**: same hand-drawn ruler, 10 ticks, anchor labels in Kalam underneath — `this qtr · this yr · ~2 yrs · ~4 yrs · post-grad · 10+ yrs`. Live label in Caveat above the marker: "~ 2 yrs".
- **Communities**: chip grid, same style as interests. A prominent `ObRoughRect`-outlined row at top: `Prefer not to share` — tapping it clears all chips and disables the grid (greyed + non-interactive). Tapping it a second time re-enables the grid (and leaves chips empty). `canAdvance` is always true for this step; the "prefer not to share" action is stored as `communities: []` plus an internal `skipped` flag in component state (not written to the profile).
- **Pivot** (`pivot` step): two **sticky-note cards** side-by-side, reusing the drop + wobble + handwrite keyframes from the notebook aesthetic (cloned as `obStickyDrop`, `obStickyWrite` in the onboarding CSS module). Left note: `"Coming from"` caveat label + Kalam textarea. Right note: `"Moving toward"`. Small muted link below: `skip — just exploring` → sets `pivot.triggered = false` and advances.
- **Adjacent**: chip grid of adjacent field suggestions driven off `major_category`; selected chips tucked into a Kalam "notes to self" list.
- **Confirm**: summary laid out as a notebook page — each captured field on its own ruled line, label in Caveat red, value in Kalam ink. Transfer / pivot / communities blocks rendered only if populated. Per-row "edit" link (Caveat, ink-red, hand-drawn underline) jumps back to the corresponding step. CTA: rough-outlined button `Generate my notebook →` in Caveat red.

### 6.6 Interaction

- Keyboard: `←` prev, `→` next (both engine-aware), `Enter` advances when `canAdvance` is true.
- Auto-advance: 180 ms after a single-choice selection (matches today's UX).
- Back: always walks engine's `prevStep` — skip-rule-aware both directions.
- Validation: per-step `canAdvance` gates the Next affordance. Global schema validation runs only on Confirm.
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` maps sticky drop/write/sign animations to a simple fade — keyframes cloned with that media query intact.

### 6.7 Progress semantics

Sub-ruler ticks count **visible** steps in the current phase, not the total static count. When branching injects `pivot` or `adjacent`, the ruler silently grows — the user sees their marker stay put while new ticks appear ahead of it. This avoids the "wait, why does it say 3 of 7 now?" moment users would get from a flat counter.

## 7. Personas (`data/ucla/personas.json`)

Existing Maya and Raj entries extended with optional v2 fields. Priya added. A `tagline` field is added for the demo dropdown label.

```json
[
  {
    "key": "maya",
    "display_name": "Maya Chen",
    "tagline": "Freshman CS · discovery",
    "profile": {
      "year": "freshman",
      "major_category": "stem",
      "first_gen": true,
      "aid_status": "pell",
      "hours_per_week": 8,
      "interests": ["ai_ml", "data", "storytelling"],
      "mode": "discovery",
      "is_transfer": false,
      "horizons": 4,
      "satisfaction": 4,
      "blocker": "dont_know_whats_out_there",
      "communities": ["first_gen"]
    }
  },
  {
    "key": "raj",
    "display_name": "Raj Patel",
    "tagline": "Transfer · directed · PhD-bound",
    "profile": {
      "year": "sophomore",
      "major_category": "stem",
      "first_gen": false,
      "aid_status": "none",
      "hours_per_week": 15,
      "interests": ["ai_ml", "math", "teaching"],
      "mode": "directed",
      "end_goal": "Apply to PhD programs in AI/ML. Not sure what steps get me there.",
      "is_transfer": true,
      "transfer": { "prior_school": "Santa Monica College", "terms_remaining": 6 },
      "horizons": 8,
      "satisfaction": 4,
      "blocker": "too_many_options",
      "communities": ["transfer"]
    }
  },
  {
    "key": "priya",
    "display_name": "Priya Shah",
    "tagline": "Junior English → pivoting",
    "profile": {
      "year": "junior",
      "major_category": "humanities",
      "first_gen": false,
      "aid_status": "work_study",
      "hours_per_week": 10,
      "interests": ["storytelling", "policy", "design"],
      "mode": "partial",
      "end_goal": "Find a path that combines writing with product or policy work.",
      "is_transfer": false,
      "horizons": 5,
      "satisfaction": 2,
      "pivot": {
        "triggered": true,
        "pivot_from": "Literature / academia track",
        "pivot_target": "Product or policy — still exploring"
      },
      "blocker": "too_many_options",
      "communities": ["first_gen"]
    }
  }
]
```

Coverage check: Maya exercises no-pivot / no-adjacent / has-communities. Raj exercises transfer detail + adjacent (horizons=8). Priya exercises pivot (satisfaction=2) + humanities seeds. Every branching rule (R1, R3, R4, R6, R7) is hit across the three demos.

### Persona application (shell)

```ts
function applyPersona(key: string) {
  const p = personas.find(x => x.key === key);
  if (!p) return;
  setDraft(p.profile as Partial<IntakeProfileV2>);
  setCurrent('confirm');
}
```

Engine doesn't care how the profile got populated — jumping to `confirm` lets the user review and edit as usual.

## 8. Store (`store/profile.ts`)

```ts
import { create } from 'zustand';
import type { IntakeProfileV2 } from '@/lib/schemas';

type ProfileState = {
  profile: IntakeProfileV2 | null;
  setProfile: (p: IntakeProfileV2) => void;
  reset: () => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  reset: () => set({ profile: null }),
}));
```

Type widening only. All existing notebook code that reads `profile.year`, `profile.major_category`, `profile.mode`, etc., keeps working because `IntakeProfileV2` is a strict superset.

## 9. Claude seam (`lib/student-context.ts` — new file)

The integration point for the notebook cluster. Pure, no imports from locked files.

```ts
import type { IntakeProfileV2 } from '@/lib/schemas';

/**
 * Formats v2 signals into a <student_context> XML block for Claude prompts.
 * Returns an empty string when no v2 signals are present, so the call site
 * can concat unconditionally.
 *
 * Integration diff (to be applied by the notebook cluster after merge):
 *   import { formatStudentContext } from '@/lib/student-context';
 *   const prompt = buildBasePrompt(...) + formatStudentContext(profile);
 */
export function formatStudentContext(profile: IntakeProfileV2): string {
  const lines: string[] = [];

  if (profile.horizons !== undefined) {
    lines.push(
      `<horizons>${profile.horizons}/10 (${anchorLabel(profile.horizons)})</horizons>`
    );
  }
  if (profile.satisfaction !== undefined) {
    lines.push(
      `<satisfaction>${profile.satisfaction}/5 — clarity of current path</satisfaction>`
    );
  }
  if (profile.blocker && profile.blocker !== 'none') {
    lines.push(`<blocker>${profile.blocker}</blocker>`);
    lines.push(`<prompt_bias>${biasFor(profile.blocker)}</prompt_bias>`);
  }
  if (profile.pivot?.triggered) {
    lines.push(
      `<pivot from="${esc(profile.pivot.pivot_from ?? '')}" to="${esc(profile.pivot.pivot_target ?? '')}" />`
    );
  }
  if (profile.is_transfer && profile.transfer) {
    lines.push(
      `<transfer prior_school="${esc(profile.transfer.prior_school)}" terms_remaining="${profile.transfer.terms_remaining}" />`
    );
  }
  if (profile.communities?.length) {
    lines.push(`<communities>${profile.communities.join(', ')}</communities>`);
  }

  return lines.length
    ? `\n<student_context>\n${lines.join('\n')}\n</student_context>\n`
    : '';
}

function anchorLabel(h: number): string {
  if (h <= 1) return 'this quarter';
  if (h <= 2) return 'this year';
  if (h <= 4) return '~2 yrs';
  if (h <= 6) return '~4 yrs';
  if (h <= 8) return 'post-grad';
  return '10+ yrs';
}

function biasFor(b: 'too_many_options' | 'dont_know_whats_out_there'): string {
  return b === 'too_many_options'
    ? 'narrow: focus one thing, return fewer + higher-confidence candidates'
    : 'broaden: show discovery breadth, surface unexpected adjacent paths';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}
```

## 10. Integration diff (apply after notebook cluster merges)

This diff is documented here so the notebook cluster can apply it with zero guesswork.

```diff
// In whichever lib/claude.ts function assembles the expand-node prompt
+ import { formatStudentContext } from '@/lib/student-context';
  ...
  const base = buildBasePrompt(profile, ...);
+ const contextBlock = formatStudentContext(profile);
  ...
- return base;
+ return base + contextBlock;
```

One import, one call, one concatenation. Until this diff lands, v2 signals are captured, shown in Confirm, and persisted to the profile store — but do not yet change Claude output. Demo onboarding UX still works; tree output remains v1-shaped.

## 11. Tests

All colocated with the code they cover, using the existing test runner.

- `lib/onboarding-engine.test.ts`
  - Forward/back navigation respects `showWhen`.
  - R1: `is_transfer=true` injects `transfer_detail`.
  - R3: `horizons >= 7` injects `adjacent`.
  - R4a: `satisfaction <= 2` injects `pivot`.
  - R4b: manual `pivot.triggered = true` injects `pivot` even when satisfaction > 2.
  - Back navigation from an injected slide returns to the correct predecessor in all branches.
  - `phaseProgress` advances the tick ruler correctly when branching slides inject or drop out.
- `lib/student-context.test.ts`
  - Empty profile → empty string.
  - Each signal produces its expected block.
  - Blocker produces the matched bias phrase.
  - Pivot / transfer escape user-supplied strings (XML-safe).
- `lib/schemas.test.ts`
  - Each persona round-trips through `IntakeProfileV2Schema.safeParse` successfully.
  - Malformed pivot (missing `pivot_from`) rejected with actionable zod message.
  - Legacy `IntakeProfile` objects (no v2 fields) still pass `IntakeProfileV2Schema.safeParse`.
- Component tests per step (spot-check: three representative steps — YearStep, PivotStep, CommunitiesStep) — verify `update` patches the right profile keys and `canAdvance` gates advance correctly.

TDD order: engine tests → engine impl → per-step components (each with its own test) → shell → schema tests → seam tests.

## 12. Migration strategy

Keeps the demo running on `main`-equivalent throughout the branch.

1. Land schema additions + tests. Existing `IntakeProfile` still passes.
2. Land engine + tests. No UI change yet.
3. Land `lib/student-context.ts` + tests. No call-site yet.
4. Land cloned rough + CSS module. No component change yet.
5. Add `steps/*.tsx` files one at a time, each behind a test.
6. Swap `Onboarding.tsx` from the current switch to the engine-driven shell. Old inline code deleted in the same commit only after full parity.
7. Extend personas (incl. Priya). Wire the demo dropdown.
8. Widen `store/profile.ts` to `IntakeProfileV2`. Type-level only.
9. Manual QA across all three personas and a fresh hand-entered flow.

## 13. Open risks & mitigations

- **Visual duplication** between `components/notebook/` and cloned `components/onboarding/rough.tsx` + CSS module. Accepted for merge safety; dedupe in a post-merge cleanup PR.
- **Claude ignores `<student_context>` block** until integration diff applied. Acceptable for this branch; spec calls out the diff explicitly.
- **First-time merge of `lib/schemas.ts`**: both branches extend it. Mitigation: v2 additions go at file bottom, notebook additions in the `Cite/Node/ExpandRequest` middle block — they cannot overlap.
- **Persona tagline not present on legacy entries** before this branch lands: handled by `tagline?: string` in the persona type and a fallback in `DemoMenu`.

## 14. Success criteria

- Full onboarding flow playable end-to-end for a hand-entered profile and for all three demo personas.
- Branching rules R1, R3, R4, R6, R7 demonstrably fire. Verification mechanism: an `?engine_trace=1` query param on the onboarding page enables a small fixed-position debug overlay showing the visible-steps array and the active `phaseProgress` state. The overlay is opt-in via query param only — never shown by default, so no "remove before demo" cleanup needed.
- Confirm page shows captured v2 fields and validates via `IntakeProfileV2Schema`.
- Visual transition from onboarding Confirm → `/pathway` feels continuous (same fonts, paper, margin).
- All tests green.
- Notebook cluster can merge the integration diff in §10 without touching anything else.
