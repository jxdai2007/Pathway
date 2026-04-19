import { freehandSquiggle } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export function FreehandSquiggle({
  width,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  return (
    <svg width={width} height={12} style={{ overflow: 'visible' }}>
      <path
        d={freehandSquiggle(width, seed)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
