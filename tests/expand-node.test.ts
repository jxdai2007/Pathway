import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/claude', () => ({ callClaudeExpand: vi.fn() }));

import { POST } from '@/app/api/expand-node/route';
import type { ExpandRequest } from '@/lib/schemas';
import { callClaudeExpand } from '@/lib/claude';

const mockReq = (body: ExpandRequest): Request => new Request('http://localhost/api/expand-node', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const baseReq: ExpandRequest = {
  profile: { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' },
  parent_id: 'root',
  path_trace: [],
  requestId: 'req-1',
};

beforeEach(() => { vi.resetAllMocks(); });

describe('POST /api/expand-node', () => {
  it('returns ok:true with children when Claude returns valid JSON', async () => {
    // Use a real corpus id so semantic validation passes
    const realId = (await import('@/data/ucla/opportunities.json')).default[0].id;
    const realUrl = (await import('@/data/ucla/opportunities.json')).default[0].source_url;
    (callClaudeExpand as any).mockResolvedValue(JSON.stringify({
      children: [
        { id: 'n1', parent_id: 'root', opportunity_id: realId, title: 'T1', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: realUrl, human_contact: { name: 'x', role: 'x', email_or_office: 'x' }, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [] },
        { id: 'n2', parent_id: 'root', opportunity_id: realId, title: 'T2', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: realUrl, human_contact: { name: 'x', role: 'x', email_or_office: 'x' }, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [] },
      ],
      epistemic_humility_block: 'Could be wrong about sequencing.',
    }));
    const res = await POST(mockReq(baseReq));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.children.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back when Claude returns malformed JSON', async () => {
    (callClaudeExpand as any).mockResolvedValue('{"children": [');
    const res = await POST(mockReq(baseReq));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.children.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back when Claude invents an opportunity_id', async () => {
    (callClaudeExpand as any).mockResolvedValue(JSON.stringify({
      children: [
        { id: 'n1', parent_id: 'root', opportunity_id: 'FAKE_HALLUCINATED_ID', title: 'Fake', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: 'https://fake.com', human_contact: { name: 'x', role: 'x', email_or_office: 'x' }, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [] },
      ],
    }));
    const res = await POST(mockReq(baseReq));
    const json = await res.json();
    expect(json.ok).toBe(true);
    for (const child of json.children) expect(child.opportunity_id).not.toBe('FAKE_HALLUCINATED_ID');
  });
});
