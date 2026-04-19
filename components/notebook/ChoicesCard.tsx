'use client';
import type { Node } from '@/lib/schemas';
import { usePathwayStore } from '@/store/pathway';
import { seedFor, rotationFor } from '@/lib/notebook-engine';
import { RoughRect } from './rough/RoughRect';
import { FreehandBox } from './rough/FreehandBox';
import { FreehandCheck } from './rough/FreehandCheck';
import { FreehandHighlighter } from './rough/FreehandHighlighter';
import { useMeasure } from '@/hooks/useMeasure';
import styles from './notebook.module.css';

type Props = { stageIdx: number; options: Node[] | null; loading: boolean };

export function ChoicesCard({ stageIdx, options, loading }: Props) {
  const previewNodeId = usePathwayStore((s) => s.previewNodeId);
  const setPreview = usePathwayStore((s) => s.setPreview);
  const setState = usePathwayStore.setState;
  const { ref, size } = useMeasure<HTMLDivElement>();
  const rot = rotationFor('choices-' + stageIdx);

  return (
    <div
      ref={ref}
      className={styles.choices}
      style={{ '--rot': `${rot}deg` } as React.CSSProperties}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setState({ openPromptStageIdx: null, previewNodeId: null });
        }
      }}
    >
      {size.w > 0 && (
        <RoughRect
          width={size.w}
          height={size.h}
          seed={seedFor('choices-' + stageIdx)}
        />
      )}
      <div className={styles.choicesInner}>
        <div className={styles.choicesHd}>
          <span>Pick one</span>
          <button
            type="button"
            onClick={() => setState({ openPromptStageIdx: null, previewNodeId: null })}
            className={styles.choicesClose}
            aria-label="close choices"
          >×</button>
        </div>
        {loading && !options?.length ? (
          <div className="text-sm italic text-[#6b6658]">loading options…</div>
        ) : !options?.length ? (
          <div className="text-sm italic text-[#c94c3a]">no options available — hit start over</div>
        ) : (
          options.map((opt) => {
            const isSelected = previewNodeId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreview(opt.id)}
                className={`${styles.choice} ${isSelected ? styles.choiceSelected : ''}`}
              >
                <span className={styles.choiceBox}>
                  <FreehandBox size={22} seed={seedFor('choice-box-' + opt.id)} />
                  {isSelected && (
                    <span className="absolute inset-0">
                      <FreehandCheck size={22} seed={seedFor('choice-check-' + opt.id)} />
                    </span>
                  )}
                </span>
                <span className={styles.choiceText}>
                  {opt.title}
                  <span className={styles.choiceHighlight}>
                    <FreehandHighlighter width={120} height={22} seed={seedFor('choice-hl-' + opt.id)} />
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
