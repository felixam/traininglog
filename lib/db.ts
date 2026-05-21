import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

type QueryParam = string | number | boolean | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface QueryResult {
  rows: Row[];
  rowCount: number;
}

async function getDb(): Promise<D1Database> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as Record<string, unknown>).DB as D1Database | undefined;
  if (!db) {
    throw new Error('D1 binding `DB` is not available. Check wrangler.jsonc and next.config.ts.');
  }
  return db;
}

// API routes were written for pg-style $1, $2 placeholders. D1 uses anonymous ?.
// Translate so callers stay readable.
function normalize(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

function bind(stmt: D1PreparedStatement, params: QueryParam[] | undefined): D1PreparedStatement {
  if (!params || params.length === 0) return stmt;
  return stmt.bind(...params);
}

export async function query(
  text: string,
  params?: QueryParam[]
): Promise<QueryResult> {
  const start = Date.now();
  const db = await getDb();
  const stmt = bind(db.prepare(normalize(text)), params);

  try {
    const result = await stmt.all<Row>();
    const rows = result.results ?? [];
    console.log('Executed query', { text, duration: Date.now() - start, rows: rows.length });
    return { rows, rowCount: rows.length };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// D1 has no interactive transactions; batch() runs the array atomically.
// Each entry is { sql, params? } — same shape as query().
export interface BatchStatement {
  sql: string;
  params?: QueryParam[];
}

export async function batch(statements: BatchStatement[]): Promise<QueryResult[]> {
  const db = await getDb();
  const prepared = statements.map(({ sql, params }) =>
    bind(db.prepare(normalize(sql)), params)
  );
  const results = await db.batch<Row>(prepared);
  return results.map(r => ({
    rows: r.results ?? [],
    rowCount: r.results?.length ?? 0,
  }));
}
