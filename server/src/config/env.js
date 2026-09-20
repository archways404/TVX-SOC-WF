import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Plain `import 'dotenv/config'` only looks in process.cwd() — fine when you
// happen to launch node from the repo root, but npm workspace scripts
// (`npm run dev --workspace server`, and so `npm run dev:server` from root)
// run with cwd set to server/, so it would silently miss the root .env the
// README tells you to create. Resolve the path from this file's own
// location instead, so it works the same regardless of where it's invoked
// from. Docker doesn't go through this at all (env vars come from
// `--env-file`/the platform directly), so this only affects local dev.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  corsOrigins: required('CORS_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()),

  db: {
    host: required('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },

  googleClientId: required('GOOGLE_CLIENT_ID'),
  googleAllowedDomain: process.env.GOOGLE_ALLOWED_DOMAIN ?? null,
  jwtSecret: required('JWT_SECRET'),
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  fikaGuessWindowMinutes: Number(process.env.FIKA_GUESS_WINDOW_MINUTES ?? 120),

  n8nGradeWebhookUrl: process.env.N8N_GRADE_WEBHOOK_URL || null,
  n8nCallbackSecret: process.env.N8N_CALLBACK_SECRET || null,
};
