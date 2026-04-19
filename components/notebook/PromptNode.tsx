'use client';
import { usePathwayStore } from '@/store/pathway';
import { seedFor, rotationFor } from '@/lib/notebook-engine';
import { RoughRect } from './rough/RoughRect';
import { useMeasure } from '@/hooks/useMeasure';
import styles from './notebook.module.css';

export function PromptNode({ stageIdx, prompt }: { stageIdx: number; prompt: string }) {
  const setIdx = usePathwayStore.setState;
  const { ref, size } = useMeasure<HTMLButtonElement>();
  const rot = rotationFor('prompt-' + stageIdx);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setIdx({ openPromptStageIdx: stageIdx })}
      className={styles.prompt}
      style={{ '--rot': `${rot}deg` } as React.CSSProperties}
      aria-expanded={false}
      aria-label={`open stage ${stageIdx + 1} choices`}
    >
      {size.w > 0 && (
        <RoughRect
          width={size.w}
          height={size.h}
          seed={seedFor('prompt-' + stageIdx)}
          dashed
        />
      )}
      <div className={styles.promptInner}>
        <div className={styles.promptEyebrow}>click to open</div>
        <div className={styles.promptTitle}>{prompt}</div>
        <div className={styles.promptCta}>see 3 choices →</div>
      </div>
    </button>
  );
}
