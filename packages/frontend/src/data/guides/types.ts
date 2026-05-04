// Structured type for consumable category — drives display labels in ConsumablesSection
export type ConsumableType =
  | 'flask'
  | 'potion'
  | 'healthPotion'
  | 'food'
  | 'weaponBuff'
  | 'augmentRune';

export const CONSUMABLE_TYPE_LABELS: Record<ConsumableType, string> = {
  flask:        'Flask',
  potion:       'Combat Potion',
  healthPotion: 'Health Potion',
  food:         'Food',
  weaponBuff:   'Weapon Buff',
  augmentRune:  'Augment Rune',
};

export interface TalentLoadout {
  label: string;       // 'Raid' | 'Mythic+' | 'Open World'
  exportString: string; // In-game talent import string
  description?: string;
}

export interface StatPriorityEntry {
  stat: string;
  note?: string;
}

export interface Consumable {
  type: ConsumableType;
  subType?: string; // e.g. 'feast' | 'personal' for food; 'raid' | 'mythic+' for potions
  name: string;
  note?: string;
}

export interface Enchant {
  slot: string;
  name: string;
  note?: string;
}

export interface Gem {
  socketType: string; // 'Diamond' | 'Garnet' | 'Amethyst' | 'Peridot' | 'Prismatic' etc.
  name: string;
  note?: string;
}

// Wowhead guide page links for this spec — any can be omitted
export interface GuideLinks {
  cheatSheet?: string;
  talents?: string;
  rotation?: string;
  statPriority?: string;
  consumables?: string;
  bisGear?: string;
  overview?: string;
}

export interface SpecGuide {
  specName: string;
  patch: string;          // e.g. '12.0.5'
  season: string;         // e.g. 'Midnight Season 1'
  lastUpdated?: string;   // ISO date string, manually set when data is refreshed
  links: GuideLinks;
  talentLoadouts: TalentLoadout[];
  statPriority: StatPriorityEntry[];
  consumables: Consumable[];
  enchants: Enchant[];
  gems: Gem[];
}

export interface ClassGuide {
  className: string;
  wowClass: string; // matches WowClass type key
  specs: SpecGuide[];
}
