'use client';
import { useEffect, useMemo, useRef } from 'react';
import { usePathwayStore } from '@/store/pathway';
import { STAGES, resolveStage1Options, buildPathTrace } from '@/lib/notebook-engine';
import seedsJson from '@/data/ucla/first_layer_seeds.json';
import type { IntakeProfile, FirstLayerSeed, Node } from '@/lib/schemas';
import { TimelineRow } from './TimelineRow';
import { RootNode } from './RootNode';

export function Timeline({ profile }: { profile: IntakeProfile }) {
  const seeds = seedsJson as FirstLayerSeed[];
  const store = usePathwayStore();
  const firedRef = useRef<Set<number>>(new Set());

  // Stage 1 seed materialization (runs once)
  useEffect(() => {
    if (store.lockedNodeIds.length > 0) return;
    const r = resolveStage1Options(seeds, profile);
    if (r.kind === 'seeds') {
      const nodes: Node[] = r.seeds.map((s, i) => ({
        id: `seed-${s.id}`, parent_id: null, opportunity_id: null,
        title: s.title, description: s.description ?? '', why_this: '', why_now: '',
        todos: [], source_url: null, human_contact: null, outreach_email_draft: null,
        estimated_time_cost: '2 hrs · admin', leads_to_tags: [],
        stage_key: 'direction', eyebrow: 'Direction', path_tag: s.path_tag, cites: [],
      }));
      store.addNodes(nodes);
    } else {
      // claude path — trigger expand at stage 0
      if (!firedRef.current.has(0)) {
        firedRef.current.add(0);
        void triggerExpand(0, null, null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Stage N>0 expansion after lock-in
  useEffect(() => {
    const idx = store.openPromptStageIdx;
    if (idx === null || idx === 0) return;
    const parent = store.nodesById[store.lockedNodeIds[idx - 1]];
    if (!parent) return;
    const hasCache = Object.values(store.nodesById).filter(
      (n) => n.parent_id === parent.id && n.stage_key === STAGES[idx].key
    ).length >= 3;
    if (hasCache) return;
    if (firedRef.current.has(idx)) return;
    firedRef.current.add(idx);
    void triggerExpand(idx, parent.id, parent.path_tag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.openPromptStageIdx, store.lockedNodeIds]);

  async function triggerExpand(stageIdx: number, parent_id: string | null, parent_path_tag: string | null) {
    const { requestId, signal } = store.startExpand(stageIdx, parent_id);
    try {
      const resp = await fetch('/api/expand-node', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal,
        body: JSON.stringify({
          profile, stage_key: STAGES[stageIdx].key, parent_path_tag,
          parent_id, path_trace: buildPathTrace(store.lockedNodeIds, store.nodesById),
          requestId,
        }),
      });
      const j = await resp.json();
      if (j.ok) store.acceptChildren(stageIdx, requestId, j.children);
    } catch { /* aborted / network — ignored */ }
  }

  const rows = useMemo(() => {
    const visible = store.lockedNodeIds.length + (store.openPromptStageIdx !== null ? 1 : 0);
    return STAGES.slice(0, visible).map((_, stageIdx) => {
      const locked = store.nodesById[store.lockedNodeIds[stageIdx]] ?? null;
      const isOpen = store.openPromptStageIdx === stageIdx && !locked;
      const options = isOpen
        ? (stageIdx === 0
            ? Object.values(store.nodesById).filter((n) => n.stage_key === 'direction' && n.parent_id === null)
            : Object.values(store.nodesById).filter((n) => n.parent_id === store.lockedNodeIds[stageIdx-1] && n.stage_key === STAGES[stageIdx].key))
        : null;
      const loading = isOpen && (options?.length ?? 0) < 3 && stageIdx in store.inFlight;
      return (
        <TimelineRow
          key={stageIdx}
          stageIdx={stageIdx}
          profile={profile}
          locked={locked}
          isOpen={isOpen}
          options={options}
          loading={loading}
        />
      );
    });
  }, [store.nodesById, store.lockedNodeIds, store.openPromptStageIdx, store.inFlight, profile]);

  return (
    <div className="pl-28 pr-8 pt-8 pb-16">
      <RootNode profile={profile} />
      {rows}
    </div>
  );
}
