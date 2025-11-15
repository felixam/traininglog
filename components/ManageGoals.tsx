'use client';

import { Goal, ExerciseColor } from '@/lib/types';
import { useState } from 'react';

interface ManageGoalsProps {
  goals: Goal[];
  onClose: () => void;
  onRefresh: () => void;
  onEditGoal: (goal: Goal) => void;
}

const colorOptions: { value: ExerciseColor; label: string; bgClass: string }[] = [
  { value: 'red', label: 'Red', bgClass: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-500' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-500' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-500' },
];

export default function ManageGoals({ goals, onClose, onRefresh, onEditGoal }: ManageGoalsProps) {
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalColor, setNewGoalColor] = useState<ExerciseColor>('red');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoalName.trim(),
          color: newGoalColor,
        }),
      });

      if (response.ok) {
        setNewGoalName('');
        setNewGoalColor('red');
        onRefresh();
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGoal = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleMoveGoal = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === goals.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentGoal = goals[index];
    const targetGoal = goals[targetIndex];

    try {
      // Swap display_order values
      await Promise.all([
        fetch(`/api/goals/${currentGoal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: targetGoal.display_order }),
        }),
        fetch(`/api/goals/${targetGoal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: currentGoal.display_order }),
        }),
      ]);

      onRefresh();
    } catch (error) {
      console.error('Error reordering goal:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold">Manage Goals</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Goal Form */}
        <div className="p-4 border-b border-gray-800">
          <form onSubmit={handleAddGoal} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Goal Name</label>
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g., Chest"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewGoalColor(color.value)}
                    className={`flex-1 py-2 rounded-lg ${color.bgClass} ${newGoalColor === color.value
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                        : 'opacity-50 hover:opacity-75'
                      }`}
                  >
                    <span className="text-white text-xs font-medium">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding || !newGoalName.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add Goal'}
            </button>
          </form>
        </div>

        {/* Goals List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {goals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No goals yet</p>
            ) : (
              goals.map((goal, index) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex-shrink-0 ${goal.color === 'red'
                          ? 'bg-red-500'
                          : goal.color === 'yellow'
                            ? 'bg-yellow-500'
                            : goal.color === 'green'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                        }`}
                    />
                    <button
                      onClick={() => onEditGoal(goal)}
                      className="text-gray-200 hover:text-white text-left truncate"
                      title="Click to edit"
                    >
                      {goal.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Move Up Button */}
                    <button
                      onClick={() => handleMoveGoal(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    {/* Move Down Button */}
                    <button
                      onClick={() => handleMoveGoal(index, 'down')}
                      disabled={index === goals.length - 1}
                      className="text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteGoal(goal.id, goal.name)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
