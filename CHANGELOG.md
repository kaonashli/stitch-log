# Release notes

All notable changes to Stitch Log are listed here, newest first.

## [Unreleased]

Stitch Log is still in development and has not had a release yet. Everything below will be part of the first release.

### Added

**Accounts**
- Sign up with email, password (at least 8 characters), display name, unique username, and an optional profile picture.
- Log in with email and password. Error messages don't reveal whether an email is registered.
- Settings page to change your display name, username, and profile picture, plus log out.
- Light and dark mode, remembered between visits.

**Projects**
- Add and edit projects: title, craft type, status, start date (defaults to today), finish date, who it's for, and pattern link.
- Materials: yarn, needle or hook, string, stuffing, and buttons, each with its own fields.
- Up to 10 photos per project, compressed in the browser before uploading.
- Project page with a full-screen photo viewer and a quick status dropdown.
- Moving a project to Finished fills in today as the finish date if it was empty.
- My Projects page with status filters and photo covers.

**Friends and profile**
- Search for people by username, send, accept, decline, and cancel friend requests, and remove friends.
- Friends can see each other's projects, materials, and photos. Other people only see your name and an Add friend button.
- Profile dashboard with widgets you can move (drag or arrows), remove, and add back.
- Project board widget: your projects in columns by status, all visible at once. Drag cards between columns to change status. Choose which columns to show and their order.
- Stitch calendar widget: six months of dot calendars showing which days each project was in progress, paused, or finished.

**Home**
- Feed of recent status changes on your friends' projects, and a list of your projects in progress.

**Admin**
- Assign roles to users and permissions to roles. Add new roles and permissions.
- Admins can't remove their own admin role.

**Mobile**
- App-style layout on phones: fixed top bar and bottom tab bar, with only the page content scrolling.
- No bounce or accidental pull-to-refresh; no zooming when tapping form fields.
- Can be added to a phone's home screen and opens full screen with its own icon.

**Developer**
- Supabase schema with Row Level Security on every table, private photo storage, and a generic roles and permissions system.
- SQL scripts to add and remove test data, and to make a user an admin.
- VS Code Run and Debug configurations.
- README with setup instructions, and these release notes.

### Known limitations
- Dragging project cards and widgets only works with a mouse. On phones, use the arrows and the status dropdown on the project page.
- The dashboard holds one of each widget type.
- Editing a project's materials replaces the whole list, so if saving fails partway that project's materials can be lost.
- The home feed is a basic first version; its full design is still to be decided.

