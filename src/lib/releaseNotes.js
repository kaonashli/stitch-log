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
        heading: 'Home',
        items: [
          'When a friend starts a new project, it shows up in your friend activity, with its photo if it has one.',
          "Heart and comment on your friends' projects right from the friend activity, without opening the project.",
          "Tag friends in comments: start typing a friend's name (or type @) and pick them from the suggestions. Tags are highlighted as you write. You can tag friends who are also friends with the project's owner, and they get a notification.",
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
        ],
      },
      {
        heading: 'On your phone',
        items: [
          "Steadier on phones: no more zooming in when you tap a box or save, and the screen stays put.",
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
