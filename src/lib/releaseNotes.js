// The release notes shown on the Release notes page (/release-notes).
// Written for people using the app, so keep it friendly and non-technical.
// (CHANGELOG.md in the repo is the more detailed version for developers.)
//
// HOW TO UPDATE
// - While building the next version: add an entry at the TOP of RELEASES with
//   version: null and title 'Coming next'. It shows as "In the works".
//   Put new things in it as they're built.
// - On a release: give that entry a version number and date ('YYYY-MM-DD').
// - IN_DEVELOPMENT = true shows the "still in beta" note at the top of the
//   page. Set it to false once the app is no longer a beta.

export const IN_DEVELOPMENT = true

export const RELEASES = [
  {
    version: null, // not released yet
    date: null,
    title: 'Coming next',
    intro: 'Already working in the app, and part of the next version.',
    sections: [
      {
        heading: 'Milestones',
        items: [
          'Break a project into milestones: your own steps and plans, like "Swatch", "Finish the back", or "Blocking". Add them on the project page, give them a target date if you like, and tick them off as you go.',
          'Drag milestones into the order you want. Quick-add buttons suggest common steps.',
          'See how far along you are: a little progress bar shows on your project board, on your home page, and on your focus project, with your next milestone. Finished milestones show up as small diamonds on your project timeline.',
        ],
      },
      {
        heading: 'Wish list',
        items: [
          'Tap the gift button on something in your Shopping list to put it on your wish list. Add the Wish list widget to your profile, and your friends will know just what to get you.',
          'Prices stay private, and things you buy leave the wish list by themselves.',
        ],
      },
      {
        heading: 'Your profile',
        items: [
          'Choose which projects your project timeline shows, and in what order.',
          'Favorite fibers now has a little picture beside each fiber: a sheep for wool, a cocoon for silk, a cotton boll for cotton, and many more.',
          'Tag the colors of your yarn, string, and buttons (pick several for variegated yarn). Your favorite colors now show up next to your favorite fibers on your profile.',
        ],
      },
      {
        heading: 'On your phone',
        items: [
          "On a friend's profile, the friend button (Add friend, Friends, Accept) is now a little round button in the top-right corner, so their status sits right under their name.",
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-06',
    title: 'Badges, widgets, and lots more',
    intro: 'A big update! Earn badges, show off your projects with new widgets, reply to comments, and keep track of who you make things for. Still a beta, so keep the ideas coming.',
    sections: [
      {
        heading: 'Home',
        items: [
          'When a friend starts a new project, it shows up in your friend activity, with its photo if it has one.',
          "Heart and comment on your friends' projects right from the friend activity, without opening the project.",
          "Tag friends in comments: start typing a friend's name (or type @) and pick them from the suggestions. Tags are highlighted as you write. You can tag friends who are also friends with the project's owner, and they get a notification.",
          'Reply to a comment, and the person you answered gets a notification. Replies show right under the comment they belong to.',
        ],
      },
      {
        heading: 'Friends',
        items: [
          'Set a status on your profile: tap the bubble under your name and write a few words about you or what you are making. Everyone can see it, including people looking you up to add you.',
          "See your friends' friends lists on their profiles.",
          'New here? You will find friend requests waiting from Buddy and the Stitch Log team.',
        ],
      },
      {
        heading: 'Badges',
        items: [
          'Earn badges on your profile: your first project started and finished, knitting and crochet milestones (1, 5, 10, 15, 20, and 30 projects), quick finishes, gifts for others, friends, and a few surprises. Each one has its own little picture.',
          'Your badges have their own widget at the top of your profile. Tap a badge to see what it is for. "All badges" shows the ones still to earn as secret outlines, so each new badge is a surprise.',
          'Earn a new badge and you get a congratulations pop-up and a notification.',
          'Your badges are shown in the order you earned them.',
        ],
      },
      {
        heading: 'New profile widgets',
        items: [
          'Project gallery: your projects in a photo grid, three to a row. Choose up to 9, drag them into the order you like, and tap "See more" for the rest.',
          'Focus project: star the project you are most proud of (or busiest with) on its page, and show it off.',
          'Made for: how many projects you have made for each person.',
          'Favorite fibers: the fibers you use the most.',
          'The project timeline can now show the last 2 or 5 years, and pauses are striped so they stand out, with how many days each project was paused. No more odd gaps between a start and a finish.',
          'Tap a column title on your project board (like "Idea") to open all those projects on their own page, where you can add, move, edit, or delete them.',
        ],
      },
      {
        heading: 'Your projects',
        items: [
          "Pick one of your photos as a project's main image: tap the star on it, and it shows instead of the icon, including on your project board.",
          'Deleted a project by mistake? Deleted projects go to "Recently deleted" at the bottom of My projects for 30 days, so you can bring them back. Each one shows the date it will be gone for good.',
          "Deleted projects disappear from your friends' activity right away.",
          "Make a project private with the switch at the top of the form. Only you can see it, but it still counts in the project numbers on your profile.",
          "Your profile shows how many projects you have, how many are in progress, and how many are finished.",
          '"Who it\'s for": tag yourself or a friend, or type any name (like Grandma) and press Enter. You can add more than one person.',
          'Add as many links as you like to a project, each with a short title. Each link can be for your friends to see or just for you.',
          'Finished or frogged a project? Answer a few wrap-up questions: would you make it again, how much you enjoyed it, the skills you learned, and who you would recommend it to (you can tag friends). Each answer can be for friends or just for you.',
          'Ideas get a planned start date (or none). When an idea moves on, its start date becomes today. Moving a project to Finished sets its finish date to today.',
          'Not sure how much yarn you need? Set the amount to "Unsure".',
          'Pick the fiber of your yarn and string from a full list of knitting and crochet fibers: wool and sheep breeds like merino and Shetland, alpaca, mohair, silk, cotton, linen, bamboo, acrylic, and many more. Pick several for a blend.',
          'Costs show with a simple "$".',
        ],
      },
      {
        heading: 'On your phone',
        items: [
          "Steadier on phones: no more zooming in when you tap a box or save, and the screen stays put.",
          'On your profile, Settings is now a little gear in the top-right corner, so your status sits right under your name.',
        ],
      },
    ],
  },
  {
    version: '0.1.0', // the first release (beta)
    date: '2026-11-05',
    title: 'The first release',
    intro: 'The very first version of Stitch Log! It is still a beta, so things may change as we go. Here is everything in it.',
    sections: [
      {
        heading: 'Your projects',
        items: [
          'Keep a journal of your knitting and crochet projects, from first idea to finished piece (or frogged, it happens).',
          'Give each project a little icon and color so you can spot it at a glance. There are over 40 icons, from sweaters and socks to cats and crochet hooks.',
          'Add a description your friends can read, and private notes only you can see.',
          'Add up to 10 photos per project. They are shrunk automatically so they upload quickly.',
          'Rate how difficult a project is, from Beginner to Expert.',
        ],
      },
      {
        heading: 'Materials and shopping',
        items: [
          'List your yarn, needles, hooks, string, stuffing, and buttons for each project, with how many you need.',
          'Add what each material costs (if you like) and see the total cost of the project. Costs are private: only you can see them.',
          'Sort materials into "To buy" and "In my stash", and drag them from one to the other.',
          'The home page shows a shopping list of everything you still need to buy, grouped by project. Tick things off as you buy them.',
        ],
      },
      {
        heading: 'Your profile',
        items: [
          'A project board that shows your projects by status. Drag a project to another column to update it, on a computer or your phone.',
          'A project timeline that shows when each project started and finished, and when it was paused along the way.',
          'Move, remove, and add back these widgets to arrange your profile the way you like.',
        ],
      },
      {
        heading: 'Friends',
        items: [
          'Find friends by their username and send friend requests.',
          'See what your friends are working on in your home feed.',
          "Heart your friends' projects and leave comments. Changed your mind? Take your heart back or delete your comment any time.",
          "A notifications bell with everything in one place: hearts, comments, and friend requests. The little number goes away once you've looked, but the notifications stay.",
          'Get a pop-up message the moment someone hearts or comments on your project, sends you a friend request, or accepts yours.',
        ],
      },
      {
        heading: 'Everywhere',
        items: [
          'Works on your phone like an app. You can add it to your home screen.',
          'Light and dark mode.',
          'A little knitting logo that knits a piece, slides the needles out, frogs it, and starts over.',
          "Found a bug or have an idea? Send it from the top of this page, no account needed. If you're logged in, you can also follow what happens to it.",
        ],
      },
    ],
  },
]
