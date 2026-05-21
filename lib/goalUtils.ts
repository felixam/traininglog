import { GoalWithLogs } from './types';

/**
 * Most recent completion timestamp for a goal.
 * Uses the server-provided global value (which ignores the visibleDays window).
 * Falls back to scanning the visible logs map if the field is missing (e.g.,
 * stale cached state right after deploy).
 */
export function getLastCompletedTimestamp(goal: GoalWithLogs): string {
  if (goal.last_completed_at) return goal.last_completed_at;

  const completedLogs = Object.entries(goal.logs)
    .filter(([, log]) => log.completed)
    .map(([date, log]) => log.updated_at || date)
    .sort()
    .reverse();
  return completedLogs[0] || '';
}

export function sortByOrder(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Sort by urgency: oldest last-completion first, never-completed at the top.
 */
export function sortByUrgency(goals: GoalWithLogs[]): GoalWithLogs[] {
  return [...goals].sort((a, b) => {
    const lastA = getLastCompletedTimestamp(a);
    const lastB = getLastCompletedTimestamp(b);

    if (!lastA && !lastB) return a.display_order - b.display_order;
    if (!lastA) return -1;
    if (!lastB) return 1;

    return lastA.localeCompare(lastB);
  });
}

export function sortGoals(
  goals: GoalWithLogs[],
  byUrgency: boolean
): GoalWithLogs[] {
  return byUrgency ? sortByUrgency(goals) : sortByOrder(goals);
}
