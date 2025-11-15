import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays } from 'date-fns';
import { GoalLogEntry, Exercise } from '@/lib/types';

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

    // Transform linked exercises into a map
    const linkedExercisesMap: Record<number, Exercise[]> = {};
    linkedExercisesResult.rows.forEach((row) => {
      if (!linkedExercisesMap[row.goal_id]) {
        linkedExercisesMap[row.goal_id] = [];
      }
      linkedExercisesMap[row.goal_id].push({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
      });
    });

    // Transform logs into a map for easier lookup
    const logsMap: Record<number, Record<string, GoalLogEntry>> = {};

    logsResult.rows.forEach((log) => {
      if (!logsMap[log.goal_id]) {
        logsMap[log.goal_id] = {};
      }
      // Convert date to string format (YYYY-MM-DD)
      const dateStr = log.date instanceof Date
        ? format(log.date, 'yyyy-MM-dd')
        : log.date;
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
      linkedExercises: linkedExercisesMap[goal.id] || [],
    }));

    return NextResponse.json({
      exercises: goalsWithLogs, // Keep old property name for backward compatibility temporarily
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
