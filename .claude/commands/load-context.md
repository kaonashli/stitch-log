---
description: Load the full Stitch Log project context (requirements, decisions, progress)
---

You are working on **Stitch Log**. Read this, then read `supabase/schema.sql` and skim the `src/` folder (if it exists) so you know the current state before doing anything. Then give a 3-5 line summary of where the project stands and what's next.

## About the user
- Knows JavaScript, **new to React**. Keep code simple, avoid clever abstractions, add comments where helpful.
- **No emojis** anywhere in the UI or code. Use icons (an icon library or inline SVG) or CSS instead.

## Stack
- React (Vite) + Supabase (Postgres, Auth, Storage).
- Supabase URL and publishable/anon key live in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `.env` is in `.gitignore`; `.env.example` is the committed template.
- Order of work requested: SQL tables first (user reviews them) -> scaffold the app -> build screens.

## What the app is
A journal/log for knitting and crochet projects. More string/yarn crafts will be added later, so craft types are a DB table (`craft_types`), not hard-coded.

## Accounts and security
- Personal accounts. Sign-up page: email, password, **Display name** (required, not unique), **Username** (required, unique, case-insensitive), optional small profile image (avatar).
- Login page: simple email + password. Must be safe and secure (Supabase Auth handles hashing; never store passwords ourselves).
- An admin account exists. Permissions are generic RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`) so new permissions can be added/removed per feature later. `has_permission(key)` for RLS, `my_permissions()` for the app. `supabase/make_admin.sql` promotes a user.
- Light and dark mode.

## Profile page
- Search for a friend by username and send a friend request.
- Accept or decline friend requests.
- Customizable widgets with drag and drop (add, remove, reorder). Stored in `profile_widgets`.
  - **Calendar widget**: a heatmap-style calendar showing how long you've been working on a project and its status. Inspired by GitHub's contribution graph but must NOT look exactly like it.
  - **Kanban widget**: projects shown in columns by status.

## Home page
- Activity feed of what friends are working on. **Details still to be discussed with the user** - ask before building beyond a basic version.

## Adding a project (* = required)
- Title*
- Craft type*
- Status*: idea / in progress / paused / finished / frogged
- Start date* (defaults to today, user's local date)
- Finish date
- Who it's for
- Photos: up to 10 per project. Uploaded to Supabase Storage with **client-side resizing/compression** to stay under the free 1 GB. Storage rules: owner and their friends can view photos; only the owner can upload/change/delete. (User originally said owner-only, then changed to friends can view.)
- Pattern link
- 0..many materials:
  - Yarn: brand, color, weight, yardage, gauge
  - Needle: size
  - String
  - Stuffing
  - Buttons: color

## Key schema decisions (see supabase/schema.sql)
- `profiles` row is created by a trigger on `auth.users` from signup metadata (`username`, `display_name`); also assigns the `user` role and default widgets.
- `friendships`: one row per pair; status `pending` or `accepted`; decline/cancel/unfriend = delete row.
- Projects, materials, status history, photos: visible to owner + accepted friends (admins with `projects.view_all` also see projects). Only the owner writes.
- `project_status_history` is written automatically by a trigger; powers the calendar widget and future feed.
- Materials are one table with nullable columns per type.
- Storage: `avatars` (public read, own-folder write), `project-photos` (private bucket; owner + friends read, owner writes). Paths start with `<user_id>/`.

## Progress log
Update this section as work is completed.
- [x] SQL schema written and run in Supabase by the user (if schema.sql changes, give the user a separate migration snippet to run - don't expect them to re-run the whole file)
- [x] Scaffold React app (Vite 8, React 19, react-router-dom 7, supabase-js 2, lucide-react icons, browser-image-compression)
- [x] Auth: sign up (avatar saved to localStorage until first login if email confirmation is on), login, logout, theme toggle
- [x] Profile page: friends panel, friend button on others' profiles, widget board (native HTML5 drag and drop), kanban (drag cards to change status), stitch calendar (month grids of dots)
- [x] Add/edit project with materials and photos; project detail with lightbox; projects list
- [x] Home: BASIC feed of friends' status changes + your in-progress list (full design still to discuss)
- [x] Admin area: users x roles, roles x permissions, add permission/role
- [x] Mobile / app feel: fixed top bar + phone bottom tab bar, only <main> scrolls (no bounce), safe-area insets, 16px inputs (no iOS zoom), hover effects only on mouse devices, web manifest + icons for Add to Home Screen
- [x] Widget controls always visible on own profile (grip drag, up/down, remove; removed widgets listed under "Add a widget" to add back; one of each type). Kanban is customizable via its sliders button (show/hide + reorder columns; saved in profile_widgets.settings.columns; default = all statuses in normal order)
- [x] Touch fallbacks: widget up/down arrows; status dropdown on project page (native drag and drop doesn't work on phones)
- [x] Test data: supabase/seed_test_data.sql (11 projects with fixed ids '5eed0000-...' for the oldest account) and supabase/delete_test_data.sql
- [ ] Not yet tested end-to-end by the user

## Running
- Dev server runs on **port 5180** (not 5173, which the user's other project DillBreaker uses). `strictPort` is on.
- VS Code: `.vscode/launch.json` + `.vscode/tasks.json` ("Debug in Chrome", "Debug in Edge", "Debug in Chrome (server already running)", "Run dev server only").

## Code map
- `src/lib/` supabase client, constants (statuses, material types, widget types), dates (local-date helpers), images (compress/upload/signed URLs), friends (friendship queries)
- `src/context/` AuthContext (session, profile, permissions via `my_permissions()`), ThemeContext
- `src/components/` Layout, shared bits, `friends/`, `widgets/` (WidgetBoard, KanbanWidget, CalendarWidget)
- `src/pages/` one file per route (see App.jsx)
- `src/index.css` all styles; colors are CSS variables per `[data-theme]`
