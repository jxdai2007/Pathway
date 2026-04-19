import type { IntakeProfile } from '@/lib/schemas';
import { composeRootSub } from '@/lib/notebook-engine';

export function RootNode({ profile }: { profile: IntakeProfile }) {
  return (
    <div className="mb-4 inline-block max-w-[460px] px-6 py-5">
      <div className="text-[42px] font-bold leading-none text-[#1e3a5f] font-[Caveat,cursive]">YOU ARE HERE</div>
      <div className="mt-2 text-base text-[#2a2a28]">{composeRootSub(profile)}</div>
    </div>
  );
}
