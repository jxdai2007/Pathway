export type PathColor = 'blue' | 'gold' | 'slate';

export type TreeUINode = {
  id: string;
  title: string;
  tagline?: string;
  depth: number;
  path_color?: PathColor;
  opportunity_id?: string | null;
  deadline?: string | null;
  children?: TreeUINode[];
};

export type LaidOutNode = TreeUINode & { x: number; y: number };
export type LaidOutEdge = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  parentId: string;
  childId: string;
  depth: number;
  path_color?: PathColor;
};

export function layoutTree(root: TreeUINode): {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  canvasW: number;
  canvasH: number;
} {
  const LEVEL_Y = [80, 260, 440, 600];
  const canvasW = 1200;
  const canvasH = 720;
  const nodes: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];

  function place(node: TreeUINode, depth: number, xCenter: number, inheritedColor?: PathColor) {
    const y = LEVEL_Y[depth] ?? LEVEL_Y[LEVEL_Y.length - 1];
    const color = node.path_color ?? inheritedColor;
    nodes.push({ ...node, depth, x: xCenter, y, path_color: color });
    const kids = node.children ?? [];
    if (!kids.length) return;
    const spread = depth === 0 ? 360 : depth === 1 ? 200 : 180;
    const start = xCenter - (spread * (kids.length - 1)) / 2;
    kids.forEach((k, i) => {
      const kx = start + spread * i;
      const childColor = color ?? k.path_color;
      edges.push({
        from: { x: xCenter, y },
        to: { x: kx, y: LEVEL_Y[depth + 1] ?? y + 180 },
        parentId: node.id,
        childId: k.id,
        depth: depth + 1,
        path_color: childColor,
      });
      place(k, depth + 1, kx, childColor);
    });
  }
  place(root, 0, canvasW / 2);
  return { nodes, edges, canvasW, canvasH };
}
