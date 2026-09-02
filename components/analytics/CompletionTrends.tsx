'use client';

import { format, parseISO, getYear } from 'date-fns';
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CompletionAnalyticsResponse } from '@/lib/types';
import StatCard from './StatCard';
import { colorConfig } from '@/lib/colors';

interface CompletionTrendsProps {
  data: CompletionAnalyticsResponse;
}

// Extrapolate next trend value based on existing trend line
function extrapolateTrend(trendValues: number[]): number {
  if (trendValues.length < 2) return trendValues[trendValues.length - 1] || 0;
  const last = trendValues[trendValues.length - 1];
  const secondLast = trendValues[trendValues.length - 2];
  const slope = last - secondLast;
  return Math.max(0, Math.round((last + slope) * 100) / 100);
}

// Calculate linear regression trend line
function calculateTrendLine<T>(data: T[], getValue: (item: T) => number): number[] {
  const n = data.length;
  if (n < 2) return data.map(getValue);

  const values = data.map(getValue);
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((_, i) => Math.max(0, Math.round((slope * i + intercept) * 100) / 100));
}

function formatWeekLabel(dateStr: string, allDates: string[]): string {
  const date = parseISO(dateStr);
  const year = getYear(date);

  // Show year if it's the first entry or year changed from previous
  const idx = allDates.indexOf(dateStr);
  const prevYear = idx > 0 ? getYear(parseISO(allDates[idx - 1])) : null;

  if (idx === 0 || year !== prevYear) {
    return format(date, "MMM d ''yy");
  }
  return format(date, 'MMM d');
}

function formatMonthLabel(monthStr: string, allMonths: string[]): string {
  const date = parseISO(monthStr + '-01');
  const year = getYear(date);

  // Show year if it's the first entry, January, or year changed
  const idx = allMonths.indexOf(monthStr);
  const prevYear = idx > 0 ? getYear(parseISO(allMonths[idx - 1] + '-01')) : null;
  const isJanuary = date.getMonth() === 0;

  if (idx === 0 || isJanuary || year !== prevYear) {
    return format(date, "MMM ''yy");
  }
  return format(date, 'MMM');
}

export default function CompletionTrends({ data }: CompletionTrendsProps) {
  const { summary, byGoal, trends, monthlyDays } = data;

  // Calculate trend lines
  const weeklyTrend = calculateTrendLine(trends, t => t.completions);
  
  // Exclude current incomplete month from trend calculation
  const currentMonth = format(new Date(), 'yyyy-MM');
  const isCurrentMonthIncluded = monthlyDays.length > 0 && 
    monthlyDays[monthlyDays.length - 1].month === currentMonth;
  const completedMonths = isCurrentMonthIncluded ? monthlyDays.slice(0, -1) : monthlyDays;
  const completedMonthsTrend = calculateTrendLine(completedMonths, m => m.trainingDays);
  
  // Extrapolate trend for current month if included (for display continuity)
  const monthlyTrend = isCurrentMonthIncluded && completedMonthsTrend.length > 0
    ? [...completedMonthsTrend, extrapolateTrend(completedMonthsTrend)]
    : completedMonthsTrend;

  // Format week data for chart with year visibility
  const weekDates = trends.map(t => t.date);
  const formattedChartData = trends.map((t, i) => ({
    ...t,
    displayDate: formatWeekLabel(t.date, weekDates),
    trend: weeklyTrend[i],
  }));

  // Format monthly data for chart
  const monthKeys = monthlyDays.map(m => m.month);
  const formattedMonthlyData = monthlyDays.map((m, i) => ({
    ...m,
    displayMonth: formatMonthLabel(m.month, monthKeys),
    trend: monthlyTrend[i],
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Weeks"
          value={`${summary.completionRate}%`}
          subtitle={`${summary.completedDays} of ${summary.totalDays} weeks`}
        />
        <StatCard
          title="Current Streak"
          value={`${summary.currentStreak} weeks`}
        />
        <StatCard
          title="Longest Streak"
          value={`${summary.longestStreak} weeks`}
        />
        <StatCard
          title="Avg per Week"
          value={summary.averagePerDay.toFixed(1)}
          subtitle="completions"
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">Weekly Completions</h3>
        {formattedChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="displayDate"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value: number, name: string) => [value, name === 'trend' ? 'Trend' : 'Completions']}
              />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={formattedChartData.length < 30}
                activeDot={{ r: 6 }}
                name="completions"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#9CA3AF"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="trend"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Monthly Training Days Chart */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">Training Days per Month</h3>
        {formattedMonthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={formattedMonthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="displayMonth"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value: number, name: string) => [value, name === 'trend' ? 'Trend' : 'Training Days']}
              />
              <Bar
                dataKey="trainingDays"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                name="trainingDays"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#9CA3AF"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="trend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Per-Goal Breakdown */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">By Goal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Goal</th>
                <th className="pb-2 pr-4 text-right">Completions</th>
                <th className="pb-2 pr-4 text-right">Weekly Rate</th>
                <th className="pb-2 pr-4 text-right">Streak (wks)</th>
                <th className="pb-2 text-right">Last</th>
              </tr>
            </thead>
            <tbody>
              {byGoal.map(goal => {
                const color = colorConfig[goal.goalColor];
                return (
                  <tr key={goal.goalId} className="border-b border-gray-800 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color?.bgClass || 'bg-gray-500'}`} />
                        <span>{goal.goalName}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right">{goal.totalCompletions}</td>
                    <td className="py-2 pr-4 text-right">{goal.completionRate}%</td>
                    <td className="py-2 pr-4 text-right">{goal.currentStreak} / {goal.longestStreak}</td>
                    <td className="py-2 text-right text-gray-400">
                      {goal.lastCompleted
                        ? format(parseISO(goal.lastCompleted), "MMM d ''yy")
                        : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
