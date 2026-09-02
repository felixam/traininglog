import type { ExerciseWithHistory } from './types';

/**
 * Optimistic counterpart to the max/last window functions in
 * `app/api/logs/route.ts`, so LogDialog reacts the moment a log is saved.
 * These are approximations; `processQueue` refetches once the write lands and
 * the server's values win.
 */
export function applyHistoryUpdate(
  linkedExercises: ExerciseWithHistory[] | undefined,
  payload: { exerciseId?: number; weight?: number; reps?: number; date: string }
): ExerciseWithHistory[] | undefined {
  return linkedExercises?.map((exercise) => {
    if (exercise.id !== payload.exerciseId || !payload.weight) return exercise;

    const entry = { weight: payload.weight, reps: payload.reps, date: payload.date };

    // Mirrors `ORDER BY weight DESC, reps DESC`: at equal weight, more reps wins.
    const maxWeight = exercise.history?.maxWeight;
    const isNewMax =
      !maxWeight ||
      payload.weight > (maxWeight.weight ?? 0) ||
      (payload.weight === maxWeight.weight && (payload.reps ?? 0) > (maxWeight.reps ?? 0));

    // Mirrors `ORDER BY date DESC`: back-filling an earlier day must not
    // overwrite a more recent last log.
    const lastLog = exercise.history?.lastLog;
    const isNewLast = !lastLog || payload.date >= lastLog.date;

    return {
      ...exercise,
      history: {
        maxWeight: isNewMax ? entry : maxWeight,
        lastLog: isNewLast ? entry : lastLog,
      },
    };
  });
}
