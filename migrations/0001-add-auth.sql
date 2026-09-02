-- Migration: add multi-user auth to an existing single-user database.
--
-- Adds the users table and a nullable user_id to every data table. Existing
-- rows keep user_id = NULL; they are auto-claimed by the FIRST user who
-- registers (see app/api/auth/register/route.ts), which assigns all NULL rows
-- to that user. Fresh installs should use schema.sql instead.
--
-- Apply with:
--   wrangler d1 execute trainingslog --local  --file=migrations/0001-add-auth.sql
--   wrangler d1 execute trainingslog --remote --file=migrations/0001-add-auth.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE goals ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE exercises ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE goal_exercises ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE goal_logs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE exercise_logs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_logs_user_id ON goal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_exercises_user_id ON goal_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
