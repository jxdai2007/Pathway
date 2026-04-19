import type { CorpusItem, IntakeProfile, Node } from './schemas';

type BuildArgs = { corpus: CorpusItem[]; profile: IntakeProfile; parentId: string };

export function buildFallbackChildren(args: BuildArgs): Node[] {
  const advising = args.corpus
    .filter(c => c.eligibility.includes('all'))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 3);

  return advising.map((item) => ({
    id: `fb-${item.id}-${args.parentId}`,
    parent_id: args.parentId,
    opportunity_id: item.id,
    title: item.title,
    description: item.upside,
    why_this: `A safe starting point while you narrow your focus. ${item.upside}`,
    why_now: `No deadline pressure — walk in this week and get oriented.`,
    todos: [
      { text: `Check ${item.contact.name} hours and drop in`, done: false },
      { text: `Bring 2 questions about your major/path`, done: false },
    ],
    source_url: item.source_url,
    human_contact: item.contact,
    outreach_email_draft: null,
    estimated_time_cost: `${item.time_cost_hrs_per_week} hr one-time`,
    leads_to_tags: item.unlocks_tags,
  }));
}
