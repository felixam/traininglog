import { useEffect, useState } from 'react';
import { ExerciseWithLogs } from '../types';
import { sortExercises } from '../exerciseUtils';

/**
 * Hook to manage exercises data fetching and sorting
 */
export function useExercises(visibleDays: number) {
  const [exercises, setExercises] = useState<ExerciseWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByUrgency, setSortByUrgency] = useState(false);

  // Fetch exercises and logs from API
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/logs?days=${visibleDays}`);
      const data = await response.json();
      const sorted = sortExercises(data.exercises || [], sortByUrgency);
      setExercises(sorted);
    } catch (error) {
      console.error('Error fetching data:', error);
      setExercises([]);
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

  // Re-sort exercises when sort mode changes
  useEffect(() => {
    if (exercises.length > 0) {
      setExercises(prev => sortExercises(prev, sortByUrgency));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByUrgency]);

  return {
    exercises,
    isLoading,
    sortByUrgency,
    setSortByUrgency,
    refetch: fetchData,
  };
}
