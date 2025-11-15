'use client';

import { Exercise, LogEntry } from '@/lib/types';

interface ExerciseRowProps {
  exercise: Exercise & { logs: Record<string, LogEntry> };
  dates: string[];
  onToggle: (exerciseId: number, date: string) => void;
  plannedExercises?: Set<string>;
}

const colorClasses = {
  red: {
    active: 'bg-red-500',
    inactiveBg: 'bg-red-950/50',
    inactiveBorder: 'border border-red-900/30',
    plannedBorder: 'border-4 border-red-500',
  },
  yellow: {
    active: 'bg-yellow-500',
    inactiveBg: 'bg-yellow-950/50',
    inactiveBorder: 'border border-yellow-900/30',
    plannedBorder: 'border-4 border-yellow-500',
  },
  green: {
    active: 'bg-green-500',
    inactiveBg: 'bg-green-950/50',
    inactiveBorder: 'border border-green-900/30',
    plannedBorder: 'border-4 border-green-500',
  },
  blue: {
    active: 'bg-blue-500',
    inactiveBg: 'bg-blue-950/50',
    inactiveBorder: 'border border-blue-900/30',
    plannedBorder: 'border-4 border-blue-500',
  },
};

export default function ExerciseRow({ exercise, dates, onToggle, plannedExercises }: ExerciseRowProps) {
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
        const isPlanned = plannedExercises?.has(`${exercise.id}-${date}`);

        // Determine cell style based on completed and planned state
        let cellStyle;
        if (isCompleted) {
          // Completed: use active background, optionally with planned border
          cellStyle = isPlanned
            ? `${colors.active} text-white ${colors.plannedBorder}`
            : `${colors.active} text-white`;
        } else {
          // Not completed: use inactive background with appropriate border
          cellStyle = isPlanned
            ? `${colors.inactiveBg} ${colors.plannedBorder}`
            : `${colors.inactiveBg} ${colors.inactiveBorder}`;
        }

        return (
          <td key={date} className="px-1 py-1">
            <button
              onClick={() => onToggle(exercise.id, date)}
              className={`w-full aspect-square rounded-lg transition-all text-[0.6rem] leading-tight flex flex-col items-center justify-center ${cellStyle}`}
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
