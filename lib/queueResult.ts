/**
 * What the offline queue should do with a mutation after the server answered.
 *
 * - done   the write landed; remove it
 * - drop   the server will never accept it (e.g. a goal that belongs to another
 *          user, or no longer exists); remove it and keep going, so a single bad
 *          mutation cannot block everything queued behind it
 * - retry  transient; leave it at the head and stop for now
 * - auth   the session is gone; bounce to login and stop
 */
export type QueueResult = 'done' | 'drop' | 'retry' | 'auth';

// 4xx statuses that are transient despite being client errors.
const RETRYABLE_CLIENT_ERRORS = new Set([408, 429]);

export function classifyQueueResponse(status: number): QueueResult {
  if (status >= 200 && status < 300) return 'done';
  if (status === 401) return 'auth';
  if (RETRYABLE_CLIENT_ERRORS.has(status)) return 'retry';
  if (status >= 400 && status < 500) return 'drop';
  return 'retry';
}
