'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sortGoals } from '../goalUtils';
import { classifyQueueResponse } from '../queueResult';
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
  clearLocalData: () => void;
}

// An expired/invalid session surfaces as a 401 from the API. Bounce to login.
const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const applyLogUpdate = (goals: GoalWithLogs[], payload: LogMutationPayload): GoalWithLogs[] =>
  goals.map((goal) => {
    if (goal.id !== payload.goalId) return goal;

    // Composite urgency key = workout date + current time-of-day. Must match the
    // server's `date || ' ' || substr(updated_at, 12)` shape so optimistic and
    // refetched values sort against each other consistently.
    const nowIso = new Date().toISOString();
    const compositeKey = `${payload.date} ${nowIso.substring(11)}`;

    const nextLog: GoalLogEntry = {
      completed: true,
      exercise_id: payload.exerciseId,
      weight: payload.weight,
      reps: payload.reps,
      updated_at: nowIso,
    };

    const prev = goal.last_completed_at;
    const nextLastCompletedAt = prev && prev > compositeKey ? prev : compositeKey;

    return {
      ...goal,
      logs: {
        ...goal.logs,
        [payload.date]: nextLog,
      },
      lastCompletedExerciseId: payload.exerciseId || goal.lastCompletedExerciseId,
      last_completed_at: nextLastCompletedAt,
    };
  });

// Extract time-of-day from an updated_at string in either format:
// SQL "YYYY-MM-DD HH:MM:SS.SSS" or ISO "YYYY-MM-DDTHH:MM:SS.sssZ".
const timeOfDay = (ts: string | undefined): string => {
  if (!ts) return '';
  const sep = Math.max(ts.indexOf('T'), ts.indexOf(' '));
  return sep >= 0 ? ts.substring(sep + 1) : '';
};

const applyLogDeletion = (goals: GoalWithLogs[], goalId: number, date: string): GoalWithLogs[] =>
  goals.map((goal) => {
    if (goal.id !== goalId) return goal;

    const rest = { ...goal.logs };
    delete rest[date];

    // Recompute last_completed_at from the visible window using the same
    // composite shape the server emits. Older logs outside the window are
    // invisible here; the next /api/logs refetch corrects any drift.
    const remainingComposites = Object.entries(rest)
      .filter(([, log]) => log.completed)
      .map(([d, log]) => {
        const t = timeOfDay(log.updated_at);
        return t ? `${d} ${t}` : d;
      });
    const newest = remainingComposites.sort().reverse()[0];

    return {
      ...goal,
      logs: rest,
      last_completed_at: newest,
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
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
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
        // Exercise history (max weight / last log) is computed server-side and
        // embedded in the /api/logs payload, so it only refreshes on a fetch.
        // Without one, "max" and "last" keep showing pre-sync values.
        let queueChanged = false;

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

            const result = classifyQueueResponse(response.status);

            if (result === 'auth') {
              redirectToLogin();
              break;
            }

            // 'retry' is transient — leave it at the head and try again later.
            if (result === 'retry') {
              break;
            }

            // 'drop' means the server will never accept it (most often a goal
            // belonging to another user). Discarding it is what keeps one bad
            // mutation from blocking everything queued behind it.
            if (result === 'drop') {
              console.warn(`Discarding rejected log mutation (${response.status}):`, next);
            }

            queueChanged = true;
            set((state) => ({
              pendingLogMutations: state.pendingLogMutations.filter((mutation) => mutation.id !== next.id),
            }));
          }
        } catch (error) {
          console.error('Error processing log queue:', error);
        } finally {
          set({ isProcessingQueue: false });
        }

        const visibleDays = get().lastVisibleDays;
        if (queueChanged && visibleDays) {
          await get().fetchGoals(visibleDays);
        }
      },
      // Called on logout: the cache and the queue belong to the user who is
      // leaving, and firing their mutations at the next session's account is
      // how logs end up rejected as "not found".
      clearLocalData: () =>
        set({
          goals: [],
          pendingLogMutations: [],
          lastFetchedAt: undefined,
          lastVisibleDays: undefined,
          error: null,
        }),
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
