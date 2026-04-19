import './loadEnv'; // must be first — loads .env before any other module reads process.env

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/client';
import { runSeeder } from './seed/seeder';
import characterRoutes from './routes/characters';
import taskRoutes from './routes/tasks';
import resetRoutes from './routes/resets';
import profileRoutes from './routes/profiles';
import settingsRoutes from './routes/settings';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import { initScheduler } from './scheduler/resetJobs';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function start() {
  runMigrations();
  runSeeder();
  initScheduler();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: FRONTEND_URL,
  });

  app.get('/api/health', async () => {
    return { ok: true };
  });

  await app.register(characterRoutes);
  await app.register(taskRoutes);
  await app.register(resetRoutes);
  await app.register(profileRoutes);
  await app.register(settingsRoutes);
  await app.register(authRoutes);
  await app.register(syncRoutes);

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
