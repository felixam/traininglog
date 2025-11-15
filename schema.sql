-- Training Log Database Schema
-- Refactored to support Goals (completion targets) and Exercises (specific movements with weight/reps)

-- Goals table: stores completion targets (renamed from exercises)
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'red', -- red, yellow, green, blue
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table: stores specific exercises with weight/reps tracking
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goal-Exercise junction table: links exercises to goals (many-to-many)
CREATE TABLE IF NOT EXISTS goal_exercises (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(goal_id, exercise_id)
);

-- Goal logs table: tracks daily goal completion (renamed from exercise_logs)
CREATE TABLE IF NOT EXISTS goal_logs (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL, -- Which exercise was used (if any)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(goal_id, date)
);

-- Exercise logs table: tracks weight and reps for specific exercises
CREATE TABLE IF NOT EXISTS exercise_logs (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(6, 2), -- Weight in kg (e.g., 82.5)
  reps INTEGER, -- Number of repetitions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exercise_id, date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_goal_logs_date ON goal_logs(date);
CREATE INDEX IF NOT EXISTS idx_goal_logs_goal_id ON goal_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_exercises_goal_id ON goal_exercises(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_exercises_exercise_id ON goal_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);

-- Seed with default goals from HabitKit screenshot
INSERT INTO goals (name, color, display_order) VALUES
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
  ('Abs', 'blue', 12)
ON CONFLICT DO NOTHING;
