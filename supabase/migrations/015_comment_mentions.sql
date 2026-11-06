-- =====================================================================
-- Migration 015: tag (@mention) friends in comments
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 008, 011, and 014 first if you haven't yet.)
--
-- You can tag someone in a comment only if they're YOUR friend AND a friend
-- of the person who posted the project (so they can actually see it).
-- Not on private or deleted projects. The tagged person gets a notification,
-- which disappears if the comment is deleted.
-- =====================================================================

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
