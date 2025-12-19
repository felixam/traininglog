import { GoalWithLogs } from './types';

/**
 * Get the most recent completion timestamp for a goal
 * Returns ISO timestamp string for precise sorting, falls back to date if no timestamp
 */
export function getLastCompletedTimestamp(goal: GoalWithLogs): string {
  const completedLogs = Object.entries(goal.logs)
    .filter(([, log]) => log.completed)
    .map(([date, log]) => log.updated_at || date)
    .sort()
    .reverse();
  return completedLogs[0] || '';
}

/**
 * Sort goals by their display_order
 */
export function sortByOrder(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Sort goals by urgency (oldest last completed timestamp first)
 * Goals never completed appear at the top
 */
export function sortByUrgency(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => {
    const lastA = getLastCompletedTimestamp(a);
    const lastB = getLastCompletedTimestamp(b);

    // Goals never completed go to the top
    if (!lastA && !lastB) return a.display_order - b.display_order;
    if (!lastA) return -1;
    if (!lastB) return 1;

    // Sort by timestamp (oldest first)
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
