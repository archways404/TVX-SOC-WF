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

// Correctness and points are meaningless (NULL/0) until the admin reveals the
// answer, so they're sent as null before then rather than as a misleading 0.
function toPublicGuess(guess, { viewerId, revealed }) {
  return {
    userId: guess.user_id,
    userName: guess.user_name,
    avatarUrl: guess.user_avatar_url,
    isMe: guess.user_id === viewerId,
    categoryId: guess.category_id,
    categoryLabel: guess.category_label,
    description: guess.description,
    submittedAt: guess.submitted_at,
    categoryCorrect: revealed && guess.category_correct !== null ? Boolean(guess.category_correct) : null,
    descriptionCorrect: revealed && guess.description_correct !== null ? Boolean(guess.description_correct) : null,
    pointsAwarded: revealed ? guess.points_awarded : null,
  };
}

// The current week's event plus everyone's guesses so far — players see who
// has guessed what live, before and after locking in their own answer.
async function describeCurrentEvent(event, viewerId) {
  const [guess, allGuesses] = await Promise.all([
    getUserGuessForEvent(event.id, viewerId),
    listGuessesForEvent(event.id),
  ]);
  const described = describeEventForUser(event, guess);
  const revealed = described.reveal !== null;
  return {
    ...described,
    guesses: allGuesses.map((g) => toPublicGuess(g, { viewerId, revealed })),
  };
}

export default async function fikaRoutes(fastify) {
  fastify.get('/api/fika/categories', async () => {
    return listCategories();
  });

  fastify.get('/api/fika/current', { preHandler: fastify.authenticate }, async (request) => {
    const event = await findOrCreateCurrentEvent();
    return describeCurrentEvent(event, request.user.id);
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

    return describeCurrentEvent(event, request.user.id);
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
          guesses: allGuesses.map((g) => toPublicGuess(g, { viewerId: request.user.id, revealed: true })),
        };
      }),
    );
    return withGuesses;
  });
}
