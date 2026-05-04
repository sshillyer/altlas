import { create } from 'zustand';
import type { Profile } from '../types';

export type View = 'tracker' | 'characters' | 'profiles' | 'settings' | 'guides';

interface AppState {
  activeView: View;
  activeProfileId: string | null;
  profiles: Profile[];
  region: string;
  bnetAvailable: boolean;
  bnetConnected: boolean;
  pendingGuideClass: string | null;
  setActiveView: (view: View) => void;
  setActiveProfile: (id: string | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setBnetStatus: (available: boolean, connected: boolean) => void;
  openGuide: (wowClass: string) => void;
  clearPendingGuideClass: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'tracker',
  activeProfileId: null,
  profiles: [],
  region: 'us',
  bnetAvailable: false,
  bnetConnected: false,
  pendingGuideClass: null,
  setActiveView: (view) => set({ activeView: view }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setProfiles: (profiles) => set({ profiles }),
  setBnetStatus: (available, connected) => set({ bnetAvailable: available, bnetConnected: connected }),
  openGuide: (wowClass) => set({ activeView: 'guides', pendingGuideClass: wowClass }),
  clearPendingGuideClass: () => set({ pendingGuideClass: null }),
}));
