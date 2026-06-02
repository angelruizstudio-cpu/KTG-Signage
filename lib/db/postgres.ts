import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return connectionString;
}

export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      ssl: process.env.AZURE_POSTGRESQL_SSL === "false" ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
  const result = await getPostgresPool().query<T>(sql, values);
  return result.rows;
}

export async function withAppUser<T>(userId: string, callback: (client: PoolClient) => Promise<T>) {
  const client = await getPostgresPool().connect();

  try {
    await client.query("begin");
    await client.query("select set_config('app.current_user_id', $1, true)", [userId]);
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
