import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

export interface Db {
  pool: Pool;
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
}

export function createPool(): Pool {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Attempt secondary load from local .env in backend directory
    try {
      const dotenvPath = new URL('../../.env', import.meta.url).pathname;
      // Dynamically import dotenv only here to avoid duplication
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dotenv = require('dotenv');
      const rs = dotenv.config({ path: dotenvPath });
      if (rs?.parsed?.DATABASE_URL) {
        connectionString = rs.parsed.DATABASE_URL;
      }
    } catch {
      // ignore
    }
  }
  if (!connectionString) {
    // Provide helpful diagnostics
    // eslint-disable-next-line no-console
    console.error('[db] DATABASE_URL missing. CWD=', process.cwd(), 'envKeys=', Object.keys(process.env).filter(k => k.startsWith('DATABASE')));
    throw new Error('DATABASE_URL not set');
  }
  console.log('[db] Creating connection pool with 10s timeout...');
  return new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000, // 10 second timeout
    query_timeout: 30000 // 30 second query timeout
  });
}

export async function attachDb(app: FastifyInstance, pool: Pool) {
  const db: Db = {
    pool,
    query: async (text, params) => {
      const res = await pool.query(text, params);
      return { rows: res.rows as any };
    }
  };
  // @ts-ignore decorate dynamic property
  app.decorate('db', db);
  app.addHook('onClose', async () => {
    await pool.end();
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}
