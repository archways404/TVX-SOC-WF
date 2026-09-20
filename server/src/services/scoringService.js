import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

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
 * text so it's left for AI/admin grading afterwards.
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
    const points = guess.points_override
      ? guess.points_awarded
      : computePoints(event, { ...guess, category_correct: categoryCorrect, description_correct: guess.description_correct });
    await pool.query(
      `UPDATE guesses
       SET category_correct = ?, points_awarded = ?, graded_at = NOW(),
           graded_by = IF(graded_by = 'pending', 'auto', graded_by)
       WHERE id = ?`,
      [categoryCorrect, points, guess.id],
    );
  }

  return getEventWithGuesses(eventId);
}

export async function gradeGuess({ eventId, guessId, categoryCorrect, descriptionCorrect, pointsOverride }) {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const [rows] = await pool.query('SELECT * FROM guesses WHERE id = ? AND fika_event_id = ?', [guessId, eventId]);
  const guess = rows[0];
  if (!guess) throw new Error('Guess not found');

  const nextCategoryCorrect = categoryCorrect ?? Boolean(guess.category_correct);
  const nextDescriptionCorrect = descriptionCorrect ?? Boolean(guess.description_correct);
  const hasOverride = pointsOverride !== undefined && pointsOverride !== null && pointsOverride !== '';
  const points = hasOverride
    ? Number(pointsOverride)
    : computePoints(event, {
        category_correct: nextCategoryCorrect,
        description_correct: nextDescriptionCorrect,
      });

  await pool.query(
    `UPDATE guesses
     SET category_correct = ?, description_correct = ?, points_awarded = ?, points_override = ?,
         graded_by = 'admin', graded_at = NOW()
     WHERE id = ?`,
    [nextCategoryCorrect ? 1 : 0, nextDescriptionCorrect ? 1 : 0, points, hasOverride ? 1 : 0, guessId],
  );

  return getEventWithGuesses(eventId);
}

/**
 * Lets an admin credit a user who never submitted a guess for this event
 * (forgot to play, joined late, a manual bonus, etc.). Creates the guess
 * row, then grades it through the normal path so points/graded_by stay
 * consistent with every other guess.
 */
export async function addManualGuess({ eventId, userId, categoryId, description, categoryCorrect, descriptionCorrect, pointsOverride }) {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const [existing] = await pool.query(
    'SELECT id FROM guesses WHERE fika_event_id = ? AND user_id = ?',
    [eventId, userId],
  );
  if (existing[0]) throw new Error('This player already has a guess for this event');

  const [result] = await pool.query(
    'INSERT INTO guesses (fika_event_id, user_id, category_id, description) VALUES (?, ?, ?, ?)',
    [eventId, userId, categoryId ?? null, description?.trim() || '(added by admin — no guess submitted)'],
  );

  return gradeGuess({
    eventId,
    guessId: result.insertId,
    categoryCorrect: Boolean(categoryCorrect),
    descriptionCorrect: Boolean(descriptionCorrect),
    pointsOverride,
  });
}

/** Admin correcting the raw content of a guess (typo fixes, wrong category, etc.). */
export async function updateGuessContent({ eventId, guessId, categoryId, description }) {
  const [rows] = await pool.query('SELECT * FROM guesses WHERE id = ? AND fika_event_id = ?', [guessId, eventId]);
  if (!rows[0]) throw new Error('Guess not found');

  await pool.query(
    'UPDATE guesses SET category_id = ?, description = ? WHERE id = ?',
    [categoryId ?? null, description, guessId],
  );

  return getEventWithGuesses(eventId);
}

export async function deleteGuess({ eventId, guessId }) {
  const [result] = await pool.query('DELETE FROM guesses WHERE id = ? AND fika_event_id = ?', [guessId, eventId]);
  if (result.affectedRows === 0) throw new Error('Guess not found');
  return getEventWithGuesses(eventId);
}

export async function deleteEvent(eventId) {
  const [result] = await pool.query('DELETE FROM fika_events WHERE id = ?', [eventId]);
  if (result.affectedRows === 0) throw new Error('Event not found');
}

export async function finalizeEvent(eventId) {
  await pool.query('UPDATE fika_events SET status = "scored" WHERE id = ?', [eventId]);
  return getEventWithGuesses(eventId);
}

/** Lets an admin unlock a finalized event to keep correcting guesses. */
export async function reopenEvent(eventId) {
  const [result] = await pool.query(
    'UPDATE fika_events SET status = "revealed" WHERE id = ? AND status = "scored"',
    [eventId],
  );
  if (result.affectedRows === 0) throw new Error('Event is not finalized');
  return getEventWithGuesses(eventId);
}

/**
 * Pushes the revealed answer + every guess to the configured n8n webhook so
 * it can decide description correctness (free text, so an exact match won't
 * do). n8n posts its verdicts back to POST /api/webhooks/n8n/grade.
 */
export async function requestAiGrading(eventId) {
  if (!env.n8nGradeWebhookUrl) {
    throw new Error('N8N_GRADE_WEBHOOK_URL is not configured');
  }

  const data = await getEventWithGuesses(eventId);
  if (!data) throw new Error('Event not found');
  const { event, guesses } = data;
  if (!event.actual_description) throw new Error('Reveal the answer before requesting AI grading');

  const payload = {
    eventId: event.id,
    eventDate: event.event_date,
    actualCategoryId: event.actual_category_id,
    actualDescription: event.actual_description,
    pointsCategory: event.points_category,
    pointsDescription: event.points_description,
    guesses: guesses.map((g) => ({
      guessId: g.id,
      userName: g.user_name,
      categoryId: g.category_id,
      categoryLabel: g.category_label,
      categoryCorrect: Boolean(g.category_correct),
      description: g.description,
    })),
  };

  const res = await fetch(env.n8nGradeWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`n8n webhook responded with ${res.status}`);
  }

  await pool.query('UPDATE fika_events SET ai_requested_at = NOW() WHERE id = ?', [eventId]);
  return getEventWithGuesses(eventId);
}

/**
 * Applies grading results n8n posted back. Each result can override
 * categoryCorrect too, but normally only judges descriptionCorrect since
 * category is already auto-graded on reveal.
 */
export async function applyAiGrading({ eventId, results }) {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const [existingGuesses] = await pool.query('SELECT * FROM guesses WHERE fika_event_id = ?', [eventId]);
  const byId = new Map(existingGuesses.map((g) => [g.id, g]));

  for (const result of results) {
    const guess = byId.get(Number(result.guessId));
    if (!guess) continue;

    const categoryCorrect = result.categoryCorrect ?? Boolean(guess.category_correct);
    const descriptionCorrect = result.descriptionCorrect ?? Boolean(guess.description_correct);
    const points = guess.points_override
      ? guess.points_awarded
      : computePoints(event, { category_correct: categoryCorrect, description_correct: descriptionCorrect });

    await pool.query(
      `UPDATE guesses
       SET category_correct = ?, description_correct = ?, points_awarded = ?,
           graded_by = 'ai', ai_notes = ?, graded_at = NOW()
       WHERE id = ?`,
      [categoryCorrect ? 1 : 0, descriptionCorrect ? 1 : 0, points, result.notes?.slice(0, 255) ?? null, guess.id],
    );
  }

  await pool.query('UPDATE fika_events SET ai_graded_at = NOW() WHERE id = ?', [eventId]);
  return getEventWithGuesses(eventId);
}
