export type WowClass =
  | 'deathknight' | 'demonhunter' | 'druid' | 'evoker' | 'hunter'
  | 'mage' | 'monk' | 'paladin' | 'priest' | 'rogue'
  | 'shaman' | 'warlock' | 'warrior';

export type ResetType = 'daily' | 'weekly' | 'never';
export type TaskScope = 'per_character' | 'per_account';
export type TaskCategory = 'vault' | 'profession' | 'pvp' | 'delve' | 'world' | 'dungeon' | 'raid' | 'misc';

export interface Character {
  id: string;
  name: string;
  realm: string;
  region: string;
  class: WowClass;
  spec: string | null;
  level: number;
  ilvl: number | null;
  professionA: string | null;
  professionB: string | null;
  bnetId: string | null;
  isMain: boolean;
  isTracked: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDefinition {
  id: string;
  name: string;
  description: string | null;
  category: TaskCategory;
  resetType: ResetType;
  scope: TaskScope;
  expansion: string;
  season: string | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
}

export interface CharacterTaskState {
  characterTaskId: string;
  isEnabled: boolean;
  completedAt: string | null;
  notes: string | null;
}

export interface TrackerTask {
  definitionId: string;
  name: string;
  resetType: ResetType;
  scope: TaskScope;
  characterState: Record<string, CharacterTaskState>; // keyed by characterId
}

export interface TrackerTaskGroup {
  category: TaskCategory;
  label: string;
  tasks: TrackerTask[];
}

export interface TrackerState {
  characters: Character[];
  taskGroups: TrackerTaskGroup[];
  nextDailyReset: string;
  nextWeeklyReset: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface ProfileWithTasks extends Profile {
  taskDefinitionIds: string[];
}

export interface CreateProfileDto {
  name: string;
  description?: string;
  taskDefinitionIds: string[];
}

export interface CreateCharacterDto {
  name: string;
  realm: string;
  region?: string;
  class: WowClass;
  spec?: string;
  professionA?: string;
  professionB?: string;
  isMain?: boolean;
}

export const CLASS_COLORS: Record<WowClass, string> = {
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

export interface CharacterDashboardData {
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

export interface CharacterDashboardResponse {
  bnetAvailable: boolean;
  data: CharacterDashboardData | null;
  error?: string;
}

export const WOW_CLASSES: WowClass[] = [
  'deathknight', 'demonhunter', 'druid', 'evoker', 'hunter',
  'mage', 'monk', 'paladin', 'priest', 'rogue',
  'shaman', 'warlock', 'warrior',
];
