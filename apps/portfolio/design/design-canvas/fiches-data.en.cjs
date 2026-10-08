// The project pages in English: drafts translated from fiches-data.cjs, to be rewritten.
// Same shape as the French file; h is the board height, measured on the render (measure-fiches.mjs).
module.exports = {
  "Galaxy Escape": {
    h: 2250,
    why: "I wanted to understand what it takes to run a 3D game in a simple browser tab. Galaxy Escape, a runner inspired by Temple Run, was my testing ground: an endless race, a world that invents itself in front of the ship.",
    features: [
      ["An endless race", "You keep speeding up, dodging whatever comes at you."],
      ["Generated levels", "The track builds itself as you play: never the same twice."],
      ["In the browser", "Play straight away, with nothing to install."],
    ],
    choices: [
      ["Three.js rather than a game engine", "Learning 3D from the ground up, and staying on the web."],
      ["Procedural generation", "Endless levels, without drawing them one by one."],
    ],
    stack: ["Three.js", "WebGL", "JavaScript"],
    host: null,
    capture: null,
  },
  Magellan: {
    h: 3170,
    why: "I wanted to open an app and see my own world map: a globe that fills in as I cross countries. And I wanted those memories to stay on my phone, with no account and no server.",
    features: [
      ["The globe fills in", "Visited countries light up, each city gets its flag, an arc links the stops."],
      ["Trips as index cards", "Sorted by year: a sticky note per stop, a postcard per city, the budget."],
      ["Photos sort themselves", "The app reads the date and place of each photo and files it under the right stop."],
    ],
    choices: [
      ["One codebase", "Expo and React Native: iOS, Android and the web from the same code."],
      ["globe.gl for the Earth", "A proven 3D globe, in a WebView on phones and right in the page on the web: only the data is shared."],
      ["A version per platform when needed", ".web and .native files rather than a hack that would break one of them."],
    ],
    stack: ["Expo", "React Native", "TypeScript", "Three.js", "IndexedDB"],
    host: "Cloudflare Workers",
    capture: { id: "39b037e75843fe281240be5b0d6e37ee", w: 1040, alt: "Screenshot of Magellan: the globe and its coloured countries, with the counter of the demo data (14 trips, 22 cities, 13 countries).", caption: "The globe, with the demo trips." },
  },
  Hublot: {
    h: 2350,
    why: "Ticket prices change all the time, and I didn't want to keep watching them myself. Hublot checks them for me and only bothers me when it's worth it.",
    features: [
      ["Watches", "A destination, a departure window, a length of stay, a price not to exceed."],
      ["Every six hours", "A bot checks round-trip prices for each watch."],
      ["An alert, not a flood", "A notification when a price drops below the threshold, at most one per departure month, even during sales."],
    ],
    choices: [
      ["GitHub Actions as the server", "The bot runs as a free scheduled job: no machine to look after."],
      ["Price checks on their own branch", "Four checks a day, kept apart: the code history stays readable."],
      ["ntfy for alerts", "A notification on my phone, without writing an app."],
    ],
    stack: ["TypeScript", "Node.js", "GitHub Actions", "ntfy"],
    host: "GitHub Actions + GitHub Pages",
    capture: null,
  },
  "Métro Pathfinder": {
    h: 2250,
    why: "On the Paris metro, the shortest route isn't always the one you'd think. I wanted to compute it myself: it was my first algorithm on a graph.",
    features: [
      ["Two stations, one route", "Pick the start and the end: the shortest path appears."],
      ["The network as a graph", "Stations are nodes, the sections linking them are edges."],
      ["A desktop app", "A Swing window to pick the stations and read the route."],
    ],
    choices: [
      ["Dijkstra", "The shortest path in a graph with positive distances: exact, and easy to check by hand."],
      ["Java and Swing", "A language and a toolkit I already knew: all the effort went into the algorithm."],
    ],
    stack: ["Java", "Swing", "Dijkstra"],
    host: null,
    capture: null,
  },
  "Visit Match": {
    h: 2200,
    why: "An engineering school project, taken all the way to a business plan. Travelling alone is freeing, but sometimes you want to share a visit: Visit Match connects solo travellers who share the same destinations and interests.",
    features: [
      ["Shared interests", "You enter your destinations and what you're into."],
      ["The right matches", "The app brings together the travellers with the most in common."],
      ["Meeting up on the spot", "Once you agree, all that's left is to set a time and a place."],
    ],
    choices: [
      ["Flutter", "One codebase for iOS and Android."],
      ["Firebase", "Accounts and data with no server to maintain."],
      ["Figma first", "Screens designed and discussed before the first line of code."],
    ],
    stack: ["Flutter", "Dart", "Firebase", "Figma"],
    host: null,
    capture: null,
  },
  "gym-picker": {
    h: 2330,
    why: "My gyms are all about the same distance away: traffic decides which one is closest. Rather than checking them one by one in Waze, the app compares them all at once.",
    features: [
      ["Live traffic", "Every gym ranked by driving time, traffic included."],
      ["One tap and off you go", "Tapping a gym opens Waze or Google Maps with the route."],
      ["A fallback home", "If GPS is slow, the route starts from an address saved on the phone."],
    ],
    choices: [
      ["TomTom rather than Google", "No credit card: past the free quota, the API refuses instead of billing."],
      ["A Cloudflare Worker in front of the API", "The key never leaves the server, and each IP address is limited to 20 calls a minute."],
      ["Home stays on the phone", "The position travels in the request body, never in the URL: URLs end up in logs."],
    ],
    stack: ["React", "Vite", "Cloudflare Workers", "TomTom"],
    host: "Cloudflare Workers",
    capture: null,
  },
  Mithril: {
    h: 2560,
    why: "I wanted a password vault I could read from end to end: no cloud, no dependencies, compiled with what Windows already ships. And anyone can recompile it to check.",
    features: [
      ["Strong passwords", "From 8 to 128 characters, without ambiguous ones if you like, with their strength shown."],
      ["A vault encrypted twice", "By Windows, then by the master password, with AES-256."],
      ["Auto-typing", "A shortcut fills in the active window, without going through the clipboard."],
    ],
    choices: [
      ["No dependencies", "Compiled by csc.exe, the compiler that ships with Windows: no installer, a single .exe."],
      ["The phone, without the cloud", "Paired with a six-digit code, it syncs over the local network, each side verifying the other."],
      ["Unbiased randomness", "Windows' cryptographic generator, rejecting biased draws: every character has exactly the same chance."],
      ["A security audit in CI", "37 rules check on every change that the promised guarantees still hold; all networking lives in a single file."],
    ],
    stack: ["C#", "WinForms", ".NET Framework", "AES-256"],
    host: "GitHub Releases",
    capture: null,
    shelf: {
      name: "002 · .NET REST API",
      text: "A REST API built as C# .NET microservices: an asynchronous microservice with persistence, unit tests and a test-driven approach, containerised with Docker (2023).",
      stack: ["C#", ".NET", "SQL Server", "Docker", "xUnit"],
    },
  },
  Cancionero: {
    h: 3190,
    why: "A song you love sticks without any effort. Cancionero turns it into a Spanish lesson: you read it, understand it, sing it, and the words stay.",
    features: [
      ["Translated lyrics", "Each line with its French translation, read aloud on demand."],
      ["Fill-in-the-blank karaoke", "Fill in the missing words as the song plays."],
      ["Cards and quizzes", "The vocabulary as flashcards, and a quiz marked on the spot, even offline."],
    ],
    choices: [
      ["An installable app", "It installs from the browser and works offline; an iOS app would have needed an Apple developer account."],
      ["Expo and React Native Web", "The same code for the web today, and for phones tomorrow."],
      ["No server", "Lyrics are looked up in LRCLIB, a public database, and everything else lives on the device."],
    ],
    stack: ["Expo", "React Native Web", "TypeScript", "PWA"],
    host: "Vercel",
    capture: { id: "6600e6804d64ff7a3ca3d34521f0fa5d", w: 1040, alt: "Screenshot of Cancionero: the vocabulary to review and the list of songs, from “Hola, ¿cómo estás?” to “En el mercado”.", caption: "The songs and the vocabulary to review." },
  },
  Tonalli: {
    h: 3060,
    why: "One emotion, one colour, two photos: a ritual for two, every day, even far apart. I wanted a thread between two people, not a social network: no feed, no comments, just our days.",
    features: [
      ["A colour a day", "One emotion out of twelve, in three intensities: that's what sets the colour."],
      ["Two photos in the moment", "The scene, then your face, taken in the app, never from the gallery."],
      ["The other's calendar", "It only reveals itself once you've filled in your own day; you reply with a single emoji."],
    ],
    choices: [
      ["Reciprocity written into the database", "Supabase access rules enforce it in SQL: impossible to get around from the browser."],
      ["The author's day", "An entry's date is computed in its author's time zone, never in UTC: otherwise, in the evening, the day shifts."],
      ["A website rather than an app", "Tonalli started as a mobile app, then became an installable website: there had to be nothing to install."],
    ],
    stack: ["React", "Vite", "TypeScript", "Supabase", "PWA", "Web Push"],
    host: "Vercel + Supabase",
    capture: { id: "74dd8a932852191fba2519d31865d24e", w: 1040, alt: "Screenshot of Tonalli: the home screen, the drop character and the sign-in buttons.", caption: "The home screen." },
  },
  // 011: the repository that gathers all the others, and this site.
  INDEX: {
    h: 2400,
    why: "My projects each lived in their own corner, and some fell asleep on free tiers. INDEX gathers them in a single repository, keeps them awake, and shows them here, numbered, like the stops of a journey.",
    features: [
      ["One repository", "All ten projects imported with their full history, each in its own folder."],
      ["Nothing falls asleep", "A bot keeps Tonalli's database awake, checks every site each hour and opens an issue if one goes down."],
      ["Every project in its place", "A number, a project page and a stop: this very site."],
    ],
    choices: [
      ["pnpm and Turborepo", "Each project keeps its own versions; only the ones that change are rebuilt and tested."],
      ["Two hosts", "Apps already on Vercel stay there, with their addresses; the others move to Cloudflare Workers."],
      ["The wake-up call in GitHub Actions", "A real request keeps Supabase awake, and the repository re-enables itself so its scheduled jobs never stop."],
    ],
    stack: ["pnpm", "Turborepo", "Astro", "TypeScript", "GitHub Actions", "Cloudflare Workers"],
    host: "Cloudflare Workers + Vercel",
    capture: null,
  },
};
