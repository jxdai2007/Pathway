import { describe, it, expect } from 'vitest';
import { callClaudeExpand } from '@/lib/claude';

describe('callClaudeExpand', () => {
  it('throws a typed error when ANTHROPIC_API_KEY is missing', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      callClaudeExpand({ system: 'x', user: 'y' }, new AbortController().signal)
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
  });
});

import { buildSystemPrompt } from '@/lib/claude';
import type { IntakeProfile } from '@/lib/schemas';

describe('buildSystemPrompt', () => {
  const profile: IntakeProfile = {
    year: 'freshman', major_category: 'stem', first_gen: true,
    aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery',
  };
  it('includes stage_guidance for given stage_key', () => {
    const s = buildSystemPrompt({
      profile, stage_key: 'community', parent_path_tag: 'ai',
      path_trace: [{ id: 'a', title: 'Declare CS', opportunity_id: null }],
    });
    expect(s).toContain('stage_guidance key="community"');
    expect(s).toContain('parent_path_tag: ai');
    expect(s).toContain('Declare CS');
  });
  it('handles null parent_path_tag on first stage', () => {
    const s = buildSystemPrompt({
      profile, stage_key: 'direction', parent_path_tag: null, path_trace: [],
    });
    expect(s).toContain('none (first stage)');
  });
});
