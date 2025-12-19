'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressionAnalyticsResponse } from '@/lib/types';
import StatCard from './StatCard';

interface WeightProgressionProps {
  data: ProgressionAnalyticsResponse;
  initialExerciseId?: number;
}

type MetricType = 'weight-reps' | '1rm';

// Calculate linear regression trend line
function calculateTrendLine<T>(data: T[], getValue: (item: T) => number | null): (number | null)[] {
  // Filter out null values for regression calculation
  const validPoints: { index: number; value: number }[] = [];
  data.forEach((item, i) => {
    const val = getValue(item);
    if (val !== null) {
      validPoints.push({ index: i, value: val });
    }
  });

  if (validPoints.length < 2) {
    return data.map(getValue);
  }

  const n = validPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const point of validPoints) {
    sumX += point.index;
    sumY += point.value;
    sumXY += point.index * point.value;
    sumX2 += point.index * point.index;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((_, i) => {
    const val = slope * i + intercept;
    return Math.round(val * 10) / 10;
  });
}

export default function WeightProgression({ data, initialExerciseId }: WeightProgressionProps) {
  const { exercises } = data;

  // Use initialExerciseId if provided and valid, otherwise use first exercise
  const getInitialExerciseId = () => {
    if (initialExerciseId && exercises.some(e => e.exerciseId === initialExerciseId)) {
      return initialExerciseId;
    }
    return exercises.length > 0 ? exercises[0].exerciseId : null;
  };

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(getInitialExerciseId);
  const [metric, setMetric] = useState<MetricType>('1rm');

  const selectedExercise = exercises.find(e => e.exerciseId === selectedExerciseId);

  if (exercises.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-700 text-center text-gray-400">
        No exercise data with weight tracking found
      </div>
    );
  }

  const progression = selectedExercise?.progression || [];
  const trendLine = calculateTrendLine(progression, p => p.estimated1RM);

  const chartData = progression.map((p, i) => ({
    ...p,
    displayDate: format(parseISO(p.date), 'MMM d'),
    trend: trendLine[i],
  }));

  const stats = selectedExercise?.stats;

  return (
    <div className="space-y-6">
      {/* Exercise Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedExerciseId || ''}
          onChange={e => setSelectedExerciseId(parseInt(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {exercises.map(ex => (
            <option key={ex.exerciseId} value={ex.exerciseId}>
              {ex.goalNames.length > 0 ? `${ex.goalNames.join(', ')}: ` : ''}{ex.exerciseName} ({ex.totalSessions} sessions)
            </option>
          ))}
        </select>

        {/* Metric Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMetric('weight-reps')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              metric === 'weight-reps'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Weight + Reps
          </button>
          <button
            onClick={() => setMetric('1rm')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              metric === '1rm'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Calculated 1RM
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Max Weight"
            value={stats.maxWeight ? `${stats.maxWeight} kg` : '-'}
            subtitle={stats.maxWeightDate ? format(parseISO(stats.maxWeightDate), 'MMM d, yyyy') : undefined}
          />
          <StatCard
            title="Max 1RM"
            value={stats.max1RM ? `${stats.max1RM} kg` : '-'}
            subtitle={stats.max1RMDate ? format(parseISO(stats.max1RMDate), 'MMM d, yyyy') : undefined}
          />
          <StatCard
            title="Avg Weight"
            value={stats.averageWeight ? `${stats.averageWeight} kg` : '-'}
          />
          <StatCard
            title="Progress"
            value={stats.weightChangePercent !== null ? `${stats.weightChangePercent > 0 ? '+' : ''}${stats.weightChangePercent}%` : '-'}
            subtitle={stats.weightChange !== null ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg` : undefined}
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="displayDate"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                label={{
                  value: metric === 'weight-reps' ? 'Weight (kg) / Reps' : '1RM (kg)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value: number, name: string) => {
                  if (name === 'weight') return [`${value} kg`, 'Weight'];
                  if (name === 'reps') return [value, 'Reps'];
                  if (name === 'estimated1RM') return [`${value} kg`, '1RM'];
                  if (name === 'trend') return [`${value} kg`, 'Trend'];
                  return [value, name];
                }}
              />
              {metric === 'weight-reps' ? (
                <>
                  <Legend
                    wrapperStyle={{ color: '#9CA3AF' }}
                    formatter={value => (value === 'weight' ? 'Weight (kg)' : 'Reps')}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="reps"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="estimated1RM"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    name="estimated1RM"
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    connectNulls
                    name="trend"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-400">
            No data available for this exercise
          </div>
        )}
      </div>

      {/* 1RM Formula Note */}
      {metric === '1rm' && (
        <p className="text-xs text-gray-500">
          Calculated using Epley formula: 1RM = weight × (1 + reps/30)
        </p>
      )}
    </div>
  );
}
