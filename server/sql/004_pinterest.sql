-- Pinterest OAuth accounts (one per admin user)
create table if not exists pinterest_accounts (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp,
  pinner_username text,
  pinner_id text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (user_id)
);

-- Pinterest pins queue / history
create table if not exists pinterest_pins (
  id serial primary key,
  story_id text references stories(id) on delete set null,
  account_id integer references pinterest_accounts(id) on delete cascade,
  board_id text,
  board_name text,
  title text not null,
  description text not null default '',
  link text not null,
  image_url text not null,
  alt_text text not null default '',
  scheduled_at timestamp,
  posted_at timestamp,
  pinterest_pin_id text,
  status text not null default 'draft' check (status in ('draft','scheduled','posted','failed')),
  error_message text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists pinterest_pins_status_scheduled on pinterest_pins(status, scheduled_at);
create index if not exists pinterest_pins_story_id on pinterest_pins(story_id);
