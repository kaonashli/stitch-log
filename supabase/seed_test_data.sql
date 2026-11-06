-- =====================================================================
-- Stitch Log - add FAKE test projects to the first account
--
-- Run in Supabase > SQL Editor. Remove it all with delete_test_data.sql.
-- Needs migrations 002-007 to have been run first.
-- Already seeded before? Run delete_test_data.sql, then this again.
--
-- Every test project has a fixed id starting with '5eed0000-', so the
-- delete script removes exactly these and never touches your real projects.
-- Dates are relative to today, so the calendar widget always has
-- recent activity to show.
-- =====================================================================
do $$
declare
  me   uuid;
  knit smallint;
  croc smallint;
  -- helper: "N days ago at 10:00" as a timestamp
  d    date := current_date;
begin
  -- The oldest account (right now, the only one)
  select id into me from public.profiles order by created_at limit 1;
  if me is null then
    raise exception 'No account found. Sign up in the app first.';
  end if;

  select id into knit from public.craft_types where slug = 'knitting';
  select id into croc from public.craft_types where slug = 'crochet';

  -- ---------- Projects ----------
  insert into public.projects (id, user_id, title, craft_type_id, status, start_date, finish_date, made_for, pattern_url, icon, color) values
    ('5eed0000-0000-4000-8000-000000000001', me, 'Cabled Winter Sweater', knit, 'in_progress', d - 40,  null,     'Me',                 'https://www.ravelry.com/patterns/library/example-cabled-sweater', 'sweater', 'denim'),
    ('5eed0000-0000-4000-8000-000000000002', me, 'Granny Square Blanket', croc, 'in_progress', d - 75,  null,     'Living room couch',  null, 'bed', 'honey'),
    ('5eed0000-0000-4000-8000-000000000003', me, 'Amigurumi Fox',         croc, 'finished',    d - 60,  d - 45,   'My niece',           'https://www.ravelry.com/patterns/library/example-fox', 'cat', 'coral'),
    ('5eed0000-0000-4000-8000-000000000004', me, 'Lace Shawl',            knit, 'paused',      d - 100, null,     'Grandma',            null, 'flower', 'lavender'),
    ('5eed0000-0000-4000-8000-000000000005', me, 'Baby Booties',          knit, 'finished',    d - 25,  d - 18,   'Baby shower gift',   null, 'baby', 'sage'),
    ('5eed0000-0000-4000-8000-000000000006', me, 'Market Tote Bag',       croc, 'idea',        d - 5,   null,     null,                 'https://www.ravelry.com/patterns/library/example-tote', 'shopping-bag', 'olive'),
    ('5eed0000-0000-4000-8000-000000000007', me, 'Fair Isle Hat',         knit, 'frogged',     d - 90,  null,     'Me',                 null, 'snowflake', 'teal'),
    ('5eed0000-0000-4000-8000-000000000008', me, 'Striped Socks',         knit, 'in_progress', d - 12,  null,     'Me',                 null, 'footprints', 'plum'),
    ('5eed0000-0000-4000-8000-000000000009', me, 'Chunky Cardigan',       croc, 'idea',        d - 2,   null,     null,                 null, 'sweater', 'cocoa'),
    ('5eed0000-0000-4000-8000-000000000010', me, 'Bobble Pillow Cover',   croc, 'finished',    d - 150, d - 120,  'Mom',                null, 'sofa', 'berry'),
    ('5eed0000-0000-4000-8000-000000000011', me, 'Cozy Mittens',          knit, 'paused',      d - 35,  null,     'My partner',         null, 'hand', 'slate');

  -- ---------- Status history ----------
  -- The trigger just logged every project as changed "now". Replace that
  -- with a realistic, backdated history so the calendar looks real.
  delete from public.project_status_history where project_id::text like '5eed0000-%';

  insert into public.project_status_history (project_id, status, changed_at) values
    ('5eed0000-0000-4000-8000-000000000001', 'in_progress', (d - 40)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000002', 'in_progress', (d - 75)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000002', 'paused',      (d - 50)  + time '19:30'),
    ('5eed0000-0000-4000-8000-000000000002', 'in_progress', (d - 30)  + time '09:15'),
    ('5eed0000-0000-4000-8000-000000000003', 'in_progress', (d - 60)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000003', 'finished',    (d - 45)  + time '21:00'),
    ('5eed0000-0000-4000-8000-000000000004', 'idea',        (d - 110) + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000004', 'in_progress', (d - 100) + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000004', 'paused',      (d - 20)  + time '18:00'),
    ('5eed0000-0000-4000-8000-000000000005', 'in_progress', (d - 25)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000005', 'finished',    (d - 18)  + time '20:00'),
    ('5eed0000-0000-4000-8000-000000000006', 'idea',        (d - 5)   + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000007', 'in_progress', (d - 90)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000007', 'frogged',     (d - 70)  + time '22:00'),
    ('5eed0000-0000-4000-8000-000000000008', 'in_progress', (d - 12)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000009', 'idea',        (d - 2)   + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000010', 'in_progress', (d - 150) + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000010', 'finished',    (d - 120) + time '20:00'),
    ('5eed0000-0000-4000-8000-000000000011', 'in_progress', (d - 35)  + time '10:00'),
    ('5eed0000-0000-4000-8000-000000000011', 'paused',      (d - 15)  + time '18:00');

  -- ---------- Materials ----------
  insert into public.project_materials (project_id, material_type, brand, color, weight, yardage, gauge, size, notes) values
    ('5eed0000-0000-4000-8000-000000000001', 'yarn',     'Cascade 220',      'Charcoal Heather', 'Worsted',   1320, '20 sts x 26 rows = 10 cm', null,     null),
    ('5eed0000-0000-4000-8000-000000000001', 'needle',   null,               null,               null,        null, null,                       '4.5 mm', 'Circular, 80 cm'),
    ('5eed0000-0000-4000-8000-000000000001', 'needle',   null,               null,               null,        null, null,                       '3.75 mm','For the ribbing'),
    ('5eed0000-0000-4000-8000-000000000002', 'yarn',     'Stylecraft Special','Mixed scraps',    'DK',        1800, null,                       null,     'Using up the stash'),
    ('5eed0000-0000-4000-8000-000000000002', 'needle',   null,               null,               null,        null, null,                       '4.0 mm', 'Crochet hook'),
    ('5eed0000-0000-4000-8000-000000000003', 'yarn',     'Paintbox Cotton',  'Burnt Orange',     'DK',        150,  null,                       null,     null),
    ('5eed0000-0000-4000-8000-000000000003', 'yarn',     'Paintbox Cotton',  'White',            'DK',        40,   null,                       null,     null),
    ('5eed0000-0000-4000-8000-000000000003', 'needle',   null,               null,               null,        null, null,                       '3.0 mm', 'Crochet hook'),
    ('5eed0000-0000-4000-8000-000000000003', 'stuffing', null,               null,               null,        null, null,                       null,     'Polyester fiberfill'),
    ('5eed0000-0000-4000-8000-000000000003', 'buttons',  null,               'Black',            null,        null, null,                       null,     '2 safety eyes, 9 mm'),
    ('5eed0000-0000-4000-8000-000000000004', 'yarn',     'Malabrigo Lace',   'Rosado',           'Lace',      470,  '24 sts = 10 cm after blocking', null, null),
    ('5eed0000-0000-4000-8000-000000000004', 'needle',   null,               null,               null,        null, null,                       '3.5 mm', null),
    ('5eed0000-0000-4000-8000-000000000005', 'yarn',     'Sirdar Snuggly',   'Mint',             'DK',        110,  null,                       null,     null),
    ('5eed0000-0000-4000-8000-000000000005', 'buttons',  null,               'Pearl white',      null,        null, null,                       null,     '4 small buttons'),
    ('5eed0000-0000-4000-8000-000000000006', 'string',   null,               null,               null,        null, null,                       null,     'Natural cotton macrame cord, 5 mm'),
    ('5eed0000-0000-4000-8000-000000000008', 'yarn',     'Regia 4-ply',      'Ocean stripes',    'Fingering', 460,  '32 sts x 44 rows = 10 cm', null,     null),
    ('5eed0000-0000-4000-8000-000000000008', 'needle',   null,               null,               null,        null, null,                       '2.5 mm', 'DPNs'),
    ('5eed0000-0000-4000-8000-000000000010', 'yarn',     'Lion Brand Wool-Ease', 'Fisherman',    'Worsted',   400,  null,                       null,     null),
    ('5eed0000-0000-4000-8000-000000000010', 'buttons',  null,               'Wood',             null,        null, null,                       null,     '3 large wooden buttons'),
    ('5eed0000-0000-4000-8000-000000000011', 'yarn',     'Drops Alaska',     'Red',              'Aran',      220,  null,                       null,     null),
    ('5eed0000-0000-4000-8000-000000000011', 'needle',   null,               null,               null,        null, null,                       '5.0 mm', null);

  -- A few materials still to buy (they show on the home shopping list)
  update public.project_materials set status = 'to_buy'
  where (project_id = '5eed0000-0000-4000-8000-000000000001' and size = '3.75 mm')
     or (project_id = '5eed0000-0000-4000-8000-000000000006')
     or (project_id = '5eed0000-0000-4000-8000-000000000008' and material_type = 'needle')
     or (project_id = '5eed0000-0000-4000-8000-000000000004' and material_type = 'yarn');

  insert into public.project_materials (project_id, material_type, status, brand, color, weight, yardage, notes) values
    ('5eed0000-0000-4000-8000-000000000009', 'yarn',    'to_buy', 'Lion Brand Wool-Ease Thick & Quick', 'Oatmeal', 'Super Bulky', 600, null),
    ('5eed0000-0000-4000-8000-000000000009', 'buttons', 'to_buy', null, 'Brown', null, null, '6 toggle buttons'),
    ('5eed0000-0000-4000-8000-000000000002', 'yarn',    'to_buy', 'Stylecraft Special', 'Cream', 'DK', 300, 'For the border');

  -- ---------- Difficulty ----------
  update public.projects set difficulty = v.difficulty
  from (values
    ('5eed0000-0000-4000-8000-000000000001'::uuid, 4), ('5eed0000-0000-4000-8000-000000000002'::uuid, 1),
    ('5eed0000-0000-4000-8000-000000000003'::uuid, 3), ('5eed0000-0000-4000-8000-000000000004'::uuid, 5),
    ('5eed0000-0000-4000-8000-000000000005'::uuid, 2), ('5eed0000-0000-4000-8000-000000000007'::uuid, 4),
    ('5eed0000-0000-4000-8000-000000000008'::uuid, 3), ('5eed0000-0000-4000-8000-000000000010'::uuid, 2),
    ('5eed0000-0000-4000-8000-000000000011'::uuid, 2)
  ) as v(id, difficulty)
  where projects.id = v.id;

  -- ---------- Amounts and costs on materials ----------
  -- cost = price for ONE (private, in material_costs); the app multiplies by quantity (the "Amount")
  update public.project_materials set quantity = 12
    where project_id = '5eed0000-0000-4000-8000-000000000001' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 8.99 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000001' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 14.50 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000001' and material_type = 'needle';
  update public.project_materials set quantity = 6
    where project_id = '5eed0000-0000-4000-8000-000000000002' and material_type = 'yarn' and status = 'owned';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 4.29 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000002' and material_type = 'yarn' and status = 'owned';
  update public.project_materials set quantity = 2
    where project_id = '5eed0000-0000-4000-8000-000000000002' and material_type = 'yarn' and status = 'to_buy';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 4.29 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000002' and material_type = 'yarn' and status = 'to_buy';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 4.75 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000003' and material_type = 'yarn';
  update public.project_materials set quantity = 2
    where project_id = '5eed0000-0000-4000-8000-000000000003' and material_type = 'buttons';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 1.60 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000003' and material_type = 'buttons';
  update public.project_materials set quantity = 2
    where project_id = '5eed0000-0000-4000-8000-000000000004' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 16.00 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000004' and material_type = 'yarn';
  update public.project_materials set quantity = 2
    where project_id = '5eed0000-0000-4000-8000-000000000005' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 3.50 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000005' and material_type = 'yarn';
  update public.project_materials set quantity = 4
    where project_id = '5eed0000-0000-4000-8000-000000000005' and material_type = 'buttons';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 0.60 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000005' and material_type = 'buttons';
  update public.project_materials set quantity = 5
    where project_id = '5eed0000-0000-4000-8000-000000000009' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 12.99 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000009' and material_type = 'yarn';
  update public.project_materials set quantity = 6
    where project_id = '5eed0000-0000-4000-8000-000000000009' and material_type = 'buttons';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 1.25 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000009' and material_type = 'buttons';
  update public.project_materials set quantity = 3
    where project_id = '5eed0000-0000-4000-8000-000000000010' and material_type = 'yarn';
  insert into public.material_costs (material_id, user_id, cost)
    select id, me, 5.32 from public.project_materials where project_id = '5eed0000-0000-4000-8000-000000000010' and material_type = 'yarn';

  raise notice 'Added 11 test projects for user %', me;
end $$;
