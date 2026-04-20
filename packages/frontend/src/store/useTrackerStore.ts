import { create } from 'zustand';
import type { TrackerState } from '../types';
import { api } from '../api/client';

interface TrackerStore {
  trackerData: TrackerState | null;
  isLoading: boolean;
  error: string | null;
  fetchTracker: () => Promise<void>;
  toggleTask: (characterTaskId: string, currentCompletedAt: string | null) => Promise<void>;
  saveNote: (characterTaskId: string, completedAt: string | null, notes: string | null) => Promise<void>;
  toggleEnabled: (characterTaskId: string) => Promise<void>;
}

function patchCell(
  data: TrackerState,
  characterTaskId: string,
  update: (cell: TrackerState['taskGroups'][number]['tasks'][number]['characterState'][string]) => TrackerState['taskGroups'][number]['tasks'][number]['characterState'][string],
): TrackerState {
  const taskGroups = data.taskGroups.map((group) => ({
    ...group,
    tasks: group.tasks.map((task) => {
      const newCharState = { ...task.characterState };
      let changed = false;
      for (const charId of Object.keys(newCharState)) {
        if (newCharState[charId].characterTaskId === characterTaskId) {
          newCharState[charId] = update(newCharState[charId]);
          changed = true;
          break;
        }
      }
      return changed ? { ...task, characterState: newCharState } : task;
    }),
  }));
  return { ...data, taskGroups };
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

    set((state) => {
      if (!state.trackerData) return state;
      return { trackerData: patchCell(state.trackerData, characterTaskId, (cell) => ({ ...cell, completedAt })) };
    });

    try {
      await api.tasks.toggleCell(characterTaskId, completedAt);
    } catch {
      await get().fetchTracker();
    }
  },

  saveNote: async (characterTaskId, completedAt, notes) => {
    set((state) => {
      if (!state.trackerData) return state;
      return { trackerData: patchCell(state.trackerData, characterTaskId, (cell) => ({ ...cell, notes: notes ?? null })) };
    });

    try {
      await api.tasks.saveNote(characterTaskId, completedAt, notes);
    } catch {
      await get().fetchTracker();
    }
  },

  toggleEnabled: async (characterTaskId) => {
    set((state) => {
      if (!state.trackerData) return state;
      return { trackerData: patchCell(state.trackerData, characterTaskId, (cell) => ({ ...cell, isEnabled: !cell.isEnabled })) };
    });

    try {
      await api.tasks.toggleEnabled(characterTaskId);
    } catch {
      await get().fetchTracker();
    }
  },
}));
