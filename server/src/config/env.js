import 'dotenv/config';

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
};
