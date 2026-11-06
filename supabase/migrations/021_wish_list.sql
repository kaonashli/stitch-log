-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- 021: Wish list
--   - project_materials.on_wishlist: a "To buy" material you've put on
--     your wish list (the gift button on the shopping list)
--   - wishlist_of(target): your wish list, or a friend's. It includes
--     items from private projects (only the item, not the project's name),
--     never costs, and only things still to buy.
--   - new widget type 'wishlist' (friends see it on your profile)
--
-- Safe to run more than once.
-- =====================================================================

alter table public.project_materials
  add column if not exists on_wishlist boolean not null default false;

-- Your wish list, or a friend's. Anyone else gets nothing.
create or replace function public.wishlist_of(target uuid)
returns table (
  id uuid, material_type text, brand text, color text, weight text, yardage numeric,
  size text, notes text, quantity integer, fibers text[],
  project_id uuid, project_title text, project_icon text, project_color text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.material_type, m.brand, m.color, m.weight, m.yardage,
         m.size, m.notes, m.quantity, m.fibers,
         -- a private project's name stays hidden from friends
         case when p.is_private and target <> auth.uid() then null else p.id end,
         case when p.is_private and target <> auth.uid() then null else p.title end,
         case when p.is_private and target <> auth.uid() then null else p.icon end,
         case when p.is_private and target <> auth.uid() then null else p.color end
  from public.project_materials m
  join public.projects p on p.id = m.project_id
  where p.user_id = target
    and p.deleted_at is null
    and m.on_wishlist
    and m.status = 'to_buy'
    and (target = auth.uid() or public.is_friend(target))
  order by p.title, m.sort_order;
$$;
grant execute on function public.wishlist_of(uuid) to authenticated;

alter table public.profile_widgets drop constraint if exists profile_widgets_widget_type_check;
alter table public.profile_widgets add constraint profile_widgets_widget_type_check
  check (widget_type in ('calendar', 'kanban', 'gallery', 'made_for', 'fibers', 'focus', 'badges', 'wishlist'));
