import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { getPlannedExercises, savePlannedExercises } from '../planMode';

/**
 * Hook to manage plan mode state with localStorage persistence
 */
export function usePlanMode() {
  const [planMode, setPlanMode] = useState(false);
  const [plannedExercises, setPlannedExercises] = useState<Set<string>>(new Set());

  // Load planned exercises from localStorage on mount and clean up old dates
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const planned = getPlannedExercises();
    const todayOnly = planned.filter(p => p.date === today);

    // Clean up old dates if needed
    if (planned.length !== todayOnly.length) {
      savePlannedExercises(todayOnly);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlannedExercises(new Set(todayOnly.map(p => `${p.exerciseId}-${p.date}`)));
  }, []);

  // Toggle a planned exercise (always uses today's date)
  const togglePlanned = (exerciseId: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${exerciseId}-${today}`;
    const newPlanned = new Set(plannedExercises);

    if (newPlanned.has(key)) {
      newPlanned.delete(key);
    } else {
      newPlanned.add(key);
    }

    setPlannedExercises(newPlanned);

    // Save to localStorage
    const plannedArray = Array.from(newPlanned).map(k => {
      const [id, d] = k.split('-');
      return { exerciseId: parseInt(id), date: d };
    });
    savePlannedExercises(plannedArray);
  };

  return {
    planMode,
    setPlanMode,
    plannedExercises,
    togglePlanned,
  };
}
