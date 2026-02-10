'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sortGoals } from '../goalUtils';
import { GoalLogEntry, GoalWithLogs } from '../types';

type LogMutationPayload = {
  goalId: number;
  date: string;
  exerciseId?: number;
  weight?: number;
  reps?: number;
};

type PendingLogMutation =
  | { id: string; type: 'upsert'; payload: LogMutationPayload }
  | { id: string; type: 'delete'; payload: { goalId: number; date: string } };

interface GoalStoreState {
  goals: GoalWithLogs[];
  isLoading: boolean;
  error: string | null;
  sortByUrgency: boolean;
  lastFetchedAt?: string;
  lastVisibleDays?: number;
  pendingLogMutations: PendingLogMutation[];
  isProcessingQueue: boolean;
  fetchGoals: (visibleDays: number) => Promise<void>;
  setSortByUrgency: (value: boolean) => void;
  optimisticUpsertLog: (payload: LogMutationPayload) => void;
  optimisticDeleteLog: (goalId: number, date: string) => void;
  processQueue: () => Promise<void>;
}

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const applyLogUpdate = (goals: GoalWithLogs[], payload: LogMutationPayload): GoalWithLogs[] =>
  goals.map((goal) => {
    if (goal.id !== payload.goalId) return goal;

    const nextLog: GoalLogEntry = {
      completed: true,
      exercise_id: payload.exerciseId,
      weight: payload.weight,
      reps: payload.reps,
    };

    // Update linkedExercises history if this log sets a new max weight
    const updatedLinkedExercises = goal.linkedExercises?.map((exercise) => {
      if (exercise.id !== payload.exerciseId || !payload.weight) return exercise;

      const currentMax = exercise.history?.maxWeight?.weight ?? 0;
      if (payload.weight > currentMax) {
        return {
          ...exercise,
          history: {
            ...exercise.history,
            maxWeight: {
              weight: payload.weight,
              reps: payload.reps,
              date: payload.date,
            },
            lastLog: {
              weight: payload.weight,
              reps: payload.reps,
              date: payload.date,
            },
          },
        };
      }

      // Update lastLog even if not a new max
      return {
        ...exercise,
        history: {
          ...exercise.history,
          maxWeight: exercise.history?.maxWeight ?? null,
          lastLog: {
            weight: payload.weight,
            reps: payload.reps,
            date: payload.date,
          },
        },
      };
    });

    return {
      ...goal,
      logs: {
        ...goal.logs,
        [payload.date]: nextLog,
      },
      linkedExercises: updatedLinkedExercises,
      lastCompletedExerciseId: payload.exerciseId || goal.lastCompletedExerciseId,
    };
  });

const applyLogDeletion = (goals: GoalWithLogs[], goalId: number, date: string): GoalWithLogs[] =>
  goals.map((goal) => {
    if (goal.id !== goalId) return goal;

    const rest = { ...goal.logs };
    delete rest[date];
    return {
      ...goal,
      logs: rest,
    };
  });

const applyPendingMutations = (goals: GoalWithLogs[], mutations: PendingLogMutation[]) =>
  mutations.reduce((currentGoals, mutation) => {
    if (mutation.type === 'upsert') {
      return applyLogUpdate(currentGoals, mutation.payload);
    }

    return applyLogDeletion(currentGoals, mutation.payload.goalId, mutation.payload.date);
  }, goals);

export const useGoalStore = create<GoalStoreState>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoading: false,
      error: null,
      sortByUrgency: false,
      lastFetchedAt: undefined,
      lastVisibleDays: undefined,
      pendingLogMutations: [],
      isProcessingQueue: false,
      fetchGoals: async (visibleDays: number) => {
        const { sortByUrgency, pendingLogMutations } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/logs?days=${visibleDays}`);
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const data = await response.json();
          const goalsFromApi = data.goals || [];
          const withPending = applyPendingMutations(goalsFromApi, pendingLogMutations);
          const sorted = sortGoals(withPending, sortByUrgency);

          set({
            goals: sorted,
            lastFetchedAt: new Date().toISOString(),
            lastVisibleDays: visibleDays,
            error: null,
          });
        } catch (error) {
          console.error('Error fetching goals:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch goals',
          });
        } finally {
          set({ isLoading: false });
        }
      },
      setSortByUrgency: (value: boolean) =>
        set((state) => ({
          sortByUrgency: value,
          goals: sortGoals(state.goals, value),
        })),
      optimisticUpsertLog: (payload: LogMutationPayload) => {
        const { sortByUrgency } = get();
        const mutation: PendingLogMutation = { id: generateId(), type: 'upsert', payload };

        set((state) => ({
          goals: sortGoals(applyLogUpdate(state.goals, payload), sortByUrgency),
          pendingLogMutations: [...state.pendingLogMutations, mutation],
        }));

        void get().processQueue();
      },
      optimisticDeleteLog: (goalId: number, date: string) => {
        const { sortByUrgency } = get();
        const mutation: PendingLogMutation = {
          id: generateId(),
          type: 'delete',
          payload: { goalId, date },
        };

        set((state) => ({
          goals: sortGoals(applyLogDeletion(state.goals, goalId, date), sortByUrgency),
          pendingLogMutations: [...state.pendingLogMutations, mutation],
        }));

        void get().processQueue();
      },
      processQueue: async () => {
        if (get().isProcessingQueue || get().pendingLogMutations.length === 0) return;

        set({ isProcessingQueue: true });

        try {
          while (get().pendingLogMutations.length > 0) {
            const next = get().pendingLogMutations[0];
            let response: Response;

            if (next.type === 'upsert') {
              const { goalId, date, exerciseId, weight, reps } = next.payload;
              response = await fetch('/api/logs/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  goal_id: goalId,
                  date,
                  exercise_id: exerciseId,
                  weight,
                  reps,
                }),
              });
            } else {
              const { goalId, date } = next.payload;
              response = await fetch(`/api/logs/toggle?goal_id=${goalId}&date=${date}`, {
                method: 'DELETE',
              });
            }

            if (!response.ok) {
              break;
            }

            set((state) => ({
              pendingLogMutations: state.pendingLogMutations.filter((mutation) => mutation.id !== next.id),
            }));
          }
        } catch (error) {
          console.error('Error processing log queue:', error);
        } finally {
          set({ isProcessingQueue: false });
        }
      },
    }),
    {
      name: 'goal-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        goals: state.goals,
        sortByUrgency: state.sortByUrgency,
        lastFetchedAt: state.lastFetchedAt,
        lastVisibleDays: state.lastVisibleDays,
        pendingLogMutations: state.pendingLogMutations,
      }),
    }
  )
);
