-- Structured added weight + bar/grip variant. Run once on projects created
-- before this (migration.sql already includes the columns for fresh setups).
alter table public.template_item add column if not exists track_weight smallint not null default 0;
alter table public.template_item add column if not exists variants text not null default '';
alter table public.set_log add column if not exists weight real not null default 0;
alter table public.set_log add column if not exists variant text not null default '';
