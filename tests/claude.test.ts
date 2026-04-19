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
