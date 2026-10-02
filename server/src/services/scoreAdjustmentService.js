import { pool } from '../db/pool.js';
import { hasGlitter } from './userService.js';

function withGlitter(row) {
  return { ...row, glitter: hasGlitter(row.user_email) };
}

/** Manual point grants/deductions, independent of any event or guess. */
export async function listAdjustments() {
  const [rows] = await pool.query(
    `SELECT sa.*, u.name AS user_name, u.email AS user_email, admin.name AS created_by_name
     FROM score_adjustments sa
     JOIN users u ON u.id = sa.user_id
     LEFT JOIN users admin ON admin.id = sa.created_by
     ORDER BY sa.created_at DESC`,
  );
  return rows.map(withGlitter);
}

export async function createAdjustment({ userId, points, reason, createdBy }) {
  const [result] = await pool.query(
    'INSERT INTO score_adjustments (user_id, points, reason, created_by) VALUES (?, ?, ?, ?)',
    [userId, points, reason?.trim() || null, createdBy ?? null],
  );
  const [rows] = await pool.query(
    `SELECT sa.*, u.name AS user_name, u.email AS user_email, admin.name AS created_by_name
     FROM score_adjustments sa
     JOIN users u ON u.id = sa.user_id
     LEFT JOIN users admin ON admin.id = sa.created_by
     WHERE sa.id = ?`,
    [result.insertId],
  );
  return withGlitter(rows[0]);
}

export async function deleteAdjustment(id) {
  const [result] = await pool.query('DELETE FROM score_adjustments WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Adjustment not found');
}
