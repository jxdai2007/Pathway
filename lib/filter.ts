import type { CorpusItem, IntakeProfile, PathTraceItem } from './schemas';

type Scored = CorpusItem & { _score: number };

function urgencyScore(deadline: string | null): number {
  if (!deadline) return 0;
  const days = (new Date(deadline).getTime() - Date.now()) / 86_400_000;
  if (days <= 14) return 1;
  if (days <= 30) return 0.6;
  if (days <= 60) return 0.3;
  return 0;
}

function fitScore(itemTags: string[], userInterests: string[]): number {
  const overlap = itemTags.filter(t => userInterests.includes(t)).length;
  return Math.min(overlap / Math.max(userInterests.length, 1), 1);
}

function upsideWeight(type: CorpusItem['type']): number {
  if (type === 'fellowship' || type === 'research') return 1;
  if (type === 'program' || type === 'internship') return 0.7;
  return 0.5;
}

function effortPenalty(itemHours: number, userHours: number): number {
  return Math.min(itemHours / Math.max(userHours, 1), 1);
}

export function filterAndScore(
  corpus: CorpusItem[],
  profile: IntakeProfile,
  _pathTrace: PathTraceItem[]
): Scored[] {
  const candidates: Scored[] = [];
  for (const item of corpus) {
    const yearTag = `year:${profile.year}`;
    const hasYear = item.eligibility.includes('all') || item.eligibility.includes(yearTag) || item.eligibility.includes('year:all') || !item.eligibility.some(e => e.startsWith('year:'));
    const majorTag = `major:${profile.major_category}`;
    const hasMajor = item.eligibility.includes('all') || item.eligibility.includes(majorTag) || item.eligibility.includes('major:all') || !item.eligibility.some(e => e.startsWith('major:'));
    const aidTag = `aid:${profile.aid_status}`;
    const hasAid = item.eligibility.includes('all') || item.eligibility.includes(aidTag) || !item.eligibility.some(e => e.startsWith('aid:'));
    if (!hasYear || !hasMajor || !hasAid) continue;
    if (item.time_cost_hrs_per_week > profile.hours_per_week) continue;
    const score =
      3 * urgencyScore(item.deadline) +
      2 * fitScore(item.tags, profile.interests) +
      upsideWeight(item.type) -
      effortPenalty(item.time_cost_hrs_per_week, profile.hours_per_week);
    candidates.push({ ...item, _score: score });
  }
  candidates.sort((a, b) => b._score - a._score);
  return candidates.slice(0, 20);
}
