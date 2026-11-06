-- =====================================================================
-- Migration 003: project description, private notes, live friend requests
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 002_project_icon_color.sql first if you haven't yet.)
-- =====================================================================

-- 1. Description: part of the project, so friends can see it
--    (the existing projects policies already allow that).
alter table public.projects
  add column if not exists description text;

alter table public.projects drop constraint if exists projects_description_length;
alter table public.projects add constraint projects_description_length
  check (description is null or char_length(description) <= 5000);


-- 2. Personal notes: PRIVATE, so they live in their own table with
--    owner-only rules. (Row Level Security works per row, not per column,
--    so a column on projects would be visible to friends.)
create table if not exists public.project_notes (
  project_id uuid primary key references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  notes      text not null default '' check (char_length(notes) <= 10000),
  updated_at timestamptz not null default now()
);

drop trigger if exists project_notes_set_updated_at on public.project_notes;
create trigger project_notes_set_updated_at
  before update on public.project_notes
  for each row execute function public.set_updated_at();

alter table public.project_notes enable row level security;

drop policy if exists "notes: owner only" on public.project_notes;
create policy "notes: owner only" on public.project_notes for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );


-- 3. Live updates for friend requests: lets the app hear about new requests
--    and acceptances the moment they happen (for the badge and pop-up messages).
--    Realtime still respects Row Level Security, so you only hear about your own.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;
