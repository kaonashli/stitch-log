-- =====================================================================
-- Migration 007: make material costs private
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Works whether or not you ran 006.)
--
-- Friends can see your materials, so a cost stored ON a material would be
-- visible to them too. Row Level Security works per row, not per column, so
-- costs move to their own table that only the owner can read or change.
-- One row per material that has a cost. The Amount stays on the material.
-- =====================================================================
create table if not exists public.material_costs (
  material_id uuid primary key references public.project_materials(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  cost        numeric(10, 2) not null check (cost >= 0) -- price for ONE; the app multiplies by the amount
);

alter table public.material_costs enable row level security;

drop policy if exists "material costs: owner only" on public.material_costs;
create policy "material costs: owner only" on public.material_costs for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.project_materials m
      join public.projects p on p.id = m.project_id
      where m.id = material_id and p.user_id = auth.uid()
    )
  );

-- If migration 006 put a "cost" column on project_materials, copy any costs
-- into the private table, then remove that column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_materials' and column_name = 'cost'
  ) then
    insert into public.material_costs (material_id, user_id, cost)
    select m.id, p.user_id, m.cost
    from public.project_materials m
    join public.projects p on p.id = m.project_id
    where m.cost is not null
    on conflict (material_id) do nothing;

    alter table public.project_materials drop column cost;
  end if;
end $$;
