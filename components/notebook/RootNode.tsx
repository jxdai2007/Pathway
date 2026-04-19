import type { IntakeProfile } from '@/lib/schemas';
import { composeRootSub, seedFor } from '@/lib/notebook-engine';
import { FreehandUnderline } from './rough/FreehandUnderline';
import { FreehandArrow } from './rough/FreehandArrow';
import styles from './notebook.module.css';

export function RootNode({ profile }: { profile: IntakeProfile }) {
  return (
    <div className={`mb-4 inline-block ${styles.node} ${styles.nodeRoot}`}>
      <div className={styles.nodeShape}>
        {/* no rough rect on root — it's decorative text only */}
      </div>
      <div className={styles.nodeInner}>
        <div className={`${styles.nodeTitleMain} inline-block relative`}>
          YOU ARE HERE
          <span className="absolute left-0" style={{ bottom: '-14px', pointerEvents: 'none' }}>
            <FreehandUnderline width={220} seed={seedFor('root-underline')} double stroke="#c94c3a" />
          </span>
        </div>
        <div className={styles.nodeSub}>{composeRootSub(profile)}</div>
      </div>
      <span className={styles.nodeSelfArrow}>
        <FreehandArrow x1={-40} y1={30} x2={0} y2={60} seed={seedFor('root-arrow')} stroke="#c94c3a" />
      </span>
    </div>
  );
}
