import { z } from 'zod';
import { STAGE_KEYS } from '@/lib/stages';

// Controlled vocabularies
export const TypeEnum = z.enum(['fellowship', 'research', 'club', 'program', 'advising', 'course', 'internship']);
export const MajorCategoryEnum = z.enum(['stem', 'humanities', 'social_science', 'undeclared']);
export const AidStatusEnum = z.enum(['pell', 'work_study', 'none']);
export const YearEnum = z.enum(['freshman', 'sophomore', 'junior', 'senior', 'grad']);
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

export const StageKeyEnum = z.enum(STAGE_KEYS);

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
  background: z.array(z.string()).optional(),
  name: z.string().max(80).optional(),
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

// ─────────────────────────────────────────────────────────
// Onboarding v2 additions — appended, fully additive
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

export const ResumeExperienceSchema = z.object({
  title:   z.string().max(120),
  org:     z.string().max(120),
  period:  z.string().max(40).optional(),
  summary: z.string().max(400),
  tags:    z.array(z.string().max(40)).max(10).default([]),
});

export const ResumeKBSchema = z.object({
  headline:    z.string().max(200),
  summary:     z.string().max(600),
  experiences: z.array(ResumeExperienceSchema).max(20),
  skills:      z.array(z.string().max(40)).max(30).default([]),
  raw_excerpt: z.string().max(2000).optional(),
});

export const IntakeProfileV2Ext = z.object({
  horizons:     HorizonsSchema.optional(),
  satisfaction: SatisfactionSchema.optional(),
  blocker:      BlockerEnum.optional(),
  communities:  z.array(CommunityTagEnum).max(6).optional(),
  pivot:        PivotSignalSchema.optional(),
  transfer:     TransferProfileSchema.optional(),
  is_transfer:  z.boolean().optional(),
  resume_kb:    ResumeKBSchema.optional(),
});

export const IntakeProfileV2Schema = IntakeProfileSchema.merge(IntakeProfileV2Ext);

export type Horizons         = z.infer<typeof HorizonsSchema>;
export type Satisfaction     = z.infer<typeof SatisfactionSchema>;
export type Blocker          = z.infer<typeof BlockerEnum>;
export type CommunityTag     = z.infer<typeof CommunityTagEnum>;
export type PivotSignal      = z.infer<typeof PivotSignalSchema>;
export type TransferProfile  = z.infer<typeof TransferProfileSchema>;
export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;
export type ResumeKB         = z.infer<typeof ResumeKBSchema>;
export type IntakeProfileV2  = z.infer<typeof IntakeProfileV2Schema>;
