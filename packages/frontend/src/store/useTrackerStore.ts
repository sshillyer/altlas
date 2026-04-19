import { create } from 'zustand';
import type { TrackerState } from '../types';
import { api } from '../api/client';

interface TrackerStore {
  trackerData: TrackerState | null;
  isLoading: boolean;
  error: string | null;
  fetchTracker: () => Promise<void>;
  toggleTask: (characterTaskId: string, currentCompletedAt: string | null) => Promise<void>;
}

export const useTrackerStore = create<TrackerStore>((set, get) => ({
  trackerData: null,
  isLoading: false,
  error: null,

  fetchTracker: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.tasks.getState();
      set({ trackerData: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load tracker data',
        isLoading: false,
      });
    }
  },

  toggleTask: async (characterTaskId, currentCompletedAt) => {
    const completedAt = currentCompletedAt ? null : new Date().toISOString();

    // Optimistic update: scan task groups to find the matching cell by characterTaskId
    set((state) => {
      if (!state.trackerData) return state;
      const taskGroups = state.trackerData.taskGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => {
          let changed = false;
          const newCharState = { ...task.characterState };
          for (const charId of Object.keys(newCharState)) {
            if (newCharState[charId].characterTaskId === characterTaskId) {
              newCharState[charId] = { ...newCharState[charId], completedAt };
              changed = true;
              break;
            }
          }
          return changed ? { ...task, characterState: newCharState } : task;
        }),
      }));
      return { trackerData: { ...state.trackerData, taskGroups } };
    });

    try {
      await api.tasks.toggleCell(characterTaskId, completedAt);
    } catch {
      // Revert by refetching from server
      await get().fetchTracker();
    }
  },
}));
