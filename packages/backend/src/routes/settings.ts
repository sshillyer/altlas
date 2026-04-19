import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { appSettings } from '../db/schema';

export default async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings — returns all settings as a key-value object
  fastify.get('/api/settings', async () => {
    const rows = db.select().from(appSettings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  // PATCH /api/settings — upsert one or more settings keys
  fastify.patch<{ Body: Record<string, string> }>('/api/settings', async (req) => {
    for (const [key, value] of Object.entries(req.body)) {
      db.insert(appSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: appSettings.key, set: { value } })
        .run();
    }
    const rows = db.select().from(appSettings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
}
