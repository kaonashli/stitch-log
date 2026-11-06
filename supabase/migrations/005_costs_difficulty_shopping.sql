-- RUN IN SUPABASE: yes (exact date unknown, on or before 2026-11-05)
-- =====================================================================
-- Migration 005: costs, difficulty, and "to buy" materials
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 002-004 first if you haven't yet.)
-- =====================================================================

-- 1. Difficulty rating: 1 (beginner) to 5 (expert), optional
alter table public.projects
  add column if not exists difficulty smallint;

alter table public.projects drop constraint if exists projects_difficulty_range;
alter table public.projects add constraint projects_difficulty_range
  check (difficulty is null or difficulty between 1 and 5);


-- 2. Materials: do you still need to buy it, or do you already have it?
--    Existing materials count as already owned.
alter table public.project_materials
  add column if not exists status text not null default 'owned',
  add column if not exists sort_order smallint not null default 0;

alter table public.project_materials drop constraint if exists project_materials_status_valid;
alter table public.project_materials add constraint project_materials_status_valid
  check (status in ('to_buy', 'owned'));

-- Fast lookup for the home page shopping list
create index if not exists project_materials_to_buy_idx
  on public.project_materials (project_id) where status = 'to_buy';


-- 3. Costs: any number of (description, amount) lines per project.
--    PRIVATE: only the owner can see what they spent.
create table if not exists public.project_costs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 100),
  amount      numeric(10, 2) not null check (amount >= 0),
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists project_costs_project_idx on public.project_costs (project_id, sort_order);

alter table public.project_costs enable row level security;

drop policy if exists "costs: owner only" on public.project_costs;
create policy "costs: owner only" on public.project_costs for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
