'use client';
import { usePathwayStore } from '@/store/pathway';
import { STAGES, STAGE_KEYS } from '@/lib/stages';
import { seedFor, rotationFor } from '@/lib/notebook-engine';
import { FreehandArrow } from './rough/FreehandArrow';
import { FreehandUnderline } from './rough/FreehandUnderline';
import { RoughRect } from './rough/RoughRect';
import { useMeasure } from '@/hooks/useMeasure';
import { PanelEmpty } from './PanelEmpty';
import styles from './notebook.module.css';

function LockButton({ stageIdx, nodeTitle, onClick }: { stageIdx: number; nodeTitle: string; onClick: () => void }) {
  const { ref, size } = useMeasure<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`${styles.btn} ${styles.btnPrimary}`}
      style={{ '--rot': `${rotationFor('btn-lock-' + stageIdx)}deg` } as React.CSSProperties}
      aria-label={`lock in ${nodeTitle}`}
    >
      {size.w > 0 && (
        <RoughRect width={size.w} height={size.h} seed={seedFor('btn-lock-' + stageIdx)} stroke="#c94c3a" />
      )}
      <span className={styles.btnLabel}>Lock it in ✓</span>
    </button>
  );
}

function DismissButton({ stageIdx, onClick }: { stageIdx: number; onClick: () => void }) {
  const { ref, size } = useMeasure<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`${styles.btn} ${styles.btnGhost}`}
      style={{ '--rot': `${rotationFor('btn-dismiss-' + stageIdx)}deg` } as React.CSSProperties}
      aria-label="dismiss preview"
    >
      {size.w > 0 && (
        <RoughRect width={size.w} height={size.h} seed={seedFor('btn-dismiss-' + stageIdx)} stroke="#6b6658" />
      )}
      <span className={styles.btnLabel}>dismiss</span>
    </button>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

export function Panel() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const previewId = usePathwayStore((s) => s.previewNodeId);
  const openIdx = usePathwayStore((s) => s.openPromptStageIdx);
  const lockedLen = usePathwayStore((s) => s.lockedNodeIds.length);
  const lockIn = usePathwayStore((s) => s.lockIn);
  const cancel = usePathwayStore((s) => s.cancelPreview);
  const { ref: ttlRef, size: ttlSize } = useMeasure<HTMLHeadingElement>();

  if (openIdx === null && lockedLen === 5) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
        <div className="text-2xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">Year-2 bet locked</div>
        <div className="max-w-xs text-sm italic text-[#6b6658]">start over to replan — your progress is saved.</div>
      </div>
    );
  }
  if (!previewId) return <PanelEmpty />;
  const node = nodesById[previewId];
  if (!node) return <PanelEmpty />;

  const stageIdxRaw = openIdx ?? STAGE_KEYS.indexOf(node.stage_key);
  if (stageIdxRaw < 0 || stageIdxRaw > 4) return <PanelEmpty />;
  const stageIdx = stageIdxRaw;
  const isReopening = stageIdx < lockedLen;
  const willWipe = Math.max(0, lockedLen - stageIdx);

  return (
    <div className={styles.panel}>
      <div className={styles.panelKicker}>{node.eyebrow} · {STAGES[stageIdx].stage}</div>
      <h2 ref={ttlRef} className={styles.panelTtl}>
        {node.title}
        <span className={styles.panelTtlUnderline}>
          {ttlSize.w > 0 && (
            <FreehandUnderline width={ttlSize.w} seed={seedFor('panel-ttl-' + node.id)} double stroke="#c94c3a" />
          )}
        </span>
      </h2>
      <div className={styles.panelMeta}>
        <div className={styles.panelMetaRow}>
          <span className={styles.panelMetaRowLbl}>When:</span>
          <span className={styles.panelMetaRowVal}>{STAGES[stageIdx].when}</span>
        </div>
        <div className={styles.panelMetaRow}>
          <span className={styles.panelMetaRowLbl}>Effort:</span>
          <span className={styles.panelMetaRowVal}>{node.estimated_time_cost}</span>
        </div>
      </div>
      {node.why_this && (
        <div className={styles.panelSect}>
          <div className={styles.panelSectLbl}>why this</div>
          <div className={styles.panelWhy}>{node.why_this}</div>
        </div>
      )}
      {node.description && (
        <div className={styles.panelSect}>
          <div className={styles.panelSectLbl}>details</div>
          <div className={styles.panelBody}>{node.description}</div>
        </div>
      )}
      {node.cites.length > 0 && (
        <div className={styles.panelSect}>
          <div className={styles.panelSectLbl}>cites</div>
          <div className={styles.panelCites}>
            {node.cites.map((c, i) => (
              <div key={i} className={styles.panelCite}>
                <span className={styles.panelCiteSup}>{i + 1}</span>
                <div className={styles.panelCiteBody}>
                  <strong>{c.label}</strong> — <a href={c.url} target="_blank" rel="noopener noreferrer" className={styles.panelCiteLink}>{safeHost(c.url)}</a> · {c.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isReopening && willWipe > 0 && (
        <div className={styles.reopenWarn}>
          ⚠ Locking here will wipe {willWipe} later step{willWipe > 1 ? 's' : ''}.
        </div>
      )}
      <div className={styles.panelActions}>
        <LockButton stageIdx={stageIdx} nodeTitle={node.title} onClick={() => lockIn(stageIdx, node.id)} />
        <DismissButton stageIdx={stageIdx} onClick={cancel} />
      </div>
    </div>
  );
}
