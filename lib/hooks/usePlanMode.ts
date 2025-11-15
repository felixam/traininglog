import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { getPlannedGoals, savePlannedGoals } from '../planMode';

/**
 * Hook to manage plan mode state with localStorage persistence
 */
export function usePlanMode() {
  const [planMode, setPlanMode] = useState(false);
  const [plannedGoals, setPlannedGoals] = useState<Set<string>>(new Set());

  // Load planned goals from localStorage on mount and clean up old dates
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const planned = getPlannedGoals();
    const todayOnly = planned.filter(p => p.date === today);

    // Clean up old dates if needed
    if (planned.length !== todayOnly.length) {
      savePlannedGoals(todayOnly);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlannedGoals(new Set(todayOnly.map(p => `${p.goalId}-${p.date}`)));
  }, []);

  // Toggle a planned goal (always uses today's date)
  const togglePlanned = (goalId: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${goalId}-${today}`;
    const newPlanned = new Set(plannedGoals);

    if (newPlanned.has(key)) {
      newPlanned.delete(key);
    } else {
      newPlanned.add(key);
    }

    setPlannedGoals(newPlanned);

    // Save to localStorage
    const plannedArray = Array.from(newPlanned).map(k => {
      const [id, d] = k.split('-');
      return { goalId: parseInt(id), date: d };
    });
    savePlannedGoals(plannedArray);
  };

  return {
    planMode,
    setPlanMode,
    plannedGoals,
    togglePlanned,
  };
}
