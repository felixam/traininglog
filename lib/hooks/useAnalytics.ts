import { useState, useEffect, useCallback } from 'react';
import type {
  CompletionAnalyticsResponse,
  ProgressionAnalyticsResponse,
  HeatmapAnalyticsResponse,
} from '@/lib/types';

export interface AnalyticsFilters {
  startDate: string | null;
  endDate: string;
  goalId?: number;
  exerciseId?: number;
}

interface UseAnalyticsReturn {
  completion: CompletionAnalyticsResponse | null;
  progression: ProgressionAnalyticsResponse | null;
  heatmap: HeatmapAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildQueryString(filters: AnalyticsFilters, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams();

  if (filters.startDate) params.set('start_date', filters.startDate);
  params.set('end_date', filters.endDate);
  if (filters.goalId) params.set('goal_id', String(filters.goalId));
  if (filters.exerciseId) params.set('exercise_id', String(filters.exerciseId));

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      params.set(key, String(value));
    });
  }

  return params.toString();
}

export function useAnalytics(filters: AnalyticsFilters): UseAnalyticsReturn {
  const [completion, setCompletion] = useState<CompletionAnalyticsResponse | null>(null);
  const [progression, setProgression] = useState<ProgressionAnalyticsResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, goalId, exerciseId } = filters;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const currentFilters: AnalyticsFilters = { startDate, endDate, goalId, exerciseId };

    try {
      const [completionRes, progressionRes, heatmapRes] = await Promise.all([
        fetch(`/api/analytics/completion?${buildQueryString(currentFilters)}`),
        fetch(`/api/analytics/progression?${buildQueryString(currentFilters)}`),
        fetch(`/api/analytics/heatmap?${buildQueryString(currentFilters)}`),
      ]);

      if (!completionRes.ok || !progressionRes.ok || !heatmapRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [completionData, progressionData, heatmapData] = await Promise.all([
        completionRes.json(),
        progressionRes.json(),
        heatmapRes.json(),
      ]);

      setCompletion(completionData);
      setProgression(progressionData);
      setHeatmap(heatmapData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, goalId, exerciseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    completion,
    progression,
    heatmap,
    isLoading,
    error,
    refetch: fetchData,
  };
}
