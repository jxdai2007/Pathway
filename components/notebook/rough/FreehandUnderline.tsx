import { memo, useMemo } from 'react';
import { freehandUnderline } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  double?: boolean;
  stroke?: string;
  strokeWidth?: number;
};

export const FreehandUnderline = memo(function FreehandUnderline({
  width,
  seed,
  double: isDouble,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const d = useMemo(
    () => freehandUnderline(width, { seed, double: isDouble }),
    [width, seed, isDouble]
  );
  return (
    <svg width={width} height={10} style={{ overflow: 'visible' }}>
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
