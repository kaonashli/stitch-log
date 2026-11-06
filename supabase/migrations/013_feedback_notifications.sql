-- RUN IN SUPABASE: yes (exact date unknown, on or before 2026-11-05)
-- =====================================================================
-- Migration 013: notify admins about new bug reports / change requests
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 008-010 first if you haven't yet.)
--
-- Everyone with the 'feedback.manage' permission gets a notification when a
-- report comes in (not for their own reports). Guest reports have no
-- account, so the notification has no "actor". Deleting the report removes
-- its notifications too.
-- =====================================================================
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
