import { FastifyInstance } from 'fastify';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { profiles, profileTasks, appSettings } from '../db/schema';

export default async function profileRoutes(fastify: FastifyInstance) {
  // GET /api/profiles
  fastify.get('/api/profiles', async () => {
    return db.select().from(profiles).orderBy(asc(profiles.createdAt)).all();
  });

  // POST /api/profiles
  fastify.post<{
    Body: { name: string; description?: string; taskDefinitionIds: string[] };
  }>('/api/profiles', async (req, reply) => {
    const { name, description, taskDefinitionIds } = req.body;
    const id = nanoid();
    const createdAt = new Date().toISOString();

    db.insert(profiles)
      .values({ id, name, description: description ?? null, isDefault: false, createdAt })
      .run();

    for (const taskDefinitionId of taskDefinitionIds) {
      db.insert(profileTasks).values({ profileId: id, taskDefinitionId }).run();
    }

    return reply.status(201).send(db.select().from(profiles).where(eq(profiles.id, id)).get());
  });

  // GET /api/profiles/:id
  fastify.get<{ Params: { id: string } }>('/api/profiles/:id', async (req, reply) => {
    const profile = db.select().from(profiles).where(eq(profiles.id, req.params.id)).get();
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });

    const taskDefinitionIds = db
      .select({ taskDefinitionId: profileTasks.taskDefinitionId })
      .from(profileTasks)
      .where(eq(profileTasks.profileId, req.params.id))
      .all()
      .map((r) => r.taskDefinitionId);

    return { ...profile, taskDefinitionIds };
  });

  // PATCH /api/profiles/:id
  fastify.patch<{
    Params: { id: string };
    Body: { name?: string; description?: string; taskDefinitionIds?: string[] };
  }>('/api/profiles/:id', async (req, reply) => {
    const { id } = req.params;
    const profile = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });

    const { name, description, taskDefinitionIds } = req.body;

    if (name !== undefined || description !== undefined) {
      db.update(profiles)
        .set({
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        })
        .where(eq(profiles.id, id))
        .run();
    }

    if (taskDefinitionIds !== undefined) {
      db.delete(profileTasks).where(eq(profileTasks.profileId, id)).run();
      for (const taskDefinitionId of taskDefinitionIds) {
        db.insert(profileTasks).values({ profileId: id, taskDefinitionId }).run();
      }
    }

    const updated = db.select().from(profiles).where(eq(profiles.id, id)).get();
    const updatedTaskIds = db
      .select({ taskDefinitionId: profileTasks.taskDefinitionId })
      .from(profileTasks)
      .where(eq(profileTasks.profileId, id))
      .all()
      .map((r) => r.taskDefinitionId);

    return { ...updated, taskDefinitionIds: updatedTaskIds };
  });

  // DELETE /api/profiles/:id
  fastify.delete<{ Params: { id: string } }>('/api/profiles/:id', async (req, reply) => {
    const { id } = req.params;
    const profile = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    if (profile.isDefault) return reply.status(400).send({ error: 'Cannot delete the Default profile' });

    // If this was the active profile, clear the setting so tracker falls back to Default
    const activeSetting = db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'active_profile_id'))
      .get();
    if (activeSetting?.value === id) {
      db.delete(appSettings).where(eq(appSettings.key, 'active_profile_id')).run();
    }

    db.delete(profiles).where(eq(profiles.id, id)).run();
    return reply.status(204).send();
  });

  // POST /api/profiles/:id/activate
  fastify.post<{ Params: { id: string } }>('/api/profiles/:id/activate', async (req, reply) => {
    const { id } = req.params;
    const profile = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });

    db.insert(appSettings)
      .values({ key: 'active_profile_id', value: id })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: id } })
      .run();

    return { success: true, activeProfileId: id };
  });
}
