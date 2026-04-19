import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ResumeKBSchema, type ResumeKB, type IntakeProfileV2 } from '@/lib/schemas';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const TIMEOUT_MS = 30_000;

const ProfileHintsSchema = z.object({
  year:           z.enum(['freshman', 'sophomore', 'junior', 'senior']).optional(),
  major_category: z.enum(['stem', 'humanities', 'social_science', 'undeclared']).optional(),
  interests:      z.array(z.string().max(40)).max(5).default([]),
  is_transfer:    z.boolean().optional(),
  horizons:       z.number().int().min(1).max(10).optional(),
  mode:           z.enum(['directed', 'partial', 'discovery']).optional(),
});

export const ResumeParseResultSchema = z.object({
  resume_kb:     ResumeKBSchema,
  profile_hints: ProfileHintsSchema,
  confidence:    z.number().min(0).max(1),
  notes:         z.string().max(800).optional(),
});

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;
export type ProfileHints = z.infer<typeof ProfileHintsSchema>;

const SYSTEM_PROMPT = `You are a resume parser for Pathway, a UCLA academic mentor tool.

Given a student's resume or LinkedIn paste, extract:
1. resume_kb — structured headline, summary, experiences (title/org/period/summary/tags), skills, raw_excerpt
2. profile_hints — best-guess year (freshman/sophomore/junior/senior), major_category (stem/humanities/social_science/undeclared), top interests (1–5 short slugs like "ai_ml", "design"), is_transfer (bool), horizons (1–10 where 1=this quarter, 10=10+ yrs), mode (directed/partial/discovery)
3. confidence — 0.0–1.0 how confident you are in the extraction
4. notes — short note flagging anything ambiguous

**Ethics rule**: Do NOT infer identity fields (first_gen, aid_status, communities). Leave those out. Also do NOT invent experiences not in the resume.

Return STRICT JSON only, no prose wrapping. Schema:
{
  "resume_kb": {
    "headline": string (max 200),
    "summary": string (max 600),
    "experiences": [{ "title": string, "org": string, "period": string?, "summary": string, "tags": string[] }],
    "skills": string[],
    "raw_excerpt": string? (max 2000)
  },
  "profile_hints": {
    "year": "freshman|sophomore|junior|senior"?,
    "major_category": "stem|humanities|social_science|undeclared"?,
    "interests": string[],
    "is_transfer": boolean?,
    "horizons": number (1-10)?,
    "mode": "directed|partial|discovery"?
  },
  "confidence": number,
  "notes": string?
}`;

export async function parseResume(
  text: string,
  signal: AbortSignal,
): Promise<ResumeParseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);

  const resp = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `<resume>\n${text.slice(0, 8000)}\n</resume>` }],
    },
    { signal: combined },
  );

  const block = resp.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned non-text content');
  }
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in Claude response');
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const r = ResumeParseResultSchema.safeParse(parsed);
  if (!r.success) {
    throw new Error(`Parse result failed validation: ${r.error.issues.map(i => i.message).join('; ')}`);
  }
  return r.data;
}

export function mergeHintsIntoProfile(
  existing: Partial<IntakeProfileV2>,
  hints: ProfileHints,
  resume_kb: ResumeKB,
): Partial<IntakeProfileV2> {
  return {
    ...existing,
    year:           existing.year           ?? hints.year,
    major_category: existing.major_category ?? hints.major_category,
    interests:      existing.interests?.length ? existing.interests : (hints.interests ?? []),
    is_transfer:    existing.is_transfer    ?? hints.is_transfer,
    horizons:       existing.horizons       ?? hints.horizons,
    mode:           existing.mode           ?? hints.mode,
    resume_kb,
  };
}
