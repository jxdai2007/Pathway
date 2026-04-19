'use client';
import { usePathwayStore } from '@/store/pathway';

export function GhostRail() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const focusedSeedId = usePathwayStore((s) => s.focusedSeedId);
  const setFocusedSeedId = usePathwayStore((s) => s.setFocusedSeedId);
  const root = nodesById['root'];
  if (!root) return null;
  const ghosts = root.children
    .map((id) => nodesById[id])
    .filter((n) => n && n.id !== focusedSeedId);
  if (ghosts.length === 0) return null;

  return (
    <aside className="fixed right-6 top-32 z-10 w-56 space-y-3">
      <div className="text-tiny uppercase tracking-wider text-ink-3 font-semibold">Alternative futures</div>
      {ghosts.map((g) => (
        <button
          key={g.id}
          onClick={() => setFocusedSeedId(g.id)}
          className="w-full text-left rounded-md bg-cream border border-line px-3 py-2 opacity-70 hover:opacity-100 hover:shadow-card transition"
        >
          <div className="text-tiny uppercase tracking-wider text-ink-4">Unchosen path</div>
          <div className="text-body font-semibold text-ink leading-tight">{g.title}</div>
          {g.description && <div className="text-meta text-ink-3 line-clamp-2 mt-1">{g.description.slice(0, 80)}</div>}
          <div className="text-tiny text-ucla-blue mt-1">Click to walk this one →</div>
        </button>
      ))}
    </aside>
  );
}
