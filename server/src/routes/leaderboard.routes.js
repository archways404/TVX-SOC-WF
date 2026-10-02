import { pool } from '../db/pool.js';

export default async function leaderboardRoutes(fastify) {
  // Public on purpose: the leaderboard is shown on the login screen so
  // visitors can see the standings before signing in.
  fastify.get('/api/leaderboard', async () => {
    // The ORDER BY must live here, not only in the view: MySQL/MariaDB don't
    // guarantee a view's own ORDER BY survives being selected from (MariaDB
    // drops it), which put the wrong players on the podium.
    const [rows] = await pool.query(
      `SELECT user_id, name, avatar_url, total_points, guesses_made, category_correct_count, description_correct_count
       FROM leaderboard
       ORDER BY total_points DESC, name ASC`,
    );
    // Rank is plain position (1st, 2nd, 3rd, 4th…) — players on equal points
    // are ordered by name rather than sharing a place. SUM() columns come back
    // from mysql2 as DECIMAL strings ("12"), so convert them to real numbers.
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      totalPoints: Number(row.total_points),
      guessesMade: Number(row.guesses_made),
      categoryCorrectCount: Number(row.category_correct_count),
      descriptionCorrectCount: Number(row.description_correct_count),
    }));
  });
}
