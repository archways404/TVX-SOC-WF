-- Fake data for local development / demoing the admin panel — NOT for
-- production. Creates a handful of fake users (no real Google login, so they
-- can never sign in — admin-only test fixtures) plus a few weeks of fika
-- events in different states (awaiting reveal, revealed, scored) with
-- guesses, AI grading notes, and a couple of manual score adjustments.
--
--   mysql -h <host> -u <user> -p <database> < sql/seed-dev-data.sql
--
-- Re-runnable: deletes its own fake rows (google_sub LIKE 'seed-%') first.

SET NAMES utf8mb4;

DELETE FROM users WHERE google_sub LIKE 'seed-%';

INSERT INTO users (google_sub, email, name, avatar_url, role, created_at, last_login_at) VALUES
  ('seed-1', 'anna.karlsson.seed@example.com', 'Anna Karlsson', NULL, 'user', NOW(), NOW()),
  ('seed-2', 'erik.lund.seed@example.com',     'Erik Lund',     NULL, 'user', NOW(), NOW()),
  ('seed-3', 'sara.nilsson.seed@example.com',  'Sara Nilsson',  NULL, 'user', NOW(), NOW()),
  ('seed-4', 'johan.berg.seed@example.com',    'Johan Berg',    NULL, 'user', NOW(), NOW()),
  ('seed-5', 'maria.svensson.seed@example.com','Maria Svensson',NULL, 'user', NOW(), NOW());

SET @u_anna  = (SELECT id FROM users WHERE google_sub = 'seed-1');
SET @u_erik  = (SELECT id FROM users WHERE google_sub = 'seed-2');
SET @u_sara  = (SELECT id FROM users WHERE google_sub = 'seed-3');
SET @u_johan = (SELECT id FROM users WHERE google_sub = 'seed-4');
SET @u_maria = (SELECT id FROM users WHERE google_sub = 'seed-5');

SET @cat_cookie = (SELECT id FROM fika_categories WHERE slug = 'cookie');
SET @cat_pastry = (SELECT id FROM fika_categories WHERE slug = 'pastry');
SET @cat_cake   = (SELECT id FROM fika_categories WHERE slug = 'cake');

-- Event 1: two weeks ago, fully scored.
INSERT INTO fika_events (event_date, opens_at, closes_at, status, actual_category_id, actual_description, points_category, points_description, revealed_at, ai_requested_at, ai_graded_at)
VALUES (DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 2 HOUR,
        'scored', @cat_pastry, 'Cinnamon buns', 1, 2, DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY))
ON DUPLICATE KEY UPDATE status = VALUES(status);
SET @ev1 = (SELECT id FROM fika_events WHERE event_date = DATE_SUB(CURDATE(), INTERVAL 14 DAY));

INSERT INTO guesses (fika_event_id, user_id, category_id, description, category_correct, description_correct, points_awarded, graded_by, ai_notes, graded_at) VALUES
  (@ev1, @u_anna,  @cat_pastry, 'kanelbullar',            1, 1, 3, 'ai',    'kanelbulle is the Swedish word for cinnamon bun — same thing.', DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (@ev1, @u_erik,  @cat_pastry, 'cardamom buns',          1, 0, 1, 'ai',    'A different pastry (cardamom, not cinnamon) — close but not a match.', DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (@ev1, @u_sara,  @cat_cookie, 'chocolate chip cookies', 0, 0, 0, 'auto',  NULL, DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (@ev1, @u_johan, @cat_pastry, 'cinnamon rolls',         1, 1, 3, 'admin', NULL, DATE_SUB(NOW(), INTERVAL 13 DAY))
ON DUPLICATE KEY UPDATE points_awarded = VALUES(points_awarded);

-- Event 2: last week, revealed but only partly graded (AI pass pending admin review).
INSERT INTO fika_events (event_date, opens_at, closes_at, status, actual_category_id, actual_description, points_category, points_description, revealed_at)
VALUES (DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 2 HOUR,
        'revealed', @cat_cake, 'Chocolate cake', 1, 2, DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE status = VALUES(status);
SET @ev2 = (SELECT id FROM fika_events WHERE event_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY));

INSERT INTO guesses (fika_event_id, user_id, category_id, description, category_correct, description_correct, points_awarded, graded_by, graded_at) VALUES
  (@ev2, @u_anna,  @cat_cake,   'chocolate cake', 1, NULL, 1, 'auto', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (@ev2, @u_sara,  @cat_cake,   'marble cake',    1, NULL, 1, 'auto', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (@ev2, @u_maria, @cat_cookie, 'oat cookies',    0, NULL, 0, 'auto', DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE points_awarded = VALUES(points_awarded);

-- Event 3: this week's Friday (today if today IS Friday), still open — no reveal yet.
SET @this_friday = CURDATE() + INTERVAL ((4 - WEEKDAY(CURDATE()) + 7) % 7) DAY;
INSERT INTO fika_events (event_date, opens_at, closes_at, status)
VALUES (@this_friday, NOW(), NOW() + INTERVAL 2 HOUR, 'awaiting_reveal')
ON DUPLICATE KEY UPDATE status = VALUES(status);
SET @ev3 = (SELECT id FROM fika_events WHERE event_date = @this_friday);

INSERT INTO guesses (fika_event_id, user_id, category_id, description) VALUES
  (@ev3, @u_anna, @cat_cookie, 'gingerbread cookies'),
  (@ev3, @u_erik, @cat_pastry, 'croissants')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- A couple of manual score adjustments, independent of any event.
INSERT INTO score_adjustments (user_id, points, reason, created_at) VALUES
  (@u_maria, 5,  'Organized the fika table three weeks running — bonus.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (@u_johan, -2, 'Correcting a double-counted bonus from last month.',    DATE_SUB(NOW(), INTERVAL 1 DAY));
