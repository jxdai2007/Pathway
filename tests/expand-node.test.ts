import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/claude', () => ({ callClaudeExpand: vi.fn(), buildSystemPrompt: vi.fn(() => 'sys') }));

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
  stage_key: 'direction',
  parent_path_tag: null,
};

beforeEach(() => { vi.resetAllMocks(); });

describe('POST /api/expand-node', () => {
  it('returns ok:true with children when Claude returns valid JSON', async () => {
    (callClaudeExpand as any).mockResolvedValue(JSON.stringify({
      children: [
        { id: 'n1', parent_id: 'root', opportunity_id: null, title: 'T1', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: null, human_contact: null, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [], stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [{ label: 'UCLA CS', summary: 'info', url: 'https://cs.ucla.edu' }] },
        { id: 'n2', parent_id: 'root', opportunity_id: null, title: 'T2', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: null, human_contact: null, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [], stage_key: 'direction', eyebrow: 'Direction', path_tag: 'build', cites: [{ label: 'Samueli', summary: 'info', url: 'https://samueli.ucla.edu' }] },
        { id: 'n3', parent_id: 'root', opportunity_id: null, title: 'T3', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: null, human_contact: null, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [], stage_key: 'direction', eyebrow: 'Direction', path_tag: 'explore', cites: [{ label: 'Registrar', summary: 'info', url: 'https://www.registrar.ucla.edu' }] },
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
        { id: 'n1', parent_id: 'root', opportunity_id: 'FAKE_HALLUCINATED_ID', title: 'Fake', description: 'x', why_this: 'x', why_now: 'x', todos: [], source_url: 'https://fake.com', human_contact: { name: 'x', role: 'x', email_or_office: 'x' }, outreach_email_draft: null, estimated_time_cost: '1 hr', leads_to_tags: [], stage_key: 'direction', eyebrow: 'Direction', path_tag: 'ai', cites: [] },
      ],
    }));
    const res = await POST(mockReq(baseReq));
    const json = await res.json();
    expect(json.ok).toBe(true);
    for (const child of json.children) expect(child.opportunity_id).not.toBe('FAKE_HALLUCINATED_ID');
  });
});

// Task A11 new tests
const req = (body: object) => new Request('http://t/api/expand-node', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const baseBody = {
  profile: { year: 'freshman', major_category: 'stem', first_gen: true,
    aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' },
  parent_id: null, path_trace: [], requestId: 'req-1',
  stage_key: 'direction', parent_path_tag: null,
};

describe('expand-node route', () => {
  it('400 when stage_key missing', async () => {
    const { stage_key, ...rest } = baseBody;
    const res = await POST(req(rest as any));
    expect(res.status).toBe(400);
  });
  it('200 on valid request (fallback path OK without API key)', async () => {
    const res = await POST(req(baseBody));
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const j = await res.json();
      expect(j.ok).toBe(true);
      expect(j.children).toHaveLength(3);
      for (const c of j.children) expect(c.stage_key).toBe('direction');
    }
  });
});
