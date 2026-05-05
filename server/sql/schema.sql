create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamp not null default now()
);

create table if not exists sections (
  id serial primary key,
  key text not null unique,
  label text not null,
  description text not null,
  position integer not null default 0
);

create table if not exists topics (
  id serial primary key,
  section_id integer not null references sections(id) on delete cascade,
  slug text not null,
  label text not null,
  description text not null default '',
  position integer not null default 0,
  unique (section_id, slug)
);

create table if not exists stories (
  id text primary key,
  section_id integer not null references sections(id) on delete cascade,
  topic_id integer references topics(id) on delete set null,
  title text not null,
  category text not null,
  author text not null,
  publish_date date not null,
  excerpt text not null,
  image text not null,
  body text not null,
  read_minutes integer not null default 8,
  feature_rank integer,
  recent_rank integer,
  popular_rank integer,
  is_home_lead boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);