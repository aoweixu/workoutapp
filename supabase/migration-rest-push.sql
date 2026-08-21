-- Rest-timer web push. One row per user: their current push subscription and
-- the active timer, if any. The rest-timer edge function re-reads this row
-- when the timer expires, so cancels/extends between schedule and fire win.
-- Run in the Supabase SQL editor after migration.sql.

create table public.rest_push (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  subscription jsonb not null,
  ends_at timestamptz,
  exercise text not null default '',
  set_no int not null default 0,
  updated_at timestamptz not null default now()
);

create trigger rest_push_updated_at
  before update on public.rest_push
  for each row execute function public.set_updated_at();

alter table public.rest_push enable row level security;

create policy "own rows" on public.rest_push
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
