import { memo, useMemo } from 'react';
import { freehandStrike } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export const FreehandStrike = memo(function FreehandStrike({
  width,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const d = useMemo(() => freehandStrike(width, seed), [width, seed]);
  return (
    <svg width={width} height={8} style={{ overflow: 'visible' }}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
