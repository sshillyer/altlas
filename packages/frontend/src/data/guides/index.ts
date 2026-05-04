import type { ClassGuide } from './types';
import deathknightGuide from './deathknight';
import demonhunterGuide from './demonhunter';
import druidGuide       from './druid';
import evokerGuide      from './evoker';
import hunterGuide      from './hunter';
import mageGuide        from './mage';
import monkGuide        from './monk';
import paladinGuide     from './paladin';
import priestGuide      from './priest';
import rogueGuide       from './rogue';
import shamanGuide      from './shaman';
import warlockGuide     from './warlock';
import warriorGuide     from './warrior';

export const CLASS_GUIDES: Record<string, ClassGuide> = {
  deathknight: deathknightGuide,
  demonhunter: demonhunterGuide,
  druid:       druidGuide,
  evoker:      evokerGuide,
  hunter:      hunterGuide,
  mage:        mageGuide,
  monk:        monkGuide,
  paladin:     paladinGuide,
  priest:      priestGuide,
  rogue:       rogueGuide,
  shaman:      shamanGuide,
  warlock:     warlockGuide,
  warrior:     warriorGuide,
};

export const GUIDE_CLASS_LIST: { wowClass: string; label: string }[] = [
  { wowClass: 'deathknight', label: 'Death Knight' },
  { wowClass: 'demonhunter', label: 'Demon Hunter' },
  { wowClass: 'druid',       label: 'Druid' },
  { wowClass: 'evoker',      label: 'Evoker' },
  { wowClass: 'hunter',      label: 'Hunter' },
  { wowClass: 'mage',        label: 'Mage' },
  { wowClass: 'monk',        label: 'Monk' },
  { wowClass: 'paladin',     label: 'Paladin' },
  { wowClass: 'priest',      label: 'Priest' },
  { wowClass: 'rogue',       label: 'Rogue' },
  { wowClass: 'shaman',      label: 'Shaman' },
  { wowClass: 'warlock',     label: 'Warlock' },
  { wowClass: 'warrior',     label: 'Warrior' },
];
