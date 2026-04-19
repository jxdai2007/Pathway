import { freehandArrow } from '@/lib/freehand';

type Props = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  curve?: number;
  seed?: number;
  stroke?: string;
  strokeWidth?: number;
};

export function FreehandArrow({
  x1,
  y1,
  x2,
  y2,
  curve,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const pad = 16;
  const minX = Math.min(x1, x2) - pad;
  const minY = Math.min(y1, y2) - pad;
  const svgW = Math.abs(x2 - x1) + pad * 2;
  const svgH = Math.abs(y2 - y1) + pad * 2;
  // Translate coords to local SVG space
  const lx1 = x1 - minX;
  const ly1 = y1 - minY;
  const lx2 = x2 - minX;
  const ly2 = y2 - minY;

  return (
    <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
      <path
        d={freehandArrow(lx1, ly1, lx2, ly2, { curve, seed })}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
