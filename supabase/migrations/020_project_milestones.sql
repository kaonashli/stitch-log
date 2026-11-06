-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- 020: Milestones (your own steps and plans inside a project, like tasks
--      under a user story): "Swatch", "Finish the back", "Blocking"...
--   - optional target date, and done_at = when you ticked it off
--   - anyone who can see the project can see its milestones (friends);
--     only the owner adds, edits, ticks, reorders, or deletes them
--
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.project_milestones (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 120),
  due_date   date,         -- optional target date (the plan)
  done_at    timestamptz,  -- null = not done yet
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_milestones_project_idx on public.project_milestones (project_id, sort_order);

alter table public.project_milestones enable row level security;

-- Visible if you can see the project (the projects rules decide that:
-- owner, or friends while it's not private or deleted)
drop policy if exists "milestones: read" on public.project_milestones;
create policy "milestones: read" on public.project_milestones for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

-- Only the project's owner changes them
drop policy if exists "milestones: write own" on public.project_milestones;
create policy "milestones: write own" on public.project_milestones for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
