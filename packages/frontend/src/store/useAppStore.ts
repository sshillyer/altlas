import { create } from 'zustand';

export type View = 'tracker' | 'characters' | 'profiles' | 'settings';

interface AppState {
  activeView: View;
  activeProfileId: string | null;
  region: string;
  bnetConnected: boolean;
  setActiveView: (view: View) => void;
  setActiveProfile: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'tracker',
  activeProfileId: null,
  region: 'us',
  bnetConnected: false,
  setActiveView: (view) => set({ activeView: view }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
}));
