import { memo, useMemo } from 'react';
import { freehandHighlighter } from '@/lib/freehand';

type Props = {
  width: number;
  height: number;
  seed: number;
  fill?: string;
};

export const FreehandHighlighter = memo(function FreehandHighlighter({
  width,
  height,
  seed,
  fill = 'rgba(244,211,94,0.42)',
}: Props) {
  const d = useMemo(() => freehandHighlighter(width, height, seed), [width, height, seed]);
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path
        d={d}
        stroke="none"
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
