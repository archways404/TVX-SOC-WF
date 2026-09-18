import fp from 'fastify-plugin';

export default fp(async function authPlugin(fastify) {
  fastify.decorate('authenticate', async (request, reply) => {
    const token = request.cookies.fika_session;
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    try {
      request.user = fastify.jwt.verify(token);
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.decorate('requireAdmin', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      reply.code(403).send({ error: 'Admin access required' });
    }
  });
});
