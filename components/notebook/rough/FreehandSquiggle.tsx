import { memo, useMemo } from 'react';
import { freehandSquiggle } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export const FreehandSquiggle = memo(function FreehandSquiggle({
  width,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const d = useMemo(() => freehandSquiggle(width, seed), [width, seed]);
  return (
    <svg width={width} height={12} style={{ overflow: 'visible' }}>
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
