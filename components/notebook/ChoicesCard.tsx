'use client';
import type { Node } from '@/lib/schemas';
import { usePathwayStore } from '@/store/pathway';

type Props = { stageIdx: number; options: Node[] | null; loading: boolean };

export function ChoicesCard({ stageIdx, options, loading }: Props) {
  const previewNodeId = usePathwayStore((s) => s.previewNodeId);
  const setPreview = usePathwayStore((s) => s.setPreview);
  const setState = usePathwayStore.setState;
  return (
    <div className="relative w-full max-w-[460px] rounded border-2 border-dashed border-[#1e3a5f] p-5">
      <div className="mb-3 flex items-end justify-between">
        <div className="text-xl font-bold text-[#c94c3a] font-[Caveat,cursive]">Pick one</div>
        <button
          type="button"
          onClick={() => setState({ openPromptStageIdx: null, previewNodeId: null })}
          className="text-xl text-[#6b6658]"
        >×</button>
      </div>
      {loading && !options?.length ? (
        <div className="text-sm italic text-[#6b6658]">loading options…</div>
      ) : !options?.length ? (
        <div className="text-sm italic text-[#c94c3a]">no options available — hit start over</div>
      ) : (
        options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPreview(opt.id)}
            className={`flex w-full items-start gap-3 py-2 pr-2 text-left text-base text-[#1e3a5f] ${
              previewNodeId === opt.id ? 'font-bold' : ''
            }`}
          >
            <span className={`mt-1 inline-block h-5 w-5 shrink-0 border-2 border-[#1e3a5f] ${
              previewNodeId === opt.id ? 'bg-[#f4d35e]' : ''
            }`} />
            <span>{opt.title}</span>
          </button>
        ))
      )}
    </div>
  );
}
