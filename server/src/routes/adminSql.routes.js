import { pool } from '../db/pool.js';

const READ_ONLY_PATTERN = /^(select|show|explain|describe|desc)\b/i;
const QUERY_TIMEOUT_MS = 15_000;

// Split on ';' and drop empty trailing fragments — a very deliberate
// blast-radius limiter: this only ever sends ONE statement to MySQL, so
// there's no chaining a SELECT with a hidden DROP TABLE after it.
function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A raw SQL console for admins — full read/write access to the database
 * from /admin, for anything the rest of the admin UI doesn't cover.
 * Deliberately powerful (this is a small internal tool for a trusted admin),
 * with two guardrails: only one statement per request, and anything that
 * isn't a SELECT/SHOW/EXPLAIN requires an explicit `confirm: true` — which
 * the admin UI only sends after a red "yes, run this" confirmation dialog.
 */
export default async function adminSqlRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.post('/api/admin/sql', async (request, reply) => {
    const { sql, confirm } = request.body ?? {};
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return reply.code(400).send({ error: 'sql is required' });
    }

    const statements = splitStatements(sql);
    if (statements.length === 0) {
      return reply.code(400).send({ error: 'sql is required' });
    }
    if (statements.length > 1) {
      return reply.code(400).send({ error: 'Only one statement at a time — split multiple statements into separate runs.' });
    }
    const statement = statements[0];
    const isReadOnly = READ_ONLY_PATTERN.test(statement);

    if (!isReadOnly && confirm !== true) {
      return reply.code(409).send({
        error: 'This looks like a write/DDL statement. Resend with confirm: true to run it.',
        requiresConfirm: true,
      });
    }

    request.log.warn({ admin: request.user.email, sql: statement }, 'Admin SQL console: executing statement');

    try {
      const [result, fields] = await pool.query({ sql: statement, timeout: QUERY_TIMEOUT_MS });

      if (Array.isArray(result)) {
        return {
          type: 'rows',
          columns: (fields ?? []).map((f) => f.name),
          rows: result,
          rowCount: result.length,
        };
      }

      return {
        type: 'result',
        affectedRows: result.affectedRows ?? 0,
        changedRows: result.changedRows ?? 0,
        insertId: result.insertId || null,
        warningStatus: result.warningStatus ?? 0,
      };
    } catch (err) {
      return reply.code(400).send({ error: err.sqlMessage || err.message });
    }
  });
}
