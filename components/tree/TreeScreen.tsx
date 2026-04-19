'use client';
import { useEffect, useMemo, useCallback } from 'react';
import seedsJson from '@/data/ucla/first_layer_seeds.json';
import type { FirstLayerSeed, Node as PathwayNode, ExpandResponse } from '@/lib/schemas';
import { useProfileStore } from '@/store/profile';
import { usePathwayStore } from '@/store/pathway';
import { TreeCanvas } from './TreeCanvas';
import { MissBanner } from './MissBanner';
import type { TreeUINode, PathColor, LaidOutNode } from '@/lib/tree-layout';

const PATH_COLORS: PathColor[] = ['blue', 'gold', 'slate'];

async function callExpand(
  parentId: string,
  profile: unknown,
  pathTrace: unknown[],
  requestId: string,
  signal: AbortSignal
): Promise<ExpandResponse> {
  const resp = await fetch('/api/expand-node', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile, parent_id: parentId, path_trace: pathTrace, requestId }),
    signal,
  });
  return resp.json();
}

export function TreeScreen() {
  const profile = useProfileStore((s) => s.profile);
  const nodesById = usePathwayStore((s) => s.nodesById);
  const selectedId = usePathwayStore((s) => s.selectedId);
  const focusedSeedId = usePathwayStore((s) => s.focusedSeedId);
  const setSelected = usePathwayStore((s) => s.setSelected);
  const setHumility = usePathwayStore((s) => s.setHumility);
  const startExpand = usePathwayStore((s) => s.startExpand);
  const acceptChildren = usePathwayStore((s) => s.acceptChildren);

  // Seed the tree on mount (or when profile changes) if not already seeded
  useEffect(() => {
    if (!profile) return;
    const current = usePathwayStore.getState().nodesById;
    if (current['root']) return; // already seeded (e.g., rehydrated from localStorage)

    const relevantSeeds = (seedsJson as FirstLayerSeed[])
      .filter(s => s.applies_to_majors.includes(profile.major_category) && s.applies_to_modes.includes(profile.mode))
      .slice(0, 3);

    const rootNode: PathwayNode = {
      id: 'root', parent_id: null, opportunity_id: null,
      title: 'Your Pathway', description: '', why_this: '', why_now: '',
      todos: [], source_url: null, human_contact: null, outreach_email_draft: null,
      estimated_time_cost: '', leads_to_tags: [],
    };
    const seedNodes: PathwayNode[] = relevantSeeds.map((s) => ({
      id: s.id, parent_id: 'root', opportunity_id: null,
      title: s.title, description: s.description,
      why_this: s.why_this_hint,
      why_now: 'Pick one to explore — you can come back and try the others.',
      todos: [], source_url: null, human_contact: null, outreach_email_draft: null,
      estimated_time_cost: 'Browse to decide',
      leads_to_tags: [s.path_tag],
    }));
    usePathwayStore.getState().addNodes([rootNode, ...seedNodes]);
    if (usePathwayStore.getState().focusedSeedId == null && seedNodes[0]) {
      usePathwayStore.getState().setFocusedSeedId(seedNodes[0].id);
    }
  }, [profile]);

  // Build TreeUINode tree from store nodesById, filtered to focused seed only at root level
  const root: TreeUINode | null = useMemo(() => {
    const rootRec = nodesById['root'];
    if (!rootRec) return null;

    function build(id: string, depth: number, inheritedColor?: PathColor): TreeUINode {
      const rec = nodesById[id];
      const allChildren = rec?.children ?? [];
      // For root only, filter to the focused seed
      const childIds = id === 'root' && focusedSeedId
        ? allChildren.filter(c => c === focusedSeedId)
        : allChildren;
      const pathColor =
        depth === 1 ? PATH_COLORS[rootRec.children.indexOf(id) % PATH_COLORS.length]
        : inheritedColor;
      return {
        id,
        title: rec.title || '—',
        tagline: rec.description ? rec.description.slice(0, 72) : rec.why_this.slice(0, 72),
        depth,
        path_color: pathColor,
        opportunity_id: rec.opportunity_id ?? null,
        // Deadline comes from the corpus item, but we don't have it client-side for Claude-returned children
        // For Tier-1 visual only, leave undefined. T11.5 may compute client-side if needed.
        deadline: undefined,
        children: childIds.map(cid => build(cid, depth + 1, pathColor)),
      };
    }
    return build('root', 0);
  }, [nodesById, focusedSeedId]);

  const expandedIds = useMemo(() => {
    const ids = new Set<string>();
    // Expand root + any node with children
    Object.values(nodesById).forEach(n => { if (n.children.length > 0) ids.add(n.id); });
    ids.add('root');
    return ids;
  }, [nodesById]);

  const onSelect = useCallback((n: LaidOutNode) => {
    setSelected(n.id);
  }, [setSelected]);

  const onExpand = useCallback(async (n: LaidOutNode) => {
    if (!profile) return;
    const state = usePathwayStore.getState();
    const rec = state.nodesById[n.id];
    if (!rec) return;
    // Already expanded — no-op (collapse UX deferred post-MVP)
    if (rec.children.length > 0) return;

    const { requestId, signal } = startExpand(n.id);

    // Walk up path_trace
    const pathTrace: Array<{ id: string; title: string; opportunity_id: string | null }> = [];
    let cursor: typeof rec | undefined = rec;
    while (cursor && cursor.id !== 'root') {
      pathTrace.unshift({ id: cursor.id, title: cursor.title, opportunity_id: cursor.opportunity_id ?? null });
      cursor = cursor.parent_id ? state.nodesById[cursor.parent_id] : undefined;
    }

    try {
      const resp = await callExpand(n.id, profile, pathTrace, requestId, signal);
      if (resp.ok) {
        acceptChildren(n.id, requestId, resp.children);
        if (resp.epistemic_humility_block) setHumility(resp.epistemic_humility_block);
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err.name !== 'AbortError') console.error('expand failed', e);
    }
  }, [profile, startExpand, acceptChildren, setHumility]);

  if (!root) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-ink-3 text-body">Loading your tree…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-8">
      <header className="max-w-[1200px] mx-auto mb-4">
        <h1 className="text-display font-bold text-ink">Your Pathway</h1>
        <p className="text-body text-ink-2">A sketch of your next two years as a tree you can walk through.</p>
      </header>
      <MissBanner />
      <div className="max-w-[1200px] mx-auto overflow-auto">
        <TreeCanvas
          root={root}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onExpand={onExpand}
        />
      </div>
      <footer className="max-w-[1200px] mx-auto mt-6 text-meta text-ink-3 italic">
        Pathway augments — does not replace — a real advisor. Every leaf points to a human.
      </footer>
    </div>
  );
}
