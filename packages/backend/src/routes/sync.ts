import { FastifyInstance } from 'fastify';
import { isBnetConfigured } from '../bnet/oauth';
import { syncAllCharacters, syncSingleCharacter } from '../bnet/sync';

function isBnetExpired(err: unknown): boolean {
  return err instanceof Error && err.message === 'bnet_token_expired';
}

export default async function syncRoutes(fastify: FastifyInstance) {
  // POST /api/sync/characters — full sync
  fastify.post('/api/sync/characters', async (_req, reply) => {
    if (!isBnetConfigured()) {
      return reply.status(400).send({ error: 'Battle.net is not configured' });
    }
    try {
      return await syncAllCharacters();
    } catch (err) {
      fastify.log.error(err, 'Full character sync failed');
      if (isBnetExpired(err)) {
        return reply.status(401).send({ error: 'bnet_token_expired', message: 'Please reconnect your Battle.net account.' });
      }
      return reply.status(500).send({ error: 'Sync failed', message: String(err) });
    }
  });

  // POST /api/sync/characters/:id — single character sync
  fastify.post<{ Params: { id: string } }>('/api/sync/characters/:id', async (req, reply) => {
    if (!isBnetConfigured()) {
      return reply.status(400).send({ error: 'Battle.net is not configured' });
    }
    try {
      return await syncSingleCharacter(req.params.id);
    } catch (err) {
      fastify.log.error(err, 'Single character sync failed');
      if (isBnetExpired(err)) {
        return reply.status(401).send({ error: 'bnet_token_expired', message: 'Please reconnect your Battle.net account.' });
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Character not found') return reply.status(404).send({ error: 'Character not found' });
      return reply.status(500).send({ error: 'Sync failed', message: msg });
    }
  });
}
