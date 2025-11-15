'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { LogEntry } from '@/lib/types';

interface LogDialogProps {
  exerciseId: number;
  exerciseName: string;
  date: string;
  existingLog?: LogEntry;
  onSave: (weight?: number, reps?: number) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

interface HistoryData {
  maxWeight: { weight: number; reps: number; date: string } | null;
  lastLog: { weight: number; reps: number; date: string } | null;
}

export default function LogDialog({
  exerciseId,
  exerciseName,
  date,
  existingLog,
  onSave,
  onDelete,
  onCancel,
}: LogDialogProps) {
  const [weight, setWeight] = useState<string>(existingLog?.weight?.toString() || '');
  const [reps, setReps] = useState<string>(existingLog?.reps?.toString() || '');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch history data
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/logs/history?exercise_id=${exerciseId}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data);

          // Pre-fill with max weight if no existing log
          if (!existingLog && data.maxWeight) {
            setWeight(data.maxWeight.weight?.toString() || '');
            setReps(data.maxWeight.reps?.toString() || '');
          }
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [exerciseId, existingLog]);

  const handleUseMax = () => {
    if (history?.maxWeight) {
      setWeight(history.maxWeight.weight?.toString() || '');
      setReps(history.maxWeight.reps?.toString() || '');
    }
  };

  const handleUseLastTime = () => {
    if (history?.lastLog) {
      setWeight(history.lastLog.weight?.toString() || '');
      setReps(history.lastLog.reps?.toString() || '');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const weightValue = weight ? parseFloat(weight) : undefined;
    const repsValue = reps ? parseInt(reps, 10) : undefined;
    await onSave(weightValue, repsValue);
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !isSaving) {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">{exerciseName}</h2>
            <p className="text-sm text-gray-400">{new Date(date + 'T12:00:00').toLocaleDateString()}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-300"
            disabled={isSaving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* History Info */}
        {!isLoading && history && (history.maxWeight || history.lastLog) && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm space-y-2">
            {history.maxWeight && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-gray-400">
                  Max: <span className="text-white font-medium">
                    {history.maxWeight.weight}kg × {history.maxWeight.reps || '?'}
                  </span>
                  <span className="text-gray-500 ml-1">
                    ({format(new Date(history.maxWeight.date), 'MMM d, yyyy')})
                  </span>
                </div>
                <button
                  onClick={handleUseMax}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 whitespace-nowrap"
                  disabled={isSaving}
                >
                  Use max
                </button>
              </div>
            )}
            {history.lastLog && history.lastLog.date !== date && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-gray-400">
                  Last: <span className="text-white font-medium">
                    {history.lastLog.weight || '?'}kg × {history.lastLog.reps || '?'}
                  </span>
                  <span className="text-gray-500 ml-1">
                    ({format(new Date(history.lastLog.date), 'MMM d, yyyy')})
                  </span>
                </div>
                <button
                  onClick={handleUseLastTime}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 whitespace-nowrap"
                  disabled={isSaving}
                >
                  Use last
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 80"
              step="0.5"
              min="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Reps</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="e.g., 10"
              min="0"
              step="1"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {existingLog && onDelete && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
