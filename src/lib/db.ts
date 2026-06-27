import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

declare global {
  var reservationTrackingPool: Pool | undefined;
}

export const pool =
  globalThis.reservationTrackingPool ?? new Pool({ connectionString });

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
