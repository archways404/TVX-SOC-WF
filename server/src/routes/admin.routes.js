import {
  listEventsForAdmin,
  getEventWithGuesses,
  revealEvent,
  gradeGuess,
  finalizeEvent,
} from '../services/scoringService.js';

export default async function adminRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/api/admin/events', async () => {
    return listEventsForAdmin();
  });

  fastify.get('/api/admin/events/:id', async (request, reply) => {
    const result = await getEventWithGuesses(Number(request.params.id));
    if (!result) return reply.code(404).send({ error: 'Event not found' });
    return result;
  });

  fastify.put('/api/admin/events/:id/reveal', async (request, reply) => {
    const { actualCategoryId, actualDescription, pointsCategory, pointsDescription } = request.body ?? {};
    if (!actualDescription) {
      return reply.code(400).send({ error: 'actualDescription is required' });
    }

    return revealEvent({
      eventId: Number(request.params.id),
      actualCategoryId: actualCategoryId ?? null,
      actualDescription,
      pointsCategory: pointsCategory ?? 1,
      pointsDescription: pointsDescription ?? 2,
    });
  });

  fastify.put('/api/admin/events/:id/guesses/:guessId', async (request, reply) => {
    const { categoryCorrect, descriptionCorrect } = request.body ?? {};
    try {
      return await gradeGuess({
        eventId: Number(request.params.id),
        guessId: Number(request.params.guessId),
        categoryCorrect,
        descriptionCorrect,
      });
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  fastify.post('/api/admin/events/:id/finalize', async (request) => {
    return finalizeEvent(Number(request.params.id));
  });
}
