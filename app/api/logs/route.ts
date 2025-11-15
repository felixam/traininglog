import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays } from 'date-fns';

// GET logs for the last 7 days
export async function GET() {
  try {
    // Calculate the date range (last 7 days)
    const today = new Date();
    const startDate = format(subDays(today, 6), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    // Fetch all exercises and their logs for the last 7 days
    const exercisesResult = await query(
      'SELECT * FROM exercises ORDER BY display_order ASC'
    );

    const logsResult = await query(
      `SELECT exercise_id, date, completed
       FROM exercise_logs
       WHERE date >= $1 AND date <= $2`,
      [startDate, endDate]
    );

    // Transform logs into a map for easier lookup
    const logsMap: Record<number, Record<string, boolean>> = {};

    logsResult.rows.forEach((log) => {
      if (!logsMap[log.exercise_id]) {
        logsMap[log.exercise_id] = {};
      }
      // Convert date to string format (YYYY-MM-DD)
      const dateStr = log.date instanceof Date
        ? format(log.date, 'yyyy-MM-dd')
        : log.date;
      logsMap[log.exercise_id][dateStr] = log.completed;
    });

    // Combine exercises with their logs
    const exercisesWithLogs = exercisesResult.rows.map((exercise) => ({
      ...exercise,
      logs: logsMap[exercise.id] || {},
    }));

    return NextResponse.json({
      exercises: exercisesWithLogs,
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
