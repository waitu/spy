import { query } from './db.js';
import { hashPassword } from './authService.js';

const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? (isProduction ? '' : 'admin@local.test')).trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? (isProduction ? '' : 'ChangeMe123!');
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME ?? 'Sponbit Admin';

export async function ensureBootstrap() {
  await query(`
    create table if not exists users (
      id serial primary key,
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null default 'editor' check (role in ('admin', 'editor')),
      created_at timestamp not null default now()
    )
  `);

  await query(`
    alter table if exists stories
    add column if not exists source_name text
  `);

  await query(`
    alter table if exists stories
    add column if not exists source_url text
  `);

  await query(`
    alter table if exists stories
    add column if not exists is_external boolean not null default false
  `);

  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    if (isProduction) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in production before bootstrapping the admin account.');
    }

    return;
  }

  const existingAdmin = await query(
    `select id
     from users
     where email = $1`,
    [DEFAULT_ADMIN_EMAIL]
  );

  if (!existingAdmin.rows[0]) {
    await query(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, 'admin')`,
      [DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, hashPassword(DEFAULT_ADMIN_PASSWORD)]
    );
  }
}
