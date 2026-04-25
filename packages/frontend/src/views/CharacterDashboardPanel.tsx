import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { CLASS_COLORS } from '../types';
import type {
  Character,
  CharacterDashboardData,
  CharacterDashboardResponse,
  RaidInstanceProgress,
  TalentBuild,
  TalentNodeData,
  TalentSection,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_ORDER = [
  'HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST',
  'HANDS', 'WAIST', 'LEGS', 'FEET',
  'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2',
  'MAIN_HAND', 'OFF_HAND',
];

const SLOT_LABELS: Record<string, string> = {
  HEAD: 'Head', NECK: 'Neck', SHOULDER: 'Shoulder', BACK: 'Back',
  CHEST: 'Chest', WRIST: 'Wrist', HANDS: 'Hands', WAIST: 'Waist',
  LEGS: 'Legs', FEET: 'Feet', FINGER_1: 'Ring 1', FINGER_2: 'Ring 2',
  TRINKET_1: 'Trinket 1', TRINKET_2: 'Trinket 2',
  MAIN_HAND: 'Main Hand', OFF_HAND: 'Off Hand',
};

const QUALITY_COLORS: Record<string, string> = {
  POOR: '#9d9d9d', COMMON: '#e0e0e0', UNCOMMON: '#1eff00',
  RARE: '#0070dd', EPIC: '#a335ee', LEGENDARY: '#ff8000',
  ARTIFACT: '#e6cc80', HEIRLOOM: '#00ccff',
};

// Talent grid layout constants
const NODE_SIZE = 34;
const CHOICE_SIZE = 20;
const COL_STEP = 42;
const ROW_STEP = 42;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function armoryUrl(char: Character): string {
  const locale: Record<string, string> = { us: 'en-us', eu: 'en-gb', kr: 'ko-kr', tw: 'zh-tw' };
  const realm = char.realm.toLowerCase().replace(/\s+/g, '-');
  return `https://worldofwarcraft.blizzard.com/${locale[char.region] ?? 'en-us'}/character/${char.region}/${realm}/${char.name.toLowerCase()}`;
}

function formatSpec(spec: string | null | undefined): string {
  if (!spec) return '—';
  return spec.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatClass(cls: string): string {
  if (cls === 'deathknight') return 'Death Knight';
  if (cls === 'demonhunter') return 'Demon Hunter';
  return cls.charAt(0).toUpperCase() + cls.slice(1);
}

function mythicColor(rating: number): string {
  if (rating >= 2500) return '#ff8000';
  if (rating >= 2000) return '#a335ee';
  if (rating >= 1500) return '#0070dd';
  if (rating >= 1000) return '#1eff00';
  return '#9ca3af';
}

function pvpColor(rating: number): string {
  if (rating >= 2100) return '#ff8000';
  if (rating >= 1800) return '#a335ee';
  if (rating >= 1600) return '#0070dd';
  if (rating >= 1400) return '#1eff00';
  return '#9ca3af';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="px-4 py-3 text-center border-r border-gray-800 last:border-r-0">
      <div className="text-lg font-bold tabular-nums leading-tight" style={valueStyle}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
      {children}
    </h3>
  );
}

// ─── Raid progress section ────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  LFR: '#9ca3af', N: '#1eff00', H: '#0070dd', M: '#ff8000',
};

function RaidProgressSection({ data }: { data: CharacterDashboardData }) {
  if (!data.raidProgress) {
    return (
      <section className="px-5 py-4">
        <SectionHeader>Raid Progress</SectionHeader>
        <p className="text-xs text-gray-600">No raid kills recorded this expansion.</p>
      </section>
    );
  }

  const { expansionName, instances } = data.raidProgress;

  return (
    <section className="px-5 py-4">
      <div className="flex items-baseline justify-between mb-2">
        <SectionHeader>Raid Progress</SectionHeader>
        <span className="text-[10px] text-gray-600 -mt-2">{expansionName}</span>
      </div>
      <div className="space-y-3">
        {instances.map((inst: RaidInstanceProgress) => (
          <div key={inst.name}>
            <div className="text-xs text-gray-300 mb-1">{inst.name}</div>
            <div className="flex flex-wrap gap-2">
              {inst.difficulties.map((d) => {
                const full = d.killed === d.total;
                return (
                  <span
                    key={d.difficulty}
                    className="inline-flex items-center gap-1 text-xs tabular-nums"
                    style={{ color: DIFF_COLORS[d.difficulty] ?? '#9ca3af' }}
                  >
                    <span className="font-semibold">{d.difficulty}</span>
                    <span className={full ? 'text-current' : 'text-gray-400'}>
                      {d.killed}/{d.total}{full ? ' ✓' : ''}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Weekly M+ section ────────────────────────────────────────────────────────

function WeeklyMythicSection({ data }: { data: CharacterDashboardData }) {
  if (data.weeklyMythicRuns.length === 0) {
    return (
      <section className="px-5 py-4">
        <SectionHeader>M+ This Week</SectionHeader>
        <p className="text-xs text-gray-600">No keys completed this week.</p>
      </section>
    );
  }

  return (
    <section className="px-5 py-4">
      <SectionHeader>M+ This Week</SectionHeader>
      <div className="space-y-1">
        {data.weeklyMythicRuns.map((run, i) => (
          <div key={i} className="flex items-center text-xs gap-2">
            <span
              className="font-bold tabular-nums w-7 shrink-0"
              style={{ color: run.keystoneLevel >= 12 ? '#ff8000' : run.keystoneLevel >= 8 ? '#a335ee' : run.keystoneLevel >= 4 ? '#0070dd' : '#9ca3af' }}
            >
              +{run.keystoneLevel}
            </span>
            <span className="flex-1 truncate text-gray-300">{run.dungeon}</span>
            <span className={run.timedWithin ? 'text-green-400' : 'text-red-400 opacity-70'}>
              {run.timedWithin ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Equipment section ────────────────────────────────────────────────────────

function EquipmentSection({ data }: { data: CharacterDashboardData }) {
  const bySlot = new Map(data.equipment.map((item) => [item.slot, item]));

  return (
    <section className="px-5 py-4">
      <SectionHeader>Equipment</SectionHeader>
      {data.equipment.length === 0 ? (
        <p className="text-xs text-gray-600">No equipment data.</p>
      ) : (
        <div className="space-y-0.5">
          {SLOT_ORDER.map((slot) => {
            const item = bySlot.get(slot);
            if (!item) return null;
            const qColor = QUALITY_COLORS[item.quality] ?? '#e0e0e0';
            return (
              <div key={slot} className="flex items-center text-xs gap-2">
                <span className="text-gray-600 w-20 shrink-0">
                  {SLOT_LABELS[slot] ?? item.slotName}
                </span>
                {item.iconUrl ? (
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="w-5 h-5 rounded shrink-0"
                    style={{ outline: `1px solid ${qColor}40` }}
                  />
                ) : (
                  <span className="w-5 h-5 shrink-0" />
                )}
                <span className="flex-1 truncate" style={{ color: qColor }}>
                  {item.name}
                </span>
                <span className="text-gray-400 tabular-nums w-8 text-right shrink-0">
                  {item.ilvl}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── PvP section ─────────────────────────────────────────────────────────────

function PvpSection({ data }: { data: CharacterDashboardData }) {
  const brackets = [
    { label: '2v2', bracket: data.pvp.twoVtwo },
    { label: '3v3', bracket: data.pvp.threeVthree },
    { label: 'RBG', bracket: data.pvp.rbg },
  ];
  const hasAny = brackets.some((b) => b.bracket !== null);

  return (
    <section className="px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader>PvP</SectionHeader>
        {data.pvp.honorLevel != null && (
          <span className="text-xs text-gray-500 -mt-2">
            Honor {data.pvp.honorLevel}
          </span>
        )}
      </div>
      {!hasAny ? (
        <p className="text-xs text-gray-600">No ranked PvP this season.</p>
      ) : (
        <div className="space-y-1.5">
          {brackets.map(({ label, bracket }) =>
            bracket ? (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 w-8 shrink-0">{label}</span>
                <span
                  className="font-semibold tabular-nums w-12 shrink-0"
                  style={{ color: pvpColor(bracket.rating) }}
                >
                  {bracket.rating.toLocaleString()}
                </span>
                <span className="text-gray-500">
                  {bracket.won}W / {bracket.lost}L
                </span>
              </div>
            ) : null
          )}
        </div>
      )}
    </section>
  );
}

// ─── Talent section ───────────────────────────────────────────────────────────

interface TalentTooltipState {
  node: TalentNodeData;
  x: number;
  y: number;
}

function TalentSectionGrid({ section }: { section: TalentSection }) {
  const [tooltip, setTooltip] = useState<TalentTooltipState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = section.nodes;
  if (nodes.length === 0) return null;

  const rows = nodes.map((n) => n.row);
  const cols = nodes.map((n) => n.col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const gridW = (maxCol - minCol) * COL_STEP + NODE_SIZE;
  const gridH = (maxRow - minRow) * ROW_STEP + NODE_SIZE;

  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

  const nx = (col: number) => (col - minCol) * COL_STEP;
  const ny = (row: number) => (row - minRow) * ROW_STEP;
  const cx = (col: number) => nx(col) + NODE_SIZE / 2;
  const cy = (row: number) => ny(row) + NODE_SIZE / 2;

  function showTooltip(node: TalentNodeData, e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTooltip({ node, x: e.clientX, y: e.clientY });
  }

  function hideTooltip() {
    hideTimer.current = setTimeout(() => setTooltip(null), 80);
  }

  return (
    <>
      <div className="relative" style={{ width: gridW, height: gridH }}>
        {/* SVG connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={gridW}
          height={gridH}
          style={{ zIndex: 0 }}
        >
          {nodes.flatMap((node) =>
            (node.lockedBy ?? []).map((parentId) => {
              const parent = nodeMap.get(parentId);
              if (!parent) return null;
              const active =
                node.selectedTalentId !== null && parent.selectedTalentId !== null;
              return (
                <line
                  key={`${parentId}-${node.nodeId}`}
                  x1={cx(parent.col)}
                  y1={cy(parent.row)}
                  x2={cx(node.col)}
                  y2={cy(node.row)}
                  stroke={active ? '#92400e' : '#1f2937'}
                  strokeWidth={active ? 2 : 1.5}
                />
              );
            }),
          )}
        </svg>

        {/* Talent nodes */}
        {nodes.map((node) => {
          const x = nx(node.col);
          const y = ny(node.row);
          const selected = node.selectedTalentId !== null;

          // Choice node — two mini icons
          if (node.isChoice && node.talents.length >= 2) {
            return (
              <div
                key={node.nodeId}
                className="absolute flex items-center justify-center gap-0.5"
                style={{ left: x, top: y + (NODE_SIZE - CHOICE_SIZE) / 2, width: NODE_SIZE, height: CHOICE_SIZE, zIndex: 10 }}
                onMouseEnter={(e) => showTooltip(node, e)}
                onMouseLeave={hideTooltip}
              >
                {node.talents.slice(0, 2).map((talent, i) => {
                  const isChosen = talent.talentId === node.selectedTalentId;
                  const dim = selected ? !isChosen : true;
                  return (
                    <div
                      key={i}
                      className="rounded overflow-hidden shrink-0"
                      style={{
                        width: CHOICE_SIZE,
                        height: CHOICE_SIZE,
                        opacity: dim ? 0.25 : 1,
                        outline: isChosen
                          ? '1.5px solid #d97706'
                          : '1.5px solid #374151',
                        outlineOffset: '-1px',
                      }}
                    >
                      {talent.iconUrl ? (
                        <img src={talent.iconUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-gray-800" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // Regular node
          const talent = node.talents[0];
          return (
            <div
              key={node.nodeId}
              className="absolute"
              style={{ left: x, top: y, width: NODE_SIZE, height: NODE_SIZE, zIndex: 10 }}
              onMouseEnter={(e) => showTooltip(node, e)}
              onMouseLeave={hideTooltip}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{
                  opacity: selected ? 1 : 0.25,
                  outline: selected ? '2px solid #d97706' : '2px solid #374151',
                  outlineOffset: '-2px',
                }}
              >
                {talent?.iconUrl ? (
                  <img src={talent.iconUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
              </div>
              {selected && node.maxRank > 1 && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none bg-gray-950 text-yellow-500 rounded px-0.5 py-px tabular-nums border border-gray-700"
                  style={{ zIndex: 20 }}
                >
                  {node.selectedRank}/{node.maxRank}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating tooltip via portal to avoid clipping */}
      {tooltip &&
        createPortal(
          <div
            className="fixed pointer-events-none z-[9999]"
            style={{
              left: Math.max(8, tooltip.x - 244),
              top: Math.max(8, tooltip.y - 48),
              width: 228,
            }}
          >
            <div className="bg-gray-950 border border-gray-600 rounded shadow-2xl px-3 py-2.5 text-xs">
              {tooltip.node.isChoice && tooltip.node.talents.length >= 2 ? (
                <div className="space-y-2.5">
                  {tooltip.node.talents.map((t, i) => {
                    const isChosen = t.talentId === tooltip.node.selectedTalentId;
                    const dim = tooltip.node.selectedTalentId !== null && !isChosen;
                    return (
                      <div key={i} style={{ opacity: dim ? 0.45 : 1 }}>
                        <p className="font-semibold text-white leading-tight">{t.name}</p>
                        {t.castTime && (
                          <p className="text-yellow-600 mt-0.5 text-[10px]">{t.castTime}</p>
                        )}
                        <p className="text-gray-400 mt-1 leading-snug">{t.description}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <p className="font-semibold text-white leading-tight">
                    {tooltip.node.talents[0]?.name ?? '—'}
                  </p>
                  {tooltip.node.talents[0]?.castTime && (
                    <p className="text-yellow-600 mt-0.5 text-[10px]">
                      {tooltip.node.talents[0].castTime}
                    </p>
                  )}
                  {tooltip.node.maxRank > 1 && (
                    <p className="text-gray-500 mt-0.5 text-[10px]">
                      Rank {tooltip.node.selectedRank}/{tooltip.node.maxRank}
                    </p>
                  )}
                  <p className="text-gray-400 mt-1 leading-snug">
                    {tooltip.node.talents[0]?.description ?? ''}
                  </p>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TalentBuildSection({ data }: { data: CharacterDashboardData }) {
  const build: TalentBuild | null = data.talentBuild;

  if (!build) {
    return (
      <section className="px-5 py-4">
        <SectionHeader>Talent Build</SectionHeader>
        <p className="text-xs text-gray-600">No talent data available.</p>
      </section>
    );
  }

  return (
    <section className="px-5 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <SectionHeader>Talent Build</SectionHeader>
        <span className="text-[10px] text-gray-600 -mt-2">
          {build.specName}
          {build.heroTreeName ? ` · ${build.heroTreeName}` : ''}
        </span>
      </div>
      <div className="space-y-5">
        {build.sections.map((section) => (
          <div key={section.type}>
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">
              {section.name}
            </p>
            <div className="overflow-x-auto">
              <TalentSectionGrid section={section} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CharacterDashboardPanel ──────────────────────────────────────────────────

interface Props {
  character: Character;
  onClose: () => void;
}

export function CharacterDashboardPanel({ character, onClose }: Props) {
  const { setActiveView } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<CharacterDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    api.characters
      .dashboard(character.id)
      .then(setDashboard)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [character.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const classColor = CLASS_COLORS[character.class] ?? '#9ca3af';
  const data = dashboard?.data ?? null;
  const bnetAvailable = dashboard?.bnetAvailable ?? false;

  // Prefer live spec/ilvl over stale DB values
  const displaySpec = data?.spec ?? character.spec;
  const displayIlvl = data?.equippedIlvl ?? character.ilvl;

  const professions = [character.professionA, character.professionB].filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-[95vw] bg-gray-900 z-50 border-l border-gray-700 flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div
          className="relative border-b border-gray-700 shrink-0 overflow-hidden"
          style={{ borderTop: `3px solid ${classColor}`, minHeight: data?.renderUrl ? '148px' : undefined }}
        >
          {/* Character render — right-aligned, fades left */}
          {data?.renderUrl && (
            <div className="absolute right-0 top-0 bottom-0 w-52 pointer-events-none select-none">
              <img
                src={data.renderUrl}
                alt=""
                className="absolute right-0 bottom-0 w-auto"
                style={{ height: '220px' }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/75 to-transparent" />
            </div>
          )}

          {/* Text content */}
          <div className="relative z-10 px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold" style={{ color: classColor }}>
                  {character.name}
                </span>
                {character.isMain && (
                  <span className="text-xs text-yellow-400">★ Main</span>
                )}
                <a
                  href={armoryUrl(character)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Armory ↗
                </a>
              </div>
              <div className="text-sm text-gray-400 mt-0.5 leading-snug">
                {formatSpec(displaySpec)} · {formatClass(character.class)}
                <span className="mx-1 text-gray-600">•</span>
                {character.realm} {character.region.toUpperCase()}
                <span className="mx-1 text-gray-600">•</span>
                Level {character.level}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors mt-0.5 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              Loading…
            </div>
          ) : loadError ? (
            <div className="p-5 text-sm">
              <p className="text-red-400">Failed to load: {loadError}</p>
              <button
                onClick={load}
                className="mt-2 text-xs text-gray-400 underline hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 border-b border-gray-700">
                <StatCell
                  label="Equipped iLvl"
                  value={displayIlvl != null ? String(displayIlvl) : '—'}
                />
                <StatCell
                  label="Avg iLvl"
                  value={data?.avgIlvl != null ? String(data.avgIlvl) : '—'}
                />
                <StatCell
                  label="M+ Rating"
                  value={
                    data?.mythicRating != null
                      ? Math.round(data.mythicRating).toLocaleString()
                      : '—'
                  }
                  valueStyle={
                    data?.mythicRating
                      ? { color: mythicColor(data.mythicRating) }
                      : undefined
                  }
                />
              </div>

              {!bnetAvailable ? (
                /* No Bnet — show DB data only */
                <div className="px-5 py-5 space-y-4">
                  <p className="text-sm text-gray-500">
                    Connect Battle.net in{' '}
                    <button
                      className="text-blue-400 hover:text-blue-300 underline"
                      onClick={() => { onClose(); setActiveView('settings'); }}
                    >
                      Settings
                    </button>{' '}
                    to see live gear, PvP ratings, and M+ score.
                  </p>
                  {professions.length > 0 && (
                    <div>
                      <SectionHeader>Professions</SectionHeader>
                      <p className="text-sm text-gray-300">{professions.join(' · ')}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Full Bnet data */
                <div className="divide-y divide-gray-800">
                  {data && <TalentBuildSection data={data} />}
                  {data && <RaidProgressSection data={data} />}
                  {data && <WeeklyMythicSection data={data} />}
                  {data && <EquipmentSection data={data} />}
                  {data && <PvpSection data={data} />}

                  {/* Professions */}
                  <section className="px-5 py-4">
                    <SectionHeader>Professions</SectionHeader>
                    <p className="text-sm text-gray-300">
                      {professions.length > 0
                        ? professions.join(' · ')
                        : <span className="text-gray-600">None recorded</span>}
                    </p>
                  </section>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && data && (
          <div className="px-5 py-2 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
            Cached · refreshes every 5 minutes
          </div>
        )}
      </div>
    </>
  );
}
