export const STAGE_KEYS = ['direction', 'community', 'signal', 'summer', 'capstone'] as const;
export type StageKey = typeof STAGE_KEYS[number];

export const STAGE_EYEBROW: Record<StageKey, string> = {
  direction: 'Direction',
  community: 'Community',
  signal:    'Signal',
  summer:    'Summer',
  capstone:  'Capstone',
};

export const STAGES = [
  { key: 'direction', stage: 'Stage 1 · Declare a direction', when: 'Month 1–2 · Fall 2026',           prompt: 'Pick your starting direction' },
  { key: 'community', stage: 'Stage 2 · Find your people',    when: 'Month 2–4 · Fall/Winter 2026',    prompt: 'Pick your first community' },
  { key: 'signal',    stage: 'Stage 3 · Build signal',        when: 'Winter/Spring 2027',              prompt: 'Earn your first credential' },
  { key: 'summer',    stage: 'Stage 4 · Summer',              when: 'Summer 2027',                     prompt: 'Pick your sophomore summer' },
  { key: 'capstone',  stage: 'Stage 5 · Year 2 capstone',     when: 'Fall 2027–Spring 2028',           prompt: 'Set your year-2 bet' },
] as const;

export function stageIdxOfKey(k: StageKey): number {
  return STAGE_KEYS.indexOf(k);
}
export function keyOfStageIdx(i: number): StageKey {
  return STAGE_KEYS[i];
}
