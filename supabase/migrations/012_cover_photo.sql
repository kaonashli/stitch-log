-- =====================================================================
-- Migration 012: choose a photo as a project's main image
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
--
-- A project shows its icon by default. If the owner stars one of its
-- photos, that photo is shown instead (My Projects, the project page, and
-- friend activity). At most one main photo per project.
-- =====================================================================
alter table public.project_photos add column if not exists is_cover boolean not null default false;

-- Only one photo per project can be the main image
create unique index if not exists project_photos_one_cover on public.project_photos (project_id) where is_cover;
