# Release notes

All notable changes to Stitch Log are listed here, newest first.

## [Unreleased]

### Added
- Milestones: your own steps and plans inside a project, like tasks under a user story. On the project page, add milestones (with an optional target date), tick them off (the day is remembered), edit, delete, and drag to reorder; everything saves right away. Quick-add suggestions (Swatch, Cast on, Weave in ends, Blocking...). Missed target dates show in amber. Friends who can see the project see its milestones.
- Milestone progress ("3/7" bar) on project board cards, the status page, the home page's in-progress list, and the Focus project widget (with the next milestone). The project timeline shows a small diamond on the day each milestone was done.
- Color tags: yarn, string, and buttons have a Colors picker with swatches (27 colors, including Multicolor; pick several for variegated). The old Color box becomes "Color name" for the brand's colorway. Existing color names were tagged automatically where a color word was found (e.g. "Dark Grey Heather" -> Grey). Color tags also show on the project page, the shopping list, and the wish list.
- The Favorite fibers widget is now "Favorite fibers and colors", with a Colors section (swatch beside each color). Rows line up: the favorite gets a star in a fixed slot. On phones only the number is shown, so the bars have room.
- Favorite fibers widget: a little icon beside each fiber, matching where it comes from (sheep for wool breeds, alpaca, goat for mohair and cashmere, yak, rabbit for angora, cocoon for silk, cotton boll, flax flower for linen, bamboo, leaf for other plants, trees for regenerated fibers, flask for synthetics, sparkles for metallic, recycle arrows for recycled fibers).
- Project timeline: choose which projects it shows and in what order (sliders button): "All projects" (new ones appear by themselves, oldest start first) or "Only the ones I pick", with tick boxes and up/down arrows.
- Wish list: a gift button on each Shopping list item (and on "To buy" materials on the project page) puts it on your wish list. Friends see it in the new Wish list profile widget, so they know what to get you. Costs are never shown; items from a private project don't show its name. Bought items leave the wish list by themselves.

### Changed
- On phones, the friend buttons on someone else's profile (Add friend, Friends, Cancel request, Accept / Decline) are round icon buttons in the top-right corner of the profile card, like Settings on your own profile, so their status sits right under their name. "Friends" shows a green check; a sent request shows a clock.

## [0.2.0] - 2026-11-06

A big update: badges, new profile widgets, replies, wrap-up questions, and much more. Still a beta.

### Added
- Home feed: when a friend starts a new project, it appears as a card with the project's main image or first photo (or its icon and color if it has no photos), its status, and craft type.
- Home feed: every friend activity card has a heart button and a comment button. Heart or un-heart right there, and open the project's comments inline to read, add, or delete your own.
- Main image: star one of a project's photos to show it instead of the project's icon (My Projects, the project page, the project board widget, and friend activity).
- Tag friends in comments: suggestions appear as you type a friend's name ("Tag someone?") or after @, and tags are highlighted inside the comment box as you write. The list shows the people you can tag (your friends who are also friends with the project's owner; not on private projects). Tagged people get a notification, tags become profile links, and deleting the comment removes the notification. The database refuses tags that break the rule.
- Recently deleted: deleting a project moves it to "Recently deleted" at the bottom of My Projects for 30 days, showing the date it will be deleted for good. Restore it or delete it forever any time before then. Expired projects (and their photos) are removed automatically.
- Private projects: a switch in the top-right corner of the project form. Private projects are visible only to their owner (not friends, not admins); they still count in number-only stats.
- Profile header shows project counts (total, in progress, finished), including private projects, to you and your friends.
- Admins get a notification for every new bug report or change request (including guest reports); tapping it opens the Feedback tab.
- Login and signup pages have a one-line description of the app.
- Admin feedback board shows each report's ID number (#12), also shown on your own reports.
- Admin Users tab: Make admin / Remove admin button for other users (with a confirmation).
- Admin "View the app as" (Dashboard tab): a stranger, a friend, or a regular user, for testing. Admin features are hidden and your own profile and projects look the way that person would see them; a bar at the top lets you stop.
- New members: admins get a notification, and the new member gets friend requests from the admins and from Buddy (@BuddyTheYarnahoLic).
- Profile status ("About me"): a speech bubble under your name on your profile; tap it to edit it right there (not in Settings). Everyone can see it, and it also shows in friend search and friend requests.
- Friends can see each other's friends lists on their profiles.
- "Who it's for" takes chips: tag yourself or friends, or type any name and press Enter to make it a category (names you've used before are suggested). Old "Who it's for" text was moved over.
- Several links per project, each with an optional title and a public (friends) / private switch; public by default. The old pattern link was moved over as a link titled "Pattern".
- Wrap-up questions for finished and frogged projects: would I make this again, enjoyment level, skills learned, and who I'd recommend it to (with friend tags). Each answer is public (friends) or private.
- Material amount can be "Unsure". Yarn and string have a Fiber field: the full list of knitting and crochet fibers (67 of them), grouped into wool and sheep breeds, other animal fibers, plant fibers, regenerated fibers, synthetic, and other (recycled, unknown). Pick several for a blend. The list stays folded away behind "Choose fibers" until you need it.
- Replies to comments, on the project page and in the home feed; the person replied to gets a notification. Deleting a comment deletes its replies.
- Focus project: star one project from its page, and show it off with the new Focus project widget.
- New profile widgets: Project gallery (photo grid, 3 per row, up to 9 chosen projects, drag to reorder, "See more" for the rest), Focus project, Made for (projects per person), and Favorite fibers.
- Project board column titles open a page with that status's projects, where you can add a project in that status, move projects to another status, edit, or delete them.
- Project timeline ranges: 2 years and 5 years. Paused stretches are striped and each row says how many days the project was paused.
- Badges on your profile, worked out from your projects and friends (deleting the projects that earned one removes it): First Project Started, First Project Completed, Knitter and Crocheter (1, 5, 10, 15, 20, 30 finished), Done Within a Year / 6 Months / a Month, Quick Knitter, Quick Crocheter (under a week), Slow and Steady (over a year), First Friend and Community (1, 3, 10, 20, 50 friends), Made with Love (1, 5, 10, 20 gifts), and Rip It, Rip It (more than 5 frogged). Each has its own picture; levels change color and show their number. Earned badges are shown in the order you earned them. Unearned badges stay secret: "All badges" shows only a dashed outline of each one with "???", and no name or description. Badges live in a Badges widget (added to the top of every profile, and to new members' default widgets). Earning a new badge shows a congratulations pop-up and adds a "New badge" notification; losing a badge removes its notification. Badges people already had when this arrived are recorded quietly, without notifications.

### Changed
- Ideas have an optional planned start date. Moving a project out of Idea sets its start date to today (and it's required from then on); moving to Finished sets the finish date to today. Same rules on the board, the status dropdown, the status page, and the project form.
- Costs show "$" instead of "US$".
- On phones, the Settings button on your own profile is a round icon in the top-right corner of the profile card, so your status sits right under your name.
- Deleted projects are hidden from everyone else immediately, including friend activity, profiles, hearts, and comments.
- Admin dashboard project count includes private projects.

### Fixed
- Phones no longer zoom in when tapping small dropdowns or text boxes (all inputs are 16px on touch screens), double-tap zoom is off, and the page itself no longer shifts while using the app.
- My Projects shows a project's icon unless you've starred a main image (it used to show the first photo automatically).
- Project timeline: no more gaps between a project's start and finish (e.g. when the finish date was changed after marking it Finished). Any day in between with no clear status counts as In progress.

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

[Unreleased]: https://github.com/kaonashli/stitch-log/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kaonashli/stitch-log/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kaonashli/stitch-log/releases/tag/v0.1.0
