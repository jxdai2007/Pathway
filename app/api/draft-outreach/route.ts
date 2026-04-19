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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { profile?: Profile };
    const p = body.profile || {};
    const who = [
      p.name ? `name: ${p.name}` : null,
      p.year ? `year: ${p.year}` : null,
      p.majorStatus ? `major status: ${p.majorStatus}` : null,
      p.interests?.length ? `interests: ${p.interests.join(', ')}` : null,
      p.background?.length ? `context: ${p.background.join(', ')}` : null,
      p.hoursPerWeek !== undefined ? `hours/week available: ${p.hoursPerWeek}` : null,
      p.why ? `motivation: ${p.why}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are a writing coach helping an undergraduate draft outreach. Given the student below, produce exactly THREE first-person drafts the student can copy-paste and lightly edit. Adapt the tone to the student's profile (pre-med vs CS vs humanities etc.). Keep each draft tight and honest — no filler, no purple prose.

STUDENT:
${who}

Output strict JSON, no markdown fences, shape:
{
  "research_intro_email": { "subject": "<=60 chars", "body": "<=1200 chars plain text" },
  "cover_letter":         { "title": "Generic cover letter (copy + tailor)", "body": "<=1600 chars plain text" },
  "cold_outreach_email":  { "subject": "<=60 chars", "body": "<=1000 chars plain text" }
}

Rules:
- research_intro_email: addressed to a UCLA PI or lab manager; asks for a 15-min conversation.
- cover_letter: a generic-but-strong template the student can tailor to any internship — reference one or two of their interests explicitly.
- cold_outreach_email: addressed to an alum or industry contact; short, specific, ends with a concrete ask.
- Use the student's actual name if given. Otherwise use first-person ("I").
- No hallucinated credentials, GPAs, or projects. Reference only what the profile states.
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
