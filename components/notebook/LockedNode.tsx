'use client';
import type { Node } from '@/lib/schemas';
import { synthesizeTodos } from '@/lib/notebook-engine';
import { usePathwayStore } from '@/store/pathway';

export function LockedNode({ node, stageIdx }: { node: Node; stageIdx: number }) {
  const reopen = usePathwayStore((s) => s.reopen);
  const toggle = usePathwayStore((s) => s.toggleTodoDone);
  const todos = node.todos.length ? node.todos : synthesizeTodos(node, stageIdx);
  return (
    <div className="relative rounded border border-[#1e3a5f33] bg-[#fef3a2] p-4 max-w-[420px]">
      <button
        type="button"
        onClick={() => reopen(stageIdx)}
        className="block w-full text-left"
      >
        <div className="text-xs italic text-[#6b6658]">{node.eyebrow}</div>
        <div className="text-base font-bold text-[#1e3a5f]">{node.title}</div>
      </button>
      <div className="mt-3 border-t border-dashed border-[#1e3a5f33] pt-2">
        <div className="text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">next steps</div>
        {todos.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(node.id, i); }}
            className="flex w-full items-start gap-2 py-0.5 text-left text-sm text-[#1e3a5f]"
          >
            <span
              className={`mt-0.5 inline-block h-4 w-4 shrink-0 border border-[#1e3a5f] ${
                t.done ? 'bg-[#1e3a5f]' : ''
              }`}
            />
            <span className={t.done ? 'text-[#6b6658] line-through' : ''}>{t.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
