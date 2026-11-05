# Stitch Log

A journal for knitting and crochet projects. Log what you're making, the yarn and needles you used, and photos of your progress, then follow what your friends are working on.

Built with React (Vite) and Supabase (Postgres, Auth, Storage). Works on desktop and phones, and can be added to a phone's home screen to open like an app.

## Features

- **Accounts** - sign up with email and password, a display name, a unique username, and an optional profile picture. Light and dark mode.
- **Projects** - title, craft type (knitting or crochet), status (idea, in progress, paused, finished, frogged), start and finish dates, who it's for, a pattern link, and up to 10 photos.
- **Materials** - any number per project: yarn (brand, color, weight, yardage, gauge), needles or hooks (size), string, stuffing, and buttons (color).
- **Photos** - resized and compressed in the browser before upload (about 300 KB each) to stay within Supabase's free storage.
- **Friends** - find people by username, send and accept friend requests. Friends can see each other's projects and photos.
- **Profile dashboard** - widgets you can move, remove, and add back:
  - *Project board* - a kanban of your projects by status. Drag a card to change its status (mouse), and choose which columns to show and in what order.
  - *Stitch calendar* - the last six months as small dot calendars showing which days you worked on a project and what status it was in.
- **Home feed** - recent status changes on your friends' projects.
- **Admin area** - assign roles to users and choose which permissions each role has. New permissions can be added without code changes.

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- A free [Supabase](https://supabase.com/) project

### 1. Set up the database

In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it once. This creates the tables, security rules, and storage buckets.

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

## Test data

- [`supabase/seed_test_data.sql`](supabase/seed_test_data.sql) adds 11 sample projects (with materials and status history) to the oldest account.
- [`supabase/delete_test_data.sql`](supabase/delete_test_data.sql) removes exactly those sample projects and nothing else.

## Project structure

```
supabase/          SQL: schema, admin helper, test data
public/            favicon, app icons, web app manifest
src/
  lib/             Supabase client, constants, date/image/friend helpers
  context/         AuthContext (who is logged in), ThemeContext (light/dark)
  components/      layout and shared pieces
    friends/       friend search, requests, friend button
    widgets/       profile dashboard, project board, stitch calendar
  pages/           one file per page (routes are listed in App.jsx)
  index.css        all styles; colors are CSS variables per theme
```

## Security

- Passwords are handled by Supabase Auth and stored hashed; the app never sees or stores them.
- Every table has Row Level Security enabled. Users can only change their own data, and nobody can give themselves roles.
- Project photos are in a private storage bucket, visible only to the owner and their friends through short-lived signed links.

## Release notes

See [CHANGELOG.md](CHANGELOG.md).
