import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays } from 'date-fns';
import { GoalLogEntry, ExerciseWithHistory, ExerciseHistory } from '@/lib/types';

const toDateString = (date: unknown) =>
  date instanceof Date ? format(date, 'yyyy-MM-dd') : (date as string);

// GET logs for the last N days (default 7)
export async function GET(request: Request) {
  try {
    // Get days parameter from query string
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? Math.max(1, Math.min(30, parseInt(daysParam))) : 7;

    // Calculate the date range
    const today = new Date();
    const startDate = format(subDays(today, days - 1), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    // Fetch all goals
    const goalsResult = await query(
      'SELECT * FROM goals ORDER BY display_order ASC'
    );

    // Fetch goal logs for the date range, including weight/reps from exercise_logs if available
    const logsResult = await query(
      `SELECT
         gl.goal_id,
         gl.date,
         gl.completed,
         gl.exercise_id,
         el.weight,
         el.reps
       FROM goal_logs gl
       LEFT JOIN exercise_logs el ON gl.exercise_id = el.exercise_id AND gl.date = el.date
       WHERE gl.date >= $1 AND gl.date <= $2`,
      [startDate, endDate]
    );

    // Fetch linked exercises for each goal
    const linkedExercisesResult = await query(
      `SELECT ge.goal_id, e.id, e.name, e.created_at
       FROM goal_exercises ge
       INNER JOIN exercises e ON ge.exercise_id = e.id
       ORDER BY e.name ASC`
    );

    // Transform linked exercises into a map and gather exercise ids
    const linkedExercisesMap: Record<number, ExerciseWithHistory[]> = {};
    const exerciseIds = new Set<number>();
    linkedExercisesResult.rows.forEach((row) => {
      if (!linkedExercisesMap[row.goal_id]) {
        linkedExercisesMap[row.goal_id] = [];
      }
      const exerciseId = Number(row.id);
      linkedExercisesMap[row.goal_id].push({
        id: exerciseId,
        name: row.name,
        created_at: row.created_at,
      });
      exerciseIds.add(exerciseId);
    });

    // Fetch last completed exercise per goal
    const lastExerciseResult = await query(
      `SELECT DISTINCT ON (goal_id) goal_id, exercise_id
       FROM goal_logs
       WHERE exercise_id IS NOT NULL
       ORDER BY goal_id, date DESC`
    );

    const lastExerciseMap: Record<number, number> = {};
    lastExerciseResult.rows.forEach((row) => {
      lastExerciseMap[Number(row.goal_id)] = Number(row.exercise_id);
    });

    // Fetch histories for all linked exercises so the client does not need to request per exercise
    const exerciseHistories: Record<number, ExerciseHistory> = {};
    if (exerciseIds.size > 0) {
      const exerciseIdArray = Array.from(exerciseIds);

      const maxWeightResult = await query(
        `SELECT DISTINCT ON (exercise_id) exercise_id, weight, reps, date
         FROM exercise_logs
         WHERE exercise_id = ANY($1::int[]) AND weight IS NOT NULL
         ORDER BY exercise_id, weight DESC, date DESC`,
        [exerciseIdArray]
      );

      const lastLogResult = await query(
        `SELECT DISTINCT ON (exercise_id) exercise_id, weight, reps, date
         FROM exercise_logs
         WHERE exercise_id = ANY($1::int[])
         ORDER BY exercise_id, date DESC`,
        [exerciseIdArray]
      );

      maxWeightResult.rows.forEach((row) => {
        const exerciseId = Number(row.exercise_id);
        exerciseHistories[exerciseId] = {
          ...(exerciseHistories[exerciseId] || { maxWeight: null, lastLog: null }),
          maxWeight: {
            weight: row.weight,
            reps: row.reps,
            date: toDateString(row.date),
          },
        };
      });

      lastLogResult.rows.forEach((row) => {
        const exerciseId = Number(row.exercise_id);
        exerciseHistories[exerciseId] = {
          ...(exerciseHistories[exerciseId] || { maxWeight: null, lastLog: null }),
          lastLog: {
            weight: row.weight,
            reps: row.reps,
            date: toDateString(row.date),
          },
        };
      });

      // Ensure every linked exercise has a history object, even if empty
      exerciseIdArray.forEach((id) => {
        if (!exerciseHistories[id]) {
          exerciseHistories[id] = { maxWeight: null, lastLog: null };
        }
      });
    }

    // Transform logs into a map for easier lookup
    const logsMap: Record<number, Record<string, GoalLogEntry>> = {};

    logsResult.rows.forEach((log) => {
      if (!logsMap[log.goal_id]) {
        logsMap[log.goal_id] = {};
      }
      // Convert date to string format (YYYY-MM-DD)
      const dateStr = toDateString(log.date);
      logsMap[log.goal_id][dateStr] = {
        completed: log.completed,
        exercise_id: log.exercise_id,
        weight: log.weight,
        reps: log.reps,
      };
    });

    // Combine goals with their logs and linked exercises
    const goalsWithLogs = goalsResult.rows.map((goal) => ({
      ...goal,
      logs: logsMap[goal.id] || {},
      linkedExercises: (linkedExercisesMap[goal.id] || []).map((exercise) => ({
        ...exercise,
        history: exerciseHistories[exercise.id] || { maxWeight: null, lastLog: null },
      })),
      lastCompletedExerciseId: lastExerciseMap[goal.id],
    }));

    return NextResponse.json({
      goals: goalsWithLogs,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
