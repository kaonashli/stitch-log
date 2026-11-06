-- RUN IN SUPABASE: yes, the original version (date unknown, on or before 2026-11-05).
-- Later additions to this file came from migrations 002-016, which were run separately.
-- =====================================================================
-- Stitch Log - initial database schema
--
-- How to run: Supabase Dashboard > SQL Editor > New query > paste this
-- whole file > Run. Run it once on a fresh project.
--
-- Passwords are NOT stored here. Supabase Auth (auth.users) handles
-- signup/login and stores passwords hashed with bcrypt. Our tables only
-- hold profile and app data, and reference auth.users by id.
--
-- Security model: every table has Row Level Security (RLS) turned on.
-- With RLS on, a table returns/changes NOTHING unless a policy allows it.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Shared helper: keep updated_at current on every UPDATE
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. Roles & permissions (generic, so new permissions can be added later)
--
--   roles             e.g. 'admin', 'user'
--   permissions       e.g. 'roles.manage', 'projects.view_all'
--   role_permissions  which permissions each role has
--   user_roles        which roles each user has
--
-- To gate a new feature later: insert a permission, attach it to a role,
-- then check it with has_permission('the.key') in RLS or my_permissions()
-- in the app.
-- ---------------------------------------------------------------------
create table public.roles (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  description text
);

create table public.permissions (
  id          smallint generated always as identity primary key,
  key         text not null unique,
  description text
);

create table public.role_permissions (
  role_id       smallint not null references public.roles(id) on delete cascade,
  permission_id smallint not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid     not null references auth.users(id) on delete cascade,
  role_id smallint not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Does the currently logged-in user have this permission?
-- "security definer" lets it read the role tables regardless of RLS;
-- "search_path = ''" prevents search-path hijacking (Supabase best practice).
create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p       on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.key = permission_key
  );
$$;

-- All permission keys of the logged-in user. The app calls this once
-- after login to decide what to show (e.g. the admin menu).
create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p       on p.id = rp.permission_id
  where ur.user_id = auth.uid();
$$;

-- Seed data
insert into public.roles (name, description) values
  ('admin', 'Full access to administration features'),
  ('user',  'Regular account');

insert into public.permissions (key, description) values
  ('admin.access',       'Can open the admin area'),
  ('roles.manage',       'Can create/edit roles and permissions and assign them'),
  ('users.manage',       'Can view and manage all users'),
  ('projects.view_all',  'Can view every project'),
  ('craft_types.manage', 'Can add/edit craft types');

-- Admin gets every permission that exists right now
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin';

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

-- Anyone logged in can read role/permission definitions; only role managers can change them
create policy "roles: read"   on public.roles for select to authenticated using (true);
create policy "roles: manage" on public.roles for all    to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy "permissions: read"   on public.permissions for select to authenticated using (true);
create policy "permissions: manage" on public.permissions for all    to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy "role_permissions: read"   on public.role_permissions for select to authenticated using (true);
create policy "role_permissions: manage" on public.role_permissions for all    to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

-- Users see their own roles; user managers see everyone's. Users can NEVER grant themselves roles.
create policy "user_roles: read own or manager" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy "user_roles: manage" on public.user_roles for all to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));


-- ---------------------------------------------------------------------
-- 2. Profiles (one row per user, created automatically at signup)
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  -- 3-20 chars, letters/numbers/underscore. Unique ignoring case (index below).
  username     text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  avatar_path  text,  -- path of the image inside the 'avatars' storage bucket
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- "Alice" and "alice" count as the same username
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Logged-in users can read profiles (needed for friend search by username)
create policy "profiles: read" on public.profiles for select to authenticated using (true);
-- You can only edit your own profile
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- No insert/delete policies: rows are created by the signup trigger and
-- removed when the auth user is deleted.

-- Limit which columns can be changed at all (id/created_at are locked)
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_path) on public.profiles to authenticated;

-- Signup form calls this before submitting, so we can say "username taken".
-- Works for logged-out visitors (anon) without exposing the profiles table.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(check_username)
  );
$$;
grant execute on function public.is_username_available(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Friendships (friend requests and accepted friends in one table)
--
--   pending  -> request sent, waiting on addressee
--   accepted -> they are friends
--   decline / cancel / unfriend = delete the row
-- ---------------------------------------------------------------------
create table public.friendships (
  id           bigint generated always as identity primary key,
  requester_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)  -- can't friend yourself
);

-- Only one row per pair, no matter who asked whom
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "friendships: read own" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
-- You can only send requests as yourself, and they must start as pending
create policy "friendships: send request" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
-- Only the person who received the request can accept it
create policy "friendships: accept" on public.friendships for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
-- Either person can delete (decline, cancel, unfriend)
create policy "friendships: delete own" on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

revoke update on public.friendships from anon, authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

-- Is the logged-in user friends with other_user?
create or replace function public.is_friend(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = other_user) or
        (f.addressee_id = auth.uid() and f.requester_id = other_user)
      )
  );
$$;


-- ---------------------------------------------------------------------
-- 4. Craft types (a table, not hard-coded, so more can be added later)
-- ---------------------------------------------------------------------
create table public.craft_types (
  id        smallint generated always as identity primary key,
  slug      text not null unique,
  name      text not null,
  is_active boolean not null default true  -- hide a type without deleting it
);

insert into public.craft_types (slug, name) values
  ('knitting', 'Knitting'),
  ('crochet',  'Crochet');

alter table public.craft_types enable row level security;

create policy "craft_types: read" on public.craft_types for select to authenticated using (true);
create policy "craft_types: manage" on public.craft_types for all to authenticated
  using (public.has_permission('craft_types.manage'))
  with check (public.has_permission('craft_types.manage'));


-- ---------------------------------------------------------------------
-- 5. Projects
-- ---------------------------------------------------------------------
create type public.project_status as enum ('idea', 'in_progress', 'paused', 'finished', 'frogged');

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title         text not null check (char_length(trim(title)) between 1 and 120),
  craft_type_id smallint not null references public.craft_types(id),
  status        public.project_status not null default 'idea',
  -- The app sends the user's local "today"; current_date (server/UTC) is just a fallback
  start_date    date not null default current_date,
  finish_date   date,
  made_for      text check (char_length(made_for) <= 100),          -- "Who it's for"
  pattern_url   text check (pattern_url is null or pattern_url ~* '^https?://'),
  -- Small icon + color picked when creating a project (names the app maps to an icon/color)
  icon          text not null default 'yarn' constraint projects_icon_format check (icon ~ '^[a-z0-9-]{1,40}$'),
  color         text not null default 'berry' constraint projects_color_format check (color ~ '^[a-z]{1,20}$'),
  -- Description is visible to friends (private notes are in project_notes)
  description   text constraint projects_description_length check (description is null or char_length(description) <= 5000),
  -- 1 (beginner) to 5 (expert), optional
  difficulty    smallint constraint projects_difficulty_range check (difficulty is null or difficulty between 1 and 5),
  -- Soft delete: set = in "Recently deleted" (only the owner sees it; gone for good after 30 days)
  deleted_at    timestamptz,
  -- Private: only the owner can see it (still counted in number-only stats)
  is_private    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (finish_date is null or finish_date >= start_date)
);

create index projects_user_idx on public.projects (user_id);
create index projects_deleted_idx on public.projects (user_id, deleted_at) where deleted_at is not null;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- You always see your own projects (even deleted or private ones).
-- Friends and admins with projects.view_all see them only while they're
-- not deleted and not private.
create policy "projects: read" on public.projects for select to authenticated
  using (
    user_id = auth.uid()
    or (
      deleted_at is null
      and not is_private
      and (public.is_friend(user_id) or public.has_permission('projects.view_all'))
    )
  );
create policy "projects: insert own" on public.projects for insert to authenticated
  with check (user_id = auth.uid());
create policy "projects: update own" on public.projects for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects: delete own" on public.projects for delete to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 6. Project status history (filled automatically by a trigger)
--    Powers the calendar widget (which days a project was in which status)
--    and later the activity feed.
-- ---------------------------------------------------------------------
create table public.project_status_history (
  id         bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  status     public.project_status not null,
  changed_at timestamptz not null default now()
);

create index project_status_history_project_idx on public.project_status_history (project_id, changed_at);

create or replace function public.log_project_status()
returns trigger
language plpgsql
security definer  -- users can't write history directly; only this trigger can
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_status_history (project_id, status) values (new.id, new.status);
  elsif new.status is distinct from old.status then
    insert into public.project_status_history (project_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger projects_log_status
  after insert or update of status on public.projects
  for each row execute function public.log_project_status();

alter table public.project_status_history enable row level security;

-- Visible if you can see the project (the subquery is itself filtered by the projects policy)
create policy "status_history: read" on public.project_status_history for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));


-- ---------------------------------------------------------------------
-- 7. Materials (0..many per project)
--    One table for all material types; columns that don't apply stay NULL.
--      yarn:     brand, color, weight, yardage, gauge
--      needle:   size  (also used for crochet hooks)
--      buttons:  color
--      string, stuffing: notes only
-- ---------------------------------------------------------------------
create table public.project_materials (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  material_type text not null check (material_type in ('yarn', 'needle', 'string', 'stuffing', 'buttons')),
  brand         text,
  color         text,
  weight        text,                                  -- e.g. 'DK', 'Worsted'
  yardage       numeric(8, 1) check (yardage >= 0),
  gauge         text,                                  -- e.g. '22 sts x 30 rows = 10cm'
  size          text,                                  -- e.g. '4.0 mm', 'US 6'
  notes         text,
  -- 'to_buy' = still need to get it (shows on the home shopping list), 'owned' = have it
  status        text not null default 'owned' constraint project_materials_status_valid check (status in ('to_buy', 'owned')),
  sort_order    smallint not null default 0,
  quantity      integer not null default 1 constraint project_materials_quantity_min check (quantity between 1 and 9999), -- "Amount" in the app
  created_at    timestamptz not null default now()
);

create index project_materials_project_idx on public.project_materials (project_id);
create index project_materials_to_buy_idx on public.project_materials (project_id) where status = 'to_buy';

alter table public.project_materials enable row level security;

create policy "materials: read" on public.project_materials for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
create policy "materials: write own" on public.project_materials for all to authenticated
  using      (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));


-- ---------------------------------------------------------------------
-- 7b. Material costs (PRIVATE: owner only). Separate table because friends
--     can see materials, and RLS works per row, not per column.
--     One row per material that has a cost; cost is the price for ONE
--     (the app multiplies by project_materials.quantity).
-- ---------------------------------------------------------------------
create table public.material_costs (
  material_id uuid primary key references public.project_materials(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  cost        numeric(10, 2) not null check (cost >= 0)
);

alter table public.material_costs enable row level security;

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


-- ---------------------------------------------------------------------
-- 8. Project photos (max 10 per project; owner + friends can view)
--    The image file lives in the 'project-photos' storage bucket at
--    '<user_id>/<project_id>/<file>'. This table stores the path + order.
-- ---------------------------------------------------------------------
create table public.project_photos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  sort_order   smallint not null default 0,
  is_cover     boolean not null default false, -- the project's main image (shown instead of its icon)
  created_at   timestamptz not null default now()
);

create index project_photos_project_idx on public.project_photos (project_id, sort_order);
-- Only one photo per project can be the main image
create unique index project_photos_one_cover on public.project_photos (project_id) where is_cover;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Lock the project row so two uploads at once can't both sneak in as #10
  perform 1 from public.projects where id = new.project_id for update;
  if (select count(*) from public.project_photos where project_id = new.project_id) >= 10 then
    raise exception 'A project can have at most 10 photos';
  end if;
  return new;
end;
$$;

create trigger project_photos_limit
  before insert on public.project_photos
  for each row execute function public.enforce_photo_limit();

alter table public.project_photos enable row level security;

-- Owner and friends can see photos; only the owner can add/change/delete them
create policy "photos: read" on public.project_photos for select to authenticated
  using (user_id = auth.uid() or public.is_friend(user_id));
create policy "photos: write own" on public.project_photos for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and split_part(storage_path, '/', 1) = auth.uid()::text
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );


-- ---------------------------------------------------------------------
-- 8b. Personal project notes (PRIVATE: owner only)
--     Separate table because RLS works per row, not per column - a column
--     on projects would be visible to friends.
-- ---------------------------------------------------------------------
create table public.project_notes (
  project_id uuid primary key references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  notes      text not null default '' check (char_length(notes) <= 10000),
  updated_at timestamptz not null default now()
);

create trigger project_notes_set_updated_at
  before update on public.project_notes
  for each row execute function public.set_updated_at();

alter table public.project_notes enable row level security;

create policy "notes: owner only" on public.project_notes for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );


-- ---------------------------------------------------------------------
-- 9. Profile widgets (drag-and-drop layout on the profile page)
-- ---------------------------------------------------------------------
create table public.profile_widgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  widget_type text not null check (widget_type in ('calendar', 'kanban')),  -- add new types here
  position    smallint not null default 0,          -- order on the page
  settings    jsonb not null default '{}'::jsonb,   -- per-widget options, e.g. {"projectId": "..."}
  created_at  timestamptz not null default now()
);

create index profile_widgets_user_idx on public.profile_widgets (user_id, position);

alter table public.profile_widgets enable row level security;

-- You and your friends can see your widgets (so friends see your profile); only you edit them
create policy "widgets: read" on public.profile_widgets for select to authenticated
  using (user_id = auth.uid() or public.is_friend(user_id));
create policy "widgets: write own" on public.profile_widgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 10. Signup trigger: when Supabase Auth creates a user, create their
--     profile, give them the 'user' role, and add default widgets.
--     username and display_name come from the signup form's metadata.
--     If either is missing/invalid/taken, the whole signup fails.
-- ---------------------------------------------------------------------
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
    (new.id, 'kanban',   0),
    (new.id, 'calendar', 1);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 11. Storage buckets + access rules
--
--   avatars         public read (shown in search/friend lists), 512 KB max,
--                   users can only write inside their own '<user_id>/' folder
--   project-photos  PRIVATE (not public URLs), 2 MB max (app compresses to ~300 KB),
--                   owner + friends can view, only the owner can write their folder
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true,  524288,  array['image/jpeg', 'image/png', 'image/webp']),
  ('project-photos', 'project-photos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Avatars: write only in your own folder
create policy "avatars: read own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Project photos: owner and friends can view; only the owner can upload/change/delete.
-- The first folder in the path is the owner's user id (enforced by the insert policy).
create policy "project-photos: read own or friend" on storage.objects for select to authenticated
  using (
    bucket_id = 'project-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_friend(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "project-photos: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "project-photos: update own" on storage.objects for update to authenticated
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "project-photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------
-- 12. Realtime: the app listens for friend request changes (badge and
--     pop-up messages). Realtime respects RLS, so users only hear about
--     their own friendships.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.friendships;


-- ---------------------------------------------------------------------
-- 13. Hearts, comments, and notifications (same as migrations/008)
-- ---------------------------------------------------------------------
-- ---------- Hearts ----------
create table if not exists public.project_likes (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id) -- one heart per person per project
);

alter table public.project_likes enable row level security;

-- Anyone who can see the project can see its hearts
drop policy if exists "likes: read" on public.project_likes;
create policy "likes: read" on public.project_likes for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
-- Only friends of the owner can heart, and only as themselves
drop policy if exists "likes: friends add" on public.project_likes;
create policy "likes: friends add" on public.project_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and public.is_friend(p.user_id))
  );
-- You can take back your own heart
drop policy if exists "likes: remove own" on public.project_likes;
create policy "likes: remove own" on public.project_likes for delete to authenticated
  using (user_id = auth.uid());


-- ---------- Comments ----------
create table if not exists public.project_comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists project_comments_project_idx on public.project_comments (project_id, created_at);

alter table public.project_comments enable row level security;

drop policy if exists "comments: read" on public.project_comments;
create policy "comments: read" on public.project_comments for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
-- Friends of the owner, and the owner, can comment (as themselves)
drop policy if exists "comments: friends and owner add" on public.project_comments;
create policy "comments: friends and owner add" on public.project_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and (p.user_id = auth.uid() or public.is_friend(p.user_id))
    )
  );
-- You can delete your own comments; the project owner can delete any comment on their project
drop policy if exists "comments: delete own or on own project" on public.project_comments;
create policy "comments: delete own or on own project" on public.project_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );


-- ---------- Notifications ----------
create table if not exists public.notifications (
  id            bigint generated always as identity primary key,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  actor_id      uuid not null references public.profiles(id) on delete cascade, -- who did it
  type          text not null check (type in ('friend_request', 'friend_accepted', 'like', 'comment')),
  project_id    uuid references public.projects(id) on delete cascade,
  -- deleting the comment / friendship deletes its notification too
  comment_id    uuid references public.project_comments(id) on delete cascade,
  friendship_id bigint references public.friendships(id) on delete cascade,
  created_at    timestamptz not null default now(),
  read_at       timestamptz -- null = not seen yet (counts toward the badge)
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- You only ever see, update (mark as read), or delete your own notifications.
-- There's no insert policy: only the triggers below create them.
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
drop policy if exists "notifications: mark own read" on public.notifications;
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;


-- ---------- Triggers that create / remove notifications ----------
-- "security definer" lets them write notifications for other people,
-- which normal users can't do.

-- Heart added -> tell the project owner (not if you heart your own)
create or replace function public.notify_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, project_id)
  select p.user_id, new.user_id, 'like', new.project_id
  from public.projects p
  where p.id = new.project_id and p.user_id <> new.user_id;
  return new;
end; $$;

-- Heart removed -> remove that notification
create or replace function public.unnotify_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications
  where type = 'like' and project_id = old.project_id and actor_id = old.user_id;
  return old;
end; $$;

-- Comment added -> tell the project owner (not if you comment on your own).
-- Deleting the comment removes the notification automatically (comment_id cascade).
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, project_id, comment_id)
  select p.user_id, new.user_id, 'comment', new.project_id, new.id
  from public.projects p
  where p.id = new.project_id and p.user_id <> new.user_id;
  return new;
end; $$;

-- Friend request sent -> tell the person it was sent to;
-- request accepted -> tell the person who sent it.
-- Cancel / decline / unfriend deletes the friendship, which removes these too.
create or replace function public.notify_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, actor_id, type, friendship_id)
    values (new.addressee_id, new.requester_id, 'friend_request', new.id);
  elsif new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, friendship_id)
    values (new.requester_id, new.addressee_id, 'friend_accepted', new.id);
  end if;
  return new;
end; $$;

drop trigger if exists project_likes_notify on public.project_likes;
create trigger project_likes_notify after insert on public.project_likes
  for each row execute function public.notify_like();

drop trigger if exists project_likes_unnotify on public.project_likes;
create trigger project_likes_unnotify after delete on public.project_likes
  for each row execute function public.unnotify_like();

drop trigger if exists project_comments_notify on public.project_comments;
create trigger project_comments_notify after insert on public.project_comments
  for each row execute function public.notify_comment();

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify after insert or update of status on public.friendships
  for each row execute function public.notify_friendship();


-- ---------- Live updates ----------
-- Lets the app hear about new / removed notifications right away (badge + pop-ups).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 14. Admin dashboard and feedback (same as migrations/009)
-- ---------------------------------------------------------------------
-- ---------- Last active ----------
-- Supabase records each user's last LOGIN (auth.users.last_sign_in_at), but
-- people stay logged in for weeks, so we also record when they last OPENED
-- the app. The app calls touch_last_seen() once each time it starts.
alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
grant execute on function public.touch_last_seen() to authenticated;


-- ---------- Admin: list every user with email and login dates ----------
-- Emails and login times live in Supabase's private auth.users table, so
-- this function reads them on the admin's behalf. Anyone without the
-- 'users.manage' permission just gets an empty list.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_path text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text, p.username, p.display_name, p.avatar_path,
         p.created_at, u.last_sign_in_at, p.last_seen_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.has_permission('users.manage')
  order by p.created_at;
$$;
grant execute on function public.admin_list_users() to authenticated;


-- ---------- Bug reports and change requests ----------
create table if not exists public.feedback_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('bug', 'change')),
  title      text not null check (char_length(trim(title)) between 1 and 120),
  details    text check (details is null or char_length(details) <= 4000),
  -- the admin moves these through a mini kanban
  status     text not null default 'new' check (status in ('new', 'planned', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_reports_status_idx on public.feedback_reports (status, created_at);

drop trigger if exists feedback_reports_set_updated_at on public.feedback_reports;
create trigger feedback_reports_set_updated_at
  before update on public.feedback_reports
  for each row execute function public.set_updated_at();

alter table public.feedback_reports enable row level security;

-- Anyone logged in can send a report (as themselves)
drop policy if exists "feedback: send" on public.feedback_reports;
create policy "feedback: send" on public.feedback_reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'new');
-- You see your own reports; admins with feedback.manage see all of them
drop policy if exists "feedback: read own or manager" on public.feedback_reports;
create policy "feedback: read own or manager" on public.feedback_reports for select to authenticated
  using (user_id = auth.uid() or public.has_permission('feedback.manage'));
-- Only managers can move reports between columns or delete them
drop policy if exists "feedback: manager updates" on public.feedback_reports;
create policy "feedback: manager updates" on public.feedback_reports for update to authenticated
  using (public.has_permission('feedback.manage')) with check (public.has_permission('feedback.manage'));
drop policy if exists "feedback: manager deletes" on public.feedback_reports;
create policy "feedback: manager deletes" on public.feedback_reports for delete to authenticated
  using (public.has_permission('feedback.manage'));

-- Updates can only change the status column
revoke update on public.feedback_reports from anon, authenticated;
grant update (status) on public.feedback_reports to authenticated;

-- New permission, given to the admin role
insert into public.permissions (key, description)
values ('feedback.manage', 'Can see and manage bug reports and change requests')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin' and p.key = 'feedback.manage'
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 15. Guest feedback (same as migrations/010)
-- ---------------------------------------------------------------------
alter table public.feedback_reports alter column user_id drop not null;

alter table public.feedback_reports
  add column if not exists guest_name text,
  add column if not exists guest_email text;

-- Every report needs a sender: an account, or a guest name
alter table public.feedback_reports drop constraint if exists feedback_reports_sender;
alter table public.feedback_reports add constraint feedback_reports_sender
  check (user_id is not null or (guest_name is not null and char_length(trim(guest_name)) between 1 and 60));

-- If a guest gives an email, it has to look like one
alter table public.feedback_reports drop constraint if exists feedback_reports_guest_email;
alter table public.feedback_reports add constraint feedback_reports_guest_email
  check (guest_email is null or (char_length(guest_email) <= 254 and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- Guests (not logged in) can send a report, with a name and no account
drop policy if exists "feedback: guests send" on public.feedback_reports;
create policy "feedback: guests send" on public.feedback_reports for insert to anon
  with check (user_id is null and status = 'new' and guest_name is not null);

grant insert on public.feedback_reports to anon;


-- ---------------------------------------------------------------------
-- 16. Notify admins about new feedback (same as migrations/013)
-- ---------------------------------------------------------------------
alter table public.notifications alter column actor_id drop not null;

alter table public.notifications
  add column if not exists feedback_id uuid references public.feedback_reports(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'like', 'comment', 'feedback'));

create or replace function public.notify_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, feedback_id)
  select distinct ur.user_id, new.user_id, 'feedback', new.id
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.profiles pr on pr.id = ur.user_id
  where p.key = 'feedback.manage'
    and ur.user_id is distinct from new.user_id; -- not for your own reports
  return new;
end; $$;

drop trigger if exists feedback_reports_notify on public.feedback_reports;
create trigger feedback_reports_notify after insert on public.feedback_reports
  for each row execute function public.notify_feedback();


-- ---------------------------------------------------------------------
-- 17. Project counts that include private projects (same as migrations/014)
-- ---------------------------------------------------------------------
-- Project counts for a profile (private ones included, deleted ones not).
-- Only for yourself, your friends, or user managers; anyone else gets zeros.
create or replace function public.profile_project_counts(target uuid)
returns table (total bigint, in_progress bigint, finished bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where status = 'in_progress'),
    count(*) filter (where status = 'finished')
  from public.projects
  where user_id = target
    and deleted_at is null
    and (target = auth.uid() or public.is_friend(target) or public.has_permission('users.manage'));
$$;
grant execute on function public.profile_project_counts(uuid) to authenticated;

-- Total number of projects for the admin dashboard (private ones included)
create or replace function public.admin_project_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.projects
  where deleted_at is null and public.has_permission('projects.view_all');
$$;
grant execute on function public.admin_project_count() to authenticated;


-- ---------------------------------------------------------------------
-- 18. Tagging friends in comments (same as migrations/015)
-- ---------------------------------------------------------------------
-- Are these two people friends? (works for any two people, unlike is_friend)
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- Who can I tag in a comment on this project? People who are friends with
-- both me and the project's owner (not me, not the owner).
create or replace function public.mention_candidates(project uuid)
returns table (id uuid, username text, display_name text, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, pr.username, pr.display_name, pr.avatar_path
  from public.projects p
  join public.profiles pr on pr.id <> p.user_id and pr.id <> auth.uid()
  where p.id = project
    and p.deleted_at is null
    and not p.is_private
    and (p.user_id = auth.uid() or public.are_friends(auth.uid(), p.user_id))
    and public.are_friends(auth.uid(), pr.id)
    and public.are_friends(p.user_id, pr.id)
  order by pr.display_name;
$$;
grant execute on function public.mention_candidates(uuid) to authenticated;

create or replace function public.can_mention(project uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.mention_candidates(project) c where c.id = target);
$$;


-- ---------- Who is tagged in which comment ----------
create table if not exists public.comment_mentions (
  comment_id uuid not null references public.project_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);

alter table public.comment_mentions enable row level security;

-- Visible to anyone who can see the comment
drop policy if exists "mentions: read" on public.comment_mentions;
create policy "mentions: read" on public.comment_mentions for select to authenticated
  using (exists (select 1 from public.project_comments c where c.id = comment_id));

-- Only the comment's author can tag, and only people allowed by the rule above
drop policy if exists "mentions: author tags allowed friends" on public.comment_mentions;
create policy "mentions: author tags allowed friends" on public.comment_mentions for insert to authenticated
  with check (
    exists (
      select 1 from public.project_comments c
      where c.id = comment_id and c.user_id = auth.uid() and public.can_mention(c.project_id, user_id)
    )
  );


-- ---------- Notify the tagged person ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'like', 'comment', 'feedback', 'mention'));

create or replace function public.notify_mention()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- comment_id links the notification to the comment, so deleting the
  -- comment removes the notification too
  insert into public.notifications (recipient_id, actor_id, type, project_id, comment_id)
  select new.user_id, c.user_id, 'mention', c.project_id, c.id
  from public.project_comments c
  where c.id = new.comment_id;
  return new;
end; $$;

drop trigger if exists comment_mentions_notify on public.comment_mentions;
create trigger comment_mentions_notify after insert on public.comment_mentions
  for each row execute function public.notify_mention();


-- ---------------------------------------------------------------------
-- 19. November feature batch (same as migrations/016)
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- 1. Feedback ID numbers
-- ---------------------------------------------------------------------
-- An identity column numbers existing reports too when it's added.
alter table public.feedback_reports
  add column if not exists number bigint generated by default as identity;


-- ---------------------------------------------------------------------
-- 2. Profile: About me + focus project
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio text,
  add column if not exists focus_project_id uuid references public.projects(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 300);

grant update (bio, focus_project_id) on public.profiles to authenticated;

-- The focus project has to be one of your own projects
create or replace function public.check_focus_project()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.focus_project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.focus_project_id and p.user_id = new.id
  ) then
    raise exception 'You can only star one of your own projects';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_check_focus on public.profiles;
create trigger profiles_check_focus
  before insert or update of focus_project_id on public.profiles
  for each row execute function public.check_focus_project();


-- ---------------------------------------------------------------------
-- 3. New users: notify admins + welcome friend requests
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'like', 'comment', 'feedback', 'mention', 'reply', 'new_user'));

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
    (new.id, 'kanban',   0),
    (new.id, 'calendar', 1);

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
-- 4. Friends list of a friend
-- ---------------------------------------------------------------------
-- Your own friends, or a friend's friends. Anyone else gets nothing.
create or replace function public.friends_of(target uuid)
returns table (id uuid, username text, display_name text, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, pr.username, pr.display_name, pr.avatar_path
  from public.friendships f
  join public.profiles pr
    on pr.id = case when f.requester_id = target then f.addressee_id else f.requester_id end
  where f.status = 'accepted'
    and target in (f.requester_id, f.addressee_id)
    and (target = auth.uid() or public.is_friend(target))
  order by pr.display_name;
$$;
grant execute on function public.friends_of(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5. Who it's for: a tagged person (you or a friend) or a name
-- ---------------------------------------------------------------------
create table if not exists public.project_recipients (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade, -- a tagged person
  name       text,                                                  -- or just a name, e.g. "Grandma"
  sort_order smallint not null default 0,
  constraint project_recipients_one_kind check ((user_id is null) <> (name is null)),
  constraint project_recipients_name_length check (name is null or char_length(trim(name)) between 1 and 60)
);

create index if not exists project_recipients_project_idx on public.project_recipients (project_id);

alter table public.project_recipients enable row level security;

drop policy if exists "recipients: read" on public.project_recipients;
create policy "recipients: read" on public.project_recipients for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

-- Only the owner, and only tagging themselves or a friend
drop policy if exists "recipients: write own" on public.project_recipients;
create policy "recipients: write own" on public.project_recipients for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    and (user_id is null or user_id = auth.uid() or public.is_friend(user_id))
  );

-- Move the old "Who it's for" text over ("Me" becomes a tag of yourself)
insert into public.project_recipients (project_id, user_id, name)
select p.id,
       case when lower(trim(p.made_for)) in ('me', 'myself') then p.user_id end,
       case when lower(trim(p.made_for)) in ('me', 'myself') then null else left(trim(p.made_for), 60) end
from public.projects p
where p.made_for is not null and trim(p.made_for) <> ''
  and not exists (select 1 from public.project_recipients r where r.project_id = p.id);

update public.projects set made_for = null where made_for is not null;


-- ---------------------------------------------------------------------
-- 6. Materials: "Unsure" amount + fibers
-- ---------------------------------------------------------------------
-- NULL quantity = "Unsure" (the old check still allows NULL)
alter table public.project_materials alter column quantity drop not null;

alter table public.project_materials add column if not exists fibers text[];
alter table public.project_materials drop constraint if exists project_materials_fibers_count;
alter table public.project_materials add constraint project_materials_fibers_count
  check (fibers is null or cardinality(fibers) <= 10);


-- ---------------------------------------------------------------------
-- 7. Ideas: start date is a planned date, and can be empty
-- ---------------------------------------------------------------------
alter table public.projects alter column start_date drop not null;
alter table public.projects drop constraint if exists projects_start_date_needed;
alter table public.projects add constraint projects_start_date_needed
  check (start_date is not null or status = 'idea');


-- ---------------------------------------------------------------------
-- 8. Wrap-up fields for finished / frogged projects
--    One row per answered field, each public (friends) or private.
-- ---------------------------------------------------------------------
create table if not exists public.project_reflections (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  field      text not null check (field in ('make_again', 'skills', 'enjoyment', 'recommend_to')),
  value      text not null check (char_length(value) between 1 and 2000),
  is_public  boolean not null default true,
  primary key (project_id, field)
);

alter table public.project_reflections enable row level security;

drop policy if exists "reflections: read" on public.project_reflections;
create policy "reflections: read" on public.project_reflections for select to authenticated
  using (
    user_id = auth.uid()
    or (is_public and exists (select 1 from public.projects p where p.id = project_id))
  );
drop policy if exists "reflections: write own" on public.project_reflections;
create policy "reflections: write own" on public.project_reflections for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );


-- ---------------------------------------------------------------------
-- 9. Links (several per project, each public or private)
-- ---------------------------------------------------------------------
create table if not exists public.project_links (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  url        text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  title      text check (title is null or char_length(title) <= 80),
  is_public  boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_links_project_idx on public.project_links (project_id, sort_order);

alter table public.project_links enable row level security;

drop policy if exists "links: read" on public.project_links;
create policy "links: read" on public.project_links for select to authenticated
  using (
    user_id = auth.uid()
    or (is_public and exists (select 1 from public.projects p where p.id = project_id))
  );
drop policy if exists "links: write own" on public.project_links;
create policy "links: write own" on public.project_links for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Move the old single "Pattern link" over
insert into public.project_links (project_id, user_id, url, title)
select p.id, p.user_id, p.pattern_url, 'Pattern'
from public.projects p
where p.pattern_url is not null
  and not exists (select 1 from public.project_links l where l.project_id = p.id and l.url = p.pattern_url);

update public.projects set pattern_url = null where pattern_url is not null;


-- ---------------------------------------------------------------------
-- 10. Replies to comments
-- ---------------------------------------------------------------------
alter table public.project_comments
  add column if not exists parent_id uuid references public.project_comments(id) on delete cascade;

-- A reply has to be on the same project as the comment it answers
drop policy if exists "comments: friends and owner add" on public.project_comments;
create policy "comments: friends and owner add" on public.project_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and (p.user_id = auth.uid() or public.is_friend(p.user_id))
    )
    and (
      parent_id is null
      or exists (select 1 from public.project_comments pc where pc.id = parent_id and pc.project_id = project_comments.project_id)
    )
  );

-- New comment -> tell the project owner. New reply -> tell the person
-- replied to (and the owner, unless the owner is that person).
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  parent_author uuid;
begin
  select p.user_id into owner_id from public.projects p where p.id = new.project_id;
  if new.parent_id is not null then
    select c.user_id into parent_author from public.project_comments c where c.id = new.parent_id;
  end if;

  if parent_author is not null and parent_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, project_id, comment_id)
    values (parent_author, new.user_id, 'reply', new.project_id, new.id);
  end if;

  if owner_id is not null and owner_id <> new.user_id and owner_id is distinct from parent_author then
    insert into public.notifications (recipient_id, actor_id, type, project_id, comment_id)
    values (owner_id, new.user_id, 'comment', new.project_id, new.id);
  end if;
  return new;
end; $$;


-- ---------------------------------------------------------------------
-- 11. New widget types
-- ---------------------------------------------------------------------
alter table public.profile_widgets drop constraint if exists profile_widgets_widget_type_check;
alter table public.profile_widgets add constraint profile_widgets_widget_type_check
  check (widget_type in ('calendar', 'kanban', 'gallery', 'made_for', 'fibers', 'focus'));


-- ---------------------------------------------------------------------
-- 12. Badge numbers
--     Just numbers (no titles or details), for you and your friends.
--     Private projects count; deleted ones don't (so deleting the
--     projects that earned a badge takes it away again).
-- ---------------------------------------------------------------------
create or replace function public.profile_badge_stats(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select p.*, ct.slug as craft,
           case when p.finish_date is not null and p.start_date is not null
                then p.finish_date - p.start_date end as took_days
    from public.projects p
    join public.craft_types ct on ct.id = p.craft_type_id
    where p.user_id = target and p.deleted_at is null
  )
  select case when target = auth.uid() or public.is_friend(target) then
    jsonb_build_object(
      'finished',          (select count(*) from mine where status = 'finished'),
      'knit_finished',     (select count(*) from mine where status = 'finished' and craft = 'knitting'),
      'crochet_finished',  (select count(*) from mine where status = 'finished' and craft = 'crochet'),
      'started',           (select count(*) from mine m where m.status in ('in_progress', 'paused', 'finished')
                              or exists (select 1 from public.project_status_history h
                                         where h.project_id = m.id and h.status = 'in_progress')),
      'frogged',           (select count(*) from mine where status = 'frogged'),
      'fastest_days',      (select min(took_days) from mine where status = 'finished'),
      'fastest_knit_days', (select min(took_days) from mine where status = 'finished' and craft = 'knitting'),
      'fastest_crochet_days', (select min(took_days) from mine where status = 'finished' and craft = 'crochet'),
      'longest_days',      (select max(coalesce(finish_date, current_date) - start_date) from mine
                              where status in ('in_progress', 'paused', 'finished') and start_date is not null),
      'gifts',             (select count(*) from mine m where m.status = 'finished' and exists (
                              select 1 from public.project_recipients r
                              where r.project_id = m.id
                                and ((r.user_id is not null and r.user_id <> target)
                                     or (r.name is not null and lower(trim(r.name)) not in ('me', 'myself'))))),
      'friends',           (select count(*) from public.friendships f
                              where f.status = 'accepted' and target in (f.requester_id, f.addressee_id))
    )
  end;
$$;
grant execute on function public.profile_badge_stats(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 20. Fix for the reply rule (same as migrations/017)
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


-- ---------------------------------------------------------------------
-- 21. Badges widget + new badge notifications (same as migrations/018)
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


-- ---------------------------------------------------------------------
-- 22. Badge earned dates (same as migrations/019)
-- ---------------------------------------------------------------------
-- Your badges' earned dates, or a friend's. Anyone else gets nothing.
create or replace function public.badge_earned_dates(target uuid)
returns table (badge_id text, earned_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select ub.badge_id, ub.earned_at
  from public.user_badges ub
  where ub.user_id = target
    and (target = auth.uid() or public.is_friend(target));
$$;
grant execute on function public.badge_earned_dates(uuid) to authenticated;
