// Color options for goals
export type GoalColor = 'red' | 'yellow' | 'green' | 'blue' | 'teal' | 'violet' | 'orange';

// Goals (completion targets, formerly called "exercises")
export interface Goal {
  id: number;
  name: string;
  color: GoalColor;
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
  updated_at?: string; // Timestamp for urgency sorting
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

// Analytics types

export interface CompletionSummary {
  totalDays: number;
  completedDays: number;
  totalCompletions: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  averagePerDay: number;
}

export interface GoalCompletionStats {
  goalId: number;
  goalName: string;
  goalColor: GoalColor;
  totalCompletions: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  lastCompleted: string | null;
}

export interface CompletionTrend {
  date: string;
  completions: number;
  goalsCompleted: number[];
}

export interface MonthlyTrainingDays {
  month: string; // YYYY-MM format
  trainingDays: number;
}

export interface CompletionAnalyticsResponse {
  summary: CompletionSummary;
  byGoal: GoalCompletionStats[];
  trends: CompletionTrend[];
  monthlyDays: MonthlyTrainingDays[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface ExerciseProgressionEntry {
  date: string;
  weight: number | null;
  reps: number | null;
  estimated1RM: number | null;
}

export interface ExerciseProgressionStats {
  maxWeight: number | null;
  maxWeightDate: string | null;
  max1RM: number | null;
  max1RMDate: string | null;
  averageWeight: number | null;
  averageReps: number | null;
  weightChange: number | null;
  weightChangePercent: number | null;
}

export interface ExerciseProgression {
  exerciseId: number;
  exerciseName: string;
  goalNames: string[];
  totalSessions: number;
  progression: ExerciseProgressionEntry[];
  stats: ExerciseProgressionStats;
}

export interface ProgressionAnalyticsResponse {
  exercises: ExerciseProgression[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapAnalyticsResponse {
  days: HeatmapDay[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  maxCount: number;
  totalDays: number;
}
