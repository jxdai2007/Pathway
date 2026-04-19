# Pathway — AI-Branching College Roadmap

> Helping first-gen and underserved UCLA students discover the opportunities their parents can't point them toward.

## Quick Start

```bash
git clone <this-repo>
cd claudehackathon
cp .env.example .env.local
# Edit .env.local: paste your ANTHROPIC_API_KEY from console.anthropic.com
npm install
npm run dev
# Open http://localhost:3000
```

Requires Node 20+.

## Problem

College has hundreds of fellowships, clubs, research groups, and advising offices. Students whose families have already been through US college get pointed to the right ones by name. First-gen students and those whose families went to school elsewhere don't. Pathway closes that gap.

## Solution

Branching AI-generated roadmap. Answer a 9-step intake. Claude proposes 3-4 path directions grounded in a curated UCLA opportunity corpus. Click a direction, Claude generates the next layer of nodes. Each node carries concrete todos, source URL, a real human contact, and a drafted outreach email.

## How Claude Is Used

- **Path-dependent generation.** Each `/api/expand-node` call receives the accumulated path trace. Claude conditions the next layer on where the student has been, not on a static recommendation.
- **Prompt caching on the system prompt.** The advisor guardrails are cached via Anthropic's ephemeral cache, so each expansion pays Claude only for the novel profile + path context.
- **Server-side semantic validation.** Every returned `opportunity_id` is checked against the in-repo corpus. Hallucinations (invented ids, mismatched URLs) are dropped silently and the route falls back to a deterministic advising pool. The student never sees a fake opportunity.
- **Prompt injection guard.** The student's goal string is wrapped in `<student_goal_untrusted>...</student_goal_untrusted>` and the system prompt tells Claude to ignore instructions inside.
- **Abort + stale rejection.** Each node's expand call gets an `AbortController`. Rapid clicks on the same parent cancel prior in-flight calls; stale responses are rejected by requestId.

## Ethics & What Could Go Wrong

- **No persistence of sensitive fields.** `first_gen`, `aid_status`, `end_goal` live in an in-memory Zustand store. They never hit localStorage. Tree structure does persist (so refresh keeps your walk) but sensitive profile fields do not.
- **Every leaf hands off to a human.** Side panel always surfaces a real UCLA contact (advisor, program coordinator). Pathway is a triage tool, not an advisor.
- **Epistemic humility.** The UI exposes Claude's stated uncertainty ("What I might be wrong about") and prompts the student to book a real advisor for high-stakes decisions.
- **Fallback safety route.** If the tree UI breaks, `/fallback` gives a linear 3-moves view with source URLs.
- **Risks we acknowledge.** Claude can still over-confident. The corpus is UCLA-only — other schools need forks. The advisor-handoff depends on students actually using the email drafts. None of this replaces real mentorship.

## Demo Personas

- **Maya Chen** — first-gen freshman, CS, Pell grant, 8 hrs/week, *discovery* mode. Wants to see both AI/ML and cybersec paths.
- **Raj Patel** — sophomore, CS, no aid, 15 hrs/week, *directed* mode. Knows he wants a PhD in AI/ML.

Use the "Use demo · Maya" button in the welcome slide, or switch at any time via the persona tab strip at the bottom of the tree screen.

## Fork Guide

Other schools can fork Pathway by replacing `data/ucla/` with `data/<school>/`:
- `opportunities.json` — 15-20 curated items + 3-5 advising fallback.
- `first_layer_seeds.json` — 4 seeds (3 per major_category, 1 discovery).
- `personas.json` — 2+ demo personas.

Every record must match `CorpusItemSchema` / `FirstLayerSeedSchema` in `lib/schemas.ts`. The predev validator (`npm run dev`) fails loudly on malformed data.

## Architecture

- **Next.js 16 App Router** — static routes + one server route at `/api/expand-node`.
- **Tailwind v4** — CSS-first `@theme` tokens in `app/globals.css`.
- **Zustand** — two stores: `profile` (in-memory only) + `pathway` (nodes + selection, localStorage-persisted).
- **Zod** — all API + data contracts in `lib/schemas.ts`.
- **Anthropic SDK** — `claude-sonnet-4-6` pinned, 10s timeout, abortable.
- **Custom SVG tree canvas** — hand-laid layout in `lib/tree-layout.ts`, cubic-bezier edges with a hand-drawn roughen filter.

## Tree Structure, Explained

- Root → 3 first-layer seeds (by major category + mode).
- Click a seed → focus shifts. Unchosen seeds render as "Alternative futures" in the right rail.
- Click a node → Claude generates 2-3 children grounded in the curated corpus.
- Each node: deadline pill (urgent / soon / normal), todos, outreach email draft, source URL, human contact.

## Contributors

Built for the Claude hackathon, April 2026.

## License

MIT
