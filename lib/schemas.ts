import { z } from 'zod';
import { STAGE_KEYS } from '@/lib/stages';

// Controlled vocabularies
export const TypeEnum = z.enum(['fellowship', 'research', 'club', 'program', 'advising', 'course', 'internship']);
export const MajorCategoryEnum = z.enum(['stem', 'humanities', 'social_science', 'undeclared']);
export const AidStatusEnum = z.enum(['pell', 'work_study', 'none']);
export const YearEnum = z.enum(['freshman', 'sophomore', 'junior', 'senior']);
export const ModeEnum = z.enum(['directed', 'partial', 'discovery']);

// Reusable contact sub-schema
export const ContactSchema = z.object({
  name: z.string(),
  role: z.string(),
  email_or_office: z.string(),
  url: z.string().url().optional(),
});

export const CiteSchema = z.object({
  label:   z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
  url:     z.string().url(),
});

export const StageKeyEnum = z.enum(STAGE_KEYS as unknown as [string, ...string[]]);

// Corpus item (single source of truth — forkers replicate for other schools)
export const CorpusItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: TypeEnum,
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), // ISO YYYY-MM-DD or null (rolling)
  eligibility: z.array(z.string()),
  tags: z.array(z.string()),
  path_tags: z.array(z.string()),
  prerequisite_tags: z.array(z.string()),
  unlocks_tags: z.array(z.string()),
  time_cost_hrs_per_week: z.number().min(0).max(40),
  upside: z.string().min(1),
  contact: ContactSchema,
  source_url: z.string().url(),
});

// First-layer seeds (hardcoded per major category; NOT Claude-generated)
export const FirstLayerSeedSchema = z.object({
  id: z.string().min(1),
  path_tag: z.string().regex(/^[a-z0-9_-]{2,24}$/),
  eyebrow: z.string().max(40),
  title: z.string(),
  description: z.string(),
  why_this_hint: z.string(),
  sample_downstream: z.array(z.string()).max(3),
  applies_to_majors: z.array(MajorCategoryEnum),
  applies_to_modes: z.array(ModeEnum),
});

// Intake profile from user
export const IntakeProfileSchema = z.object({
  year: YearEnum,
  major_category: MajorCategoryEnum,
  first_gen: z.boolean(),
  aid_status: AidStatusEnum,
  hours_per_week: z.number().int().min(0).max(40),
  interests: z.array(z.string()).min(1).max(3),
  mode: ModeEnum,
  end_goal: z.string().max(300).optional(),
});

// A single node in the pathway tree
export const NodeSchema = z.object({
  id: z.string().min(1),
  parent_id: z.string().nullable(),
  opportunity_id: z.string().nullable(),
  title: z.string().max(80),
  description: z.string(),
  why_this: z.string(),
  why_now: z.string(),
  todos: z.array(z.object({ text: z.string(), done: z.boolean() })).max(5),
  source_url: z.string().url().nullable(),
  human_contact: ContactSchema.nullable(),
  outreach_email_draft: z.object({
    subject: z.string().max(60),
    body: z.string().max(1200),
  }).nullable(),
  estimated_time_cost: z.string(),
  leads_to_tags: z.array(z.string()),
  stage_key: StageKeyEnum,
  eyebrow:   z.string().max(40),
  path_tag:  z.string().regex(/^[a-z0-9_-]{2,24}$/),
  cites:     z.array(CiteSchema).max(3),
});

// Path trace for server: compact summary of accumulated choices
export const PathTraceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  opportunity_id: z.string().nullable(),
});

// API request
export const ExpandRequestSchema = z.object({
  profile: IntakeProfileSchema,
  parent_id: z.string().nullable(),
  path_trace: z.array(PathTraceItemSchema),
  requestId: z.string().min(1),
  stage_key:       StageKeyEnum,
  parent_path_tag: z.string().nullable(),
});

// API response: discriminated union
export const ExpandResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    children: z.array(NodeSchema),
    dropped_count: z.number().int().min(0),
    epistemic_humility_block: z.string().optional(),
    requestId: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum(['validation_failed', 'timeout', 'api_error', 'zero_candidates', 'internal_error']),
    raw: z.string().optional(),
    requestId: z.string(),
  }),
]);

// Type exports
export type CorpusItem = z.infer<typeof CorpusItemSchema>;
export type FirstLayerSeed = z.infer<typeof FirstLayerSeedSchema>;
export type IntakeProfile = z.infer<typeof IntakeProfileSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type ExpandRequest = z.infer<typeof ExpandRequestSchema>;
export type ExpandResponse = z.infer<typeof ExpandResponseSchema>;
export type PathTraceItem = z.infer<typeof PathTraceItemSchema>;
export type Cite = z.infer<typeof CiteSchema>;
export type StageKeyType = z.infer<typeof StageKeyEnum>;
