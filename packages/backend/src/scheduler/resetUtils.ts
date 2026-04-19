interface RegionSchedule {
  dailyHour: number;
  weeklyDay: number; // 0=Sun, 2=Tue, 3=Wed
}

const SCHEDULES: Record<string, RegionSchedule> = {
  us: { dailyHour: 15, weeklyDay: 2 },
  eu: { dailyHour: 7,  weeklyDay: 3 },
  kr: { dailyHour: 1,  weeklyDay: 3 },
  tw: { dailyHour: 1,  weeklyDay: 3 },
};

const CRONS: Record<string, { daily: string; weekly: string }> = {
  us: { daily: '0 15 * * *', weekly: '0 15 * * 2' },
  eu: { daily: '0 7 * * *',  weekly: '0 7 * * 3'  },
  kr: { daily: '0 1 * * *',  weekly: '0 1 * * 3'  },
  tw: { daily: '0 1 * * *',  weekly: '0 1 * * 3'  },
};

export function getCronExpressions(region: string): { dailyCron: string; weeklyCron: string } {
  const exprs = CRONS[region] ?? CRONS.us;
  return { dailyCron: exprs.daily, weeklyCron: exprs.weekly };
}

export function getNextResets(region: string): { nextDaily: Date; nextWeekly: Date } {
  const schedule = SCHEDULES[region] ?? SCHEDULES.us;
  const now = new Date();

  const nextDaily = new Date(now);
  nextDaily.setUTCHours(schedule.dailyHour, 0, 0, 0);
  if (nextDaily <= now) nextDaily.setUTCDate(nextDaily.getUTCDate() + 1);

  const nextWeekly = new Date(now);
  nextWeekly.setUTCHours(schedule.dailyHour, 0, 0, 0);
  const currentDay = nextWeekly.getUTCDay();
  let daysUntil = schedule.weeklyDay - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && nextWeekly <= now)) daysUntil += 7;
  nextWeekly.setUTCDate(nextWeekly.getUTCDate() + daysUntil);

  return { nextDaily, nextWeekly };
}

export function getLastScheduledReset(type: 'daily' | 'weekly', region: string): Date {
  const schedule = SCHEDULES[region] ?? SCHEDULES.us;
  const now = new Date();

  if (type === 'daily') {
    const last = new Date(now);
    last.setUTCHours(schedule.dailyHour, 0, 0, 0);
    if (last > now) last.setUTCDate(last.getUTCDate() - 1);
    return last;
  }

  const last = new Date(now);
  last.setUTCHours(schedule.dailyHour, 0, 0, 0);
  const currentDay = last.getUTCDay();
  let daysBack = currentDay - schedule.weeklyDay;
  if (daysBack < 0) daysBack += 7;
  last.setUTCDate(last.getUTCDate() - daysBack);
  if (last > now) last.setUTCDate(last.getUTCDate() - 7);
  return last;
}
