import { NextResponse } from 'next/server';
import { batch, type BatchStatement } from '@/lib/db';

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

    const statements: BatchStatement[] = [];

    // Children before parents on delete (no ON DELETE CASCADE on bare DELETEs in SQLite without FK enforcement-on triggers; explicit order is safest).
    statements.push({ sql: 'DELETE FROM exercise_logs' });
    statements.push({ sql: 'DELETE FROM goal_logs' });
    statements.push({ sql: 'DELETE FROM goal_exercises' });
    statements.push({ sql: 'DELETE FROM exercises' });
    statements.push({ sql: 'DELETE FROM goals' });
    statements.push({
      sql: `DELETE FROM sqlite_sequence WHERE name IN ('goals','exercises','goal_exercises','goal_logs','exercise_logs')`,
    });

    // Parents before children on insert.
    for (const goal of backup.data.goals) {
      statements.push({
        sql: 'INSERT INTO goals (id, name, color, display_order, created_at) VALUES (?, ?, ?, ?, ?)',
        params: [goal.id, goal.name, goal.color, goal.display_order, goal.created_at],
      });
    }
    for (const exercise of backup.data.exercises) {
      statements.push({
        sql: 'INSERT INTO exercises (id, name, created_at) VALUES (?, ?, ?)',
        params: [exercise.id, exercise.name, exercise.created_at],
      });
    }
    for (const link of backup.data.goal_exercises) {
      statements.push({
        sql: 'INSERT INTO goal_exercises (id, goal_id, exercise_id, created_at) VALUES (?, ?, ?, ?)',
        params: [link.id, link.goal_id, link.exercise_id, link.created_at],
      });
    }
    for (const log of backup.data.goal_logs) {
      statements.push({
        sql: 'INSERT INTO goal_logs (id, goal_id, date, completed, exercise_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [
          log.id,
          log.goal_id,
          log.date,
          log.completed ? 1 : 0,
          log.exercise_id ?? null,
          log.created_at,
          log.updated_at,
        ],
      });
    }
    for (const log of backup.data.exercise_logs) {
      statements.push({
        sql: 'INSERT INTO exercise_logs (id, exercise_id, date, weight, reps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [
          log.id,
          log.exercise_id,
          log.date,
          log.weight ?? null,
          log.reps ?? null,
          log.created_at,
          log.updated_at,
        ],
      });
    }

    await batch(statements);

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
