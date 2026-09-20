import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';

import { env } from './config/env.js';
import { pool } from './db/pool.js';
import authPlugin from './plugins/authPlugin.js';
import authRoutes from './routes/auth.routes.js';
import fikaRoutes from './routes/fika.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminScoresRoutes from './routes/adminScores.routes.js';
import adminSqlRoutes from './routes/adminSql.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, { secret: env.jwtSecret });
  await app.register(authPlugin);

  await app.register(authRoutes);
  await app.register(fikaRoutes);
  await app.register(leaderboardRoutes);
  await app.register(adminRoutes);
  await app.register(adminScoresRoutes);
  await app.register(adminSqlRoutes);
  await app.register(webhooksRoutes);

  // Liveness only — the process is up and answering HTTP, nothing more.
  // Load balancers/uptime pings that just want a fast 200 should use this.
  app.get('/api/health', async () => ({ ok: true }));

  // Readiness — also confirms the database is actually reachable, since
  // that's the thing most likely to silently fail while the Node process
  // itself stays up and keeps returning a happy /api/health. Point
  // orchestrator health checks (Coolify, Docker HEALTHCHECK, k8s probes)
  // here instead when you want a real signal before routing traffic in.
  app.get('/api/health/ready', async (request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { ok: true, db: 'up' };
    } catch (err) {
      reply.code(503);
      return { ok: false, db: 'down', error: err.message };
    }
  });

  await registerWebClient(app);

  return app;
}

// Serves the built web/dist bundle (produced by `npm run build --workspace web`)
// so a single container can expose both the API and the frontend on one port.
async function registerWebClient(app) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, '../../web/dist');

  if (!existsSync(webDist)) return;

  await app.register(fastifyStatic, { root: webDist });

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}
