# Design: Pathway Notebook UI

**Date:** 2026-04-19
**Status:** Draft — awaiting user approval
**Supersedes:** current SVG tree UI at `/pathway` (`components/tree/*`)
**Source prototype:** `Scroll directions.html` (paper-notebook handoff from Claude Design)
**Parent design:** `docs/superpowers/specs/` (Pathway MVP, Approach D)

## 1. Goals & Scope

### Goal

Replace the current SVG tree at `/pathway` with a paper-notebook interaction faithful to `Scroll directions.html`: a single scrolling timeline of 5 fixed stages (Direction → Community → Signal → Summer → Capstone) where each click-prompt reveals three choices, locks one in with a yellow sticky-note animation, and unfurls the next stage. A right-side panel shows the selected option's cites, meta, why, body, and two actions (Lock it in / dismiss). Hand-drawn aesthetic via `roughjs` + `perfect-freehand`, paper background + ruling lines + red margin line, Caveat + Kalam fonts.

### In scope

- `components/notebook/*` — Notebook shell, Timeline, TimelineRow, RootNode, LockedNode, PromptNode, ChoicesCard, StickyNote, Panel, PanelEmpty, Marginalia.
- `components/notebook/rough/*` — RoughRect, FreehandUnderline, FreehandArrow, FreehandCheck, FreehandStrike, FreehandHighlighter, FreehandBox, FreehandSquiggle.
- `lib/notebook-engine.ts` — stages config, stage-1 option resolution, todo synthesis, rotation/seed allocation, profile-to-root-sub composer, path-trace builder.
- `lib/freehand.ts` — seeded RNG + `perfect-freehand`-based path builders (pure, no DOM).
- `components/notebook/notebook.module.css` — paper background, sticky note, animations, reduced-motion branch.
- Schema additions (`lib/schemas.ts`): `CiteSchema`, `stage_key` enum, `path_tag`, `eyebrow`, extended `NodeSchema`, extended `ExpandRequestSchema`.
- Chain-model refactor of `store/pathway.ts`.
- Stage-aware Claude prompt (`lib/claude.ts`) + stage-aware fallback (`lib/fallback.ts`) + new `data/ucla/stage_fallbacks.json`.
- `/api/expand-node` accepts + requires `stage_key`; filter rejects mismatched responses + invalid cite URLs.
- Fonts: `Caveat` + `Kalam` via `next/font/google`.
- Deletion of `components/tree/*` (9 files) and the legacy tree test(s) touching them.
- Test coverage: notebook engine, store chain invariants, schema additions, expand-node stage contract, stage-aware fallback, freehand determinism, filter.

### Out of scope

- Onboarding v2 (pivot-signal, transfer, horizons, community) — separate spec queued.
- Resume / LinkedIn import — separate spec queued.
- Stage-1 seed expansion to non-STEM major categories — relying on Claude fallback when seed count < 3 for `(major_category, mode)`.
- Mobile and tablet responsive layouts; desktop only.
- Multi-user, auth, server-side persistence, notebook sharing / PDF export.
- Accessibility beyond keyboard navigation, ARIA on interactive elements, visible focus rings, and `prefers-reduced-motion` — no full screen-reader audit.

## 2. Schema & Data Model

### 2.1 Stage config (`lib/notebook-engine.ts`)

```ts
export const STAGES = [
  { key: 'direction', stage: 'Stage 1 · Declare a direction', when: 'Month 1–2 · Fall 2026',           prompt: 'Pick your starting direction' },
  { key: 'community', stage: 'Stage 2 · Find your people',    when: 'Month 2–4 · Fall/Winter 2026',    prompt: 'Pick your first community' },
  { key: 'signal',    stage: 'Stage 3 · Build signal',        when: 'Winter/Spring 2027',              prompt: 'Earn your first credential' },
  { key: 'summer',    stage: 'Stage 4 · Summer',              when: 'Summer 2027',                     prompt: 'Pick your sophomore summer' },
  { key: 'capstone',  stage: 'Stage 5 · Year 2 capstone',     when: 'Fall 2027–Spring 2028',           prompt: 'Set your year-2 bet' },
] as const;

export const STAGE_KEYS = ['direction','community','signal','summer','capstone'] as const;
export type StageKey = typeof STAGE_KEYS[number];

export const STAGE_EYEBROW: Record<StageKey, string> = {
  direction: 'Direction',
  community: 'Community',
  signal:    'Signal',
  summer:    'Summer',
  capstone:  'Capstone',
};
```

`STAGE_KEYS` is the single source of truth for the `stage_key` enum and is imported by `lib/schemas.ts` (via `z.enum([...STAGE_KEYS])`), the prompt builder, the fallback generator, the store, and tests.

### 2.2 Schema additions (`lib/schemas.ts`)

```ts
export const CiteSchema = z.object({
  label:   z.string().min(1).max(80),   // e.g. "UCLA CS Department"
  summary: z.string().min(1).max(200),  // e.g. "major requirements, course map, advising"
  url:     z.string().url(),
});

// `num` is derived from array index on render (cite.num = String(i + 1)).
// Storing it would be redundant and invites drift.

export const StageKeyEnum = z.enum(STAGE_KEYS);

// Extend NodeSchema:
stage_key:  StageKeyEnum,
eyebrow:    z.string().max(40),          // display label, defaults to STAGE_EYEBROW[stage_key]
path_tag:   z.string().regex(/^[a-z0-9_-]{2,24}$/),  // drives next-stage lookup; enforced same bounds in prompt
cites:      z.array(CiteSchema).max(3),

// Extend ExpandRequestSchema:
stage_key:        StageKeyEnum,
parent_path_tag:  z.string().nullable(),  // null for stage 1 only
```

`NodeSchema.deadline_pill` and other existing fields unchanged.

### 2.3 Chain-model store (`store/pathway.ts`)

```ts
type NodeRecord = Node & { status: 'idle'|'loading'|'loaded'|'error' };
type InFlight = { requestId: string; abort: AbortController };

type PathwayState = {
  nodesById: Record<string, NodeRecord>;
  lockedNodeIds: string[];                  // indexed by stageIdx (length 0..5)
  openPromptStageIdx: number | null;        // which stage's choices are visible
  previewNodeId: string | null;             // selected in panel but not yet locked
  justLockedStageIdx: number | null;        // animation trigger, cleared after 1400ms
  humility: string | null;                  // Claude's epistemic humility block if present
  inFlight: Record<number, InFlight>;       // keyed by stageIdx

  // actions
  setPreview: (nodeId: string | null) => void;
  lockIn: (stageIdx: number, nodeId: string) => void;
  reopen: (stageIdx: number) => void;       // destructively truncates downstream
  cancelPreview: () => void;                // clears previewNodeId only
  toggleTodoDone: (nodeId: string, idx: number) => void;
  addNodes: (nodes: Node[]) => void;
  startExpand: (stageIdx: number, parentNodeId: string) => { requestId: string; signal: AbortSignal };
  acceptChildren: (stageIdx: number, requestId: string, children: Node[]) => boolean;
  abortExpand: (stageIdx: number) => void;
  reset: () => void;
};
```

Persistence (existing `zustand/middleware/persist`): persist `nodesById`, `lockedNodeIds`, `openPromptStageIdx`. Do not persist `previewNodeId`, `justLockedStageIdx`, `inFlight`, `humility`.

### 2.4 Options-per-stage derivation

**Stage 1** (`optionsForStage(0, profile)`):

```ts
const filtered = FIRST_LAYER_SEEDS.filter(s =>
  s.applies_to_majors.includes(profile.major_category) &&
  s.applies_to_modes.includes(profile.mode)
);
if (filtered.length >= 3) return { kind: 'seeds', seeds: filtered.slice(0, 4) };
return { kind: 'claude', fetch: () => expandNode({ stage_key: 'direction', parent_path_tag: null, ... }) };
```

**Known coverage gap.** `data/ucla/first_layer_seeds.json` currently has 4 STEM seeds but only 1 seed mapped to `humanities`, `social_science`, and `undeclared` ("help me explore"). Non-STEM users trigger the Claude fallback on stage 1. This is intentional for now; seed expansion is out-of-scope for this spec.

**Stages 2–5** (`optionsForStage(idx > 0, profile)`):

```ts
const parentId = lockedNodeIds[idx - 1];
const parent = nodesById[parentId];
const cached = parent.children.filter(c => c.stage_key === STAGE_KEYS[idx]);
if (cached.length === 3) return { kind: 'cached', nodes: cached };
// else
return { kind: 'claude', fetch: () => expandNode({
  stage_key: STAGE_KEYS[idx],
  parent_path_tag: parent.path_tag,
  parent_id: parent.id,
  path_trace: buildPathTrace(lockedNodeIds.slice(0, idx), nodesById),
  profile,
  requestId: generateId(),
}) };
```

### 2.5 Todo synthesis

Primary: use `node.todos` from Claude. Fallback when empty (`synthesizeTodos`):

1. `Add deadline to calendar: ${node.deadline}` if deadline exists and is not a rolling/open phrase.
2. `Block ${node.estimated_time_cost.split('·')[0].trim()} on schedule`.
3. Stage-specific last item:
   - idx 0: `Book a College advisor / AAP counselor meeting`
   - idx 1: `Find the General Meeting date + RSVP`
   - idx 2: `Draft application / intro email`
   - idx 3: `Email 3 potential mentors / PIs this week`
   - idx 4: `Write a 1-line progress note each Friday`

Todos capped at 5 per existing `NodeSchema`.

## 3. Architecture & Files

```
app/
  pathway/page.tsx                      [REWRITE] renders <Notebook/>
  layout.tsx                            [UPDATE] load Caveat + Kalam via next/font

components/
  notebook/                             [NEW]
    Notebook.tsx
    Timeline.tsx
    TimelineRow.tsx
    RootNode.tsx
    LockedNode.tsx
    PromptNode.tsx
    ChoicesCard.tsx
    StickyNote.tsx
    Panel.tsx
    PanelEmpty.tsx
    Marginalia.tsx
    MissBannerInline.tsx
    rough/
      RoughRect.tsx
      FreehandUnderline.tsx
      FreehandArrow.tsx
      FreehandCheck.tsx
      FreehandStrike.tsx
      FreehandHighlighter.tsx
      FreehandBox.tsx
      FreehandSquiggle.tsx
    notebook.module.css

lib/
  notebook-engine.ts                    [NEW] STAGES, STAGE_KEYS, STAGE_EYEBROW,
                                               optionsForStage, synthesizeTodos,
                                               rotationFor, seedFor,
                                               composeRootSub, buildPathTrace
  freehand.ts                           [NEW] seededRng, getStroke wrapper,
                                               freehand* path builders
  claude.ts                             [UPDATE] stage-aware system prompt
  fallback.ts                           [UPDATE] stage-aware synthesis
  schemas.ts                            [UPDATE] CiteSchema; Node + ExpandRequest fields
  filter.ts                             [UPDATE] reject invalid cite URLs;
                                                 reject nodes w/ wrong stage_key

store/
  pathway.ts                            [REWRITE] chain model (see § 2.3)

app/api/expand-node/route.ts            [UPDATE] require stage_key; pass to claude.ts

data/ucla/
  first_layer_seeds.json                [UPDATE] add path_tag + eyebrow per seed
  stage_fallbacks.json                  [NEW] static per-stage fallback children

tests/
  notebook-engine.test.ts               [NEW]
  pathway-store.test.ts                 [REWRITE] chain model
  schemas.test.ts                       [UPDATE] Cite + stage_key
  expand-node.test.ts                   [UPDATE] stage_key required
  fallback.test.ts                      [UPDATE] stage-aware
  freehand.test.ts                      [NEW] seeded determinism
  filter.test.ts                        [UPDATE] cite + stage_key filtering

DELETE:
  components/tree/MissBanner.tsx
  components/tree/TreeEdge.tsx
  components/tree/GhostRail.tsx
  components/tree/NodePanel.tsx
  components/tree/EpistemicHumilityBlock.tsx
  components/tree/ProgressBar.tsx
  components/tree/TreeCanvas.tsx
  components/tree/TreeNode.tsx
  components/tree/TreeScreen.tsx
  (and any tests exclusively covering these files)
```

### Module boundaries

- `lib/notebook-engine.ts` and `lib/freehand.ts` are pure — no React, no DOM, no store. Safe to unit-test in isolation and tree-shake into server or edge contexts.
- `components/notebook/rough/*` are presentational — take `{ width, height, seed, ... }` props, no store access.
- `Notebook.tsx` owns store selection and passes sliced state down. Leaf components take primitive props.
- CSS Module owns paper/sticky/animation styles; Tailwind handles layout primitives and typography tokens.

## 4. Data Flow

```
[/] Onboarding ─▶ profile store (IntakeProfile)
                        │
[/pathway] ────────────▶ Notebook.tsx
                        │
                        ├─ reads profile → composeRootSub(profile) → RootNode sub
                        │
                        ├─ resolveStage1Options(seeds, profile)
                        │    ├─ seeds-path: materialize seeds as nodes (stage_key='direction',
                        │    │              eyebrow='Direction', path_tag from seed)
                        │    │              into nodesById; openPromptStageIdx = 0
                        │    └─ claude-path: startExpand(0, null) → /api/expand-node
                        │                    on success acceptChildren(0, reqId, nodes)
                        │                    openPromptStageIdx = 0
                        │
                  ┌─────▼────────────────────────────────┐
click prompt  ───▶│ openPromptStageIdx = stageIdx        │
                  │ ChoicesCard renders 3 options        │
                  └─────┬────────────────────────────────┘
                        │
hover/click choice ─▶ setPreview(nodeId) ─▶ Panel renders (meta/cites/why/body/actions)
                        │
click "Lock it in" ─▶ lockIn(stageIdx, nodeId)
                        ├─ lockedNodeIds[stageIdx] = nodeId  (truncates prior if reopening)
                        ├─ justLockedStageIdx = stageIdx     (CSS sticky-drop fires)
                        ├─ openPromptStageIdx = stageIdx+1 (or null if at last stage)
                        ├─ setPreview(null)
                        └─ if stageIdx < 4: startExpand(stageIdx+1, nodeId)
                                           │
                                           ▼
                        POST /api/expand-node
                           { profile, stage_key, parent_path_tag, parent_id,
                             path_trace, requestId }
                                           │
                                           ▼
                        route.ts → lib/claude.ts (stage-aware prompt)
                           ├─ ok  → filter (valid cites/urls, stage_key match) → 3 Nodes
                           └─ err → lib/fallback.ts stage-aware synth → 3 Nodes
                                           │
                                           ▼
                        acceptChildren(stageIdx+1, reqId, nodes)
                        TimelineRow renders next prompt
                        setTimeout(1400ms) → justLockedStageIdx = null
```

### Reopen flow

The HTML prototype's reopen is **destructive on click**: the moment the user clicks a locked node, downstream locks are wiped. Dismiss does not restore them. We match this exactly.

```
click locked node ─▶ reopen(stageIdx)
                       ├─ previewNodeId = lockedNodeIds[stageIdx]  (pre-select visually)
                       ├─ lockedNodeIds = lockedNodeIds.slice(0, stageIdx)
                       └─ openPromptStageIdx = stageIdx
                           │
         ┌─────────────────┴──────────────────────────────────┐
  lock same choice ─▶ lockIn(stageIdx, sameNodeId): downstream cached children
                       are still in nodesById but no longer referenced — will be
                       re-expanded if user locks and continues. For now:
                       startExpand(stageIdx+1) unconditionally, overwriting cache.
  lock different   ─▶ lockIn(stageIdx, newNodeId); startExpand(stageIdx+1, newNodeId).
  click "dismiss"  ─▶ cancelPreview(): clear previewNodeId only. Locks stay truncated.
                       (User has no way to restore downstream without re-locking the chain.)
```

### Todo toggle

```
toggleTodoDone(nodeId, idx) ─▶ store patches node.todos[idx].done
                               FreehandCheck + FreehandStrike re-render with
                               seed = `${nodeId}:${idx}` (stable)
```

### Reset

`reset()` clears `lockedNodeIds`, `openPromptStageIdx`, `previewNodeId`, `justLockedStageIdx`, all `inFlight` (aborting each), `humility`. Stage-1 seed materialization re-runs on next render via `resolveStage1Options`. `nodesById` cleared to avoid stale children.

### Concurrency

`inFlight` keyed by `stageIdx`. New `startExpand(stageIdx, ...)` aborts prior flight for that stageIdx. `acceptChildren` rejects if `requestId` doesn't match the current flight (stale response).

## 5. Rendering Stack

### Dependencies (`package.json`)

```
+ "roughjs":         "^4.6.6"
+ "perfect-freehand": "^1.2.0"
```

### Fonts (`app/layout.tsx`)

```ts
import { Caveat, Kalam } from 'next/font/google';
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', weight: ['500','700'] });
const kalam  = Kalam({  subsets: ['latin'], variable: '--font-kalam',  weight: ['400','700'] });
// apply caveat.variable + kalam.variable on <html>
// reference in CSS module via var(--font-caveat) / var(--font-kalam)
```

### `lib/freehand.ts` (pure)

```ts
export function seededRng(seed: number): () => number;
export function freehandUnderline(w: number, opts?: { double?: boolean; seed?: number }): string;
export function freehandArrow(x1: number, y1: number, x2: number, y2: number,
                              opts?: { curve?: number; seed?: number }): string;
export function freehandCheck(size: number, seed: number): string;
export function freehandX(size: number, seed: number): string;
export function freehandStrike(width: number, seed: number): string;
export function freehandHighlighter(w: number, h: number, seed: number): string;
export function freehandBox(size: number, seed: number): string;
export function freehandSquiggle(w: number, seed: number): string;
```

Internals: seeded RNG → point array → `getStroke` from `perfect-freehand` → SVG `d` string. No DOM access, no React, no side effects.

### `components/notebook/rough/*.tsx`

Each component renders an absolutely-positioned `<svg>` with inline `<path d={…}/>` (for freehand primitives) or rough.js output (for `RoughRect`, which uses `useLayoutEffect` + `rough.svg(svgEl)` to append `<path>` children; cleanup removes them). All accept `seed: number` so parents pass stable seeds (via `seedFor(...)`).

### `<RoughRect>` fail-safe

Wrapped in `try/catch`. On rough.js error: render a plain `<rect stroke={...} fill={...}/>` with identical dimensions and log once via `console.warn('rough.js failed, falling back to <rect>')`.

### `notebook.module.css`

Ports the 24KB of visual styles from `Scroll directions.html`:

- `.paper` — `background-image: repeating-linear-gradient(...)` ruling lines every 32px; `::before` pseudo-element for SVG-noise grain via data URI; `::after` for red margin line at 80px left.
- `.paperVignette` — inset box-shadow edge darkening.
- `.canvas`, `.canvasHd`, `.canvasTitle`, `.canvasSub`, `.canvasHint`, `.canvasReset` — header row.
- `.frame`, `.frameChrome`, `.frameChromeTitle`, `.frameChromeRight` — chrome bar.
- `.split`, `.splitList`, `.splitPanel` — 1fr 1fr grid.
- `.tl`, `.tlSpineSvg`, `.tlRow`, `.tlStageLbl` — timeline.
- `.node`, `.nodeRoot`, `.nodeLocked`, `.nodeEyebrow`, `.nodeTitle`, `.nodeCheck`, `.nodeTodos`, `.nodeTodo`, `.nodeTodoDone` — node variants.
- `.prompt`, `.promptEyebrow`, `.promptTitle`, `.promptCta` — prompt card.
- `.choices`, `.choicesHd`, `.choice`, `.choiceSelected` — choices card.
- `.sticky`, `.stickyDropping`, `.stickyTxt`, `.stickyKicker`, `.stickySigned` — sticky note, including `@property --write` and keyframes `sticky-drop`, `sticky-wobble`, `sticky-write`, `sticky-sign`.
- `.panel`, `.panelKicker`, `.panelTtl`, `.panelMeta`, `.panelWhy`, `.panelBody`, `.panelCites`, `.panelCite`, `.panelActions`, `.reopenWarn` — right panel.
- `.btn`, `.btnPrimary`, `.btnGhost` — action buttons.
- `.marginalia` — margin labels.
- `@media (prefers-reduced-motion: reduce)` branch collapses all keyframes.

## 6. Notebook Engine (`lib/notebook-engine.ts`)

```ts
import type { IntakeProfile, Node, PathTraceItem, FirstLayerSeed } from '@/lib/schemas';

export const STAGES = [ ... ] as const;                    // § 2.1
export const STAGE_KEYS = [...] as const;
export type StageKey = typeof STAGE_KEYS[number];
export const STAGE_EYEBROW: Record<StageKey, string> = {...};

export function stageIdxOfKey(k: StageKey): number;
export function keyOfStageIdx(i: number): StageKey;

// stable deterministic rotation in [-amplitude, +amplitude]
export function rotationFor(key: string, amplitudeDeg?: number): number;

// stable 32-bit integer seed for a given element-identity key
export function seedFor(key: string): number;

// "You · Freshman · First-gen · CS + AI/ML curious"
export function composeRootSub(profile: IntakeProfile): string;

// filters first-layer seeds by (major_category, mode); returns kind='seeds' if >=3, else 'claude'
export function resolveStage1Options(
  seeds: FirstLayerSeed[], profile: IntakeProfile
): { kind: 'seeds'; seeds: FirstLayerSeed[] } | { kind: 'claude' };

// 1-5 todos per § 2.5
export function synthesizeTodos(node: Node, stageIdx: number): { text: string; done: boolean }[];

// compact path trace for Claude expand-node request
export function buildPathTrace(
  lockedNodeIds: string[], nodesById: Record<string, Node>
): PathTraceItem[];
```

Pure functions. Unit-testable. No React, DOM, or network.

## 7. Claude Prompt & Fallback Changes

### 7.1 System prompt (`lib/claude.ts`)

```
<role>
  You are Pathway, an academic roadmap mentor at UCLA who knows the specific programs,
  clubs, research groups, fellowships, and faculty. You do not invent programs; you
  ground every suggestion in named UCLA institutions. Every node MUST produce at least
  one citation with a real URL.
</role>

<student_context>
  year: {year}
  major_category: {major_category}
  hours_per_week: {hours_per_week}
  first_gen: {first_gen}
  aid_status: {aid_status}
  mode: {mode}
  interests: {interests.join(', ')}
  end_goal: {end_goal || "(undeclared)"}
</student_context>

<stage>
  current: {stage_key} ({N} of 5)
  previous locks: {path_trace.map(p=>p.title).join(' → ') || 'none'}
  parent_path_tag: {parent_path_tag || 'none (first stage)'}
</stage>

<stage_guidance key="direction">
  Generate 3 starting-direction declarations. Each is a concrete major, track, or
  declaration choice (e.g., "Declare CS · AI/ML lean", "Stay undeclared, explore").
  If mode === 'discovery', include one deliberately contrasting option to widen the
  student's field of view.
  Each node MUST carry: eyebrow="Direction"; path_tag (lowercase kebab/snake, 2-24 chars,
  examples: 'ai', 'build', 'explore'); 1-3 cites (UCLA department, School site, catalog).
</stage_guidance>

<stage_guidance key="community">
  Generate 3 club/org/program options that naturally extend parent_path_tag. Examples:
  ACM AI, Bruin Sports Analytics, Creative Labs, AAP cohort, first-gen peer group.
  eyebrow="Community". path_tag follows convention '<parent_tag>-<community-slug>'
  (lowercase kebab/snake, 2-24 chars). Prefer orgs with active GMs and onboarding within a month.
</stage_guidance>

<stage_guidance key="signal">
  Generate 3 credential-building options aligned to parent_path_tag: research
  (URFP, lab TA), competitions (HOTH, Datafest, CTFs), applied portfolios
  (Hack on the Hill shipment, Creative Labs release). eyebrow="Signal".
  Include realistic application windows and effort.
</stage_guidance>

<stage_guidance key="summer">
  Generate 3 sophomore-summer choices aligned to parent_path_tag: funded research
  (SURP, SRP, URSP, REU), industry internship, self-directed project. Include
  application deadlines (fall through winter windows). eyebrow="Summer".
</stage_guidance>

<stage_guidance key="capstone">
  Generate 3 year-2 capstones aligned to parent_path_tag: URSP thesis, conference
  paper target, student org founding, specific course sequences (CS 174A, CS M148).
  eyebrow="Capstone".
</stage_guidance>

<output_schema>
{
  "children": [
    {
      "id": "<unique-string>",
      "parent_id": "{parent_id}",
      "stage_key": "{stage_key}",
      "eyebrow": "<from STAGE_EYEBROW>",
      "title": "<<=80 chars>",
      "description": "<<=400 chars>",
      "why_this": "<<=300 chars>",
      "why_now": "<<=200 chars>",
      "todos": [{"text": "<<=120 chars>", "done": false}],
      "source_url": "<https://...>",
      "human_contact": {"name":"","role":"","email_or_office":"","url":"https://..."} | null,
      "outreach_email_draft": {"subject":"<<=60>", "body":"<<=1200>"} | null,
      "estimated_time_cost": "<e.g. 2 hrs · admin>",
      "path_tag": "<lowercase kebab/snake, 2-15 chars>",
      "cites": [
        {"label":"<source name>","summary":"<what's there>","url":"<https://...>"}
      ],
      "leads_to_tags": [],
      "opportunity_id": null
    }
  ]
}
```

Exactly 3 children per stage. Request uses prompt caching on the stage_guidance and output_schema blocks (static).

### 7.2 Fallback (`lib/fallback.ts`)

Reads `data/ucla/stage_fallbacks.json` — per-stage-key arrays of 3 well-formed `Node` templates (eyebrow, path_tag, 1 cite, 2 todos, realistic UCLA-grounded titles). Synthesized children fill in `id`, `parent_id` dynamically. Used on any of: Claude timeout, non-JSON response, schema validation failure, zero valid children after filter.

### 7.3 Filter (`lib/filter.ts`)

Adds:
- Drop nodes where `stage_key !== request.stage_key`.
- Drop nodes whose cites contain any non-URL `url` value.
- If fewer than 3 children remain after filtering, return `{ok: false, error: 'zero_candidates'}` to trigger fallback.

## 8. Animations

| Event | Mechanism | Timing |
|---|---|---|
| Sticky drop | `.sticky--dropping` CSS class set when `justLockedStageIdx === i` | 450ms drop + 80ms wobble |
| Sticky write-on | `@property --write` mask reveal via `sticky-write` keyframes | 400ms, delay 730ms |
| Sticky sign-on | opacity tween via `sticky-sign` keyframes | 220ms, delay 980ms |
| Choices card appear | `choices-in` keyframes | 300ms |
| Panel slide-in | `panel-in` keyframes | 300ms |
| SVG draw-on | `stroke-dasharray: 800; stroke-dashoffset 800→0` staggered by `nth-child` | 500ms base |
| Flag clear | `setTimeout(() => set({justLockedStageIdx: null}), 1400)` inside `lockIn` | — |
| Reduced-motion | `@media (prefers-reduced-motion: reduce)` collapses sticky to 280ms fade, disables write/sign keyframes | — |

All animations are CSS-driven. No JS animation library. Clearing `justLockedStageIdx` does not cancel an in-progress CSS animation; it only ensures subsequent renders don't re-apply the class.

## 9. Error & Fallback Handling

| Failure | Response |
|---|---|
| `/api/expand-node` 5xx or timeout (abort via `lib/deadline.ts`) | `lib/fallback.ts` stage-aware synth; `<MissBannerInline>` above the open prompt explains "using backup data". |
| Malformed Claude JSON | same as above |
| Zero valid children after filter (`dropped_count === candidates.length`) | Trigger fallback; log `dropped_count` into `humility`. |
| `rough.js` import failure | `<RoughRect>` catches, renders plain `<rect>`. One `console.warn`. |
| `perfect-freehand` import failure | `lib/freehand.ts` primitives return static pre-computed path strings (no jitter). |
| Font load failure | CSS fallback stack: `"Kalam","Segoe Print","Comic Sans MS",cursive` / `"Caveat","Brush Script MT",cursive`. |
| localStorage unavailable / quota | existing `createJSONStorage` guard; store works in-memory. |
| Component unmount mid-flight | `abortExpand(stageIdx)` called in `useEffect` cleanup. |
| Stale Claude response (`requestId` mismatch) | `acceptChildren` returns false; no state change. |

## 10. Testing

```
tests/notebook-engine.test.ts
  - stage-1 seed filter: STEM+discovery returns 4 seeds; humanities+directed returns <3 → kind='claude'
  - rotationFor determinism: same key → same value; different keys span [-amp, +amp]
  - seedFor determinism: same key → same integer
  - composeRootSub: freshman+first_gen+stem+ai-ml → "You · Freshman · First-gen · CS + AI/ML curious"
  - synthesizeTodos: stageIdx 0-4 each → correct last-item text; respects max 5
  - buildPathTrace: length === lockedNodeIds.length; preserves title + opportunity_id

tests/pathway-store.test.ts   [REWRITE]
  - lockIn truncates downstream locks (lock at idx 2 when length is 4 → length becomes 3)
  - reopen wipes downstream destructively (reopen idx 1 from length 4 → length becomes 1)
  - previewNodeId pre-selects previously-locked node on reopen
  - justLockedStageIdx set by lockIn, cleared by timer (fake-timer test)
  - abortExpand aborts in-flight controller and clears map entry
  - acceptChildren rejects stale requestId; accepts matching
  - startExpand at existing stageIdx aborts prior flight

tests/schemas.test.ts         [UPDATE]
  - CiteSchema: accepts valid; rejects non-URL; rejects cites.length > 3
  - NodeSchema: requires stage_key, eyebrow, path_tag; accepts empty cites
  - ExpandRequestSchema: requires stage_key; parent_path_tag nullable
  - path_tag regex rejects uppercase/spaces

tests/expand-node.test.ts     [UPDATE]
  - 400 when stage_key missing
  - 200 returns nodes with matching stage_key
  - fallback path taken on Claude throw (spy on claude.ts)
  - filter drops wrong stage_key + invalid-URL cites

tests/fallback.test.ts        [UPDATE]
  - each stage_key → exactly 3 synth children
  - each synth child has correct eyebrow, valid path_tag, >=1 cite, <=5 todos
  - synth children valid per NodeSchema

tests/freehand.test.ts        [NEW]
  - seededRng: same seed → same first 100 values (byte-for-byte)
  - freehandCheck: returns non-empty path-d string
  - freehandUnderline: x values monotonically non-decreasing
  - freehandArrow: path contains M..L..L.. with >=3 segments

tests/filter.test.ts          [UPDATE]
  - rejects node with stage_key !== request.stage_key
  - rejects node with malformed cite URL
  - preserves node with zero cites (allowed by schema)
```

Not unit-tested: CSS visuals, rough.js output quality, animation timing. Covered by manual QA rehearsal.

## 11. Tier Ordering

Incremental delivery. Each tier is independently demoable.

| Tier | Scope | Ship state |
|---|---|---|
| **A — backend + schema** | Schema additions (`CiteSchema`, `stage_key`, `path_tag`, `eyebrow`). `ExpandRequest` extension. `/api/expand-node` accepts stage_key. Stage-aware `lib/claude.ts`. Stage-aware `lib/fallback.ts` + `stage_fallbacks.json`. Chain-model `store/pathway.ts`. `lib/notebook-engine.ts`. `lib/freehand.ts`. All tests green. **No UI changes.** | Tree UI still present; backend fully speaks new contract. |
| **B — notebook skeleton** | Replace `/pathway` with `<Notebook/>`: chrome, split, timeline rows, locked/prompt/choices states — **plain rectangles, no rough.js**. Wire all events to store. Panel renders meta + cites + body + actions. Delete `components/tree/*`. Update `app/layout.tsx` fonts. | Notebook is functional and ugly. |
| **C — aesthetic** | `components/notebook/rough/*`. `notebook.module.css` paper-bg, sticky, animations. Wire rough.js shapes into nodes/prompts/choices/panel. | Demo-ready. |
| **D — polish** | Marginalia red-pen labels. Root arrow + underline. Empty-panel hint arrow. Highlighter on choice hover. Draw-on stagger. Memo of seeded SVG paths by nodeId (performance). Reduced-motion tested. Keyboard navigation + ARIA. | Polished. |

If Tier C runs long, ship B to main and iterate. Tier D is skippable for an MVP demo.

## 12. Out of Scope (explicit)

- Onboarding v2 — pivot signal, transfer-student branch, horizons slider, community opt-in, adaptive skip-logic. Deferred to a follow-up spec queued after this one.
- Resume / LinkedIn import and structured extraction.
- Expanding `first_layer_seeds.json` beyond current STEM-only coverage. Non-STEM relies on the Claude fallback.
- Mobile / tablet / narrow-viewport layouts.
- Multi-user auth, server-side state, or shared notebooks.
- PDF or image export of the notebook.
- Full screen-reader narrative audit (buttons + reduced-motion only).
- Persisting `inFlight` across reloads (intentional — aborted on unmount).
- Behavioral divergence based on `profile.mode`. This spec renders `mode` in the chrome badge only; the sole effect on the Claude output is the `<stage_guidance key="direction">` "include one contrasting option" hint when mode === 'discovery'. Full discovery-mode branching (ghosted alternative branches, per-node path-philosophy text) stays deferred to a later spec.

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stage-aware Claude prompt produces low-quality non-CS options | Fallback JSON is per-stage with curated UCLA examples; filter strictness drops bad candidates; manual prompt iteration during Tier A. |
| rough.js renders jittery across re-renders | Seeded RNG keyed by stable node ID + element role; cache SVG paths in Tier D. |
| Animation stacking on rapid lock clicks | `justLockedStageIdx` overwritten atomically; prior timer continues but class is re-applied idempotently. |
| Chain model data loss on accidental reopen | Matches HTML design intent. Add subtle red-pen "reopen" marginalia on hover in Tier D; possible undo toast is out-of-scope. |
| Non-STEM seed coverage gap | Claude fallback on stage 1 when seeds < 3; track in follow-up. |
| Font load blocks first paint | `next/font` provides fallback with size-adjust; use `display: swap`. |
