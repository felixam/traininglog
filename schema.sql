-- Training Log Database Schema

-- Exercises table: stores custom exercise types
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'red', -- red, yellow, green, blue
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercise logs table: tracks daily completion with weight and reps
CREATE TABLE IF NOT EXISTS exercise_logs (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  weight DECIMAL(6, 2), -- Weight in kg (e.g., 82.5)
  reps INTEGER, -- Number of repetitions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exercise_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);

-- Seed with default exercises from HabitKit screenshot
INSERT INTO exercises (name, color, display_order) VALUES
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
