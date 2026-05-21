-- Training Log Database Schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'red',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(goal_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS goal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(goal_id, date)
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight REAL,
  reps INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exercise_id, date)
);

CREATE INDEX IF NOT EXISTS idx_goal_logs_date ON goal_logs(date);
CREATE INDEX IF NOT EXISTS idx_goal_logs_goal_id ON goal_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_exercises_goal_id ON goal_exercises(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_exercises_exercise_id ON goal_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);

INSERT OR IGNORE INTO goals (name, color, display_order) VALUES
  ('row', 'red', 1),
  ('lat', 'red', 2),
  ('lower', 'red', 3),
  ('side d', 'yellow', 4),
  ('rear d', 'yellow', 5),
  ('quads', 'green', 6),
  ('hamstrings', 'green', 7),
  ('calfs', 'green', 8),
  ('Adductor', 'green', 9),
  ('Chest', 'blue', 10),
  ('Arms', 'blue', 11),
  ('Abs', 'blue', 12);
