import { CorpusItem, CorpusItemSchema, FirstLayerSeedSchema } from './schemas';

export type ValidateResult =
  | { ok: true }
  | { ok: false; errors: Array<{ index: number; message: string }> };

export function validateCorpus(
  data: unknown,
  opts: { kind?: 'corpus' | 'seeds' } = { kind: 'corpus' }
): ValidateResult {
  if (!Array.isArray(data)) return { ok: false, errors: [{ index: -1, message: 'Root is not an array' }] };

  const schema = opts.kind === 'seeds' ? FirstLayerSeedSchema : CorpusItemSchema;
  const errors: Array<{ index: number; message: string }> = [];

  data.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      errors.push({ index, message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
    }
  });

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** Throws if the advising-pool invariant is violated. Used at startup + in tests. */
export function assertAdvisingFallbackPool(corpus: CorpusItem[]): void {
  const advising = corpus.filter(item => item.eligibility.includes('all') && item.type === 'advising');
  if (advising.length < 3) {
    throw new Error(
      `Advising fallback pool has ${advising.length} items; minimum 3 required (eligibility must include "all" AND type must be "advising"). ` +
      `This pool is the zero-candidate safety net — without it, the tree can return empty children on restrictive profiles.`
    );
  }
}
