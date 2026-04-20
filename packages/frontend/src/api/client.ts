import type {
  Character,
  CreateCharacterDto,
  TrackerState,
  TaskDefinition,
  Profile,
  ProfileWithTasks,
  CreateProfileDto,
} from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const get  = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export interface BnetAuthStatus {
  available: boolean;
  connected: boolean;
  expiresAt: string | null;
}

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  characters: Character[];
}

export const api = {
  characters: {
    list: () => get<Character[]>('/api/characters'),
    create: (body: CreateCharacterDto) => post<Character>('/api/characters', body),
    update: (id: string, body: Partial<Character>) => patch<Character>(`/api/characters/${id}`, body),
    delete: (id: string) => del<void>(`/api/characters/${id}`),
    reorder: (order: string[]) => post<{ success: boolean }>('/api/characters/reorder', { order }),
  },
  tasks: {
    getState: () => get<TrackerState>('/api/tasks/state'),
    definitions: (active?: boolean) =>
      get<TaskDefinition[]>(`/api/tasks/definitions${active !== undefined ? `?active=${active}` : ''}`),
    toggleCell: (characterTaskId: string, completedAt: string | null) =>
      patch<unknown>(`/api/tasks/character/${characterTaskId}`, { completedAt }),
    saveNote: (characterTaskId: string, completedAt: string | null, notes: string | null) =>
      patch<unknown>(`/api/tasks/character/${characterTaskId}`, { completedAt, notes }),
    toggleEnabled: (characterTaskId: string) =>
      patch<unknown>(`/api/tasks/character/${characterTaskId}/toggle-enabled`, {}),
  },
  profiles: {
    list: () => get<Profile[]>('/api/profiles'),
    create: (body: CreateProfileDto) => post<Profile>('/api/profiles', body),
    get: (id: string) => get<ProfileWithTasks>(`/api/profiles/${id}`),
    update: (id: string, body: Partial<CreateProfileDto>) =>
      patch<ProfileWithTasks>(`/api/profiles/${id}`, body),
    delete: (id: string) => del<void>(`/api/profiles/${id}`),
    activate: (id: string) =>
      post<{ success: boolean; activeProfileId: string }>(`/api/profiles/${id}/activate`, {}),
  },
  settings: {
    get: () => get<Record<string, string>>('/api/settings'),
    update: (body: Record<string, string>) => patch<Record<string, string>>('/api/settings', body),
  },
  auth: {
    status: () => get<BnetAuthStatus>('/api/auth/status'),
    getBnetUrl: () => get<{ available: boolean; url?: string }>('/api/auth/bnet/url'),
    disconnect: () => del<void>('/api/auth/bnet'),
  },
  sync: {
    all: () => post<SyncResult>('/api/sync/characters', {}),
    single: (id: string) => post<Character>(`/api/sync/characters/${id}`, {}),
  },
  resets: {
    schedule: () => get<{
      region: string;
      nextDaily: string;
      nextWeekly: string;
      lastDailyReset: string;
      lastWeeklyReset: string;
    }>('/api/resets/schedule'),
    log: () => get<Array<{
      id: string;
      resetType: string;
      region: string;
      scheduledAt: string;
      executedAt: string;
      rowsAffected: number;
    }>>('/api/resets/log'),
    trigger: (type: 'daily' | 'weekly') => post<{ ok: boolean }>('/api/resets/trigger', { type }),
  },
};
