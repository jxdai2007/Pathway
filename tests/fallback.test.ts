import { describe, it, expect } from 'vitest';
import { synthesizeFallback } from '@/lib/fallback';
import { NodeSchema } from '@/lib/schemas';
import { STAGE_KEYS } from '@/lib/stages';

describe('synthesizeFallback', () => {
  for (const key of STAGE_KEYS) {
    it(`${key}: returns 3 valid children`, () => {
      const out = synthesizeFallback(key, 'parent-id');
      expect(out).toHaveLength(3);
      for (const n of out) {
        const parsed = NodeSchema.safeParse(n);
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
        expect(n.stage_key).toBe(key);
        expect(n.parent_id).toBe('parent-id');
        expect(n.cites.length).toBeGreaterThanOrEqual(1);
      }
    });
  }
});
