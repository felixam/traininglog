import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  CompletionAnalyticsResponse,
  ProgressionAnalyticsResponse,
  HeatmapAnalyticsResponse,
} from '@/lib/types';

export type AnalyticsTab = 'trends' | 'progression' | 'heatmap';

export interface AnalyticsFilters {
  startDate: string | null;
  endDate: string;
  goalId?: number;
  exerciseId?: number;
  activeTab: AnalyticsTab;
}

interface CachedData {
  filtersKey: string;
  completion: CompletionAnalyticsResponse | null;
  progression: ProgressionAnalyticsResponse | null;
  heatmap: HeatmapAnalyticsResponse | null;
  loadedTabs: Set<AnalyticsTab>;
}

interface UseAnalyticsReturn {
  completion: CompletionAnalyticsResponse | null;
  progression: ProgressionAnalyticsResponse | null;
  heatmap: HeatmapAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildQueryString(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();

  if (filters.startDate) params.set('start_date', filters.startDate);
  params.set('end_date', filters.endDate);
  if (filters.goalId) params.set('goal_id', String(filters.goalId));
  if (filters.exerciseId) params.set('exercise_id', String(filters.exerciseId));

  return params.toString();
}

export function useAnalytics(filters: AnalyticsFilters): UseAnalyticsReturn {
  const [cache, setCache] = useState<CachedData>({
    filtersKey: '',
    completion: null,
    progression: null,
    heatmap: null,
    loadedTabs: new Set(),
  });
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedKeyRef = useRef<string | null>(null);

  const { startDate, endDate, goalId, exerciseId, activeTab } = filters;
  const filtersKey = useMemo(
    () => `${startDate}-${endDate}-${goalId}-${exerciseId}`,
    [startDate, endDate, goalId, exerciseId]
  );

  const requestKey = `${filtersKey}-${activeTab}`;
  const cacheValid = cache.filtersKey === filtersKey && cache.loadedTabs.has(activeTab);

  useEffect(() => {
    if (cacheValid || lastFetchedKeyRef.current === requestKey) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastFetchedKeyRef.current = requestKey;

    const queryString = buildQueryString(filters);
    const endpoints: Record<AnalyticsTab, string> = {
      trends: `/api/analytics/completion?${queryString}`,
      progression: `/api/analytics/progression?${queryString}`,
      heatmap: `/api/analytics/heatmap?${queryString}`,
    };

    fetch(endpoints[activeTab], { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch analytics data');
        return res.json();
      })
      .then((data) => {
        setCache((prev) => {
          const isStale = prev.filtersKey !== filtersKey;
          const newLoadedTabs = isStale ? new Set<AnalyticsTab>() : new Set(prev.loadedTabs);
          newLoadedTabs.add(activeTab);

          return {
            filtersKey,
            completion: activeTab === 'trends' ? data : (isStale ? null : prev.completion),
            progression: activeTab === 'progression' ? data : (isStale ? null : prev.progression),
            heatmap: activeTab === 'heatmap' ? data : (isStale ? null : prev.heatmap),
            loadedTabs: newLoadedTabs,
          };
        });
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      });

    return () => {
      controller.abort();
    };
  }, [cacheValid, requestKey, activeTab, filtersKey, filters]);

  const refetch = useCallback(() => {
    lastFetchedKeyRef.current = null;
    setCache({ filtersKey: '', completion: null, progression: null, heatmap: null, loadedTabs: new Set() });
  }, []);

  const isStale = cache.filtersKey !== filtersKey;
  const isLoading = !cacheValid && !error;

  return {
    completion: isStale ? null : cache.completion,
    progression: isStale ? null : cache.progression,
    heatmap: isStale ? null : cache.heatmap,
    isLoading,
    error,
    refetch,
  };
}
