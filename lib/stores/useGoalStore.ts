'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sortGoals } from '../goalUtils';
import { GoalWithLogs } from '../types';

interface GoalStoreState {
  goals: GoalWithLogs[];
  isLoading: boolean;
  error: string | null;
  sortByUrgency: boolean;
  lastFetchedAt?: string;
  lastVisibleDays?: number;
  fetchGoals: (visibleDays: number) => Promise<void>;
  setSortByUrgency: (value: boolean) => void;
}

export const useGoalStore = create<GoalStoreState>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoading: false,
      error: null,
      sortByUrgency: false,
      lastFetchedAt: undefined,
      lastVisibleDays: undefined,
      fetchGoals: async (visibleDays: number) => {
        const { sortByUrgency } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/logs?days=${visibleDays}`);
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const data = await response.json();
          const sorted = sortGoals(data.exercises || [], sortByUrgency);

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
    }),
    {
      name: 'goal-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        goals: state.goals,
        sortByUrgency: state.sortByUrgency,
        lastFetchedAt: state.lastFetchedAt,
        lastVisibleDays: state.lastVisibleDays,
      }),
    }
  )
);

