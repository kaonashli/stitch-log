-- RUN IN SUPABASE: yes (exact date unknown, on or before 2026-11-05)
-- =====================================================================
-- Migration 009: admin dashboard (last login / last active) and
--                bug reports + change requests
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- =====================================================================


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
