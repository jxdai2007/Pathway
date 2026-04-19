'use client';
import type { Node } from '@/lib/schemas';
import { synthesizeTodos, seedFor, rotationFor } from '@/lib/notebook-engine';
import { usePathwayStore } from '@/store/pathway';
import { RoughRect } from './rough/RoughRect';
import { FreehandCheck } from './rough/FreehandCheck';
import { FreehandBox } from './rough/FreehandBox';
import { FreehandStrike } from './rough/FreehandStrike';
import { useMeasure } from '@/hooks/useMeasure';
import styles from './notebook.module.css';

export function LockedNode({ node, stageIdx }: { node: Node; stageIdx: number }) {
  const reopen = usePathwayStore((s) => s.reopen);
  const toggle = usePathwayStore((s) => s.toggleTodoDone);
  const todos = node.todos.length ? node.todos : synthesizeTodos(node, stageIdx);
  const { ref, size } = useMeasure<HTMLDivElement>();
  const rot = rotationFor('locked-' + node.id);

  return (
    <div
      ref={ref}
      className={`${styles.node} ${styles.nodeLocked}`}
      style={{ '--rot': `${rot}deg` } as React.CSSProperties}
    >
      {size.w > 0 && (
        <RoughRect
          width={size.w}
          height={size.h}
          seed={seedFor('locked-' + node.id)}
        />
      )}
      <span className={styles.nodeCheck}>
        <FreehandCheck size={36} seed={seedFor('locked-check-' + node.id)} stroke="#c94c3a" strokeWidth={3} />
      </span>
      <div className={styles.nodeInner}>
        <button
          type="button"
          onClick={() => reopen(stageIdx)}
          className="block w-full text-left"
        >
          <div className={styles.nodeEyebrow}>{node.eyebrow}</div>
          <div className={styles.nodeTitle}>{node.title}</div>
        </button>
        <div className={styles.nodeTodos}>
          <div className={styles.nodeTodosLbl}>next steps</div>
          {todos.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(node.id, i); }}
              className={`${styles.nodeTodo} ${t.done ? styles.nodeTodoDone : ''}`}
            >
              <span className={styles.nodeTodoBox}>
                <FreehandBox size={18} seed={seedFor('todo-box-' + node.id + ':' + i)} />
                {t.done && (
                  <span className="absolute inset-0">
                    <FreehandCheck size={18} seed={seedFor('todo-check-' + node.id + ':' + i)} />
                  </span>
                )}
              </span>
              <span className={styles.nodeTodoTxt}>
                {t.text}
                {t.done && (
                  <span className={styles.nodeTodoStrike}>
                    <FreehandStrike width={120} seed={seedFor('todo-strike-' + node.id + ':' + i)} />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
