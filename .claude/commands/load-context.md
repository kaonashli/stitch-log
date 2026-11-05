---
description: Load the full Stitch Log project context (requirements, decisions, progress)
---

You are working on **Stitch Log**. Read this, then read `supabase/schema.sql`, `CHANGELOG.md`, and skim `src/` so you know the current state before doing anything. Run `git status` and `git log --oneline -5` to see uncommitted work. Then give a 3-5 line summary of where the project stands and what's next.

## About the user
- Knows JavaScript, **new to React**. Keep code simple, avoid clever abstractions, add comments where helpful.
- **No emojis** anywhere in the UI, code, or docs. Use icons (lucide-react or inline SVG) or CSS instead.
- Wants it to feel like a phone app: stable, nothing jumping around when scrolling. Check every UI change at phone width.
- Only commit/push when asked.

## Stack
- React 19 (Vite 8) + Supabase (Postgres, Auth, Storage). react-router-dom 7, supabase-js 2, lucide-react icons, browser-image-compression.
- Supabase URL and publishable/anon key live in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `.env` is in `.gitignore`; `.env.example` is the committed template. Never commit `.env`.

## Repository and docs
- GitHub: https://github.com/kaonashli/stitch-log (branch `main`). Git author for this repo is set locally to `kaonashli` / `kaonashli@users.noreply.github.com` (keeps the user's real email private).
- `README.md`: what the app is, setup steps, run/debug, test data, project structure. **Update it when setup steps, scripts, ports, or the folder structure change.**
- `CHANGELOG.md`: release notes (Keep a Changelog style, plain user-facing language). **Every user-visible change goes under `## [Unreleased]`** (Added / Changed / Fixed / Removed) in the same piece of work. Since nothing is released yet, update the existing Unreleased entries in place rather than logging every tweak as a separate change.
- **No release yet.** The app is still being built; the user decides when the first release happens (don't create version tags or release sections until they say so). When they do: rename Unreleased to `## [x.y.z] - YYYY-MM-DD` (first one likely 0.1.0), add a fresh empty Unreleased, set the `package.json` version, add compare links at the bottom, tag `vx.y.z`.

## What the app is
A journal/log for knitting and crochet projects. More string/yarn crafts will be added later, so craft types are a DB table (`craft_types`), not hard-coded.

## Accounts and security
- Personal accounts. Sign-up: email, password (min 8), **Display name** (required, not unique), **Username** (required, unique, case-insensitive, 3-20 letters/numbers/_), optional avatar.
- Login: email + password via Supabase Auth (hashing on their side; never store passwords ourselves). Generic error message for wrong email/password.
- Admin + generic RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`) so permissions can be added per feature later. `has_permission(key)` for RLS, `my_permissions()` for the app. `supabase/make_admin.sql` promotes a user. The user has an account and should be admin.
- Light and dark mode (CSS variables per `[data-theme]`, choice saved in localStorage, `<meta name="theme-color">` kept in sync).

## Profile page
- Search friends by username, send/accept/decline/cancel requests, remove friends.
- Widgets (`profile_widgets`), controls always visible on your own profile: grip handle drag (mouse only, hidden on touch), up/down arrows, X to remove. Removed types appear under "Add a widget" to add back. One widget per type.
  - **Kanban ("Project board")**: columns by status, all visible at once (no scrolling): side by side on desktop (`--kanban-cols`), stacked on phones. Drag cards to change status (mouse). Sliders button in the header opens column settings (show/hide + reorder), saved in `settings.columns`; default = all statuses in normal order.
  - **Calendar ("Stitch calendar")**: last 6 months as month grids of round dots (deliberately NOT GitHub's look). Pick one project (dot = status that day) or all (intensity = number in progress). Logic in `statusOnDay()`.
- Friends see your widgets read-only; non-friends see only name + Add friend.

## Home page
- BASIC feed of friends' status changes + your in-progress list. **The full feed design is still to be discussed with the user** - ask before building more.

## Projects (* = required)
- Title*, Craft type*, Status* (idea / in progress / paused / finished / frogged), Start date* (defaults to user's local today), Finish date, Who it's for, Pattern link.
- Photos: up to 10 per project (DB trigger enforces), compressed client-side to ~300 KB JPEG. Owner + friends can view (signed URLs), only owner writes. (User originally said owner-only, then changed to friends can view.)
- Materials 0..many: Yarn (brand, color, weight, yardage, gauge), Needle (size; also hooks), String, Stuffing, Buttons (color). Every type also has notes. Editing replaces the whole materials list.
- Moving to Finished (kanban or the status dropdown on the project page) fills finish_date with today if empty.

## Key schema decisions (see supabase/schema.sql)
- `profiles` row created by a trigger on `auth.users` from signup metadata; trigger also assigns the `user` role and default widgets.
- `friendships`: one row per pair; `pending` or `accepted`; decline/cancel/unfriend = delete.
- Projects, materials, status history, photos: visible to owner + accepted friends (admins with `projects.view_all` also see projects). Only the owner writes.
- `project_status_history` written by a trigger; powers the calendar and feed.
- Storage: `avatars` (public read, own-folder write), `project-photos` (private; owner + friends read, owner writes). Paths start with `<user_id>/`.
- The user already ran schema.sql. **For schema changes, write a separate migration file in `supabase/` for them to run** - don't expect them to re-run the whole schema - and also update schema.sql so it stays the full picture.

## Mobile / app feel
- `.app-shell` fills `100dvh`; top bar and phone bottom tab bar are fixed; only `.page-scroll` (<main>) scrolls; Layout scrolls it to top on route change.
- `overscroll-behavior: none`, safe-area insets, 16px inputs on phones (no iOS zoom), hover effects only in `@media (hover: hover)`, manifest + PNG icons for Add to Home Screen.
- Breakpoint for phone layout: `max-width: 760px`. Settings page holds Admin + Log out on phones.

## Running
- Dev server on **port 5180** (5173 is used by the user's other project DillBreaker). `strictPort` is on.
- VS Code `.vscode/launch.json` + `tasks.json`: "Debug in Chrome", "Debug in Edge", "Debug in Chrome (server already running)", "Run dev server only".
- Supabase Auth Site URL / Redirect URL should be `http://localhost:5180`.
- If the page is blank with "504 Outdated Optimize Dep" errors, the dev server's dependency cache is stale: stop the server and start it again.
- Checking UI headlessly: Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`. `--window-size` doesn't give a true phone viewport; use the DevTools protocol with `Emulation.setDeviceMetricsOverride` (390x844, mobile) instead.

## Test data
- `supabase/seed_test_data.sql`: 11 projects with fixed ids `5eed0000-...` for the oldest account, with backdated status history and materials.
- `supabase/delete_test_data.sql`: deletes only those ids.

## Code map
- `src/lib/` supabase client, constants (statuses, material types, widget types, username rule), dates (local-date helpers), images (compress/upload/signed URLs/pending avatar), friends (friendship queries)
- `src/context/` AuthContext (session, profile, permissions), ThemeContext
- `src/components/` Layout, shared bits, `friends/`, `widgets/` (WidgetBoard, KanbanWidget, CalendarWidget)
- `src/pages/` one file per route (see App.jsx)
- `src/index.css` all styles

## Open items / ideas to discuss
- Full design of the home activity feed.
- Not yet tested end-to-end by the user.
- Possibly allow more than one calendar widget (e.g. one per project) - removed when widgets became one-per-type.
- Materials save is delete-then-insert (not atomic); could move to an RPC if it becomes a problem.
