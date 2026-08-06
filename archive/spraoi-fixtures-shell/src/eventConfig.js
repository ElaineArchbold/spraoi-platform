// ============================================================
// EVENT CONFIGURATION
// Edit this file to set up a new blitz/tournament event.
// Everything event-specific lives here - the app reads from this.
// ============================================================

export const EVENT_CONFIG = {
  // --- Event details ---
  name: "U12 Hurling Blitz",
  hostClub: "Your Club Name",
  date: "Saturday 22 August 2026",
  venue: "Your Venue Name, Address",
  registration: "9:15 a.m.",
  procession: "9:30 a.m.",
  firstThrowIn: "10:00 a.m.",
  targetFinish: "3:00 p.m.",
  eventYear: 2026,
  eventMonth: 7,  // JS months are 0-indexed (7 = August)
  eventDay: 22,

  // --- Branding ---
  motto: ["Meas", "Neart", "Bua"],        // set to [] if no motto
  mottoTranslation: "Respect, Strength, Victory",  // set to "" if none
  colors: {
    primary: "#E31E24",       // main brand color (red)
    primaryDark: "#8C1216",   // darker shade
    accent: "#F2B632",        // gold/accent
    background: "#FBF8F3",    // app background
    dark: "#141110",          // dark panels
    text: "#1C1613",          // main text
    textMuted: "#6B5A52",     // secondary text
  },
  heroBright: "#D61224",
  heroDark: "#750712",

  // --- Clubs (8 clubs, each with an id, name, town, county, color) ---
  clubs: [
    { id: "club1", name: "Club 1 GAA", town: "Town", county: "County", color: "#B3202E", contact: "" },
    { id: "club2", name: "Club 2 GAA", town: "Town", county: "County", color: "#7A1F2B", contact: "" },
    { id: "club3", name: "Club 3 GAA", town: "Town", county: "County", color: "#D9A441", contact: "" },
    { id: "club4", name: "Club 4 GAA", town: "Town", county: "County", color: "#1C1C1C", contact: "" },
    { id: "club5", name: "Club 5 GAA", town: "Town", county: "County", color: "#1D4E89", contact: "" },
    { id: "club6", name: "Club 6 GAA", town: "Town", county: "County", color: "#8C1A2B", contact: "" },
    { id: "club7", name: "Club 7 GAA", town: "Town", county: "County", color: "#1C5FA8", contact: "" },
    { id: "club8", name: "Club 8 GAA", town: "Town", county: "County", color: "#2F8F3E", contact: "" },
  ],

  // --- Club crests (place PNG files in /public/crests/) ---
  // Map each club id to its crest filename. Set to "" if no crest.
  crests: {
    club1: "/crests/club1.png",
    club2: "/crests/club2.png",
    club3: "/crests/club3.png",
    club4: "/crests/club4.png",
    club5: "/crests/club5.png",
    club6: "/crests/club6.png",
    club7: "/crests/club7.png",
    club8: "/crests/club8.png",
  },

  // --- Admin accounts (organisers who get full access) ---
  // Key = name to type, Value = display name
  admins: {
    Admin1: "Admin1",
    Admin2: "Admin2",
  },

  // --- Club passwords (for food ordering) ---
  clubPasswords: {
    club1: "code1",
    club2: "code2",
    club3: "code3",
    club4: "code4",
    club5: "code5",
    club6: "code6",
    club7: "code7",
    club8: "code8",
  },

  // --- Referee ---
  refereeSecret: "changeMe2026",  // URL param for ref access
  refereePin: "1234",             // 4-digit PIN for ref screen

  // --- Match format ---
  pitches: ["Pitch 1", "Pitch 2", "Pitch 3"],
  playersPerTeam: 13,
  matchDurationMin: 23,       // 20 min play + 3 min half-time
  slotMinutes: 25,            // time between match starts
  lunchMinutes: 25,
  presentationMinutes: 15,
  startHour: 10,
  startMin: 0,

  // --- Food ordering ---
  foodEnabled: true,
  sausageBapPrice: 2,
  orderLockDate: "2026-08-19T23:59:59",
  breakfastItemName: "Swanny's Breakfast Banger (sausage in a bun)",

  // --- Welcome message (shown in Info page) ---
  welcomeParagraphs: [
    "A Chairde,",
    "Welcome to our tournament!",
    "We hope every player goes home having had a brilliant day.",
  ],
  welcomeSignoff: "The Organising Team",

  // --- Sponsors (can be managed in admin, but seed defaults here) ---
  defaultSponsors: [
    { id: "s1", name: "Sponsor 1", url: "", logo: "" },
    { id: "s2", name: "Sponsor 2", url: "", logo: "" },
  ],
};
