'use client';
import { formatDeadline } from '@/lib/deadline';
import type { LaidOutNode } from '@/lib/tree-layout';

const EYEBROW = ['You are here', 'Path', 'Milestone', 'Step'];

export function TreeNode({
  node, isSelected, isComplete, onSelect, onExpand, isExpanded, hasKids,
}: {
  node: LaidOutNode;
  isSelected?: boolean;
  isComplete?: boolean;
  isExpanded?: boolean;
  hasKids?: boolean;
  onSelect?: (n: LaidOutNode) => void;
  onExpand?: (n: LaidOutNode) => void;
}) {
  const W = node.depth === 0 ? 220 : node.depth === 1 ? 180 : 160;
  const H = node.depth === 0 ? 92 : node.depth === 1 ? 86 : 70;
  const { text: deadlineText, tone } = formatDeadline(node.deadline ?? null);

  const pathBorder =
    node.path_color === 'blue' ? 'border-l-4 border-branch-blue'
    : node.path_color === 'gold' ? 'border-l-4 border-branch-gold'
    : node.path_color === 'slate' ? 'border-l-4 border-branch-slate'
    : 'border border-line';

  const deadlineCls =
    tone === 'urgent' ? 'bg-urgent-bg text-urgent'
    : tone === 'soon' ? 'bg-paper-2 text-ink-2'
    : 'bg-paper-3 text-ink-3';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(node)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(node); }}
      className={`absolute bg-cream rounded-md shadow-card ${pathBorder} ${isSelected ? 'ring-2 ring-ucla-blue' : ''} ${isComplete ? 'opacity-90' : ''} px-3 py-2 flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-lift`}
      style={{ left: node.x - W / 2, top: node.y - H / 2, width: W, height: H }}
    >
      <div className="text-tiny uppercase tracking-wider text-ink-3">{EYEBROW[node.depth] ?? 'Step'}</div>
      <div className="text-body font-semibold leading-tight text-ink line-clamp-2">{node.title}</div>
      {node.tagline && node.depth > 0 && (
        <div className="text-meta text-ink-3 line-clamp-1">{node.tagline}</div>
      )}
      {node.depth > 0 && !isExpanded && onExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(node); }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-ucla-blue text-cream text-body font-semibold flex items-center justify-center shadow-card hover:bg-ucla-darkblue"
          aria-label="Expand with Claude"
        >
          +
        </button>
      )}
      {isComplete && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-success text-cream text-tiny flex items-center justify-center">✓</div>
      )}
      {deadlineText && (
        <div className={`absolute -bottom-2 right-2 text-tiny px-1.5 py-0.5 rounded-sm ${deadlineCls}`}>{deadlineText}</div>
      )}
    </div>
  );
}
