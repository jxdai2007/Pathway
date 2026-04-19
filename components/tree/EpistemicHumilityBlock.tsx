'use client';
import { usePathwayStore } from '@/store/pathway';

export function EpistemicHumilityBlock() {
  const humility = usePathwayStore((s) => s.humility);
  if (!humility) return null;
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-urgent-bg border border-urgent/30 rounded-md p-3 text-meta z-10 shadow-card">
      <div className="font-semibold text-urgent mb-1 uppercase tracking-wider text-tiny">What I might be wrong about</div>
      <p className="text-ink-2">{humility}</p>
      <p className="mt-2 text-ink-3 text-tiny">
        Pathway is a triage tool, not an advisor. Book a real human advisor for any high-stakes decision: {' '}
        <a href="https://www.aap.ucla.edu/" className="underline text-ucla-blue">AAP/EOP</a>, {' '}
        <a href="https://career.ucla.edu" className="underline text-ucla-blue">Career Center</a>, or your department's undergraduate advisor.
      </p>
    </div>
  );
}
