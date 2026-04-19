'use client';
import { usePathwayStore } from '@/store/pathway';

export function PromptNode({ stageIdx, prompt }: { stageIdx: number; prompt: string }) {
  const openPrompt = usePathwayStore((s) => s.openPromptStageIdx);
  const setIdx = usePathwayStore.setState;
  return (
    <button
      type="button"
      onClick={() => setIdx({ openPromptStageIdx: stageIdx })}
      className="block w-full max-w-[420px] rounded border-2 border-dashed border-[#1e3a5f] p-4 text-left"
    >
      <div className="text-xs italic text-[#c94c3a]">click to open</div>
      <div className="text-xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">{prompt}</div>
      <div className="mt-1 text-xs italic text-[#c94c3a]">see 3 choices →</div>
    </button>
  );
}
