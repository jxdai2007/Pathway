'use client';
import { useMemo } from 'react';
import { layoutTree, type TreeUINode, type LaidOutNode } from '@/lib/tree-layout';
import { TreeEdge } from './TreeEdge';
import { TreeNode } from './TreeNode';

export function TreeCanvas({
  root, selectedId, expandedIds, completedIds,
  onSelect, onExpand,
}: {
  root: TreeUINode;
  selectedId?: string | null;
  expandedIds?: Set<string>;
  completedIds?: Set<string>;
  onSelect?: (n: LaidOutNode) => void;
  onExpand?: (n: LaidOutNode) => void;
}) {
  const { nodes, edges, canvasW, canvasH } = useMemo(() => layoutTree(root), [root]);
  return (
    <div className="relative" style={{ width: canvasW, height: canvasH }}>
      <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="xMidYMin meet">
        <defs>
          <filter id="roughen" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves={2} seed={3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} />
          </filter>
        </defs>
        {edges.map((e) => (
          <TreeEdge
            key={`${e.parentId}-${e.childId}`}
            edge={e}
            isActive={!!selectedId && (e.childId === selectedId || e.parentId === selectedId)}
          />
        ))}
      </svg>
      {nodes.map((n) => (
        <TreeNode
          key={n.id}
          node={n}
          isSelected={selectedId === n.id}
          isComplete={completedIds?.has(n.id)}
          isExpanded={expandedIds?.has(n.id)}
          hasKids={!!(n.children && n.children.length > 0)}
          onSelect={onSelect}
          onExpand={onExpand}
        />
      ))}
    </div>
  );
}
