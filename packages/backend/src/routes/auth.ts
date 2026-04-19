import { FastifyInstance } from 'fastify';
import {
  buildAuthUrl,
  deleteToken,
  exchangeCode,
  getTokenStatus,
  isBnetConfigured,
} from '../bnet/oauth';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export default async function authRoutes(fastify: FastifyInstance) {
  // GET /api/auth/bnet/url
  fastify.get('/api/auth/bnet/url', async () => {
    if (!isBnetConfigured()) return { available: false };
    return { available: true, url: buildAuthUrl() };
  });

  // GET /api/auth/callback — Blizzard redirects here after OAuth
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/auth/callback',
    async (req, reply) => {
      const { code, state, error } = req.query;

      if (error || !code || !state) {
        return reply.redirect(`${FRONTEND_URL}?bnetAuth=error`);
      }

      try {
        await exchangeCode(code, state);
        return reply.redirect(`${FRONTEND_URL}?bnetAuth=success`);
      } catch (err) {
        fastify.log.error(err, 'OAuth callback failed');
        return reply.redirect(`${FRONTEND_URL}?bnetAuth=error`);
      }
    },
  );

  // GET /api/auth/status
  fastify.get('/api/auth/status', async () => {
    if (!isBnetConfigured()) return { available: false, connected: false, expiresAt: null };
    const status = getTokenStatus();
    return { available: true, ...status };
  });

  // DELETE /api/auth/bnet
  fastify.delete('/api/auth/bnet', async (_req, reply) => {
    deleteToken();
    return reply.status(204).send();
  });
}
