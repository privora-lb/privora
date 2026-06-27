import { getDatabase, MissingDatabaseConnectionError } from "@netlify/database";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;

function createPool() {
  if (connectionString) {
    return new Pool({ connectionString });
  }

  try {
    return getDatabase().pool as unknown as Pool;
  } catch (error) {
    if (error instanceof MissingDatabaseConnectionError) {
      throw new Error(
        "DATABASE_URL, NETLIFY_DATABASE_URL, or NETLIFY_DB_URL is required.",
      );
    }

    throw error;
  }
}

declare global {
  var reservationTrackingPool: Pool | undefined;
}

export const pool =
  globalThis.reservationTrackingPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.reservationTrackingPool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
) {
  return pool.query<T>(text, [...params]);
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
