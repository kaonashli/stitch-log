# Stitch Log

A journal for knitting and crochet projects. Log what you're making, the yarn and needles you used, and photos of your progress, then follow what your friends are working on.

**Live site: [stitch-log.netlify.app](https://stitch-log.netlify.app/)**

Built with React (Vite) and Supabase (Postgres, Auth, Storage). Works on desktop and phones, and can be added to a phone's home screen to open like an app.

## Features

- **Accounts** - sign up with email and password, a display name, a unique username, and an optional profile picture. Light and dark mode.
- **Projects** - title, a small icon and color of your choice, craft type (knitting or crochet), status (idea, in progress, paused, finished, frogged), start and finish dates, who it's for, a pattern link, up to 10 photos (star one to use as the main image), a description your friends can read, and private personal notes. Deleted projects wait in "Recently deleted" for 30 days so they can be restored.
- **Materials** - any number per project: yarn (brand, color, weight, yardage, gauge), needles or hooks (size), string, stuffing, and buttons (color). Sorted into "To buy" and "In my stash" with drag and drop. Each has an amount and an optional cost, which add up to the project's total cost (costs are private to you).
- **Difficulty** - rate projects from Beginner to Expert.
- **Photos** - resized and compressed in the browser before upload (about 300 KB each) to stay within Supabase's free storage.
- **Friends** - find people by username, send and accept friend requests. Friends can see each other's projects and photos. Friends can heart and comment on each other's projects. A notifications bell collects hearts, comments, and friend requests, with live pop-ups and a badge for anything new.
- **Profile dashboard** - widgets you can move, remove, and add back:
  - *Project board* - a kanban of your projects by status. Drag a card to change its status (on phones, press and hold first), and choose which columns to show and in what order.
  - *Project timeline* - a bar for each project from its start to its finish, colored by status over time.
- **Home** - recent status changes on your friends' projects, and a shopping list of everything you still need to buy.
- **Release notes and feedback** - a public release notes page in plain language, with a box at the top for reporting a bug or requesting a change (no account needed).
- **Admin dashboard** - an overview, every user with their roles and permissions, bug reports and change requests on a mini kanban, and which permissions each role has. New permissions can be added without code changes.

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- A free [Supabase](https://supabase.com/) project

### 1. Set up the database

In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it once. This creates the tables, security rules, and storage buckets.

`schema.sql` is always the complete, current schema. The files in [`supabase/migrations/`](supabase/migrations/) are only for databases created from an older version of it: run any you haven't run yet, in number order.

Then, under **Authentication > URL Configuration**, set the **Site URL** to `http://localhost:5180` and add it to **Redirect URLs** (so email confirmation links come back to the app).

### 2. Configure the app

Copy `.env.example` to `.env` and fill in your project's values from **Project Settings > API**:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

`.env` is ignored by git. The publishable key is safe to use in the browser; the database's Row Level Security rules decide what each user can see and change.

### 3. Install and run

```
npm install
npm run dev
```

Open http://localhost:5180.

In VS Code you can also use **Run and Debug** (Ctrl+Shift+D):

| Configuration | What it does |
|---|---|
| Debug in Chrome / Debug in Edge | Starts the dev server and opens the browser with breakpoints enabled |
| Debug in Chrome (server already running) | Attaches to a server you started with `npm run dev` |
| Run dev server only | Starts the server without debugging |

### 4. Make yourself an admin (optional)

Sign up in the app, then put your email into [`supabase/make_admin.sql`](supabase/make_admin.sql) and run it in the SQL Editor. Log in again to see the **Admin** tab.

## Deployment

The live site is hosted on [Netlify](https://www.netlify.com/), built from the `main` branch.

- Build command: `npm run build`, publish directory: `dist`
- Environment variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Netlify site settings (the `.env` file is not in git)
- [`public/_redirects`](public/_redirects) sends every URL to the app, so links like `/projects` work when opened directly or refreshed
- In Supabase under **Authentication > URL Configuration**, set the **Site URL** to `https://stitch-log.netlify.app` and keep `http://localhost:5180` in **Redirect URLs** for local development

## Test data

- [`supabase/seed_test_data.sql`](supabase/seed_test_data.sql) adds 11 sample projects (with materials and status history) to the oldest account.
- [`supabase/delete_test_data.sql`](supabase/delete_test_data.sql) removes exactly those sample projects and nothing else.

## Project structure

```
supabase/          SQL: schema, admin helper, test data
  migrations/      changes for databases created from an older schema.sql
public/            favicon, app icons, web app manifest
src/
  lib/             Supabase client, constants, release notes text, and helpers for dates,
                   images, friends, hearts/comments, notifications, and feedback
  context/         AuthContext (who is logged in), ThemeContext (light/dark),
                   NotificationsContext (badges, pop-up messages, live updates)
  components/      layout and shared pieces
    friends/       friend search, requests, friend button
    widgets/       profile dashboard, project board, project timeline
    admin/         feedback kanban for the admin dashboard
  pages/           one file per page (routes are listed in App.jsx)
  index.css        all styles; colors are CSS variables per theme
```

## Security

- Passwords are handled by Supabase Auth and stored hashed; the app never sees or stores them.
- Every table has Row Level Security enabled. Users can only change their own data, and nobody can give themselves roles.
- Project photos are in a private storage bucket, visible only to the owner and their friends through short-lived signed links.

## Release notes

Current version: **0.1.0** (beta), released November 5, 2026.

- In the app: the **Release notes** page (`/release-notes`, open to everyone, linked from the login page and the home page). Its plain-language content is in [`src/lib/releaseNotes.js`](src/lib/releaseNotes.js).
- For developers: [CHANGELOG.md](CHANGELOG.md).

## Author

Developed by [kaonashli](https://github.com/kaonashli).
