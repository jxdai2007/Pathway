import type { IntakeProfile, Node, PathTraceItem, FirstLayerSeed } from '@/lib/schemas';
import type { StageKey } from '@/lib/stages';
import { STAGES, STAGE_KEYS, STAGE_EYEBROW, stageIdxOfKey, keyOfStageIdx } from '@/lib/stages';

export { STAGES, STAGE_KEYS, STAGE_EYEBROW, stageIdxOfKey, keyOfStageIdx };
export type { StageKey };

// Deterministic 32-bit integer seed from a string key.
export function seedFor(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Deterministic rotation in [-amplitude, +amplitude].
export function rotationFor(key: string, amplitudeDeg = 1.2): number {
  const s = seedFor(key);
  const unit = ((s % 2000) / 1000) - 1; // [-1, 1)
  return Math.max(-amplitudeDeg, Math.min(amplitudeDeg, unit * amplitudeDeg));
}

const YEAR_LABEL: Record<IntakeProfile['year'], string> = {
  freshman: 'Freshman', sophomore: 'Sophomore', junior: 'Junior', senior: 'Senior',
};
const MAJOR_LABEL: Record<IntakeProfile['major_category'], string> = {
  stem: 'STEM', humanities: 'Humanities', social_science: 'Social Science', undeclared: 'Undeclared',
};

export function composeRootSub(profile: IntakeProfile): string {
  const parts = [YEAR_LABEL[profile.year]];
  if (profile.first_gen) parts.push('First-gen');
  const interestLead = profile.interests[0]?.replace(/_/g, '/') ?? '';
  parts.push(`${MAJOR_LABEL[profile.major_category]}${interestLead ? ` + ${interestLead}` : ''} curious`);
  return parts.join(' · ');
}

export function synthesizeTodos(node: Node, stageIdx: number) {
  if (node.todos.length > 0) return node.todos.slice(0, 5);
  const out: { text: string; done: boolean }[] = [];
  if (node.estimated_time_cost) {
    out.push({ text: `Block ${node.estimated_time_cost.split('·')[0].trim()} on schedule`, done: false });
  }
  const perStage = [
    'Book a College advisor / AAP counselor meeting',
    'Find the General Meeting date + RSVP',
    'Draft application / intro email',
    'Email 3 potential mentors / PIs this week',
    'Write a 1-line progress note each Friday',
  ];
  out.push({ text: perStage[stageIdx] ?? perStage[perStage.length - 1], done: false });
  return out.slice(0, 5);
}

export function buildPathTrace(
  lockedNodeIds: string[], nodesById: Record<string, Node>
): PathTraceItem[] {
  return lockedNodeIds
    .map((id) => nodesById[id])
    .filter(Boolean)
    .map((n) => ({ id: n.id, title: n.title, opportunity_id: n.opportunity_id ?? null }));
}

export type Stage1Result =
  | { kind: 'seeds'; seeds: FirstLayerSeed[] }
  | { kind: 'claude' };

export function resolveStage1Options(
  seeds: FirstLayerSeed[], profile: IntakeProfile
): Stage1Result {
  const filtered = seeds.filter(
    (s) => s.applies_to_majors.includes(profile.major_category) &&
           s.applies_to_modes.includes(profile.mode)
  );
  if (filtered.length >= 3) return { kind: 'seeds', seeds: filtered.slice(0, 4) };
  return { kind: 'claude' };
}
