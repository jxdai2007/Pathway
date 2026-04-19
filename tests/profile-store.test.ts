import { describe, it, expect, beforeEach } from 'vitest';
import { useProfileStore } from '@/store/profile';
import type { IntakeProfile } from '@/lib/schemas';

describe('profile store (in-memory only)', () => {
  beforeEach(() => useProfileStore.setState({ profile: null }));

  it('starts with null profile', () => {
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('stores a profile when setProfile is called', () => {
    const p: IntakeProfile = { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' };
    useProfileStore.getState().setProfile(p);
    expect(useProfileStore.getState().profile).toEqual(p);
  });

  it('clears profile on reset', () => {
    useProfileStore.setState({ profile: { year: 'freshman', major_category: 'stem', first_gen: true, aid_status: 'pell', hours_per_week: 8, interests: ['ai_ml'], mode: 'discovery' } });
    useProfileStore.getState().reset();
    expect(useProfileStore.getState().profile).toBeNull();
  });
});
