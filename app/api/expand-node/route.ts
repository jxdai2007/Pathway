export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { ExpandRequestSchema, ExpandResponseSchema } from '@/lib/schemas';
import { buildSystemPrompt, callClaudeExpand } from '@/lib/claude';
import { filterChildren } from '@/lib/filter';
import { synthesizeFallback } from '@/lib/fallback';

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'validation_failed', requestId: '' }, { status: 400 });
  }
  const parsed = ExpandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', requestId: (body as any)?.requestId ?? '' },
      { status: 400 }
    );
  }
  const { profile, stage_key, parent_path_tag, parent_id, path_trace, requestId } = parsed.data;

  try {
    const system = buildSystemPrompt({ profile, stage_key, parent_path_tag, path_trace });
    const user = `Expand stage: ${stage_key}. Parent path tag: ${parent_path_tag ?? 'none'}.`;
    const controller = new AbortController();
    const rawText = await callClaudeExpand({ system, user }, controller.signal);

    let json: any;
    try {
      const cleaned = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
      json = JSON.parse(cleaned);
    } catch {
      throw new Error('parse_error');
    }

    const rawChildren = Array.isArray(json?.children) ? json.children : [];
    const { kept, dropped } = filterChildren(rawChildren, stage_key);
    if (kept.length === 3) {
      return NextResponse.json(ExpandResponseSchema.parse({
        ok: true, children: kept, dropped_count: dropped, requestId,
      }));
    }
  } catch { /* fall through to fallback */ }

  const fallback = synthesizeFallback(stage_key, parent_id);
  return NextResponse.json(ExpandResponseSchema.parse({
    ok: true,
    children: fallback,
    dropped_count: 0,
    epistemic_humility_block: 'Backup plan — live data unavailable.',
    requestId,
  }));
}
