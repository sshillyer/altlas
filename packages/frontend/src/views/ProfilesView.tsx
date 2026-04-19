import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTrackerStore } from '../store/useTrackerStore';
import { api } from '../api/client';
import type { Profile, ProfileWithTasks, TaskDefinition, TaskCategory } from '../types';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  vault:      'Vault',
  profession: 'Profession',
  pvp:        'PvP',
  delve:      'Delves',
  world:      'World',
  dungeon:    'Dungeons',
  raid:       'Raid',
  misc:       'Misc',
};

const CATEGORY_ORDER: TaskCategory[] = [
  'vault', 'profession', 'pvp', 'delve', 'world', 'dungeon', 'raid', 'misc',
];

// ─── Task checklist grouped by category ──────────────────────────────────────

function TaskChecklist({
  definitions,
  selected,
  onChange,
}: {
  definitions: TaskDefinition[];
  selected: Set<string>;
  onChange: (id: string, checked: boolean) => void;
}) {
  const grouped = new Map<TaskCategory, TaskDefinition[]>();
  for (const def of definitions) {
    if (!grouped.has(def.category)) grouped.set(def.category, []);
    grouped.get(def.category)!.push(def);
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {CATEGORY_ORDER.map((cat) => {
        const defs = grouped.get(cat);
        if (!defs || defs.length === 0) return null;
        const allChecked = defs.every((d) => selected.has(d.id));
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => {
                  defs.forEach((d) => onChange(d.id, !allChecked));
                }}
                className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {CATEGORY_LABELS[cat]}
                <span className="ml-1 text-gray-600 normal-case tracking-normal font-normal">
                  ({defs.filter((d) => selected.has(d.id)).length}/{defs.length})
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-2">
              {defs.map((def) => (
                <label key={def.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.has(def.id)}
                    onChange={(e) => onChange(def.id, e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                    {def.name}
                    {def.resetType === 'daily' && (
                      <span className="ml-1 text-[9px] text-gray-600">D</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create profile form ──────────────────────────────────────────────────────

function CreateProfileForm({
  definitions,
  onCreated,
  onCancel,
}: {
  definitions: TaskDefinition[];
  onCreated: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(definitions.map((d) => d.id))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTaskChange(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await api.profiles.create({
        name: name.trim(),
        description: description.trim() || undefined,
        taskDefinitionIds: [...selected],
      });
      onCreated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">New Profile</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Casual Week"
            required
            className="w-full bg-gray-900 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note"
            className="w-full bg-gray-900 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">Tasks ({selected.size} selected)</div>
        <TaskChecklist definitions={definitions} selected={selected} onChange={handleTaskChange} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
        >
          {saving ? 'Creating…' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit profile form ────────────────────────────────────────────────────────

function EditProfileForm({
  profile,
  definitions,
  onSaved,
  onCancel,
}: {
  profile: ProfileWithTasks;
  definitions: TaskDefinition[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(profile.taskDefinitionIds)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTaskChange(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.profiles.update(profile.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        taskDefinitionIds: [...selected],
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-blue-700 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">Edit Profile</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">Tasks ({selected.size} selected)</div>
        <TaskChecklist definitions={definitions} selected={selected} onChange={handleTaskChange} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── ProfilesView ─────────────────────────────────────────────────────────────

export function ProfilesView() {
  const { activeProfileId, profiles, setActiveProfile, setProfiles } = useAppStore();
  const { fetchTracker } = useTrackerStore();

  const [definitions, setDefinitions] = useState<TaskDefinition[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithTasks | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    api.tasks.definitions(true).then(setDefinitions);
  }, []);

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      await api.profiles.activate(id);
      setActiveProfile(id);
      await fetchTracker();
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.profiles.delete(id);
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      // If we deleted the active profile, fall back (server already cleared it)
      if (activeProfileId === id) {
        setActiveProfile(null);
        await fetchTracker();
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreated(profile: Profile) {
    setProfiles([...profiles, profile]);
    setShowCreate(false);
  }

  async function handleEditStart(profile: Profile) {
    const full = await api.profiles.get(profile.id);
    setEditingProfile(full);
  }

  async function handleEditSaved() {
    const updated = await api.profiles.list();
    setProfiles(updated);
    setEditingProfile(null);
    // Refresh tracker in case active profile task list changed
    await fetchTracker();
  }

  const resolvedActiveId =
    activeProfileId ?? profiles.find((p) => p.isDefault)?.id ?? null;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Profiles</h2>
        {!showCreate && !editingProfile && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
          >
            + New Profile
          </button>
        )}
      </div>

      {showCreate && (
        <CreateProfileForm
          definitions={definitions}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editingProfile && (
        <EditProfileForm
          profile={editingProfile}
          definitions={definitions}
          onSaved={handleEditSaved}
          onCancel={() => setEditingProfile(null)}
        />
      )}

      <div className="space-y-2">
        {profiles.length === 0 && (
          <p className="text-sm text-gray-500">No profiles yet.</p>
        )}
        {profiles.map((profile) => {
          const isActive = profile.id === resolvedActiveId;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-blue-900/30 border-blue-700'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{profile.name}</span>
                  {profile.isDefault && (
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 border border-gray-600 rounded px-1">
                      default
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 border border-blue-700 rounded px-1">
                      active
                    </span>
                  )}
                </div>
                {profile.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{profile.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isActive && (
                  <button
                    onClick={() => handleActivate(profile.id)}
                    disabled={activatingId === profile.id}
                    className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-white transition-colors"
                  >
                    {activatingId === profile.id ? 'Activating…' : 'Activate'}
                  </button>
                )}
                <button
                  onClick={() => handleEditStart(profile)}
                  disabled={!!editingProfile}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Edit
                </button>
                {!profile.isDefault && (
                  <button
                    onClick={() => handleDelete(profile.id)}
                    disabled={deletingId === profile.id}
                    className="px-3 py-1 text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === profile.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
