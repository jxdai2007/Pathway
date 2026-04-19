'use client';
import { usePathwayStore } from '@/store/pathway';
import { STAGES, STAGE_KEYS } from '@/lib/stages';
import { PanelEmpty } from './PanelEmpty';

export function Panel() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const previewId = usePathwayStore((s) => s.previewNodeId);
  const openIdx = usePathwayStore((s) => s.openPromptStageIdx);
  const lockedLen = usePathwayStore((s) => s.lockedNodeIds.length);
  const lockIn = usePathwayStore((s) => s.lockIn);
  const cancel = usePathwayStore((s) => s.cancelPreview);

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

  const stageIdx = openIdx ?? (STAGE_KEYS as readonly string[]).indexOf(node.stage_key);
  const isReopening = stageIdx < lockedLen;
  const willWipe = Math.max(0, lockedLen - stageIdx);

  return (
    <div className="px-10 pt-8 pb-10">
      <div className="mb-1 text-sm italic text-[#c94c3a]">{node.eyebrow} · {STAGES[stageIdx].stage}</div>
      <h2 className="mb-4 text-3xl font-bold leading-tight text-[#1e3a5f] font-[Caveat,cursive]">{node.title}</h2>
      <div className="mb-5 rounded border-l-[3px] border-[#c94c3a] bg-[#fdf5dc] px-4 py-3">
        <div className="text-sm"><span className="font-bold text-[#c94c3a]">When:</span> {STAGES[stageIdx].when}</div>
        <div className="text-sm"><span className="font-bold text-[#c94c3a]">Effort:</span> {node.estimated_time_cost}</div>
      </div>
      {node.why_this && (
        <div className="mb-5 border-l-2 border-[#c94c3a88] pl-3">
          <div className="mb-1 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">why this</div>
          <div className="text-base">{node.why_this}</div>
        </div>
      )}
      {node.description && (
        <div className="mb-5">
          <div className="mb-1 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">details</div>
          <div className="text-[15px] leading-relaxed">{node.description}</div>
        </div>
      )}
      {node.cites.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-lg font-bold text-[#c94c3a] font-[Caveat,cursive]">cites</div>
          {node.cites.map((c, i) => (
            <div key={i} className="mb-1 flex items-start gap-2 text-sm">
              <span className="font-bold text-[#c94c3a]">{i + 1}</span>
              <div><strong>{c.label}</strong> — <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-[#c94c3a]">{new URL(c.url).host}</a> · {c.summary}</div>
            </div>
          ))}
        </div>
      )}
      {isReopening && willWipe > 0 && (
        <div className="mb-4 border-l-2 border-[#c94c3a] pl-3 text-xs italic text-[#c94c3a]">
          ⚠ Locking here will wipe {willWipe} later step{willWipe > 1 ? 's' : ''}.
        </div>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => lockIn(stageIdx, node.id)}
          className="flex-1 rounded border-2 border-[#c94c3a] px-4 py-2 text-xl font-bold text-[#c94c3a] font-[Caveat,cursive]"
        >Lock it in ✓</button>
        <button
          type="button"
          onClick={cancel}
          className="flex-1 rounded border-2 border-[#6b6658] px-4 py-2 text-xl font-bold text-[#6b6658] font-[Caveat,cursive]"
        >dismiss</button>
      </div>
    </div>
  );
}
