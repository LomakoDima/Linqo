import type { PoolClient } from "pg";
import { pool } from "./db";

export const authDb = {
  async transaction<T>(operation: (client: Pick<PoolClient, "query">) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
