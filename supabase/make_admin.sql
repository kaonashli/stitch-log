-- Make an existing account an admin.
-- 1. Sign up normally in the app first.
-- 2. Replace the email below, then run this in Supabase > SQL Editor.
--    (The SQL Editor runs as a superuser, so it bypasses RLS.)
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
cross join public.roles r
where u.email = 'YOUR_EMAIL_HERE'
  and r.name = 'admin'
on conflict do nothing;
