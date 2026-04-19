'use client';
import { useMemo, useState, useEffect } from 'react';
import { usePathwayStore } from '@/store/pathway';
import { formatDeadline } from '@/lib/deadline';
import corpus from '@/data/ucla/opportunities.json';
import type { CorpusItem } from '@/lib/schemas';

const CORPUS = corpus as CorpusItem[];
const CORPUS_BY_ID: Record<string, CorpusItem> = Object.fromEntries(CORPUS.map((c) => [c.id, c]));

export function MissBanner() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const focusedSeedId = usePathwayStore((s) => s.focusedSeedId);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal when focus changes
  useEffect(() => { setDismissed(false); }, [focusedSeedId]);

  const miss = useMemo(() => {
    const visibleIds = new Set<string>();
    function walk(id: string) {
      if (!id || visibleIds.has(id)) return;
      const n = nodesById[id];
      if (!n) return;
      visibleIds.add(id);
      (n.children ?? []).forEach(walk);
    }
    // Walk from root, but if focused, only that subtree + root
    const root = nodesById['root'];
    if (!root) return null;
    visibleIds.add('root');
    if (focusedSeedId) walk(focusedSeedId); else root.children.forEach(walk);

    let best: { title: string; text: string } | null = null;
    for (const id of visibleIds) {
      const n = nodesById[id];
      const opp = n?.opportunity_id ? CORPUS_BY_ID[n.opportunity_id] : null;
      if (!opp?.deadline) continue;
      const { text, tone } = formatDeadline(opp.deadline);
      if (tone === 'urgent' && !best) best = { title: opp.title, text: text ?? 'soon' };
    }
    return best;
  }, [nodesById, focusedSeedId]);

  if (dismissed || !miss) return null;

  return (
    <div role="status" className="max-w-[1200px] mx-auto mb-4 rounded-md bg-urgent-bg border border-urgent/30 px-4 py-3 flex items-start gap-3 shadow-card">
      <div className="flex-1">
        <div className="text-tiny uppercase tracking-wider text-urgent font-semibold mb-1">What you&apos;re about to miss</div>
        <div className="text-h2 font-semibold text-ink">{miss.title}</div>
        <div className="text-body text-ink-2 mt-1">
          Closes <strong className="text-urgent">{miss.text}</strong>. If you skip it, the next comparable window is a quarter away.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-ink-3 hover:text-ink text-h1 leading-none px-2"
      >×</button>
    </div>
  );
}
