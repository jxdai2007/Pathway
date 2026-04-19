'use client';
import type { LaidOutEdge } from '@/lib/tree-layout';

export function TreeEdge({ edge, isActive }: { edge: LaidOutEdge; isActive?: boolean }) {
  const { from, to } = edge;
  const dx = to.x - from.x;
  const mid = (from.y + to.y) / 2;
  const sway = Math.sign(dx) * Math.min(12, Math.abs(dx) * 0.05);
  const d = `M ${from.x} ${from.y + 40} C ${from.x + sway} ${mid - 8}, ${to.x - sway} ${mid + 8}, ${to.x} ${to.y - 40}`;
  const stroke =
    edge.path_color === 'blue' ? '#2774AE'
    : edge.path_color === 'gold' ? '#E8B80E'
    : edge.path_color === 'slate' ? '#6B7286'
    : '#9CA2B5';
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={isActive ? 2.5 : 1.5}
      strokeLinecap="round"
      opacity={isActive ? 1 : 0.75}
      filter="url(#roughen)"
    />
  );
}
