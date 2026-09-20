import { env } from '../config/env.js';
import {
  listEventsForAdmin,
  getEventWithGuesses,
  revealEvent,
  gradeGuess,
  updateGuessContent,
  deleteGuess,
  deleteEvent,
  finalizeEvent,
  reopenEvent,
  requestAiGrading,
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

    const result = await revealEvent({
      eventId: Number(request.params.id),
      actualCategoryId: actualCategoryId ?? null,
      actualDescription,
      pointsCategory: pointsCategory ?? 1,
      pointsDescription: pointsDescription ?? 2,
    });

    // Revealing the answer is the trigger for AI grading. Best-effort: if
    // n8n isn't configured or the call fails, the reveal still stands and
    // the admin can grade descriptions by hand (or retry from the UI).
    let aiGrading = { requested: false };
    if (env.n8nGradeWebhookUrl) {
      try {
        await requestAiGrading(Number(request.params.id));
        aiGrading = { requested: true };
      } catch (err) {
        aiGrading = { requested: false, error: err.message };
      }
    }

    const fresh = await getEventWithGuesses(Number(request.params.id));
    return { ...fresh, aiGrading };
  });

  fastify.post('/api/admin/events/:id/request-ai-grading', async (request, reply) => {
    try {
      const result = await requestAiGrading(Number(request.params.id));
      return { ...result, aiGrading: { requested: true } };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.put('/api/admin/events/:id/guesses/:guessId', async (request, reply) => {
    const { categoryCorrect, descriptionCorrect, pointsOverride } = request.body ?? {};
    try {
      return await gradeGuess({
        eventId: Number(request.params.id),
        guessId: Number(request.params.guessId),
        categoryCorrect,
        descriptionCorrect,
        pointsOverride,
      });
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  fastify.patch('/api/admin/events/:id/guesses/:guessId', async (request, reply) => {
    const { categoryId, description } = request.body ?? {};
    if (!description || !description.trim()) {
      return reply.code(400).send({ error: 'description is required' });
    }
    try {
      return await updateGuessContent({
        eventId: Number(request.params.id),
        guessId: Number(request.params.guessId),
        categoryId: categoryId ?? null,
        description: description.trim().slice(0, 255),
      });
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  fastify.delete('/api/admin/events/:id/guesses/:guessId', async (request, reply) => {
    try {
      return await deleteGuess({
        eventId: Number(request.params.id),
        guessId: Number(request.params.guessId),
      });
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  fastify.delete('/api/admin/events/:id', async (request, reply) => {
    try {
      await deleteEvent(Number(request.params.id));
      return reply.code(204).send();
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  fastify.post('/api/admin/events/:id/finalize', async (request) => {
    return finalizeEvent(Number(request.params.id));
  });

  fastify.post('/api/admin/events/:id/reopen', async (request, reply) => {
    try {
      return await reopenEvent(Number(request.params.id));
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });
}
