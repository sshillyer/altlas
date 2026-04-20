import cron from 'node-cron';
import { getRegion } from '../settings';
import { getCronExpressions } from './resetUtils';
import { runReset } from './runReset';
import { catchUpMissedResets } from './catchUp';

let activeJobs: ReturnType<typeof cron.schedule>[] = [];

export function initScheduler(): void {
  catchUpMissedResets();
  startCronJobs();
}

export function reinitScheduler(): void {
  activeJobs.forEach((t) => t.stop());
  activeJobs = [];
  startCronJobs();
}

function startCronJobs(): void {
  const region = getRegion();
  const { dailyCron, weeklyCron } = getCronExpressions(region);

  activeJobs = [
    cron.schedule(dailyCron, () => runReset('daily', getRegion()), { timezone: 'UTC' }),
    cron.schedule(weeklyCron, () => runReset('weekly', getRegion()), { timezone: 'UTC' }),
  ];

  console.log(`[scheduler] Started — region=${region}, daily="${dailyCron}", weekly="${weeklyCron}"`);
}
