import { create } from 'zustand';
import type { Profile } from '../types';

export type View = 'tracker' | 'characters' | 'profiles' | 'settings';

interface AppState {
  activeView: View;
  activeProfileId: string | null;
  profiles: Profile[];
  region: string;
  bnetConnected: boolean;
  setActiveView: (view: View) => void;
  setActiveProfile: (id: string | null) => void;
  setProfiles: (profiles: Profile[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'tracker',
  activeProfileId: null,
  profiles: [],
  region: 'us',
  bnetConnected: false,
  setActiveView: (view) => set({ activeView: view }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setProfiles: (profiles) => set({ profiles }),
}));
