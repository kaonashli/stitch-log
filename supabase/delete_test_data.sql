-- RUN IN SUPABASE: yes (exact date unknown, on or before 2026-11-05)
-- =====================================================================
-- Stitch Log - remove the FAKE test projects added by seed_test_data.sql
--
-- Only deletes projects whose id starts with '5eed0000-' (the fixed test ids).
-- Their materials, status history, and photo rows are removed automatically
-- (ON DELETE CASCADE). Safe to run more than once.
--
-- Note: if you uploaded photos to a test project in the app, delete that
-- project from the app instead, so the image files in Storage are removed too.
-- =====================================================================
delete from public.projects
where id::text like '5eed0000-%'
returning id, title;
