import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { appSettings, characterTasks, characters, taskDefinitions } from '../db/schema';
import { bnetFetch } from './apiClient';
import { BNET_REGION } from './oauth';

type WowClass =
  | 'deathknight' | 'demonhunter' | 'druid' | 'evoker' | 'hunter'
  | 'mage' | 'monk' | 'paladin' | 'priest' | 'rogue'
  | 'shaman' | 'warlock' | 'warrior';

const CLASS_NAME_MAP: Record<string, WowClass> = {
  'death knight': 'deathknight',
  'demon hunter': 'demonhunter',
  druid: 'druid',
  evoker: 'evoker',
  hunter: 'hunter',
  mage: 'mage',
  monk: 'monk',
  paladin: 'paladin',
  priest: 'priest',
  rogue: 'rogue',
  shaman: 'shaman',
  warlock: 'warlock',
  warrior: 'warrior',
};

function toRealmSlug(realm: string): string {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
}

function stampLastSync(): void {
  const now = new Date().toISOString();
  db.insert(appSettings)
    .values({ key: 'last_bnet_sync', value: now })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: now } })
    .run();
}

interface BlizzardCharacter {
  name: string;
  id: number;
  realm: { name: string; slug: string };
  playable_class: { name: string };
  level: number;
}

interface BlizzardProfileResponse {
  wow_accounts?: Array<{ characters: BlizzardCharacter[] }>;
}

interface BlizzardCharacterSummary {
  average_item_level?: number;
  equipped_item_level?: number;
  active_spec?: { name: string };
}

interface BlizzardProfessionsResponse {
  primaries?: Array<{ profession: { name: string } }>;
}

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  characters: unknown[];
}

export async function syncAllCharacters(): Promise<SyncResult> {
  const region = BNET_REGION;
  const namespace = `profile-${region}`;

  const profileData = await bnetFetch<BlizzardProfileResponse>(
    `/profile/user/wow?namespace=${namespace}&locale=en_US`,
    region,
  );

  const allChars = profileData.wow_accounts?.flatMap((a) => a.characters) ?? [];
  const eligible = allChars.filter((c) => c.level >= 70);

  let added = 0;
  let updated = 0;
  const skipped = 0;
  const resultChars: unknown[] = [];
  const now = new Date().toISOString();

  for (const bChar of eligible) {
    const realmName = bChar.realm.name;
    const charName = bChar.name;
    const bnetId = String(bChar.id);
    const rawClass = bChar.playable_class.name.toLowerCase();
    const wowClass: WowClass = CLASS_NAME_MAP[rawClass] ?? 'warrior';

    let ilvl: number | null = null;
    try {
      const slug = toRealmSlug(realmName);
      const summary = await bnetFetch<BlizzardCharacterSummary>(
        `/profile/wow/character/${slug}/${charName.toLowerCase()}?namespace=${namespace}&locale=en_US`,
        region,
      );
      ilvl = summary.equipped_item_level ?? summary.average_item_level ?? null;
    } catch {
      // non-fatal — proceed without ilvl
    }

    const existing = db
      .select()
      .from(characters)
      .where(
        and(
          sql`lower(${characters.name}) = ${charName.toLowerCase()}`,
          sql`lower(${characters.realm}) = ${realmName.toLowerCase()}`,
          eq(characters.region, region),
        ),
      )
      .get();

    if (existing) {
      db.update(characters)
        .set({ bnetId, ilvl: ilvl ?? existing.ilvl, updatedAt: now })
        .where(eq(characters.id, existing.id))
        .run();
      updated++;
      resultChars.push(db.select().from(characters).where(eq(characters.id, existing.id)).get());
    } else {
      const maxRow = db
        .select({ max: sql<number>`max(sort_order)` })
        .from(characters)
        .get();
      const sortOrder = maxRow?.max != null ? maxRow.max + 1 : 0;
      const newId = nanoid();

      db.insert(characters)
        .values({
          id: newId,
          name: charName,
          realm: realmName,
          region,
          class: wowClass,
          spec: null,
          level: bChar.level,
          ilvl,
          professionA: null,
          professionB: null,
          bnetId,
          isMain: false,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const activeTasks = db
        .select({ id: taskDefinitions.id })
        .from(taskDefinitions)
        .where(eq(taskDefinitions.isActive, true))
        .all();

      for (const task of activeTasks) {
        db.insert(characterTasks)
          .values({ id: nanoid(), characterId: newId, taskDefinitionId: task.id, isEnabled: true })
          .run();
      }

      added++;
      resultChars.push(db.select().from(characters).where(eq(characters.id, newId)).get());
    }
  }

  stampLastSync();
  return { added, updated, skipped, characters: resultChars };
}

export async function syncSingleCharacter(characterId: string): Promise<unknown> {
  const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
  if (!char) throw new Error('Character not found');

  const region = char.region;
  const namespace = `profile-${region}`;
  const slug = toRealmSlug(char.realm);
  const charName = char.name.toLowerCase();
  const now = new Date().toISOString();

  type CharUpdate = Partial<{
    ilvl: number | null;
    spec: string | null;
    professionA: string | null;
    professionB: string | null;
    updatedAt: string;
  }>;
  const updates: CharUpdate = { updatedAt: now };

  try {
    const summary = await bnetFetch<BlizzardCharacterSummary>(
      `/profile/wow/character/${slug}/${charName}?namespace=${namespace}&locale=en_US`,
      region,
    );
    const newIlvl = summary.equipped_item_level ?? summary.average_item_level ?? null;
    if (newIlvl != null) updates.ilvl = newIlvl;
    if (summary.active_spec?.name) {
      updates.spec = summary.active_spec.name.toLowerCase().replace(/\s+/g, '_');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404')) {
      // Character renamed/transferred/deleted — return as-is
      return char;
    }
    throw err;
  }

  try {
    const profData = await bnetFetch<BlizzardProfessionsResponse>(
      `/profile/wow/character/${slug}/${charName}/professions?namespace=${namespace}&locale=en_US`,
      region,
    );
    const primaries = profData.primaries ?? [];
    if (primaries[0]?.profession.name) updates.professionA = primaries[0].profession.name;
    if (primaries[1]?.profession.name) updates.professionB = primaries[1].profession.name;
  } catch {
    // non-fatal
  }

  db.update(characters).set(updates).where(eq(characters.id, characterId)).run();
  stampLastSync();

  return db.select().from(characters).where(eq(characters.id, characterId)).get();
}
