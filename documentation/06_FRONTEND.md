# Altlas — Frontend Architecture

The frontend is a React + TypeScript + Vite single-page application. It communicates with the backend exclusively via the typed API client in `src/api/`. There is no direct database access from the frontend.

---

## State Management

Use **Zustand** for global client state. Keep server state in sync via direct API calls on user actions — no TanStack Query is needed given the simplicity of the data flow. The tracker data is refetched after any task toggle.

### Stores

**`useAppStore`** — global app state
```ts
{
  activeProfileId: string | null;
  region: string;
  bnetConnected: boolean;
  setActiveProfile: (id: string) => void;
}
```

**`useTrackerStore`** — tracker view state
```ts
{
  trackerData: TrackerState | null;   // response from GET /api/tasks/state
  isLoading: boolean;
  error: string | null;
  fetchTracker: () => Promise<void>;
  toggleTask: (characterTaskId: string, currentState: string | null) => Promise<void>;
}
```

---

## Views

### `TrackerView` — Primary view

This is the main spreadsheet-like grid. It renders task groups as row sections and characters as columns.

**Layout:**
```
[Sidebar: task group labels]  [Grid: char columns × task rows]
```

**Grid behavior:**
- Characters are columns, ordered by `sortOrder`.
- Tasks are rows, grouped by `category` with a sticky group header row.
- Each cell is a checkbox. Clicking toggles `completedAt` via `PATCH /api/tasks/character/:id`.
- Completed cells show a checkmark and a muted background.
- Cells where `isEnabled = false` are shown as a dash (—) and are not clickable.
- Per-account tasks (scope = `per_account`) show a single checkbox in the first column and span visually across all others with a merged appearance.
- A reset countdown strip at the top shows time until next daily and weekly reset.

**Performance note:** The grid can have 15+ characters × 30+ tasks. Use `React.memo` on cell components. Do not re-render the entire grid on a single cell toggle — update only the changed cell's state in the Zustand store.

### `CharactersView` — Character management

- List of all characters with class icon, name, realm, ilvl, professions.
- Add character form (manual entry).
- "Sync from Battle.net" button (calls `POST /api/sync/characters`) — only shown if Bnet is connected.
- Drag-to-reorder for sortOrder.
- Edit character inline (professions, isMain, spec).
- Delete character (with confirmation).

### `ProfilesView` — Profile management

- List of profiles with active indicator.
- Create profile: name, description, and a checklist of all task definitions grouped by category.
- Edit profile task list.
- Activate profile button (updates tracker view immediately).
- Cannot delete the Default profile.

### `SettingsView` — App settings

- Region selector (US / EU / KR / TW).
- Battle.net connection status + connect/disconnect button.
- Last sync timestamp.
- Manual reset trigger (dev mode only, shown when `import.meta.env.DEV`).
- Reset log table (last 10 entries).

---

## Navigation

Simple top navigation bar with tabs:
- **Tracker** (default)
- **Characters**
- **Profiles**
- **Settings**

No router library needed — use a single `activeView` string in `useAppStore` and conditionally render views.

---

## API Client

**`packages/frontend/src/api/client.ts`**

A typed fetch wrapper. All API calls go through this. Base URL is read from `import.meta.env.VITE_API_URL` (default `http://localhost:3001`).

```ts
export const api = {
  characters: {
    list: () => get<Character[]>('/api/characters'),
    create: (body: CreateCharacterDto) => post<Character>('/api/characters', body),
    update: (id: string, body: Partial<Character>) => patch<Character>(`/api/characters/${id}`, body),
    delete: (id: string) => del(`/api/characters/${id}`),
    reorder: (order: string[]) => post('/api/characters/reorder', { order }),
  },
  tasks: {
    getState: () => get<TrackerState>('/api/tasks/state'),
    toggleCell: (characterTaskId: string, completedAt: string | null) =>
      patch(`/api/tasks/character/${characterTaskId}`, { completedAt }),
  },
  profiles: {
    list: () => get<Profile[]>('/api/profiles'),
    create: (body: CreateProfileDto) => post<Profile>('/api/profiles', body),
    activate: (id: string) => post(`/api/profiles/${id}/activate`, {}),
    delete: (id: string) => del(`/api/profiles/${id}`),
  },
  resets: {
    schedule: () => get<ResetSchedule>('/api/resets/schedule'),
    log: () => get<ResetLogEntry[]>('/api/resets/log'),
    trigger: (type: 'daily' | 'weekly') => post('/api/resets/trigger', { type }),
  },
  auth: {
    status: () => get<{ connected: boolean; expiresAt: string | null }>('/api/auth/status'),
    getBnetUrl: () => get<{ url: string }>('/api/auth/bnet/url'),
    disconnect: () => del('/api/auth/bnet'),
  },
  sync: {
    all: () => post<SyncResult>('/api/sync/characters', {}),
    single: (id: string) => post<Character>(`/api/sync/characters/${id}`, {}),
  },
  settings: {
    get: () => get<Record<string, string>>('/api/settings'),
    update: (body: Record<string, string>) => patch('/api/settings', body),
  },
};
```

---

## Types (shared)

Define shared types in `packages/frontend/src/types.ts`. Key types:

```ts
type WowClass = 'deathknight' | 'demonhunter' | 'druid' | 'evoker' | 'hunter' |
  'mage' | 'monk' | 'paladin' | 'priest' | 'rogue' | 'shaman' | 'warlock' | 'warrior';

type ResetType = 'daily' | 'weekly' | 'never';
type TaskScope = 'per_character' | 'per_account';
type TaskCategory = 'vault' | 'profession' | 'pvp' | 'delve' | 'world' | 'dungeon' | 'raid' | 'misc';

interface Character { /* mirrors DB row */ }
interface TaskDefinition { /* mirrors DB row */ }
interface CharacterTaskState {
  characterTaskId: string;
  isEnabled: boolean;
  completedAt: string | null;
  notes: string | null;
}
interface TrackerTask {
  definitionId: string;
  name: string;
  resetType: ResetType;
  scope: TaskScope;
  characterState: Record<string, CharacterTaskState>; // keyed by characterId
}
interface TrackerTaskGroup {
  category: TaskCategory;
  label: string;
  tasks: TrackerTask[];
}
interface TrackerState {
  characters: Character[];
  taskGroups: TrackerTaskGroup[];
  nextDailyReset: string;
  nextWeeklyReset: string;
}
```

---

## Styling

Use **Tailwind CSS**. No component library is required — keep the UI functional and clean rather than elaborate. Use WoW class colors for character indicators where appropriate (standard community hex values per class). A dark theme is preferred given this is a gaming utility tool.

WoW class colors (standard community values):
```ts
const CLASS_COLORS: Record<WowClass, string> = {
  deathknight: '#C41E3A',
  demonhunter: '#A330C9',
  druid:       '#FF7C0A',
  evoker:      '#33937F',
  hunter:      '#AAD372',
  mage:        '#3FC7EB',
  monk:        '#00FF98',
  paladin:     '#F48CBA',
  priest:      '#FFFFFF',
  rogue:       '#FFF468',
  shaman:      '#0070DD',
  warlock:     '#8788EE',
  warrior:     '#C69B3A',
};
```
