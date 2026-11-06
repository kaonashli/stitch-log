-- =====================================================================
-- Migration 002: project icon and color
--
-- Run this once in Supabase > SQL Editor (your database was created
-- from an older schema.sql). Safe to run more than once.
--
-- Every project gets a small icon and a color, chosen when creating it.
-- We store short names (e.g. 'yarn', 'berry'), not images or hex codes:
-- the app turns them into an icon and a color that fits light/dark mode.
-- Existing projects get the defaults ('yarn' + 'berry').
-- =====================================================================
alter table public.projects
  add column if not exists icon  text not null default 'yarn',
  add column if not exists color text not null default 'berry';

-- Only allow simple lowercase names (the app has the full list of valid ones)
alter table public.projects drop constraint if exists projects_icon_format;
alter table public.projects add constraint projects_icon_format check (icon ~ '^[a-z0-9-]{1,40}$');

alter table public.projects drop constraint if exists projects_color_format;
alter table public.projects add constraint projects_color_format check (color ~ '^[a-z]{1,20}$');
