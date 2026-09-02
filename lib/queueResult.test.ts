import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyQueueResponse } from './queueResult.ts';

test('a successful write is done and leaves the queue', () => {
  assert.equal(classifyQueueResponse(200), 'done');
  assert.equal(classifyQueueResponse(201), 'done');
  assert.equal(classifyQueueResponse(299), 'done');
});

test('401 means the session is gone, not that the mutation is bad', () => {
  assert.equal(classifyQueueResponse(401), 'auth');
});

test('client errors are dropped so one bad mutation cannot block the queue', () => {
  // 404 is what a mutation for another user's goal returns.
  assert.equal(classifyQueueResponse(404), 'drop');
  assert.equal(classifyQueueResponse(400), 'drop');
  assert.equal(classifyQueueResponse(403), 'drop');
  assert.equal(classifyQueueResponse(409), 'drop');
  assert.equal(classifyQueueResponse(422), 'drop');
});

test('transient 4xx are retried rather than dropped', () => {
  assert.equal(classifyQueueResponse(408), 'retry');
  assert.equal(classifyQueueResponse(429), 'retry');
});

test('server errors are retried and keep their place at the head', () => {
  assert.equal(classifyQueueResponse(500), 'retry');
  assert.equal(classifyQueueResponse(502), 'retry');
  assert.equal(classifyQueueResponse(503), 'retry');
});

test('unknown statuses retry rather than discard data', () => {
  assert.equal(classifyQueueResponse(0), 'retry');
  assert.equal(classifyQueueResponse(100), 'retry');
  assert.equal(classifyQueueResponse(302), 'retry');
});
