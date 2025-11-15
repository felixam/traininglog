'use client';

import { Exercise, LogEntry } from '@/lib/types';

interface ExerciseRowProps {
  exercise: Exercise & { logs: Record<string, LogEntry> };
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

      {/* Day cells with weight/reps */}
      {dates.map((date) => {
        const log = exercise.logs[date];
        const isCompleted = log?.completed || false;

        return (
          <td key={date} className="px-1 py-1">
            <button
              onClick={() => onToggle(exercise.id, date)}
              className={`w-full aspect-square rounded-lg transition-all text-[0.6rem] leading-tight flex flex-col items-center justify-center ${isCompleted ? `${colors.active} text-white` : colors.inactive
                }`}
              aria-label={`Log ${exercise.name} for ${date}`}
            >
              {isCompleted ? (
                log?.weight && log?.reps ? (
                  <>
                    <div>{log.weight % 1 === 0 ? Math.floor(log.weight) : log.weight}</div>
                    <div>{log.reps}</div>
                  </>
                ) : log?.weight ? (
                  <div>{log.weight % 1 === 0 ? Math.floor(log.weight) : log.weight}</div>
                ) : log?.reps ? (
                  <div>{log.reps}</div>
                ) : (
                  <div>✓</div>
                )
              ) : null}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
