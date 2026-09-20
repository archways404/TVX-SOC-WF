-- Adds independent score adjustments + full AI output visibility to an
-- existing database. Safe to run once.
--   mysql -h <host> -u <user> -p <database> < sql/migrations/002_scores_and_ai_transparency.sql

ALTER TABLE fika_events
  ADD COLUMN IF NOT EXISTS ai_raw_response JSON NULL COMMENT 'Full body n8n posted back to /api/webhooks/n8n/grade, for admin inspection' AFTER ai_graded_at;

ALTER TABLE guesses
  MODIFY COLUMN ai_notes TEXT NULL COMMENT 'Full reasoning n8n sent back with its grading, unmodified';

CREATE TABLE IF NOT EXISTS score_adjustments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  points      INT NOT NULL COMMENT 'Signed — negative deducts',
  reason      VARCHAR(255) NULL,
  created_by  INT UNSIGNED NULL COMMENT 'Admin user id who made the adjustment',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_score_adjustments_user (user_id),
  CONSTRAINT fk_score_adjustments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_score_adjustments_admin
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id                                                    AS user_id,
  u.name                                                  AS name,
  u.avatar_url                                            AS avatar_url,
  COALESCE(g.guess_points, 0) + COALESCE(sa.adj_points, 0) AS total_points,
  COALESCE(g.guesses_made, 0)                             AS guesses_made,
  COALESCE(g.category_correct_count, 0)                   AS category_correct_count,
  COALESCE(g.description_correct_count, 0)                AS description_correct_count
FROM users u
LEFT JOIN (
  SELECT
    user_id,
    SUM(points_awarded)                                          AS guess_points,
    COUNT(*)                                                     AS guesses_made,
    SUM(CASE WHEN category_correct = 1 THEN 1 ELSE 0 END)        AS category_correct_count,
    SUM(CASE WHEN description_correct = 1 THEN 1 ELSE 0 END)     AS description_correct_count
  FROM guesses
  GROUP BY user_id
) g ON g.user_id = u.id
LEFT JOIN (
  SELECT user_id, SUM(points) AS adj_points
  FROM score_adjustments
  GROUP BY user_id
) sa ON sa.user_id = u.id
ORDER BY total_points DESC, name ASC;
