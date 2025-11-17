import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/useGoalStore';

/**
 * Hook to manage goals data fetching and sorting
 */
export function useGoals(visibleDays: number) {
  // Select individually to avoid returning a new object each read (which breaks getServerSnapshot caching)
  const goals = useGoalStore((state) => state.goals);
  const isLoading = useGoalStore((state) => state.isLoading);
  const sortByUrgency = useGoalStore((state) => state.sortByUrgency);
  const setSortByUrgency = useGoalStore((state) => state.setSortByUrgency);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);
  const lastVisibleDays = useGoalStore((state) => state.lastVisibleDays);
  const lastFetchedAt = useGoalStore((state) => state.lastFetchedAt);
  const error = useGoalStore((state) => state.error);
  const optimisticUpsertLog = useGoalStore((state) => state.optimisticUpsertLog);
  const optimisticDeleteLog = useGoalStore((state) => state.optimisticDeleteLog);
  const processQueue = useGoalStore((state) => state.processQueue);

  // Fetch data when visibleDays changes
  useEffect(() => {
    if (visibleDays > 0) {
      fetchGoals(visibleDays);
    }
  }, [fetchGoals, visibleDays]);

  // Try to flush any queued mutations on mount and when coming back online
  useEffect(() => {
    processQueue();
    const onOnline = () => processQueue();

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [processQueue]);

  const isStaleForVisibleDays = useMemo(
    () => lastVisibleDays !== undefined && lastVisibleDays !== visibleDays,
    [lastVisibleDays, visibleDays]
  );

  return {
    goals,
    isLoading,
    sortByUrgency,
    setSortByUrgency,
    refetch: () => fetchGoals(visibleDays),
    lastFetchedAt,
    error,
    isStaleForVisibleDays,
    optimisticUpsertLog,
    optimisticDeleteLog,
  };
}
