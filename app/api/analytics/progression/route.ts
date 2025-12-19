import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format } from 'date-fns';
import type { ProgressionAnalyticsResponse, ExerciseProgression, ExerciseProgressionEntry } from '@/lib/types';

interface ExerciseRow {
  id: number;
  name: string;
}

interface LogRow {
  exercise_id: number;
  date: string;
  weight: number | null;
  reps: number | null;
}

// Epley formula: 1RM = weight × (1 + reps/30)
function calculate1RM(weight: number | null, reps: number | null): number | null {
  if (!weight || weight <= 0) return null;
  if (!reps || reps <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date') || format(new Date(), 'yyyy-MM-dd');
    const exerciseId = searchParams.get('exercise_id');

    // Get date range - if no start date, get earliest log date
    let effectiveStartDate: string = startDate || endDate;
    if (!startDate) {
      const earliestResult = await query(
        'SELECT MIN(date)::text as min_date FROM exercise_logs WHERE weight IS NOT NULL'
      );
      effectiveStartDate = (earliestResult.rows[0]?.min_date as string) || endDate;
    }

    // Get exercises ordered by goal display_order (exercises linked to first goal come first)
    let exercisesQuery = `
      SELECT e.id, e.name, COALESCE(MIN(g.display_order), 9999) as min_order
      FROM exercises e
      LEFT JOIN goal_exercises ge ON ge.exercise_id = e.id
      LEFT JOIN goals g ON g.id = ge.goal_id
    `;
    const exercisesParams: number[] = [];

    if (exerciseId) {
      exercisesQuery += ' WHERE e.id = $1';
      exercisesParams.push(parseInt(exerciseId));
    }

    exercisesQuery += ' GROUP BY e.id, e.name ORDER BY min_order, e.name';

    const exercisesResult = await query(exercisesQuery, exercisesParams);
    const exercises = exercisesResult.rows as ExerciseRow[];

    // Get exercise logs with weight data
    let logsQuery = `
      SELECT exercise_id, date::text as date, weight, reps
      FROM exercise_logs
      WHERE date >= $1 AND date <= $2
        AND weight IS NOT NULL
    `;
    const logsParams: (string | number)[] = [effectiveStartDate, endDate];

    if (exerciseId) {
      logsQuery += ' AND exercise_id = $3';
      logsParams.push(parseInt(exerciseId));
    }

    logsQuery += ' ORDER BY exercise_id, date ASC';

    const logsResult = await query(logsQuery, logsParams);
    const logs = logsResult.rows as LogRow[];

    // Group logs by exercise
    const logsByExercise = new Map<number, LogRow[]>();
    logs.forEach(log => {
      const existing = logsByExercise.get(log.exercise_id) || [];
      existing.push(log);
      logsByExercise.set(log.exercise_id, existing);
    });

    // Get goal names for each exercise (ordered by goal display_order)
    const goalNamesResult = await query(`
      SELECT ge.exercise_id, g.name as goal_name
      FROM goal_exercises ge
      JOIN goals g ON g.id = ge.goal_id
      ORDER BY ge.exercise_id, g.display_order
    `);
    const goalNamesByExercise = new Map<number, string[]>();
    (goalNamesResult.rows as { exercise_id: number; goal_name: string }[]).forEach(row => {
      const existing = goalNamesByExercise.get(row.exercise_id) || [];
      existing.push(row.goal_name);
      goalNamesByExercise.set(row.exercise_id, existing);
    });

    // Build progression data for each exercise
    const exerciseProgressions: ExerciseProgression[] = exercises
      .map(exercise => {
        const exerciseLogs = logsByExercise.get(exercise.id) || [];

        if (exerciseLogs.length === 0) {
          return null;
        }

        const progression: ExerciseProgressionEntry[] = exerciseLogs.map(log => ({
          date: log.date,
          weight: log.weight,
          reps: log.reps,
          estimated1RM: calculate1RM(log.weight, log.reps),
        }));

        // Calculate stats
        const weights = exerciseLogs.filter(l => l.weight !== null).map(l => l.weight!);
        const reps = exerciseLogs.filter(l => l.reps !== null).map(l => l.reps!);
        const oneRMs = progression.filter(p => p.estimated1RM !== null).map(p => p.estimated1RM!);

        const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
        const maxWeightLog = exerciseLogs.find(l => l.weight === maxWeight);
        const max1RM = oneRMs.length > 0 ? Math.max(...oneRMs) : null;
        const max1RMEntry = progression.find(p => p.estimated1RM === max1RM);

        const firstWeight = weights.length > 0 ? weights[0] : null;
        const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
        const weightChange = firstWeight !== null && lastWeight !== null ? lastWeight - firstWeight : null;
        const weightChangePercent =
          weightChange !== null && firstWeight !== null && firstWeight > 0
            ? Math.round((weightChange / firstWeight) * 100)
            : null;

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          goalNames: goalNamesByExercise.get(exercise.id) || [],
          totalSessions: exerciseLogs.length,
          progression,
          stats: {
            maxWeight,
            maxWeightDate: maxWeightLog?.date || null,
            max1RM,
            max1RMDate: max1RMEntry?.date || null,
            averageWeight: weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : null,
            averageReps: reps.length > 0 ? Math.round((reps.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10 : null,
            weightChange,
            weightChangePercent,
          },
        };
      })
      .filter((p): p is ExerciseProgression => p !== null);

    const response: ProgressionAnalyticsResponse = {
      exercises: exerciseProgressions,
      dateRange: {
        startDate: effectiveStartDate,
        endDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching progression analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progression analytics' },
      { status: 500 }
    );
  }
}
