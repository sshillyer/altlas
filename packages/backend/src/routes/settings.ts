import { FastifyInstance } from 'fastify';
import { db } from '../db/client';
import { appSettings } from '../db/schema';

export default async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings — returns all settings as a key-value object
  fastify.get('/api/settings', async () => {
    const rows = db.select().from(appSettings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
}
