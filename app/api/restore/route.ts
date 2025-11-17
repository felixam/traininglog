import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface BackupData {
  version: string;
  timestamp: string;
  data: {
    goals: Record<string, unknown>[];
    exercises: Record<string, unknown>[];
    goal_exercises: Record<string, unknown>[];
    goal_logs: Record<string, unknown>[];
    exercise_logs: Record<string, unknown>[];
  };
}

function validateBackup(backup: unknown): backup is BackupData {
  if (!backup || typeof backup !== 'object') return false;
  if (!backup.version || !backup.timestamp || !backup.data) return false;

  const { data } = backup;
  if (!data || typeof data !== 'object') return false;

  // Check all required tables exist and are arrays
  const requiredTables = ['goals', 'exercises', 'goal_exercises', 'goal_logs', 'exercise_logs'];
  for (const table of requiredTables) {
    if (!Array.isArray(data[table])) return false;
  }

  return true;
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    // Parse uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read and parse JSON
    const text = await file.text();
    let backup: unknown;

    try {
      backup = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON file' },
        { status: 400 }
      );
    }

    // Validate backup structure
    if (!validateBackup(backup)) {
      return NextResponse.json(
        { error: 'Invalid backup format' },
        { status: 400 }
      );
    }

    // Start transaction
    await client.query('BEGIN');

    try {
      // Truncate all tables (CASCADE handles foreign keys)
      await client.query('TRUNCATE TABLE goals, exercises, goal_exercises, goal_logs, exercise_logs CASCADE');

      // Restore goals
      for (const goal of backup.data.goals) {
        await client.query(
          'INSERT INTO goals (id, name, color, display_order, created_at) VALUES ($1, $2, $3, $4, $5)',
          [goal.id, goal.name, goal.color, goal.display_order, goal.created_at]
        );
      }

      // Restore exercises
      for (const exercise of backup.data.exercises) {
        await client.query(
          'INSERT INTO exercises (id, name, created_at) VALUES ($1, $2, $3)',
          [exercise.id, exercise.name, exercise.created_at]
        );
      }

      // Restore goal_exercises links
      for (const link of backup.data.goal_exercises) {
        await client.query(
          'INSERT INTO goal_exercises (id, goal_id, exercise_id, created_at) VALUES ($1, $2, $3, $4)',
          [link.id, link.goal_id, link.exercise_id, link.created_at]
        );
      }

      // Restore goal_logs
      for (const log of backup.data.goal_logs) {
        await client.query(
          'INSERT INTO goal_logs (id, goal_id, date, completed, exercise_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [log.id, log.goal_id, log.date, log.completed, log.exercise_id, log.created_at, log.updated_at]
        );
      }

      // Restore exercise_logs
      for (const log of backup.data.exercise_logs) {
        await client.query(
          'INSERT INTO exercise_logs (id, exercise_id, date, weight, reps, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [log.id, log.exercise_id, log.date, log.weight, log.reps, log.created_at, log.updated_at]
        );
      }

      // Reset sequences to max ID + 1
      const sequences = [
        { table: 'goals', seq: 'goals_id_seq' },
        { table: 'exercises', seq: 'exercises_id_seq' },
        { table: 'goal_exercises', seq: 'goal_exercises_id_seq' },
        { table: 'goal_logs', seq: 'goal_logs_id_seq' },
        { table: 'exercise_logs', seq: 'exercise_logs_id_seq' },
      ];

      for (const { table, seq } of sequences) {
        await client.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
      }

      // Commit transaction
      await client.query('COMMIT');

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
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore database' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
