-- RUN IN SUPABASE: yes, on 2026-11-06
-- =====================================================================
-- Adds the November 2026 task list to the admin Feedback board.
-- Run this in the Supabase SQL editor (it runs as the database owner,
-- so it skips Row Level Security).
--
-- Every task is sent by the user "kaonash" and starts as In progress.
-- Safe to run again: a task that already exists (same title, same
-- sender) is skipped.
-- =====================================================================

with sender as (
  select id from public.profiles where lower(username) = lower('kaonash')
),
tasks (sort_order, kind, title, details) as (
  values
  (1, 'change', 'One-line app description on login and signup',
   'Add a one line description of what the app is about on the login and signup pages.'),

  (2, 'change', 'Show the ID # on admin feedback cards',
   'In the admin kanban for bugs and suggestions, show each report''s ID number.'),

  (3, 'change', 'Grant and remove the admin role from other users',
   'As an admin, I should be able to give other users the admin role and take it away.'),

  (4, 'change', 'New users: notify admins and send welcome friend requests',
   'When a new user signs up, notify the administrators. Then send that user a friend request from the administrator and from Buddy (username BuddyTheYarnahoLic).'),

  (5, 'change', 'Profile "About me" description',
   'In profile settings, add a short description about yourself. It appears on your profile and when people want to add you as a friend.'),

  (6, 'change', 'Project gallery widget (photo grid)',
   'A profile widget that shows projects like an Instagram profile: 3 per row, the main image if there is one, otherwise the icon. Add and remove projects, tap to open, drag and drop to reorder. Up to 9 on the widget, with a "See more" that shows the others in the same format.'),

  (7, 'change', 'Admin: view the app as a stranger, friend, or non-admin',
   'For testing, admins can switch to see the app as a stranger, as a friend, or as a regular (non-admin) user.'),

  (8, 'change', 'Friends can see your friends list',
   'Your friends can view your friends list.'),

  (9, 'change', '"Who it''s for": tag friends, yourself, or a name',
   'In the project form, "Who it''s for" lets you tag friends or yourself. Typing a name that isn''t a user and pressing Enter creates a person category, so we can count how many projects were made for each person later.'),

  (10, 'change', 'Widget: projects made for each person',
   'A profile widget that shows how many projects were made for each person.'),

  (11, 'change', 'Material amount can be "Unsure"',
   'When adding materials, the amount can be set to "Unsure".'),

  (12, 'change', 'Fiber field for yarn and string',
   'Yarn and string get a Fiber field. The app provides the list of fibers, and you can pick more than one for mixed fibers.'),

  (13, 'change', 'Widget: favorite fibers',
   'A profile widget that shows your favorite fibers.'),

  (14, 'change', 'Planned start date for ideas; start date set when work begins',
   'For Idea projects, show "Planned start date" instead of start date. When the project moves from Idea to In progress, set the start date to today by default, and from then on it is required.'),

  (15, 'change', 'Moving to Finished updates the finish date',
   'When a project moves to Finished, update the finish date.'),

  (16, 'change', 'Project board: tap a column to open its projects',
   'On the profile''s project board widget, clicking a column title (Idea, In progress, ...) opens a page with the projects in that status, where you can add, update, and remove projects in that category.'),

  (17, 'change', 'Wrap-up fields for finished and frogged projects',
   'When a project is Finished or Frogged, extra fields appear: Would I make this again?, Skills learned, Enjoyment level, and Who would I recommend this project to? (text plus tagging friends). Each field can be public (to friends) or private.'),

  (18, 'change', 'More than one link per project',
   'Add several links to a project, each with a short optional title. Each link can be public (to friends) or private; public by default.'),

  (19, 'change', 'Material cost: show $ instead of US$',
   'In the project form, the materials cost should show just "$", not "US".'),

  (20, 'change', 'Show pause periods on the project timeline',
   'Track the periods when a project is paused and show those pauses on the project timeline.'),

  (21, 'change', 'Reply to comments',
   'Users can reply to comments, and the person being replied to gets a notification.'),

  (22, 'change', 'Starred focus project + widget',
   'Star one project as your focused work in progress, and add a profile widget to show it off.'),

  (23, 'change', 'Project timeline: 2 year and 5 year ranges',
   'Add 2 years and 5 years to the project timeline''s range dropdown.'),

  (24, 'change', 'Profile badges',
   'Badges show on your profile when you earn them, and disappear if you delete the projects that earned them. Each badge has its own detailed look.
- Knitter / Crocheter: first completed knit / crochet project, plus levels at 5, 10, 15, 20, 30 projects
- First Project Started: a project in progress
- First Project Completed
- Completed in under a year / 6 months / 1 month (start date to finish date)
- Quick Knitter / Quick Crocheter: a knit / crochet project completed in under a week
- First Friend; Community at 3 friends, plus levels at 10, 20, 50 friends
- Made with Love: a project completed for someone else, plus levels at 5, 10, 20 gifts
- Frogger (or a better name): more than 5 frogged projects
- Slow and Steady: a project in progress for more than a year
More badge ideas (types of knitters/crocheters) to come later.')
)
insert into public.feedback_reports (user_id, kind, title, details, status, created_at)
select
  sender.id,
  tasks.kind,
  tasks.title,
  tasks.details,
  'in_progress',
  -- a second apart, so the board keeps this order
  now() + (tasks.sort_order || ' seconds')::interval
from tasks
cross join sender
where not exists (
  select 1 from public.feedback_reports f
  where f.user_id = sender.id and f.title = tasks.title
);

-- Shows what is on the board now (should list 24 tasks)
select title, status, created_at
from public.feedback_reports
where user_id = (select id from public.profiles where lower(username) = lower('kaonash'))
  and status = 'in_progress'
order by created_at;
