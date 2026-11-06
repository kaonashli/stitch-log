-- =====================================================================
-- Migration 004: the default project icon is now a ball of yarn
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (The app always sends an icon, so this only matters for projects
-- created some other way, e.g. by SQL. Existing projects keep theirs.)
-- =====================================================================
alter table public.projects alter column icon set default 'yarn';
