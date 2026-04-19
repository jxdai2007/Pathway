'use client';

import { useProfileStore } from '@/store/profile';
import { usePathwayStore } from '@/store/pathway';
import { Timeline } from './Timeline';
import { Panel } from './Panel';
import styles from './notebook.module.css';

export function Notebook() {
  const profile = useProfileStore((s) => s.profile);
  const reset = usePathwayStore((s) => s.reset);
  const mode = profile?.mode ?? 'discovery';

  if (!profile) {
    return <div className="p-8">No profile — complete onboarding first.</div>;
  }

  const persona = 'You';

  return (
    <div className={`min-h-screen bg-[#d8d2c0] font-[Kalam,cursive] text-[19px] leading-[1.55] text-[#2a2a28] ${styles.paper}`}>
      <div className={styles.canvas}>
        <header className={styles.canvasHd}>
          <h1 className={styles.canvasTitle}>Pathway · a working notebook</h1>
          <span className={styles.canvasSub}>stages unfold one at a time</span>
          <button
            type="button"
            onClick={reset}
            className={styles.canvasReset}
          >↺ start over</button>
        </header>
        <div className={styles.frame}>
          <div className={styles.frameChrome}>
            <svg className={styles.frameChromeLogo} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className={styles.frameChromeTitle}>Pathway</span>
            <div className={styles.frameChromeSpacer} />
            <span className={styles.frameChromeRight}>{persona} · {mode}</span>
          </div>
          <div className={styles.split}>
            <div className={styles.splitList}>
              <Timeline profile={profile} />
            </div>
            <div className={styles.splitPanel}>
              <Panel />
            </div>
          </div>
          <div className={styles.paperVignette} />
        </div>
      </div>
    </div>
  );
}
