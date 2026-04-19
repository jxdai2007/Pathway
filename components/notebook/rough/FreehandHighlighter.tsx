import { freehandHighlighter } from '@/lib/freehand';

type Props = {
  width: number;
  height: number;
  seed: number;
  fill?: string;
};

export function FreehandHighlighter({
  width,
  height,
  seed,
  fill = 'rgba(244,211,94,0.42)',
}: Props) {
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path
        d={freehandHighlighter(width, height, seed)}
        stroke="none"
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
