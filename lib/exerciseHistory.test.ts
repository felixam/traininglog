import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyHistoryUpdate } from './exerciseHistory.ts';
import type { ExerciseWithHistory } from './types.ts';

const exercise = (history: ExerciseWithHistory['history']): ExerciseWithHistory[] => [
  { id: 4, name: 'Cable row', created_at: '2025-01-01', history },
  { id: 9, name: 'Leg curls', created_at: '2025-01-01', history: undefined },
];

const payload = (over: Partial<{ exerciseId: number; weight: number; reps: number; date: string }> = {}) => ({
  goalId: 1,
  date: '2026-09-02',
  exerciseId: 4,
  weight: 70,
  reps: 10,
  ...over,
});

test('a heavier lift becomes the new max and the new last', () => {
  const [row] = applyHistoryUpdate(
    exercise({ maxWeight: { weight: 60, reps: 12, date: '2026-08-01' }, lastLog: { weight: 60, reps: 12, date: '2026-08-01' } }),
    payload()
  )!;

  assert.deepEqual(row.history!.maxWeight, { weight: 70, reps: 10, date: '2026-09-02' });
  assert.deepEqual(row.history!.lastLog, { weight: 70, reps: 10, date: '2026-09-02' });
});

test('at equal weight, more reps takes the max (75x10 beats 75x8)', () => {
  const [row] = applyHistoryUpdate(
    exercise({ maxWeight: { weight: 75, reps: 8, date: '2026-08-01' }, lastLog: null }),
    payload({ weight: 75, reps: 10 })
  )!;

  assert.deepEqual(row.history!.maxWeight, { weight: 75, reps: 10, date: '2026-09-02' });
});

test('at equal weight, fewer reps does not take the max', () => {
  const max = { weight: 75, reps: 12, date: '2026-08-01' };
  const [row] = applyHistoryUpdate(exercise({ maxWeight: max, lastLog: null }), payload({ weight: 75, reps: 8 }));

  assert.deepEqual(row.history!.maxWeight, max);
});

test('a lighter lift leaves the max alone but still becomes the last', () => {
  const max = { weight: 90, reps: 5, date: '2026-08-01' };
  const [row] = applyHistoryUpdate(
    exercise({ maxWeight: max, lastLog: { weight: 90, reps: 5, date: '2026-08-01' } }),
    payload({ weight: 50, reps: 20 })
  );

  assert.deepEqual(row.history!.maxWeight, max);
  assert.deepEqual(row.history!.lastLog, { weight: 50, reps: 20, date: '2026-09-02' });
});

test('back-filling an earlier day does not overwrite a more recent last log', () => {
  const last = { weight: 80, reps: 6, date: '2026-09-01' };
  const [row] = applyHistoryUpdate(
    exercise({ maxWeight: { weight: 90, reps: 5, date: '2026-08-01' }, lastLog: last }),
    payload({ date: '2026-08-15', weight: 60, reps: 10 })
  );

  assert.deepEqual(row.history!.lastLog, last, 'an older entry must not become "last"');
});

test('re-logging the same day replaces that day\'s last log', () => {
  const [row] = applyHistoryUpdate(
    exercise({ maxWeight: null, lastLog: { weight: 60, reps: 8, date: '2026-09-02' } }),
    payload({ weight: 65, reps: 8 })
  );

  assert.deepEqual(row.history!.lastLog, { weight: 65, reps: 8, date: '2026-09-02' });
});

test('other exercises and logs without a weight are left untouched', () => {
  const before = exercise({ maxWeight: { weight: 60, reps: 12, date: '2026-08-01' }, lastLog: null });

  const other = applyHistoryUpdate(before, payload({ exerciseId: 9 }));
  assert.deepEqual(other[0], before[0], 'the non-matching exercise must be unchanged');

  const noWeight = applyHistoryUpdate(before, payload({ weight: undefined }));
  assert.deepEqual(noWeight[0], before[0], 'a direct completion must not touch history');
});

test('an exercise with no history yet gets seeded from the new entry', () => {
  const [, curls] = applyHistoryUpdate(exercise(undefined), payload({ exerciseId: 9 }));

  assert.deepEqual(curls.history!.maxWeight, { weight: 70, reps: 10, date: '2026-09-02' });
  assert.deepEqual(curls.history!.lastLog, { weight: 70, reps: 10, date: '2026-09-02' });
});

test('undefined linkedExercises stays undefined', () => {
  assert.equal(applyHistoryUpdate(undefined, payload()), undefined);
});
