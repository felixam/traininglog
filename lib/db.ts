import postgres from 'postgres';

type QueryParam = string | number | boolean | null | QueryParam[];

interface HyperdriveBinding {
  connectionString: string;
}

// Cached sql client for non-Hyperdrive environments only
let sql: ReturnType<typeof postgres> | null = null;

interface ConnectionInfo {
  connectionString: string;
  isHyperdrive: boolean;
}

async function getConnectionInfo(): Promise<ConnectionInfo> {
  // Try to get Hyperdrive connection string in Cloudflare Workers
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext();
    const hyperdrive = (env as Record<string, unknown>).HYPERDRIVE as HyperdriveBinding | undefined;
    if (hyperdrive?.connectionString) {
      return { connectionString: hyperdrive.connectionString, isHyperdrive: true };
    }
  } catch {
    // Not in Cloudflare context, fall back to DATABASE_URL
  }
  return { connectionString: process.env.DATABASE_URL || '', isHyperdrive: false };
}

function createHyperdriveClient(connectionString: string) {
  return postgres(connectionString, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
    prepare: false,
  });
}

async function getPooledClient(): Promise<ReturnType<typeof postgres>> {
  const { connectionString } = await getConnectionInfo();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (sql) return sql;

  sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    onclose: () => {
      sql = null;
    },
  });

  return sql;
}

// Row type for query results - permissive for backwards compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// Query result interface matching pg's QueryResult
interface QueryResult {
  rows: Row[];
  rowCount: number;
}

// Export query function that mimics pg's interface
export const query = async (
  text: string,
  params?: QueryParam[]
): Promise<QueryResult> => {
  const start = Date.now();
  const { connectionString, isHyperdrive } = await getConnectionInfo();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = isHyperdrive
    ? createHyperdriveClient(connectionString)
    : await getPooledClient();

  try {
    const rows = await client.unsafe(text, params as (string | number | boolean | null)[]);

    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: rows.length });

    return {
      rows: rows as Row[],
      rowCount: rows.length,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (isHyperdrive) {
      await client.end();
    }
  }
}

// Transaction helper that handles Hyperdrive connection lifecycle
export async function withTransaction<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  const { connectionString, isHyperdrive } = await getConnectionInfo();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = isHyperdrive
    ? createHyperdriveClient(connectionString)
    : await getPooledClient();

  try {
    const result = await client.begin(fn);
    return result as T;
  } finally {
    if (isHyperdrive) {
      await client.end();
    }
  }
}

// Export sql getter for advanced usage - caller must handle cleanup for Hyperdrive
export async function getDb(): Promise<ReturnType<typeof postgres>> {
  const { connectionString, isHyperdrive } = await getConnectionInfo();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return isHyperdrive
    ? createHyperdriveClient(connectionString)
    : await getPooledClient();
}
