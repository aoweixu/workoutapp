-- Overload schema. Run once in the Supabase SQL editor (or via supabase db push).
-- Columns mirror the client's local schema; "deleted" is smallint 0/1 to match
-- the client payloads exactly. updated_at is server-stamped for sync cursors.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- tables ----------

create table public.exercise (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  video_url text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

create table public.template (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  rotation_order int,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

create table public.template_item (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid not null,
  exercise_id uuid not null,
  target_sets int not null default 3,
  target_reps text not null default '',
  progression text not null default '',
  rep_type text not null default 'reps' check (rep_type in ('reps', 'seconds')),
  rest_seconds int,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

create table public.session (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date text not null,
  template_id uuid not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

create table public.set_log (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  set_no int not null,
  value int not null,
  rep_type text not null default 'reps' check (rep_type in ('reps', 'seconds')),
  progression text not null default '',
  logged_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ---------- indexes ----------

create index exercise_sync_idx on public.exercise (user_id, updated_at);
create index template_sync_idx on public.template (user_id, updated_at);
create index template_item_sync_idx on public.template_item (user_id, updated_at);
create index session_sync_idx on public.session (user_id, updated_at);
create index set_log_sync_idx on public.set_log (user_id, updated_at);
create index set_log_exercise_idx on public.set_log (user_id, exercise_id);

-- ---------- updated_at triggers ----------

create trigger exercise_touch before insert or update on public.exercise
  for each row execute function public.set_updated_at();
create trigger template_touch before insert or update on public.template
  for each row execute function public.set_updated_at();
create trigger template_item_touch before insert or update on public.template_item
  for each row execute function public.set_updated_at();
create trigger session_touch before insert or update on public.session
  for each row execute function public.set_updated_at();
create trigger set_log_touch before insert or update on public.set_log
  for each row execute function public.set_updated_at();

-- ---------- row level security ----------

alter table public.exercise enable row level security;
alter table public.template enable row level security;
alter table public.template_item enable row level security;
alter table public.session enable row level security;
alter table public.set_log enable row level security;

create policy "own rows" on public.exercise
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.template
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.template_item
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.session
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.set_log
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
