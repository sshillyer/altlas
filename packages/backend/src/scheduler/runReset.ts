import { eq, inArray, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { characterTasks, taskDefinitions, resetLog } from '../db/schema';
import { getLastScheduledReset } from './resetUtils';

export function runReset(type: 'daily' | 'weekly', region: string, scheduledAt?: Date): void {
  const scheduledTime = scheduledAt ?? getLastScheduledReset(type, region);

  const defs = db
    .select({ id: taskDefinitions.id })
    .from(taskDefinitions)
    .where(and(eq(taskDefinitions.resetType, type), eq(taskDefinitions.isActive, true)))
    .all();

  let rowsAffected = 0;
  if (defs.length > 0) {
    const defIds = defs.map((d) => d.id);
    const result = db
      .update(characterTasks)
      .set({ completedAt: null })
      .where(inArray(characterTasks.taskDefinitionId, defIds))
      .run();
    rowsAffected = result.changes;
  }

  db.insert(resetLog)
    .values({
      id: nanoid(),
      resetType: type,
      region,
      scheduledAt: scheduledTime.toISOString(),
      executedAt: new Date().toISOString(),
      rowsAffected,
    })
    .run();

  console.log(`[reset] ${type} reset for ${region} complete — ${rowsAffected} rows cleared`);
}
