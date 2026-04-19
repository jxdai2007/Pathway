'use client';
import { Progress } from '@/components/ui/progress';
import { usePathwayStore } from '@/store/pathway';

export function ProgressBar() {
  const nodesById = usePathwayStore((s) => s.nodesById);
  const all = Object.values(nodesById);
  const total = all.reduce((acc, n) => acc + n.todos.length, 0);
  const done = all.reduce((acc, n) => acc + n.todos.filter((t) => t.done).length, 0);
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10 bg-cream border border-line rounded-full shadow-card px-4 py-2 flex items-center gap-3 min-w-[260px]">
      <Progress value={pct} className="w-32" />
      <span className="text-meta font-medium text-ink-2">{done}/{total} todos done</span>
    </div>
  );
}
