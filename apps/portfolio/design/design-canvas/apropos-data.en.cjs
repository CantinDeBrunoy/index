// The About page in English, from Cantin's English CV (October 2026) and his projects. Same shape and rules as
// apropos-data.cjs: employer and town shown at his request; no phone number, no photo, no internal project name.
const OBJ = {
  gloves: "0944878b185c6092e8b8d85eaf588df6",
  hold: "9a98212eefa17bab2da90179a73a55e2",
  book: "33f2e78196e9a623469c70d106773eee",
  hike: "8563c7c32a51084d38d631ab09236273",
};
module.exports = {
  h: 4600,
  label: "About · the passport",
  role: "Full-stack & mobile software engineer",
  where: "Brunoy, Paris area, France",
  status: "Engineer at STIME, on a permanent contract",
  lead: "An EFREI Paris engineer with six years in the IT department of Les Mousquetaires Group (Intermarché), I build web and mobile apps used at scale, from requirements gathering to production release.",
  write: "Email me",
  cv: { id: "723e57de6c2c7ba271a6bb91a05f5341", file: "CV_ROQUIER_Cantin_EN.pdf", label: "My CV ↓" },
  linkedin: "https://www.linkedin.com/in/cantin-roquier-2a0a50228",
  alt: "My passport on the desk: on the left, the identity page and my monogram; on the right, one visa per project, each in the ink of its stop. The brass stamp dips into the ink pad and adds a new visa: INDEX 2026.",
  labels: { words: "In a few words", route: "The itinerary", langs: "Languages", ways: "How I work", team: "In a team", bag: "In my bag", away: "Away from the code", also: "And also" },
  words: "I like tools that are useful from day one: the ones I build for others, and the ones I make when I'm missing one.",
  more: "In the IT department of Les Mousquetaires, I worked on the mobile app used by staff in over 3,000 Intermarché stores, built two React apps from scratch for the after-sales support team and contributed to the Node.js back-for-front behind them. Today, on a permanent contract, I'm building the React Native app that 1,700 stores use to order fresh products. At home, I make a globe for my travels, a flight-price radar, a password vault, a way to learn Spanish through songs.",
  // The itinerary: a two-lane timeline (school, company) that shows the work-study at a glance,
  // then the details of each lane. Dates are decimal years (September 2020 = 2020 + 8/12).
  route: {
    intro: "From 2020 to 2025, I studied on a work-study programme: school and work at the same time. After graduating in 2025, I stayed on at STIME as an engineer, now on a permanent contract.",
    axis: [2019, 2027],
    band: { from: 2020 + 8 / 12, to: 2025 + 8 / 12, label: "Five years of work-study: school and STIME at the same time" },
    now: { at: 2026 + 9.5 / 12, label: "Today" },
    // No caption under the timeline: Cantin removed it on the French canvas.
    lanes: [
      { label: "At school", bars: [
        { from: 2019 + 8 / 12, to: 2021.5, title: "Technical degree (DUT)", sub: "UPEC" },
        { from: 2021 + 8 / 12, to: 2022 + 8 / 12, title: "Bachelor's", sub: "CY Gennevilliers" },
        { from: 2022 + 8 / 12, to: 2025 + 8 / 12, title: "Engineering degree", sub: "EFREI Paris" },
      ] },
      { label: "At STIME", bars: [
        { from: 2020 + 8 / 12, to: 2025 + 8 / 12, title: "Developer, work-study", sub: "front end and full-stack", tone: "alt" },
        // Trait d'union insécable : « full-stack » ne se coupe pas en fin de ligne dans la barre étroite.
        { from: 2025 + 8 / 12, to: 2026 + 9.5 / 12, title: "Software engineer", sub: "full‑stack and web", tone: "now" },
      ] },
      { label: "Abroad", bars: [
        { from: 2024 + 7.5 / 12, to: 2024 + 10.5 / 12, title: "Internship in Spain · 3 months", tone: "trip", outside: true },
      ] },
    ],
    school: {
      title: "At school",
      sub: "Work-study from 2020 to 2025",
      items: [
        ["2019 – 2021", "Two-year technical degree (DUT) in computer science", "UPEC", "First year full-time, second year as an apprentice."],
        ["2021 – 2022", "Professional bachelor's in web and mobile development", "CY Cergy Paris University · Gennevilliers", "Work-study."],
        ["2022 – 2025", "Master's-level engineering degree", "EFREI Paris", "Work-study, Software and Information Systems track."],
        ["2024", "Engineering internship abroad", "Krakento · Cullera, Spain", "Three months during the work-study: e-commerce websites on Odoo for restaurants, artists and golfers, with their mockups in Figma."],
      ],
    },
    work: {
      title: "At STIME",
      sub: "IT department of Les Mousquetaires Group · Paris",
      items: [
        ["2020 – 2021", "Front-end developer, work-study", "", "A mobile-first flex-office web app, during the COVID-19 crisis."],
        ["2020 – 2025", "Full-stack developer, work-study", "", "The mobile app used by staff in over 3,000 stores (inventory, expiry dates, shelf stocking), two React apps built from scratch for the after-sales support team, and the Node.js back-for-front powering all three."],
        ["2025 – 2026", "Mobile developer, graduate engineer", "", "A React Native app for Intermarché store owners to track their store's performance: key indicators, dashboards, API migration."],
        ["Since 2026", "Full-stack mobile developer", "", "A React Native / Expo app (Android, iOS, web) for ordering fresh products in 1,700 Intermarché stores, and its React back office: shopping cart redesign, news module, clearance-stock front end."],
      ],
    },
    projects: ["And alongside, eleven projects of my own, from 2022 to 2026: every stop on this site, and the site itself.", "Back to the journey →", "Depart"],
  },
  langs: [
    { name: "French", level: "Native", ink: "#8A6A35", rot: -4 },
    { name: "English", level: "C1 · TOEIC 900", ink: "#3E7696", rot: 3 },
    { name: "Spanish", level: "B1, improving", ink: "#B8693F", rot: -2, link: ["With Cancionero →", "Fiche-cancionero"] },
  ],
  ways: [
    ["Start from a real need", "Every project on this journey answers a question I kept asking myself: which gym, given the traffic? When should I buy this ticket?"],
    ["Nothing to install", "Whenever possible, a link is enough: Tonalli, Cancionero and gym-picker open in the browser and install on the home screen."],
    ["Data stays at home", "Magellan keeps trips on the phone, Mithril does without the cloud, gym-picker doesn't know my address."],
    ["Guarantees you can check", "Tonalli's reciprocity is written into the database; Mithril's security rules are checked again on every change."],
  ],
  team: ["Autonomy", "Teaching", "Team spirit", "Discipline", "Sociability", "Bringing people together"],
  bag: [
    ["Front end and mobile", ["React", "React Native", "Expo", "TypeScript", "JavaScript", "HTML", "CSS"]],
    ["Back end and data", ["Node.js", "Supabase", "PostgreSQL", "C# and .NET", "Java", "SQL", "Couchbase"]],
    ["3D", ["Three.js", "WebGL"]],
    ["Tools and CI", ["Git", "GitHub", "GitHub Actions", "Docker", "Figma", "Odoo"]],
    ["Testing and AI", ["Playwright", "GitHub Copilot", "Claude Code"]],
    ["Methods", ["Scrum", "SAFe", "Kanban"]],
  ],
  // Featured at Cantin's request: hiking, history, combat sports.
  away: [
    { img: OBJ.hike, title: "Hiking", alt: "A small clay mountain, its brass trail switching back up to the summit flag; a hiker climbs it", todo: "[A line of yours: your best trail, or the one still waiting for you.]" },
    { img: OBJ.book, title: "History", alt: "A stack of history books, the top one falling open, with a brass bookmark", todo: "[A line of yours: the period or the book that stayed with you.]" },
    { img: OBJ.gloves, title: "Combat sports", text: "Savate (French kickboxing), MMA, Brazilian jiu-jitsu.", alt: "A pair of clay boxing gloves with brass lacing", todo: "[A line of yours: what fighting gives you.]" },
  ],
  also: ["Travel", "Climbing", "Tennis", "Swimming", "Running"],
};
