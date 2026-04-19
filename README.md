# Pathway — AI-Branching College Roadmap

> Helping first-gen and underserved UCLA students discover the opportunities their parents can't point them toward.

## Quick Start

```bash
git clone <this-repo>
cd claudehackathon
cp .env.example .env.local
# Edit .env.local and paste your ANTHROPIC_API_KEY from console.anthropic.com
npm install
npm run dev
# Open http://localhost:3000
```

Requires Node 20+.

## Problem

College has hundreds of fellowships, clubs, research groups, and advising offices. Students whose families have already been through US college get pointed to the right ones by name. First-gen students and those whose families went to school elsewhere don't. Pathway closes that gap.

## Solution

Branching AI-generated roadmap. Enter your profile + goal (or "help me discover"). Claude proposes 3-4 path directions grounded in a curated UCLA opportunity corpus. Click a direction, Claude generates the next layer of nodes. Each node carries concrete todos, source URL, a real human contact, and a drafted outreach email.

## How Claude Is Used

- At every click, Claude reasons over the student's accumulated path choices, profile, goal, and filtered corpus to propose 2-3 next-best forks.
- Structured JSON output via `@anthropic-ai/sdk` with prompt caching on the stable system prompt.
- Server-side semantic validation rejects any node whose `opportunity_id` isn't in the corpus — no hallucinated fellowships.
- Claude is not a wrapper; it does path-dependent reasoning + warm outreach drafting — things a keyword filter cannot do.

## Ethics & What Could Go Wrong

- **Misdirection:** hard eligibility filter runs before Claude; every node cites a source URL.
- **Hallucination:** schema validator drops any child naming an opportunity not in corpus; deterministic advising-pool fills gaps.
- **Privacy:** sensitive profile fields (first-gen status, aid status) live in browser memory only. Never persisted, never logged.
- **Prompt injection:** open-ended `end_goal` input is wrapped in untrusted-input tags with explicit model instruction to ignore instructions within.
- **Replacing advisors:** every node points to a real human advisor (EOP, AAP, department). Top-level disclaimer that Pathway augments, does not replace, a real advisor.

## Demo Personas

- **Maya Chen** (discovery mode): freshman, CS undecided, first-gen, Pell, 8 hrs/wk. Doesn't know if she wants AI/ML or cybersec.
- **Raj Patel** (directed mode): sophomore CS, goal "PhD AI/ML", wants milestone roadmap.

## Fork Guide (target another school)

Create `data/<school>/opportunities.json` + `data/<school>/first_layer_seeds.json` following the schemas in `lib/schemas.ts`. No code changes required.

## Contributors

SoCal Claude Builder Club Hackathon · UCLA · April 2026
