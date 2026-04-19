import { freehandStrike } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export function FreehandStrike({
  width,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  return (
    <svg width={width} height={8} style={{ overflow: 'visible' }}>
      <path
        d={freehandStrike(width, seed)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
