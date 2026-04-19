'use client';
import { usePathwayStore } from '@/store/pathway';
import { rotationFor } from '@/lib/notebook-engine';
import styles from './notebook.module.css';

type Props = {
  stageIdx: number;
  title: string;
};

export function StickyNote({ stageIdx, title }: Props) {
  const justLockedStageIdx = usePathwayStore((s) => s.justLockedStageIdx);
  const isDropping = justLockedStageIdx === stageIdx;
  const rot = rotationFor('sticky-' + stageIdx, 4);

  return (
    <div
      className={`${styles.sticky} ${isDropping ? styles.stickyDropping : ''}`}
      style={{ '--note-rot': `${rot}deg`, '--tape-rot': `${rotationFor('tape-' + stageIdx, 3)}deg` } as React.CSSProperties}
    >
      <span className={styles.stickyKicker}>✓ locked in</span>
      <span className={styles.stickyTxt}>{title}</span>
      <span className={styles.stickySigned}>— you</span>
    </div>
  );
}
