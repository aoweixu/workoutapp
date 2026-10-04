-- Structured load: each exercise declares how it is loaded; the per-set
-- weight column (migration-weight-variant.sql) is the load in lb. Run once
-- on projects created before this; migration.sql already has the columns.
alter table public.exercise add column if not exists implement text not null default 'bodyweight';
alter table public.exercise add column if not exists bar_lb real not null default 45;
-- Historical free-text progression values were parsed into set_log.weight
-- one-off per deployment (see git history for the mapping); progression is
-- no longer written by the app.
