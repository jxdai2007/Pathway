'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfileStore } from '@/store/profile';
import { TreeScreen } from '@/components/tree/TreeScreen';
import { NodePanel } from '@/components/tree/NodePanel';
import { ProgressBar } from '@/components/tree/ProgressBar';
import { EpistemicHumilityBlock } from '@/components/tree/EpistemicHumilityBlock';
import { GhostRail } from '@/components/tree/GhostRail';

function PathwayContent() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!profile) router.replace('/');
  }, [profile, router]);

  if (!profile) return null;

  const ghostsEnabled = searchParams.get('ghosts') !== '0';
  // citations param reserved for future inline-citation toggle; no-op for now.

  return (
    <>
      <ProgressBar />
      <TreeScreen />
      {ghostsEnabled && <GhostRail />}
      <NodePanel />
      <EpistemicHumilityBlock />
    </>
  );
}

export default function PathwayPage() {
  return (
    <Suspense fallback={null}>
      <PathwayContent />
    </Suspense>
  );
}
