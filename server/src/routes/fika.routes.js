import {
  findOrCreateCurrentEvent,
  describeEventForUser,
  getUserGuessForEvent,
  submitGuess,
  listCategories,
  listPastEvents,
  listGuessesForEvent,
} from '../services/fikaService.js';
import { isWithinWindow } from '../utils/time.js';

export default async function fikaRoutes(fastify) {
  fastify.get('/api/fika/categories', async () => {
    return listCategories();
  });

  fastify.get('/api/fika/current', { preHandler: fastify.authenticate }, async (request) => {
    const event = await findOrCreateCurrentEvent();
    const guess = await getUserGuessForEvent(event.id, request.user.id);
    return describeEventForUser(event, guess);
  });

  fastify.post('/api/fika/current/guess', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { categoryId, description } = request.body ?? {};
    if (!description || typeof description !== 'string' || !description.trim()) {
      return reply.code(400).send({ error: 'description is required' });
    }

    const event = await findOrCreateCurrentEvent();
    if (!isWithinWindow(new Date(), event.opens_at, event.closes_at)) {
      return reply.code(409).send({ error: 'Guessing is not open right now' });
    }

    await submitGuess({
      eventId: event.id,
      userId: request.user.id,
      categoryId: categoryId ?? null,
      description: description.trim().slice(0, 255),
    });

    const guess = await getUserGuessForEvent(event.id, request.user.id);
    return describeEventForUser(event, guess);
  });

  fastify.get('/api/fika/history', { preHandler: fastify.authenticate }, async (request) => {
    const events = await listPastEvents();
    const withGuesses = await Promise.all(
      events.map(async (event) => {
        const guess = await getUserGuessForEvent(event.id, request.user.id);
        const described = describeEventForUser(event, guess);
        // Revealed events are never sensitive — show everyone's guess so
        // players can see who nailed it and how the points shook out.
        const allGuesses = await listGuessesForEvent(event.id);
        return {
          ...described,
          guesses: allGuesses.map((g) => ({
            userId: g.user_id,
            userName: g.user_name,
            isMe: g.user_id === request.user.id,
            categoryId: g.category_id,
            categoryLabel: g.category_label,
            description: g.description,
            categoryCorrect: g.category_correct === null ? null : Boolean(g.category_correct),
            descriptionCorrect: g.description_correct === null ? null : Boolean(g.description_correct),
            pointsAwarded: g.points_awarded,
          })),
        };
      }),
    );
    return withGuesses;
  });
}
