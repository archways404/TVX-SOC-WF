import { pool } from '../db/pool.js';

export default async function leaderboardRoutes(fastify) {
  // Public on purpose: the leaderboard is shown on the login screen so
  // visitors can see the standings before signing in.
  fastify.get('/api/leaderboard', async () => {
    const [rows] = await pool.query(
      'SELECT user_id, name, avatar_url, total_points, guesses_made, category_correct_count, description_correct_count FROM leaderboard',
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      totalPoints: row.total_points,
      guessesMade: row.guesses_made,
      categoryCorrectCount: row.category_correct_count,
      descriptionCorrectCount: row.description_correct_count,
    }));
  });
}
