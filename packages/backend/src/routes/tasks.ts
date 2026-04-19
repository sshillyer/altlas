import { FastifyInstance } from 'fastify';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import {
  characters,
  taskDefinitions,
  characterTasks,
  profiles,
  profileTasks,
  appSettings,
} from '../db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  vault:      'Vault',
  profession: 'Profession',
  pvp:        'PvP',
  delve:      'Delves',
  world:      'World',
  dungeon:    'Dungeons',
  raid:       'Raid',
  misc:       'Misc',
};

const CATEGORY_ORDER = ['vault', 'profession', 'pvp', 'delve', 'world', 'dungeon', 'raid', 'misc'];

function getNextDailyReset(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(15, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function getNextWeeklyReset(): string {
  // US region: Tuesday = day 2 at 15:00 UTC
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(15, 0, 0, 0);
  const currentDay = next.getUTCDay();
  let daysUntil = 2 - currentDay; // 2 = Tuesday
  if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
  next.setUTCDate(next.getUTCDate() + daysUntil);
  return next.toISOString();
}

export default async function taskRoutes(fastify: FastifyInstance) {
  // GET /api/tasks/state
  fastify.get('/api/tasks/state', async () => {
    const allCharacters = db
      .select()
      .from(characters)
      .orderBy(asc(characters.sortOrder))
      .all();

    // Resolve active profile
    const profileSetting = db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'active_profile_id'))
      .get();

    let activeProfileId: string | null = profileSetting?.value ?? null;
    if (!activeProfileId) {
      const defaultProfile = db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.isDefault, true))
        .get();
      activeProfileId = defaultProfile?.id ?? null;
    }

    // Get task definitions for the active profile (or all active defs)
    let activeDefs: (typeof taskDefinitions.$inferSelect)[];
    if (activeProfileId) {
      const profileTaskRows = db
        .select({ taskDefinitionId: profileTasks.taskDefinitionId })
        .from(profileTasks)
        .where(eq(profileTasks.profileId, activeProfileId))
        .all();

      const taskIds = profileTaskRows.map((r) => r.taskDefinitionId);
      activeDefs =
        taskIds.length > 0
          ? db
              .select()
              .from(taskDefinitions)
              .where(
                and(eq(taskDefinitions.isActive, true), inArray(taskDefinitions.id, taskIds))
              )
              .orderBy(asc(taskDefinitions.sortOrder))
              .all()
          : [];
    } else {
      activeDefs = db
        .select()
        .from(taskDefinitions)
        .where(eq(taskDefinitions.isActive, true))
        .orderBy(asc(taskDefinitions.sortOrder))
        .all();
    }

    // Fetch all relevant character_tasks rows
    const charIds = allCharacters.map((c) => c.id);
    const taskDefIds = activeDefs.map((t) => t.id);

    let allCharTasks: (typeof characterTasks.$inferSelect)[] = [];
    if (charIds.length > 0 && taskDefIds.length > 0) {
      allCharTasks = db
        .select()
        .from(characterTasks)
        .where(
          and(
            inArray(characterTasks.characterId, charIds),
            inArray(characterTasks.taskDefinitionId, taskDefIds)
          )
        )
        .all();
    }

    // Build lookup: taskDefId → characterId → characterTask row
    const charTaskMap = new Map<string, Map<string, typeof characterTasks.$inferSelect>>();
    for (const ct of allCharTasks) {
      if (!charTaskMap.has(ct.taskDefinitionId)) {
        charTaskMap.set(ct.taskDefinitionId, new Map());
      }
      charTaskMap.get(ct.taskDefinitionId)!.set(ct.characterId, ct);
    }

    // Group defs by category, preserving CATEGORY_ORDER
    const grouped = new Map<string, (typeof taskDefinitions.$inferSelect)[]>();
    for (const def of activeDefs) {
      if (!grouped.has(def.category)) grouped.set(def.category, []);
      grouped.get(def.category)!.push(def);
    }

    const taskGroups = [];
    for (const cat of CATEGORY_ORDER) {
      const defs = grouped.get(cat);
      if (!defs || defs.length === 0) continue;

      const tasks = defs.map((def) => {
        const byChar = charTaskMap.get(def.id) ?? new Map();
        const characterState: Record<
          string,
          { characterTaskId: string; isEnabled: boolean; completedAt: string | null; notes: string | null }
        > = {};
        for (const char of allCharacters) {
          const ct = byChar.get(char.id);
          if (ct) {
            characterState[char.id] = {
              characterTaskId: ct.id,
              isEnabled: ct.isEnabled ?? true,
              completedAt: ct.completedAt ?? null,
              notes: ct.notes ?? null,
            };
          }
        }
        return {
          definitionId: def.id,
          name: def.name,
          resetType: def.resetType,
          scope: def.scope,
          characterState,
        };
      });

      taskGroups.push({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        tasks,
      });
    }

    return {
      characters: allCharacters,
      taskGroups,
      nextDailyReset: getNextDailyReset(),
      nextWeeklyReset: getNextWeeklyReset(),
    };
  });

  // PATCH /api/tasks/character/:characterTaskId — toggle completion / update notes
  fastify.patch<{
    Params: { characterTaskId: string };
    Body: { completedAt: string | null; notes?: string };
  }>('/api/tasks/character/:characterTaskId', async (req, reply) => {
    const { characterTaskId } = req.params;
    const { completedAt, notes } = req.body;

    const existing = db
      .select()
      .from(characterTasks)
      .where(eq(characterTasks.id, characterTaskId))
      .get();
    if (!existing) return reply.status(404).send({ error: 'Character task not found' });

    db.update(characterTasks)
      .set({
        completedAt: completedAt ?? null,
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(eq(characterTasks.id, characterTaskId))
      .run();

    return db.select().from(characterTasks).where(eq(characterTasks.id, characterTaskId)).get();
  });
}
