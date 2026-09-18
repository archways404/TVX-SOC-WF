import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';

import { env } from './config/env.js';
import authPlugin from './plugins/authPlugin.js';
import authRoutes from './routes/auth.routes.js';
import fikaRoutes from './routes/fika.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import adminRoutes from './routes/admin.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

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

  app.get('/api/health', async () => ({ ok: true }));

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
