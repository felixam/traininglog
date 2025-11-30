'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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

interface ExerciseLogData {
  date: string;
  weight: number;
  reps: number;
}

interface ExerciseInfo {
  id: number;
  name: string;
}

type MetricType = 'weight-reps' | '1rm';

// Epley formula: 1RM = weight × (1 + reps/30)
function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default function ExerciseStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseInfo | null>(null);
  const [logs, setLogs] = useState<ExerciseLogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricType>('weight-reps');

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, exercisesRes] = await Promise.all([
          fetch(`/api/exercises/${id}/stats`),
          fetch('/api/exercises'),
        ]);

        if (!statsRes.ok || !exercisesRes.ok) throw new Error('Failed to fetch');

        const statsData = await statsRes.json();
        const exercisesData = await exercisesRes.json();

        const exerciseInfo = exercisesData.find(
          (e: ExerciseInfo) => e.id === parseInt(id)
        );

        setLogs(statsData.logs);
        setExercise(exerciseInfo || { id: parseInt(id), name: 'Exercise' });
      } catch {
        setError('Failed to load exercise stats');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const chartData = logs.map((log) => ({
    date: log.date,
    displayDate: format(new Date(log.date), 'MMM d'),
    weight: log.weight,
    reps: log.reps,
    oneRM: calculate1RM(log.weight, log.reps),
  }));

  const yAxisLabel = metric === 'weight-reps' ? 'Weight (kg) / Reps' : '1RM (kg)';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{exercise?.name || 'Loading...'}</h1>
            <p className="text-sm text-gray-400">Progression</p>
          </div>
        </div>

        {/* Metric Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMetric('weight-reps')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              metric === 'weight-reps'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Weight + Reps
          </button>
          <button
            onClick={() => setMetric('1rm')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              metric === '1rm'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Calculated 1RM
          </button>
        </div>

        {/* Chart */}
        <div className="bg-gray-900 rounded-lg p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px] text-gray-400">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[400px] text-red-400">
              {error}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-gray-400">
              No data yet
            </div>
          ) : (
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
                    value: yAxisLabel,
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
                    if (name === 'oneRM') return [`${value} kg`, '1RM'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => label}
                />
                {metric === 'weight-reps' ? (
                  <>
                    <Legend
                      wrapperStyle={{ color: '#9CA3AF' }}
                      formatter={(value) => (value === 'weight' ? 'Weight (kg)' : 'Reps')}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="weight"
                    />
                    <Line
                      type="monotone"
                      dataKey="reps"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="reps"
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="oneRM"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="oneRM"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Info about 1RM */}
        {metric === '1rm' && (
          <p className="text-xs text-gray-500 mt-4">
            Calculated using Epley formula: 1RM = weight × (1 + reps/30)
          </p>
        )}
      </div>
    </div>
  );
}
