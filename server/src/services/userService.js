import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

function isAdminEmail(email) {
  return env.adminEmails.includes(email.toLowerCase());
}

export async function upsertGoogleUser({ googleSub, email, name, avatarUrl }) {
  await pool.query(
    `INSERT INTO users (google_sub, email, name, avatar_url, role, last_login_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       avatar_url = VALUES(avatar_url),
       last_login_at = NOW()`,
    [googleSub, email, name, avatarUrl, isAdminEmail(email) ? 'admin' : 'user'],
  );

  if (isAdminEmail(email)) {
    await pool.query('UPDATE users SET role = "admin" WHERE email = ?', [email]);
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}

export async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function listUsers() {
  const [rows] = await pool.query('SELECT id, name, email, avatar_url, role FROM users ORDER BY name ASC');
  return rows;
}
