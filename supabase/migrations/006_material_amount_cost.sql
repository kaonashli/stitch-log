-- =====================================================================
-- Migration 006: amount and cost on materials
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
--
-- Every material gets:
--   quantity - how many (the "Amount" in the app), at least 1, default 1
--   cost     - optional price for ONE of them; the app multiplies by the
--              amount and adds everything up for the project's total cost
--
-- This replaces the separate project_costs table (the Costs section),
-- which the app no longer uses.
--
-- NOTE: migration 007 later moves cost into its own PRIVATE table and removes
-- this column. Run 007 after this one.
-- =====================================================================
alter table public.project_materials
  add column if not exists quantity integer not null default 1,
  add column if not exists cost numeric(10, 2);

alter table public.project_materials drop constraint if exists project_materials_quantity_min;
alter table public.project_materials add constraint project_materials_quantity_min
  check (quantity between 1 and 9999);

alter table public.project_materials drop constraint if exists project_materials_cost_min;
alter table public.project_materials add constraint project_materials_cost_min
  check (cost is null or cost >= 0);


-- OPTIONAL: delete the old, now unused costs table and everything in it.
-- Remove the two dashes at the start of the next line to run it.
-- Only do this once you're sure you don't need the old cost lines.
-- drop table if exists public.project_costs;
