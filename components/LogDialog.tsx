'use client';

import { Exercise, GoalLogEntry } from '@/lib/types';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

interface LogDialogProps {
  goalId: number;
  goalName: string;
  date: string;
  linkedExercises: Exercise[];
  existingLog?: GoalLogEntry;
  onSave: (exerciseId?: number, weight?: number, reps?: number) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

interface HistoryData {
  maxWeight: { weight: number; reps: number; date: string } | null;
  lastLog: { weight: number; reps: number; date: string } | null;
}

export default function LogDialog({
  goalId,
  goalName,
  date,
  linkedExercises,
  existingLog,
  onSave,
  onDelete,
  onCancel,
}: LogDialogProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    existingLog?.exercise_id || null
  );
  const [weight, setWeight] = useState<string>(existingLog?.weight?.toString() || '');
  const [reps, setReps] = useState<string>(existingLog?.reps?.toString() || '');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastExerciseFetched, setLastExerciseFetched] = useState(false);

  // Fetch last used exercise for this goal on mount
  useEffect(() => {
    if (!existingLog && linkedExercises.length > 0) {
      const fetchLastExercise = async () => {
        try {
          const response = await fetch(`/api/logs/last-exercise?goal_id=${goalId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.exercise_id) {
              setSelectedExerciseId(data.exercise_id);
            }
          }
        } catch (error) {
          console.error('Error fetching last exercise:', error);
        } finally {
          setLastExerciseFetched(true);
        }
      };
      fetchLastExercise();
    } else {
      setLastExerciseFetched(true);
    }
  }, [goalId, linkedExercises.length, existingLog]);

  // Fetch history when selected exercise changes
  useEffect(() => {
    if (!selectedExerciseId) {
      setIsLoading(false);
      setHistory(null);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/logs/history?exercise_id=${selectedExerciseId}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data);

          // Pre-fill with last log if no existing log
          if (!existingLog && data.lastLog) {
            setWeight(data.lastLog.weight?.toString() || '');
            setReps(data.lastLog.reps?.toString() || '');
          }
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [selectedExerciseId, existingLog]);

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
    await onSave(selectedExerciseId || undefined, weightValue, repsValue);
    setIsSaving(false);
  };

  const handleCompleteDirectly = async () => {
    setIsSaving(true);
    await onSave(undefined, undefined, undefined);
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !isSaving && selectedExerciseId) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 mt-4 sm:mt-0"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl font-bold">{goalName}</h2>
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

        {/* Exercise Selection */}
        {linkedExercises.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Exercise (optional)</label>
            <select
              value={selectedExerciseId || ''}
              onChange={(e) => setSelectedExerciseId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 text-base bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              disabled={isSaving}
            >
              <option value="">-- Complete without exercise --</option>
              {linkedExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* History Info - Only show if exercise selected */}
        {selectedExerciseId && !isLoading && history && (history.maxWeight || history.lastLog) && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-800 rounded-lg text-xs sm:text-sm space-y-1.5 sm:space-y-2">
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

        {/* Input Fields - Only show if exercise selected */}
        {selectedExerciseId && (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 80"
                step="0.5"
                min="0"
                className="w-full px-3 py-2 text-base bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                step="1"
                className="w-full px-3 py-2 text-base bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                disabled={isSaving}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {existingLog && onDelete && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              className="px-3 sm:px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-base"
            >
              Delete
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors text-base"
          >
            Cancel
          </button>
          {selectedExerciseId ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-base"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button
              onClick={handleCompleteDirectly}
              disabled={isSaving}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-base"
            >
              {isSaving ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
