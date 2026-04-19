import { validateCorpus, assertAdvisingFallbackPool } from '../lib/validate-corpus';
import corpus from '../data/ucla/opportunities.json';
import seeds from '../data/ucla/first_layer_seeds.json';

const opps = validateCorpus(corpus);
if (!opps.ok) {
  console.error('❌ opportunities.json failed validation:');
  opps.errors.forEach(e => console.error(`  [${e.index}] ${e.message}`));
  process.exit(1);
}
console.log(`✅ opportunities.json: ${(corpus as unknown[]).length} items valid`);

const s = validateCorpus(seeds, { kind: 'seeds' });
if (!s.ok) {
  console.error('❌ first_layer_seeds.json failed validation:');
  s.errors.forEach(e => console.error(`  [${e.index}] ${e.message}`));
  process.exit(1);
}
console.log(`✅ first_layer_seeds.json: ${(seeds as unknown[]).length} items valid`);

try {
  assertAdvisingFallbackPool(corpus as never);
  console.log('✅ advising fallback pool: >= 3 items');
} catch (e: any) {
  console.error(`❌ ${e.message}`);
  process.exit(1);
}
