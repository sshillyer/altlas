import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { resetLog } from '../db/schema';
import { getLastScheduledReset } from './resetUtils';
import { getRegion } from '../settings';
import { runReset } from './runReset';

export function catchUpMissedResets(): void {
  const region = getRegion();
  const now = new Date();

  for (const type of ['daily', 'weekly'] as const) {
    const lastScheduled = getLastScheduledReset(type, region);

    // If the last scheduled time is still in the future, nothing to catch up
    if (lastScheduled > now) continue;

    const lastLog = db
      .select()
      .from(resetLog)
      .where(eq(resetLog.resetType, type))
      .orderBy(desc(resetLog.scheduledAt))
      .limit(1)
      .get();

    const lastExecutedTime = lastLog ? new Date(lastLog.scheduledAt) : null;

    if (!lastExecutedTime || lastExecutedTime < lastScheduled) {
      console.log(`[catchup] Running missed ${type} reset for region=${region}`);
      runReset(type, region, lastScheduled);
    }
  }
}
