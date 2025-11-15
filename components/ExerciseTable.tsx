import { ExerciseWithLogs } from '@/lib/types';
import ExerciseRow from './ExerciseRow';

interface ExerciseTableProps {
  exercises: ExerciseWithLogs[];
  dates: string[];
  getDayName: (date: string) => string;
  getDayNumber: (date: string) => string;
  onToggle: (exerciseId: number, date: string) => void;
  plannedExercises: Set<string>;
}

export default function ExerciseTable({
  exercises,
  dates,
  getDayName,
  getDayNumber,
  onToggle,
  plannedExercises,
}: ExerciseTableProps) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No exercises yet.</p>
        <p className="text-gray-600 text-sm mt-2">Click the pencil button to add your first exercise.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr>
          <th className="text-left pb-2 pr-2"></th>
          {dates.map((date) => (
            <th key={date} className="text-center pb-2 px-1">
              <div className="text-xs text-gray-500 w-[30px] text-center">{getDayName(date)}</div>
              <div className="text-sm font-semibold text-gray-300 w-[30px] text-center">{getDayNumber(date)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {exercises.map((exercise) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            dates={dates}
            onToggle={onToggle}
            plannedExercises={plannedExercises}
          />
        ))}
      </tbody>
    </table>
  );
}
