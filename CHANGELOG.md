# Release notes

All notable changes to Stitch Log are listed here, newest first.

## [Unreleased]

### Added
- Home feed: when a friend starts a new project, it appears as a card with the project's main image or first photo (or its icon and color if it has no photos), its status, and craft type.
- Main image: star one of a project's photos to show it instead of the project's icon (My Projects, the project page, and friend activity).
- Recently deleted: deleting a project moves it to "Recently deleted" at the bottom of My Projects for 30 days, showing the date it will be deleted for good. Restore it or delete it forever any time before then. Expired projects (and their photos) are removed automatically.

### Changed
- Deleted projects are hidden from everyone else immediately, including friend activity, profiles, hearts, and comments.
- My Projects shows a project's icon unless you've starred a main image (it used to show the first photo automatically).

## [0.1.0] - 2026-11-05

The first release of Stitch Log. It's a beta: things may still change.

### Added

**Accounts**
- Sign up with email, password (at least 8 characters), display name, unique username, and an optional profile picture.
- Log in with email and password. Error messages don't reveal whether an email is registered.
- Settings page to change your display name, username, and profile picture, plus log out.
- Light and dark mode, remembered between visits.

**Projects**
- Add and edit projects: title, description, icon and color, craft type, status, start date (defaults to today), finish date, who it's for, pattern link, difficulty, and personal notes.
- Description is visible to your friends; personal notes are private and only ever shown to you.
- Every project has a small icon (42 to choose from, a ball of yarn by default, including sweater, dress, skirt, pants, knitting needles, and crochet hook) and a color (11 warm tones, berry by default), shown on the project page, kanban cards, and home page. Projects without photos show their icon as the cover in My Projects. In the project form the choices stay tucked away behind an Edit button.
- Materials: yarn, needle or hook, string, stuffing, and buttons, each with its own fields, split into "To buy" and "In my stash". Drag a material between the two (mouse or finger) or use the button on each one; on the project page, tick off "Bought" items.
- Difficulty rating from 1 (Beginner) to 5 (Expert), shown as dots.
- Every material has an amount (at least 1) and an optional cost each. The project page and form show each material's cost (cost x amount) and the project's total cost, plus how much of it is still to buy. Costs are private to you; friends see your materials but not what they cost.
- Up to 10 photos per project, compressed in the browser before uploading.
- Project page with a full-screen photo viewer and a quick status dropdown.
- Moving a project to Finished fills in today as the finish date if it was empty.
- My Projects page with status filters and photo covers.

**Friends and profile**
- Friends page: answer friend requests, search for people by username, see requests you've sent, and manage your friends list.
- Hearts and comments: friends can heart a project (once each, and take it back) and comment on it. The owner can comment too and delete any comment on their project; everyone can delete their own comments.
- Notifications page (bell in the top bar): hearts, comments, friend requests (with Accept/Decline right there), and accepted requests. A badge counts the ones you haven't seen; opening the page clears the badge but keeps the notifications. If someone takes back a heart, deletes a comment, or cancels a request, its notification disappears too.
- Live updates: notifications pop up at the top of the screen the moment they happen, and a red badge on the Friends tab counts waiting requests. When the app is added to a phone's home screen, supported phones show the count on the app icon too.
- Settings are reached from your profile.
- Friends can see each other's projects, materials, and photos. Other people only see your name and an Add friend button.
- Profile dashboard with widgets you can move (drag or arrows), remove, and add back.
- Project board widget: your projects in columns by status, all visible at once. Drag cards between columns to change status, with the mouse or on phones by pressing and holding a card (the page scrolls when you drag near the top or bottom edge). Choose which columns to show and their order.
- Project timeline widget: one row per project with a bar from its start date to its finish date (or today), colored by status over time (idea, in progress, paused, finished, frogged). Choose the last 3 months, 6 months, or year.

**Home**
- Feed of recent status changes on your friends' projects, and a list of your projects in progress.
- Shopping list: everything marked "To buy" across your projects, grouped by project with its status. Tick an item when you buy it.

**Admin**
- Admin dashboard with tabs: an overview (users, recent activity, projects, open reports), all users and their roles and permissions, feedback, and roles and permissions.
- Bug reports and change requests sent from the release notes page appear on a mini kanban (New, Planned, In progress, Done) that admins can drag cards around. Each card shows who sent it: the account, or the guest's name and email.
- Assign roles to users and permissions to roles. Add new roles and permissions.
- Admins can't remove their own admin role.

**Look and feel**
- Logo of a piece of knitting on two wooden needles, in the app's colors, animated in a 15-second loop: the piece grows smoothly as it's knitted, pauses for about 6 seconds, the needles slide out of the stitches, it gets frogged from the top with the pulled yarn trailing away, and it starts again. It stands still for people who prefer reduced motion. Used for the app icon and the browser tab icon. The Projects tab uses a ball of yarn icon.
- Release notes page anyone can open (linked quietly from the login and signup pages and the home page), with a note that the app is still in beta.
- "Developed by kaonashli" credit linking to the project on GitHub.
- Report a bug or request a change from the top of the release notes page (a collapsible box). No account needed: guests give their name and, optionally, an email. Logged-in users' reports are linked to their account, and they can see the status of their reports.

**Mobile**
- App-style layout on phones: fixed top bar and bottom tab bar (Home, Projects, New, Friends, Profile), with only the page content scrolling.
- No bounce or accidental pull-to-refresh; no zooming when tapping form fields.
- Can be added to a phone's home screen and opens full screen with its own icon.

**Developer**
- Supabase schema with Row Level Security on every table, private photo storage, and a generic roles and permissions system.
- SQL scripts to add and remove test data, and to make a user an admin.
- VS Code Run and Debug configurations.
- README with setup instructions, and these release notes.
- Live site on Netlify at https://stitch-log.netlify.app/, with direct links and page refreshes working on every page.

### Known limitations
- Moving whole widgets by dragging only works with a mouse. On phones, use the up/down arrows.
- The dashboard holds one of each widget type.
- Editing a project's materials replaces the whole list, so if saving fails partway that project's materials can be lost.
- The home feed is a basic first version; its full design is still to be decided.
- Notifications only appear while the app is open. Phone notifications when the app is closed are not built yet.

[Unreleased]: https://github.com/kaonashli/stitch-log/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kaonashli/stitch-log/releases/tag/v0.1.0
