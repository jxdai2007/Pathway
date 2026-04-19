import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const client = new Anthropic();

type Profile = {
  name?: string;
  year?: string;
  majorStatus?: string;
  interests?: string[];
  background?: string[];
  hoursPerWeek?: number;
  why?: string;
};

type Card = {
  title?: string;
  description?: string;
  why_this?: string;
  human_contact?: { name?: string; role?: string; email_or_office?: string; url?: string };
  source_url?: string;
  stage_key?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { profile?: Profile; card?: Card; kind?: 'email' | 'cover_letter' | 'auto' };
    const p = body.profile || {};
    const card = body.card;
    const kind = body.kind ?? 'auto';

    const who = [
      p.name ? `name: ${p.name}` : null,
      p.year ? `year: ${p.year}` : null,
      p.majorStatus ? `major status: ${p.majorStatus}` : null,
      p.interests?.length ? `interests: ${p.interests.join(', ')}` : null,
      p.background?.length ? `context: ${p.background.join(', ')}` : null,
      p.hoursPerWeek !== undefined ? `hours/week available: ${p.hoursPerWeek}` : null,
      p.why ? `motivation: ${p.why}` : null,
    ].filter(Boolean).join('\n');

    const cardContext = card ? [
      card.title ? `Opportunity title: ${card.title}` : null,
      card.description ? `Description: ${card.description}` : null,
      card.why_this ? `Why this fits the student: ${card.why_this}` : null,
      card.stage_key ? `Stage: ${card.stage_key}` : null,
      card.human_contact?.name ? `Contact name: ${card.human_contact.name}` : null,
      card.human_contact?.role ? `Contact role: ${card.human_contact.role}` : null,
      card.human_contact?.email_or_office ? `Contact info: ${card.human_contact.email_or_office}` : null,
      card.source_url ? `Reference URL: ${card.source_url}` : null,
    ].filter(Boolean).join('\n') : null;

    // Determine which drafts to produce
    const wantEmail = kind === 'email' || kind === 'auto';
    const wantCoverLetter = kind === 'cover_letter' || kind === 'auto';
    const wantCold = kind === 'auto' && !card; // only for generic (no card) requests

    const outputShape = JSON.stringify({
      ...(wantEmail ? { research_intro_email: { subject: '<=60 chars', body: '<=1200 chars plain text' } } : {}),
      ...(wantCoverLetter ? { cover_letter: { title: 'cover letter title', body: '<=1600 chars plain text' } } : {}),
      ...(wantCold ? { cold_outreach_email: { subject: '<=60 chars', body: '<=1000 chars plain text' } } : {}),
    }, null, 2);

    const cardInstructions = card ? `
OPPORTUNITY:
${cardContext}

Tailor every draft specifically to this opportunity. If a human contact is provided, address them by name and role. Reference the specific title and context of this opportunity.
- research_intro_email: Address it directly to the contact (or PI/manager) for this specific opportunity; ask for a 15-min conversation about it.
- cover_letter: Tailor the opening and closing to this specific opportunity; reference why the student is a fit based on the card's description.
` : `
- research_intro_email: addressed to a UCLA PI or lab manager; asks for a 15-min conversation.
- cover_letter: a generic-but-strong template the student can tailor to any internship — reference one or two of their interests explicitly.
- cold_outreach_email: addressed to an alum or industry contact; short, specific, ends with a concrete ask.`;

    const prompt = `You are a writing coach helping an undergraduate draft outreach. Given the student below, produce first-person draft(s) the student can copy-paste and lightly edit. Adapt the tone to the student's profile (pre-med vs CS vs humanities etc.). Keep each draft tight and honest — no filler, no purple prose.

STUDENT:
${who}
${cardInstructions}

Output strict JSON, no markdown fences, shape:
${outputShape}

Rules:
- Use the student's actual name if given. Otherwise use first-person ("I").
- No hallucinated credentials, GPAs, or projects. Reference only what the profile and opportunity state.
- Plain text, no markdown formatting inside the body fields.`;

    const resp = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = resp.content.map((b: unknown) => (b as { type: string; text?: string }).type === 'text' ? ((b as { text: string }).text) : '').join('').trim();
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e <= s) return NextResponse.json({ ok: false, error: 'no_json', raw: text.slice(0, 500) }, { status: 502 });
    const drafts = JSON.parse(text.slice(s, e + 1));
    return NextResponse.json({ ok: true, drafts });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
