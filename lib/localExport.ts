/**
 * Captures everything the browser is holding locally — most importantly the
 * persisted `pendingLogMutations` queue, which is the only copy of any log the
 * server never accepted.
 */

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

export interface AuthProbe {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface LocalExportPayload {
  version: '1.0';
  exportedAt: string;
  userAgent: string;
  auth: AuthProbe | null;
  pendingCount: number;
  storage: Record<string, unknown>;
}

/** Snapshot every key, parsing JSON where possible and falling back to the raw string. */
export function readStorage(storage: StorageLike): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null) continue;

    const raw = storage.getItem(key);
    if (raw === null) continue;

    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
  }

  return out;
}

export function countPendingMutations(storage: Record<string, unknown>): number {
  const store = storage['goal-store'];
  if (!store || typeof store !== 'object') return 0;

  const state = (store as { state?: unknown }).state;
  if (!state || typeof state !== 'object') return 0;

  const queue = (state as { pendingLogMutations?: unknown }).pendingLogMutations;
  return Array.isArray(queue) ? queue.length : 0;
}

export function buildLocalExport(input: {
  storage: StorageLike;
  auth: AuthProbe | null;
  exportedAt: string;
  userAgent: string;
}): LocalExportPayload {
  const storage = readStorage(input.storage);

  return {
    version: '1.0',
    exportedAt: input.exportedAt,
    userAgent: input.userAgent,
    auth: input.auth,
    pendingCount: countPendingMutations(storage),
    storage,
  };
}

export function exportFilename(exportedAt: string): string {
  return `trainingslog-local-${exportedAt.split('T')[0]}.json`;
}
