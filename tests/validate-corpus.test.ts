import { describe, it, expect } from 'vitest';
import { validateCorpus, assertAdvisingFallbackPool } from '@/lib/validate-corpus';
import corpus from '@/data/ucla/opportunities.json';
import seeds from '@/data/ucla/first_layer_seeds.json';

describe('validateCorpus', () => {
  it('every opportunity parses against CorpusItemSchema', () => {
    const result = validateCorpus(corpus);
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
  });

  it('every first-layer seed parses against FirstLayerSeedSchema', () => {
    const result = validateCorpus(seeds, { kind: 'seeds' });
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
  });

  it('all opportunity IDs are unique', () => {
    const ids = new Set();
    for (const item of corpus as any[]) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
  });
});

describe('advising fallback pool', () => {
  it('contains at least 3 items with eligibility=["all"] AND type="advising"', () => {
    expect(() => assertAdvisingFallbackPool(corpus as any)).not.toThrow();
  });
});
