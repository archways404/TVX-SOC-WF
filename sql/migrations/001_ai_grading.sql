-- Adds n8n AI-grading support to an existing database.
-- Safe to run once against a database created from an older sql/schema.sql.
--   mysql -h <host> -u <user> -p <database> < sql/migrations/001_ai_grading.sql

ALTER TABLE fika_events
  ADD COLUMN IF NOT EXISTS ai_requested_at TIMESTAMP NULL COMMENT 'When the reveal was last sent to n8n for AI grading' AFTER revealed_at,
  ADD COLUMN IF NOT EXISTS ai_graded_at    TIMESTAMP NULL COMMENT 'When n8n last posted grading results back' AFTER ai_requested_at;

ALTER TABLE guesses
  ADD COLUMN IF NOT EXISTS points_override TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Admin set points_awarded directly instead of the computed value' AFTER points_awarded,
  ADD COLUMN IF NOT EXISTS graded_by        ENUM('pending', 'auto', 'ai', 'admin') NOT NULL DEFAULT 'pending' COMMENT 'Who last decided category_correct/description_correct' AFTER points_override,
  ADD COLUMN IF NOT EXISTS ai_notes         VARCHAR(255) NULL COMMENT 'Optional reasoning n8n sent back with its grading' AFTER graded_by;

-- Backfill graded_by for rows graded before this column existed.
UPDATE guesses
SET graded_by = 'admin'
WHERE graded_by = 'pending' AND graded_at IS NOT NULL;
