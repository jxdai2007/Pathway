import { describe, it, expect } from 'vitest';
import { filterAndScore } from '@/lib/filter';
import type { CorpusItem, IntakeProfile } from '@/lib/schemas';

const corpus: CorpusItem[] = [
  { id: 'advising-a', title: 'Advising A', type: 'advising', deadline: null, eligibility: ['all'], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 1, upside: 'x', contact: { name: 'x', role: 'x', email_or_office: 'x' }, source_url: 'https://a.com' },
  { id: 'fel-sr-only', title: 'Senior Fellowship', type: 'fellowship', deadline: '2026-06-01', eligibility: ['year:senior'], tags: ['research'], path_tags: ['cs:ai_ml'], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 10, upside: 'x', contact: { name: 'x', role: 'x', email_or_office: 'x' }, source_url: 'https://b.com' },
];

const mayaProfile: IntakeProfile = { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' };

describe('filterAndScore', () => {
  it('excludes opportunities whose eligibility does not match user year', () => {
    const result = filterAndScore(corpus, mayaProfile, []);
    expect(result.map(r => r.id)).toContain('advising-a');
    expect(result.map(r => r.id)).not.toContain('fel-sr-only');
  });

  it('excludes opportunities whose time cost exceeds user hours/week', () => {
    const tight = { ...mayaProfile, hours_per_week: 5 };
    const result = filterAndScore(corpus, tight, []);
    expect(result.map(r => r.id)).not.toContain('fel-sr-only');
    expect(result.map(r => r.id)).toContain('advising-a');
  });

  it('returns at most 20 candidates sorted by score descending', () => {
    const big: CorpusItem[] = Array.from({ length: 30 }, (_, i) => ({ ...corpus[0], id: `item-${i}` }));
    const result = filterAndScore(big, mayaProfile, []);
    expect(result.length).toBe(20);
  });
});

import { filterChildren } from '@/lib/filter';

const base = {
  id: 'x', parent_id: null, opportunity_id: null, title: 'T',
  description: '', why_this: '', why_now: '', todos: [],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '2 hrs', leads_to_tags: [],
  stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [],
} as const;

describe('filterChildren — stage_key + cites', () => {
  it('drops nodes whose stage_key mismatches request', () => {
    const out = filterChildren([{ ...base, stage_key: 'summer' } as any], 'direction');
    expect(out.kept).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });
  it('drops nodes with invalid cite URL', () => {
    const bad = { ...base, cites: [{ label: 'x', summary: 'y', url: 'not-a-url' }] };
    const out = filterChildren([bad as any], 'direction');
    expect(out.kept).toHaveLength(0);
  });
  it('keeps a fully valid node', () => {
    const out = filterChildren([base as any], 'direction');
    expect(out.kept).toHaveLength(1);
  });
});
