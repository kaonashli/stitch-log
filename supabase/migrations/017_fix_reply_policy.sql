-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- 017: Fix "infinite recursion detected in policy for relation
--      project_comments" when replying to a comment.
--
-- The insert rule from 016 looked inside project_comments (to check the
-- comment being replied to is on the same project). A table's rules can't
-- read that same table, so Postgres stopped with "infinite recursion".
-- The check now lives in a small "security definer" function, which reads
-- the table without going through its rules.
--
-- Safe to run more than once.
-- =====================================================================

-- Is this comment on this project?
create or replace function public.comment_is_on_project(comment uuid, project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_comments c where c.id = comment and c.project_id = project
  );
$$;
grant execute on function public.comment_is_on_project(uuid, uuid) to authenticated;

drop policy if exists "comments: friends and owner add" on public.project_comments;
create policy "comments: friends and owner add" on public.project_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and (p.user_id = auth.uid() or public.is_friend(p.user_id))
    )
    -- a reply has to be on the same project as the comment it answers
    and (parent_id is null or public.comment_is_on_project(parent_id, project_id))
  );
