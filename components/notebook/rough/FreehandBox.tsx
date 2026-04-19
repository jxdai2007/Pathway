import { freehandBox } from '@/lib/freehand';

type Props = {
  size?: number;
  seed: number;
  stroke?: string;
  strokeWidth?: number;
};

export function FreehandBox({
  size = 22,
  seed,
  stroke = '#1e3a5f',
  strokeWidth = 2,
}: Props) {
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <path
        d={freehandBox(size, seed)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
