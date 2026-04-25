import { FastifyInstance } from 'fastify';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { characters, characterTasks, taskDefinitions } from '../db/schema';
import { isBnetReady, fetchDashboard } from '../bnet/characterDashboard';

export default async function characterRoutes(fastify: FastifyInstance) {
  // POST /api/characters/reorder — must come before /:id
  fastify.post<{ Body: { order: string[] } }>('/api/characters/reorder', async (req, reply) => {
    const { order } = req.body;
    if (!Array.isArray(order)) return reply.status(400).send({ error: 'order must be an array' });
    const now = new Date().toISOString();
    for (let i = 0; i < order.length; i++) {
      db.update(characters)
        .set({ sortOrder: i, updatedAt: now })
        .where(eq(characters.id, order[i]))
        .run();
    }
    return { success: true };
  });

  // GET /api/characters
  fastify.get('/api/characters', async () => {
    return db.select().from(characters).orderBy(asc(characters.sortOrder)).all();
  });

  // POST /api/characters
  fastify.post<{
    Body: {
      name: string;
      realm: string;
      region?: string;
      class: string;
      spec?: string;
      professionA?: string;
      professionB?: string;
      isMain?: boolean;
    };
  }>('/api/characters', async (req, reply) => {
    const { name, realm, class: cls, spec, professionA, professionB, isMain } = req.body;
    const region = req.body.region ?? 'us';

    if (!name || !realm || !cls) {
      return reply.status(400).send({ error: 'name, realm, and class are required' });
    }

    const maxRow = db
      .select({ max: sql<number>`max(sort_order)` })
      .from(characters)
      .get();
    const sortOrder = maxRow?.max != null ? maxRow.max + 1 : 0;

    const id = nanoid();
    const now = new Date().toISOString();

    try {
      db.insert(characters)
        .values({
          id,
          name,
          realm,
          region,
          class: cls,
          spec: spec ?? null,
          level: 80,
          professionA: professionA ?? null,
          professionB: professionB ?? null,
          isMain: isMain ?? false,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) {
        return reply.status(409).send({ error: 'A character with that name, realm, and region already exists.' });
      }
      throw err;
    }

    const activeTasks = db
      .select({ id: taskDefinitions.id })
      .from(taskDefinitions)
      .where(eq(taskDefinitions.isActive, true))
      .all();

    for (const task of activeTasks) {
      db.insert(characterTasks)
        .values({ id: nanoid(), characterId: id, taskDefinitionId: task.id, isEnabled: true })
        .run();
    }

    return db.select().from(characters).where(eq(characters.id, id)).get();
  });

  // PATCH /api/characters/:id
  fastify.patch<{
    Params: { id: string };
    Body: Partial<{
      name: string; realm: string; region: string; class: string;
      spec: string; level: number; ilvl: number;
      professionA: string; professionB: string;
      isMain: boolean; sortOrder: number;
    }>;
  }>('/api/characters/:id', async (req, reply) => {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.update(characters)
      .set({ ...req.body, updatedAt: now })
      .where(eq(characters.id, id))
      .run();

    const updated = db.select().from(characters).where(eq(characters.id, id)).get();
    if (!updated) return reply.status(404).send({ error: 'Character not found' });
    return updated;
  });

  // GET /api/characters/:id/dashboard — must come before /:id DELETE
  fastify.get<{ Params: { id: string } }>('/api/characters/:id/dashboard', async (req, reply) => {
    const char = db.select().from(characters).where(eq(characters.id, req.params.id)).get();
    if (!char) return reply.status(404).send({ error: 'Character not found' });

    if (!isBnetReady()) {
      return { bnetAvailable: false, data: null };
    }

    try {
      const data = await fetchDashboard(char.region, char.realm, char.name);
      return { bnetAvailable: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('bnet_token_expired')) {
        return reply.status(401).send({ error: 'bnet_token_expired' });
      }
      return { bnetAvailable: true, data: null, error: msg };
    }
  });

  // DELETE /api/characters/:id
  fastify.delete<{ Params: { id: string } }>('/api/characters/:id', async (req, reply) => {
    const { id } = req.params;
    const existing = db.select().from(characters).where(eq(characters.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Character not found' });
    db.delete(characters).where(eq(characters.id, id)).run();
    return reply.status(204).send();
  });
}
