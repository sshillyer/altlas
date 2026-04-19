import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/client';
import { runSeeder } from './seed/seeder';
import characterRoutes from './routes/characters';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function start() {
  runMigrations();
  runSeeder();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: FRONTEND_URL,
  });

  app.get('/api/health', async () => {
    return { ok: true };
  });

  await app.register(characterRoutes);

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
