import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const TIMEOUT_MS = 10_000;

export type ClaudeCallArgs = {
  system: string;
  user: string;
};

export async function callClaudeExpand(
  args: ClaudeCallArgs,
  signal: AbortSignal
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeoutSignal]);

  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: args.user }],
      },
      { signal: combined }
    );

    const first = resp.content[0];
    if (!first || first.type !== 'text') {
      throw new Error('Claude returned non-text content block');
    }
    return first.text;
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string; status?: number };
    if (err.name === 'AbortError' || combined.aborted) {
      if (signal.aborted) {
        throw Object.assign(new Error('aborted by client'), { kind: 'aborted' });
      }
      throw Object.assign(new Error('timeout'), { kind: 'timeout' });
    }
    throw Object.assign(new Error(err.message ?? 'api_error'), { kind: 'api_error', status: err.status });
  }
}
