-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- 018: Badges widget + "new badge" notifications
--   1. New widget type 'badges', added to the top of everyone's profile
--      (and to new members' default widgets)
--   2. user_badges: which badges each person already has, so the app can
--      tell when a NEW one is earned
--   3. sync_badges(): the app sends the badges you have now; new ones get
--      a notification, lost ones (deleted projects) are removed along with
--      their notification
--
-- Safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Badges widget
-- ---------------------------------------------------------------------
alter table public.profile_widgets drop constraint if exists profile_widgets_widget_type_check;
alter table public.profile_widgets add constraint profile_widgets_widget_type_check
  check (widget_type in ('calendar', 'kanban', 'gallery', 'made_for', 'fibers', 'focus', 'badges'));

-- Everyone who doesn't have one gets a badges widget at the top:
-- first move their other widgets down one spot...
update public.profile_widgets w
set position = position + 1
where not exists (
  select 1 from public.profile_widgets b where b.user_id = w.user_id and b.widget_type = 'badges'
);
-- ...then add it in the first spot
insert into public.profile_widgets (user_id, widget_type, position)
select pr.id, 'badges', 0
from public.profiles pr
where not exists (
  select 1 from public.profile_widgets b where b.user_id = pr.id and b.widget_type = 'badges'
);

-- New members start with badges, project board, and timeline
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  );

  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.name = 'user';

  insert into public.profile_widgets (user_id, widget_type, position) values
    (new.id, 'badges',   0),
    (new.id, 'kanban',   1),
    (new.id, 'calendar', 2);

  -- The extras below must never stop someone from signing up, so any
  -- problem is only logged as a warning.
  begin
    -- Tell everyone who manages users that someone new joined
    insert into public.notifications (recipient_id, actor_id, type)
    select distinct ur.user_id, new.id, 'new_user'
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where p.key = 'users.manage' and ur.user_id <> new.id;

    -- Friend requests from the admins and from Buddy. The friendships
    -- trigger turns each one into a "new friend request" notification.
    insert into public.friendships (requester_id, addressee_id, status)
    select distinct pr.id, new.id, 'pending'
    from public.profiles pr
    where pr.id <> new.id
      and (
        lower(pr.username) = lower('BuddyTheYarnahoLic')
        or pr.id in (
          select ur.user_id from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where r.name = 'admin'
        )
      )
    on conflict do nothing;
  exception when others then
    raise warning 'handle_new_user extras failed: %', sqlerrm;
  end;

  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. Badges each person already has
--    Only written by sync_badges() below (no insert/update/delete rules).
-- ---------------------------------------------------------------------
create table if not exists public.user_badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  badge_id  text not null check (badge_id ~ '^[a-z0-9-]{1,40}$'), -- e.g. 'knitter-5' (see src/lib/badges.js)
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.user_badges enable row level security;

drop policy if exists "user_badges: read own" on public.user_badges;
create policy "user_badges: read own" on public.user_badges for select to authenticated
  using (user_id = auth.uid());

-- When we last checked your badges. Empty = never: that first check just
-- remembers the badges you already have, without a pile of notifications.
alter table public.profiles add column if not exists badges_checked_at timestamptz;

-- Badge notifications point at the badge row, so losing the badge
-- removes its notification too
alter table public.notifications
  add column if not exists user_badge_id uuid references public.user_badges(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'like', 'comment', 'feedback', 'mention', 'reply', 'new_user', 'badge'));


-- ---------------------------------------------------------------------
-- 3. sync_badges(earned): earned = the ids of every badge you have now.
--    Returns the ids of badges that are NEW since last time (empty on the
--    very first check), so the app can say congratulations.
-- ---------------------------------------------------------------------
create or replace function public.sync_badges(earned text[])
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  first_check boolean;
begin
  if me is null or earned is null or cardinality(earned) > 200 then
    return;
  end if;

  select badges_checked_at is null into first_check from public.profiles where id = me;

  -- Badges you no longer have (e.g. you deleted the projects that earned them).
  -- Their notifications go with them (user_badge_id cascade).
  delete from public.user_badges
  where user_id = me and not (badge_id = any (earned));

  -- New badges: remember them, and (except on the first check) notify you
  return query
  with added as (
    insert into public.user_badges (user_id, badge_id)
    select me, b
    from unnest(earned) as b
    where b ~ '^[a-z0-9-]{1,40}$'
    on conflict (user_id, badge_id) do nothing
    returning id, badge_id
  ),
  notified as (
    insert into public.notifications (recipient_id, actor_id, type, user_badge_id)
    select me, null, 'badge', added.id
    from added
    where not first_check
    returning 1
  )
  select added.badge_id from added where not first_check;

  update public.profiles set badges_checked_at = now() where id = me;
end;
$$;
grant execute on function public.sync_badges(text[]) to authenticated;
