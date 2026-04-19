import type { IntakeProfileV2 } from '@/lib/schemas';

/**
 * Formats v2 signals into a <student_context> XML block for Claude prompts.
 * Returns '' when no v2 signals present, so the call site can concat safely.
 *
 * Integration (applied by notebook cluster after merge):
 *   import { formatStudentContext } from '@/lib/student-context';
 *   const prompt = buildBasePrompt(...) + formatStudentContext(profile);
 */
export function formatStudentContext(profile: IntakeProfileV2): string {
  const lines: string[] = [];

  if (profile.horizons !== undefined) {
    lines.push(`<horizons>${profile.horizons}/10 (${anchorLabel(profile.horizons)})</horizons>`);
  }
  if (profile.satisfaction !== undefined) {
    lines.push(`<satisfaction>${profile.satisfaction}/5 — clarity of current path</satisfaction>`);
  }
  if (profile.blocker && profile.blocker !== 'none') {
    lines.push(`<blocker>${profile.blocker}</blocker>`);
    lines.push(`<prompt_bias>${biasFor(profile.blocker)}</prompt_bias>`);
  }
  if (profile.pivot?.triggered) {
    lines.push(
      `<pivot from="${esc(profile.pivot.pivot_from ?? '')}" to="${esc(profile.pivot.pivot_target ?? '')}" />`
    );
  }
  if (profile.is_transfer && profile.transfer) {
    lines.push(
      `<transfer prior_school="${esc(profile.transfer.prior_school)}" terms_remaining="${profile.transfer.terms_remaining}" />`
    );
  }
  if (profile.communities?.length) {
    lines.push(`<communities>${profile.communities.join(', ')}</communities>`);
  }
  if (profile.resume_kb) {
    const rk = profile.resume_kb;
    const expLines = rk.experiences.slice(0, 8).map(e =>
      `  - ${esc(e.title)} at ${esc(e.org)}${e.period ? ` (${esc(e.period)})` : ''}: ${esc(e.summary)}`
    ).join('\n');
    const skillsLine = rk.skills?.length ? `  skills: ${rk.skills.join(', ')}\n` : '';
    lines.push(
      `<resume_kb>\n  headline: ${esc(rk.headline)}\n  summary: ${esc(rk.summary)}\n${skillsLine}  experiences:\n${expLines}\n</resume_kb>`
    );
  }

  return lines.length
    ? `\n<additional_signals>\n${lines.join('\n')}\n</additional_signals>\n`
    : '';
}

function anchorLabel(h: number): string {
  if (h <= 1) return 'this quarter';
  if (h <= 2) return 'this year';
  if (h <= 4) return '~2 yrs';
  if (h <= 6) return '~4 yrs';
  if (h <= 8) return 'post-grad';
  return '10+ yrs';
}

function biasFor(b: 'too_many_options' | 'dont_know_whats_out_there'): string {
  return b === 'too_many_options'
    ? 'narrow: focus one thing, return fewer + higher-confidence candidates'
    : 'broaden: show discovery breadth, surface unexpected adjacent paths';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
