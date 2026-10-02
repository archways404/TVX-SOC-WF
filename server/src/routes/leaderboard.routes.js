import { pool } from '../db/pool.js';
import { hasGlitter } from '../services/userService.js';

export default async function leaderboardRoutes(fastify) {
  // Public on purpose: the leaderboard is shown on the login screen so
  // visitors can see the standings before signing in.
  fastify.get('/api/leaderboard', async () => {
    // The ORDER BY must live here, not only in the view: MySQL/MariaDB don't
    // guarantee a view's own ORDER BY survives being selected from (MariaDB
    // drops it), which put the wrong players on the podium.
    const [rows] = await pool.query(
      `SELECT l.user_id, l.name, l.avatar_url, l.total_points, l.guesses_made,
              l.category_correct_count, l.description_correct_count, u.email
       FROM leaderboard l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.total_points DESC, l.name ASC`,
    );
    // Rank is plain position (1st, 2nd, 3rd, 4th…) — players on equal points
    // are ordered by name rather than sharing a place. SUM() columns come back
    // from mysql2 as DECIMAL strings ("12"), so convert them to real numbers.
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      glitter: hasGlitter(row.email),
      totalPoints: Number(row.total_points),
      guessesMade: Number(row.guesses_made),
      categoryCorrectCount: Number(row.category_correct_count),
      descriptionCorrectCount: Number(row.description_correct_count),
    }));
  });
}
