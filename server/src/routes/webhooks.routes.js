import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { applyAiGrading } from '../services/scoringService.js';

function secretMatches(provided) {
  if (!env.n8nCallbackSecret || typeof provided !== 'string') return false;
  const expected = Buffer.from(env.n8nCallbackSecret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Inbound side of the n8n integration: n8n POSTs its grading verdicts here
 * after scoringService.requestAiGrading() pushed the event + guesses to it.
 * Authenticated with a shared secret header instead of the session cookie,
 * since the caller is an external system, not a logged-in admin.
 */
export default async function webhooksRoutes(fastify) {
  fastify.post('/api/webhooks/n8n/grade', async (request, reply) => {
    if (!secretMatches(request.headers['x-webhook-secret'])) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { eventId, results } = request.body ?? {};
    if (!eventId || !Array.isArray(results)) {
      return reply.code(400).send({ error: 'eventId and results[] are required' });
    }

    try {
      const updated = await applyAiGrading({ eventId: Number(eventId), results });
      return updated;
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });
}
