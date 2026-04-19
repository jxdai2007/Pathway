import { describe, it, expect, beforeEach } from 'vitest';
import { usePathwayStore } from '@/store/pathway';

describe('pathway store', () => {
  beforeEach(() => usePathwayStore.getState().reset());

  it('rejects stale expand responses after a superseding call', () => {
    const first = usePathwayStore.getState().startExpand('node-a');
    const second = usePathwayStore.getState().startExpand('node-a');
    expect(second.requestId).not.toBe(first.requestId);

    const acceptedStale = usePathwayStore.getState().acceptChildren('node-a', first.requestId, []);
    expect(acceptedStale).toBe(false);

    const acceptedFresh = usePathwayStore.getState().acceptChildren('node-a', second.requestId, []);
    expect(acceptedFresh).toBe(true);
  });

  it('addNodes links children to their parent', () => {
    usePathwayStore.getState().addNodes([
      { id: 'p', parent_id: null, opportunity_id: null, title: 'P', description: '', why_this: '', why_now: '', todos: [], source_url: null, human_contact: null, outreach_email_draft: null, estimated_time_cost: '', leads_to_tags: [] },
      { id: 'c', parent_id: 'p', opportunity_id: null, title: 'C', description: '', why_this: '', why_now: '', todos: [], source_url: null, human_contact: null, outreach_email_draft: null, estimated_time_cost: '', leads_to_tags: [] },
    ]);
    const s = usePathwayStore.getState();
    expect(s.nodesById['p'].children).toContain('c');
  });
});
