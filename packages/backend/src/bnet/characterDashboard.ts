import { bnetFetch } from './apiClient';
import { isBnetConfigured, getTokenStatus } from './oauth';

// ─── Blizzard response shapes ─────────────────────────────────────────────────

interface BnetCharacterSummary {
  average_item_level?: number;
  equipped_item_level?: number;
  active_spec?: { name: string };
}

interface BnetEquipmentResponse {
  equipped_items?: Array<{
    item: { id: number };
    slot: { type: string; name: string };
    name: string;
    level: { value: number };
    quality: { type: string; name: string };
  }>;
}

interface BnetItemMediaResponse {
  assets?: Array<{ key: string; value: string }>;
}

interface BnetPvpSummaryResponse {
  honor_level?: number;
}

interface BnetPvpBracketResponse {
  rating?: number;
  season_match_statistics?: { played: number; won: number; lost: number };
}

interface BnetMythicKeystoneResponse {
  current_mythic_rating?: { rating: number };
  current_period?: {
    best_runs?: Array<{
      keystone_level: number;
      dungeon: { name: string };
      is_completed_within_time: boolean;
    }>;
  };
}

interface BnetRaidsResponse {
  expansions?: Array<{
    expansion: { id: number; name: string };
    instances: Array<{
      instance: { name: string };
      modes: Array<{
        difficulty: { type: string; name: string };
        progress: { completed_count: number; total_count: number };
      }>;
    }>;
  }>;
}

interface BnetCharacterMediaResponse {
  assets?: Array<{ key: string; value: string }>;
}

// Specializations

interface BnetSpecRankTooltip {
  talent?: { id: number; name: string };
  spell_tooltip?: {
    spell?: { id: number };
    description?: string;
    cast_time?: string;
  };
}

interface BnetSpecRankEntry {
  rank: number;
  tooltip?: BnetSpecRankTooltip;
  choice_of_tooltips?: BnetSpecRankTooltip[];
}

interface BnetTalentNode {
  id: number;
  locked_by?: number[];
  display_row: number;
  display_col: number;
  node_type?: { type: string };
  ranks?: BnetSpecRankEntry[];
}

interface BnetTalentTreeResponse {
  class_talent_nodes?: BnetTalentNode[];
  spec_talent_nodes?: BnetTalentNode[];
  hero_talent_trees?: Array<{
    id: number;
    name: string;
    hero_talent_nodes?: BnetTalentNode[];
    playable_specializations?: Array<{ id: number }>;
  }>;
}

interface BnetPlayableSpecResponse {
  talent_tree?: { id: number };
}

interface BnetSpecializationsResponse {
  active_specialization?: { id: number; name: string };
  specializations?: Array<{
    specialization?: { id: number };
    loadouts?: Array<{
      is_active?: boolean;
      selected_class_talents?: Array<{ id: number; rank: number }>;
      selected_spec_talents?: Array<{ id: number; rank: number }>;
      selected_hero_talents?: Array<{ id: number; rank: number }>;
    }>;
  }>;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DashboardEquipmentItem {
  slot: string;
  slotName: string;
  name: string;
  ilvl: number;
  quality: string;
  iconUrl: string | null;
}

export interface DashboardPvpBracket {
  rating: number;
  played: number;
  won: number;
  lost: number;
}

export interface WeeklyMythicRun {
  dungeon: string;
  keystoneLevel: number;
  timedWithin: boolean;
}

export interface RaidDifficulty {
  difficulty: string;
  killed: number;
  total: number;
}

export interface RaidInstanceProgress {
  name: string;
  difficulties: RaidDifficulty[];
}

export interface TalentEntry {
  talentId: number;
  name: string;
  description: string;
  castTime?: string;
  iconUrl: string | null;
}

export interface TalentNodeData {
  nodeId: number;
  row: number;
  col: number;
  maxRank: number;
  lockedBy: number[];
  isChoice: boolean;
  selectedTalentId: number | null;
  selectedRank: number;
  talents: TalentEntry[];
}

export interface TalentSection {
  type: 'class' | 'spec' | 'hero';
  name: string;
  nodes: TalentNodeData[];
}

export interface TalentBuild {
  specName: string;
  heroTreeName: string | null;
  sections: TalentSection[];
}

export interface DashboardData {
  equippedIlvl: number | null;
  avgIlvl: number | null;
  spec: string | null;
  renderUrl: string | null;
  avatarUrl: string | null;
  equipment: DashboardEquipmentItem[];
  pvp: {
    honorLevel: number | null;
    twoVtwo: DashboardPvpBracket | null;
    threeVthree: DashboardPvpBracket | null;
    rbg: DashboardPvpBracket | null;
  };
  mythicRating: number | null;
  weeklyMythicRuns: WeeklyMythicRun[];
  raidProgress: { expansionName: string; instances: RaidInstanceProgress[] } | null;
  talentBuild: TalentBuild | null;
}

// ─── Caches ───────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: DashboardData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Static game data (icons, talent trees) — long TTL so a server restart or
// waiting ~24 h picks up post-patch changes without manual intervention.
const STATIC_TTL_MS = 24 * 60 * 60 * 1000;

type StaticEntry<T> = { value: T; expiresAt: number };

const iconCache = new Map<string, StaticEntry<string | null>>();
const spellIconCache = new Map<string, StaticEntry<string | null>>();
const specTreeCache = new Map<string, StaticEntry<BnetTalentTreeResponse>>();

function getStatic<T>(cache: Map<string, StaticEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) { cache.delete(key); return undefined; }
  return entry.value;
}

function setStatic<T>(cache: Map<string, StaticEntry<T>>, key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + STATIC_TTL_MS });
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

async function fetchItemIcon(itemId: number, region: string): Promise<string | null> {
  const key = `${region}:${itemId}`;
  const cached = getStatic(iconCache, key);
  if (cached !== undefined) return cached;
  try {
    const res = await bnetFetch<BnetItemMediaResponse>(
      `/data/wow/media/item/${itemId}?namespace=static-${region}&locale=en_US`,
      region,
    );
    const url = res.assets?.find((a) => a.key === 'icon')?.value ?? null;
    setStatic(iconCache, key, url);
    return url;
  } catch {
    setStatic(iconCache, key, null);
    return null;
  }
}

async function fetchSpellIcon(spellId: number, region: string): Promise<string | null> {
  const key = `${region}:${spellId}`;
  const cached = getStatic(spellIconCache, key);
  if (cached !== undefined) return cached;
  try {
    const res = await bnetFetch<BnetItemMediaResponse>(
      `/data/wow/media/spell/${spellId}?namespace=static-${region}&locale=en_US`,
      region,
    );
    const url = res.assets?.find((a) => a.key === 'icon')?.value ?? null;
    setStatic(spellIconCache, key, url);
    return url;
  } catch {
    setStatic(spellIconCache, key, null);
    return null;
  }
}

// ─── Talent helpers ───────────────────────────────────────────────────────────

async function fetchSpecTree(specId: number, region: string): Promise<BnetTalentTreeResponse | null> {
  const cacheKey = `${region}:${specId}`;
  const cached = getStatic(specTreeCache, cacheKey);
  if (cached !== undefined) return cached;
  try {
    const ns = `?namespace=static-${region}&locale=en_US`;
    const specData = await bnetFetch<BnetPlayableSpecResponse>(
      `/data/wow/playable-specialization/${specId}${ns}`,
      region,
    );
    const treeId = specData.talent_tree?.id;
    if (!treeId) return null;
    const tree = await bnetFetch<BnetTalentTreeResponse>(
      `/data/wow/talent-tree/${treeId}/playable-specialization/${specId}${ns}`,
      region,
    );
    setStatic(specTreeCache, cacheKey, tree);
    return tree;
  } catch {
    return null;
  }
}

async function processNodes(
  rawNodes: BnetTalentNode[],
  selectedMap: Map<number, number>,
  region: string,
): Promise<TalentNodeData[]> {
  // Collect all unique spell IDs, then parallel-fetch icons (cached after first call)
  const spellIds: number[] = [];
  for (const node of rawNodes) {
    for (const rankEntry of node.ranks ?? []) {
      const spellId = rankEntry.tooltip?.spell_tooltip?.spell?.id;
      if (spellId) spellIds.push(spellId);
      for (const c of rankEntry.choice_of_tooltips ?? []) {
        const cId = c.spell_tooltip?.spell?.id;
        if (cId) spellIds.push(cId);
      }
    }
  }
  await Promise.all([...new Set(spellIds)].map((id) => fetchSpellIcon(id, region)));

  return rawNodes.map((node): TalentNodeData => {
    const firstRank = node.ranks?.[0];
    const choiceTooltips = firstRank?.choice_of_tooltips ?? [];
    const isChoice = choiceTooltips.length >= 2 || node.node_type?.type === 'CHOICE';
    const maxRank = node.ranks?.length ?? 1;

    const talents: TalentEntry[] = [];
    if (isChoice && choiceTooltips.length >= 2) {
      for (const c of choiceTooltips) {
        if (!c.talent) continue;
        const spellId = c.spell_tooltip?.spell?.id;
        talents.push({
          talentId: c.talent.id,
          name: c.talent.name,
          description: c.spell_tooltip?.description ?? '',
          castTime: c.spell_tooltip?.cast_time,
          iconUrl: spellId ? (getStatic(spellIconCache, `${region}:${spellId}`) ?? null) : null,
        });
      }
    } else {
      const tt = firstRank?.tooltip;
      if (tt?.talent) {
        const spellId = tt.spell_tooltip?.spell?.id;
        talents.push({
          talentId: tt.talent.id,
          name: tt.talent.name,
          description: tt.spell_tooltip?.description ?? '',
          castTime: tt.spell_tooltip?.cast_time,
          iconUrl: spellId ? (getStatic(spellIconCache, `${region}:${spellId}`) ?? null) : null,
        });
      }
    }

    let selectedTalentId: number | null = null;
    let selectedRank = 0;
    for (const t of talents) {
      if (selectedMap.has(t.talentId)) {
        selectedTalentId = t.talentId;
        selectedRank = selectedMap.get(t.talentId)!;
        break;
      }
    }

    return {
      nodeId: node.id,
      row: node.display_row,
      col: node.display_col,
      maxRank,
      lockedBy: node.locked_by ?? [],
      isChoice,
      selectedTalentId,
      selectedRank,
      talents,
    };
  });
}

async function buildTalentBuild(
  specsData: BnetSpecializationsResponse,
  specId: number,
  region: string,
): Promise<TalentBuild | null> {
  const specName = specsData.active_specialization?.name ?? '';

  const activeSpecEntry = specsData.specializations?.find(
    (s) => s.specialization?.id === specId,
  );
  const activeLoadout = activeSpecEntry?.loadouts?.find((l) => l.is_active);
  if (!activeLoadout) return null;

  const selectedMap = new Map<number, number>();
  for (const t of activeLoadout.selected_class_talents ?? []) selectedMap.set(t.id, t.rank);
  for (const t of activeLoadout.selected_spec_talents ?? []) selectedMap.set(t.id, t.rank);
  for (const t of activeLoadout.selected_hero_talents ?? []) selectedMap.set(t.id, t.rank);

  const tree = await fetchSpecTree(specId, region);
  if (!tree) return null;

  const heroTree = tree.hero_talent_trees?.find(
    (h) => h.playable_specializations?.some((s) => s.id === specId),
  );

  const [classNodes, specNodes, heroNodes] = await Promise.all([
    processNodes(tree.class_talent_nodes ?? [], selectedMap, region),
    processNodes(tree.spec_talent_nodes ?? [], selectedMap, region),
    processNodes(heroTree?.hero_talent_nodes ?? [], selectedMap, region),
  ]);

  const sections: TalentSection[] = [
    { type: 'class', name: 'Class Talents', nodes: classNodes },
  ];
  if (heroTree && heroNodes.length > 0) {
    sections.push({ type: 'hero', name: heroTree.name, nodes: heroNodes });
  }
  sections.push({ type: 'spec', name: 'Spec Talents', nodes: specNodes });

  return { specName, heroTreeName: heroTree?.name ?? null, sections };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(realm: string): string {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
}

function parseBracket(b: BnetPvpBracketResponse): DashboardPvpBracket | null {
  const stats = b.season_match_statistics;
  if (!b.rating && !stats?.played) return null;
  return {
    rating: b.rating ?? 0,
    played: stats?.played ?? 0,
    won: stats?.won ?? 0,
    lost: stats?.lost ?? 0,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isBnetReady(): boolean {
  return isBnetConfigured() && getTokenStatus().connected;
}

export async function fetchDashboard(
  region: string,
  realm: string,
  name: string,
): Promise<DashboardData> {
  const slug = toSlug(realm);
  const charName = name.toLowerCase();
  const key = `${region}:${slug}:${charName}`;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const ns = `profile-${region}`;
  const qs = `?namespace=${ns}&locale=en_US`;
  const base = `/profile/wow/character/${slug}/${charName}`;

  const [summary, equipment, pvpSummary, b2v2, b3v3, bRbg, mythic, media, raids, specsResult] =
    await Promise.allSettled([
      bnetFetch<BnetCharacterSummary>(`${base}${qs}`, region),
      bnetFetch<BnetEquipmentResponse>(`${base}/equipment${qs}`, region),
      bnetFetch<BnetPvpSummaryResponse>(`${base}/pvp-summary${qs}`, region),
      bnetFetch<BnetPvpBracketResponse>(`${base}/pvp-bracket/2v2${qs}`, region),
      bnetFetch<BnetPvpBracketResponse>(`${base}/pvp-bracket/3v3${qs}`, region),
      bnetFetch<BnetPvpBracketResponse>(`${base}/pvp-bracket/rbg${qs}`, region),
      bnetFetch<BnetMythicKeystoneResponse>(`${base}/mythic-keystone-profile${qs}`, region),
      bnetFetch<BnetCharacterMediaResponse>(`${base}/character-media${qs}`, region),
      bnetFetch<BnetRaidsResponse>(`${base}/encounters/raids${qs}`, region),
      bnetFetch<BnetSpecializationsResponse>(`${base}/specializations${qs}`, region),
    ]);

  const s = summary.status === 'fulfilled' ? summary.value : null;
  const eq = equipment.status === 'fulfilled' ? equipment.value : null;
  const pvp = pvpSummary.status === 'fulfilled' ? pvpSummary.value : null;
  const mythicVal = mythic.status === 'fulfilled' ? mythic.value : null;
  const assets = media.status === 'fulfilled' ? (media.value.assets ?? []) : [];
  const asset = (k: string) => assets.find((a) => a.key === k)?.value ?? null;

  // Weekly M+ runs — current period best runs, sorted highest key first
  const weeklyMythicRuns: WeeklyMythicRun[] = (mythicVal?.current_period?.best_runs ?? [])
    .map((r) => ({ dungeon: r.dungeon.name, keystoneLevel: r.keystone_level, timedWithin: r.is_completed_within_time }))
    .sort((a, b) => b.keystoneLevel - a.keystoneLevel);

  // Raid progress — most recent expansion only, difficulties with any kills
  const DIFF_ORDER = ['LFR_RAID', 'NORMAL', 'HEROIC', 'MYTHIC'];
  const DIFF_LABELS: Record<string, string> = { LFR_RAID: 'LFR', NORMAL: 'N', HEROIC: 'H', MYTHIC: 'M' };
  let raidProgress: DashboardData['raidProgress'] = null;
  if (raids.status === 'fulfilled' && raids.value.expansions?.length) {
    const sorted = [...raids.value.expansions].sort((a, b) => b.expansion.id - a.expansion.id);
    const current = sorted[0];
    const instances: RaidInstanceProgress[] = current.instances.map((inst) => ({
      name: inst.instance.name,
      difficulties: inst.modes
        .filter((m) => m.progress.completed_count > 0)
        .sort((a, b) => DIFF_ORDER.indexOf(a.difficulty.type) - DIFF_ORDER.indexOf(b.difficulty.type))
        .map((m) => ({
          difficulty: DIFF_LABELS[m.difficulty.type] ?? m.difficulty.name,
          killed: m.progress.completed_count,
          total: m.progress.total_count,
        })),
    })).filter((inst) => inst.difficulties.length > 0);
    if (instances.length > 0) {
      raidProgress = { expansionName: current.expansion.name, instances };
    }
  }

  const rawItems = eq?.equipped_items ?? [];
  const iconUrls = await Promise.all(
    rawItems.map((item) => fetchItemIcon(item.item.id, region)),
  );

  // Talent build (sequential after parallel fetch — tree is cached per spec)
  const specsData = specsResult.status === 'fulfilled' ? specsResult.value : null;
  const activeSpecId = specsData?.active_specialization?.id ?? null;
  let talentBuild: TalentBuild | null = null;
  if (specsData && activeSpecId) {
    talentBuild = await buildTalentBuild(specsData, activeSpecId, region).catch(() => null);
  }

  const data: DashboardData = {
    equippedIlvl: s?.equipped_item_level ?? null,
    avgIlvl: s?.average_item_level ?? null,
    spec: s?.active_spec?.name ?? null,
    renderUrl: asset('main-raw') ?? asset('main'),
    avatarUrl: asset('avatar'),
    equipment: rawItems.map((item, i) => ({
      slot: item.slot.type,
      slotName: item.slot.name,
      name: item.name,
      ilvl: item.level.value,
      quality: item.quality.type,
      iconUrl: iconUrls[i] ?? null,
    })),
    pvp: {
      honorLevel: pvp?.honor_level ?? null,
      twoVtwo: b2v2.status === 'fulfilled' ? parseBracket(b2v2.value) : null,
      threeVthree: b3v3.status === 'fulfilled' ? parseBracket(b3v3.value) : null,
      rbg: bRbg.status === 'fulfilled' ? parseBracket(bRbg.value) : null,
    },
    mythicRating: mythicVal?.current_mythic_rating?.rating ?? null,
    weeklyMythicRuns,
    raidProgress,
    talentBuild,
  };

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
