import { describe, it, expect } from 'vitest';
import {
  rotationFor, seedFor, composeRootSub, synthesizeTodos, buildPathTrace, resolveStage1Options,
} from '@/lib/notebook-engine';
import type { IntakeProfile, Node, FirstLayerSeed } from '@/lib/schemas';

const baseProfile: IntakeProfile = {
  year: 'freshman', major_category: 'stem', first_gen: true,
  aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery',
};

const mk = (id: string): Node => ({
  id, parent_id: null, opportunity_id: null, title: `T-${id}`,
  description: '', why_this: '', why_now: '', todos: [],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '2 hrs · admin', leads_to_tags: [],
  stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [],
});

describe('rotationFor', () => {
  it('is deterministic', () => {
    expect(rotationFor('node-1')).toBe(rotationFor('node-1'));
  });
  it('varies across keys', () => {
    expect(rotationFor('a')).not.toBe(rotationFor('b'));
  });
  it('stays within amplitude', () => {
    for (let i = 0; i < 50; i++) {
      const v = rotationFor(`k-${i}`, 2);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(2);
    }
  });
});

describe('seedFor', () => {
  it('is deterministic', () => {
    expect(seedFor('x')).toBe(seedFor('x'));
  });
  it('returns integers', () => {
    const s = seedFor('y');
    expect(Number.isInteger(s)).toBe(true);
  });
});

describe('composeRootSub', () => {
  it('includes year + first-gen + major', () => {
    const s = composeRootSub(baseProfile);
    expect(s).toContain('Freshman');
    expect(s).toContain('First-gen');
    expect(s.toLowerCase()).toContain('stem');
  });
  it('omits first-gen when false', () => {
    const s = composeRootSub({ ...baseProfile, first_gen: false });
    expect(s).not.toContain('First-gen');
  });
});

describe('synthesizeTodos', () => {
  const n = { ...mk('x'), estimated_time_cost: '4 hrs · research' } as Node;
  it('stage 0 adds advisor-meeting todo', () => {
    const t = synthesizeTodos(n, 0);
    expect(t.some((x) => /advisor|counselor/i.test(x.text))).toBe(true);
  });
  it('stage 3 adds mentor email todo', () => {
    const t = synthesizeTodos(n, 3);
    expect(t.some((x) => /mentor/i.test(x.text))).toBe(true);
  });
  it('respects max 5', () => {
    const t = synthesizeTodos(n, 0);
    expect(t.length).toBeLessThanOrEqual(5);
  });
});

describe('buildPathTrace', () => {
  it('maps locked IDs to path trace items', () => {
    const nodesById = { a: mk('a'), b: mk('b') };
    const trace = buildPathTrace(['a', 'b'], nodesById as any);
    expect(trace.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('resolveStage1Options', () => {
  const seeds: FirstLayerSeed[] = [
    { id: 's1', title: 'A', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'ai', eyebrow: 'Direction' } as any,
    { id: 's2', title: 'B', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'build', eyebrow: 'Direction' } as any,
    { id: 's3', title: 'C', description: '', applies_to_majors: ['stem'], applies_to_modes: ['discovery'], path_tag: 'explore', eyebrow: 'Direction' } as any,
  ];
  it('returns seeds when >=3 match', () => {
    const r = resolveStage1Options(seeds, baseProfile);
    expect(r.kind).toBe('seeds');
  });
  it('returns claude when <3 match', () => {
    const r = resolveStage1Options(seeds, { ...baseProfile, major_category: 'humanities' });
    expect(r.kind).toBe('claude');
  });
});
