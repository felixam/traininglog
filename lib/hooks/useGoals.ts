import { useEffect, useState } from 'react';
import { GoalWithLogs } from '../types';
import { sortGoals } from '../goalUtils';

/**
 * Hook to manage goals data fetching and sorting
 */
export function useGoals(visibleDays: number) {
  const [goals, setGoals] = useState<GoalWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByUrgency, setSortByUrgency] = useState(false);

  // Fetch goals and logs from API
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/logs?days=${visibleDays}`);
      const data = await response.json();
      const sorted = sortGoals(data.exercises || [], sortByUrgency); // API still uses 'exercises' key for compatibility
      setGoals(sorted);
    } catch (error) {
      console.error('Error fetching data:', error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when visibleDays changes
  useEffect(() => {
    if (visibleDays > 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDays]);

  // Re-sort goals when sort mode changes
  useEffect(() => {
    if (goals.length > 0) {
      setGoals(prev => sortGoals(prev, sortByUrgency));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByUrgency]);

  return {
    goals,
    isLoading,
    sortByUrgency,
    setSortByUrgency,
    refetch: fetchData,
  };
}
