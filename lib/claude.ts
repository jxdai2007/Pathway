import Anthropic from '@anthropic-ai/sdk';
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
  const { year, major_category, hours_per_week, first_gen, aid_status, mode, interests } = a.profile;
  const end_goal = (a.profile as any).end_goal;
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

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const TIMEOUT_MS = 10_000;

export type ClaudeCallArgs = {
  system: string;
  user: string;
};

export async function callClaudeExpand(
  args: ClaudeCallArgs,
  signal: AbortSignal
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeoutSignal]);

  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: args.user }],
      },
      { signal: combined }
    );

    const first = resp.content[0];
    if (!first || first.type !== 'text') {
      throw new Error('Claude returned non-text content block');
    }
    return first.text;
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string; status?: number };
    if (err.name === 'AbortError' || combined.aborted) {
      if (signal.aborted) {
        throw Object.assign(new Error('aborted by client'), { kind: 'aborted' });
      }
      throw Object.assign(new Error('timeout'), { kind: 'timeout' });
    }
    throw Object.assign(new Error(err.message ?? 'api_error'), { kind: 'api_error', status: err.status });
  }
}
