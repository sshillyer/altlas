import cron from 'node-cron';
import { getRegion } from '../settings';
import { getCronExpressions } from './resetUtils';
import { runReset } from './runReset';
import { catchUpMissedResets } from './catchUp';

export function initScheduler(): void {
  catchUpMissedResets();

  const region = getRegion();
  const { dailyCron, weeklyCron } = getCronExpressions(region);

  cron.schedule(dailyCron, () => runReset('daily', region), { timezone: 'UTC' });
  cron.schedule(weeklyCron, () => runReset('weekly', region), { timezone: 'UTC' });

  console.log(`[scheduler] Initialized — region=${region}, daily="${dailyCron}", weekly="${weeklyCron}"`);
}
