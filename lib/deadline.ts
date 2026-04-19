export type DeadlineTone = 'urgent' | 'soon' | null;

export function formatDeadline(raw: string | null | undefined): { text: string | null; tone: DeadlineTone } {
  if (!raw) return { text: null, tone: null };
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const urgent = /days|tomorrow|this week|friday|monday|closes in|\d+ days/i.test(raw);
    return { text: raw, tone: urgent ? 'urgent' : 'soon' };
  }
  const today = new Date('2026-04-19T00:00:00');
  const d = new Date(raw + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'closed', tone: null };
  if (diff === 0) return { text: 'closes today', tone: 'urgent' };
  if (diff === 1) return { text: 'closes tomorrow', tone: 'urgent' };
  if (diff <= 14) return { text: `closes in ${diff} days`, tone: 'urgent' };
  if (diff <= 45) return { text: `closes in ${Math.round(diff / 7)} wks`, tone: 'soon' };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { text: `${months[d.getMonth()]} ${d.getDate()}`, tone: null };
}
