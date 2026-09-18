import { pool } from '../db/pool.js';
import { resolveCurrentEventDate, isWithinWindow } from '../utils/time.js';

export async function listCategories() {
  const [rows] = await pool.query('SELECT id, slug, label FROM fika_categories ORDER BY sort_order ASC');
  return rows;
}

async function findEventByDate(eventDate) {
  const [rows] = await pool.query('SELECT * FROM fika_events WHERE event_date = ?', [eventDate]);
  return rows[0] ?? null;
}

export async function findOrCreateCurrentEvent() {
  const { eventDate, opensAt, closesAt } = resolveCurrentEventDate();

  let event = await findEventByDate(eventDate);
  if (!event) {
    await pool.query(
      'INSERT INTO fika_events (event_date, opens_at, closes_at) VALUES (?, ?, ?)',
      [eventDate, opensAt, closesAt],
    );
    event = await findEventByDate(eventDate);
  }

  return event;
}

export function describeEventForUser(event, userGuess) {
  const now = new Date();
  const open = isWithinWindow(now, event.opens_at, event.closes_at);
  const revealed = event.status !== 'awaiting_reveal';

  return {
    id: event.id,
    eventDate: event.event_date,
    opensAt: event.opens_at,
    closesAt: event.closes_at,
    isOpen: open,
    status: event.status,
    myGuess: userGuess
      ? {
          categoryId: userGuess.category_id,
          description: userGuess.description,
          pointsAwarded: revealed ? userGuess.points_awarded : null,
          categoryCorrect: revealed ? Boolean(userGuess.category_correct) : null,
          descriptionCorrect: revealed ? Boolean(userGuess.description_correct) : null,
        }
      : null,
    reveal: revealed
      ? {
          actualCategoryId: event.actual_category_id,
          actualDescription: event.actual_description,
        }
      : null,
  };
}

export async function getUserGuessForEvent(eventId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM guesses WHERE fika_event_id = ? AND user_id = ?',
    [eventId, userId],
  );
  return rows[0] ?? null;
}

export async function submitGuess({ eventId, userId, categoryId, description }) {
  await pool.query(
    `INSERT INTO guesses (fika_event_id, user_id, category_id, description)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       category_id = VALUES(category_id),
       description = VALUES(description),
       submitted_at = CURRENT_TIMESTAMP`,
    [eventId, userId, categoryId, description],
  );
  return getUserGuessForEvent(eventId, userId);
}

export async function listPastEvents(limit = 20) {
  const [rows] = await pool.query(
    `SELECT e.*, c.label AS actual_category_label
     FROM fika_events e
     LEFT JOIN fika_categories c ON c.id = e.actual_category_id
     WHERE e.status != 'awaiting_reveal'
     ORDER BY e.event_date DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}
