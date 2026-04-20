import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTrackerStore } from '../store/useTrackerStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { CLASS_COLORS } from '../types';
import type { Character, CharacterTaskState, Profile } from '../types';

// ─── Reset strip ────────────────────────────────────────────────────────────

function useCountdown(targetIso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return '0s';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ProfileSelector() {
  const { activeProfileId, profiles, setActiveProfile } = useAppStore();
  const { fetchTracker } = useTrackerStore();

  const resolvedActiveId = activeProfileId ?? profiles.find((p) => p.isDefault)?.id ?? '';

  async function handleChange(id: string) {
    await api.profiles.activate(id);
    setActiveProfile(id);
    fetchTracker();
  }

  if (profiles.length === 0) return null;

  return (
    <select
      value={resolvedActiveId}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
    >
      {profiles.map((p: Profile) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

function ResetStrip({ nextDaily, nextWeekly }: { nextDaily: string; nextWeekly: string }) {
  const dailyCountdown  = useCountdown(nextDaily);
  const weeklyCountdown = useCountdown(nextWeekly);
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 shrink-0">
      <div className="flex gap-8">
        <span>
          Daily reset:{' '}
          <span className="text-white font-medium tabular-nums">{dailyCountdown}</span>
        </span>
        <span>
          Weekly reset:{' '}
          <span className="text-white font-medium tabular-nums">{weeklyCountdown}</span>
        </span>
      </div>
      <ProfileSelector />
    </div>
  );
}

// ─── Character header cell ───────────────────────────────────────────────────

interface CharHeaderCellProps {
  char: Character;
}

const CharHeaderCell = React.memo(function CharHeaderCell({ char }: CharHeaderCellProps) {
  const color = CLASS_COLORS[char.class] ?? '#9ca3af';
  const shortName = char.name.length > 6 ? char.name.slice(0, 5) + '…' : char.name;
  return (
    <th
      className="sticky top-0 bg-gray-900 w-12 min-w-12 px-1 py-2 text-center z-10 border-b border-gray-700"
      title={`${char.name} — ${char.realm} (${char.region.toUpperCase()})`}
    >
      <div className="text-xs font-semibold leading-tight" style={{ color }}>
        {shortName}
      </div>
      {char.isMain && (
        <div className="text-[9px] leading-tight text-gray-600">main</div>
      )}
    </th>
  );
});

// ─── Cell menu (popover) ─────────────────────────────────────────────────────

interface CellMenuState {
  characterTaskId: string;
  completedAt: string | null;
  notes: string | null;
  isEnabled: boolean;
  x: number;
  y: number;
}

interface CellMenuProps {
  menu: CellMenuState;
  onClose: () => void;
  onSaveNote: (id: string, completedAt: string | null, notes: string | null) => void;
  onToggleEnabled: (id: string) => void;
  onToggleComplete: (id: string, current: string | null) => void;
}

function CellMenu({ menu, onClose, onSaveNote, onToggleEnabled, onToggleComplete }: CellMenuProps) {
  const [notes, setNotes] = useState(menu.notes ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const x = Math.min(menu.x + 4, window.innerWidth - 272);
  const y = Math.min(menu.y + 4, window.innerHeight - 200);

  function handleSave() {
    onSaveNote(menu.characterTaskId, menu.completedAt, notes.trim() || null);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', top: y, left: x, zIndex: 50 }}
      className="w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Note</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs leading-none">✕</button>
      </div>

      <textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full bg-gray-700 text-gray-200 text-xs rounded px-2 py-1.5 resize-none border border-gray-600 focus:outline-none focus:border-blue-500"
        rows={3}
        placeholder="Add a note… (persists across resets)"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      />

      <div className="flex items-center justify-between mt-2 gap-1">
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white flex-shrink-0"
        >
          Save
        </button>

        <div className="flex gap-1">
          {menu.isEnabled && (
            <button
              onClick={() => { onToggleComplete(menu.characterTaskId, menu.completedAt); onClose(); }}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                menu.completedAt
                  ? 'bg-green-900/60 text-green-400 hover:bg-gray-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-green-900/60 hover:text-green-400'
              }`}
            >
              {menu.completedAt ? '✓ Done' : '○ Todo'}
            </button>
          )}
          <button
            onClick={() => { onToggleEnabled(menu.characterTaskId); onClose(); }}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              menu.isEnabled
                ? 'bg-gray-700 text-gray-400 hover:bg-red-900/60 hover:text-red-400'
                : 'bg-gray-700 text-gray-500 hover:bg-green-900/60 hover:text-green-400'
            }`}
          >
            {menu.isEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task cell ───────────────────────────────────────────────────────────────

interface TaskCellProps {
  state: CharacterTaskState;
  onToggle: (id: string, current: string | null) => void;
  onOpenMenu: (e: React.MouseEvent, state: CharacterTaskState) => void;
}

const TaskCell = React.memo(function TaskCell({ state, onToggle, onOpenMenu }: TaskCellProps) {
  const done = state.completedAt != null;

  if (!state.isEnabled) {
    return (
      <td
        className="w-12 min-w-12 text-center py-1.5 text-gray-700 text-xs border-b border-gray-800 cursor-pointer hover:bg-gray-800/30 hover:text-gray-500 transition-colors"
        onContextMenu={(e) => { e.preventDefault(); onOpenMenu(e, state); }}
        title="Task disabled — right-click to enable or add note"
      >
        —
      </td>
    );
  }

  return (
    <td
      className={`w-12 min-w-12 text-center py-1 border-b border-gray-800 cursor-pointer select-none transition-colors ${
        done
          ? 'bg-gray-800/50 text-green-400 hover:bg-gray-800'
          : 'text-gray-600 hover:text-gray-200 hover:bg-gray-800/40'
      }`}
      onClick={() => onToggle(state.characterTaskId, state.completedAt)}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu(e, state); }}
      title={
        done
          ? `Completed ${new Date(state.completedAt!).toLocaleDateString()} — right-click for notes`
          : 'Click to complete · right-click for notes'
      }
    >
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-xs">{done ? '✓' : '·'}</span>
        {state.notes && (
          <span className="text-[6px] text-blue-400 leading-none">●</span>
        )}
      </div>
    </td>
  );
});

// ─── TrackerView ─────────────────────────────────────────────────────────────

export function TrackerView() {
  const { trackerData, isLoading, error, fetchTracker, toggleTask, saveNote, toggleEnabled } = useTrackerStore();
  const { setActiveView } = useAppStore();
  const [cellMenu, setCellMenu] = useState<CellMenuState | null>(null);

  useEffect(() => {
    fetchTracker();
  }, [fetchTracker]);

  const handleOpenMenu = useCallback((e: React.MouseEvent, state: CharacterTaskState) => {
    setCellMenu({
      characterTaskId: state.characterTaskId,
      completedAt: state.completedAt,
      notes: state.notes,
      isEnabled: state.isEnabled,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  if (isLoading && !trackerData) {
    return <div className="p-8 text-gray-400 text-sm">Loading tracker…</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button
          className="text-sm text-gray-400 underline hover:text-white"
          onClick={fetchTracker}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!trackerData || trackerData.characters.length === 0) {
    return (
      <div className="p-8 text-gray-400 text-sm">
        No characters found.{' '}
        <button
          className="underline text-gray-300 hover:text-white"
          onClick={() => setActiveView('characters')}
        >
          Add characters
        </button>{' '}
        to get started.
      </div>
    );
  }

  const { characters, taskGroups, nextDailyReset, nextWeeklyReset } = trackerData;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      <ResetStrip nextDaily={nextDailyReset} nextWeekly={nextWeeklyReset} />

      <div
        className="overflow-auto flex-1"
        onMouseDown={() => setCellMenu(null)}
      >
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-gray-900 w-44 min-w-44 px-3 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-700">
                Task
              </th>
              {characters.map((char) => (
                <CharHeaderCell key={char.id} char={char} />
              ))}
            </tr>
          </thead>

          <tbody>
            {taskGroups.map((group) => (
              <React.Fragment key={group.category}>
                <tr>
                  <td
                    colSpan={characters.length + 1}
                    className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-800 border-y border-gray-700"
                  >
                    {group.label}
                  </td>
                </tr>

                {group.tasks.map((task) => (
                  <tr key={task.definitionId} className="hover:bg-gray-800/10">
                    <td className="sticky left-0 z-20 bg-gray-900 w-44 min-w-44 px-3 py-1.5 text-gray-300 text-xs border-b border-r border-gray-800 whitespace-nowrap">
                      {task.name}
                      {task.resetType === 'daily' && (
                        <span className="ml-1.5 text-[9px] text-gray-600 font-medium">D</span>
                      )}
                    </td>

                    {task.scope === 'per_account' ? (
                      <AccountWideCell
                        task={task}
                        characters={characters}
                        onToggle={toggleTask}
                        onOpenMenu={handleOpenMenu}
                      />
                    ) : (
                      characters.map((char) => {
                        const state = task.characterState[char.id];
                        return state ? (
                          <TaskCell
                            key={char.id}
                            state={state}
                            onToggle={toggleTask}
                            onOpenMenu={handleOpenMenu}
                          />
                        ) : (
                          <td
                            key={char.id}
                            className="w-12 min-w-12 border-b border-gray-800 text-center text-gray-700 text-xs py-1.5"
                          >
                            –
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cell popover */}
      {cellMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setCellMenu(null)}
          />
          <CellMenu
            menu={cellMenu}
            onClose={() => setCellMenu(null)}
            onSaveNote={saveNote}
            onToggleEnabled={toggleEnabled}
            onToggleComplete={toggleTask}
          />
        </>
      )}
    </div>
  );
}

// ─── Per-account merged cell ─────────────────────────────────────────────────

interface AccountWideCellProps {
  task: { characterState: Record<string, CharacterTaskState> };
  characters: Character[];
  onToggle: (id: string, current: string | null) => void;
  onOpenMenu: (e: React.MouseEvent, state: CharacterTaskState) => void;
}

function AccountWideCell({ task, characters, onToggle, onOpenMenu }: AccountWideCellProps) {
  const firstChar = characters[0];
  const state = firstChar ? task.characterState[firstChar.id] : undefined;

  return (
    <>
      {state ? (
        <TaskCell state={state} onToggle={onToggle} onOpenMenu={onOpenMenu} />
      ) : (
        <td className="w-12 min-w-12 border-b border-gray-800" />
      )}
      {characters.length > 1 && (
        <td
          colSpan={characters.length - 1}
          className="border-b border-gray-800 bg-gray-800/10 text-center text-[9px] text-gray-700 py-1.5"
        >
          account-wide
        </td>
      )}
    </>
  );
}
