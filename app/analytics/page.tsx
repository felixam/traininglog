'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAnalytics, type AnalyticsTab } from '@/lib/hooks/useAnalytics';
import TabNavigation from '@/components/analytics/TabNavigation';
import DateRangePicker, { type DateRange } from '@/components/analytics/DateRangePicker';
import CompletionTrends from '@/components/analytics/CompletionTrends';
import WeightProgression from '@/components/analytics/WeightProgression';
import ActivityHeatmap from '@/components/analytics/ActivityHeatmap';

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from query params
  const initialExerciseId = searchParams.get('exercise') ? parseInt(searchParams.get('exercise')!) : undefined;
  const urlTab = searchParams.get('tab') as AnalyticsTab | null;

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(urlTab || 'trends');

  const handleTabChange = (tab: AnalyticsTab) => {
    setActiveTab(tab);
    // Clear URL params when user manually switches tabs
    if (urlTab) {
      router.replace('/analytics', { scroll: false });
    }
  };

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null, // All time
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { completion, progression, heatmap, isLoading, error } = useAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    activeTab,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-gray-400">
              {dateRange.startDate
                ? `${format(new Date(dateRange.startDate), 'MMM d, yyyy')} - ${format(new Date(dateRange.endDate), 'MMM d, yyyy')}`
                : 'All time'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TabNavigation activeTab={activeTab} onChange={handleTabChange} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px] text-gray-400">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-red-100">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'trends' && completion && (
              <CompletionTrends data={completion} />
            )}
            {activeTab === 'progression' && progression && (
              <WeightProgression data={progression} initialExerciseId={initialExerciseId} />
            )}
            {activeTab === 'heatmap' && heatmap && (
              <ActivityHeatmap data={heatmap} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
