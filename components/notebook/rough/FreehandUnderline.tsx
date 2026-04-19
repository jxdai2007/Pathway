import { freehandUnderline } from '@/lib/freehand';

type Props = {
  width: number;
  seed: number;
  double?: boolean;
  stroke?: string;
  strokeWidth?: number;
};

export function FreehandUnderline({
  width,
  seed,
  double: isDouble,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  return (
    <svg width={width} height={10} style={{ overflow: 'visible' }}>
      <path
        d={freehandUnderline(width, { seed, double: isDouble })}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
