import { create } from 'zustand';

interface OnboardingState {
  completed: boolean;
  completeOnboarding: () => void;
}

// Intentionally NOT persisted. Onboarding is a pre-auth intro shown on every
// cold start while signed out; `completed` resets each app launch. Signed-in
// users skip it entirely via the routing guard in app/_layout.tsx.
export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: false,
  completeOnboarding: () => set({ completed: true }),
}));
