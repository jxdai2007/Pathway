import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { IntakeProfileV2 } from '@/lib/schemas';
import { formatStudentContext } from '@/lib/student-context';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const TIMEOUT_MS = 25_000;

export const DraftMessageInputSchema = z.object({
  type: z.enum(['email', 'cover_letter']),
  node: z.object({
    title:       z.string().max(200),
    description: z.string().max(800).optional(),
    why_this:    z.string().max(600).optional(),
    eyebrow:     z.string().max(40).optional(),
    human_contact: z.object({
      name:            z.string(),
      role:            z.string(),
      email_or_office: z.string(),
    }).nullable().optional(),
  }),
});

export const DraftEmailSchema = z.object({
  subject: z.string().max(100),
  body:    z.string().max(2000),
});
export const DraftCoverLetterSchema = z.object({
  body: z.string().max(3000),
});

export type DraftMessageInput = z.infer<typeof DraftMessageInputSchema>;
export type DraftEmail        = z.infer<typeof DraftEmailSchema>;
export type DraftCoverLetter  = z.infer<typeof DraftCoverLetterSchema>;

const SYSTEM_EMAIL = `You draft warm, concise outreach emails from an undergraduate to a professor, research coordinator, or program staff member.

Voice: direct, specific, student-respectful. No over-formality. No corporate fluff. Mention ONE concrete experience from the student's resume (if provided) to ground the request. Close with a specific ask (15-min chat, office hours, next step) and a short thank-you.

Length: 120–180 words in body. Subject ≤ 80 chars.

Return STRICT JSON ONLY: { "subject": string, "body": string }`;

const SYSTEM_COVER_LETTER = `You draft cover letters from an undergraduate for a UCLA fellowship, research program, or internship.

Voice: confident but student-honest. Show specific evidence from the resume — not adjectives. Open with a concrete hook tying the student's experience to the opportunity. Middle paragraph names 2 specific experiences with outcomes. Close with a one-sentence ask that fits the program.

Length: 280–380 words. First person. Single-paragraph spacing.

Return STRICT JSON ONLY: { "body": string }`;

export async function draftMessage(
  input: DraftMessageInput,
  profile: IntakeProfileV2,
  signal: AbortSignal,
): Promise<DraftEmail | DraftCoverLetter> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);

  const system = input.type === 'email' ? SYSTEM_EMAIL : SYSTEM_COVER_LETTER;
  const contactLine = input.node.human_contact
    ? `\n<target>\n  name: ${input.node.human_contact.name}\n  role: ${input.node.human_contact.role}\n  contact: ${input.node.human_contact.email_or_office}\n</target>`
    : '\n<target>\n  (no specific contact — address to "Program Director" or coordinator)\n</target>';

  const user = [
    `<opportunity>`,
    `  title: ${input.node.title}`,
    input.node.eyebrow     ? `  stage: ${input.node.eyebrow}` : '',
    input.node.description ? `  description: ${input.node.description}` : '',
    input.node.why_this    ? `  why_relevant: ${input.node.why_this}` : '',
    `</opportunity>`,
    contactLine,
    formatStudentContext(profile),
    input.type === 'email'
      ? 'Draft the outreach email now. Return only the JSON object.'
      : 'Draft the cover letter now. Return only the JSON object.',
  ].filter(Boolean).join('\n');

  const resp = await client.messages.create(
    {
      model: MODEL,
      max_tokens: input.type === 'email' ? 800 : 1400,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    },
    { signal: combined },
  );

  const block = resp.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned non-text content');
  }
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in Claude response: ${block.text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const schema = input.type === 'email' ? DraftEmailSchema : DraftCoverLetterSchema;
  const r = schema.safeParse(parsed);
  if (!r.success) {
    throw new Error(`Draft validation failed: ${r.error.issues.map(i => i.message).join('; ')}`);
  }
  return r.data;
}
