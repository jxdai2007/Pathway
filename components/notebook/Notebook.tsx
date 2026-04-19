'use client';

import { useProfileStore } from '@/store/profile';
import { usePathwayStore } from '@/store/pathway';
import { composeRootSub } from '@/lib/notebook-engine';
import { Timeline } from './Timeline';
import { Panel } from './Panel';

export function Notebook() {
  const profile = useProfileStore((s) => s.profile);
  const reset = usePathwayStore((s) => s.reset);
  const mode = profile?.mode ?? 'discovery';

  if (!profile) {
    return <div className="p-8">No profile — complete onboarding first.</div>;
  }
  return (
    <div className="min-h-screen bg-[#d8d2c0] font-[Kalam,cursive] text-[19px] leading-[1.55] text-[#2a2a28]">
      <div className="mx-auto max-w-[1400px] px-10 pt-11 pb-24">
        <header className="flex items-baseline gap-4 pl-14">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Pathway · a working notebook</h1>
          <span className="text-sm italic text-[#6b6658]">stages unfold one at a time</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto rounded border border-dashed border-[#6b6658] px-3 py-0.5 text-sm text-[#1e3a5f] hover:border-[#c94c3a] hover:text-[#c94c3a]"
          >↺ start over</button>
        </header>
        <div className="mt-3 grid h-[860px] grid-cols-2 overflow-hidden rounded bg-[#fdfaf0] shadow-xl">
          <div className="overflow-auto border-r border-[#6b665833]">
            <Timeline profile={profile} />
          </div>
          <div className="overflow-auto">
            <Panel />
          </div>
        </div>
        <p className="mt-2 pl-14 text-xs italic text-[#6b6658]">Mode: {mode}</p>
      </div>
    </div>
  );
}
