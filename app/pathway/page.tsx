'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfileStore } from '@/store/profile';
import { TreeScreen } from '@/components/tree/TreeScreen';

export default function PathwayPage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (!profile) router.replace('/');
  }, [profile, router]);

  if (!profile) return null;
  return <TreeScreen />;
}
