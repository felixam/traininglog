import { ExerciseWithLogs } from './types';

/**
 * Get the most recent completed date for an exercise
 */
export function getLastCompletedDate(exercise: ExerciseWithLogs): string {
  const completedDates = Object.entries(exercise.logs)
    .filter(([, log]) => log.completed)
    .map(([date]) => date)
    .sort()
    .reverse();
  return completedDates[0] || ''; // Return empty string if never completed
}

/**
 * Sort exercises by their display_order
 */
export function sortByOrder(exercises: ExerciseWithLogs[]): ExerciseWithLogs[] {
  return [...exercises].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Sort exercises by urgency (oldest last completed date first)
 * Exercises never completed appear at the top
 */
export function sortByUrgency(exercises: ExerciseWithLogs[]): ExerciseWithLogs[] {
  return [...exercises].sort((a, b) => {
    const lastA = getLastCompletedDate(a);
    const lastB = getLastCompletedDate(b);

    // Exercises never completed go to the top
    if (!lastA && !lastB) return a.display_order - b.display_order;
    if (!lastA) return -1;
    if (!lastB) return 1;

    // Sort by date (oldest first)
    return lastA.localeCompare(lastB);
  });
}

/**
 * Sort exercises based on mode
 */
export function sortExercises(
  exercises: ExerciseWithLogs[],
  byUrgency: boolean
): ExerciseWithLogs[] {
  return byUrgency ? sortByUrgency(exercises) : sortByOrder(exercises);
}
