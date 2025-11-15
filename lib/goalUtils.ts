import { GoalWithLogs } from './types';

/**
 * Get the most recent completed date for a goal
 */
export function getLastCompletedDate(goal: GoalWithLogs): string {
  const completedDates = Object.entries(goal.logs)
    .filter(([, log]) => log.completed)
    .map(([date]) => date)
    .sort()
    .reverse();
  return completedDates[0] || ''; // Return empty string if never completed
}

/**
 * Sort goals by their display_order
 */
export function sortByOrder(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Sort goals by urgency (oldest last completed date first)
 * Goals never completed appear at the top
 */
export function sortByUrgency(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => {
    const lastA = getLastCompletedDate(a);
    const lastB = getLastCompletedDate(b);

    // Goals never completed go to the top
    if (!lastA && !lastB) return a.display_order - b.display_order;
    if (!lastA) return -1;
    if (!lastB) return 1;

    // Sort by date (oldest first)
    return lastA.localeCompare(lastB);
  });
}

/**
 * Sort goals based on mode
 */
export function sortGoals(
  goals: GoalWithLogs[],
  byUrgency: boolean
): GoalWithLogs[] {
  return byUrgency ? sortByUrgency(goals) : sortByOrder(goals);
}
