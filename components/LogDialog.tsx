'use client';

import { ExerciseWithHistory, GoalLogEntry, ExerciseHistory } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from './Dialog';

interface LogDialogProps {
  goalName: string;
  date: string;
  linkedExercises: ExerciseWithHistory[];
  lastCompletedExerciseId?: number;
  existingLog?: GoalLogEntry;
  onSave: (exerciseId?: number, weight?: number, reps?: number) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function LogDialog({
  goalName,
  date,
  linkedExercises,
  lastCompletedExerciseId,
  existingLog,
  onSave,
  onDelete,
  onCancel,
}: LogDialogProps) {
  const initialSelectedExerciseId =
    existingLog?.exercise_id ||
    (lastCompletedExerciseId && linkedExercises.some((ex) => ex.id === lastCompletedExerciseId)
      ? lastCompletedExerciseId
      : null);

  const initialHistory =
    (initialSelectedExerciseId && linkedExercises.find((ex) => ex.id === initialSelectedExerciseId)?.history) ||
    null;

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(initialSelectedExerciseId);
  const [weight, setWeight] = useState<string>(
    existingLog?.weight?.toString() || initialHistory?.lastLog?.weight?.toString() || ''
  );
  const [reps, setReps] = useState<string>(
    existingLog?.reps?.toString() || initialHistory?.lastLog?.reps?.toString() || ''
  );
  const history: ExerciseHistory | null =
    selectedExerciseId && linkedExercises.find((ex) => ex.id === selectedExerciseId)?.history
      ? linkedExercises.find((ex) => ex.id === selectedExerciseId)!.history!
      : null;
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

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
    <Dialog onClose={onCancel}>
      <div onKeyDown={handleKeyDown}>
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
            <div className="flex gap-2">
              <select
                value={selectedExerciseId || ''}
                onChange={(e) => {
                  const newId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedExerciseId(newId);

                  if (!existingLog) {
                    const selectedHistory = linkedExercises.find((ex) => ex.id === newId)?.history;
                    if (selectedHistory?.lastLog) {
                      setWeight(selectedHistory.lastLog.weight?.toString() || '');
                      setReps(selectedHistory.lastLog.reps?.toString() || '');
                    } else {
                      setWeight('');
                      setReps('');
                    }
                  }
                }}
                className="flex-1 px-3 py-2 text-base bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={isSaving}
              >
                <option value="">-- Complete without exercise --</option>
                {linkedExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              {selectedExerciseId && (
                <button
                  type="button"
                  onClick={() => router.push(`/analytics?tab=progression&exercise=${selectedExerciseId}`)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 transition-colors"
                  title="View progression"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* History Info - Only show if exercise selected */}
        {selectedExerciseId && history && (history.maxWeight || history.lastLog) && (
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
    </Dialog>
  );
}
