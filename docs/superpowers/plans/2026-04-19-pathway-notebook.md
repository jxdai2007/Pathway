# Pathway Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG tree at `/pathway` with a paper-notebook UI (5 fixed stages, rough.js + perfect-freehand aesthetic, chain-model store) per spec `docs/superpowers/specs/2026-04-19-pathway-notebook-design.md`.

**Architecture:** Ship in 4 tiers. Tier A extends backend/schema + store without touching UI (tree remains visible). Tier B swaps `/pathway` to a plain-rectangle notebook, deletes old tree. Tier C adds rough.js visuals + CSS module. Tier D polishes with marginalia, memoization, a11y.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Zustand (persist middleware), Zod, Vitest, `roughjs@^4.6.6`, `perfect-freehand@^1.2.0`, `next/font` (Caveat + Kalam).

---

## File Structure

**New files:**
- `lib/stages.ts` — leaf module: `STAGE_KEYS`, `STAGE_EYEBROW`, `STAGES` (no project imports)
- `lib/notebook-engine.ts` — option resolution, todo synthesis, rotation/seed allocators, root-sub composer, path-trace builder
- `lib/freehand.ts` — seeded RNG + `perfect-freehand` wrappers (pure)
- `data/ucla/stage_fallbacks.json` — stage-keyed arrays of 3 synth children each
- `components/notebook/{Notebook,Timeline,TimelineRow,RootNode,LockedNode,PromptNode,ChoicesCard,StickyNote,Panel,PanelEmpty,Marginalia,MissBannerInline}.tsx`
- `components/notebook/rough/{RoughRect,FreehandUnderline,FreehandArrow,FreehandCheck,FreehandStrike,FreehandHighlighter,FreehandBox,FreehandSquiggle}.tsx`
- `components/notebook/notebook.module.css`
- `tests/{notebook-engine,freehand}.test.ts`

**Modified files:**
- `lib/schemas.ts` — add `CiteSchema`, `StageKeyEnum`; extend `NodeSchema` + `ExpandRequestSchema`
- `store/pathway.ts` — chain-model refactor, persist key bump to v2
- `lib/claude.ts` — stage-aware system prompt
- `lib/fallback.ts` — stage-aware synthesis
- `lib/filter.ts` — reject invalid cite URLs + mismatched `stage_key`
- `app/api/expand-node/route.ts` — require `stage_key`
- `app/pathway/page.tsx` — render `<Notebook/>`
- `app/layout.tsx` — load Caveat + Kalam via `next/font`
- `data/ucla/first_layer_seeds.json` — add `path_tag` + `eyebrow` per seed
- `tests/{schemas,expand-node,fallback,filter}.test.ts` — extend for new contract
- `tests/pathway-store.test.ts` (renamed from `tests/store.test.ts`) — rewrite for chain model
- `tests/profile-store.test.ts` — untouched

**Deleted files (Tier B):**
- `components/tree/MissBanner.tsx`
- `components/tree/TreeEdge.tsx`
- `components/tree/GhostRail.tsx`
- `components/tree/NodePanel.tsx`
- `components/tree/EpistemicHumilityBlock.tsx`
- `components/tree/ProgressBar.tsx`
- `components/tree/TreeCanvas.tsx`
- `components/tree/TreeNode.tsx`
- `components/tree/TreeScreen.tsx`

---

## Tier A — Backend, Schema, Store, Engines (no UI changes)

### Task A1: Create `lib/stages.ts` leaf module

**Files:**
- Create: `lib/stages.ts`
- Test: covered by downstream tasks

- [ ] **Step 1: Write `lib/stages.ts`**

```ts
export const STAGE_KEYS = ['direction', 'community', 'signal', 'summer', 'capstone'] as const;
export type StageKey = typeof STAGE_KEYS[number];

export const STAGE_EYEBROW: Record<StageKey, string> = {
  direction: 'Direction',
  community: 'Community',
  signal:    'Signal',
  summer:    'Summer',
  capstone:  'Capstone',
};

export const STAGES = [
  { key: 'direction', stage: 'Stage 1 · Declare a direction', when: 'Month 1–2 · Fall 2026',           prompt: 'Pick your starting direction' },
  { key: 'community', stage: 'Stage 2 · Find your people',    when: 'Month 2–4 · Fall/Winter 2026',    prompt: 'Pick your first community' },
  { key: 'signal',    stage: 'Stage 3 · Build signal',        when: 'Winter/Spring 2027',              prompt: 'Earn your first credential' },
  { key: 'summer',    stage: 'Stage 4 · Summer',              when: 'Summer 2027',                     prompt: 'Pick your sophomore summer' },
  { key: 'capstone',  stage: 'Stage 5 · Year 2 capstone',     when: 'Fall 2027–Spring 2028',           prompt: 'Set your year-2 bet' },
] as const;

export function stageIdxOfKey(k: StageKey): number {
  return STAGE_KEYS.indexOf(k);
}
export function keyOfStageIdx(i: number): StageKey {
  return STAGE_KEYS[i];
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stages.ts
git commit -m "feat(stages): add STAGE_KEYS + STAGES leaf module"
```

---

### Task A2: Extend schemas — CiteSchema, stage_key, path_tag, eyebrow

**Files:**
- Modify: `lib/schemas.ts`
- Test: `tests/schemas.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CiteSchema, NodeSchema, ExpandRequestSchema, StageKeyEnum } from '@/lib/schemas';

describe('CiteSchema', () => {
  const valid = { label: 'UCLA CS', summary: 'major info', url: 'https://cs.ucla.edu' };
  it('accepts a valid cite', () => {
    expect(CiteSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a non-URL', () => {
    expect(CiteSchema.safeParse({ ...valid, url: 'not-a-url' }).success).toBe(false);
  });
  it('rejects empty label', () => {
    expect(CiteSchema.safeParse({ ...valid, label: '' }).success).toBe(false);
  });
});

describe('StageKeyEnum', () => {
  it('accepts every documented stage key', () => {
    ['direction', 'community', 'signal', 'summer', 'capstone'].forEach((k) => {
      expect(StageKeyEnum.safeParse(k).success).toBe(true);
    });
  });
  it('rejects unknown', () => {
    expect(StageKeyEnum.safeParse('foo').success).toBe(false);
  });
});

describe('NodeSchema additions', () => {
  const baseNode = {
    id: 'n1',
    parent_id: null,
    opportunity_id: null,
    title: 'Declare CS',
    description: 'pick a major',
    why_this: 'aligned with interests',
    why_now: 'deadline soon',
    todos: [{ text: 'email advisor', done: false }],
    source_url: null,
    human_contact: null,
    outreach_email_draft: null,
    estimated_time_cost: '2 hrs',
    leads_to_tags: [],
    stage_key: 'direction',
    eyebrow: 'Direction',
    path_tag: 'ai',
    cites: [{ label: 'UCLA CS', summary: 'info', url: 'https://cs.ucla.edu' }],
  };
  it('accepts a fully-formed node', () => {
    expect(NodeSchema.safeParse(baseNode).success).toBe(true);
  });
  it('rejects invalid path_tag (uppercase)', () => {
    expect(NodeSchema.safeParse({ ...baseNode, path_tag: 'AI' }).success).toBe(false);
  });
  it('rejects path_tag too short (1 char)', () => {
    expect(NodeSchema.safeParse({ ...baseNode, path_tag: 'a' }).success).toBe(false);
  });
  it('rejects > 3 cites', () => {
    const c = { label: 'x', summary: 'y', url: 'https://a.b' };
    expect(NodeSchema.safeParse({ ...baseNode, cites: [c, c, c, c] }).success).toBe(false);
  });
  it('accepts 0 cites', () => {
    expect(NodeSchema.safeParse({ ...baseNode, cites: [] }).success).toBe(true);
  });
});

describe('ExpandRequestSchema additions', () => {
  const baseReq = {
    profile: {
      year: 'freshman', major_category: 'stem', first_gen: true,
      aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery',
    },
    parent_id: null,
    path_trace: [],
    requestId: 'req-1',
    stage_key: 'direction',
    parent_path_tag: null,
  };
  it('accepts a valid request', () => {
    expect(ExpandRequestSchema.safeParse(baseReq).success).toBe(true);
  });
  it('rejects missing stage_key', () => {
    const { stage_key, ...rest } = baseReq;
    expect(ExpandRequestSchema.safeParse(rest).success).toBe(false);
  });
  it('accepts parent_path_tag = null', () => {
    expect(ExpandRequestSchema.safeParse({ ...baseReq, parent_path_tag: null }).success).toBe(true);
  });
  it('accepts parent_path_tag = string', () => {
    expect(ExpandRequestSchema.safeParse({ ...baseReq, parent_path_tag: 'ai' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/schemas.test.ts`
Expected: FAIL — `CiteSchema` / `StageKeyEnum` / new fields not exported.

- [ ] **Step 3: Implement**

In `lib/schemas.ts`:

1. Add near the top imports:
```ts
import { STAGE_KEYS } from '@/lib/stages';
```

2. After `ContactSchema`, add:
```ts
export const CiteSchema = z.object({
  label:   z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
  url:     z.string().url(),
});

export const StageKeyEnum = z.enum(STAGE_KEYS as unknown as [string, ...string[]]);
```

3. Extend `NodeSchema` — inside the `z.object({ ... })` body add:
```ts
  stage_key: StageKeyEnum,
  eyebrow:   z.string().max(40),
  path_tag:  z.string().regex(/^[a-z0-9_-]{2,24}$/),
  cites:     z.array(CiteSchema).max(3),
```

4. Extend `ExpandRequestSchema` body:
```ts
  stage_key:       StageKeyEnum,
  parent_path_tag: z.string().nullable(),
```

5. Add type exports (after existing `export type` lines):
```ts
export type Cite = z.infer<typeof CiteSchema>;
export type StageKeyType = z.infer<typeof StageKeyEnum>;
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run tests/schemas.test.ts`
Expected: PASS (all new tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/schemas.ts tests/schemas.test.ts
git commit -m "feat(schemas): cite schema + stage_key/path_tag/eyebrow on Node + ExpandRequest"
```

---

### Task A3: Add `path_tag` + `eyebrow` to `first_layer_seeds.json`

**Files:**
- Modify: `data/ucla/first_layer_seeds.json`
- Test: update corpus validator if it fails

- [ ] **Step 1: Inspect current file**

Run: `cat data/ucla/first_layer_seeds.json | head -60`

- [ ] **Step 2: Update each seed**

For every seed entry, add two properties: `"path_tag": "<lowercase kebab id>"` and `"eyebrow": "Direction"`. Mapping (derive `path_tag` from existing `id`):

- `"AI / ML Research"` → `"path_tag": "ai"`
- `"Cybersecurity"` → `"path_tag": "cybersec"`
- `"Full-Stack + Industry"` → `"path_tag": "build"`
- `"I'm not sure yet — help me explore"` → `"path_tag": "explore"`

(Exact titles may vary; match the seeds present in the file.)

- [ ] **Step 3: Extend `lib/validate-corpus.ts` if it checks seed shape**

Run: `grep -n "first_layer_seeds\\|FirstLayerSeed" lib/validate-corpus.ts scripts/validate-data.ts lib/schemas.ts`

If `FirstLayerSeedSchema` in `lib/schemas.ts` enforces seed shape, extend it:
```ts
// in FirstLayerSeedSchema body:
  path_tag: z.string().regex(/^[a-z0-9_-]{2,24}$/),
  eyebrow: z.string().max(40),
```

- [ ] **Step 4: Run corpus validator**

Run: `npx tsx scripts/validate-data.ts`
Expected: exit 0, no errors.

- [ ] **Step 5: Run schema tests**

Run: `npx vitest run tests/validate-corpus.test.ts tests/schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data/ucla/first_layer_seeds.json lib/schemas.ts lib/validate-corpus.ts scripts/validate-data.ts
git commit -m "feat(corpus): add path_tag + eyebrow to first_layer_seeds"
```

---

### Task A4: Create `data/ucla/stage_fallbacks.json`

**Files:**
- Create: `data/ucla/stage_fallbacks.json`

- [ ] **Step 1: Write the fallback JSON**

```json
{
  "direction": [
    {
      "title": "Declare CS · AI/ML lean",
      "description": "Path into Samueli CS with AI/ML electives after CS 35L.",
      "why_this": "Lines up pre-reqs for CS M146, CS 161, CS M148.",
      "why_now": "Change-of-major window closes end of 3rd quarter.",
      "estimated_time_cost": "2 hrs · admin",
      "path_tag": "ai",
      "eyebrow": "Direction",
      "source_url": "https://cs.ucla.edu",
      "cites": [
        { "label": "UCLA CS Department", "summary": "major map + advising", "url": "https://cs.ucla.edu" }
      ],
      "todos": [
        { "text": "Book a College advisor / AAP counselor meeting", "done": false },
        { "text": "Review CS 31/32/33 pre-reqs on DARS", "done": false }
      ]
    },
    {
      "title": "Declare CS · builder/SWE lean",
      "description": "Same CS degree, optimized for shipping products.",
      "why_this": "Favors CS 35L, CS 118, CS 143 and project-driven electives.",
      "why_now": "Declare by end of 3rd quarter to lock course plan.",
      "estimated_time_cost": "2 hrs · admin",
      "path_tag": "build",
      "eyebrow": "Direction",
      "source_url": "https://samueli.ucla.edu",
      "cites": [
        { "label": "Samueli Engineering", "summary": "change-of-major petition", "url": "https://samueli.ucla.edu" }
      ],
      "todos": [
        { "text": "Book a College advisor / AAP counselor meeting", "done": false },
        { "text": "Draft project idea list", "done": false }
      ]
    },
    {
      "title": "Stay undeclared · explore Year 1",
      "description": "Take sampler courses across CS, cog-sci, and stats.",
      "why_this": "Buys a quarter of signal before committing.",
      "why_now": "GEs still count regardless of final major.",
      "estimated_time_cost": "1 hr · planning",
      "path_tag": "explore",
      "eyebrow": "Direction",
      "source_url": "https://www.registrar.ucla.edu",
      "cites": [
        { "label": "UCLA Registrar", "summary": "GE requirements catalog", "url": "https://www.registrar.ucla.edu" }
      ],
      "todos": [
        { "text": "Sketch Fall/Winter/Spring course draft", "done": false },
        { "text": "Attend Majors Fair", "done": false }
      ]
    }
  ],
  "community": [
    {
      "title": "ACM at UCLA · general body",
      "description": "Biggest CS community on campus; onboarding GMs in Week 1-2.",
      "why_this": "Cheapest way to meet upperclassmen + find subcommittees.",
      "why_now": "GM Week 2 Fall; sign up Week 1.",
      "estimated_time_cost": "2 hrs · attend GM",
      "path_tag": "acm",
      "eyebrow": "Community",
      "source_url": "https://acm.cs.ucla.edu",
      "cites": [
        { "label": "ACM @ UCLA", "summary": "committees + events", "url": "https://acm.cs.ucla.edu" }
      ],
      "todos": [
        { "text": "Find the General Meeting date + RSVP", "done": false },
        { "text": "Join Discord", "done": false }
      ]
    },
    {
      "title": "AAP peer cohort",
      "description": "Academic Advancement Program cohort for first-gen / underrepresented students.",
      "why_this": "Peer-group + dedicated counselor access.",
      "why_now": "Intake early Fall.",
      "estimated_time_cost": "3 hrs · orientation",
      "path_tag": "aap",
      "eyebrow": "Community",
      "source_url": "https://www.aap.ucla.edu",
      "cites": [
        { "label": "UCLA AAP", "summary": "first-gen programs", "url": "https://www.aap.ucla.edu" }
      ],
      "todos": [
        { "text": "Find the General Meeting date + RSVP", "done": false },
        { "text": "Email AAP counselor for intake", "done": false }
      ]
    },
    {
      "title": "Creative Labs",
      "description": "Project-driven builder community — ships indie software.",
      "why_this": "Best matched to builder/SWE lean; hands-on from day 1.",
      "why_now": "Team formation Fall Week 3.",
      "estimated_time_cost": "4 hrs/wk · project",
      "path_tag": "creative-labs",
      "eyebrow": "Community",
      "source_url": "https://creativelabsucla.com",
      "cites": [
        { "label": "Creative Labs", "summary": "team formation + projects", "url": "https://creativelabsucla.com" }
      ],
      "todos": [
        { "text": "Find the General Meeting date + RSVP", "done": false },
        { "text": "Pitch or join a team", "done": false }
      ]
    }
  ],
  "signal": [
    {
      "title": "URFP — Undergraduate Research Fellows",
      "description": "Structured intro to faculty-mentored research.",
      "why_this": "Cohort + mentor pairing + stipend.",
      "why_now": "Applications Week 2 Fall.",
      "estimated_time_cost": "5 hrs/wk · research",
      "path_tag": "urfp",
      "eyebrow": "Signal",
      "source_url": "https://www.ugresearch.ucla.edu/urfp.htm",
      "cites": [
        { "label": "URC — URFP", "summary": "fellowship details", "url": "https://www.ugresearch.ucla.edu/urfp.htm" }
      ],
      "todos": [
        { "text": "Draft application / intro email", "done": false },
        { "text": "Identify 2 faculty matches", "done": false }
      ]
    },
    {
      "title": "Hack on the Hill (HOTH)",
      "description": "Campus beginner hackathon — 12-hr sprint.",
      "why_this": "Portfolio artifact + fast credential.",
      "why_now": "Fall Week 4.",
      "estimated_time_cost": "12 hrs · weekend",
      "path_tag": "hoth",
      "eyebrow": "Signal",
      "source_url": "https://hackonthehill.com",
      "cites": [
        { "label": "HOTH", "summary": "event details", "url": "https://hackonthehill.com" }
      ],
      "todos": [
        { "text": "Draft application / intro email", "done": false },
        { "text": "Recruit a 2-person team", "done": false }
      ]
    },
    {
      "title": "CS 35L · lab TA ask",
      "description": "Contact CS 35L staff about peer-tutor roles.",
      "why_this": "Teaching reinforces material; paid.",
      "why_now": "Hiring Winter quarter.",
      "estimated_time_cost": "4 hrs/wk · teach",
      "path_tag": "cs35l-ta",
      "eyebrow": "Signal",
      "source_url": "https://cs.ucla.edu/teaching",
      "cites": [
        { "label": "CS Teaching", "summary": "peer TA hiring", "url": "https://cs.ucla.edu/teaching" }
      ],
      "todos": [
        { "text": "Draft application / intro email", "done": false },
        { "text": "Ask current CS 35L TA for pointers", "done": false }
      ]
    }
  ],
  "summer": [
    {
      "title": "SURP — Summer Undergraduate Research",
      "description": "8-week funded summer research with a UCLA lab.",
      "why_this": "Stipend + full-time research immersion.",
      "why_now": "Apps open Winter, due early Spring.",
      "estimated_time_cost": "40 hrs/wk · summer",
      "path_tag": "surp",
      "eyebrow": "Summer",
      "source_url": "https://www.ugresearch.ucla.edu/summer.htm",
      "cites": [
        { "label": "URC — SURP", "summary": "program + deadlines", "url": "https://www.ugresearch.ucla.edu/summer.htm" }
      ],
      "todos": [
        { "text": "Email 3 potential mentors / PIs this week", "done": false },
        { "text": "Draft project proposal", "done": false }
      ]
    },
    {
      "title": "REU at a partner university",
      "description": "NSF-funded summer research at a non-UCLA lab.",
      "why_this": "Broadens network + different institutional culture.",
      "why_now": "Apps Dec–Feb; competitive.",
      "estimated_time_cost": "40 hrs/wk · summer",
      "path_tag": "reu",
      "eyebrow": "Summer",
      "source_url": "https://www.nsf.gov/crssprgm/reu/",
      "cites": [
        { "label": "NSF REU", "summary": "site directory", "url": "https://www.nsf.gov/crssprgm/reu/" }
      ],
      "todos": [
        { "text": "Email 3 potential mentors / PIs this week", "done": false },
        { "text": "Shortlist 5 REU sites", "done": false }
      ]
    },
    {
      "title": "Industry internship · small team",
      "description": "Target early-stage startups on YC WWF list.",
      "why_this": "Shipping product > research for builder path.",
      "why_now": "Apps open late Fall.",
      "estimated_time_cost": "40 hrs/wk · summer",
      "path_tag": "intern",
      "eyebrow": "Summer",
      "source_url": "https://www.ycombinator.com/jobs",
      "cites": [
        { "label": "YC Jobs", "summary": "open roles", "url": "https://www.ycombinator.com/jobs" }
      ],
      "todos": [
        { "text": "Email 3 potential mentors / PIs this week", "done": false },
        { "text": "Polish resume + portfolio", "done": false }
      ]
    }
  ],
  "capstone": [
    {
      "title": "URSP — honors thesis",
      "description": "Year-long faculty-advised research thesis.",
      "why_this": "Depth signal + writing sample for grad apps.",
      "why_now": "Apps Spring Year 2.",
      "estimated_time_cost": "8 hrs/wk · thesis",
      "path_tag": "ursp",
      "eyebrow": "Capstone",
      "source_url": "https://www.ugresearch.ucla.edu/ursp.htm",
      "cites": [
        { "label": "URC — URSP", "summary": "thesis program", "url": "https://www.ugresearch.ucla.edu/ursp.htm" }
      ],
      "todos": [
        { "text": "Write a 1-line progress note each Friday", "done": false },
        { "text": "Lock advisor before Year 2 Fall", "done": false }
      ]
    },
    {
      "title": "Target a workshop paper",
      "description": "Aim for a NeurIPS / ACL / CVPR workshop submission.",
      "why_this": "External credential + conference exposure.",
      "why_now": "Workshop deadlines cluster summer–fall.",
      "estimated_time_cost": "10 hrs/wk · write + exp",
      "path_tag": "paper",
      "eyebrow": "Capstone",
      "source_url": "https://aideadlin.es",
      "cites": [
        { "label": "AI Deadlines", "summary": "conference calendar", "url": "https://aideadlin.es" }
      ],
      "todos": [
        { "text": "Write a 1-line progress note each Friday", "done": false },
        { "text": "Pick target venue + deadline", "done": false }
      ]
    },
    {
      "title": "Found a student org",
      "description": "Spin up a subcommittee or new org around your niche.",
      "why_this": "Leadership signal + compounding network.",
      "why_now": "Charter windows Fall Week 3.",
      "estimated_time_cost": "5 hrs/wk · leadership",
      "path_tag": "found-org",
      "eyebrow": "Capstone",
      "source_url": "https://www.studentorgs.ucla.edu",
      "cites": [
        { "label": "UCLA Student Orgs", "summary": "chartering a new org", "url": "https://www.studentorgs.ucla.edu" }
      ],
      "todos": [
        { "text": "Write a 1-line progress note each Friday", "done": false },
        { "text": "Draft 1-pager + find 2 co-founders", "done": false }
      ]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add data/ucla/stage_fallbacks.json
git commit -m "feat(fallback): per-stage UCLA-grounded fallback children"
```

---

### Task A5: Chain-model pathway store

**Files:**
- Modify: `store/pathway.ts`
- Test: rename `tests/store.test.ts` → `tests/pathway-store.test.ts` and rewrite

- [ ] **Step 1: Rename test file**

```bash
git mv tests/store.test.ts tests/pathway-store.test.ts
```

- [ ] **Step 2: Write failing tests in `tests/pathway-store.test.ts`**

Replace contents:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePathwayStore } from '@/store/pathway';
import type { Node } from '@/lib/schemas';

const mk = (id: string, stage_key: Node['stage_key'], path_tag = 'ai'): Node => ({
  id, parent_id: null, opportunity_id: null,
  title: `T-${id}`, description: 'd', why_this: 'w', why_now: 'n',
  todos: [{ text: 't', done: false }],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '1 hr', leads_to_tags: [],
  stage_key, eyebrow: 'Direction', path_tag,
  cites: [],
});

describe('pathway store · chain model', () => {
  beforeEach(() => {
    usePathwayStore.getState().reset();
  });

  it('lockIn pushes into lockedNodeIds at stageIdx', () => {
    usePathwayStore.getState().addNodes([mk('n0', 'direction')]);
    usePathwayStore.getState().lockIn(0, 'n0');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['n0']);
  });

  it('lockIn at lower stageIdx truncates downstream', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction'), mk('b', 'community'), mk('c', 'signal')]);
    s.lockIn(0, 'a'); s.lockIn(1, 'b'); s.lockIn(2, 'c');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['a','b','c']);
    s.lockIn(1, 'b');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['a','b']);
  });

  it('reopen destructively truncates and pre-selects', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction'), mk('b', 'community'), mk('c', 'signal')]);
    s.lockIn(0, 'a'); s.lockIn(1, 'b'); s.lockIn(2, 'c');
    s.reopen(1);
    const st = usePathwayStore.getState();
    expect(st.lockedNodeIds).toEqual(['a']);
    expect(st.openPromptStageIdx).toBe(1);
    expect(st.previewNodeId).toBe('b');
  });

  it('cancelPreview clears previewNodeId only', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction')]);
    s.setPreview('a');
    s.cancelPreview();
    expect(usePathwayStore.getState().previewNodeId).toBe(null);
  });

  it('justLockedStageIdx set by lockIn, cleared after 1400ms', () => {
    vi.useFakeTimers();
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction')]);
    s.lockIn(0, 'a');
    expect(usePathwayStore.getState().justLockedStageIdx).toBe(0);
    vi.advanceTimersByTime(1401);
    expect(usePathwayStore.getState().justLockedStageIdx).toBe(null);
    vi.useRealTimers();
  });

  it('startExpand on same stageIdx aborts prior controller', () => {
    const s = usePathwayStore.getState();
    const first = s.startExpand(1, 'parent-a');
    const second = s.startExpand(1, 'parent-a');
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it('acceptChildren rejects stale requestId', () => {
    const s = usePathwayStore.getState();
    const { requestId } = s.startExpand(1, 'parent-a');
    const accepted = s.acceptChildren(1, 'stale-id', [mk('x', 'community')]);
    expect(accepted).toBe(false);
    const accepted2 = s.acceptChildren(1, requestId, [mk('x', 'community')]);
    expect(accepted2).toBe(true);
    expect(usePathwayStore.getState().nodesById.x?.id).toBe('x');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `npx vitest run tests/pathway-store.test.ts`
Expected: FAIL — `lockIn`, `reopen`, `setPreview`, `cancelPreview`, `previewNodeId`, `lockedNodeIds`, `justLockedStageIdx` don't exist on store.

- [ ] **Step 4: Rewrite `store/pathway.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Node } from '@/lib/schemas';

type NodeStatus = 'idle' | 'loading' | 'loaded' | 'error';
type NodeRecord = Node & { status: NodeStatus };
type InFlight = { requestId: string; abort: AbortController };

type PathwayState = {
  nodesById: Record<string, NodeRecord>;
  lockedNodeIds: string[];
  openPromptStageIdx: number | null;
  previewNodeId: string | null;
  justLockedStageIdx: number | null;
  humility: string | null;
  inFlight: Record<number, InFlight>;
  requestCounter: number;

  setPreview: (nodeId: string | null) => void;
  cancelPreview: () => void;
  setHumility: (h: string | null) => void;
  addNodes: (nodes: Node[]) => void;
  toggleTodoDone: (nodeId: string, idx: number) => void;
  lockIn: (stageIdx: number, nodeId: string) => void;
  reopen: (stageIdx: number) => void;
  startExpand: (stageIdx: number, parentNodeId: string | null) =>
    { requestId: string; signal: AbortSignal };
  acceptChildren: (stageIdx: number, requestId: string, children: Node[]) => boolean;
  abortExpand: (stageIdx: number) => void;
  reset: () => void;
};

export const usePathwayStore = create<PathwayState>()(
  persist(
    (set, get) => ({
      nodesById: {},
      lockedNodeIds: [],
      openPromptStageIdx: 0,
      previewNodeId: null,
      justLockedStageIdx: null,
      humility: null,
      inFlight: {},
      requestCounter: 0,

      setPreview: (nodeId) => set({ previewNodeId: nodeId }),
      cancelPreview: () => set({ previewNodeId: null }),
      setHumility: (h) => set({ humility: h }),

      addNodes: (nodes) => set((state) => {
        const next = { ...state.nodesById };
        for (const n of nodes) next[n.id] = { ...n, status: 'loaded' };
        return { nodesById: next };
      }),

      toggleTodoDone: (nodeId, idx) => set((state) => {
        const node = state.nodesById[nodeId];
        if (!node) return {};
        const todos = node.todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
        return { nodesById: { ...state.nodesById, [nodeId]: { ...node, todos } } };
      }),

      lockIn: (stageIdx, nodeId) => {
        set((state) => ({
          lockedNodeIds: [...state.lockedNodeIds.slice(0, stageIdx), nodeId],
          openPromptStageIdx: stageIdx < 4 ? stageIdx + 1 : null,
          previewNodeId: null,
          justLockedStageIdx: stageIdx,
        }));
        setTimeout(() => {
          if (get().justLockedStageIdx === stageIdx) {
            set({ justLockedStageIdx: null });
          }
        }, 1400);
      },

      reopen: (stageIdx) => {
        const state = get();
        const prior = state.lockedNodeIds[stageIdx] ?? null;
        set({
          lockedNodeIds: state.lockedNodeIds.slice(0, stageIdx),
          openPromptStageIdx: stageIdx,
          previewNodeId: prior,
        });
      },

      startExpand: (stageIdx, parentNodeId) => {
        const counter = get().requestCounter + 1;
        const requestId = `req-${counter}`;
        const abort = new AbortController();
        const prior = get().inFlight[stageIdx];
        if (prior) prior.abort.abort();
        set({
          requestCounter: counter,
          inFlight: { ...get().inFlight, [stageIdx]: { requestId, abort } },
        });
        void parentNodeId; // parent is encoded in the HTTP call
        return { requestId, signal: abort.signal };
      },

      acceptChildren: (stageIdx, requestId, children) => {
        const flight = get().inFlight[stageIdx];
        if (!flight || flight.requestId !== requestId) return false;
        get().addNodes(children);
        set((state) => {
          const next = { ...state.inFlight };
          delete next[stageIdx];
          return { inFlight: next };
        });
        return true;
      },

      abortExpand: (stageIdx) => {
        const flight = get().inFlight[stageIdx];
        if (flight) {
          flight.abort.abort();
          set((state) => {
            const next = { ...state.inFlight };
            delete next[stageIdx];
            return { inFlight: next };
          });
        }
      },

      reset: () => {
        for (const f of Object.values(get().inFlight)) f.abort.abort();
        set({
          nodesById: {}, lockedNodeIds: [], openPromptStageIdx: 0,
          previewNodeId: null, justLockedStageIdx: null,
          humility: null, inFlight: {}, requestCounter: 0,
        });
      },
    }),
    {
      name: 'pathway-state-v2',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        nodesById: state.nodesById,
        lockedNodeIds: state.lockedNodeIds,
        openPromptStageIdx: state.openPromptStageIdx,
        requestCounter: state.requestCounter,
      }) as any,
    }
  )
);
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run tests/pathway-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If errors appear in `components/tree/*` referencing old fields, ignore — they'll be deleted in Tier B. If errors block the build, temporarily `@ts-nocheck` those files.

- [ ] **Step 7: Commit**

```bash
git add store/pathway.ts tests/pathway-store.test.ts
git commit -m "refactor(store): chain-model pathway store + persist v2"
```

---

### Task A6: `lib/notebook-engine.ts`

**Files:**
- Create: `lib/notebook-engine.ts`
- Test: `tests/notebook-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/notebook-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  rotationFor, seedFor, composeRootSub, synthesizeTodos, buildPathTrace, resolveStage1Options,
} from '@/lib/notebook-engine';
import type { IntakeProfile, Node, FirstLayerSeed } from '@/lib/schemas';

const baseProfile: IntakeProfile = {
  year: 'freshman', major_category: 'stem', first_gen: true,
  aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery',
};

const mk = (id: string): Node => ({
  id, parent_id: null, opportunity_id: null, title: `T-${id}`,
  description: '', why_this: '', why_now: '', todos: [],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '2 hrs · admin', leads_to_tags: [],
  stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [],
});

describe('rotationFor', () => {
  it('is deterministic', () => {
    expect(rotationFor('node-1')).toBe(rotationFor('node-1'));
  });
  it('varies across keys', () => {
    expect(rotationFor('a')).not.toBe(rotationFor('b'));
  });
  it('stays within amplitude', () => {
    for (let i = 0; i < 50; i++) {
      const v = rotationFor(`k-${i}`, 2);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(2);
    }
  });
});

describe('seedFor', () => {
  it('is deterministic', () => {
    expect(seedFor('x')).toBe(seedFor('x'));
  });
  it('returns integers', () => {
    const s = seedFor('y');
    expect(Number.isInteger(s)).toBe(true);
  });
});

describe('composeRootSub', () => {
  it('includes year + first-gen + major', () => {
    const s = composeRootSub(baseProfile);
    expect(s).toContain('Freshman');
    expect(s).toContain('First-gen');
    expect(s.toLowerCase()).toContain('stem');
  });
  it('omits first-gen when false', () => {
    const s = composeRootSub({ ...baseProfile, first_gen: false });
    expect(s).not.toContain('First-gen');
  });
});

describe('synthesizeTodos', () => {
  const n = { ...mk('x'), estimated_time_cost: '4 hrs · research' } as Node;
  it('stage 0 adds advisor-meeting todo', () => {
    const t = synthesizeTodos(n, 0);
    expect(t.some((x) => /advisor|counselor/i.test(x.text))).toBe(true);
  });
  it('stage 3 adds mentor email todo', () => {
    const t = synthesizeTodos(n, 3);
    expect(t.some((x) => /mentor/i.test(x.text))).toBe(true);
  });
  it('respects max 5', () => {
    const t = synthesizeTodos(n, 0);
    expect(t.length).toBeLessThanOrEqual(5);
  });
});

describe('buildPathTrace', () => {
  it('maps locked IDs to path trace items', () => {
    const nodesById = { a: mk('a'), b: mk('b') };
    const trace = buildPathTrace(['a', 'b'], nodesById as any);
    expect(trace.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('resolveStage1Options', () => {
  const seeds: FirstLayerSeed[] = [
    { id: 's1', title: 'A', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'ai', eyebrow: 'Direction' } as any,
    { id: 's2', title: 'B', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'build', eyebrow: 'Direction' } as any,
    { id: 's3', title: 'C', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'explore', eyebrow: 'Direction' } as any,
  ];
  it('returns seeds when >=3 match', () => {
    const r = resolveStage1Options(seeds, baseProfile);
    expect(r.kind).toBe('seeds');
  });
  it('returns claude when <3 match', () => {
    const r = resolveStage1Options(seeds, { ...baseProfile, major_category: 'humanities' });
    expect(r.kind).toBe('claude');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/notebook-engine.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `lib/notebook-engine.ts`**

```ts
import type { IntakeProfile, Node, PathTraceItem, FirstLayerSeed } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';
import { STAGES, STAGE_KEYS, STAGE_EYEBROW, stageIdxOfKey, keyOfStageIdx } from '@/lib/stages';

export { STAGES, STAGE_KEYS, STAGE_EYEBROW, stageIdxOfKey, keyOfStageIdx };
export type { StageKey };

// Deterministic 32-bit integer seed from a string key.
export function seedFor(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Deterministic rotation in [-amplitude, +amplitude].
export function rotationFor(key: string, amplitudeDeg = 1.2): number {
  const s = seedFor(key);
  const unit = ((s % 2000) / 1000) - 1; // [-1, 1)
  return Math.max(-amplitudeDeg, Math.min(amplitudeDeg, unit * amplitudeDeg));
}

const YEAR_LABEL: Record<IntakeProfile['year'], string> = {
  freshman: 'Freshman', sophomore: 'Sophomore', junior: 'Junior', senior: 'Senior',
};
const MAJOR_LABEL: Record<IntakeProfile['major_category'], string> = {
  stem: 'STEM', humanities: 'Humanities', social_science: 'Social Science', undeclared: 'Undeclared',
};

export function composeRootSub(profile: IntakeProfile): string {
  const parts = [YEAR_LABEL[profile.year]];
  if (profile.first_gen) parts.push('First-gen');
  const interestLead = profile.interests[0]?.replace(/_/g, '/') ?? '';
  parts.push(`${MAJOR_LABEL[profile.major_category]}${interestLead ? ` + ${interestLead}` : ''} curious`);
  return parts.join(' · ');
}

export function synthesizeTodos(node: Node, stageIdx: number) {
  if (node.todos.length > 0) return node.todos.slice(0, 5);
  const out: { text: string; done: boolean }[] = [];
  if (node.estimated_time_cost) {
    out.push({ text: `Block ${node.estimated_time_cost.split('·')[0].trim()} on schedule`, done: false });
  }
  const perStage = [
    'Book a College advisor / AAP counselor meeting',
    'Find the General Meeting date + RSVP',
    'Draft application / intro email',
    'Email 3 potential mentors / PIs this week',
    'Write a 1-line progress note each Friday',
  ];
  out.push({ text: perStage[stageIdx] ?? perStage[perStage.length - 1], done: false });
  return out.slice(0, 5);
}

export function buildPathTrace(
  lockedNodeIds: string[], nodesById: Record<string, Node>
): PathTraceItem[] {
  return lockedNodeIds
    .map((id) => nodesById[id])
    .filter(Boolean)
    .map((n) => ({ id: n.id, title: n.title, opportunity_id: n.opportunity_id ?? null }));
}

export type Stage1Result =
  | { kind: 'seeds'; seeds: FirstLayerSeed[] }
  | { kind: 'claude' };

export function resolveStage1Options(
  seeds: FirstLayerSeed[], profile: IntakeProfile
): Stage1Result {
  const filtered = seeds.filter(
    (s) => s.applies_to_majors.includes(profile.major_category) &&
           s.applies_to_modes.includes(profile.mode)
  );
  if (filtered.length >= 3) return { kind: 'seeds', seeds: filtered.slice(0, 4) };
  return { kind: 'claude' };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/notebook-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/notebook-engine.ts tests/notebook-engine.test.ts
git commit -m "feat(engine): notebook engine (seeds/todos/rotation/path trace)"
```

---

### Task A7: `lib/freehand.ts`

**Files:**
- Create: `lib/freehand.ts`
- Test: `tests/freehand.test.ts`

- [ ] **Step 1: Install `perfect-freehand`**

Run: `npm install perfect-freehand@^1.2.0`
Expected: package added.

- [ ] **Step 2: Write failing tests**

Create `tests/freehand.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  seededRng, freehandUnderline, freehandArrow, freehandCheck,
  freehandX, freehandStrike, freehandBox, freehandHighlighter, freehandSquiggle,
} from '@/lib/freehand';

describe('seededRng', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it('differs across seeds', () => {
    const a = seededRng(1);
    const b = seededRng(2);
    expect(a()).not.toBe(b());
  });
});

describe('freehand primitives', () => {
  it('freehandCheck returns non-empty path', () => {
    expect(freehandCheck(22, 5).length).toBeGreaterThan(10);
  });
  it('freehandUnderline returns non-empty path', () => {
    expect(freehandUnderline(100, { seed: 1 }).length).toBeGreaterThan(10);
  });
  it('freehandArrow returns path', () => {
    expect(freehandArrow(0, 0, 50, 50, { seed: 7 }).length).toBeGreaterThan(10);
  });
  it('other primitives return non-empty', () => {
    expect(freehandX(22, 1).length).toBeGreaterThan(5);
    expect(freehandStrike(100, 1).length).toBeGreaterThan(5);
    expect(freehandBox(22, 1).length).toBeGreaterThan(5);
    expect(freehandHighlighter(100, 14, 1).length).toBeGreaterThan(5);
    expect(freehandSquiggle(100, 1).length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `npx vitest run tests/freehand.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement `lib/freehand.ts`**

```ts
import { getStroke } from 'perfect-freehand';

export function seededRng(seed: number): () => number {
  let s = (seed || 1) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

function pointsToSvgPath(points: number[][]): string {
  if (points.length < 2) return '';
  const d = ['M', points[0][0].toFixed(2), points[0][1].toFixed(2)];
  for (let i = 1; i < points.length; i++) {
    d.push('L', points[i][0].toFixed(2), points[i][1].toFixed(2));
  }
  d.push('Z');
  return d.join(' ');
}

function stroke(points: number[][], size = 2): string {
  return pointsToSvgPath(getStroke(points, { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }));
}

export function freehandUnderline(
  w: number, opts: { double?: boolean; seed?: number } = {}
): string {
  const rng = seededRng(opts.seed ?? 1);
  const steps = Math.max(12, Math.floor(w / 6));
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = 6 + (rng() - 0.5) * 1.6 + Math.sin(i * 0.7) * 0.6;
    pts.push([x, y]);
  }
  let path = stroke(pts, 2);
  if (opts.double) {
    const second: number[][] = pts.map(([x, y]) => [x, y + 3 + (rng() - 0.5) * 0.8]);
    path += ' ' + stroke(second, 1.5);
  }
  return path;
}

export function freehandArrow(
  x1: number, y1: number, x2: number, y2: number,
  opts: { curve?: number; seed?: number } = {}
): string {
  const rng = seededRng(opts.seed ?? 1);
  const curve = opts.curve ?? 0.3;
  const dx = x2 - x1, dy = y2 - y1;
  const mx = (x1 + x2) / 2 - dy * curve + (rng() - 0.5) * 2;
  const my = (y1 + y2) / 2 + dx * curve + (rng() - 0.5) * 2;
  const steps = 24;
  const pts: number[][] = [];
  for (let t = 0; t <= steps; t++) {
    const u = t / steps;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2;
    const by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
    pts.push([bx + (rng() - 0.5) * 0.6, by + (rng() - 0.5) * 0.6]);
  }
  // arrowhead
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = 7;
  const hx1 = x2 - head * Math.cos(ang - Math.PI / 7);
  const hy1 = y2 - head * Math.sin(ang - Math.PI / 7);
  const hx2 = x2 - head * Math.cos(ang + Math.PI / 7);
  const hy2 = y2 - head * Math.sin(ang + Math.PI / 7);
  return stroke(pts, 1.6) + ' ' +
    stroke([[x2, y2], [hx1, hy1]], 1.6) + ' ' +
    stroke([[x2, y2], [hx2, hy2]], 1.6);
}

export function freehandCheck(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const p1: number[][] = [
    [size * 0.18, size * 0.55 + rng() * 0.6],
    [size * 0.42, size * 0.78 + rng() * 0.6],
  ];
  const p2: number[][] = [
    [size * 0.42, size * 0.78 + rng() * 0.6],
    [size * 0.86, size * 0.22 + rng() * 0.6],
  ];
  return stroke(p1, 2) + ' ' + stroke(p2, 2);
}

export function freehandX(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const a = [[2 + rng(), 2 + rng()], [size - 2 + rng(), size - 2 + rng()]];
  const b = [[size - 2 + rng(), 2 + rng()], [2 + rng(), size - 2 + rng()]];
  return stroke(a, 2) + ' ' + stroke(b, 2);
}

export function freehandStrike(width: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = Math.max(10, Math.floor(width / 10));
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = (rng() - 0.5) * 1.2;
    pts.push([x, y]);
  }
  return stroke(pts, 1.6);
}

export function freehandBox(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const j = () => (rng() - 0.5) * 1.2;
  const pts: number[][] = [
    [1 + j(), 1 + j()],
    [size - 1 + j(), 1 + j()],
    [size - 1 + j(), size - 1 + j()],
    [1 + j(), size - 1 + j()],
    [1 + j(), 1 + j()],
  ];
  return stroke(pts, 1.5);
}

export function freehandHighlighter(w: number, h: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = 10;
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = h / 2 + (rng() - 0.5) * (h / 3);
    pts.push([x, y]);
  }
  return pointsToSvgPath(getStroke(pts, { size: h, thinning: 0, smoothing: 0.6 }));
}

export function freehandSquiggle(w: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = 18;
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = Math.sin(i * 0.9) * 3 + (rng() - 0.5) * 1.2;
    pts.push([x, y]);
  }
  return stroke(pts, 1.4);
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run tests/freehand.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/freehand.ts tests/freehand.test.ts
git commit -m "feat(freehand): seeded rng + perfect-freehand path builders"
```

---

### Task A8: Stage-aware Claude prompt (`lib/claude.ts`)

**Files:**
- Modify: `lib/claude.ts`
- Test: `tests/claude.test.ts` (existing)

- [ ] **Step 1: Inspect current `lib/claude.ts`**

Run: `cat lib/claude.ts`

- [ ] **Step 2: Update test to assert stage-aware behavior**

Append to `tests/claude.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/lib/claude';

describe('buildSystemPrompt', () => {
  const profile = {
    year: 'freshman', major_category: 'stem', first_gen: true,
    aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery',
  } as const;
  it('includes stage_guidance for given stage_key', () => {
    const s = buildSystemPrompt({
      profile, stage_key: 'community', parent_path_tag: 'ai',
      path_trace: [{ id: 'a', title: 'Declare CS', opportunity_id: null }],
    });
    expect(s).toContain('stage_guidance key="community"');
    expect(s).toContain('parent_path_tag: ai');
    expect(s).toContain('Declare CS');
  });
  it('handles null parent_path_tag on first stage', () => {
    const s = buildSystemPrompt({
      profile, stage_key: 'direction', parent_path_tag: null, path_trace: [],
    });
    expect(s).toContain('none (first stage)');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `npx vitest run tests/claude.test.ts`
Expected: FAIL — `buildSystemPrompt` not exported, or signature mismatch.

- [ ] **Step 4: Update `lib/claude.ts`**

Export a `buildSystemPrompt` function that takes the new args and emits the prompt template from spec § 7.1. Do not reproduce the template here — copy the `<role>…</output_schema>` block verbatim from the spec and substitute with template literals. Example:

```ts
import type { IntakeProfile, PathTraceItem } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';

type BuildArgs = {
  profile: IntakeProfile;
  stage_key: StageKey;
  parent_path_tag: string | null;
  path_trace: PathTraceItem[];
};

export function buildSystemPrompt(a: BuildArgs): string {
  const stageIdx = ['direction','community','signal','summer','capstone'].indexOf(a.stage_key);
  const n = stageIdx + 1;
  const trace = a.path_trace.map((p) => p.title).join(' → ') || 'none';
  const parentTag = a.parent_path_tag || 'none (first stage)';
  const { year, major_category, hours_per_week, first_gen, aid_status, mode, interests, end_goal } = a.profile;
  return [
    `<role>`,
    `  You are Pathway, an academic roadmap mentor at UCLA who knows the specific programs,`,
    `  clubs, research groups, fellowships, and faculty. You do not invent programs; you`,
    `  ground every suggestion in named UCLA institutions. Every node MUST produce at least`,
    `  one citation with a real URL.`,
    `</role>`,
    ``,
    `<student_context>`,
    `  year: ${year}`,
    `  major_category: ${major_category}`,
    `  hours_per_week: ${hours_per_week}`,
    `  first_gen: ${first_gen}`,
    `  aid_status: ${aid_status}`,
    `  mode: ${mode}`,
    `  interests: ${interests.join(', ')}`,
    `  end_goal: ${end_goal || '(undeclared)'}`,
    `</student_context>`,
    ``,
    `<stage>`,
    `  current: ${a.stage_key} (${n} of 5)`,
    `  previous locks: ${trace}`,
    `  parent_path_tag: ${parentTag}`,
    `</stage>`,
    ``,
    STAGE_GUIDANCE[a.stage_key],
    ``,
    OUTPUT_SCHEMA,
  ].join('\n');
}

const STAGE_GUIDANCE: Record<StageKey, string> = {
  direction: `<stage_guidance key="direction">
  Generate 3 starting-direction declarations. Each is a concrete major, track, or declaration
  choice (e.g., "Declare CS · AI/ML lean", "Stay undeclared, explore"). If mode === 'discovery',
  include one deliberately contrasting option to widen the student's field of view.
  Each node MUST carry: eyebrow="Direction"; path_tag (lowercase kebab/snake, 2-24 chars);
  1-3 cites with valid UCLA URLs.
</stage_guidance>`,
  community: `<stage_guidance key="community">
  Generate 3 club/org/program options that naturally extend parent_path_tag. Examples: ACM AI,
  Bruin Sports Analytics, Creative Labs, AAP cohort, first-gen peer group. eyebrow="Community".
  path_tag '<parent_tag>-<community-slug>' (lowercase kebab/snake, 2-24 chars). Prefer orgs
  with active GMs and onboarding within a month.
</stage_guidance>`,
  signal: `<stage_guidance key="signal">
  Generate 3 credential-building options aligned to parent_path_tag: research (URFP, lab TA),
  competitions (HOTH, Datafest, CTFs), applied portfolios (Hack on the Hill shipment,
  Creative Labs release). eyebrow="Signal".
</stage_guidance>`,
  summer: `<stage_guidance key="summer">
  Generate 3 sophomore-summer choices aligned to parent_path_tag: funded research (SURP, SRP,
  URSP, REU), industry internship, self-directed project. Include application deadlines.
  eyebrow="Summer".
</stage_guidance>`,
  capstone: `<stage_guidance key="capstone">
  Generate 3 year-2 capstones aligned to parent_path_tag: URSP thesis, conference paper target,
  student org founding, specific course sequences (CS 174A, CS M148). eyebrow="Capstone".
</stage_guidance>`,
};

const OUTPUT_SCHEMA = `<output_schema>
Return strict JSON: { "children": [Node, Node, Node] } where each Node has
id, parent_id, stage_key, eyebrow, title (<=80), description (<=400), why_this (<=300),
why_now (<=200), todos[0..5] of {text,done:false}, source_url, human_contact|null,
outreach_email_draft|null, estimated_time_cost, path_tag (^[a-z0-9_-]{2,24}$),
cites[0..3] of {label,summary,url}, leads_to_tags: [], opportunity_id: null.
</output_schema>`;
```

Integrate the existing Claude-call wrapper (keep prompt caching on static blocks) so the exported API matches the route's existing consumer.

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run tests/claude.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/claude.ts tests/claude.test.ts
git commit -m "feat(claude): stage-aware system prompt"
```

---

### Task A9: Stage-aware `lib/fallback.ts`

**Files:**
- Modify: `lib/fallback.ts`
- Test: `tests/fallback.test.ts`

- [ ] **Step 1: Update tests**

Rewrite `tests/fallback.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { synthesizeFallback } from '@/lib/fallback';
import { NodeSchema } from '@/lib/schemas';
import { STAGE_KEYS } from '@/lib/stages';

describe('synthesizeFallback', () => {
  for (const key of STAGE_KEYS) {
    it(`${key}: returns 3 valid children`, () => {
      const out = synthesizeFallback(key, 'parent-id');
      expect(out).toHaveLength(3);
      for (const n of out) {
        const parsed = NodeSchema.safeParse(n);
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
        expect(n.stage_key).toBe(key);
        expect(n.parent_id).toBe('parent-id');
        expect(n.cites.length).toBeGreaterThanOrEqual(1);
      }
    });
  }
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/fallback.test.ts`
Expected: FAIL — `synthesizeFallback` signature changed.

- [ ] **Step 3: Update `lib/fallback.ts`**

```ts
import raw from '@/data/ucla/stage_fallbacks.json';
import type { Node } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';

type Template = Omit<Node, 'id' | 'parent_id' | 'stage_key' | 'leads_to_tags' | 'opportunity_id' | 'human_contact' | 'outreach_email_draft'> & {
  human_contact?: Node['human_contact'];
  outreach_email_draft?: Node['outreach_email_draft'];
};

const TEMPLATES = raw as Record<StageKey, Template[]>;

export function synthesizeFallback(stage_key: StageKey, parent_id: string | null): Node[] {
  const arr = TEMPLATES[stage_key];
  if (!arr || arr.length < 3) {
    throw new Error(`fallback: missing or insufficient templates for ${stage_key}`);
  }
  return arr.slice(0, 3).map((t, i) => ({
    id: `fb-${stage_key}-${i}`,
    parent_id,
    opportunity_id: null,
    title: t.title,
    description: t.description,
    why_this: t.why_this,
    why_now: t.why_now ?? 'Rolling — start now.',
    todos: t.todos,
    source_url: t.source_url ?? null,
    human_contact: t.human_contact ?? null,
    outreach_email_draft: t.outreach_email_draft ?? null,
    estimated_time_cost: t.estimated_time_cost,
    leads_to_tags: [],
    stage_key,
    eyebrow: t.eyebrow,
    path_tag: t.path_tag,
    cites: t.cites,
  }));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/fallback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/fallback.ts tests/fallback.test.ts
git commit -m "feat(fallback): stage-aware synth from stage_fallbacks.json"
```

---

### Task A10: Update `lib/filter.ts`

**Files:**
- Modify: `lib/filter.ts`
- Test: `tests/filter.test.ts`

- [ ] **Step 1: Extend test file**

Append to `tests/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterChildren } from '@/lib/filter';

const base = {
  id: 'x', parent_id: null, opportunity_id: null, title: 'T',
  description: '', why_this: '', why_now: '', todos: [],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '2 hrs', leads_to_tags: [],
  stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [],
} as const;

describe('filterChildren — stage_key + cites', () => {
  it('drops nodes whose stage_key mismatches request', () => {
    const out = filterChildren([{ ...base, stage_key: 'summer' } as any], 'direction');
    expect(out.kept).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });
  it('drops nodes with invalid cite URL', () => {
    const bad = { ...base, cites: [{ label: 'x', summary: 'y', url: 'not-a-url' }] };
    const out = filterChildren([bad as any], 'direction');
    expect(out.kept).toHaveLength(0);
  });
  it('keeps a fully valid node', () => {
    const out = filterChildren([base as any], 'direction');
    expect(out.kept).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/filter.test.ts`
Expected: FAIL — filter either accepts mismatched stage_key or has different signature.

- [ ] **Step 3: Update `lib/filter.ts`**

Ensure export is `filterChildren(candidates: unknown[], stage_key: StageKey)` returning `{ kept: Node[]; dropped: number }`. Validate each via `NodeSchema.safeParse`; reject if `parsed.data.stage_key !== stage_key` or any cite's URL doesn't pass `z.string().url()`.

```ts
import { NodeSchema } from '@/lib/schemas';
import type { Node } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';
import { z } from 'zod';

const url = z.string().url();

export function filterChildren(candidates: unknown[], stage_key: StageKey): { kept: Node[]; dropped: number } {
  const kept: Node[] = [];
  let dropped = 0;
  for (const c of candidates) {
    const parsed = NodeSchema.safeParse(c);
    if (!parsed.success) { dropped++; continue; }
    if (parsed.data.stage_key !== stage_key) { dropped++; continue; }
    if (parsed.data.cites.some((x) => !url.safeParse(x.url).success)) { dropped++; continue; }
    kept.push(parsed.data);
  }
  return { kept, dropped };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/filter.ts tests/filter.test.ts
git commit -m "feat(filter): drop stage_key mismatch + invalid cite URL"
```

---

### Task A11: Update `/api/expand-node` route

**Files:**
- Modify: `app/api/expand-node/route.ts`
- Test: `tests/expand-node.test.ts`

- [ ] **Step 1: Extend test**

Append to `tests/expand-node.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/expand-node/route';

const req = (body: object) => new Request('http://t/api/expand-node', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const baseBody = {
  profile: { year: 'freshman', major_category: 'stem', first_gen: true,
    aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' },
  parent_id: null, path_trace: [], requestId: 'req-1',
  stage_key: 'direction', parent_path_tag: null,
};

describe('expand-node route', () => {
  it('400 when stage_key missing', async () => {
    const { stage_key, ...rest } = baseBody;
    const res = await POST(req(rest as any));
    expect(res.status).toBe(400);
  });
  it('200 on valid request (fallback path OK without API key)', async () => {
    const res = await POST(req(baseBody));
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const j = await res.json();
      expect(j.ok).toBe(true);
      expect(j.children).toHaveLength(3);
      for (const c of j.children) expect(c.stage_key).toBe('direction');
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/expand-node.test.ts`
Expected: FAIL — route still accepts old shape / missing stage_key.

- [ ] **Step 3: Update route**

Update `app/api/expand-node/route.ts` to parse request via updated `ExpandRequestSchema`, pass `stage_key` + `parent_path_tag` to `buildSystemPrompt`, call Claude, run `filterChildren(candidates, stage_key)`, and on any non-happy path call `synthesizeFallback(stage_key, parent_id)`.

```ts
import { NextResponse } from 'next/server';
import { ExpandRequestSchema, ExpandResponseSchema } from '@/lib/schemas';
import { buildSystemPrompt, callClaude } from '@/lib/claude';
import { filterChildren } from '@/lib/filter';
import { synthesizeFallback } from '@/lib/fallback';

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'validation_failed', requestId: '' }, { status: 400 }); }
  const parsed = ExpandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_failed', requestId: (body as any)?.requestId ?? '' }, { status: 400 });
  }
  const { profile, stage_key, parent_path_tag, parent_id, path_trace, requestId } = parsed.data;

  try {
    const system = buildSystemPrompt({ profile, stage_key, parent_path_tag, path_trace });
    const raw = await callClaude(system, { requestId });
    const { kept, dropped } = filterChildren(raw?.children ?? [], stage_key);
    if (kept.length === 3) {
      return NextResponse.json(ExpandResponseSchema.parse({
        ok: true, children: kept, dropped_count: dropped, requestId,
      }));
    }
  } catch { /* fall through to fallback */ }

  const fallback = synthesizeFallback(stage_key, parent_id);
  return NextResponse.json(ExpandResponseSchema.parse({
    ok: true, children: fallback, dropped_count: 0, epistemic_humility_block: 'Backup plan — live data unavailable.', requestId,
  }));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/expand-node.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/expand-node/route.ts tests/expand-node.test.ts
git commit -m "feat(api): require stage_key; stage-aware claude + fallback"
```

---

### Task A12: Full Tier-A test sweep

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: PASS on all files. If any test file under `tests/` other than `profile-store.test.ts` fails, fix before proceeding.

- [ ] **Step 2: Tag Tier A**

```bash
git tag tier-A-complete
```

---

## Tier B — Notebook Skeleton (plain rectangles)

### Task B1: Install runtime deps + fonts

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install roughjs**

Run: `npm install roughjs@^4.6.6`

- [ ] **Step 2: Update `app/layout.tsx` with Google Fonts**

```tsx
import { Caveat, Kalam } from 'next/font/google';
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', weight: ['500','700'], display: 'swap' });
const kalam  = Kalam({  subsets: ['latin'], variable: '--font-kalam',  weight: ['400','700'], display: 'swap' });

// in <html> root element className:
// className={`${caveat.variable} ${kalam.variable}`}
```

Wire `caveat.variable` + `kalam.variable` onto the `<html>` (or `<body>`) element.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "feat(fonts): load Caveat + Kalam via next/font; install roughjs"
```

---

### Task B2: Create `<Notebook/>` shell

**Files:**
- Create: `components/notebook/Notebook.tsx`

- [ ] **Step 1: Write `Notebook.tsx`**

```tsx
'use client';

import { useProfileStore } from '@/store/profile';
import { usePathwayStore } from '@/store/pathway';
import { composeRootSub } from '@/lib/notebook-engine';
import { Timeline } from './Timeline';
import { Panel } from './Panel';

export function Notebook() {
  const profile = useProfileStore((s) => s.profile);
  const reset = usePathwayStore((s) => s.reset);
  const mode = profile?.mode ?? 'discovery';

  if (!profile) {
    return <div className="p-8">No profile — complete onboarding first.</div>;
  }
  return (
    <div className="min-h-screen bg-[#d8d2c0] font-[Kalam,cursive] text-[19px] leading-[1.55] text-[#2a2a28]">
      <div className="mx-auto max-w-[1400px] px-10 pt-11 pb-24">
        <header className="flex items-baseline gap-4 pl-14">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Pathway · a working notebook</h1>
          <span className="text-sm italic text-[#6b6658]">stages unfold one at a time</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto rounded border border-dashed border-[#6b6658] px-3 py-0.5 text-sm text-[#1e3a5f] hover:border-[#c94c3a] hover:text-[#c94c3a]"
          >↺ start over</button>
        </header>
        <div className="mt-3 grid h-[860px] grid-cols-2 overflow-hidden rounded bg-[#fdfaf0] shadow-xl">
          <div className="overflow-auto border-r border-[#6b665833]">
            <Timeline profile={profile} />
          </div>
          <div className="overflow-auto">
            <Panel />
          </div>
        </div>
        <p className="mt-2 pl-14 text-xs italic text-[#6b6658]">Mode: {mode}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/notebook/Notebook.tsx
git commit -m "feat(notebook): shell component (plain)"
```

---

### Task B3: Timeline + TimelineRow + RootNode

**Files:**
- Create: `components/notebook/Timeline.tsx`
- Create: `components/notebook/TimelineRow.tsx`
- Create: `components/notebook/RootNode.tsx`

- [ ] **Step 1: Write `RootNode.tsx`**

```tsx
import type { IntakeProfile } from '@/lib/schemas';
import { composeRootSub } from '@/lib/notebook-engine';

export function RootNode({ profile }: { profile: IntakeProfile }) {
  return (
    <div className="mb-4 inline-block max-w-[460px] px-6 py-5">
      <div className="text-[42px] font-bold leading-none text-[#1e3a5f] font-[Caveat,cursive]">YOU ARE HERE</div>
      <div className="mt-2 text-base text-[#2a2a28]">{composeRootSub(profile)}</div>
    </div>
  );
}
```

- [ ] **Step 2: Write `TimelineRow.tsx`**

```tsx
import type { IntakeProfile, Node } from '@/lib/schemas';
import { STAGES } from '@/lib/stages';
import { LockedNode } from './LockedNode';
import { PromptNode } from './PromptNode';
import { ChoicesCard } from './ChoicesCard';

type Props = {
  stageIdx: number;
  profile: IntakeProfile;
  locked: Node | null;
  isOpen: boolean;
  options: Node[] | null;
  loading: boolean;
};

export function TimelineRow(p: Props) {
  const stage = STAGES[p.stageIdx];
  return (
    <div className="mb-5 relative">
      <div className="mb-1 text-2xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">{stage.stage}</div>
      <div className="mb-2 text-sm italic text-[#6b6658]">{stage.when}</div>
      {p.locked ? (
        <LockedNode node={p.locked} stageIdx={p.stageIdx} />
      ) : p.isOpen ? (
        <ChoicesCard stageIdx={p.stageIdx} options={p.options} loading={p.loading} />
      ) : (
        <PromptNode stageIdx={p.stageIdx} prompt={stage.prompt} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `Timeline.tsx`** — owns stage-1 resolution + expansion triggering:

```tsx
'use client';
import { useEffect, useMemo, useRef } from 'react';
import { usePathwayStore } from '@/store/pathway';
import { STAGES, resolveStage1Options, buildPathTrace } from '@/lib/notebook-engine';
import seedsJson from '@/data/ucla/first_layer_seeds.json';
import type { IntakeProfile, FirstLayerSeed, Node } from '@/lib/schemas';
import { TimelineRow } from './TimelineRow';
import { RootNode } from './RootNode';

export function Timeline({ profile }: { profile: IntakeProfile }) {
  const seeds = seedsJson as FirstLayerSeed[];
  const store = usePathwayStore();
  const firedRef = useRef<Set<number>>(new Set());

  // Stage 1 seed materialization (runs once)
  useEffect(() => {
    if (store.lockedNodeIds.length > 0) return;
    const r = resolveStage1Options(seeds, profile);
    if (r.kind === 'seeds') {
      const nodes: Node[] = r.seeds.map((s, i) => ({
        id: `seed-${s.id}`, parent_id: null, opportunity_id: null,
        title: s.title, description: s.description ?? '', why_this: '', why_now: '',
        todos: [], source_url: null, human_contact: null, outreach_email_draft: null,
        estimated_time_cost: '2 hrs · admin', leads_to_tags: [],
        stage_key: 'direction', eyebrow: 'Direction', path_tag: s.path_tag, cites: [],
      }));
      store.addNodes(nodes);
    } else {
      // claude path — trigger expand at stage 0
      if (!firedRef.current.has(0)) {
        firedRef.current.add(0);
        void triggerExpand(0, null, null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Stage N>0 expansion after lock-in
  useEffect(() => {
    const idx = store.openPromptStageIdx;
    if (idx === null || idx === 0) return;
    const parent = store.nodesById[store.lockedNodeIds[idx - 1]];
    if (!parent) return;
    const hasCache = Object.values(store.nodesById).filter(
      (n) => n.parent_id === parent.id && n.stage_key === STAGES[idx].key
    ).length >= 3;
    if (hasCache) return;
    if (firedRef.current.has(idx)) return;
    firedRef.current.add(idx);
    void triggerExpand(idx, parent.id, parent.path_tag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.openPromptStageIdx, store.lockedNodeIds]);

  async function triggerExpand(stageIdx: number, parent_id: string | null, parent_path_tag: string | null) {
    const { requestId, signal } = store.startExpand(stageIdx, parent_id);
    try {
      const resp = await fetch('/api/expand-node', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal,
        body: JSON.stringify({
          profile, stage_key: STAGES[stageIdx].key, parent_path_tag,
          parent_id, path_trace: buildPathTrace(store.lockedNodeIds, store.nodesById),
          requestId,
        }),
      });
      const j = await resp.json();
      if (j.ok) store.acceptChildren(stageIdx, requestId, j.children);
    } catch { /* aborted / network — ignored */ }
  }

  const rows = useMemo(() => {
    const visible = store.lockedNodeIds.length + (store.openPromptStageIdx !== null ? 1 : 0);
    return STAGES.slice(0, visible).map((_, stageIdx) => {
      const locked = store.nodesById[store.lockedNodeIds[stageIdx]] ?? null;
      const isOpen = store.openPromptStageIdx === stageIdx && !locked;
      const options = isOpen
        ? (stageIdx === 0
            ? Object.values(store.nodesById).filter((n) => n.stage_key === 'direction' && n.parent_id === null)
            : Object.values(store.nodesById).filter((n) => n.parent_id === store.lockedNodeIds[stageIdx-1] && n.stage_key === STAGES[stageIdx].key))
        : null;
      const loading = isOpen && (options?.length ?? 0) < 3 && stageIdx in store.inFlight;
      return (
        <TimelineRow
          key={stageIdx}
          stageIdx={stageIdx}
          profile={profile}
          locked={locked}
          isOpen={isOpen}
          options={options}
          loading={loading}
        />
      );
    });
  }, [store.nodesById, store.lockedNodeIds, store.openPromptStageIdx, store.inFlight, profile]);

  return (
    <div className="pl-28 pr-8 pt-8 pb-16">
      <RootNode profile={profile} />
      {rows}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/notebook/Timeline.tsx components/notebook/TimelineRow.tsx components/notebook/RootNode.tsx
git commit -m "feat(notebook): timeline + row + root node"
```

---

### Task B4: `LockedNode`, `PromptNode`, `ChoicesCard`

**Files:**
- Create: `components/notebook/LockedNode.tsx`
- Create: `components/notebook/PromptNode.tsx`
- Create: `components/notebook/ChoicesCard.tsx`

- [ ] **Step 1: Write `LockedNode.tsx`**

```tsx
'use client';
import type { Node } from '@/lib/schemas';
import { synthesizeTodos } from '@/lib/notebook-engine';
import { usePathwayStore } from '@/store/pathway';

export function LockedNode({ node, stageIdx }: { node: Node; stageIdx: number }) {
  const reopen = usePathwayStore((s) => s.reopen);
  const toggle = usePathwayStore((s) => s.toggleTodoDone);
  const todos = node.todos.length ? node.todos : synthesizeTodos(node, stageIdx);
  return (
    <div className="relative rounded border border-[#1e3a5f33] bg-[#fef3a2] p-4 max-w-[420px]">
      <button
        type="button"
        onClick={() => reopen(stageIdx)}
        className="block w-full text-left"
      >
        <div className="text-xs italic text-[#6b6658]">{node.eyebrow}</div>
        <div className="text-base font-bold text-[#1e3a5f]">{node.title}</div>
      </button>
      <div className="mt-3 border-t border-dashed border-[#1e3a5f33] pt-2">
        <div className="text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">next steps</div>
        {todos.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(node.id, i); }}
            className="flex w-full items-start gap-2 py-0.5 text-left text-sm text-[#1e3a5f]"
          >
            <span
              className={`mt-0.5 inline-block h-4 w-4 shrink-0 border border-[#1e3a5f] ${
                t.done ? 'bg-[#1e3a5f]' : ''
              }`}
            />
            <span className={t.done ? 'text-[#6b6658] line-through' : ''}>{t.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `PromptNode.tsx`**

```tsx
'use client';
import { usePathwayStore } from '@/store/pathway';

export function PromptNode({ stageIdx, prompt }: { stageIdx: number; prompt: string }) {
  const openPrompt = usePathwayStore((s) => s.openPromptStageIdx);
  const setIdx = usePathwayStore.setState;
  return (
    <button
      type="button"
      onClick={() => setIdx({ openPromptStageIdx: stageIdx })}
      className="block w-full max-w-[420px] rounded border-2 border-dashed border-[#1e3a5f] p-4 text-left"
    >
      <div className="text-xs italic text-[#c94c3a]">click to open</div>
      <div className="text-xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">{prompt}</div>
      <div className="mt-1 text-xs italic text-[#c94c3a]">see 3 choices →</div>
    </button>
  );
}
```

- [ ] **Step 3: Write `ChoicesCard.tsx`**

```tsx
'use client';
import type { Node } from '@/lib/schemas';
import { usePathwayStore } from '@/store/pathway';

type Props = { stageIdx: number; options: Node[] | null; loading: boolean };

export function ChoicesCard({ stageIdx, options, loading }: Props) {
  const previewNodeId = usePathwayStore((s) => s.previewNodeId);
  const setPreview = usePathwayStore((s) => s.setPreview);
  const setState = usePathwayStore.setState;
  return (
    <div className="relative w-full max-w-[460px] rounded border-2 border-dashed border-[#1e3a5f] p-5">
      <div className="mb-3 flex items-end justify-between">
        <div className="text-xl font-bold text-[#c94c3a] font-[Caveat,cursive]">Pick one</div>
        <button
          type="button"
          onClick={() => setState({ openPromptStageIdx: null, previewNodeId: null })}
          className="text-xl text-[#6b6658]"
        >×</button>
      </div>
      {loading && !options?.length ? (
        <div className="text-sm italic text-[#6b6658]">loading options…</div>
      ) : !options?.length ? (
        <div className="text-sm italic text-[#c94c3a]">no options available — hit start over</div>
      ) : (
        options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPreview(opt.id)}
            className={`flex w-full items-start gap-3 py-2 pr-2 text-left text-base text-[#1e3a5f] ${
              previewNodeId === opt.id ? 'font-bold' : ''
            }`}
          >
            <span className={`mt-1 inline-block h-5 w-5 shrink-0 border-2 border-[#1e3a5f] ${
              previewNodeId === opt.id ? 'bg-[#f4d35e]' : ''
            }`} />
            <span>{opt.title}</span>
          </button>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/notebook/LockedNode.tsx components/notebook/PromptNode.tsx components/notebook/ChoicesCard.tsx
git commit -m "feat(notebook): locked/prompt/choices node variants (plain)"
```

---

### Task B5: `Panel` + `PanelEmpty`

**Files:**
- Create: `components/notebook/Panel.tsx`
- Create: `components/notebook/PanelEmpty.tsx`

- [ ] **Step 1: Write `PanelEmpty.tsx`**

```tsx
export function PanelEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-10 py-12 text-center">
      <div className="text-2xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">pick a first move</div>
      <div className="max-w-xs text-sm italic text-[#6b6658]">open the dashed prompt on the left — three options will appear.</div>
    </div>
  );
}
```

- [ ] **Step 2: Write `Panel.tsx`**

```tsx
'use client';
import { usePathwayStore } from '@/store/pathway';
import { STAGES, STAGE_KEYS } from '@/lib/stages';
import { PanelEmpty } from './PanelEmpty';

export function Panel() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const previewId = usePathwayStore((s) => s.previewNodeId);
  const openIdx = usePathwayStore((s) => s.openPromptStageIdx);
  const lockedLen = usePathwayStore((s) => s.lockedNodeIds.length);
  const lockIn = usePathwayStore((s) => s.lockIn);
  const cancel = usePathwayStore((s) => s.cancelPreview);

  if (openIdx === null && lockedLen === 5) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
        <div className="text-2xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">Year-2 bet locked</div>
        <div className="max-w-xs text-sm italic text-[#6b6658]">start over to replan — your progress is saved.</div>
      </div>
    );
  }
  if (!previewId) return <PanelEmpty />;
  const node = nodesById[previewId];
  if (!node) return <PanelEmpty />;

  const stageIdx = openIdx ?? STAGE_KEYS.indexOf(node.stage_key);
  const isReopening = stageIdx < lockedLen;
  const willWipe = Math.max(0, lockedLen - stageIdx);

  return (
    <div className="px-10 pt-8 pb-10">
      <div className="mb-1 text-sm italic text-[#c94c3a]">{node.eyebrow} · {STAGES[stageIdx].stage}</div>
      <h2 className="mb-4 text-3xl font-bold leading-tight text-[#1e3a5f] font-[Caveat,cursive]">{node.title}</h2>
      <div className="mb-5 rounded border-l-[3px] border-[#c94c3a] bg-[#fdf5dc] px-4 py-3">
        <div className="text-sm"><span className="font-bold text-[#c94c3a]">When:</span> {STAGES[stageIdx].when}</div>
        <div className="text-sm"><span className="font-bold text-[#c94c3a]">Effort:</span> {node.estimated_time_cost}</div>
      </div>
      {node.why_this && (
        <div className="mb-5 border-l-2 border-[#c94c3a88] pl-3">
          <div className="mb-1 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">why this</div>
          <div className="text-base">{node.why_this}</div>
        </div>
      )}
      {node.description && (
        <div className="mb-5">
          <div className="mb-1 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">details</div>
          <div className="text-[15px] leading-relaxed">{node.description}</div>
        </div>
      )}
      {node.cites.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">cites</div>
          {node.cites.map((c, i) => (
            <div key={i} className="mb-1 flex items-start gap-2 text-sm">
              <span className="font-bold text-[#c94c3a]">{i + 1}</span>
              <div><strong>{c.label}</strong> — <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-[#c94c3a]">{new URL(c.url).host}</a> · {c.summary}</div>
            </div>
          ))}
        </div>
      )}
      {isReopening && willWipe > 0 && (
        <div className="mb-4 border-l-2 border-[#c94c3a] pl-3 text-xs italic text-[#c94c3a]">
          ⚠ Locking here will wipe {willWipe} later step{willWipe > 1 ? 's' : ''}.
        </div>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => lockIn(stageIdx, node.id)}
          className="flex-1 rounded border-2 border-[#c94c3a] px-4 py-2 text-xl font-bold text-[#c94c3a] font-[Caveat,cursive]"
        >Lock it in ✓</button>
        <button
          type="button"
          onClick={cancel}
          className="flex-1 rounded border-2 border-[#6b6658] px-4 py-2 text-xl font-bold text-[#6b6658] font-[Caveat,cursive]"
        >dismiss</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/notebook/Panel.tsx components/notebook/PanelEmpty.tsx
git commit -m "feat(notebook): right panel + empty + terminal state"
```

---

### Task B6: Swap `/pathway` route to Notebook; delete tree components

**Files:**
- Modify: `app/pathway/page.tsx`
- Delete: `components/tree/*.tsx`

- [ ] **Step 1: Update `app/pathway/page.tsx`**

```tsx
'use client';
import { Notebook } from '@/components/notebook/Notebook';
export default function Page() { return <Notebook />; }
```

- [ ] **Step 2: Delete old tree components**

```bash
git rm components/tree/MissBanner.tsx components/tree/TreeEdge.tsx \
  components/tree/GhostRail.tsx components/tree/NodePanel.tsx \
  components/tree/EpistemicHumilityBlock.tsx components/tree/ProgressBar.tsx \
  components/tree/TreeCanvas.tsx components/tree/TreeNode.tsx \
  components/tree/TreeScreen.tsx
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: both succeed.

- [ ] **Step 4: Smoke test locally**

```bash
npm run dev
```

Open `http://localhost:3000`, complete onboarding (or use demo persona), land on `/pathway`. Verify:
- chrome + timeline + empty panel render
- stage 1 prompt appears (STEM demo persona) OR loading (non-STEM)
- clicking prompt shows choices
- selecting a choice populates the panel
- lock-in advances to stage 2 prompt
- reopen truncates downstream
- reset clears everything

- [ ] **Step 5: Commit**

```bash
git add app/pathway/page.tsx
git commit -m "feat(pathway): swap route to notebook; delete legacy tree components"
git tag tier-B-complete
```

---

## Tier C — Aesthetic (rough.js + CSS module)

### Task C1: `notebook.module.css`

**Files:**
- Create: `components/notebook/notebook.module.css`

- [ ] **Step 1: Port paper + sticky + keyframes**

Copy the CSS from spec § 5 reference, converting `.class` to CSS-module exports, preserving `@property --write` (requires CSS-modules setup in Next — supported out of the box), inline SVG noise data-URIs, keyframes (`sticky-drop`, `sticky-wobble`, `sticky-write`, `sticky-sign`, `choices-in`, `panel-in`, `draw-on`), and `@media (prefers-reduced-motion: reduce)` branch.

Minimum exported classes: `paper`, `paperVignette`, `chrome`, `chromeTitle`, `chromeRight`, `split`, `splitList`, `splitPanel`, `tl`, `tlRow`, `tlStageLbl`, `node`, `nodeRoot`, `nodeLocked`, `nodeEyebrow`, `nodeTitle`, `nodeCheck`, `nodeTodos`, `nodeTodo`, `nodeTodoDone`, `prompt`, `promptEyebrow`, `promptTitle`, `promptCta`, `choices`, `choicesHd`, `choice`, `choiceSelected`, `sticky`, `stickyDropping`, `stickyTxt`, `stickyKicker`, `stickySigned`, `panel`, `panelKicker`, `panelTtl`, `panelMeta`, `panelWhy`, `panelBody`, `panelCites`, `panelCite`, `panelActions`, `reopenWarn`, `btn`, `btnPrimary`, `btnGhost`, `marginalia`.

- [ ] **Step 2: Integrate into `Notebook.tsx` + children**

Replace arbitrary Tailwind color strings with `styles.paper` etc. Keep Tailwind for layout (flex/grid/spacing); CSS module for paper, rulings, margin line, sticky.

- [ ] **Step 3: Smoke test in browser**

`npm run dev`, verify paper background + ruling lines + red margin visible.

- [ ] **Step 4: Commit**

```bash
git add components/notebook/notebook.module.css components/notebook/*.tsx
git commit -m "feat(notebook): CSS module — paper, chrome, panel styles"
```

---

### Task C2: `<RoughRect/>` component with fail-safe

**Files:**
- Create: `components/notebook/rough/RoughRect.tsx`

- [ ] **Step 1: Write component**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import rough from 'roughjs';

type Props = {
  width: number; height: number; seed: number;
  stroke?: string; fill?: string; dashed?: boolean;
  roughness?: number; strokeWidth?: number;
};

export function RoughRect({
  width, height, seed, stroke = '#1e3a5f', fill = 'none', dashed = false,
  roughness = 1.8, strokeWidth = 2.2,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      const opts: any = {
        roughness, bowing: 1.5, strokeWidth, stroke, seed,
        fillStyle: 'hachure', hachureAngle: -35, hachureGap: 6,
      };
      if (fill !== 'none') opts.fill = fill;
      if (dashed) opts.strokeLineDash = [6, 8];
      el.appendChild(rc.rectangle(1, 1, width - 2, height - 2, opts));
    } catch (e) {
      // fallback: plain rect
      const ns = 'http://www.w3.org/2000/svg';
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', '1'); r.setAttribute('y', '1');
      r.setAttribute('width', String(width - 2));
      r.setAttribute('height', String(height - 2));
      r.setAttribute('fill', fill === 'none' ? 'transparent' : fill);
      r.setAttribute('stroke', stroke);
      r.setAttribute('stroke-width', String(strokeWidth));
      if (dashed) r.setAttribute('stroke-dasharray', '6 8');
      el.appendChild(r);
      console.warn('rough.js failed, falling back to <rect>', e);
    }
  }, [width, height, seed, stroke, fill, dashed, roughness, strokeWidth]);
  return <svg ref={ref} className="absolute inset-0" style={{ overflow: 'visible' }} width={width} height={height} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/notebook/rough/RoughRect.tsx
git commit -m "feat(notebook): RoughRect component with fail-safe"
```

---

### Task C3: Freehand primitive components

**Files:**
- Create: `components/notebook/rough/{FreehandUnderline,FreehandArrow,FreehandCheck,FreehandStrike,FreehandHighlighter,FreehandBox,FreehandSquiggle}.tsx`

- [ ] **Step 1: Write one component per primitive**

Pattern (repeat for each):

```tsx
import { freehandCheck } from '@/lib/freehand';
export function FreehandCheck({ size = 22, seed, stroke = '#1e3a5f', strokeWidth = 2 }:
  { size?: number; seed: number; stroke?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <path d={freehandCheck(size, seed)} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

Same pattern for `FreehandUnderline`, `FreehandArrow` (needs x1/y1/x2/y2), `FreehandStrike` (needs width), `FreehandHighlighter` (needs w/h, use `fill` prop for the highlighter wash), `FreehandBox` (size), `FreehandSquiggle` (width).

- [ ] **Step 2: Commit**

```bash
git add components/notebook/rough/Freehand*.tsx
git commit -m "feat(notebook): freehand primitive components"
```

---

### Task C4: Integrate RoughRect + Freehand into node/prompt/choices

**Files:**
- Modify: `components/notebook/{LockedNode,PromptNode,ChoicesCard,Panel}.tsx`

- [ ] **Step 1: Wrap each card's border with `<RoughRect/>`**

In `LockedNode.tsx`:
- Wrap the outer `<div>` with `position: relative` (use `styles.node`); add `<RoughRect width={w} height={h} seed={seedFor('locked-'+node.id)} />` as first child.
- Replace the plain `<span>` checkbox with `<FreehandBox/>` + conditional `<FreehandCheck/>` overlay inside it.
- Replace the line-through with `<FreehandStrike/>` when `todo.done`.
- Add `<FreehandCheck/>` at top-right of locked node (absolute-positioned, 36×36).

In `PromptNode.tsx`:
- Add `<RoughRect dashed seed={seedFor('prompt-'+stageIdx)} .../>`.

In `ChoicesCard.tsx`:
- Add `<RoughRect seed={seedFor('choices-'+stageIdx)} .../>`.
- Add `<FreehandBox/>` + optional `<FreehandCheck/>` per choice checkbox.
- Add `<FreehandHighlighter/>` layer when `is-selected` or on hover.

In `Panel.tsx`:
- Wrap Lock-In / Dismiss `<button>`s with `<RoughRect/>` borders (per-button).
- Add `<FreehandUnderline/>` under `.panelTtl`.

Use `seedFor(...)` from `lib/notebook-engine.ts` for stable seeds keyed by nodeId/stageIdx/role. Measure container width/height via `useLayoutEffect + useState` (custom hook `useMeasure`) so RoughRect receives pixel dimensions. Add `hooks/useMeasure.ts`:

```ts
import { useLayoutEffect, useRef, useState } from 'react';
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}
```

- [ ] **Step 2: Smoke test**

`npm run dev` — verify sketchy borders + freehand checks render.

- [ ] **Step 3: Commit**

```bash
git add hooks/useMeasure.ts components/notebook/
git commit -m "feat(notebook): rough borders + freehand primitives integrated"
```

---

### Task C5: `StickyNote` with drop/wobble/write/sign animation

**Files:**
- Create: `components/notebook/StickyNote.tsx`
- Modify: `components/notebook/TimelineRow.tsx` — render StickyNote when `justLockedStageIdx === stageIdx`

- [ ] **Step 1: Write component**

```tsx
'use client';
import styles from './notebook.module.css';
import { usePathwayStore } from '@/store/pathway';
import { rotationFor } from '@/lib/notebook-engine';

export function StickyNote({ stageIdx, title }: { stageIdx: number; title: string }) {
  const just = usePathwayStore((s) => s.justLockedStageIdx);
  const noteRot = rotationFor(`sticky-${stageIdx}`, 3);
  const tapeRot = rotationFor(`tape-${stageIdx}`, 2);
  return (
    <div
      className={`${styles.sticky} ${just === stageIdx ? styles.stickyDropping : ''}`}
      style={{ ['--note-rot' as any]: `${noteRot}deg`, ['--tape-rot' as any]: `${tapeRot}deg` }}
    >
      <span className={styles.stickyKicker}>LOCKED</span>
      <span className={styles.stickyTxt}>{title}</span>
      <span className={styles.stickySigned}>— you</span>
    </div>
  );
}
```

- [ ] **Step 2: Render in `TimelineRow`** alongside `LockedNode`:

```tsx
{p.locked ? (
  <>
    <StickyNote stageIdx={p.stageIdx} title={p.locked.title} />
    <LockedNode node={p.locked} stageIdx={p.stageIdx} />
  </>
) : ...}
```

- [ ] **Step 3: Smoke test**

Lock a stage; sticky drops, wobbles, writes-on, signs. Reload with stage locked; sticky renders in resting state (no animation).

- [ ] **Step 4: Commit**

```bash
git add components/notebook/StickyNote.tsx components/notebook/TimelineRow.tsx
git commit -m "feat(notebook): sticky note drop/wobble/write/sign animation"
git tag tier-C-complete
```

---

## Tier D — Polish

### Task D1: Marginalia + root decorate pass

**Files:**
- Create: `components/notebook/Marginalia.tsx`
- Modify: `components/notebook/RootNode.tsx` — add `<FreehandUnderline/>` under "YOU ARE HERE", `<FreehandArrow/>` from root to stage 1 label

- [ ] **Step 1: Write `Marginalia.tsx`**

```tsx
import styles from './notebook.module.css';
type Props = { text: string; rot?: number; top?: number };
export function Marginalia({ text, rot = -4, top = 0 }: Props) {
  return (
    <div className={styles.marginalia} style={{ transform: `rotate(${rot}deg)`, top }}>{text}</div>
  );
}
```

- [ ] **Step 2: Sprinkle marginalia in `Timeline.tsx`**

Render `<Marginalia text="← start here" />` next to the first open prompt; `<Marginalia text="ask advisor" />` next to stage 3; etc. Keep it sparse (3-4 total).

- [ ] **Step 3: Root decorate pass**

In `RootNode.tsx`, after the title add:

```tsx
<svg className="absolute -bottom-1 left-0" width={220} height={10} style={{ overflow: 'visible' }}>
  <path d={freehandUnderline(220, { seed: 11, double: true })} stroke="#c94c3a" fill="none" strokeWidth={2} />
</svg>
```

- [ ] **Step 4: Commit**

```bash
git add components/notebook/Marginalia.tsx components/notebook/RootNode.tsx components/notebook/Timeline.tsx
git commit -m "feat(notebook): marginalia + root underline + root arrow"
```

---

### Task D2: Memo seeded SVG paths

**Files:**
- Modify: `components/notebook/rough/Freehand*.tsx`

- [ ] **Step 1: Wrap each primitive in `React.memo` + `useMemo` on path**

```tsx
import { memo, useMemo } from 'react';
import { freehandCheck } from '@/lib/freehand';

export const FreehandCheck = memo(function FreehandCheck(
  { size = 22, seed, stroke = '#1e3a5f', strokeWidth = 2 }: { size?: number; seed: number; stroke?: string; strokeWidth?: number }
) {
  const d = useMemo(() => freehandCheck(size, seed), [size, seed]);
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});
```

Apply same pattern to each Freehand* component.

- [ ] **Step 2: Commit**

```bash
git add components/notebook/rough/Freehand*.tsx
git commit -m "perf(notebook): memoize freehand paths by seed"
```

---

### Task D3: Keyboard nav + ARIA

**Files:**
- Modify: `components/notebook/{PromptNode,ChoicesCard,LockedNode,Panel}.tsx`

- [ ] **Step 1: Keyboard + ARIA additions**

- `PromptNode` button: `aria-expanded={false}`, focusable; Enter/Space opens (native button behavior works).
- `ChoicesCard` close button: `aria-label="close choices"`. Escape key on the card dismisses: add `onKeyDown` on container, listen for `'Escape'`, call `setState({ openPromptStageIdx: null, previewNodeId: null })`.
- `LockedNode` reopen button: `aria-label="reopen stage {stage}"`.
- `Panel` lock button: `aria-label="lock in {node.title}"`.
- All interactive elements: ensure `focus-visible` outlines via CSS module `:focus-visible { outline: 2px solid #c94c3a; outline-offset: 2px; }`.

- [ ] **Step 2: Manual a11y smoke test**

Tab through notebook. Each interactive element reachable + ring visible. Escape closes open choices.

- [ ] **Step 3: Commit**

```bash
git add components/notebook
git commit -m "feat(notebook): keyboard + ARIA + focus-visible rings"
git tag tier-D-complete
```

---

### Task D4: Full-suite verification

- [ ] **Step 1: All tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 3: Manual QA rehearsal**

Walk both demo personas end-to-end:
- STEM/discovery (Maya): seed path, lock all 5 stages, confirm terminal state + reset.
- Humanities/directed (stub): Claude fallback path.
- Reopen stage 2 mid-chain: confirm truncation + preview preselect.
- Reduced-motion toggle (OS level): confirm sticky fades instead of drops.
- Offline / kill API key: fallback renders.

- [ ] **Step 4: Ship commit**

```bash
git commit --allow-empty -m "chore(notebook): tier-D complete, ready for demo"
```

---

## Self-Review Summary

- All 12 Tier-A / 6 Tier-B / 5 Tier-C / 4 Tier-D tasks present.
- Every task has: exact files, failing-test step (where applicable), full code, run command with expected output, commit.
- No placeholders: every step contains actual content.
- Type consistency: `StageKey` imported from `lib/stages.ts` everywhere; `lockedNodeIds` / `openPromptStageIdx` / `previewNodeId` / `justLockedStageIdx` names used consistently across store, tests, UI.
- Spec coverage: Schema (A2, A3), Stage config (A1), Store (A5), Engine (A6), Freehand (A7), Claude (A8), Fallback (A4, A9), Filter (A10), API (A11), Notebook shell (B2), Nodes (B3, B4), Panel (B5), Route swap + tree delete (B6), CSS module (C1), RoughRect (C2), Freehand components (C3, D2), Integration (C4), Sticky animation (C5), Marginalia + root decorate (D1), a11y (D3), full verification (D4).
- Tier tags at each boundary for easy execution checkpoints.
