import { memo, useMemo } from 'react';
import { freehandBox } from '@/lib/freehand';

type Props = {
  size?: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export const FreehandBox = memo(function FreehandBox({
  size = 22,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  const d = useMemo(() => freehandBox(size, seed), [size, seed]);
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
