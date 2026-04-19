import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { CLASS_COLORS, WOW_CLASSES, type Character, type CreateCharacterDto, type WowClass } from '../types';

type SortKey = 'ilvl' | 'level' | 'name';

function SortableRow({
  char,
  onDelete,
  onToggleTracked,
}: {
  char: Character;
  onDelete: (id: string) => void;
  onToggleTracked: (id: string, current: boolean) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: char.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const classColor = CLASS_COLORS[char.class] ?? '#888';
  const professions = [char.professionA, char.professionB].filter(Boolean).join(', ') || 'No professions';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded px-3 py-2 group transition-colors ${
        char.isTracked ? 'bg-gray-800' : 'bg-gray-800/40'
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      <div
        className="w-2 h-8 rounded-sm flex-shrink-0"
        style={{ backgroundColor: char.isTracked ? classColor : '#4b5563' }}
      />

      <div className="flex-1 min-w-0">
        <span className={`font-medium ${char.isTracked ? 'text-white' : 'text-gray-500'}`}>
          {char.name}
          {char.isMain && <span className="ml-1 text-xs text-yellow-400">★</span>}
        </span>
        <span className="text-gray-400 text-sm ml-1">— {char.realm}</span>
      </div>

      <div className="text-sm text-gray-500 w-10 text-right hidden sm:block">
        {char.level ?? '—'}
      </div>

      <div className="text-sm text-gray-400 w-20 text-right">
        {char.ilvl != null ? `${char.ilvl} ilvl` : '—'}
      </div>

      <div className="text-sm text-gray-500 w-40 hidden sm:block truncate" title={professions}>
        {professions}
      </div>

      <div className="text-xs text-gray-500 capitalize w-20 hidden md:block">
        {char.class.replace('deathknight', 'DK').replace('demonhunter', 'DH')}
      </div>

      {/* Tracker toggle */}
      <button
        onClick={() => onToggleTracked(char.id, char.isTracked)}
        title={char.isTracked ? 'Shown on tracker — click to hide' : 'Hidden from tracker — click to show'}
        className={`text-xs px-2 py-0.5 rounded border transition-colors flex-shrink-0 ${
          char.isTracked
            ? 'border-blue-600 text-blue-400 hover:border-red-500 hover:text-red-400'
            : 'border-gray-600 text-gray-600 hover:border-blue-600 hover:text-blue-400'
        }`}
      >
        {char.isTracked ? 'Tracked' : 'Hidden'}
      </button>

      {confirmDelete ? (
        <div className="flex items-center gap-1 text-sm">
          <span className="text-red-400">Delete {char.name}?</span>
          <button
            onClick={() => onDelete(char.id)}
            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 rounded text-white text-xs"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-gray-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Delete ${char.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

const EMPTY_FORM: CreateCharacterDto = {
  name: '',
  realm: '',
  region: 'us',
  class: 'warrior',
  spec: '',
  professionA: '',
  professionB: '',
  isMain: false,
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'ilvl',  label: 'Item Level' },
  { key: 'level', label: 'Level' },
  { key: 'name',  label: 'Name (A–Z)' },
];

export function CharactersView() {
  const { bnetConnected } = useAppStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CreateCharacterDto>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api.characters.list()
      .then(setCharacters)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCharacters((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      api.characters.reorder(reordered.map((c) => c.id)).catch(console.error);
      return reordered;
    });
  }

  async function handleDelete(id: string) {
    try {
      await api.characters.delete(id);
      setCharacters((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete character');
    }
  }

  async function handleToggleTracked(id: string, current: boolean) {
    try {
      const updated = await api.characters.update(id, { isTracked: !current });
      setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update character');
    }
  }

  async function handleSort(key: SortKey) {
    const sorted = [...characters].sort((a, b) => {
      if (key === 'ilvl') {
        return (b.ilvl ?? -1) - (a.ilvl ?? -1);
      }
      if (key === 'level') {
        return (b.level ?? 0) - (a.level ?? 0);
      }
      return a.name.localeCompare(b.name);
    });
    setCharacters(sorted);
    await api.characters.reorder(sorted.map((c) => c.id)).catch(console.error);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await api.characters.create({
        ...form,
        spec: form.spec || undefined,
        professionA: form.professionA || undefined,
        professionB: form.professionB || undefined,
      });
      setCharacters((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setFormError(msg.includes('409') ? 'That character already exists.' : msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSyncAll() {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.sync.all();
      setCharacters(await api.characters.list());
      setSyncMessage(`Sync complete: ${result.added} added, ${result.updated} updated.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncMessage(msg.includes('bnet_token_expired')
        ? 'Battle.net token expired — reconnect in Settings.'
        : `Sync failed: ${msg}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  }

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-white">Characters</h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort by */}
          {characters.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Sort by:</span>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {bnetConnected && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm text-white"
            >
              {isSyncing ? 'Syncing…' : 'Sync from Battle.net'}
            </button>
          )}
          <button
            onClick={() => { setShowAddForm((v) => !v); setFormError(null); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
          >
            {showAddForm ? 'Cancel' : '+ Add Character'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <p className={`mb-3 text-sm ${syncMessage.includes('failed') || syncMessage.includes('expired') ? 'text-red-400' : 'text-green-400'}`}>
          {syncMessage}
        </p>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-gray-800 rounded p-4 mb-4 grid grid-cols-2 gap-3"
        >
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-400">Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
              placeholder="Thraxon"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Realm *</span>
            <input
              required
              value={form.realm}
              onChange={(e) => setForm((f) => ({ ...f, realm: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
              placeholder="Stormrage"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Region</span>
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
            >
              {['us', 'eu', 'kr', 'tw'].map((r) => (
                <option key={r} value={r}>{r.toUpperCase()}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Class *</span>
            <select
              required
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value as WowClass }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
            >
              {WOW_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1).replace('knight', ' Knight').replace('hunter', ' Hunter')}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Spec</span>
            <input
              value={form.spec ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, spec: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
              placeholder="beast_mastery"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Profession A</span>
            <input
              value={form.professionA ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, professionA: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
              placeholder="mining"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Profession B</span>
            <input
              value={form.professionB ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, professionB: e.target.value }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
              placeholder="engineering"
            />
          </label>

          <label className="flex items-center gap-2 col-span-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isMain ?? false}
              onChange={(e) => setForm((f) => ({ ...f, isMain: e.target.checked }))}
              className="rounded"
            />
            Main character
          </label>

          {formError && (
            <p className="col-span-2 text-red-400 text-sm">{formError}</p>
          )}

          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-sm text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Character'}
            </button>
          </div>
        </form>
      )}

      {/* Column headers */}
      {characters.length > 0 && (
        <div className="flex items-center gap-3 px-3 mb-1 text-xs text-gray-600 select-none">
          <span className="w-4" />
          <span className="w-2" />
          <span className="flex-1">Name</span>
          <span className="w-10 text-right hidden sm:block">Lvl</span>
          <span className="w-20 text-right">iLvl</span>
          <span className="w-40 hidden sm:block">Professions</span>
          <span className="w-20 hidden md:block">Class</span>
          <span className="w-16">Tracker</span>
          <span className="w-4" />
        </div>
      )}

      {characters.length === 0 ? (
        <p className="text-gray-500 text-sm">No characters yet. Add one above.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={characters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {characters.map((char) => (
                <SortableRow
                  key={char.id}
                  char={char}
                  onDelete={handleDelete}
                  onToggleTracked={handleToggleTracked}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {characters.some((c) => !c.isTracked) && (
        <p className="mt-3 text-xs text-gray-600">
          Hidden characters are excluded from the tracker grid but remain here for management.
        </p>
      )}
    </div>
  );
}
