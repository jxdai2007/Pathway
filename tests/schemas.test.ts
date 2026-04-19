import { describe, it, expect } from 'vitest';
import {
  CorpusItemSchema,
  FirstLayerSeedSchema,
  IntakeProfileSchema,
  ExpandRequestSchema,
  ExpandResponseSchema,
  NodeSchema,
} from '@/lib/schemas';

describe('CorpusItemSchema', () => {
  it('accepts a valid corpus item', () => {
    const valid = {
      id: 'urc-care-summer',
      title: 'URC-CARE Summer Research',
      type: 'research',
      deadline: '2026-05-15',
      eligibility: ['year:freshman', 'year:sophomore', 'major:all'],
      tags: ['ai_ml', 'research', 'first-gen-support'],
      path_tags: ['cs:ai_ml', 'cs:research'],
      prerequisite_tags: [],
      unlocks_tags: ['ready:phd_app'],
      time_cost_hrs_per_week: 10,
      upside: 'Paid research w/ faculty mentor + conference opportunity',
      contact: { name: 'URC-CARE Office', role: 'Research Advisor', email_or_office: 'care@college.ucla.edu', url: 'https://www.ugresearch.ucla.edu/care' },
      source_url: 'https://www.ugresearch.ucla.edu/care',
    };
    expect(() => CorpusItemSchema.parse(valid)).not.toThrow();
  });

  it('rejects a rolling deadline as a string (must be ISO date or null)', () => {
    const invalid = { id: 'x', title: 'x', type: 'club', deadline: 'rolling', eligibility: [], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 0, upside: 'x', contact: { name: 'x', role: 'x', email_or_office: 'x' }, source_url: 'https://example.com' };
    expect(() => CorpusItemSchema.parse(invalid)).toThrow();
  });

  it('accepts null deadline for rolling items', () => {
    const valid = { id: 'x', title: 'x', type: 'club', deadline: null, eligibility: ['year:all'], tags: [], path_tags: [], prerequisite_tags: [], unlocks_tags: [], time_cost_hrs_per_week: 2, upside: 'x', contact: { name: 'x', role: 'x', email_or_office: 'x' }, source_url: 'https://example.com' };
    expect(() => CorpusItemSchema.parse(valid)).not.toThrow();
  });
});

describe('IntakeProfileSchema', () => {
  it('caps end_goal at 300 chars', () => {
    const tooLong = { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' as const, end_goal: 'x'.repeat(301) };
    expect(() => IntakeProfileSchema.parse(tooLong)).toThrow();
  });

  it('accepts minimal discovery-mode intake without end_goal', () => {
    const valid = { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' as const };
    expect(() => IntakeProfileSchema.parse(valid)).not.toThrow();
  });
});

describe('ExpandResponseSchema discriminated union', () => {
  it('accepts ok:true with children', () => {
    const valid = { ok: true as const, children: [], dropped_count: 0, requestId: 'req-1' };
    expect(() => ExpandResponseSchema.parse(valid)).not.toThrow();
  });

  it('accepts ok:false with error enum', () => {
    const valid = { ok: false as const, error: 'timeout' as const, requestId: 'req-1' };
    expect(() => ExpandResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects ok:false without error field', () => {
    const invalid = { ok: false as const, requestId: 'req-1' };
    expect(() => ExpandResponseSchema.parse(invalid)).toThrow();
  });
});
