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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (finish_date is null or finish_date >= start_date)
);

create index projects_user_idx on public.projects (user_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- You, your friends, and admins with projects.view_all can see a project
create policy "projects: read" on public.projects for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_friend(user_id)
    or public.has_permission('projects.view_all')
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
  created_at    timestamptz not null default now()
);

create index project_materials_project_idx on public.project_materials (project_id);

alter table public.project_materials enable row level security;

create policy "materials: read" on public.project_materials for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
create policy "materials: write own" on public.project_materials for all to authenticated
  using      (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));


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
  created_at   timestamptz not null default now()
);

create index project_photos_project_idx on public.project_photos (project_id, sort_order);

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
