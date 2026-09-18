import { verifyGoogleIdToken } from '../auth/verifyGoogleToken.js';
import { upsertGoogleUser, getUserById } from '../services/userService.js';
import { env } from '../config/env.js';

const COOKIE_NAME = 'fika_session';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export default async function authRoutes(fastify) {
  fastify.post('/api/auth/google', async (request, reply) => {
    const { credential } = request.body ?? {};
    if (!credential) {
      return reply.code(400).send({ error: 'Missing credential' });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch (err) {
      request.log.warn({ err }, 'Google token verification failed');
      return reply.code(401).send({ error: 'Invalid Google account' });
    }

    const user = await upsertGoogleUser(profile);
    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { expiresIn: `${COOKIE_MAX_AGE_SECONDS}s` },
    );

    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url, role: user.role };
  });

  fastify.get('/api/auth/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = await getUserById(request.user.id);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url, role: user.role };
  });

  fastify.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });
}
