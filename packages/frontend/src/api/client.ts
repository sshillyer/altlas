import type { Character, CreateCharacterDto } from '../types';

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

export const api = {
  characters: {
    list: () => get<Character[]>('/api/characters'),
    create: (body: CreateCharacterDto) => post<Character>('/api/characters', body),
    update: (id: string, body: Partial<Character>) => patch<Character>(`/api/characters/${id}`, body),
    delete: (id: string) => del<void>(`/api/characters/${id}`),
    reorder: (order: string[]) => post<{ success: boolean }>('/api/characters/reorder', { order }),
  },
};
