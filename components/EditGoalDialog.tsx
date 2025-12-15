'use client';

import { Goal, Exercise, GoalColor } from '@/lib/types';
import { colorOptions } from '@/lib/colors';
import { useState, useEffect } from 'react';
import Dialog from './Dialog';

interface EditGoalDialogProps {
  goal: Goal;
  onClose: () => void;
  onSave: () => void;
}

export default function EditGoalDialog({ goal, onClose, onSave }: EditGoalDialogProps) {
  const [name, setName] = useState(goal.name);
  const [color, setColor] = useState<GoalColor>(goal.color);
  const [linkedExercises, setLinkedExercises] = useState<Exercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch linked exercises for this goal
        const linkedRes = await fetch(`/api/goals/${goal.id}/exercises`);
        const linkedData = await linkedRes.json();
        setLinkedExercises(linkedData);

        // Fetch all available exercises
        const allRes = await fetch('/api/exercises');
        const allData = await allRes.json();
        setAvailableExercises(allData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [goal.id]);

  const refetchData = async () => {
    try {
      // Fetch linked exercises for this goal
      const linkedRes = await fetch(`/api/goals/${goal.id}/exercises`);
      const linkedData = await linkedRes.json();
      setLinkedExercises(linkedData);

      // Fetch all available exercises
      const allRes = await fetch('/api/exercises');
      const allData = await allRes.json();
      setAvailableExercises(allData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddExercise = async () => {
    if (!selectedExerciseId) return;

    try {
      const response = await fetch(`/api/goals/${goal.id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_id: parseInt(selectedExerciseId) }),
      });

      if (response.ok) {
        setSelectedExerciseId('');
        await refetchData();
      }
    } catch (error) {
      console.error('Error linking exercise:', error);
    }
  };

  const handleRemoveExercise = async (exerciseId: number) => {
    try {
      const response = await fetch(`/api/goals/${goal.id}/exercises/${exerciseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refetchData();
      }
    } catch (error) {
      console.error('Error unlinking exercise:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Update goal name and color
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter out already linked exercises from the dropdown
  const unlinkedExercises = availableExercises.filter(
    ex => !linkedExercises.some(linked => linked.id === ex.id)
  );

  return (
    <Dialog onClose={onClose} maxHeight="80vh" noPadding={true}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold">Edit Goal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : (
            <>
              {/* Goal Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Chest"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  maxLength={50}
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color</label>
                <div className="flex gap-2">
                  {colorOptions.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => setColor(colorOption.value)}
                      className={`flex-1 py-2 rounded-lg ${colorOption.bgClass} ${
                        color === colorOption.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                          : 'opacity-50 hover:opacity-75'
                      }`}
                    >
                      <span className="text-white text-xs font-medium">{colorOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked Exercises Section */}
              <div className="border-t border-gray-800 pt-4">
                <label className="block text-sm text-gray-400 mb-2">Linked Exercises</label>

                {/* Add Exercise */}
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    disabled={unlinkedExercises.length === 0}
                  >
                    <option value="">
                      {unlinkedExercises.length === 0 ? 'No exercises available' : 'Select an exercise...'}
                    </option>
                    {unlinkedExercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddExercise}
                    disabled={!selectedExerciseId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Linked Exercises List */}
                <div className="space-y-2">
                  {linkedExercises.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No exercises linked yet</p>
                  ) : (
                    linkedExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
                      >
                        <span className="text-gray-200">{exercise.name}</span>
                        <button
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
    </Dialog>
  );
}
