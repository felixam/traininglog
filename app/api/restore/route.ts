import { NextResponse } from 'next/server';
import { batch, query, type BatchStatement } from '@/lib/db';
import { getCurrentUser, unauthorized } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BackupRow = Record<string, any>;

interface BackupData {
  version: string;
  timestamp: string;
  data: {
    goals: BackupRow[];
    exercises: BackupRow[];
    goal_exercises: BackupRow[];
    goal_logs: BackupRow[];
    exercise_logs: BackupRow[];
  };
}

function validateBackup(backup: unknown): backup is BackupData {
  if (!backup || typeof backup !== 'object') return false;
  const b = backup as Record<string, unknown>;
  if (!b.version || !b.timestamp || !b.data) return false;
  const { data } = b;
  if (!data || typeof data !== 'object') return false;
  const requiredTables = ['goals', 'exercises', 'goal_exercises', 'goal_logs', 'exercise_logs'];
  const d = data as Record<string, unknown>;
  for (const table of requiredTables) {
    if (!Array.isArray(d[table])) return false;
  }
  return true;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const userId = user.userId;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const text = await file.text();
    let backup: unknown;
    try {
      backup = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    if (!validateBackup(backup)) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    // Wipe only the current user's data (children before parents).
    await batch([
      { sql: 'DELETE FROM exercise_logs WHERE user_id = $1', params: [userId] },
      { sql: 'DELETE FROM goal_logs WHERE user_id = $1', params: [userId] },
      { sql: 'DELETE FROM goal_exercises WHERE user_id = $1', params: [userId] },
      { sql: 'DELETE FROM exercises WHERE user_id = $1', params: [userId] },
      { sql: 'DELETE FROM goals WHERE user_id = $1', params: [userId] },
    ]);

    // Re-insert with fresh ids (ids are global, so backup ids cannot be reused).
    // Track old -> new id maps to rewire relationships.
    const goalIdMap = new Map<number, number>();
    for (const goal of backup.data.goals) {
      const inserted = await query(
        'INSERT INTO goals (user_id, name, color, display_order, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, goal.name, goal.color, goal.display_order, goal.created_at]
      );
      goalIdMap.set(Number(goal.id), Number(inserted.rows[0].id));
    }

    const exerciseIdMap = new Map<number, number>();
    for (const exercise of backup.data.exercises) {
      const inserted = await query(
        'INSERT INTO exercises (user_id, name, created_at) VALUES ($1, $2, $3) RETURNING id',
        [userId, exercise.name, exercise.created_at]
      );
      exerciseIdMap.set(Number(exercise.id), Number(inserted.rows[0].id));
    }

    const statements: BatchStatement[] = [];

    for (const link of backup.data.goal_exercises) {
      const goalId = goalIdMap.get(Number(link.goal_id));
      const exerciseId = exerciseIdMap.get(Number(link.exercise_id));
      if (goalId === undefined || exerciseId === undefined) continue;
      statements.push({
        sql: 'INSERT INTO goal_exercises (user_id, goal_id, exercise_id, created_at) VALUES ($1, $2, $3, $4)',
        params: [userId, goalId, exerciseId, link.created_at],
      });
    }
    for (const log of backup.data.goal_logs) {
      const goalId = goalIdMap.get(Number(log.goal_id));
      if (goalId === undefined) continue;
      const exerciseId = log.exercise_id != null ? exerciseIdMap.get(Number(log.exercise_id)) ?? null : null;
      statements.push({
        sql: 'INSERT INTO goal_logs (user_id, goal_id, date, completed, exercise_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        params: [
          userId,
          goalId,
          log.date,
          log.completed ? 1 : 0,
          exerciseId,
          log.created_at,
          log.updated_at,
        ],
      });
    }
    for (const log of backup.data.exercise_logs) {
      const exerciseId = exerciseIdMap.get(Number(log.exercise_id));
      if (exerciseId === undefined) continue;
      statements.push({
        sql: 'INSERT INTO exercise_logs (user_id, exercise_id, date, weight, reps, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        params: [
          userId,
          exerciseId,
          log.date,
          log.weight ?? null,
          log.reps ?? null,
          log.created_at,
          log.updated_at,
        ],
      });
    }

    if (statements.length > 0) {
      await batch(statements);
    }

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      counts: {
        goals: backup.data.goals.length,
        exercises: backup.data.exercises.length,
        goal_exercises: backup.data.goal_exercises.length,
        goal_logs: backup.data.goal_logs.length,
        exercise_logs: backup.data.exercise_logs.length,
      },
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Failed to restore database' }, { status: 500 });
  }
}
