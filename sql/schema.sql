-- Fika Friday guessing game — MySQL 8 schema
-- Run this once against an empty database, e.g.:
--   mysql -h <host> -u <user> -p <database> < sql/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_sub    VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(512) NULL,
  role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  UNIQUE KEY uq_users_google_sub (google_sub),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- fika_categories — the "type of fika" a guess can be filed under.
-- Seeded below; admin can add more via SQL, no UI needed for this list.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fika_categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(50) NOT NULL,
  label      VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_fika_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- fika_events — one row per Friday. Created lazily by the app the first time
-- that Friday's guessing window is requested; opens_at/closes_at are stored
-- as UTC instants (computed from Europe/Stockholm 08:00 + window length).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fika_events (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_date          DATE NOT NULL COMMENT 'The Friday this event belongs to, Stockholm calendar date',
  opens_at            DATETIME NOT NULL COMMENT 'UTC instant guessing opens',
  closes_at           DATETIME NOT NULL COMMENT 'UTC instant guessing closes',
  status              ENUM('awaiting_reveal', 'revealed', 'scored') NOT NULL DEFAULT 'awaiting_reveal',
  actual_category_id  INT UNSIGNED NULL,
  actual_description  VARCHAR(255) NULL,
  points_category     INT UNSIGNED NOT NULL DEFAULT 1,
  points_description  INT UNSIGNED NOT NULL DEFAULT 2,
  revealed_at         TIMESTAMP NULL,
  ai_requested_at     TIMESTAMP NULL COMMENT 'When the reveal was last sent to n8n for AI grading',
  ai_graded_at        TIMESTAMP NULL COMMENT 'When n8n last posted grading results back',
  ai_raw_response     JSON NULL COMMENT 'Full body n8n posted back to /api/webhooks/n8n/grade, for admin inspection',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fika_events_event_date (event_date),
  KEY idx_fika_events_status (status),
  CONSTRAINT fk_fika_events_actual_category
    FOREIGN KEY (actual_category_id) REFERENCES fika_categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- guesses — one per user per event. category_correct/description_correct
-- are NULL until the admin grades them; points_awarded is derived from those
-- two flags times the event's points_category/points_description.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guesses (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fika_event_id        INT UNSIGNED NOT NULL,
  user_id              INT UNSIGNED NOT NULL,
  category_id          INT UNSIGNED NULL,
  description          VARCHAR(255) NOT NULL,
  category_correct     TINYINT(1) NULL,
  description_correct  TINYINT(1) NULL,
  points_awarded       INT UNSIGNED NOT NULL DEFAULT 0,
  points_override      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Admin set points_awarded directly instead of the computed value',
  graded_by            ENUM('pending', 'auto', 'ai', 'admin') NOT NULL DEFAULT 'pending' COMMENT 'Who last decided category_correct/description_correct',
  ai_notes             TEXT NULL COMMENT 'Full reasoning n8n sent back with its grading, unmodified',
  submitted_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  graded_at            TIMESTAMP NULL,
  UNIQUE KEY uq_guesses_event_user (fika_event_id, user_id),
  KEY idx_guesses_user (user_id),
  CONSTRAINT fk_guesses_event
    FOREIGN KEY (fika_event_id) REFERENCES fika_events(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_guesses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_guesses_category
    FOREIGN KEY (category_id) REFERENCES fika_categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- score_adjustments — manual point grants/deductions an admin makes directly
-- to a player, independent of any fika_event/guess (bonuses, corrections for
-- someone who never played, penalties, etc). Summed into the leaderboard
-- alongside guesses.points_awarded.
-- ---------------------------------------------------------------------------
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

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Running leaderboard — guess points plus manual score_adjustments per user.
-- Aggregated in subqueries first (not a single multi-table JOIN) so the two
-- one-to-many relationships don't fan out and double-count each other.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Seed data — starter fika categories. Add more later with plain INSERTs.
-- ---------------------------------------------------------------------------
INSERT INTO fika_categories (slug, label, sort_order) VALUES
  ('cookie',       'Cookie',            10),
  ('bread_doughy', 'Bread / Doughy',    20),
  ('cake',         'Cake',              30),
  ('pastry',       'Pastry',            40),
  ('fruit',        'Fruit',             50),
  ('candy',        'Candy / Sweets',    60),
  ('other',        'Other',            999)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order);
