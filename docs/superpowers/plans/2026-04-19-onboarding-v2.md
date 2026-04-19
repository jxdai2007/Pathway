# Onboarding v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Parallel execution:** Tasks in the same Wave have no dependencies on each other and should be dispatched concurrently via superpowers:dispatching-parallel-agents. Waves run sequentially.

**Goal:** Ship onboarding v2 — adaptive engine + notebook-aesthetic UI + Claude seam — on its own branch without touching files locked by the parallel notebook cluster.

**Architecture:** Additive Zod schema, pure data-driven engine, per-step React components matching the paper-notebook aesthetic, pure helper for the Claude prompt seam. Visual assets cloned (not imported) from the locked notebook dirs to stay merge-safe.

**Tech Stack:** Next.js 16, React 19, Zod, Zustand, Vitest (existing test runner), `roughjs` (already a dep), Caveat + Kalam fonts (already loaded in `app/layout.tsx`).

**Spec:** `docs/superpowers/specs/2026-04-19-onboarding-v2-design.md`

**Branch:** Create and work on `onboarding-v2` branched off `main` (or current HEAD) before Wave 1.

---

## Pre-flight (once, before Wave 1)

- [ ] **Branch off**

```bash
git checkout -b onboarding-v2
git status  # confirm clean worktree
```

- [ ] **Verify test runner works**

```bash
npm test -- tests/schemas.test.ts
```

Expected: PASS. Establishes baseline.

---

## Wave 1 — Foundations [PARALLEL: A, D, G]

These three tasks have no dependencies on each other. Dispatch them concurrently.

---

### Task A: v2 schema additions

**Files:**
- Modify: `lib/schemas.ts` (append at bottom only — never touch the existing `Cite/Node/ExpandRequest` block)
- Test: `tests/schemas-v2.test.ts` (new file — do NOT modify existing `tests/schemas.test.ts`)

- [ ] **Step A1: Write the failing test**

Create `tests/schemas-v2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  IntakeProfileV2Schema,
  HorizonsSchema,
  SatisfactionSchema,
  BlockerEnum,
  CommunityTagEnum,
  PivotSignalSchema,
  TransferProfileSchema,
} from '@/lib/schemas';

describe('IntakeProfileV2Schema', () => {
  const baseV1 = {
    year: 'freshman',
    major_category: 'stem',
    first_gen: true,
    aid_status: 'pell',
    hours_per_week: 8,
    interests: ['ai_ml'],
    mode: 'discovery',
  };

  it('accepts a legacy v1 profile with no v2 fields', () => {
    const r = IntakeProfileV2Schema.safeParse(baseV1);
    expect(r.success).toBe(true);
  });

  it('accepts a fully-populated v2 profile', () => {
    const r = IntakeProfileV2Schema.safeParse({
      ...baseV1,
      horizons: 5,
      satisfaction: 2,
      blocker: 'too_many_options',
      communities: ['first_gen', 'transfer'],
      pivot: { triggered: true, pivot_from: 'lit', pivot_target: 'policy' },
      is_transfer: true,
      transfer: { prior_school: 'SMC', terms_remaining: 4 },
    });
    expect(r.success).toBe(true);
  });

  it('rejects horizons out of range', () => {
    expect(HorizonsSchema.safeParse(0).success).toBe(false);
    expect(HorizonsSchema.safeParse(11).success).toBe(false);
    expect(HorizonsSchema.safeParse(5).success).toBe(true);
  });

  it('rejects satisfaction out of range', () => {
    expect(SatisfactionSchema.safeParse(0).success).toBe(false);
    expect(SatisfactionSchema.safeParse(6).success).toBe(false);
  });

  it('accepts known blocker values', () => {
    expect(BlockerEnum.safeParse('too_many_options').success).toBe(true);
    expect(BlockerEnum.safeParse('dont_know_whats_out_there').success).toBe(true);
    expect(BlockerEnum.safeParse('none').success).toBe(true);
    expect(BlockerEnum.safeParse('other').success).toBe(false);
  });

  it('accepts known community tags', () => {
    expect(CommunityTagEnum.safeParse('first_gen').success).toBe(true);
    expect(CommunityTagEnum.safeParse('prefer_not_to_say').success).toBe(true);
    expect(CommunityTagEnum.safeParse('random').success).toBe(false);
  });

  it('requires pivot.triggered boolean', () => {
    expect(PivotSignalSchema.safeParse({ triggered: true }).success).toBe(true);
    expect(PivotSignalSchema.safeParse({}).success).toBe(false);
  });

  it('requires prior_school and terms_remaining on transfer', () => {
    expect(TransferProfileSchema.safeParse({ prior_school: 'X', terms_remaining: 4 }).success).toBe(true);
    expect(TransferProfileSchema.safeParse({ prior_school: 'X' }).success).toBe(false);
    expect(TransferProfileSchema.safeParse({ prior_school: 'X', terms_remaining: 0 }).success).toBe(false);
    expect(TransferProfileSchema.safeParse({ prior_school: 'X', terms_remaining: 13 }).success).toBe(false);
  });
});
```

- [ ] **Step A2: Run test, verify failure**

```bash
npm test -- tests/schemas-v2.test.ts
```

Expected: FAIL — imports `IntakeProfileV2Schema` etc. don't exist yet.

- [ ] **Step A3: Append schema additions**

Append to the very bottom of `lib/schemas.ts` (after line 137, after the existing type exports):

```ts

// ─────────────────────────────────────────────────────────
// Onboarding v2 additions
// Appended at bottom to avoid merge conflicts with the
// notebook cluster's Cite/Node/ExpandRequest block above.
// ─────────────────────────────────────────────────────────

export const HorizonsSchema     = z.number().int().min(1).max(10);
export const SatisfactionSchema = z.number().int().min(1).max(5);

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
  prior_school:    z.string().min(1).max(80),
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

export type Horizons        = z.infer<typeof HorizonsSchema>;
export type Satisfaction    = z.infer<typeof SatisfactionSchema>;
export type Blocker         = z.infer<typeof BlockerEnum>;
export type CommunityTag    = z.infer<typeof CommunityTagEnum>;
export type PivotSignal     = z.infer<typeof PivotSignalSchema>;
export type TransferProfile = z.infer<typeof TransferProfileSchema>;
export type IntakeProfileV2 = z.infer<typeof IntakeProfileV2Schema>;
```

- [ ] **Step A4: Run test, verify pass**

```bash
npm test -- tests/schemas-v2.test.ts
```

Expected: PASS. 8 tests green.

- [ ] **Step A5: Run full test suite to confirm no regression**

```bash
npm test
```

Expected: all pre-existing tests still pass (`tests/schemas.test.ts` untouched).

- [ ] **Step A6: Commit**

```bash
git add lib/schemas.ts tests/schemas-v2.test.ts
git commit -m "feat(schemas): add onboarding v2 additions (horizons/satisfaction/blocker/communities/pivot/transfer)"
```

---

### Task D: Paper CSS module + rough primitives clones

**Files:**
- Create: `components/onboarding/onboarding.module.css`
- Create: `components/onboarding/rough.tsx`

No test — visual primitives are verified by hand in Wave 4 manual QA.

- [ ] **Step D1: Create the CSS module**

Create `components/onboarding/onboarding.module.css` with the full contents below. Classes are prefixed `ob` so they cannot collide with `notebook.module.css`.

```css
/* components/onboarding/onboarding.module.css
   Cloned (not imported) from notebook.module.css so the onboarding
   branch stays merge-safe vs the notebook cluster.
   Keep ob-prefixed classnames unique to this module. */

@property --ob-write {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

:global(:root) {
  --ob-ink-navy: #1e3a5f;
  --ob-ink-black: #2a2a28;
  --ob-ink-red: #c94c3a;
  --ob-ink-muted: #6b6658;
  --ob-highlighter: rgba(244, 211, 94, 0.42);
  --ob-paper: #fdfaf0;
  --ob-paper-edge: #ebe3cc;
  --ob-rule-blue: #b8c8d8;
  --ob-margin-red: #c94c3a;
}

.obPaper {
  position: relative;
  background-color: var(--ob-paper);
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 31px,
      rgba(184, 200, 216, 0.45) 31px,
      rgba(184, 200, 216, 0.45) 32px
    );
  min-height: 100vh;
}

.obPaper::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.28  0 0 0 0 0.24  0 0 0 0 0.14  0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 240px 240px;
  opacity: 0.55;
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 1;
}

.obPaper::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 80px;
  width: 1.5px;
  background: var(--ob-margin-red);
  opacity: 0.55;
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 0 2px rgba(201, 76, 58, 0.35);
}

.obCanvas {
  position: relative;
  z-index: 5;
  max-width: 900px;
  margin: 0 auto;
  padding: 44px 40px 90px 140px;
}

.obTitle {
  font-family: "Caveat", cursive;
  font-size: 34px;
  font-weight: 700;
  color: var(--ob-ink-navy);
  line-height: 1;
}

.obSubtitle {
  font-family: "Kalam", cursive;
  font-size: 16px;
  color: var(--ob-ink-muted);
  font-style: italic;
}

.obKalam { font-family: "Kalam", cursive; }
.obCaveat { font-family: "Caveat", cursive; }

.obPhaseRow {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-family: "Caveat", cursive;
  font-size: 20px;
}

.obPhaseItem { color: var(--ob-ink-muted); }
.obPhaseItemActive { color: var(--ob-ink-red); font-weight: 700; }

.obQuestion {
  font-family: "Caveat", cursive;
  font-size: 34px;
  font-weight: 700;
  color: var(--ob-ink-navy);
  line-height: 1.1;
  margin-bottom: 6px;
}

.obSub {
  font-family: "Kalam", cursive;
  font-size: 16px;
  color: var(--ob-ink-muted);
  font-style: italic;
  margin-bottom: 20px;
}

.obChoice {
  position: relative;
  display: block;
  width: 100%;
  padding: 14px 20px;
  margin-bottom: 14px;
  background: transparent;
  border: 0;
  text-align: left;
  font-family: "Kalam", cursive;
  font-size: 17px;
  color: var(--ob-ink-navy);
  cursor: pointer;
  transform: rotate(var(--rot, 0deg));
  transition: transform 140ms;
}

.obChoice:hover { transform: rotate(var(--rot, 0deg)) translateY(-1px); }

.obChoiceShape { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: visible; }
.obChoiceInner { position: relative; z-index: 1; }

.obChoiceSelected .obChoiceInner { font-weight: 700; color: var(--ob-ink-red); }

.obCtaBtn {
  position: relative;
  padding: 10px 24px;
  background: transparent;
  border: 0;
  font-family: "Caveat", cursive;
  font-size: 24px;
  font-weight: 700;
  color: var(--ob-ink-red);
  cursor: pointer;
  transform: rotate(var(--rot, -1deg));
  transition: transform 140ms;
}

.obCtaBtn:hover { transform: rotate(var(--rot, -1deg)) translateY(-1px); }
.obCtaBtn:disabled { opacity: 0.4; cursor: not-allowed; }

.obCtaBtnShape { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: visible; }
.obCtaBtnLabel { position: relative; z-index: 1; }

.obLineInput {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1.5px solid rgba(107, 102, 88, 0.35);
  font-family: "Kalam", cursive;
  font-size: 19px;
  color: var(--ob-ink-navy);
  padding: 6px 2px;
  outline: none;
}

.obLineInput:focus { border-bottom-color: var(--ob-ink-red); }

.obRuler {
  position: relative;
  height: 60px;
  margin: 16px 0 28px;
}

.obRulerTicks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.obRulerLabel {
  font-family: "Caveat", cursive;
  font-size: 26px;
  color: var(--ob-ink-navy);
  display: inline-block;
}

.obStickyPair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin: 24px 0;
}

.obSticky {
  position: relative;
  padding: 26px 18px 20px;
  background: #fef3a2;
  color: #1e3a5f;
  font-family: "Kalam", cursive;
  box-shadow:
    0 10px 24px -8px rgba(60, 45, 20, 0.28),
    0 6px 12px -4px rgba(60, 45, 20, 0.18);
  transform: rotate(var(--note-rot, -1.5deg));
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.15 0 0 0 0 0.05 0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 140px 140px;
  background-blend-mode: multiply;
}

.obStickyLabel {
  font-family: "Caveat", cursive;
  font-weight: 700;
  font-size: 22px;
  color: var(--ob-ink-red);
  margin-bottom: 10px;
}

.obStickyTextarea {
  width: 100%;
  min-height: 90px;
  background: transparent;
  border: 0;
  resize: none;
  font-family: "Kalam", cursive;
  font-size: 17px;
  color: var(--ob-ink-navy);
  outline: none;
}

.obStickyDrop {
  animation: ob-sticky-drop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes ob-sticky-drop {
  0% {
    transform: translateY(-60px) rotate(var(--note-rot, 0deg)) scale(1.08);
    opacity: 0;
  }
  60% { opacity: 1; }
  100% {
    transform: translateY(0) rotate(var(--note-rot, 0deg)) scale(1);
    opacity: 1;
  }
}

.obChipRow { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }

.obChip {
  position: relative;
  padding: 6px 14px;
  background: transparent;
  border: 0;
  font-family: "Kalam", cursive;
  font-size: 15px;
  color: var(--ob-ink-navy);
  cursor: pointer;
  transform: rotate(var(--rot, 0deg));
}

.obChipShape { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: visible; }
.obChipInner { position: relative; z-index: 1; }
.obChipSelected .obChipInner { color: var(--ob-ink-red); font-weight: 700; }

.obSummaryRow {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 8px 0;
  font-family: "Kalam", cursive;
}

.obSummaryLabel {
  font-family: "Caveat", cursive;
  font-size: 18px;
  color: var(--ob-ink-red);
  font-weight: 700;
}

.obSummaryValue { color: var(--ob-ink-black); font-size: 16px; }

.obSummaryEdit {
  font-family: "Caveat", cursive;
  font-size: 16px;
  color: var(--ob-ink-muted);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--ob-ink-red);
  text-underline-offset: 3px;
}

.obSummaryEdit:hover { color: var(--ob-ink-red); }

@media (prefers-reduced-motion: reduce) {
  .obStickyDrop {
    animation: ob-sticky-fade 280ms ease-out forwards;
  }
  @keyframes ob-sticky-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}
```

- [ ] **Step D2: Create the rough primitives**

Create `components/onboarding/rough.tsx`:

```tsx
'use client';
import { memo, useEffect, useRef } from 'react';
import rough from 'roughjs';

type Box = {
  width: number;
  height: number;
  seed: number;
  stroke?: string;
  fill?: string;
  dashed?: boolean;
  roughness?: number;
  strokeWidth?: number;
};

export const ObRoughRect = memo(function ObRoughRect(p: Box) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      const opts: Parameters<typeof rc.rectangle>[4] = {
        roughness: p.roughness ?? 1.8,
        bowing: 1.5,
        strokeWidth: p.strokeWidth ?? 2.2,
        stroke: p.stroke ?? '#1e3a5f',
        seed: p.seed,
      };
      if (p.fill && p.fill !== 'none') {
        (opts as Record<string, unknown>).fill = p.fill;
        (opts as Record<string, unknown>).fillStyle = 'hachure';
      }
      if (p.dashed) opts.strokeLineDash = [6, 8];
      el.appendChild(rc.rectangle(1, 1, p.width - 2, p.height - 2, opts));
    } catch {
      const ns = 'http://www.w3.org/2000/svg';
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', '1'); r.setAttribute('y', '1');
      r.setAttribute('width', String(p.width - 2));
      r.setAttribute('height', String(p.height - 2));
      r.setAttribute('fill', p.fill ?? 'transparent');
      r.setAttribute('stroke', p.stroke ?? '#1e3a5f');
      r.setAttribute('stroke-width', String(p.strokeWidth ?? 2.2));
      el.appendChild(r);
    }
  }, [p.width, p.height, p.seed, p.stroke, p.fill, p.dashed, p.roughness, p.strokeWidth]);

  return <svg ref={ref} className="absolute inset-0" style={{ overflow: 'visible' }} width={p.width} height={p.height} />;
});

type Line = { width: number; seed: number; stroke?: string };

export const ObFreehandUnderline = memo(function ObFreehandUnderline({ width, seed, stroke = '#c94c3a' }: Line) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      el.appendChild(rc.line(2, 6, width - 2, 8, { stroke, strokeWidth: 2, roughness: 2, seed }));
    } catch { /* no-op fallback */ }
  }, [width, seed, stroke]);
  return <svg ref={ref} width={width} height={14} style={{ overflow: 'visible' }} />;
});

type Mark = { size: number; seed: number; stroke?: string };

export const ObFreehandCheck = memo(function ObFreehandCheck({ size, seed, stroke = '#c94c3a' }: Mark) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      const g = rc.linearPath(
        [[size * 0.15, size * 0.55], [size * 0.4, size * 0.8], [size * 0.85, size * 0.2]],
        { stroke, strokeWidth: 3, roughness: 1.8, seed }
      );
      el.appendChild(g);
    } catch { /* no-op fallback */ }
  }, [size, seed, stroke]);
  return <svg ref={ref} width={size} height={size} style={{ overflow: 'visible' }} />;
});

export const ObFreehandStrike = memo(function ObFreehandStrike({ width, seed, stroke = '#c94c3a' }: Line) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      el.appendChild(rc.line(2, 5, width - 2, 5, { stroke, strokeWidth: 2, roughness: 2.2, seed }));
    } catch { /* no-op fallback */ }
  }, [width, seed, stroke]);
  return <svg ref={ref} width={width} height={10} style={{ overflow: 'visible', opacity: 0.8 }} />;
});

export const ObFreehandArrow = memo(function ObFreehandArrow({ width, seed, stroke = '#c94c3a' }: Line) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      const h = 20;
      el.appendChild(rc.line(2, h / 2, width - 8, h / 2, { stroke, strokeWidth: 2, roughness: 2, seed }));
      el.appendChild(rc.line(width - 12, h / 2 - 6, width - 4, h / 2, { stroke, strokeWidth: 2, roughness: 2, seed: seed + 1 }));
      el.appendChild(rc.line(width - 12, h / 2 + 6, width - 4, h / 2, { stroke, strokeWidth: 2, roughness: 2, seed: seed + 2 }));
    } catch { /* no-op fallback */ }
  }, [width, seed, stroke]);
  return <svg ref={ref} width={width} height={20} style={{ overflow: 'visible' }} />;
});
```

- [ ] **Step D3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step D4: Commit**

```bash
git add components/onboarding/onboarding.module.css components/onboarding/rough.tsx
git commit -m "feat(onboarding): clone paper CSS + rough primitives for v2 UI"
```

---

### Task G: Personas JSON additions

**Files:**
- Modify: `data/ucla/personas.json` (replace whole file — contents below)

No test — `tests/schemas-v2.test.ts` in Task A exercises the shape; Wave 4 persona-application spec covers integration.

- [ ] **Step G1: Replace personas.json**

Replace the entire contents of `data/ucla/personas.json` with:

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

- [ ] **Step G2: Confirm JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('data/ucla/personas.json'))" && echo OK
```

Expected: `OK`.

- [ ] **Step G3: Confirm the predev validator still passes**

```bash
npx tsx scripts/validate-data.ts
```

Expected: exits 0 (no corpus/persona validation errors). If it fails with a schema mismatch, the validator only knows the v1 shape — that is acceptable because v2 fields are optional at the schema level. If the script errors on the new fields, the failure is in the validator not the data; do not weaken the data to satisfy it.

- [ ] **Step G4: Commit**

```bash
git add data/ucla/personas.json
git commit -m "feat(data): extend personas with v2 signals; add Priya pivot persona"
```

---

## Wave 2 — Core logic [PARALLEL: B, C, I — all blocked on Task A only]

After Task A's commit lands, dispatch B/C/I concurrently.

---

### Task B: Adaptive engine

**Files:**
- Create: `lib/onboarding-engine.ts`
- Test: `tests/onboarding-engine.test.ts`

- [ ] **Step B1: Write the failing test**

Create `tests/onboarding-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  STEPS,
  nextStep,
  prevStep,
  visibleSteps,
  phaseProgress,
  type StepId,
} from '@/lib/onboarding-engine';
import type { IntakeProfileV2 } from '@/lib/schemas';

const empty: Partial<IntakeProfileV2> = {};

describe('onboarding-engine', () => {
  it('nextStep walks forward across default visible steps', () => {
    expect(nextStep('welcome', empty)).toBe('year');
    expect(nextStep('year', empty)).toBe('major');
  });

  it('R1: transfer_detail only visible when is_transfer === true', () => {
    const vNo = visibleSteps({ is_transfer: false }).map(s => s.id);
    const vYes = visibleSteps({ is_transfer: true }).map(s => s.id);
    expect(vNo).not.toContain('transfer_detail');
    expect(vYes).toContain('transfer_detail');
    expect(nextStep('transfer_ask', { is_transfer: true })).toBe('transfer_detail');
    expect(nextStep('transfer_ask', { is_transfer: false })).toBe('hours');
  });

  it('R3: adjacent only visible when horizons >= 7', () => {
    expect(visibleSteps({ horizons: 5 }).map(s => s.id)).not.toContain('adjacent');
    expect(visibleSteps({ horizons: 7 }).map(s => s.id)).toContain('adjacent');
    expect(visibleSteps({ horizons: 10 }).map(s => s.id)).toContain('adjacent');
  });

  it('R4: pivot visible when satisfaction <= 2', () => {
    expect(visibleSteps({ satisfaction: 3 }).map(s => s.id)).not.toContain('pivot');
    expect(visibleSteps({ satisfaction: 2 }).map(s => s.id)).toContain('pivot');
    expect(visibleSteps({ satisfaction: 1 }).map(s => s.id)).toContain('pivot');
  });

  it('R4: pivot visible when pivot.triggered === true even with high satisfaction', () => {
    const v = visibleSteps({ satisfaction: 5, pivot: { triggered: true } });
    expect(v.map(s => s.id)).toContain('pivot');
  });

  it('prevStep skips hidden steps both directions', () => {
    // With is_transfer=false, prev from hours should skip transfer_detail back to transfer_ask
    expect(prevStep('hours', { is_transfer: false })).toBe('transfer_ask');
    // With is_transfer=true, prev from hours should hit transfer_detail
    expect(prevStep('hours', { is_transfer: true })).toBe('transfer_detail');
  });

  it('phaseProgress counts only visible steps in current phase', () => {
    const p1 = phaseProgress('year', {});
    expect(p1.phase).toBe('basics');
    expect(p1.index).toBeGreaterThanOrEqual(0);
    expect(p1.total).toBeGreaterThan(0);

    // With transfer=true, basics phase has one extra step
    const pNo = phaseProgress('transfer_ask', { is_transfer: false });
    const pYes = phaseProgress('transfer_ask', { is_transfer: true });
    expect(pYes.total).toBe(pNo.total + 1);
  });

  it('canAdvance gates progression correctly', () => {
    const year = STEPS.find(s => s.id === 'year')!;
    expect(year.canAdvance({})).toBe(false);
    expect(year.canAdvance({ year: 'freshman' })).toBe(true);

    const transferDetail = STEPS.find(s => s.id === 'transfer_detail')!;
    expect(transferDetail.canAdvance({ transfer: { prior_school: 'X', terms_remaining: 4 } })).toBe(true);
    expect(transferDetail.canAdvance({ transfer: { prior_school: '', terms_remaining: 4 } })).toBe(false);

    const pivot = STEPS.find(s => s.id === 'pivot')!;
    expect(pivot.canAdvance({ pivot: { triggered: true, pivot_from: 'A', pivot_target: 'B' } })).toBe(true);
    expect(pivot.canAdvance({ pivot: { triggered: true, pivot_from: 'A' } })).toBe(false);
  });

  it('nextStep returns null at the end of the flow', () => {
    expect(nextStep('confirm', {})).toBe(null);
  });
});
```

- [ ] **Step B2: Run test, verify failure**

```bash
npm test -- tests/onboarding-engine.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step B3: Create the engine**

Create `lib/onboarding-engine.ts`:

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
  { id: 'welcome',         phase: 'basics',    showWhen: () => true, canAdvance: () => true },
  { id: 'year',            phase: 'basics',    showWhen: () => true, canAdvance: p => !!p.year },
  { id: 'major',           phase: 'basics',    showWhen: () => true, canAdvance: p => !!p.major_category },
  { id: 'transfer_ask',    phase: 'basics',    showWhen: () => true, canAdvance: p => p.is_transfer !== undefined },
  { id: 'transfer_detail', phase: 'basics',
    showWhen:   p => p.is_transfer === true,
    canAdvance: p => !!p.transfer?.prior_school && p.transfer?.terms_remaining !== undefined },
  { id: 'hours',           phase: 'situation', showWhen: () => true, canAdvance: p => p.hours_per_week !== undefined },
  { id: 'aid',             phase: 'situation', showWhen: () => true, canAdvance: p => !!p.aid_status },
  { id: 'firstgen',        phase: 'situation', showWhen: () => true, canAdvance: p => p.first_gen !== undefined },
  { id: 'communities',     phase: 'situation', showWhen: () => true, canAdvance: () => true },
  { id: 'interests',       phase: 'direction', showWhen: () => true, canAdvance: p => (p.interests?.length ?? 0) >= 1 },
  { id: 'horizons',        phase: 'direction', showWhen: () => true, canAdvance: p => p.horizons !== undefined },
  { id: 'mode',            phase: 'direction', showWhen: () => true, canAdvance: p => !!p.mode },
  { id: 'satisfaction',    phase: 'direction', showWhen: () => true, canAdvance: p => p.satisfaction !== undefined },
  { id: 'pivot',           phase: 'direction',
    showWhen:   p => (p.satisfaction ?? 5) <= 2 || p.pivot?.triggered === true,
    canAdvance: p => !!p.pivot?.pivot_from && !!p.pivot?.pivot_target },
  { id: 'adjacent',        phase: 'direction',
    showWhen:   p => (p.horizons ?? 5) >= 7,
    canAdvance: () => true },
  { id: 'blocker',         phase: 'direction', showWhen: () => true, canAdvance: p => !!p.blocker },
  { id: 'goal',            phase: 'direction', showWhen: () => true, canAdvance: () => true },
  { id: 'confirm',         phase: 'confirm',   showWhen: () => true, canAdvance: () => true },
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
  const cur = visible.find(s => s.id === current) ?? STEPS.find(s => s.id === current);
  if (!cur) return { phase: 'basics', index: 0, total: 0 };
  const phaseSteps = visible.filter(s => s.phase === cur.phase);
  const idx = phaseSteps.findIndex(s => s.id === current);
  return {
    phase: cur.phase,
    index: idx < 0 ? 0 : idx,
    total: phaseSteps.length,
  };
}
```

- [ ] **Step B4: Run tests, verify pass**

```bash
npm test -- tests/onboarding-engine.test.ts
```

Expected: PASS — 9 tests green.

- [ ] **Step B5: Commit**

```bash
git add lib/onboarding-engine.ts tests/onboarding-engine.test.ts
git commit -m "feat(onboarding): adaptive engine with branching rules R1/R3/R4"
```

---

### Task C: Claude seam (`lib/student-context.ts`)

**Files:**
- Create: `lib/student-context.ts`
- Test: `tests/student-context.test.ts`

- [ ] **Step C1: Write the failing test**

Create `tests/student-context.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatStudentContext } from '@/lib/student-context';
import type { IntakeProfileV2 } from '@/lib/schemas';

const base: IntakeProfileV2 = {
  year: 'freshman',
  major_category: 'stem',
  first_gen: true,
  aid_status: 'pell',
  hours_per_week: 8,
  interests: ['ai_ml'],
  mode: 'discovery',
};

describe('formatStudentContext', () => {
  it('returns empty string when no v2 signals present', () => {
    expect(formatStudentContext(base)).toBe('');
  });

  it('emits horizons block with anchor label', () => {
    const out = formatStudentContext({ ...base, horizons: 4 });
    expect(out).toContain('<horizons>4/10 (~2 yrs)</horizons>');
    expect(out).toMatch(/^\n<student_context>/);
    expect(out).toMatch(/<\/student_context>\n$/);
  });

  it('emits narrow bias for too_many_options blocker', () => {
    const out = formatStudentContext({ ...base, blocker: 'too_many_options' });
    expect(out).toContain('<blocker>too_many_options</blocker>');
    expect(out).toContain('narrow:');
  });

  it('emits broaden bias for dont_know_whats_out_there blocker', () => {
    const out = formatStudentContext({ ...base, blocker: 'dont_know_whats_out_there' });
    expect(out).toContain('broaden:');
  });

  it('omits blocker block when blocker = none', () => {
    const out = formatStudentContext({ ...base, blocker: 'none' });
    expect(out).not.toContain('<blocker>');
  });

  it('emits pivot block with escaped attrs', () => {
    const out = formatStudentContext({
      ...base,
      pivot: { triggered: true, pivot_from: 'a "b" <c>', pivot_target: 'd' },
    });
    expect(out).toContain('from="a &quot;b&quot; &lt;c&gt;"');
    expect(out).toContain('to="d"');
  });

  it('does NOT emit pivot block when triggered=false', () => {
    const out = formatStudentContext({
      ...base,
      pivot: { triggered: false, pivot_from: 'x', pivot_target: 'y' },
    });
    expect(out).not.toContain('<pivot');
  });

  it('emits transfer block only when is_transfer and transfer both present', () => {
    const out = formatStudentContext({
      ...base,
      is_transfer: true,
      transfer: { prior_school: 'SMC', terms_remaining: 4 },
    });
    expect(out).toContain('prior_school="SMC"');
    expect(out).toContain('terms_remaining="4"');
  });

  it('emits communities as comma-joined list', () => {
    const out = formatStudentContext({ ...base, communities: ['first_gen', 'transfer'] });
    expect(out).toContain('<communities>first_gen, transfer</communities>');
  });

  it('combines multiple signals into one block', () => {
    const out = formatStudentContext({
      ...base,
      horizons: 5,
      satisfaction: 2,
      blocker: 'too_many_options',
    });
    const openings = out.match(/<student_context>/g);
    expect(openings?.length).toBe(1);
    expect(out).toContain('<horizons>');
    expect(out).toContain('<satisfaction>');
    expect(out).toContain('<blocker>');
  });
});
```

- [ ] **Step C2: Run test, verify failure**

```bash
npm test -- tests/student-context.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step C3: Create the seam**

Create `lib/student-context.ts`:

```ts
import type { IntakeProfileV2 } from '@/lib/schemas';

/**
 * Formats v2 signals into a <student_context> XML block for Claude prompts.
 * Returns '' when no v2 signals present, so the call site can concat safely.
 *
 * Integration (applied by notebook cluster after merge):
 *   import { formatStudentContext } from '@/lib/student-context';
 *   const prompt = buildBasePrompt(...) + formatStudentContext(profile);
 */
export function formatStudentContext(profile: IntakeProfileV2): string {
  const lines: string[] = [];

  if (profile.horizons !== undefined) {
    lines.push(`<horizons>${profile.horizons}/10 (${anchorLabel(profile.horizons)})</horizons>`);
  }
  if (profile.satisfaction !== undefined) {
    lines.push(`<satisfaction>${profile.satisfaction}/5 — clarity of current path</satisfaction>`);
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
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

- [ ] **Step C4: Run test, verify pass**

```bash
npm test -- tests/student-context.test.ts
```

Expected: PASS — 10 tests green.

- [ ] **Step C5: Commit**

```bash
git add lib/student-context.ts tests/student-context.test.ts
git commit -m "feat(onboarding): student-context seam for Claude prompt integration"
```

---

### Task I: Widen profile store to v2

**Files:**
- Modify: `store/profile.ts`
- Test: pre-existing `tests/profile-store.test.ts` (do NOT modify; widening is type-level so existing tests still pass)

- [ ] **Step I1: Replace the file**

Replace the entire contents of `store/profile.ts`:

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

- [ ] **Step I2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. `IntakeProfileV2` is a superset of `IntakeProfile`, so all consumers continue to compile.

- [ ] **Step I3: Run profile-store tests**

```bash
npm test -- tests/profile-store.test.ts
```

Expected: PASS (tests pass v1-shaped objects which are still valid v2).

- [ ] **Step I4: Commit**

```bash
git add store/profile.ts
git commit -m "feat(store): widen profile store to IntakeProfileV2"
```

---

## Wave 3 — UI components [PARALLEL: E1–E18 + H1]

Every task in this wave is independent once Wave 2 lands. Dispatch all concurrently.

### Shared prerequisite — `StepProps` contract

Before dispatching E1–E18, one sequential setup task:

- [ ] **Task E0: Step contract**

Create `components/onboarding/steps/types.ts`:

```ts
import type { IntakeProfileV2 } from '@/lib/schemas';

export interface StepProps {
  profile:     Partial<IntakeProfileV2>;
  update:      (patch: Partial<IntakeProfileV2>) => void;
  advance:     () => void;
  autoAdvance: () => void;
  goBack:      () => void;
}
```

Commit:

```bash
git add components/onboarding/steps/types.ts
git commit -m "feat(onboarding): StepProps contract"
```

---

### Tasks E1–E13: Trivial steps [PARALLEL]

Each produces one file: `components/onboarding/steps/<Name>Step.tsx`. All follow the same shape and use `onboarding.module.css` classes + rough primitives from Task D. No per-step tests for these — Wave 4 manual QA covers them.

#### E1: WelcomeStep

**File:** `components/onboarding/steps/WelcomeStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function WelcomeStep({ advance }: StepProps) {
  return (
    <div>
      <h1 className={styles.obTitle}>The mentor who&rsquo;s been at UCLA for ten years.</h1>
      <p className={styles.obSub}>On demand. With citations. A few quick questions, then we&rsquo;ll sketch your next two years as a notebook you can walk through.</p>
      <div style={{ position: 'relative', display: 'inline-block', marginTop: 24 }}>
        <button className={styles.obCtaBtn} onClick={advance} style={{ '--rot': '-1deg' } as React.CSSProperties}>
          <ObRoughRect width={220} height={52} seed={11} />
          <span className={styles.obCtaBtnLabel}>Let&rsquo;s start &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/WelcomeStep.tsx && git commit -m "feat(onboarding): WelcomeStep"`

---

#### E2: YearStep

**File:** `components/onboarding/steps/YearStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const OPTIONS = [
  { value: 'freshman',  label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior',    label: 'Junior' },
  { value: 'senior',    label: 'Senior' },
] as const;

export function YearStep({ profile, update, autoAdvance }: StepProps) {
  return (
    <div>
      <h2 className={styles.obQuestion}>What year are you?</h2>
      <p className={styles.obSub}>We use this to calibrate timing and eligibility.</p>
      {OPTIONS.map((o, i) => {
        const selected = profile.year === o.value;
        return (
          <button
            key={o.value}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => { update({ year: o.value }); autoAdvance(); }}
            style={{ '--rot': `${(i % 2 === 0 ? -0.5 : 0.5)}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={520} height={48} seed={20 + i} />
            <span className={styles.obChoiceInner}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/YearStep.tsx && git commit -m "feat(onboarding): YearStep"`

---

#### E3: MajorStep

**File:** `components/onboarding/steps/MajorStep.tsx`

```tsx
'use client';
import { useState } from 'react';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';
import type { IntakeProfileV2 } from '@/lib/schemas';

type MajorCategory = NonNullable<IntakeProfileV2['major_category']>;

function toCategory(text: string): MajorCategory {
  const t = text.toLowerCase();
  if (/comput|cs|software|bio|neuro|chem|physic|math|engineer/.test(t)) return 'stem';
  if (/econ|business|sociol|psychol|polit|anthropol/.test(t)) return 'social_science';
  if (/english|history|philosoph|art|literature|language/.test(t)) return 'humanities';
  return 'undeclared';
}

export function MajorStep({ profile, update, advance }: StepProps) {
  const [text, setText] = useState(profile.major_category ? '' : '');
  const canAdvance = text.trim().length > 0 || !!profile.major_category;
  return (
    <div>
      <h2 className={styles.obQuestion}>What&rsquo;s your major (or area of interest)?</h2>
      <p className={styles.obSub}>Type anything — we&rsquo;ll map it.</p>
      <input
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); update({ major_category: toCategory(e.target.value) }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) advance(); }}
        placeholder="e.g. Computer Science, Biology, History..."
        className={styles.obLineInput}
        autoFocus
      />
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance} disabled={!canAdvance}>
          <ObRoughRect width={140} height={46} seed={31} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/MajorStep.tsx && git commit -m "feat(onboarding): MajorStep"`

---

#### E4: TransferAskStep

**File:** `components/onboarding/steps/TransferAskStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function TransferAskStep({ profile, update, autoAdvance }: StepProps) {
  const pick = (v: boolean) => { update({ is_transfer: v }); autoAdvance(); };
  return (
    <div>
      <h2 className={styles.obQuestion}>Are you a transfer student?</h2>
      <p className={styles.obSub}>We&rsquo;ll ask a couple extra questions if yes.</p>
      {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((o, i) => {
        const selected = profile.is_transfer === o.value;
        return (
          <button
            key={o.label}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => pick(o.value)}
            style={{ '--rot': `${i === 0 ? -0.4 : 0.4}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={520} height={48} seed={40 + i} />
            <span className={styles.obChoiceInner}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/TransferAskStep.tsx && git commit -m "feat(onboarding): TransferAskStep"`

---

#### E5: HoursStep

**File:** `components/onboarding/steps/HoursStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function HoursStep({ profile, update, advance }: StepProps) {
  const hours = profile.hours_per_week ?? 8;
  return (
    <div>
      <h2 className={styles.obQuestion}>How many hours per week can you commit?</h2>
      <p className={styles.obSub}>Be honest — we&rsquo;ll only suggest things you can actually do.</p>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: 'Caveat, cursive', fontSize: 42, color: 'var(--ob-ink-navy)' }}>{hours}</span>
        <span style={{ fontFamily: 'Kalam, cursive', marginLeft: 8, color: 'var(--ob-ink-muted)' }}>hrs / week</span>
      </div>
      <input
        type="range"
        min={0}
        max={40}
        step={1}
        value={hours}
        onChange={(e) => update({ hours_per_week: Number(e.target.value) })}
        style={{ width: '100%', accentColor: 'var(--ob-ink-red)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Kalam, cursive', fontSize: 13, color: 'var(--ob-ink-muted)', marginTop: 4 }}>
        <span>0</span><span>40</span>
      </div>
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance}>
          <ObRoughRect width={140} height={46} seed={51} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/HoursStep.tsx && git commit -m "feat(onboarding): HoursStep"`

---

#### E6: AidStep

**File:** `components/onboarding/steps/AidStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const OPTIONS = [
  { value: 'pell',        label: 'Pell grant' },
  { value: 'work_study',  label: 'Work-study' },
  { value: 'none',        label: 'No aid' },
  { value: 'none',        label: 'Prefer not to say' },
] as const;

export function AidStep({ profile, update, autoAdvance }: StepProps) {
  return (
    <div>
      <h2 className={styles.obQuestion}>Financial aid situation?</h2>
      <p className={styles.obSub}>Helps surface paid opportunities and scholarships.</p>
      {OPTIONS.map((o, i) => {
        const selected = profile.aid_status === o.value && (i === 2 ? true : true);
        return (
          <button
            key={o.label}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => { update({ aid_status: o.value }); autoAdvance(); }}
            style={{ '--rot': `${(i % 2 === 0 ? -0.3 : 0.3)}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={520} height={48} seed={60 + i} />
            <span className={styles.obChoiceInner}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/AidStep.tsx && git commit -m "feat(onboarding): AidStep"`

---

#### E7: FirstGenStep

**File:** `components/onboarding/steps/FirstGenStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function FirstGenStep({ profile, update, autoAdvance }: StepProps) {
  const pick = (v: boolean) => { update({ first_gen: v }); autoAdvance(); };
  return (
    <div>
      <h2 className={styles.obQuestion}>Are you a first-generation college student?</h2>
      <p className={styles.obSub}>First-gen students often qualify for dedicated programs and support.</p>
      {[
        { label: 'Yes', value: true },
        { label: 'No', value: false },
        { label: 'Prefer not to say', value: false },
      ].map((o, i) => {
        const selected = profile.first_gen === o.value;
        return (
          <button
            key={o.label}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => pick(o.value)}
            style={{ '--rot': `${(i - 1) * 0.4}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={520} height={48} seed={70 + i} />
            <span className={styles.obChoiceInner}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/FirstGenStep.tsx && git commit -m "feat(onboarding): FirstGenStep"`

---

#### E8: InterestsStep

**File:** `components/onboarding/steps/InterestsStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const OPTIONS = ['ai_ml','data','storytelling','math','teaching','cybersec','policy','bio','design'];

export function InterestsStep({ profile, update, advance }: StepProps) {
  const selected = profile.interests ?? [];
  const toggle = (s: string) => {
    const has = selected.includes(s);
    const next = has ? selected.filter(i => i !== s) : (selected.length < 3 ? [...selected, s] : selected);
    update({ interests: next });
  };
  return (
    <div>
      <h2 className={styles.obQuestion}>What are your interests?</h2>
      <p className={styles.obSub}>Pick up to 3 that resonate most.</p>
      <div className={styles.obChipRow}>
        {OPTIONS.map((s, i) => {
          const on = selected.includes(s);
          return (
            <button key={s}
              className={`${styles.obChip} ${on ? styles.obChipSelected : ''}`}
              onClick={() => toggle(s)}
              style={{ '--rot': `${((i % 3) - 1) * 0.4}deg` } as React.CSSProperties}
            >
              <ObRoughRect width={s.length * 10 + 44} height={34} seed={80 + i} />
              <span className={styles.obChipInner}>{s.replace('_', '/')}</span>
            </button>
          );
        })}
      </div>
      <p style={{ fontFamily: 'Kalam, cursive', color: 'var(--ob-ink-muted)' }}>{selected.length}/3 selected</p>
      <div style={{ marginTop: 16, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance} disabled={selected.length === 0}>
          <ObRoughRect width={140} height={46} seed={99} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/InterestsStep.tsx && git commit -m "feat(onboarding): InterestsStep"`

---

#### E9: ModeStep

**File:** `components/onboarding/steps/ModeStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const OPTIONS = [
  { value: 'directed',  label: 'Directed — I know what I want, show me the steps' },
  { value: 'partial',   label: 'Partial — I have a direction but open to detours' },
  { value: 'discovery', label: "Discovery — I'm still figuring it out, surprise me" },
] as const;

export function ModeStep({ profile, update, autoAdvance }: StepProps) {
  return (
    <div>
      <h2 className={styles.obQuestion}>How do you like to explore?</h2>
      <p className={styles.obSub}>Shapes whether we give you a clear path or open exploration.</p>
      {OPTIONS.map((o, i) => {
        const selected = profile.mode === o.value;
        return (
          <button
            key={o.value}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => { update({ mode: o.value }); autoAdvance(); }}
            style={{ '--rot': `${(i - 1) * 0.4}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={560} height={52} seed={110 + i} />
            <span className={styles.obChoiceInner}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/ModeStep.tsx && git commit -m "feat(onboarding): ModeStep"`

---

#### E10: SatisfactionStep

**File:** `components/onboarding/steps/SatisfactionStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function SatisfactionStep({ profile, update, autoAdvance }: StepProps) {
  return (
    <div>
      <h2 className={styles.obQuestion}>How clear is your current path?</h2>
      <p className={styles.obSub}>1 = no idea · 5 = crystal clear.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {[1,2,3,4,5].map((n, i) => {
          const selected = profile.satisfaction === n;
          return (
            <button key={n}
              className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
              style={{ width: 80, height: 60, textAlign: 'center', '--rot': `${(i - 2) * 0.3}deg` } as React.CSSProperties}
              onClick={() => { update({ satisfaction: n as 1|2|3|4|5 }); autoAdvance(); }}
            >
              <ObRoughRect width={80} height={60} seed={120 + i} />
              <span className={styles.obChoiceInner} style={{ fontFamily: 'Caveat, cursive', fontSize: 28 }}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/SatisfactionStep.tsx && git commit -m "feat(onboarding): SatisfactionStep"`

---

#### E11: BlockerStep

**File:** `components/onboarding/steps/BlockerStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const OPTIONS = [
  { value: 'too_many_options',         label: 'Too many options — I can&rsquo;t pick one' },
  { value: 'dont_know_whats_out_there', label: "I don&rsquo;t know what&rsquo;s out there" },
  { value: 'none',                      label: 'Nothing blocking me right now' },
] as const;

export function BlockerStep({ profile, update, autoAdvance }: StepProps) {
  return (
    <div>
      <h2 className={styles.obQuestion}>What&rsquo;s hardest right now?</h2>
      <p className={styles.obSub}>Tells us how to frame what we show you.</p>
      {OPTIONS.map((o, i) => {
        const selected = profile.blocker === o.value;
        return (
          <button
            key={o.value}
            className={`${styles.obChoice} ${selected ? styles.obChoiceSelected : ''}`}
            onClick={() => { update({ blocker: o.value }); autoAdvance(); }}
            style={{ '--rot': `${(i - 1) * 0.4}deg` } as React.CSSProperties}
          >
            <ObRoughRect width={560} height={52} seed={130 + i} />
            <span className={styles.obChoiceInner} dangerouslySetInnerHTML={{ __html: o.label }} />
          </button>
        );
      })}
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/BlockerStep.tsx && git commit -m "feat(onboarding): BlockerStep"`

---

#### E12: AdjacentStep

**File:** `components/onboarding/steps/AdjacentStep.tsx`

```tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

const SUGGESTIONS: Record<string, string[]> = {
  stem:           ['policy', 'design', 'teaching', 'entrepreneurship', 'writing'],
  humanities:     ['data', 'policy', 'design', 'product', 'law'],
  social_science: ['data', 'design', 'tech_policy', 'research', 'nonprofit'],
  undeclared:     ['data', 'design', 'policy', 'writing', 'entrepreneurship'],
};

export function AdjacentStep({ profile, advance }: StepProps) {
  const suggestions = SUGGESTIONS[profile.major_category ?? 'undeclared'] ?? [];
  return (
    <div>
      <h2 className={styles.obQuestion}>Adjacent fields you&rsquo;d consider?</h2>
      <p className={styles.obSub}>Optional — tap any that catch your eye. Informs what we surface.</p>
      <div className={styles.obChipRow}>
        {suggestions.map((s, i) => (
          <span key={s} className={styles.obChip} style={{ '--rot': `${((i % 3) - 1) * 0.4}deg` } as React.CSSProperties}>
            <ObRoughRect width={s.length * 10 + 44} height={34} seed={140 + i} />
            <span className={styles.obChipInner}>{s.replace('_', ' ')}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance}>
          <ObRoughRect width={140} height={46} seed={149} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/AdjacentStep.tsx && git commit -m "feat(onboarding): AdjacentStep"`

---

#### E13: GoalStep

**File:** `components/onboarding/steps/GoalStep.tsx`

```tsx
'use client';
import { useState } from 'react';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import { GoalSuggestions } from '../GoalSuggestions';
import type { StepProps } from './types';

export function GoalStep({ profile, update, advance }: StepProps) {
  const [goal, setGoal] = useState(profile.end_goal ?? '');
  return (
    <div>
      <h2 className={styles.obQuestion}>What&rsquo;s your end goal?</h2>
      <p className={styles.obSub}>Optional — describe in your own words.</p>
      <GoalSuggestions mode={profile.mode ?? null} major={profile.major_category ?? ''} value={goal} onPick={(v) => { setGoal(v); update({ end_goal: v }); }} />
      <textarea
        value={goal}
        onChange={(e) => { const v = e.target.value.slice(0, 300); setGoal(v); update({ end_goal: v || undefined }); }}
        rows={4}
        placeholder="e.g. Apply to PhD programs in AI/ML..."
        className={styles.obLineInput}
        style={{ borderBottom: '1.5px solid rgba(107,102,88,0.35)', marginTop: 12, resize: 'none', height: 110 }}
      />
      <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance}>
          <ObRoughRect width={140} height={46} seed={151} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

Commit: `git add components/onboarding/steps/GoalStep.tsx && git commit -m "feat(onboarding): GoalStep"`

---

### Tasks E14–E18: Logic-bearing steps [PARALLEL, each with its own test]

#### E14: TransferDetailStep

**Files:**
- Create: `components/onboarding/steps/TransferDetailStep.tsx`
- Create: `components/onboarding/steps/TransferDetailStep.test.tsx`

- [ ] **E14.1: Write the failing test**

```tsx
// components/onboarding/steps/TransferDetailStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TransferDetailStep } from './TransferDetailStep';

describe('TransferDetailStep', () => {
  it('updates profile.transfer on input change', () => {
    const update = vi.fn();
    const { getByPlaceholderText } = render(
      <TransferDetailStep profile={{}} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.change(getByPlaceholderText(/prior school/i), { target: { value: 'SMC' } });
    expect(update).toHaveBeenCalledWith({ transfer: { prior_school: 'SMC', terms_remaining: 4 } });
  });

  it('changes terms_remaining with the stepper', () => {
    const update = vi.fn();
    const { getByText } = render(
      <TransferDetailStep profile={{ transfer: { prior_school: 'X', terms_remaining: 4 } }} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.click(getByText('+'));
    expect(update).toHaveBeenLastCalledWith({ transfer: { prior_school: 'X', terms_remaining: 5 } });
  });
});
```

Install the testing-library deps if not present:

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

Update `vitest.config.ts` `test.environment` to `'jsdom'` if it is currently `'node'`. (Check with `cat vitest.config.ts`. If currently `environment: 'node'`, change it to `environment: 'jsdom'` — this also needs a `@testing-library/jest-dom/vitest` import in a setupFile, but for these lightweight tests the raw DOM assertions above do not require jest-dom.)

- [ ] **E14.2: Run test, verify failure**

```bash
npm test -- components/onboarding/steps/TransferDetailStep.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **E14.3: Implement**

```tsx
// components/onboarding/steps/TransferDetailStep.tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function TransferDetailStep({ profile, update, advance }: StepProps) {
  const school = profile.transfer?.prior_school ?? '';
  const terms  = profile.transfer?.terms_remaining ?? 4;
  const setSchool = (v: string) => update({ transfer: { prior_school: v, terms_remaining: terms } });
  const setTerms  = (v: number) => update({ transfer: { prior_school: school, terms_remaining: Math.max(1, Math.min(12, v)) } });
  return (
    <div>
      <h2 className={styles.obQuestion}>Transfer details</h2>
      <p className={styles.obSub}>Prior school and terms left at UCLA.</p>
      <input
        type="text"
        value={school}
        placeholder="Prior school"
        onChange={(e) => setSchool(e.target.value)}
        className={styles.obLineInput}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24, fontFamily: 'Kalam, cursive' }}>
        <span style={{ color: 'var(--ob-ink-muted)' }}>Terms remaining at UCLA:</span>
        <button onClick={() => setTerms(terms - 1)} style={{ fontFamily: 'Caveat, cursive', fontSize: 28, background: 'transparent', border: 0, color: 'var(--ob-ink-red)', cursor: 'pointer' }}>−</button>
        <span style={{ fontFamily: 'Caveat, cursive', fontSize: 28, color: 'var(--ob-ink-navy)' }}>{terms}</span>
        <button onClick={() => setTerms(terms + 1)} style={{ fontFamily: 'Caveat, cursive', fontSize: 28, background: 'transparent', border: 0, color: 'var(--ob-ink-red)', cursor: 'pointer' }}>+</button>
      </div>
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance} disabled={!school.trim()}>
          <ObRoughRect width={140} height={46} seed={161} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **E14.4: Run test, verify pass**

```bash
npm test -- components/onboarding/steps/TransferDetailStep.test.tsx
```

- [ ] **E14.5: Commit**

```bash
git add components/onboarding/steps/TransferDetailStep.tsx components/onboarding/steps/TransferDetailStep.test.tsx package.json vitest.config.ts
git commit -m "feat(onboarding): TransferDetailStep + test"
```

---

#### E15: CommunitiesStep

**Files:**
- Create: `components/onboarding/steps/CommunitiesStep.tsx`
- Create: `components/onboarding/steps/CommunitiesStep.test.tsx`

- [ ] **E15.1: Write the failing test**

```tsx
// components/onboarding/steps/CommunitiesStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CommunitiesStep } from './CommunitiesStep';

describe('CommunitiesStep', () => {
  it('toggles a community chip', () => {
    const update = vi.fn();
    const { getByText } = render(
      <CommunitiesStep profile={{}} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.click(getByText('first gen'));
    expect(update).toHaveBeenCalledWith({ communities: ['first_gen'] });
  });

  it('prefer-not-to-share clears and disables chips', () => {
    const update = vi.fn();
    const { getByText, getAllByRole } = render(
      <CommunitiesStep profile={{ communities: ['transfer'] }} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.click(getByText(/prefer not to share/i));
    expect(update).toHaveBeenCalledWith({ communities: [] });
    // chip buttons should be disabled
    const chipBtns = getAllByRole('button').filter(b => /first gen|transfer|veteran/.test(b.textContent ?? ''));
    chipBtns.forEach(b => expect((b as HTMLButtonElement).disabled).toBe(true));
  });
});
```

- [ ] **E15.2: Run test, verify failure**

- [ ] **E15.3: Implement**

```tsx
// components/onboarding/steps/CommunitiesStep.tsx
'use client';
import { useState } from 'react';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';
import type { CommunityTag } from '@/lib/schemas';

const TAGS: { value: CommunityTag; label: string }[] = [
  { value: 'first_gen', label: 'first gen' },
  { value: 'transfer', label: 'transfer' },
  { value: 'veteran', label: 'veteran' },
  { value: 'international', label: 'international' },
  { value: 'lgbtq_plus', label: 'LGBTQ+' },
  { value: 'disability', label: 'disability' },
  { value: 'religious', label: 'religious' },
  { value: 'cultural_org', label: 'cultural org' },
];

export function CommunitiesStep({ profile, update, advance }: StepProps) {
  const selected = profile.communities ?? [];
  const [skipped, setSkipped] = useState<boolean>(selected.length === 0 && profile.communities !== undefined);
  const toggle = (v: CommunityTag) => {
    if (skipped) return;
    const next = selected.includes(v) ? selected.filter(c => c !== v) : [...selected, v];
    update({ communities: next });
  };
  const togglePns = () => {
    if (skipped) { setSkipped(false); return; }
    setSkipped(true);
    update({ communities: [] });
  };
  return (
    <div>
      <h2 className={styles.obQuestion}>Communities you identify with?</h2>
      <p className={styles.obSub}>Opt-in. Helps surface dedicated programs and peer groups.</p>
      <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
        <button
          className={`${styles.obChoice} ${skipped ? styles.obChoiceSelected : ''}`}
          onClick={togglePns}
          style={{ padding: '8px 16px' }}
        >
          <ObRoughRect width={260} height={40} seed={170} />
          <span className={styles.obChoiceInner}>Prefer not to share</span>
        </button>
      </div>
      <div className={styles.obChipRow} style={{ opacity: skipped ? 0.4 : 1 }}>
        {TAGS.map((t, i) => {
          const on = selected.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              disabled={skipped}
              onClick={() => toggle(t.value)}
              className={`${styles.obChip} ${on ? styles.obChipSelected : ''}`}
              style={{ '--rot': `${((i % 3) - 1) * 0.4}deg` } as React.CSSProperties}
            >
              <ObRoughRect width={t.label.length * 9 + 44} height={34} seed={180 + i} />
              <span className={styles.obChipInner}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance}>
          <ObRoughRect width={140} height={46} seed={199} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **E15.4: Run test, verify pass**
- [ ] **E15.5: Commit**

```bash
git add components/onboarding/steps/CommunitiesStep.tsx components/onboarding/steps/CommunitiesStep.test.tsx
git commit -m "feat(onboarding): CommunitiesStep + test"
```

---

#### E16: HorizonsStep

**Files:**
- Create: `components/onboarding/steps/HorizonsStep.tsx`
- Create: `components/onboarding/steps/HorizonsStep.test.tsx`

- [ ] **E16.1: Write the failing test**

```tsx
// components/onboarding/steps/HorizonsStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HorizonsStep } from './HorizonsStep';

describe('HorizonsStep', () => {
  it('writes horizons to profile on slider change', () => {
    const update = vi.fn();
    const { getByRole } = render(
      <HorizonsStep profile={{}} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.change(getByRole('slider'), { target: { value: '7' } });
    expect(update).toHaveBeenCalledWith({ horizons: 7 });
  });

  it('renders anchor label matching the value', () => {
    const { getByText } = render(
      <HorizonsStep profile={{ horizons: 4 }} update={() => {}} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    expect(getByText(/~ 2 yrs/)).toBeTruthy();
  });
});
```

- [ ] **E16.2: Run test, verify failure**

- [ ] **E16.3: Implement**

```tsx
// components/onboarding/steps/HorizonsStep.tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

function label(h: number): string {
  if (h <= 1) return 'this qtr';
  if (h <= 2) return 'this yr';
  if (h <= 4) return '~ 2 yrs';
  if (h <= 6) return '~ 4 yrs';
  if (h <= 8) return 'post-grad';
  return '10+ yrs';
}

export function HorizonsStep({ profile, update, advance }: StepProps) {
  const h = profile.horizons ?? 4;
  return (
    <div>
      <h2 className={styles.obQuestion}>How far out are you planning?</h2>
      <p className={styles.obSub}>Anywhere from this quarter to a decade.</p>
      <div style={{ marginTop: 8, marginBottom: 6 }}>
        <span className={styles.obRulerLabel}>{label(h)}</span>
      </div>
      <input
        type="range"
        min={1} max={10} step={1}
        value={h}
        onChange={(e) => update({ horizons: Number(e.target.value) })}
        style={{ width: '100%', accentColor: 'var(--ob-ink-red)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Kalam, cursive', fontSize: 13, color: 'var(--ob-ink-muted)', marginTop: 4 }}>
        <span>this qtr</span><span>this yr</span><span>~2 yrs</span><span>~4 yrs</span><span>post-grad</span><span>10+</span>
      </div>
      <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={advance}>
          <ObRoughRect width={140} height={46} seed={210} />
          <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **E16.4: Run test, verify pass**
- [ ] **E16.5: Commit**

```bash
git add components/onboarding/steps/HorizonsStep.tsx components/onboarding/steps/HorizonsStep.test.tsx
git commit -m "feat(onboarding): HorizonsStep + test"
```

---

#### E17: PivotStep

**Files:**
- Create: `components/onboarding/steps/PivotStep.tsx`
- Create: `components/onboarding/steps/PivotStep.test.tsx`

- [ ] **E17.1: Write the failing test**

```tsx
// components/onboarding/steps/PivotStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PivotStep } from './PivotStep';

describe('PivotStep', () => {
  it('writes pivot.pivot_from as typed', () => {
    const update = vi.fn();
    const { getByLabelText } = render(
      <PivotStep profile={{ pivot: { triggered: true } }} update={update} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.change(getByLabelText(/coming from/i), { target: { value: 'lit' } });
    expect(update).toHaveBeenCalledWith({
      pivot: { triggered: true, pivot_from: 'lit', pivot_target: undefined },
    });
  });

  it('skip link clears triggered and advances', () => {
    const update = vi.fn();
    const advance = vi.fn();
    const { getByText } = render(
      <PivotStep profile={{ pivot: { triggered: true } }} update={update} advance={advance} autoAdvance={() => {}} goBack={() => {}} />
    );
    fireEvent.click(getByText(/skip — just exploring/i));
    expect(update).toHaveBeenCalledWith({ pivot: { triggered: false } });
    expect(advance).toHaveBeenCalled();
  });
});
```

- [ ] **E17.2: Run test, verify failure**

- [ ] **E17.3: Implement**

```tsx
// components/onboarding/steps/PivotStep.tsx
'use client';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import type { StepProps } from './types';

export function PivotStep({ profile, update, advance }: StepProps) {
  const from = profile.pivot?.pivot_from;
  const to   = profile.pivot?.pivot_target;
  const set = (patch: { pivot_from?: string; pivot_target?: string }) =>
    update({ pivot: { triggered: true, pivot_from: patch.pivot_from ?? from, pivot_target: patch.pivot_target ?? to } });
  const skip = () => { update({ pivot: { triggered: false } }); advance(); };
  return (
    <div>
      <h2 className={styles.obQuestion}>Thinking of pivoting?</h2>
      <p className={styles.obSub}>Both notes are optional — whatever you write helps us understand the shift.</p>
      <div className={styles.obStickyPair}>
        <label className={`${styles.obSticky} ${styles.obStickyDrop}`} style={{ '--note-rot': '-1.5deg' } as React.CSSProperties}>
          <span className={styles.obStickyLabel}>Coming from</span>
          <textarea
            aria-label="Coming from"
            className={styles.obStickyTextarea}
            value={from ?? ''}
            onChange={(e) => set({ pivot_from: e.target.value.slice(0, 120) })}
            placeholder="e.g. pre-med, literature..."
          />
        </label>
        <label className={`${styles.obSticky} ${styles.obStickyDrop}`} style={{ '--note-rot': '1.2deg' } as React.CSSProperties}>
          <span className={styles.obStickyLabel}>Moving toward</span>
          <textarea
            aria-label="Moving toward"
            className={styles.obStickyTextarea}
            value={to ?? ''}
            onChange={(e) => set({ pivot_target: e.target.value.slice(0, 120) })}
            placeholder="e.g. product, policy, teaching..."
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button className={styles.obCtaBtn} onClick={advance} disabled={!from || !to}>
            <ObRoughRect width={140} height={46} seed={221} />
            <span className={styles.obCtaBtnLabel}>Next &rarr;</span>
          </button>
        </div>
        <button onClick={skip} style={{ fontFamily: 'Kalam, cursive', background: 'transparent', border: 0, color: 'var(--ob-ink-muted)', fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }}>
          skip — just exploring
        </button>
      </div>
    </div>
  );
}
```

- [ ] **E17.4: Run test, verify pass**
- [ ] **E17.5: Commit**

```bash
git add components/onboarding/steps/PivotStep.tsx components/onboarding/steps/PivotStep.test.tsx
git commit -m "feat(onboarding): PivotStep + test"
```

---

#### E18: ConfirmStep

**Files:**
- Create: `components/onboarding/steps/ConfirmStep.tsx`
- Create: `components/onboarding/steps/ConfirmStep.test.tsx`

- [ ] **E18.1: Write the failing test**

```tsx
// components/onboarding/steps/ConfirmStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ConfirmStep } from './ConfirmStep';
import type { IntakeProfileV2 } from '@/lib/schemas';

const valid: Partial<IntakeProfileV2> = {
  year: 'freshman',
  major_category: 'stem',
  first_gen: true,
  aid_status: 'pell',
  hours_per_week: 8,
  interests: ['ai_ml'],
  mode: 'discovery',
};

describe('ConfirmStep', () => {
  it('submit calls onSubmit with validated profile when valid', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <ConfirmStep profile={valid} update={() => {}} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} onSubmit={onSubmit} onEdit={() => {}} />
    );
    fireEvent.click(getByText(/generate my notebook/i));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ year: 'freshman' }));
  });

  it('submit shows error when profile invalid', () => {
    const onSubmit = vi.fn();
    const { getByText, queryByText } = render(
      <ConfirmStep profile={{}} update={() => {}} advance={() => {}} autoAdvance={() => {}} goBack={() => {}} onSubmit={onSubmit} onEdit={() => {}} />
    );
    fireEvent.click(getByText(/generate my notebook/i));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(queryByText(/required|missing|invalid/i)).toBeTruthy();
  });
});
```

- [ ] **E18.2: Run test, verify failure**

- [ ] **E18.3: Implement**

```tsx
// components/onboarding/steps/ConfirmStep.tsx
'use client';
import { useState } from 'react';
import styles from '../onboarding.module.css';
import { ObRoughRect } from '../rough';
import { IntakeProfileV2Schema, type IntakeProfileV2 } from '@/lib/schemas';
import type { StepProps } from './types';
import type { StepId } from '@/lib/onboarding-engine';

type Extra = {
  onSubmit: (p: IntakeProfileV2) => void;
  onEdit:   (id: StepId) => void;
};

export function ConfirmStep({ profile, onSubmit, onEdit }: StepProps & Extra) {
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const r = IntakeProfileV2Schema.safeParse(profile);
    if (!r.success) {
      setError(r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
      return;
    }
    onSubmit(r.data);
  };
  const row = (label: string, value: React.ReactNode, stepId: StepId) => (
    <div className={styles.obSummaryRow}>
      <span className={styles.obSummaryLabel}>{label}</span>
      <span className={styles.obSummaryValue}>{value}</span>
      <button className={styles.obSummaryEdit} onClick={() => onEdit(stepId)}>edit</button>
    </div>
  );
  return (
    <div>
      <h2 className={styles.obQuestion}>Ready to build your notebook?</h2>
      <p className={styles.obSub}>Here&rsquo;s what we&rsquo;ve got. Tap edit to change anything.</p>
      {row('Year', profile.year ?? '—', 'year')}
      {row('Major', profile.major_category ?? '—', 'major')}
      {row('Transfer', profile.is_transfer ? 'Yes' : 'No', 'transfer_ask')}
      {profile.is_transfer && profile.transfer && row('Prior school', `${profile.transfer.prior_school} · ${profile.transfer.terms_remaining} terms left`, 'transfer_detail')}
      {row('Hours / week', String(profile.hours_per_week ?? '—'), 'hours')}
      {row('Aid', profile.aid_status ?? '—', 'aid')}
      {row('First-gen', profile.first_gen === true ? 'Yes' : profile.first_gen === false ? 'No' : '—', 'firstgen')}
      {profile.communities && profile.communities.length > 0 && row('Communities', profile.communities.join(', '), 'communities')}
      {row('Interests', (profile.interests ?? []).join(', ') || '—', 'interests')}
      {profile.horizons !== undefined && row('Horizons', `${profile.horizons}/10`, 'horizons')}
      {row('Mode', profile.mode ?? '—', 'mode')}
      {profile.satisfaction !== undefined && row('Path clarity', `${profile.satisfaction}/5`, 'satisfaction')}
      {profile.pivot?.triggered && row('Pivot', `${profile.pivot.pivot_from ?? '—'} → ${profile.pivot.pivot_target ?? '—'}`, 'pivot')}
      {profile.blocker && row('Blocker', profile.blocker, 'blocker')}
      {profile.end_goal && row('Goal', profile.end_goal, 'goal')}

      {error && <p style={{ color: 'var(--ob-ink-red)', fontFamily: 'Kalam, cursive', marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 28, position: 'relative', display: 'inline-block' }}>
        <button className={styles.obCtaBtn} onClick={submit}>
          <ObRoughRect width={260} height={52} seed={231} />
          <span className={styles.obCtaBtnLabel}>Generate my notebook &rarr;</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **E18.4: Run test, verify pass**
- [ ] **E18.5: Commit**

```bash
git add components/onboarding/steps/ConfirmStep.tsx components/onboarding/steps/ConfirmStep.test.tsx
git commit -m "feat(onboarding): ConfirmStep + test"
```

---

### Task H: DemoMenu + PhaseHeader

**Files:**
- Create: `components/onboarding/DemoMenu.tsx`
- Create: `components/onboarding/PhaseHeader.tsx`

- [ ] **H1: Create DemoMenu**

```tsx
// components/onboarding/DemoMenu.tsx
'use client';
import { useState } from 'react';
import styles from './onboarding.module.css';
import personas from '@/data/ucla/personas.json';

type Persona = { key: string; display_name: string; tagline?: string };

export function DemoMenu({ onPick }: { onPick: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const list = personas as Persona[];
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontFamily: 'Caveat, cursive', fontSize: 20, background: 'transparent', border: 0, color: 'var(--ob-ink-muted)', cursor: 'pointer' }}
      >
        Demo ▾
      </button>
      {open && (
        <ul style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 8, listStyle: 'none', padding: 6,
          background: '#fef3a2', boxShadow: '0 8px 20px -8px rgba(60,45,20,0.3)',
          transform: 'rotate(-0.5deg)', zIndex: 20, minWidth: 240,
        }}>
          {list.map(p => (
            <li key={p.key}>
              <button
                onClick={() => { onPick(p.key); setOpen(false); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'Kalam, cursive' }}
              >
                <div style={{ color: 'var(--ob-ink-navy)', fontWeight: 700 }}>{p.display_name}</div>
                <div style={{ color: 'var(--ob-ink-muted)', fontSize: 13 }}>{p.tagline ?? ''}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **H2: Create PhaseHeader**

```tsx
// components/onboarding/PhaseHeader.tsx
'use client';
import styles from './onboarding.module.css';
import { DemoMenu } from './DemoMenu';
import type { Phase } from '@/lib/onboarding-engine';

const PHASES: Phase[] = ['basics', 'situation', 'direction', 'confirm'];
const LABELS: Record<Phase, string> = {
  basics: 'Basics', situation: 'Situation', direction: 'Direction', confirm: 'Confirm',
};

export function PhaseHeader({
  phase, index, total, onDemo,
}: { phase: Phase; index: number; total: number; onDemo: (key: string) => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <div className={styles.obTitle}>Pathway · a working notebook</div>
        <div className={styles.obSubtitle}>quick questions, then we&rsquo;ll sketch your path</div>
        <div className={styles.obPhaseRow}>
          {PHASES.map(p => (
            <span key={p} className={p === phase ? styles.obPhaseItemActive : styles.obPhaseItem}>
              {LABELS[p]}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 6, fontFamily: 'Kalam, cursive', fontSize: 14, color: 'var(--ob-ink-muted)' }}>
          Step {index + 1} of {total}
        </div>
      </div>
      <DemoMenu onPick={onDemo} />
    </header>
  );
}
```

- [ ] **H3: Commit**

```bash
git add components/onboarding/DemoMenu.tsx components/onboarding/PhaseHeader.tsx
git commit -m "feat(onboarding): DemoMenu + PhaseHeader (notebook aesthetic)"
```

---

## Wave 4 — Shell refactor [SEQUENTIAL]

One task. Depends on all Wave 3 tasks.

---

### Task F: Engine-driven Onboarding shell

**Files:**
- Modify: `components/onboarding/Onboarding.tsx` (full replacement)

- [ ] **F1: Replace Onboarding.tsx**

Replace the entire file with:

```tsx
'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './onboarding.module.css';
import { PhaseHeader } from './PhaseHeader';
import {
  STEPS, nextStep, prevStep, phaseProgress,
  type StepId,
} from '@/lib/onboarding-engine';
import { useProfileStore } from '@/store/profile';
import type { IntakeProfileV2 } from '@/lib/schemas';
import personas from '@/data/ucla/personas.json';

import { WelcomeStep } from './steps/WelcomeStep';
import { YearStep } from './steps/YearStep';
import { MajorStep } from './steps/MajorStep';
import { TransferAskStep } from './steps/TransferAskStep';
import { TransferDetailStep } from './steps/TransferDetailStep';
import { HoursStep } from './steps/HoursStep';
import { AidStep } from './steps/AidStep';
import { FirstGenStep } from './steps/FirstGenStep';
import { CommunitiesStep } from './steps/CommunitiesStep';
import { InterestsStep } from './steps/InterestsStep';
import { HorizonsStep } from './steps/HorizonsStep';
import { ModeStep } from './steps/ModeStep';
import { SatisfactionStep } from './steps/SatisfactionStep';
import { PivotStep } from './steps/PivotStep';
import { AdjacentStep } from './steps/AdjacentStep';
import { BlockerStep } from './steps/BlockerStep';
import { GoalStep } from './steps/GoalStep';
import { ConfirmStep } from './steps/ConfirmStep';
import type { StepProps } from './steps/types';

type Persona = { key: string; display_name: string; tagline?: string; profile: Partial<IntakeProfileV2> };

const COMPONENTS: Record<StepId, React.ComponentType<StepProps & { onSubmit?: (p: IntakeProfileV2) => void; onEdit?: (id: StepId) => void }>> = {
  welcome: WelcomeStep,
  year: YearStep,
  major: MajorStep,
  transfer_ask: TransferAskStep,
  transfer_detail: TransferDetailStep,
  hours: HoursStep,
  aid: AidStep,
  firstgen: FirstGenStep,
  communities: CommunitiesStep,
  interests: InterestsStep,
  horizons: HorizonsStep,
  mode: ModeStep,
  satisfaction: SatisfactionStep,
  pivot: PivotStep,
  adjacent: AdjacentStep,
  blocker: BlockerStep,
  goal: GoalStep,
  confirm: ConfirmStep,
};

export function Onboarding() {
  const router = useRouter();
  const setProfileStore = useProfileStore(s => s.setProfile);

  const [draft, setDraft] = useState<Partial<IntakeProfileV2>>({});
  const [current, setCurrent] = useState<StepId>('welcome');
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((patch: Partial<IntakeProfileV2>) => {
    setDraft(d => ({ ...d, ...patch }));
  }, []);

  const advance = useCallback(() => {
    setCurrent(c => nextStep(c, draft) ?? c);
  }, [draft]);

  const goBack = useCallback(() => {
    setCurrent(c => prevStep(c, draft) ?? c);
  }, [draft]);

  const autoAdvance = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      setCurrent(c => nextStep(c, draft) ?? c);
    }, 180);
  }, [draft]);

  useEffect(() => () => { if (autoTimer.current) clearTimeout(autoTimer.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inText = ['TEXTAREA','INPUT'].includes(document.activeElement?.tagName ?? '');
      if (e.key === 'ArrowLeft') goBack();
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'Enter' && !inText) advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goBack]);

  const onSubmit = (p: IntakeProfileV2) => {
    setProfileStore(p);
    router.push('/pathway');
  };

  const onEdit = (id: StepId) => setCurrent(id);

  const applyPersona = (key: string) => {
    const p = (personas as Persona[]).find(x => x.key === key);
    if (!p) return;
    setDraft(p.profile);
    setCurrent('confirm');
  };

  const progress = phaseProgress(current, draft);
  const StepComponent = COMPONENTS[current];
  const stepProps: StepProps & { onSubmit?: typeof onSubmit; onEdit?: typeof onEdit } = {
    profile: draft, update, advance, autoAdvance, goBack, onSubmit, onEdit,
  };

  return (
    <div className={styles.obPaper}>
      <div className={styles.obCanvas}>
        <PhaseHeader phase={progress.phase} index={progress.index} total={progress.total} onDemo={applyPersona} />
        <main style={{ marginTop: 24 }}>
          <StepComponent {...stepProps} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **F2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **F3: Full test suite**

```bash
npm test
```

Expected: all green (v1 tests, schemas-v2, engine, student-context, component tests).

- [ ] **F4: Commit**

```bash
git add components/onboarding/Onboarding.tsx
git commit -m "feat(onboarding): engine-driven shell replaces switch-based Onboarding"
```

---

## Wave 5 — Manual QA + polish [SEQUENTIAL]

- [ ] **QA1: Boot dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000`.

- [ ] **QA2: Walk hand-entered flow**

Take the full flow end-to-end with:
- year = junior
- major = "History" (humanities)
- transfer = No
- hours = 10
- aid = Work-study
- first gen = No
- communities = skip (prefer not to share)
- interests = storytelling, policy, design
- horizons = 8 (expect `adjacent` slide to appear next)
- mode = partial
- satisfaction = 2 (expect `pivot` slide to appear next)
- pivot: from = "academia", to = "product" → Next
- adjacent = pick a couple
- blocker = too_many_options
- goal = "find a path combining writing and product"
- Confirm → generate my notebook → should route to `/pathway` and render the notebook with profile set

- [ ] **QA3: Walk each persona**

Click Demo ▾ → Maya → confirm → generate. Repeat for Raj, Priya. Verify each routes to `/pathway`.

- [ ] **QA4: Branching regression**

- Start hand-entered again with is_transfer=Yes → confirm `transfer_detail` appears.
- Start with horizons=3 → confirm no `adjacent` slide.
- Start with satisfaction=5 → confirm no `pivot` slide.

- [ ] **QA5: Debug overlay (optional)**

Navigate to `http://localhost:3000?engine_trace=1` and confirm the visible-steps overlay renders. (If not implemented, skip — this was marked "optional nice-to-have" in the spec §14. If any agent implemented it, verify it works; if not, move on.)

- [ ] **QA6: Final commit (if any polish needed)**

If anything needed to be tweaked during QA, commit separately:

```bash
git add <files>
git commit -m "fix(onboarding): <specific issue found in QA>"
```

- [ ] **QA7: Push branch**

```bash
git push -u origin onboarding-v2
```

---

## Self-review checklist (already applied)

- **Spec coverage**: every section of `docs/superpowers/specs/2026-04-19-onboarding-v2-design.md` (§4 schema, §5 engine, §6 UI, §7 personas, §8 store, §9 seam, §10 integration) has a task or documented deferral.
- **Integration diff (§10)** is documented but not applied — intentional. Notebook cluster merges the 3-line patch post-merge.
- **R2 simplification**: spec drops the horizons-gated communities skip; engine tests reflect this.
- **Type consistency**: `IntakeProfileV2`, `StepId`, `Phase`, `StepProps`, `StepDef` used identically across all tasks.
- **Placeholder scan**: no "TBD / fill in / similar to task N". All code steps ship full code.
- **Parallelism safety**: no two Wave-same-letter tasks write the same file. Wave 3 tasks share only read dependencies on Wave 2 outputs.
