'use client';
import { useMemo } from 'react';
import seedsJson from '@/data/ucla/first_layer_seeds.json';
import type { FirstLayerSeed } from '@/lib/schemas';
import type { TreeUINode, PathColor } from '@/lib/tree-layout';
import { TreeCanvas } from './TreeCanvas';

const PATH_COLORS: PathColor[] = ['blue', 'gold', 'slate'];

export function TreeScreen() {
  const root: TreeUINode = useMemo(() => {
    const seeds = (seedsJson as FirstLayerSeed[]).filter(s => s.applies_to_majors.includes('stem'));
    const firstLayer: TreeUINode[] = seeds.slice(0, 3).map((s, i) => ({
      id: s.id,
      title: s.title,
      tagline: s.description.slice(0, 72),
      depth: 1,
      path_color: PATH_COLORS[i] ?? 'slate',
      children: s.sample_downstream.slice(0, 2).map((d, j) => ({
        id: `${s.id}-d2-${j}`,
        title: d,
        tagline: 'Next milestone',
        depth: 2,
      })),
    }));
    return {
      id: 'root',
      title: 'Your Pathway',
      tagline: 'Pick a direction to explore',
      depth: 0,
      children: firstLayer,
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper px-6 py-8">
      <header className="max-w-[1200px] mx-auto mb-4">
        <h1 className="text-display font-bold text-ink">Your Pathway</h1>
        <p className="text-body text-ink-2">A sketch of your next two years as a tree you can walk through.</p>
      </header>
      <div className="max-w-[1200px] mx-auto overflow-auto">
        <TreeCanvas root={root} />
      </div>
      <footer className="max-w-[1200px] mx-auto mt-6 text-meta text-ink-3 italic">
        Pathway augments — does not replace — a real advisor. Every leaf points to a human.
      </footer>
    </div>
  );
}
