import { readFileSync } from 'fs';
import { resolve } from 'path';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { taskDefinitions, profiles, profileTasks } from '../db/schema';

interface SeedTask {
  id: string;
  name: string;
  description: string | null;
  category: string;
  resetType: string;
  scope: string;
  expansion: string;
  season: string | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
}

export function runSeeder(): void {
  const existing = db.select({ id: taskDefinitions.id }).from(taskDefinitions).limit(1).all();
  if (existing.length > 0) return;

  const seedPath = resolve(__dirname, '../../../../seed/tasks.json');
  const tasks: SeedTask[] = JSON.parse(readFileSync(seedPath, 'utf-8'));

  for (const task of tasks) {
    db.insert(taskDefinitions)
      .values({
        id: task.id,
        name: task.name,
        description: task.description,
        category: task.category,
        resetType: task.resetType,
        scope: task.scope,
        expansion: task.expansion,
        season: task.season,
        isActive: task.isActive,
        sortOrder: task.sortOrder,
        notes: task.notes,
      })
      .onConflictDoUpdate({
        target: taskDefinitions.id,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          resetType: sql`excluded.reset_type`,
          scope: sql`excluded.scope`,
          expansion: sql`excluded.expansion`,
          season: sql`excluded.season`,
          isActive: sql`excluded.is_active`,
          sortOrder: sql`excluded.sort_order`,
          notes: sql`excluded.notes`,
        },
      })
      .run();
  }

  const defaultExists = db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.isDefault, true))
    .get();

  if (!defaultExists) {
    const profileId = nanoid();
    db.insert(profiles)
      .values({
        id: profileId,
        name: 'Default',
        isDefault: true,
        createdAt: new Date().toISOString(),
      })
      .run();

    const activeTasks = db
      .select({ id: taskDefinitions.id })
      .from(taskDefinitions)
      .where(eq(taskDefinitions.isActive, true))
      .all();

    for (const task of activeTasks) {
      db.insert(profileTasks)
        .values({ profileId, taskDefinitionId: task.id })
        .run();
    }
  }

  console.log(`Seeded ${tasks.length} task definitions and created Default profile.`);
}
