import type { ClassGuide, Enchant, Gem, Consumable } from './types';

// Shared across all 3 specs — same gear, same enchant/gem recommendations
const SHARED_ENCHANTS: Enchant[] = [
  { slot: 'Weapon',    name: "Enchant Weapon — Jan'alai's Precision" },
  { slot: 'Helm',      name: 'Enchant Helm — Empowered Rune of Avoidance' },
  { slot: 'Chest',     name: 'Enchant Chest — Mark of the Worldsoul' },
  { slot: 'Shoulders', name: 'Enchant Shoulders — Flight of the Eagle' },
  { slot: 'Legs',      name: 'Sunfire Silk Spellthread' },
  { slot: 'Boots',     name: "Enchant Boots — Lynx's Dexterity" },
  { slot: 'Ring',      name: "Enchant Ring — Silvermoon's Alacrity", note: 'both rings' },
];

const SHARED_GEMS: Gem[] = [
  { socketType: 'Diamond',  name: 'Indecipherable Eversong Diamond' },
  { socketType: 'Garnet',   name: 'Flawless Quick Garnet' },
  { socketType: 'Amethyst', name: 'Flawless Deadly Amethyst' },
  { socketType: 'Peridot',  name: 'Flawless Masterful Peridot' },
];

const SHARED_CONSUMABLES: Consumable[] = [
  { type: 'potion',       name: "Light's Potential" },
  { type: 'healthPotion', name: 'Silvermoon Health Potion' },
  { type: 'weaponBuff',   name: 'Thalassian Phoenix Oil' },
  { type: 'augmentRune',  name: 'Void-Touched Augment Rune' },
];

const warlockGuide: ClassGuide = {
  className: 'Warlock',
  wowClass: 'warlock',
  specs: [
    {
      specName: 'Affliction',
      patch: '12.0.5',
      season: 'Midnight Season 1',
      lastUpdated: '2026-04-25',
      links: {
        cheatSheet:   'https://www.wowhead.com/guide/classes/warlock/affliction/cheat-sheet',
        talents:      'https://www.wowhead.com/guide/classes/warlock/affliction/talent-builds-pve-dps',
        rotation:     'https://www.wowhead.com/guide/classes/warlock/affliction/rotation-cooldowns-pve-dps',
        statPriority: 'https://www.wowhead.com/guide/classes/warlock/affliction/stat-priority-pve-dps',
        consumables:  'https://www.wowhead.com/guide/classes/warlock/affliction/enchants-gems-pve-dps',
        bisGear:      'https://www.wowhead.com/guide/classes/warlock/affliction/bis-gear',
        overview:     'https://www.wowhead.com/guide/classes/warlock/affliction/overview-pve-dps',
      },
      talentLoadouts: [
        {
          label: 'Raid',
          exportString: 'CkQAAAAAAAAAAAAAAAAAAAAAAwMzMzoZjhZmZmlBAAYmZxyMzsMzAAjllBGwEMDbBG2GAAAmBAAwMDzMjBGmZmZGzgZmZGAwMwA',
        },
        {
          label: 'Mythic+',
          exportString: 'CkQAAAAAAAAAAAAAAAAAAAAAAwMjZGNbmx2MzYWGAAwMzsMbmZWGDAM22GYATwMsFYYbAAAYGAAAzMjZMzsNGzYMzMzYYmZGAgBMA',
        },
        {
          label: 'Open World',
          exportString: 'CkQAAAAAAAAAAAAAAAAAAAAAAwMjZGNbmx2MzYWGAAwMzsMbmZWGDAM22GYATwMsFYYbAAAYGAAAzMjZMzsNGzYMzMzYYmZGAgBMA',
        },
      ],
      statPriority: [
        { stat: 'Intellect', note: 'Primary stat — always prioritize item level' },
        { stat: 'Haste', note: 'More DoT ticks = more Malefic Rapture procs' },
        { stat: 'Mastery', note: 'Direct DoT damage increase' },
        { stat: 'Critical Strike' },
        { stat: 'Versatility' },
      ],
      consumables: [
        { type: 'flask', name: 'Flask of the Magisters' },
        ...SHARED_CONSUMABLES,
        { type: 'food', subType: 'feast',    name: 'Harandar Celebration' },
        { type: 'food', subType: 'personal', name: 'Royal Roast' },
      ],
      enchants: SHARED_ENCHANTS,
      gems: SHARED_GEMS,
    },

    {
      specName: 'Destruction',
      patch: '12.0.5',
      season: 'Midnight Season 1',
      lastUpdated: '2026-04-25',
      links: {
        cheatSheet:   'https://www.wowhead.com/guide/classes/warlock/destruction/cheat-sheet',
        talents:      'https://www.wowhead.com/guide/classes/warlock/destruction/talent-builds-pve-dps',
        rotation:     'https://www.wowhead.com/guide/classes/warlock/destruction/rotation-cooldowns-pve-dps',
        statPriority: 'https://www.wowhead.com/guide/classes/warlock/destruction/stat-priority-pve-dps',
        consumables:  'https://www.wowhead.com/guide/classes/warlock/destruction/enchants-gems-pve-dps',
        bisGear:      'https://www.wowhead.com/guide/classes/warlock/destruction/bis-gear',
        overview:     'https://www.wowhead.com/guide/classes/warlock/destruction/overview-pve-dps',
      },
      talentLoadouts: [
        {
          label: 'Raid',
          exportString: 'CsQAAAAAAAAAAAAAAAAAAAAAAwMzMzoZjhZmZmlZjZmZxgFzAAgZmxMzsAGzYYhMw2wGNWYAAgxAjNAMzAYmxYAAAYmZmBAwMDD',
        },
        {
          label: 'Mythic+',
          exportString: 'CsQAAAAAAAAAAAAAAAAAAAAAAwMjZGNLmxiZGzysNzMjFzYZZmBAAzgZmZxCMwsY0YGAzWsxAAAjZYAAwMDGzMmZDAAwMzMDAAzwA',
        },
        {
          label: 'Open World',
          exportString: 'CsQAAAAAAAAAAAAAAAAAAAAAAwMzMzoZjhZmxsMLjZmZxw2iZAAwMGzMziNYgZzoxMAmtYjBAAGDwCAwMDmZGjZDAAwMzMAAMzwA',
        },
      ],
      statPriority: [
        { stat: 'Intellect', note: 'Primary stat — always prioritize item level' },
        { stat: 'Haste', note: 'Reduces cast times and increases DoT tick rate' },
        { stat: 'Mastery', note: 'Increases Chaos Bolt and Incinerate damage' },
        { stat: 'Critical Strike', note: 'Interacts with Devastation passive' },
        { stat: 'Versatility' },
      ],
      consumables: [
        { type: 'flask', name: 'Flask of the Magisters' },
        ...SHARED_CONSUMABLES,
        { type: 'food', subType: 'feast',    name: 'Harandar Celebration' },
        { type: 'food', subType: 'personal', name: 'Royal Roast' },
      ],
      enchants: SHARED_ENCHANTS,
      gems: SHARED_GEMS,
    },

    {
      specName: 'Demonology',
      patch: '12.0.5',
      season: 'Midnight Season 1',
      lastUpdated: '2026-04-25',
      links: {
        cheatSheet:   'https://www.wowhead.com/guide/classes/warlock/demonology/cheat-sheet',
        talents:      'https://www.wowhead.com/guide/classes/warlock/demonology/talent-builds-pve-dps',
        rotation:     'https://www.wowhead.com/guide/classes/warlock/demonology/rotation-cooldowns-pve-dps',
        statPriority: 'https://www.wowhead.com/guide/classes/warlock/demonology/stat-priority-pve-dps',
        consumables:  'https://www.wowhead.com/guide/classes/warlock/demonology/enchants-gems-pve-dps',
        bisGear:      'https://www.wowhead.com/guide/classes/warlock/demonology/bis-gear',
        overview:     'https://www.wowhead.com/guide/classes/warlock/demonology/overview-pve-dps',
      },
      talentLoadouts: [
        {
          label: 'Raid',
          exportString: 'CoQAAAAAAAAAAAAAAAAAAAAAAYmZMzoZjhZmxsMAAAAAAAjllBGwAmhlQGbGjZ2mlZmZYAgZYmZGgZmZmxMDAAwYmZmZYGLzYAD',
        },
        {
          label: 'Mythic+',
          exportString: 'CoQAAAAAAAAAAAAAAAAAAAAAAYmhZGNbmx2MzYWGAAAAAAgxyyADYAzwSIjNDGLjZmZmZAgZMzYGgZmZmhZ2AAAzMzMjZGsNzAMA',
        },
        {
          label: 'Open World',
          exportString: 'CoQAAAAAAAAAAAAAAAAAAAAAAYmhZGNbmx2MzYWGAAAAAAgxyyADYAzwSIjNDGLz2MzMmBAmxMzMDwMzMzwMbAAgZmZmxMD2mBwA',
        },
      ],
      statPriority: [
        { stat: 'Intellect', note: 'Primary stat' },
        { stat: 'Haste', note: 'More shards, faster pet summons' },
        { stat: 'Critical Strike' },
        { stat: 'Mastery', note: 'Increases demon damage' },
        { stat: 'Versatility' },
      ],
      consumables: [
        { type: 'flask', name: 'Flask of the Shattered Sun', note: 'Different from Aff/Destro' },
        ...SHARED_CONSUMABLES,
        { type: 'food', subType: 'feast',    name: 'Silvermoon Parade', note: 'Demo values Int over secondaries' },
        { type: 'food', subType: 'personal', name: 'Royal Roast' },
      ],
      enchants: SHARED_ENCHANTS,
      gems: SHARED_GEMS,
    },
  ],
};

export default warlockGuide;
