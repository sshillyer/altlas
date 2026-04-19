import { FastifyInstance } from 'fastify';
import { desc } from 'drizzle-orm';
import { db } from '../db/client';
import { resetLog } from '../db/schema';
import { getRegion } from '../settings';
import { getNextResets, getLastScheduledReset } from '../scheduler/resetUtils';
import { runReset } from '../scheduler/runReset';

export default async function resetRoutes(fastify: FastifyInstance) {
  fastify.get('/api/resets/schedule', async () => {
    const region = getRegion();
    const { nextDaily, nextWeekly } = getNextResets(region);
    return {
      region,
      nextDaily: nextDaily.toISOString(),
      nextWeekly: nextWeekly.toISOString(),
      lastDailyReset: getLastScheduledReset('daily', region).toISOString(),
      lastWeeklyReset: getLastScheduledReset('weekly', region).toISOString(),
    };
  });

  fastify.get('/api/resets/log', async () => {
    return db.select().from(resetLog).orderBy(desc(resetLog.executedAt)).limit(20).all();
  });

  fastify.post<{ Body: { type: 'daily' | 'weekly' } }>('/api/resets/trigger', async (req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }
    const { type } = req.body;
    if (type !== 'daily' && type !== 'weekly') {
      return reply.status(400).send({ error: 'type must be "daily" or "weekly"' });
    }
    const region = getRegion();
    runReset(type, region);
    return { ok: true, type, region };
  });
}
