import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'dailyspoon',
  password: process.env.DB_PASSWORD ?? 'dailyspoon',
  database: process.env.DB_NAME ?? 'dailyspoon',
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
