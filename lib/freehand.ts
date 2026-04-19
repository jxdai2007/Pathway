import { getStroke } from 'perfect-freehand';

export function seededRng(seed: number): () => number {
  let s = (seed || 1) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

function pointsToSvgPath(points: number[][]): string {
  if (points.length < 2) return '';
  const d = ['M', points[0][0].toFixed(2), points[0][1].toFixed(2)];
  for (let i = 1; i < points.length; i++) {
    d.push('L', points[i][0].toFixed(2), points[i][1].toFixed(2));
  }
  d.push('Z');
  return d.join(' ');
}

function stroke(points: number[][], size = 2): string {
  return pointsToSvgPath(getStroke(points, { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }));
}

export function freehandUnderline(
  w: number, opts: { double?: boolean; seed?: number } = {}
): string {
  const rng = seededRng(opts.seed ?? 1);
  const steps = Math.max(12, Math.floor(w / 6));
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = 6 + (rng() - 0.5) * 1.6 + Math.sin(i * 0.7) * 0.6;
    pts.push([x, y]);
  }
  let path = stroke(pts, 2);
  if (opts.double) {
    const second: number[][] = pts.map(([x, y]) => [x, y + 3 + (rng() - 0.5) * 0.8]);
    path += ' ' + stroke(second, 1.5);
  }
  return path;
}

export function freehandArrow(
  x1: number, y1: number, x2: number, y2: number,
  opts: { curve?: number; seed?: number } = {}
): string {
  const rng = seededRng(opts.seed ?? 1);
  const curve = opts.curve ?? 0.3;
  const dx = x2 - x1, dy = y2 - y1;
  const mx = (x1 + x2) / 2 - dy * curve + (rng() - 0.5) * 2;
  const my = (y1 + y2) / 2 + dx * curve + (rng() - 0.5) * 2;
  const steps = 24;
  const pts: number[][] = [];
  for (let t = 0; t <= steps; t++) {
    const u = t / steps;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2;
    const by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
    pts.push([bx + (rng() - 0.5) * 0.6, by + (rng() - 0.5) * 0.6]);
  }
  // arrowhead
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = 7;
  const hx1 = x2 - head * Math.cos(ang - Math.PI / 7);
  const hy1 = y2 - head * Math.sin(ang - Math.PI / 7);
  const hx2 = x2 - head * Math.cos(ang + Math.PI / 7);
  const hy2 = y2 - head * Math.sin(ang + Math.PI / 7);
  return stroke(pts, 1.6) + ' ' +
    stroke([[x2, y2], [hx1, hy1]], 1.6) + ' ' +
    stroke([[x2, y2], [hx2, hy2]], 1.6);
}

export function freehandCheck(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const p1: number[][] = [
    [size * 0.18, size * 0.55 + rng() * 0.6],
    [size * 0.42, size * 0.78 + rng() * 0.6],
  ];
  const p2: number[][] = [
    [size * 0.42, size * 0.78 + rng() * 0.6],
    [size * 0.86, size * 0.22 + rng() * 0.6],
  ];
  return stroke(p1, 2) + ' ' + stroke(p2, 2);
}

export function freehandX(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const a = [[2 + rng(), 2 + rng()], [size - 2 + rng(), size - 2 + rng()]];
  const b = [[size - 2 + rng(), 2 + rng()], [2 + rng(), size - 2 + rng()]];
  return stroke(a, 2) + ' ' + stroke(b, 2);
}

export function freehandStrike(width: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = Math.max(10, Math.floor(width / 10));
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = (rng() - 0.5) * 1.2;
    pts.push([x, y]);
  }
  return stroke(pts, 1.6);
}

export function freehandBox(size = 22, seed = 1): string {
  const rng = seededRng(seed);
  const j = () => (rng() - 0.5) * 1.2;
  const pts: number[][] = [
    [1 + j(), 1 + j()],
    [size - 1 + j(), 1 + j()],
    [size - 1 + j(), size - 1 + j()],
    [1 + j(), size - 1 + j()],
    [1 + j(), 1 + j()],
  ];
  return stroke(pts, 1.5);
}

export function freehandHighlighter(w: number, h: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = 10;
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = h / 2 + (rng() - 0.5) * (h / 3);
    pts.push([x, y]);
  }
  return pointsToSvgPath(getStroke(pts, { size: h, thinning: 0, smoothing: 0.6 }));
}

export function freehandSquiggle(w: number, seed = 1): string {
  const rng = seededRng(seed);
  const steps = 18;
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = Math.sin(i * 0.9) * 3 + (rng() - 0.5) * 1.2;
    pts.push([x, y]);
  }
  return stroke(pts, 1.4);
}
