'use client';
import { useRouter } from 'next/navigation';
import personasData from '@/data/ucla/personas.json';
import { useProfileStore } from '@/store/profile';
import { usePathwayStore } from '@/store/pathway';
import type { IntakeProfile } from '@/lib/schemas';

type Persona = { key: string; display_name: string; profile: IntakeProfile };

export function PersonaTabStrip() {
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const currentProfile = useProfileStore((s) => s.profile);
  const personas = personasData as Persona[];

  const switchTo = (p: Persona) => {
    usePathwayStore.getState().reset();
    setProfile(p.profile);
    router.replace('/pathway');
  };

  const active = personas.find(
    (p) =>
      p.profile.mode === currentProfile?.mode &&
      p.profile.year === currentProfile?.year
  );

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-cream border border-line rounded-full shadow-lift px-2 py-1.5 flex items-center gap-1">
      <span className="text-tiny text-ink-3 px-2">Demo persona:</span>
      {personas.map((p) => {
        const isActive = active?.key === p.key;
        return (
          <button
            key={p.key}
            onClick={() => switchTo(p)}
            className={`px-3 py-1 rounded-full text-meta font-medium transition ${
              isActive
                ? 'bg-ucla-blue text-cream'
                : 'text-ink-2 hover:bg-paper-2'
            }`}
          >
            {p.display_name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
