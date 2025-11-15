export type ExerciseColor = 'red' | 'yellow' | 'green' | 'blue';

export interface Exercise {
  id: number;
  name: string;
  color: ExerciseColor;
  display_order: number;
  created_at: Date;
}

export interface ExerciseLog {
  id: number;
  exercise_id: number;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  weight?: number; // Weight in kg
  reps?: number; // Number of repetitions
  created_at: Date;
  updated_at: Date;
}

export interface LogEntry {
  completed: boolean;
  weight?: number;
  reps?: number;
}

export interface ExerciseWithLogs extends Exercise {
  logs: Record<string, LogEntry>; // date -> log entry mapping
}
