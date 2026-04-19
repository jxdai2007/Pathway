import raw from '@/data/ucla/stage_fallbacks.json';
import type { Node } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';

type Template = Omit<Node, 'id' | 'parent_id' | 'stage_key' | 'leads_to_tags' | 'opportunity_id' | 'human_contact' | 'outreach_email_draft'> & {
  human_contact?: Node['human_contact'];
  outreach_email_draft?: Node['outreach_email_draft'];
};

const TEMPLATES = raw as Record<StageKey, Template[]>;

export function synthesizeFallback(stage_key: StageKey, parent_id: string | null): Node[] {
  const arr = TEMPLATES[stage_key];
  if (!arr || arr.length < 3) {
    throw new Error(`fallback: missing or insufficient templates for ${stage_key}`);
  }
  return arr.slice(0, 3).map((t, i) => ({
    id: `fb-${stage_key}-${i}`,
    parent_id,
    opportunity_id: null,
    title: t.title,
    description: t.description,
    why_this: t.why_this,
    why_now: t.why_now ?? 'Rolling — start now.',
    todos: t.todos,
    source_url: t.source_url ?? null,
    human_contact: t.human_contact ?? null,
    outreach_email_draft: t.outreach_email_draft ?? null,
    estimated_time_cost: t.estimated_time_cost,
    leads_to_tags: [],
    stage_key,
    eyebrow: t.eyebrow,
    path_tag: t.path_tag,
    cites: t.cites,
  }));
}
