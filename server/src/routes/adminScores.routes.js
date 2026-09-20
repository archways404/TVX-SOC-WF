import { listAdjustments, createAdjustment, deleteAdjustment } from '../services/scoreAdjustmentService.js';

/**
 * Manual point grants/deductions, independent of any fika_event — for
 * crediting someone who never played, correcting a mistake, or just handing
 * out a bonus. Summed into the `leaderboard` view alongside guess points.
 */
export default async function adminScoresRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/api/admin/score-adjustments', async () => {
    return listAdjustments();
  });

  fastify.post('/api/admin/score-adjustments', async (request, reply) => {
    const { userId, points, reason } = request.body ?? {};
    if (!userId || points === undefined || points === null || points === '') {
      return reply.code(400).send({ error: 'userId and points are required' });
    }
    const numericPoints = Number(points);
    if (!Number.isInteger(numericPoints)) {
      return reply.code(400).send({ error: 'points must be a whole number' });
    }
    return createAdjustment({
      userId: Number(userId),
      points: numericPoints,
      reason,
      createdBy: request.user.id,
    });
  });

  fastify.delete('/api/admin/score-adjustments/:id', async (request, reply) => {
    try {
      await deleteAdjustment(Number(request.params.id));
      return reply.code(204).send();
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });
}
