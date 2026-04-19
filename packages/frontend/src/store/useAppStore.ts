import { create } from 'zustand';
import type { Profile } from '../types';

export type View = 'tracker' | 'characters' | 'profiles' | 'settings';

interface AppState {
  activeView: View;
  activeProfileId: string | null;
  profiles: Profile[];
  region: string;
  bnetAvailable: boolean;
  bnetConnected: boolean;
  setActiveView: (view: View) => void;
  setActiveProfile: (id: string | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setBnetStatus: (available: boolean, connected: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'tracker',
  activeProfileId: null,
  profiles: [],
  region: 'us',
  bnetAvailable: false,
  bnetConnected: false,
  setActiveView: (view) => set({ activeView: view }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setProfiles: (profiles) => set({ profiles }),
  setBnetStatus: (available, connected) => set({ bnetAvailable: available, bnetConnected: connected }),
}));
