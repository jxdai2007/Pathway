import { NextRequest, NextResponse } from 'next/server';
import { draftMessage, DraftMessageInputSchema } from '@/lib/draft-message';
import { IntakeProfileV2Schema } from '@/lib/schemas';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const body = raw as { type?: unknown; node?: unknown; profile?: unknown };
  const input = DraftMessageInputSchema.safeParse({ type: body.type, node: body.node });
  if (!input.success) {
    return NextResponse.json(
      { ok: false, error: 'bad_input', issues: input.error.issues },
      { status: 400 },
    );
  }
  const profile = IntakeProfileV2Schema.safeParse(body.profile);
  if (!profile.success) {
    return NextResponse.json(
      { ok: false, error: 'bad_profile', issues: profile.error.issues },
      { status: 400 },
    );
  }

  const ctrl = new AbortController();
  try {
    const draft = await draftMessage(input.data, profile.data, ctrl.signal);
    return NextResponse.json({ ok: true, type: input.data.type, draft });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('[draft-message] error', err);
    return NextResponse.json(
      { ok: false, error: 'draft_failed', message: err.message ?? 'unknown' },
      { status: 500 },
    );
  }
}
