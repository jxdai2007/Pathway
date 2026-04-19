import { memo, useMemo } from 'react';
import { freehandCheck } from '@/lib/freehand';

type Props = {
  size?: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export const FreehandCheck = memo(function FreehandCheck({
  size = 22,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const d = useMemo(() => freehandCheck(size, seed), [size, seed]);
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
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
