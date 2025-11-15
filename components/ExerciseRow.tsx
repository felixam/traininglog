'use client';

import { Exercise } from '@/lib/types';

interface ExerciseRowProps {
  exercise: Exercise & { logs: Record<string, boolean> };
  dates: string[];
  onToggle: (exerciseId: number, date: string) => void;
}

const colorClasses = {
  red: {
    active: 'bg-red-500',
    inactive: 'bg-red-950/50 border border-red-900/30',
  },
  yellow: {
    active: 'bg-yellow-500',
    inactive: 'bg-yellow-950/50 border border-yellow-900/30',
  },
  green: {
    active: 'bg-green-500',
    inactive: 'bg-green-950/50 border border-green-900/30',
  },
  blue: {
    active: 'bg-blue-500',
    inactive: 'bg-blue-950/50 border border-blue-900/30',
  },
};

export default function ExerciseRow({ exercise, dates, onToggle }: ExerciseRowProps) {
  const colors = colorClasses[exercise.color] || colorClasses.red;

  return (
    <tr>
      {/* Exercise name */}
      <td className="text-sm text-gray-300 font-medium pr-2 py-1">
        <div className="truncate">{exercise.name}</div>
      </td>

      {/* Day checkboxes */}
      {dates.map((date) => {
        const isCompleted = exercise.logs[date] || false;
        return (
          <td key={date} className="px-1 py-1">
            <button
              onClick={() => onToggle(exercise.id, date)}
              className={`w-full aspect-square rounded-lg transition-all ${isCompleted ? colors.active : colors.inactive
                }`}
              aria-label={`Toggle ${exercise.name} for ${date}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
