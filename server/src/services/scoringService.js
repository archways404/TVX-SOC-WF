import { pool } from '../db/pool.js';

function computePoints(event, guess) {
  let points = 0;
  if (guess.category_correct) points += event.points_category;
  if (guess.description_correct) points += event.points_description;
  return points;
}

async function getEvent(eventId) {
  const [rows] = await pool.query('SELECT * FROM fika_events WHERE id = ?', [eventId]);
  return rows[0] ?? null;
}

export async function getEventWithGuesses(eventId) {
  const event = await getEvent(eventId);
  if (!event) return null;

  const [guesses] = await pool.query(
    `SELECT g.*, u.name AS user_name, u.email AS user_email, c.label AS category_label
     FROM guesses g
     JOIN users u ON u.id = g.user_id
     LEFT JOIN fika_categories c ON c.id = g.category_id
     WHERE g.fika_event_id = ?
     ORDER BY u.name ASC`,
    [eventId],
  );

  return { event, guesses };
}

export async function listEventsForAdmin() {
  const [rows] = await pool.query(
    `SELECT e.*, COUNT(g.id) AS guess_count
     FROM fika_events e
     LEFT JOIN guesses g ON g.fika_event_id = e.id
     GROUP BY e.id
     ORDER BY e.event_date DESC`,
  );
  return rows;
}

/**
 * Admin reveals the real answer for an event. Category correctness can be
 * graded automatically (exact match on category_id); description is free
 * text so it's left for the admin to grade per guess afterwards.
 */
export async function revealEvent({ eventId, actualCategoryId, actualDescription, pointsCategory, pointsDescription }) {
  await pool.query(
    `UPDATE fika_events
     SET actual_category_id = ?, actual_description = ?, points_category = ?, points_description = ?,
         status = 'revealed', revealed_at = NOW()
     WHERE id = ?`,
    [actualCategoryId, actualDescription, pointsCategory, pointsDescription, eventId],
  );

  const event = await getEvent(eventId);
  const [guesses] = await pool.query('SELECT * FROM guesses WHERE fika_event_id = ?', [eventId]);

  for (const guess of guesses) {
    const categoryCorrect = actualCategoryId != null && guess.category_id === actualCategoryId ? 1 : 0;
    const points = computePoints(event, { ...guess, category_correct: categoryCorrect, description_correct: guess.description_correct });
    await pool.query(
      'UPDATE guesses SET category_correct = ?, points_awarded = ?, graded_at = NOW() WHERE id = ?',
      [categoryCorrect, points, guess.id],
    );
  }

  return getEventWithGuesses(eventId);
}

export async function gradeGuess({ eventId, guessId, categoryCorrect, descriptionCorrect }) {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const [rows] = await pool.query('SELECT * FROM guesses WHERE id = ? AND fika_event_id = ?', [guessId, eventId]);
  const guess = rows[0];
  if (!guess) throw new Error('Guess not found');

  const nextCategoryCorrect = categoryCorrect ?? Boolean(guess.category_correct);
  const nextDescriptionCorrect = descriptionCorrect ?? Boolean(guess.description_correct);
  const points = computePoints(event, {
    category_correct: nextCategoryCorrect,
    description_correct: nextDescriptionCorrect,
  });

  await pool.query(
    'UPDATE guesses SET category_correct = ?, description_correct = ?, points_awarded = ?, graded_at = NOW() WHERE id = ?',
    [nextCategoryCorrect ? 1 : 0, nextDescriptionCorrect ? 1 : 0, points, guessId],
  );

  return getEventWithGuesses(eventId);
}

export async function finalizeEvent(eventId) {
  await pool.query('UPDATE fika_events SET status = "scored" WHERE id = ?', [eventId]);
  return getEventWithGuesses(eventId);
}
