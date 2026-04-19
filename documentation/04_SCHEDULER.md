# Altlas — Reset Scheduler

The reset scheduler is a node-cron job that runs inside the Fastify backend process. It is responsible for clearing `completedAt` on `character_tasks` rows at the correct WoW reset times.

---

## WoW Reset Schedule

WoW resets are region-specific. The region is stored in `app_settings` with key `region` (default: `us`).

| Region | Daily Reset | Weekly Reset |
|--------|------------|--------------|
| US / Oceanic | 15:00 UTC every day | 15:00 UTC Tuesday |
| EU | 07:00 UTC every day | 07:00 UTC Wednesday |
| KR / TW | 01:00 UTC every day | 01:00 UTC Wednesday |

The scheduler reads the region from `app_settings` at startup and schedules the appropriate cron expressions.

---

## Cron Expressions

```ts
// US
const US_DAILY  = '0 15 * * *';       // 15:00 UTC daily
const US_WEEKLY = '0 15 * * 2';       // 15:00 UTC Tuesday

// EU
const EU_DAILY  = '0 7 * * *';        // 07:00 UTC daily
const EU_WEEKLY = '0 7 * * 3';        // 07:00 UTC Wednesday

// KR/TW
const KR_DAILY  = '0 1 * * *';
const KR_WEEKLY = '0 1 * * 3';
```

---

## Reset Logic

### Daily Reset
Clears `completedAt` on all `character_tasks` where the linked `task_definition` has `resetType = 'daily'`.

```sql
UPDATE character_tasks
SET completed_at = NULL
WHERE task_definition_id IN (
  SELECT id FROM task_definitions WHERE reset_type = 'daily' AND is_active = 1
);
```

### Weekly Reset
Clears `completedAt` on all `character_tasks` where the linked `task_definition` has `resetType = 'weekly'`.

```sql
UPDATE character_tasks
SET completed_at = NULL
WHERE task_definition_id IN (
  SELECT id FROM task_definitions WHERE reset_type = 'weekly' AND is_active = 1
);
```

After each reset, write a row to `reset_log`:
```ts
{
  id: nanoid(),
  resetType: 'daily' | 'weekly',
  region: 'us',
  scheduledAt: expectedFireTime.toISOString(),
  executedAt: new Date().toISOString(),
  rowsAffected: affectedCount,
}
```

---

## Catch-Up on Startup

When the backend starts, it must check whether any resets were missed while the server was down. This handles the common case of the user's machine being off overnight.

**Algorithm:**

1. Read the last entry in `reset_log` for each reset type (`daily`, `weekly`).
2. Calculate what the most recent scheduled reset time should have been (look back from `now` to find the last cron fire time).
3. If `last_executed_at < last_scheduled_time`, a reset was missed — run it immediately and log it with the correct `scheduledAt`.

This catch-up runs once at startup, before the scheduler is registered. Implement in `scheduler/catchUp.ts`.

---

## Implementation File

**`packages/backend/src/scheduler/resetJobs.ts`**

```ts
import cron from 'node-cron';
import { db } from '../db/client';
import { runReset } from './runReset';
import { catchUpMissedResets } from './catchUp';
import { getRegion } from '../settings';

export async function initScheduler() {
  await catchUpMissedResets();

  const region = await getRegion();
  const { dailyCron, weeklyCron } = getCronExpressions(region);

  cron.schedule(dailyCron, () => runReset('daily', region));
  cron.schedule(weeklyCron, () => runReset('weekly', region));
}
```

Call `initScheduler()` during Fastify startup in `main.ts`, after the DB is connected.

---

## Time Utilities

Expose helper functions used by both the scheduler and the `/api/resets/schedule` endpoint:

```ts
// Returns the next daily and weekly reset timestamps for a given region
function getNextResets(region: string): { nextDaily: Date; nextWeekly: Date }

// Returns the most recent scheduled reset time looking backward from now
function getLastScheduledReset(type: 'daily' | 'weekly', region: string): Date
```

These should be pure functions with no DB access — easy to unit test.
