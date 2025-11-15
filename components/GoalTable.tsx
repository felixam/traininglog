import { GoalWithLogs } from '@/lib/types';
import GoalRow from './GoalRow';

interface GoalTableProps {
  goals: GoalWithLogs[];
  dates: string[];
  getDayName: (date: string) => string;
  getDayNumber: (date: string) => string;
  onToggle: (goalId: number, date: string) => void;
  plannedGoals: Set<string>;
}

export default function GoalTable({
  goals,
  dates,
  getDayName,
  getDayNumber,
  onToggle,
  plannedGoals,
}: GoalTableProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No goals yet.</p>
        <p className="text-gray-600 text-sm mt-2">Click the pencil button to add your first goal.</p>
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
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            dates={dates}
            onToggle={onToggle}
            plannedGoals={plannedGoals}
          />
        ))}
      </tbody>
    </table>
  );
}
