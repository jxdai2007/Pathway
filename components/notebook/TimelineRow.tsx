import type { IntakeProfile, Node } from '@/lib/schemas';
import { STAGES } from '@/lib/stages';
import { LockedNode } from './LockedNode';
import { PromptNode } from './PromptNode';
import { ChoicesCard } from './ChoicesCard';
import styles from './notebook.module.css';

type Props = {
  stageIdx: number;
  profile: IntakeProfile;
  locked: Node | null;
  isOpen: boolean;
  options: Node[] | null;
  loading: boolean;
};

export function TimelineRow(p: Props) {
  const stage = STAGES[p.stageIdx];
  return (
    <div className={`${styles.tlRow} ${p.locked ? styles.tlRowHasSticky : ''}`}>
      <div className={styles.tlStageLbl}>{stage.stage}</div>
      <div className="mb-2 text-sm italic text-[#6b6658]">{stage.when}</div>
      {p.locked ? (
        <LockedNode node={p.locked} stageIdx={p.stageIdx} />
      ) : p.isOpen ? (
        <ChoicesCard stageIdx={p.stageIdx} options={p.options} loading={p.loading} />
      ) : (
        <PromptNode stageIdx={p.stageIdx} prompt={stage.prompt} />
      )}
    </div>
  );
}
