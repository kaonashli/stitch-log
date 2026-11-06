-- RUN IN SUPABASE: yes, on 2026-11-06 (confirmed from the app: the colors column exists)
-- =====================================================================
-- 022: Color tags for materials
--   - project_materials.colors: color tags picked from a list (Red, Navy,
--     Multicolor...), several for variegated yarn. The old free-text
--     "color" stays as the brand's color name (e.g. "Charcoal Heather").
--   - Old color names are tagged automatically where a color word is found
--     in them ("Dark Grey Heather" -> Grey). Only materials with no tags yet.
--   - wishlist_of() now also returns the color tags.
--
-- The tag names must match COLOR_TAGS in src/lib/constants.js.
-- Safe to run more than once.
-- =====================================================================

alter table public.project_materials add column if not exists colors text[];
alter table public.project_materials drop constraint if exists project_materials_colors_count;
alter table public.project_materials add constraint project_materials_colors_count
  check (colors is null or cardinality(colors) <= 10);

-- Tag old color names. Each row: a word to look for (whole word, any case),
-- the tag it means, and the tag's place in the list (keeps tags in order).
with words (pattern, tag, place) as (
  values
    ('white|off.white', 'White', 1),
    ('cream|ivory|ecru|natural|oatmeal', 'Cream', 2),
    ('beige|tan|camel|sand|khaki|taupe', 'Beige', 3),
    ('brown|chocolate|coffee|mocha|chestnut', 'Brown', 4),
    ('grey|gray|heather grey|heather gray', 'Grey', 5),
    ('charcoal|slate', 'Charcoal', 6),
    ('black|ebony|jet', 'Black', 7),
    ('red|scarlet|crimson|cherry', 'Red', 8),
    ('burgundy|maroon|wine|oxblood', 'Burgundy', 9),
    ('pink|rose|blush|fuchsia|magenta', 'Pink', 10),
    ('coral|salmon|peach', 'Coral', 11),
    ('orange|pumpkin|tangerine', 'Orange', 12),
    ('rust|copper|terracotta|brick', 'Rust', 13),
    ('mustard|ochre', 'Mustard', 14),
    ('yellow|lemon|sunshine', 'Yellow', 15),
    ('gold|golden', 'Gold', 16),
    ('olive|moss|khaki green', 'Olive', 17),
    ('green|emerald|forest|sage|kelly', 'Green', 18),
    ('mint|seafoam', 'Mint', 19),
    ('teal|peacock', 'Teal', 20),
    ('turquoise|aqua|cyan', 'Turquoise', 21),
    ('blue|denim|sky|cobalt|royal blue|periwinkle', 'Blue', 22),
    ('navy|midnight', 'Navy', 23),
    ('purple|violet|plum|grape|eggplant|aubergine', 'Purple', 24),
    ('lavender|lilac|mauve', 'Lavender', 25),
    ('silver', 'Silver', 26),
    ('multi|multicolou?r|rainbow|variegated|speckled|ombre', 'Multicolor', 27)
)
update public.project_materials m
set colors = tags.list
from (
  select m2.id,
         array_agg(w.tag order by w.place) as list
  from public.project_materials m2
  join words w on m2.color ~* ('\m(' || w.pattern || ')\M')
  where m2.colors is null and m2.color is not null
  group by m2.id
) as tags
where m.id = tags.id;

-- The wish list also returns the color tags. Adding a column to what a
-- function returns means dropping and re-creating it.
drop function if exists public.wishlist_of(uuid);
create function public.wishlist_of(target uuid)
returns table (
  id uuid, material_type text, brand text, color text, colors text[], weight text, yardage numeric,
  size text, notes text, quantity integer, fibers text[],
  project_id uuid, project_title text, project_icon text, project_color text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.material_type, m.brand, m.color, m.colors, m.weight, m.yardage,
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
