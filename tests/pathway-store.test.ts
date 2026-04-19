import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePathwayStore } from '@/store/pathway';
import type { Node } from '@/lib/schemas';

const mk = (id: string, stage_key: Node['stage_key'], path_tag = 'ai'): Node => ({
  id, parent_id: null, opportunity_id: null,
  title: `T-${id}`, description: 'd', why_this: 'w', why_now: 'n',
  todos: [{ text: 't', done: false }],
  source_url: null, human_contact: null, outreach_email_draft: null,
  estimated_time_cost: '1 hr', leads_to_tags: [],
  stage_key, eyebrow: 'Direction', path_tag,
  cites: [],
});

describe('pathway store · chain model', () => {
  beforeEach(() => {
    usePathwayStore.getState().reset();
  });

  it('lockIn pushes into lockedNodeIds at stageIdx', () => {
    usePathwayStore.getState().addNodes([mk('n0', 'direction')]);
    usePathwayStore.getState().lockIn(0, 'n0');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['n0']);
  });

  it('lockIn at lower stageIdx truncates downstream', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction'), mk('b', 'community'), mk('c', 'signal')]);
    s.lockIn(0, 'a'); s.lockIn(1, 'b'); s.lockIn(2, 'c');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['a','b','c']);
    s.lockIn(1, 'b');
    expect(usePathwayStore.getState().lockedNodeIds).toEqual(['a','b']);
  });

  it('reopen destructively truncates and pre-selects', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction'), mk('b', 'community'), mk('c', 'signal')]);
    s.lockIn(0, 'a'); s.lockIn(1, 'b'); s.lockIn(2, 'c');
    s.reopen(1);
    const st = usePathwayStore.getState();
    expect(st.lockedNodeIds).toEqual(['a']);
    expect(st.openPromptStageIdx).toBe(1);
    expect(st.previewNodeId).toBe('b');
  });

  it('cancelPreview clears previewNodeId only', () => {
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction')]);
    s.setPreview('a');
    s.cancelPreview();
    expect(usePathwayStore.getState().previewNodeId).toBe(null);
  });

  it('justLockedStageIdx set by lockIn, cleared after 1400ms', () => {
    vi.useFakeTimers();
    const s = usePathwayStore.getState();
    s.addNodes([mk('a', 'direction')]);
    s.lockIn(0, 'a');
    expect(usePathwayStore.getState().justLockedStageIdx).toBe(0);
    vi.advanceTimersByTime(1401);
    expect(usePathwayStore.getState().justLockedStageIdx).toBe(null);
    vi.useRealTimers();
  });

  it('startExpand on same stageIdx aborts prior controller', () => {
    const s = usePathwayStore.getState();
    const first = s.startExpand(1, 'parent-a');
    const second = s.startExpand(1, 'parent-a');
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it('acceptChildren rejects stale requestId', () => {
    const s = usePathwayStore.getState();
    const { requestId } = s.startExpand(1, 'parent-a');
    const accepted = s.acceptChildren(1, 'stale-id', [mk('x', 'community')]);
    expect(accepted).toBe(false);
    const accepted2 = s.acceptChildren(1, requestId, [mk('x', 'community')]);
    expect(accepted2).toBe(true);
    expect(usePathwayStore.getState().nodesById.x?.id).toBe('x');
  });
});
