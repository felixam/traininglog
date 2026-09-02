import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readStorage,
  countPendingMutations,
  buildLocalExport,
  exportFilename,
  type StorageLike,
} from './localExport.ts';

function fakeStorage(entries: Record<string, string>): StorageLike {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => (k in entries ? entries[k] : null),
  };
}

test('readStorage parses JSON values and keeps unparseable ones raw', () => {
  const storage = fakeStorage({
    'goal-store': '{"state":{"goals":[]},"version":0}',
    'app-settings': '{"visibleDays":14}',
    'plain-string': 'not json',
  });

  assert.deepEqual(readStorage(storage), {
    'goal-store': { state: { goals: [] }, version: 0 },
    'app-settings': { visibleDays: 14 },
    'plain-string': 'not json',
  });
});

test('readStorage returns an empty object for empty storage', () => {
  assert.deepEqual(readStorage(fakeStorage({})), {});
});

test('countPendingMutations reads the queue length out of the persisted store', () => {
  const storage = readStorage(
    fakeStorage({
      'goal-store': JSON.stringify({
        state: {
          pendingLogMutations: [
            { id: 'a', type: 'upsert', payload: { goalId: 1, date: '2026-07-02' } },
            { id: 'b', type: 'delete', payload: { goalId: 2, date: '2026-07-03' } },
          ],
        },
      }),
    })
  );

  assert.equal(countPendingMutations(storage), 2);
});

test('countPendingMutations returns 0 when the store or queue is missing or malformed', () => {
  assert.equal(countPendingMutations({}), 0);
  assert.equal(countPendingMutations({ 'goal-store': 'not an object' }), 0);
  assert.equal(countPendingMutations({ 'goal-store': { state: {} } }), 0);
  assert.equal(countPendingMutations({ 'goal-store': { state: { pendingLogMutations: 'nope' } } }), 0);
});

test('buildLocalExport captures storage, queue size and auth identity', () => {
  const storage = fakeStorage({
    'goal-store': JSON.stringify({
      state: { pendingLogMutations: [{ id: 'a', type: 'upsert', payload: { goalId: 1, date: '2026-07-02' } }] },
    }),
  });

  const payload = buildLocalExport({
    storage,
    auth: { ok: true, status: 200, body: { userId: 1, username: 'felix' } },
    exportedAt: '2026-09-02T10:00:00.000Z',
    userAgent: 'iPhone',
  });

  assert.equal(payload.version, '1.0');
  assert.equal(payload.exportedAt, '2026-09-02T10:00:00.000Z');
  assert.equal(payload.userAgent, 'iPhone');
  assert.equal(payload.pendingCount, 1);
  assert.deepEqual(payload.auth, { ok: true, status: 200, body: { userId: 1, username: 'felix' } });
  assert.equal((payload.storage['goal-store'] as { state: { pendingLogMutations: unknown[] } }).state.pendingLogMutations.length, 1);
});

test('buildLocalExport tolerates a failed auth probe', () => {
  const payload = buildLocalExport({
    storage: fakeStorage({}),
    auth: null,
    exportedAt: '2026-09-02T10:00:00.000Z',
    userAgent: 'iPhone',
  });

  assert.equal(payload.auth, null);
  assert.equal(payload.pendingCount, 0);
});

test('exportFilename is date-stamped and filesystem safe', () => {
  assert.equal(exportFilename('2026-09-02T10:00:00.000Z'), 'trainingslog-local-2026-09-02.json');
});
