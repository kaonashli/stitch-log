-- =====================================================================
-- Migration 008: hearts, comments, and notifications
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
--
--   project_likes     a friend hearts a project (one heart per person)
--   project_comments  friends (and the owner) comment on a project
--   notifications     one row per thing to tell someone about:
--                     a heart, a comment, a friend request, an accepted request
--
-- Notifications are created AUTOMATICALLY by the database (triggers below),
-- so nobody can create fake ones. They're also removed automatically when
-- the heart / comment / request they're about is removed.
-- =====================================================================


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
