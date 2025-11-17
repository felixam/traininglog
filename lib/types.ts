// Color options for goals
export type ExerciseColor = 'red' | 'yellow' | 'green' | 'blue' | 'teal' | 'violet' | 'orange';

// Goals (completion targets, formerly called "exercises")
export interface Goal {
  id: number;
  name: string;
  color: ExerciseColor;
  display_order: number;
  created_at: Date;
}

export interface GoalLog {
  id: number;
  goal_id: number;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  exercise_id?: number; // Which exercise was used (if any)
  created_at: Date;
  updated_at: Date;
}

export interface GoalLogEntry {
  completed: boolean;
  exercise_id?: number; // Which exercise was used
  weight?: number; // Weight from linked exercise log (denormalized for display)
  reps?: number; // Reps from linked exercise log (denormalized for display)
}

export interface GoalWithLogs extends Goal {
  logs: Record<string, GoalLogEntry>; // date -> log entry mapping
  linkedExercises?: ExerciseWithHistory[]; // Exercises that can be linked to this goal
  lastCompletedExerciseId?: number; // Most recent exercise used to complete this goal
}

// Exercises (specific movements with weight/reps tracking)
export interface Exercise {
  id: number;
  name: string;
  created_at: Date;
}

export interface ExerciseHistoryEntry {
  weight?: number; // Weight in kg
  reps?: number; // Number of repetitions
  date: string; // YYYY-MM-DD format
}

export interface ExerciseHistory {
  maxWeight: ExerciseHistoryEntry | null;
  lastLog: ExerciseHistoryEntry | null;
}

export interface ExerciseWithHistory extends Exercise {
  history?: ExerciseHistory;
}

export interface ExerciseLog {
  id: number;
  exercise_id: number;
  date: string; // YYYY-MM-DD format
  weight?: number; // Weight in kg
  reps?: number; // Number of repetitions
  created_at: Date;
  updated_at: Date;
}

export interface ExerciseLogEntry {
  weight?: number;
  reps?: number;
}
