-- RUN IN SUPABASE: yes (exact date unknown, on or before 2026-11-05)
-- =====================================================================
-- Migration 014: private projects
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 011 first if you haven't yet.)
--
-- A private project can only be seen by its owner: not friends, not admins.
-- Hearts, comments, materials, photos, and friend activity follow the same
-- rule (they all check whether you can see the project).
-- Private projects still count in number-only stats, through the two
-- functions below, which return counts and nothing else.
-- =====================================================================
alter table public.projects add column if not exists is_private boolean not null default false;

-- Who can see a project: the owner always. Everyone else only if it's
-- not deleted and not private (and they're a friend, or an admin).
drop policy if exists "projects: read" on public.projects;
create policy "projects: read" on public.projects for select to authenticated
  using (
    user_id = auth.uid()
    or (
      deleted_at is null
      and not is_private
      and (public.is_friend(user_id) or public.has_permission('projects.view_all'))
    )
  );


-- Project counts for a profile (private ones included, deleted ones not).
-- Only for yourself, your friends, or user managers; anyone else gets zeros.
create or replace function public.profile_project_counts(target uuid)
returns table (total bigint, in_progress bigint, finished bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where status = 'in_progress'),
    count(*) filter (where status = 'finished')
  from public.projects
  where user_id = target
    and deleted_at is null
    and (target = auth.uid() or public.is_friend(target) or public.has_permission('users.manage'));
$$;
grant execute on function public.profile_project_counts(uuid) to authenticated;

-- Total number of projects for the admin dashboard (private ones included)
create or replace function public.admin_project_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.projects
  where deleted_at is null and public.has_permission('projects.view_all');
$$;
grant execute on function public.admin_project_count() to authenticated;
