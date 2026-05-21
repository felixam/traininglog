import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays } from 'date-fns';
import { GoalLogEntry, ExerciseWithHistory, ExerciseHistory } from '@/lib/types';

// GET logs for the last N days (default 7)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? Math.max(1, Math.min(30, parseInt(daysParam))) : 7;

    const today = new Date();
    const startDate = format(subDays(today, days - 1), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    const goalsResult = await query(
      'SELECT * FROM goals ORDER BY display_order ASC'
    );

    const logsResult = await query(
      `SELECT
         gl.goal_id,
         gl.date,
         gl.completed,
         gl.exercise_id,
         gl.updated_at,
         el.weight,
         el.reps
       FROM goal_logs gl
       LEFT JOIN exercise_logs el ON gl.exercise_id = el.exercise_id AND gl.date = el.date
       WHERE gl.date >= $1 AND gl.date <= $2`,
      [startDate, endDate]
    );

    const linkedExercisesResult = await query(
      `SELECT ge.goal_id, e.id, e.name, e.created_at
       FROM goal_exercises ge
       INNER JOIN exercises e ON ge.exercise_id = e.id
       ORDER BY e.name ASC`
    );

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

    // Last completed exercise per goal: pick the row with the latest date in each goal_id group.
    const lastExerciseResult = await query(
      `SELECT goal_id, exercise_id
       FROM (
         SELECT goal_id, exercise_id,
                ROW_NUMBER() OVER (PARTITION BY goal_id ORDER BY date DESC) AS rn
         FROM goal_logs
         WHERE exercise_id IS NOT NULL
       )
       WHERE rn = 1`
    );

    const lastExerciseMap: Record<number, number> = {};
    lastExerciseResult.rows.forEach((row) => {
      lastExerciseMap[Number(row.goal_id)] = Number(row.exercise_id);
    });

    // Global most-recent completion timestamp per goal (ignores the visibleDays
    // window), so urgency-sort works even when the latest completion fell off
    // the visible page. Composite key = workout date + time-of-day from updated_at
    // so the workout's *actual* day drives the order, with same-day tie-breaking
    // by when the row was written.
    const lastCompletedResult = await query(
      `SELECT goal_id, MAX(date || ' ' || substr(updated_at, 12)) AS last_completed_at
       FROM goal_logs
       WHERE completed = 1
       GROUP BY goal_id`
    );

    const lastCompletedMap: Record<number, string> = {};
    lastCompletedResult.rows.forEach((row) => {
      lastCompletedMap[Number(row.goal_id)] = row.last_completed_at as string;
    });

    const exerciseHistories: Record<number, ExerciseHistory> = {};
    if (exerciseIds.size > 0) {
      const exerciseIdArray = Array.from(exerciseIds);
      const placeholders = exerciseIdArray.map(() => '?').join(', ');

      // Max-weight entry per exercise (window function, since SQLite has no DISTINCT ON).
      const maxWeightResult = await query(
        `SELECT exercise_id, weight, reps, date
         FROM (
           SELECT exercise_id, weight, reps, date,
                  ROW_NUMBER() OVER (
                    PARTITION BY exercise_id
                    ORDER BY weight DESC, date DESC
                  ) AS rn
           FROM exercise_logs
           WHERE exercise_id IN (${placeholders}) AND weight IS NOT NULL
         )
         WHERE rn = 1`,
        exerciseIdArray
      );

      const lastLogResult = await query(
        `SELECT exercise_id, weight, reps, date
         FROM (
           SELECT exercise_id, weight, reps, date,
                  ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY date DESC) AS rn
           FROM exercise_logs
           WHERE exercise_id IN (${placeholders})
         )
         WHERE rn = 1`,
        exerciseIdArray
      );

      maxWeightResult.rows.forEach((row) => {
        const exerciseId = Number(row.exercise_id);
        exerciseHistories[exerciseId] = {
          ...(exerciseHistories[exerciseId] || { maxWeight: null, lastLog: null }),
          maxWeight: {
            weight: row.weight,
            reps: row.reps,
            date: row.date,
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
            date: row.date,
          },
        };
      });

      exerciseIdArray.forEach((id) => {
        if (!exerciseHistories[id]) {
          exerciseHistories[id] = { maxWeight: null, lastLog: null };
        }
      });
    }

    const logsMap: Record<number, Record<string, GoalLogEntry>> = {};

    logsResult.rows.forEach((log) => {
      if (!logsMap[log.goal_id]) {
        logsMap[log.goal_id] = {};
      }
      logsMap[log.goal_id][log.date] = {
        completed: Boolean(log.completed),
        exercise_id: log.exercise_id ?? undefined,
        weight: log.weight ?? undefined,
        reps: log.reps ?? undefined,
        updated_at: log.updated_at ?? undefined,
      };
    });

    const goalsWithLogs = goalsResult.rows.map((goal) => ({
      ...goal,
      logs: logsMap[goal.id] || {},
      linkedExercises: (linkedExercisesMap[goal.id] || []).map((exercise) => ({
        ...exercise,
        history: exerciseHistories[exercise.id] || { maxWeight: null, lastLog: null },
      })),
      lastCompletedExerciseId: lastExerciseMap[goal.id],
      last_completed_at: lastCompletedMap[goal.id],
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
