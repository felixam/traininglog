'use client';

import { Exercise, Goal, GoalWithLogs } from '@/lib/types';
import { useState, useEffect } from 'react';

interface ManageExercisesLibraryProps {
  onClose: () => void;
  onRefresh: () => void;
}

interface ExerciseWithGoals extends Exercise {
  linkedGoals: Goal[];
}

export default function ManageExercisesLibrary({ onClose, onRefresh }: ManageExercisesLibraryProps) {
  const [exercises, setExercises] = useState<ExerciseWithGoals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      // Fetch exercises
      const exercisesRes = await fetch('/api/exercises');
      const exercisesData = await exercisesRes.json();

      // Fetch all goals to determine which ones are linked to each exercise
      const goalsRes = await fetch('/api/logs?days=1'); // Minimal fetch to get goals with linkedExercises
      const goalsData = await goalsRes.json();
      const goals = (goalsData.exercises || []) as GoalWithLogs[]; // API returns 'exercises' key for backward compat

      // Build exercise -> goals mapping
      const exercisesWithGoals: ExerciseWithGoals[] = exercisesData.map((exercise: Exercise) => {
        const linkedGoals = goals.filter((goal: GoalWithLogs) =>
          goal.linkedExercises?.some((ex: Exercise) => ex.id === exercise.id)
        );
        return {
          ...exercise,
          linkedGoals,
        };
      });

      setExercises(exercisesWithGoals);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExerciseName.trim(),
        }),
      });

      if (response.ok) {
        setNewExerciseName('');
        await fetchExercises();
        onRefresh();
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExercise = async (exercise: ExerciseWithGoals) => {
    // Block deletion if exercise is linked to any goals
    if (exercise.linkedGoals.length > 0) {
      const goalNames = exercise.linkedGoals.map(g => g.name).join(', ');
      alert(`Cannot delete "${exercise.name}" because it is linked to: ${goalNames}\n\nPlease unlink it from these goals first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${exercise.name}"?`)) return;

    try {
      const response = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchExercises();
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const startEditing = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (id: number) => {
    if (!editingName.trim()) {
      cancelEditing();
      return;
    }

    try {
      const response = await fetch(`/api/exercises/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (response.ok) {
        cancelEditing();
        await fetchExercises();
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold">Manage Exercises</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Exercise Form */}
        <div className="p-4 border-b border-gray-800">
          <form onSubmit={handleAddExercise} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Exercise Name</label>
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Bench Press"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                maxLength={50}
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !newExerciseName.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add Exercise'}
            </button>
          </form>
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : (
            <div className="space-y-2">
              {exercises.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No exercises yet</p>
              ) : (
                exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {editingId === exercise.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(exercise.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                          autoFocus
                          maxLength={50}
                        />
                      ) : (
                        <>
                          <span className="text-gray-200 font-medium">{exercise.name}</span>
                          {exercise.linkedGoals.length > 0 && (
                            <span className="text-xs text-gray-500">
                              Linked to: {exercise.linkedGoals.map(g => g.name).join(', ')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {editingId === exercise.id ? (
                        <>
                          {/* Save Button */}
                          <button
                            onClick={() => saveEdit(exercise.id)}
                            className="text-green-400 hover:text-green-300"
                            title="Save"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {/* Cancel Button */}
                          <button
                            onClick={cancelEditing}
                            className="text-gray-400 hover:text-gray-300"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Edit Button */}
                          <button
                            onClick={() => startEditing(exercise.id, exercise.name)}
                            className="text-gray-400 hover:text-gray-300"
                            title="Edit name"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteExercise(exercise)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
