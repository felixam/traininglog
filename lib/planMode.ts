export interface PlannedExercise {
  exerciseId: number;
  date: string;
}

const PLAN_MODE_KEY = 'trainingslog_planned';

export function getPlannedExercises(): PlannedExercise[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PLAN_MODE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading planned exercises:', error);
    return [];
  }
}

export function savePlannedExercises(planned: PlannedExercise[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAN_MODE_KEY, JSON.stringify(planned));
  } catch (error) {
    console.error('Error saving planned exercises:', error);
  }
}
