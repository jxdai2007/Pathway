import { FreehandArrow } from './rough/FreehandArrow';
import { seedFor } from '@/lib/notebook-engine';
import styles from './notebook.module.css';

export function PanelEmpty() {
  return (
    <div className={styles.panelEmpty}>
      <span className={styles.panelEmptyArrow}>
        <FreehandArrow x1={10} y1={10} x2={72} y2={60} seed={seedFor('empty-arrow')} stroke="#c94c3a" />
      </span>
      <div className={styles.panelEmptyTtl}>pick a first move</div>
      <div className={styles.panelEmptySub}>open the dashed prompt on the left — three options will appear.</div>
    </div>
  );
}
