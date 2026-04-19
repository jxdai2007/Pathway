import { describe, it, expect } from 'vitest';
import { buildFallbackChildren } from '@/lib/fallback';
import type { CorpusItem, IntakeProfile } from '@/lib/schemas';

const corpus: CorpusItem[] = [
  { id: 'advising-a', title: 'Advising A', type: 'advising', deadline: null, eligibility: ['all'], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 1, upside: 'Walk in, get advice on declaring your major.', contact: { name: 'X', role: 'Advisor', email_or_office: 'campus', url: 'https://a.com' }, source_url: 'https://a.com' },
  { id: 'advising-b', title: 'Advising B', type: 'advising', deadline: null, eligibility: ['all'], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 1, upside: 'Resume help.', contact: { name: 'Y', role: 'Coach', email_or_office: 'campus', url: 'https://b.com' }, source_url: 'https://b.com' },
  { id: 'advising-c', title: 'Advising C', type: 'advising', deadline: null, eligibility: ['all'], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 1, upside: 'Essay coaching.', contact: { name: 'Z', role: 'Coach', email_or_office: 'campus', url: 'https://c.com' }, source_url: 'https://c.com' },
];

const profile: IntakeProfile = { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' };

describe('buildFallbackChildren', () => {
  it('returns 2-3 advising-pool children', () => {
    const children = buildFallbackChildren({ corpus, profile, parentId: 'root' });
    expect(children.length).toBeGreaterThanOrEqual(2);
    expect(children.length).toBeLessThanOrEqual(3);
  });
  it('every child references a real corpus item', () => {
    const children = buildFallbackChildren({ corpus, profile, parentId: 'root' });
    const ids = new Set(corpus.map(c => c.id));
    for (const child of children) expect(ids.has(child.opportunity_id!)).toBe(true);
  });
  it('every child has a source_url', () => {
    const children = buildFallbackChildren({ corpus, profile, parentId: 'root' });
    for (const child of children) expect(child.source_url).toMatch(/^https?:\/\//);
  });
});
