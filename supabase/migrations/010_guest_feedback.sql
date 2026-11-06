-- =====================================================================
-- Migration 010: let people send bug reports / change requests without
-- logging in
--
-- Run this once in Supabase > SQL Editor. Safe to run more than once.
-- (Run 009 first if you haven't yet.)
--
-- Logged-in reports are linked to the account (user_id), as before.
-- Guest reports have no account, so they must include a name, and can
-- include an email so you can reply. Guests can only SEND reports; they
-- can't see any (not even their own).
-- =====================================================================
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
