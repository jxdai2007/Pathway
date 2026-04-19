import { create } from 'zustand';
import type { IntakeProfile } from '@/lib/schemas';

type ProfileState = {
  profile: IntakeProfile | null;
  setProfile: (p: IntakeProfile) => void;
  reset: () => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  reset: () => set({ profile: null }),
}));
