import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const client = new Anthropic();

type Card = {
  title?: string;
  description?: string;
  why_this?: string;
  human_contact?: { name?: string; role?: string; email_or_office?: string; url?: string };
  stage_key?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { card?: Card };
    const card = body.card || {};

    const cardText = [
      card.title ? `Title: ${card.title}` : null,
      card.description ? `Description: ${card.description}` : null,
      card.why_this ? `Why this: ${card.why_this}` : null,
      card.stage_key ? `Stage: ${card.stage_key}` : null,
      card.human_contact ? `Has human contact: yes` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Does this academic/career opportunity card require the student to email or reach out to a specific human — such as a professor (PI), advisor, mentor, hiring manager, program director, alumni, or office staff? Answer yes only if direct human outreach (email, office visit, personal contact) is a meaningful part of pursuing this opportunity.

CARD:
${cardText}

Respond with strict JSON only, no markdown fences:
{"offer": true/false, "reason": "one short sentence explaining why or why not"}`;

    // Use AbortSignal.timeout for 2.5s max; fail-open if slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const resp = await client.messages.create(
        {
          model: 'claude-opus-4-7',
          max_tokens: 80,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const text = resp.content
        .map((b: unknown) => (b as { type: string; text?: string }).type === 'text' ? (b as { text: string }).text : '')
        .join('')
        .trim();

      const s = text.indexOf('{');
      const e = text.lastIndexOf('}');
      if (s < 0 || e <= s) {
        // fail-open
        return NextResponse.json({ ok: true, offer: true, reason: 'Could not parse AI response; defaulting to offer.' });
      }

      const parsed = JSON.parse(text.slice(s, e + 1));
      return NextResponse.json({ ok: true, offer: Boolean(parsed.offer), reason: parsed.reason ?? '' });
    } catch {
      clearTimeout(timeoutId);
      // fail-open on timeout or API error
      return NextResponse.json({ ok: true, offer: true, reason: 'AI check unavailable; defaulting to offer.' });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // fail-open on parse error etc.
    return NextResponse.json({ ok: true, offer: true, reason: msg });
  }
}
