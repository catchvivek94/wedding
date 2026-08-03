-- ShaadiDesk · Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
--
-- Design note: this app's data is small (a few hundred KB) and already organised
-- into collections (checklist, guests, budget, vendors…). Rather than normalising
-- into a dozen tables, each collection is one JSONB row. That keeps the app code
-- simple and means two people editing *different* sections never conflict.

-- ---------------------------------------------------------------- collections
create table if not exists collections (
  key         text primary key,           -- 'checklist', 'guests', 'vendors', …
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text                        -- email of whoever last wrote
);

-- ------------------------------------------------------------------ audit log
-- Append-only history. Nothing is ever deleted from here, so you can always see
-- what changed and when, even if a value was later overwritten.
create table if not exists audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  who         text,
  collection  text,
  action      text,                       -- 'sync' | 'restore' | 'reset'
  items       int,                        -- row count after the change
  detail      jsonb
);

create index if not exists audit_log_at_idx on audit_log (at desc);

-- --------------------------------------------------------------------- access
-- The anon key is public (it ships in the page source of a public repo), so the
-- tables must NOT be readable anonymously — they hold guest phone numbers.
-- These policies require a signed-in user.

alter table collections enable row level security;
alter table audit_log   enable row level security;

drop policy if exists "signed-in read"   on collections;
drop policy if exists "signed-in write"  on collections;
drop policy if exists "signed-in update" on collections;
drop policy if exists "signed-in read"   on audit_log;
drop policy if exists "signed-in insert" on audit_log;

create policy "signed-in read"   on collections for select using (auth.role() = 'authenticated');
create policy "signed-in write"  on collections for insert with check (auth.role() = 'authenticated');
create policy "signed-in update" on collections for update using (auth.role() = 'authenticated');

create policy "signed-in read"   on audit_log for select using (auth.role() = 'authenticated');
create policy "signed-in insert" on audit_log for insert with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------ keep updated_at
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists collections_touch on collections;
create trigger collections_touch before update on collections
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------------ who's in?
-- Optional but recommended: lock sign-in to just the two of you.
-- Supabase Dashboard → Authentication → Providers → Email:
--   • turn OFF "Enable email signups"  (stops strangers creating accounts)
-- then Authentication → Users → "Add user" for each of your email addresses.
-- Magic-link sign-in still works for those users.
