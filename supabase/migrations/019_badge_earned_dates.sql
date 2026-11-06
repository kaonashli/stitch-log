-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- 019: When each badge was earned (for showing badges in the order you
--      earned them). user_badges is owner-only, so friends get the dates
--      through this function instead, like profile_badge_stats().
--
-- Safe to run more than once.
-- =====================================================================

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
