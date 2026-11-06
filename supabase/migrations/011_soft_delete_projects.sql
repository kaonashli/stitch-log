-- =====================================================================
-- Migration 011: soft delete for projects ("Recently deleted")
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
--
-- Deleting a project now just sets deleted_at. From that moment:
--   - Only the owner can see it (in "Recently deleted"), to restore it or
--     delete it forever. Friends and admins no longer see it anywhere:
--     not in friend activity, profiles, hearts, comments, or photos.
--   - After 30 days the app deletes it for good (with its photos) the next
--     time the owner opens the app.
-- Deleting for good removes everything about it, including its friend
-- activity entries (they're linked with ON DELETE CASCADE).
-- =====================================================================
alter table public.projects add column if not exists deleted_at timestamptz;

create index if not exists projects_deleted_idx on public.projects (user_id, deleted_at) where deleted_at is not null;

-- Who can see a project: the owner always (even when deleted);
-- friends and admins only while it's NOT deleted.
-- (Materials, photos, status history, hearts, and comments all check this
-- same rule, so they disappear for others too.)
drop policy if exists "projects: read" on public.projects;
create policy "projects: read" on public.projects for select to authenticated
  using (
    user_id = auth.uid()
    or (
      deleted_at is null
      and (public.is_friend(user_id) or public.has_permission('projects.view_all'))
    )
  );


-- OPTIONAL: also clean up in the database itself every night, for people who
-- never come back to the app. This needs the pg_cron extension (Supabase >
-- Database > Extensions > pg_cron). Note: this removes the database rows only;
-- the photo files stay in Storage (the app removes those when it cleans up).
-- To use it, remove the two dashes at the start of the next line:
-- select cron.schedule('purge-deleted-projects', '0 3 * * *', $$ delete from public.projects where deleted_at < now() - interval '30 days' $$);
