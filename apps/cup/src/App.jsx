import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Home, Users, Trophy, UtensilsCrossed, Info, MapPin, ChevronLeft, Plus, Minus, Check, Megaphone, Lock, X, Phone, Eye, EyeOff, Shield, UserCircle, Flag } from "lucide-react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";

/* ---------- Design tokens (matched to the real club crest: red / black / gold) ---------- */
const C = {
  turf: "#141110",
  pitch: "#E31E24",
  pitchLight: "#8C1216",
  line: "#FBF8F3",
  ash: "#AE7D64",
  sliotar: "#F2B632",
  ink: "#1C1613",
  inkSoft: "#6B5A52",
};

const FONT_IMPORT = `
*, *::before, *::after { box-sizing: border-box; }
input, select, textarea, button { box-sizing: border-box; max-width: 100%; }
body { font-family: "Inter", sans-serif; }
`;
const HERO_BRIGHT = "#D61224";
const HERO_DARK = "#750712";

// The ?v= tag forces browsers/CDN to re-fetch when a crest/logo image is updated —
// bump this number any time an image file changes, otherwise cached copies can stick around.
const CREST_VERSION = "6";
const BADGE_LOGO = `/logo.png?v=${CREST_VERSION}`;

const CRESTS = {
  fing: `/crests/fing.png?v=${CREST_VERSION}`,
  finian: `/crests/finian.png?v=${CREST_VERSION}`,
  rathvilly: `/crests/rathvilly.png?v=${CREST_VERSION}`,
  knockbridge: `/crests/knockbridge.png?v=${CREST_VERSION}`,
  naomheoin: `/crests/naomheoin.png?v=${CREST_VERSION}`,
  navanom: `/crests/navanom.png?v=${CREST_VERSION}`,
  ratoath: `/crests/ratoath.png?v=${CREST_VERSION}`,
  brayemmets: `/crests/brayemmets.png?v=${CREST_VERSION}`,
};


/* ---------- Event constants ---------- */
const EVENT = {
  name: "Fingallians U12 Hurling Blitz",
  date: "Saturday 22 August 2026",
  venue: "Lawless Memorial Park, Fingallians GAA, Swords",
  registration: "9:15 a.m.",
  procession: "9:30 a.m.",
  firstThrowIn: "10:00 a.m.",
  targetFinish: "3:00 p.m.",
};
// Used to check "is it actually event day" — separate from the display string
// above, so scheduled announcements can't accidentally fire on some random
// Tuesday just because the time-of-day happens to match.
const EVENT_YEAR = 2026;
const EVENT_MONTH = 7; // August — JS months are 0-indexed
const EVENT_DAY = 22;
function isEventDay(d = new Date()) {
  return d.getFullYear() === EVENT_YEAR && d.getMonth() === EVENT_MONTH && d.getDate() === EVENT_DAY;
}

const WELCOME_PARAGRAPHS = [
  "A Chairde,",
  "Céad míle fáilte to Lawless Memorial Park.",
  "Fingallians GAA are absolutely thrilled to welcome every player, mentor, parent and supporter who has made the journey to Swords today for our Under 12 Hurling Invitational. Whether you have travelled from down the road or from across the country, we are genuinely delighted to have you here with us.",
  "Days like today are what the GAA is all about. There is something truly special about watching Under 12s take to the pitch, the energy, the enthusiasm and the sheer joy of the game at that age is something that never gets old. We are proud to host clubs from across Ireland, each bringing their own style, skill and spirit, and we hope every child goes home having been challenged, encouraged and most importantly, having had a brilliant day.",
  "To our visiting clubs - thank you. The effort involved in preparing a squad, organising travel and giving up a Saturday is not lost on us. We hope you feel the warmth of our welcome from the moment you arrive.",
  "To our own Fingallians players - today is your day to shine on home turf. Play with pride, play with heart, and represent your club the way we know you can.",
  "To every parent, mentor and volunteer who has given their time to make today possible - both here at Fingallians and in clubs across the country - thank you sincerely. None of this happens without you.",
  "We ask everyone to embrace the spirit of fair play, to cheer on every child regardless of the jersey they wear and to remember that at Under 12, the most important thing is that every player enjoys their day and leaves the pitch with a smile.",
  "Today is one of the highlights of the Fingallians Juvenile Calendar, and we hope it becomes a memory that players, families and clubs treasure for years to come.",
  "Enjoy every minute of it.",
];
const WELCOME_SIGNOFF = "2014 Boys Mentoring Team";

const DEFAULT_CLUBS = [
  { id: "fing", name: "Fingallians GAA", town: "Swords", county: "Dublin", color: "#B3202E", contact: "" },
  { id: "finian", name: "St. Finian's GAA, Swords", town: "Swords", county: "Dublin", color: "#7A1F2B", contact: "" },
  { id: "rathvilly", name: "Rathvilly GAA", town: "Rathvilly", county: "Carlow", color: "#D9A441", contact: "" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth", color: "#1C1C1C", contact: "" },
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim", color: "#1D4E89", contact: "" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath", color: "#8C1A2B", contact: "" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath", color: "#1C5FA8", contact: "" },
  { id: "brayemmets", name: "Bray Emmets GAA", town: "Bray", county: "Wicklow", color: "#2F8F3E", contact: "" },
];

// Each club fields an A and a B team — fixtures, results and the leaderboard all
// operate on these 16 entries, while food ordering stays at the club (8) level.
function buildTeamsFromClubs(clubs) {
  return clubs.flatMap((c) =>
    ["A", "B"].map((suffix) => ({
      id: `${c.id}${suffix}`,
      clubId: c.id,
      name: `${c.name} ${suffix}`,
      town: c.town,
      county: c.county,
      color: c.color,
    }))
  );
}
const DEFAULT_TEAMS = buildTeamsFromClubs(DEFAULT_CLUBS);

const DEFAULT_MATCHES = [];

const DEFAULT_ANNOUNCEMENTS = [
  { id: "a-preorder", text: "Don't forget to submit your food order on the Team tab -- confirm your headcount for burgers and pre-order any Swanny's Breakfast Bangers. Deadline: 19 August.", time: "" },
];

const DEFAULT_ORDERS = {};
const DEFAULT_SPONSORS = [
  { id: "s1", name: "Sponsor 1", url: "", logo: "" },
  { id: "s2", name: "Sponsor 2", url: "", logo: "" },
  { id: "s3", name: "Sponsor 3", url: "", logo: "" },
  { id: "s4", name: "Sponsor 4", url: "", logo: "" },
  { id: "s5", name: "Sponsor 5", url: "", logo: "" },
  { id: "s6", name: "Sponsor 6", url: "", logo: "" },
];

// Named organiser logins — all have identical full access (fixtures, scores, all food orders,
// announcements, sponsors). Passcode is simply the person's own first name (case-insensitive
// on entry, see findAdminByCode below). Add/remove people here any time.
const ADMIN_ACCOUNTS = {
  Elaine: "Elaine",
  Conor: "Conor",
  Dara: "Dara",
  Deco: "Deco",
  Mark: "Mark",
  Sean: "Sean",
  Sinead: "Sinead",
  Pat: "Pat",
  Rebecca: "Rebecca",
};
function findAdminByCode(code) {
  const trimmed = (code || "").trim().toLowerCase();
  const match = Object.entries(ADMIN_ACCOUNTS).find(([key]) => key.toLowerCase() === trimmed);
  return match ? match[1] : null;
}

// Referees get in via a secret link (e.g. blitz.fingallians.fun/?ref=blitzref2026)
// rather than a visible button — there's no password gate on referee mode (just a
// name, for accountability in the audit log), so this keeps it from being an open
// door anyone browsing the app could stumble into. Change this any time if it leaks.
const REFEREE_SECRET = "sliotar22aug";

// Per-club password for editing that club's food order — pattern: 4-letter club code + 2-digit
// founding year. Case-insensitive on entry (see checkPassword below).
const CLUB_PASSWORDS = {
  fing: "fing84",
  finian: "fini83",
  rathvilly: "rath88",
  knockbridge: "knoc85",
  naomheoin: "naom29",
  navanom: "nava48",
  ratoath: "rato03",
  brayemmets: "bray85",
};
function checkPassword(input, expected) {
  return (input || "").trim().toLowerCase() === (expected || "").trim().toLowerCase();
}
const MENTOR_BURGER_NOTE = "Every player and mentor receives a free burger voucher on arrival. Swanny's Breakfast Bangers (sausage in a bun, \u20AC2 each) are available at the BBQ from registration if pre-ordered below. Please confirm your headcount and breakfast order by 19 August so we can have everything ready.";

// TEMPORARY placeholder price — update once the real price per sausage bap is confirmed.
const SAUSAGE_BAP_PRICE = 2;

// TENTATIVE — confirm the real cutoff date. Orders lock at the end of this day.
const ORDER_LOCK_DATE = new Date("2026-08-19T23:59:59");
function ordersAreLocked() {
  return new Date() > ORDER_LOCK_DATE;
}

/* ---------- Storage helpers (Supabase kv_store) ---------- */

async function loadShared(key, fallback) {
  try {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .single();
    if (error || !data) {
      // Row doesn't exist yet - seed it with the default
      await saveShared(key, fallback);
      return fallback;
    }
    return data.value;
  } catch (e) {
    console.error("loadShared failed", key, e);
    return fallback;
  }
}

async function saveShared(key, value) {
  try {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      console.error("save failed", key, error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("save failed", key, e);
    return { ok: false, error: e.message || "Network error" };
  }
}

/* ---------- Score helpers ---------- */
function scoreTotal(goals, points) {
  return goals * 3 + points;
}
function scoreLabel(goals, points) {
  return `${goals}-${String(points).padStart(2, "0")}`;
}

/* ---------- Scoreboard flip component (signature element) ---------- */
function Scoreline({ goals, points, big }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[goals, "\u2013", String(points).padStart(2, "0")].map((ch, i) => (
        <div
          key={i}
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 600,
            fontSize: big ? 23 : 16,
            lineHeight: 1,
            color: C.line,
            background: C.turf,
            borderRadius: 4,
            padding: big ? "6px 8px" : "3px 5px",
            minWidth: ch === "\u2013" ? "auto" : big ? 22 : 15,
            textAlign: "center",
            border: `1px solid ${C.pitchLight}`,
          }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

function LogoBadge({ size = 60, ringWidth = 3 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        border: `${ringWidth}px solid ${C.sliotar}`,
        boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <img
        src={BADGE_LOGO}
        alt="Fingallians Hurling Blitz badge"
        style={{ width: "88%", height: "88%", objectFit: "contain" }}
      />
    </div>
  );
}

function TeamBadge({ team, size = 40 }) {
  const crest = CRESTS[team.clubId || team.id];
  const grade = team.id?.endsWith("A") ? "A" : team.id?.endsWith("B") ? "B" : null;
  const badgeSize = Math.max(10, Math.round(size * 0.36));

  const gradeBadge = grade && (
    <div
      style={{
        position: "absolute",
        bottom: -badgeSize * 0.08,
        right: -badgeSize * 0.08,
        width: badgeSize,
        height: badgeSize,
        borderRadius: "50%",
        background: grade === "A" ? C.pitch : C.sliotar,
        border: "1.5px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'League Spartan', sans-serif",
        fontWeight: 800,
        fontSize: badgeSize * 0.62,
        color: grade === "A" ? "#fff" : C.ink,
        boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
      }}
    >
      {grade}
    </div>
  );

  if (crest) {
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
            overflow: "hidden",
            border: `1px solid ${C.pitch}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={crest}
            alt={team.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
        {gradeBadge}
      </div>
    );
  }
  const initials = team.name
    .replace(/GAA|Hurling Club|CLG/gi, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 25%, ${team.color}dd, ${team.color})`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 600,
          fontSize: size * 0.4,
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        }}
      >
        {initials}
      </div>
      {gradeBadge}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    scheduled: { bg: "#EDE7DA", fg: C.inkSoft, label: "Scheduled" },
    live: { bg: C.sliotar, fg: C.ink, label: "● Live" },
    finished: { bg: C.pitch, fg: "#fff", label: "Full time" },
  };
  const s = map[status] || map.scheduled;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        fontFamily: "Inter, sans-serif",
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}

/* ---------- Bottom nav ---------- */
function BottomNav({ screen, setScreen }) {
  const items = [
    { key: "today", label: "Home", icon: Home },
    { key: "fixtures", label: "Fixtures", icon: Trophy },
    { key: "standings", label: "Standings", icon: Users },
    { key: "team", label: "Team", icon: Shield },
    { key: "info", label: "Info", icon: Info },
  ];
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.pitch,
        borderTop: `2px solid ${C.sliotar}`,
        display: "flex",
        zIndex: 20,
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = screen === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setScreen(it.key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "10px 4px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: active ? C.line : "rgba(255,255,255,0.65)",
              cursor: "pointer",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} fill={active ? C.line : "none"} />
            <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: active ? 700 : 500 }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Header ---------- */
function TopBar({ title, onBack, right, followedTeam }) {
  return (
    <div
      style={{
        background: C.pitch,
        color: C.line,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 15,
        borderBottom: `2px solid ${C.sliotar}`,
      }}
    >
      {onBack ? (
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.line, cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <ChevronLeft size={22} />
        </button>
      ) : (
        <LogoBadge size={46} ringWidth={2.5} />
      )}
      <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 18, letterSpacing: 0.3, flex: 1 }}>
        {title}
      </div>
      {right}
      {!right && followedTeam && <TeamBadge team={followedTeam} size={46} />}
    </div>
  );
}

function SponsorStrip({ sponsors }) {
  const list = sponsors;
  if (!list.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        padding: "8px 16px",
        borderBottom: `1px solid ${C.pitch}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {list.map((s) => (
        <a
          key={s.id}
          href={s.url || undefined}
          onClick={(e) => !s.url && e.preventDefault()}
          title={s.name}
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: C.line,
            border: `1.5px solid ${C.ash}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          {s.logo ? (
            <img src={s.logo} alt={s.name} style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 9, color: C.ink, textAlign: "center", lineHeight: 1.05, padding: 2 }}>
              {s.name}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

/* ================= SCREENS ================= */

function WelcomeScreen({ clubs, onChoose, onClose, myClubName }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: C.line,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
          padding: "14px 20px 26px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "none",
              borderRadius: 20,
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        <div
          style={{
            width: 150,
            height: 179,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))",
          }}
        >
          <img src={BADGE_LOGO} alt="Fingallians Hurling Blitz badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        <div
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "5px 14px",
            borderRadius: 20,
            border: "1.5px solid rgba(255,255,255,0.55)",
            background: "rgba(255,255,255,0.1)",
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1,
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          Fingallians
        </div>

        <div
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 800,
            fontSize: 30,
            color: "#fff",
            textTransform: "uppercase",
            lineHeight: 1.05,
            marginTop: 10,
            letterSpacing: 0.3,
          }}
        >
          Hurling Blitz
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 8, maxWidth: 320 }}>
          Select your club, then explore fixtures, standings, and your food order.
        </div>

        {myClubName && (
          <div
            style={{
              marginTop: 18,
              background: "rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1 }}>
              Following
            </div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginTop: 2 }}>
              {myClubName}
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", padding: 0, marginTop: 2, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.sliotar, textDecoration: "underline", cursor: "pointer" }}
            >
              Continue with this club
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          marginTop: -14,
          padding: "20px 18px 24px",
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" }}>
          {myClubName ? "Pick a different club" : "Choose your club"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c.id)}
              style={{
                background: "#FFF7F6",
                border: `2px solid ${HERO_BRIGHT}33`,
                borderRadius: 16,
                padding: "18px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              <TeamBadge team={c} size={76} />
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, textAlign: "center", lineHeight: 1.25 }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            display: "block",
            width: "100%",
            background: "none",
            border: "none",
            marginTop: 20,
            fontFamily: "Inter, sans-serif",
            fontSize: 12.5,
            color: HERO_BRIGHT,
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          Just browsing — continue without a club
        </button>
      </div>
    </div>
  );
}

function DayTimeline({ matches, lunchWindows, presentations }) {
  const groupMatches = matches.filter((m) => !m.finalLabel);
  const finals = matches.filter((m) => m.finalLabel && m.finalLabel !== "Presentations");
  const hasLunch = Array.isArray(lunchWindows) && lunchWindows.length > 0;
  const lastGroupTime = groupMatches.length > 0 ? groupMatches.map((m) => m.time).sort().slice(-1)[0] : null;
  const cupFinal = finals.find((f) => f.finalLabel?.includes("Cup"));
  const shieldFinal = finals.find((f) => f.finalLabel?.includes("Shield"));

  const steps = [
    { time: EVENT.registration, label: "Registration & team photos" },
    { time: EVENT.procession, label: "Opening procession" },
    {
      time: EVENT.firstThrowIn,
      label: hasLunch ? `Matches begin — first round, through ${lunchWindows[0].from}` : "Matches begin",
    },
    hasLunch && {
      time: lunchWindows[0].from,
      label: `Lunch begins — matches continue on remaining pitches, through ${lunchWindows[lunchWindows.length - 1].to}`,
      note: "See your Team tab for your club's allocated lunch time — your burgers will be ready then.",
    },
    lastGroupTime && {
      time: lastGroupTime,
      label: "Final group matches — finalists confirmed shortly after",
    },
    shieldFinal && { time: shieldFinal.time, label: "\uD83D\uDEE1\uFE0F Shield Finals" },
    cupFinal && { time: cupFinal.time, label: "\uD83C\uDFC6 Cup Finals" },
    presentations && {
      time: presentations.from,
      label: `Presentations & close — all done by ${presentations.to}`,
    },
  ].filter(Boolean);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: "14px 16px" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === steps.length - 1 ? C.sliotar : C.pitch,
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: `${C.pitch}22`, minHeight: 24 }} />}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13.5, color: C.pitch }}>{s.time}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, marginTop: 1, lineHeight: 1.4 }}>{s.label}</div>
            {s.note && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 3, lineHeight: 1.4, fontStyle: "italic" }}>
                {s.note}
              </div>
            )}
          </div>
        </div>
      ))}
      {!hasLunch && (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 8, fontStyle: "italic" }}>
          The rest of the day's timing will appear here once the schedule is generated.
        </div>
      )}
    </div>
  );
}

function TodayScreen({ teams, clubs, matches, announcements, sponsors, setScreen, setSelectedTeam, myClubName, myClubObj, onChangeClub, onOpenWelcome, lunchWindows, presentations }) {
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`, color: C.line, padding: "20px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#fff",
              border: `2px solid ${C.sliotar}`,
              boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img src={BADGE_LOGO} alt="Fingallians badge" style={{ width: "72%", height: "72%", objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 1.5, color: "#F5D9A0", textTransform: "uppercase" }}>
              {EVENT.date}
            </div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 19, marginTop: 2, lineHeight: 1.15, letterSpacing: 0.2, textTransform: "uppercase" }}>
              {EVENT.name}
            </div>
          </div>
          {myClubObj && <TeamBadge team={myClubObj} size={44} />}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#E9DAD0", marginTop: 4 }}>{EVENT.venue}</div>

        {myClubName ? (
          <button
            onClick={onChangeClub}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 12.5,
              color: C.sliotar,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Following {myClubName} <span style={{ color: "#E9DAD0", fontWeight: 400 }}>· change</span>
          </button>
        ) : (
          <button
            onClick={onOpenWelcome}
            style={{
              marginTop: 10,
              background: "rgba(255,255,255,0.12)",
              border: `1px solid ${C.sliotar}`,
              borderRadius: 20,
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 12.5,
              color: C.line,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            👋 Choose your club
          </button>
        )}

        <div
          style={{
            marginTop: 14,
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${C.sliotar}`,
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Order of the Day
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
            {[
              ["Registration", EVENT.registration],
              ["Procession", EVENT.procession],
              ["Throw-in", EVENT.firstThrowIn],
              ["Finish", presentations?.to ? `~${presentations.to}` : EVENT.targetFinish],
            ].map(([label, time]) => (
              <div key={label} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#fff" }}>{time}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, color: "rgba(255,255,255,0.7)" }}>{label}</div>
              </div>
            ))}
          </div>
          {Array.isArray(lunchWindows) && lunchWindows.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)", textAlign: "center" }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#fff" }}>
                {lunchWindows[0].from} – {lunchWindows[lunchWindows.length - 1].to}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                Lunch — 2 sittings, 4 clubs at a time (check the Team tab for your exact time)
              </div>
            </div>
          )}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.75)", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            Register, then head to the club ball wall for a team photo.
          </div>
        </div>
      </div>

      <SponsorStrip sponsors={sponsors} />

      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>
          Plan for the Day
        </div>
        <DayTimeline matches={matches} lunchWindows={lunchWindows} presentations={presentations} />
      </div>

      <div style={{ padding: "14px 16px 4px" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
          The 8 Clubs
        </div>
        <ClubsShowcase clubs={clubs} setScreen={setScreen} />
      </div>

      {announcements.length > 0 && (
        <div style={{ padding: "12px 16px 0" }}>
          {announcements.slice(0, 2).map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 8,
                background: "#fff",
                border: `1px solid ${C.ash}33`,
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <Megaphone size={16} color={C.sliotar} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function finalIcon(label) {
  if (!label) return "";
  return label.includes("Shield") ? "🛡️" : "🏆";
}

function MatchRow({ match, teamById }) {
  if (match.finalLabel === "Presentations") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.sliotar, textTransform: "uppercase", letterSpacing: 0.5 }}>
          🏆 Presentations
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
          Trophies and medals — day officially wraps up here
        </div>
      </div>
    );
  }

  const aBlank = !match.teamA;
  const bBlank = !match.teamB;

  if (match.finalLabel && (aBlank || bBlank)) {
    const isShield = match.finalLabel.includes("Shield");
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {finalIcon(match.finalLabel)} {match.finalLabel}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
          Teams to be confirmed — group {isShield ? "runners-up" : "winners"}
        </div>
      </div>
    );
  }

  const a = teamById(match.teamA);
  const b = teamById(match.teamB);
  return (
    <div>
      {match.finalLabel && (
        <div style={{ textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.sliotar, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          {finalIcon(match.finalLabel)} {match.finalLabel}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          <TeamBadge team={a} size={40} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.name}
          </span>
        </div>
        {match.status !== "scheduled" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Scoreline goals={match.goalsA} points={match.pointsA} />
            <span style={{ color: C.inkSoft, fontSize: 11, fontFamily: "Inter, sans-serif" }}>v</span>
            <Scoreline goals={match.goalsB} points={match.pointsB} />
          </div>
        ) : (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, padding: "0 4px" }}>v</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {b.name}
          </span>
          <TeamBadge team={b} size={40} />
        </div>
      </div>
    </div>
  );
}

function TeamsScreen({ teams, matches, setScreen, setSelectedTeam }) {
  const clubs = [];
  const seen = new Set();
  teams.forEach((t) => {
    const cid = t.clubId || t.id;
    if (!seen.has(cid)) {
      seen.add(cid);
      clubs.push({ clubId: cid, name: t.name.replace(/\s+[AB]$/, ""), town: t.town, county: t.county, color: t.color });
    }
  });

  return (
    <div style={{ padding: 16 }}>
      <TopBar title="Teams" />
      <div style={{ height: 12 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clubs.map((c) => (
          <div
            key={c.clubId}
            style={{
              background: "#fff",
              border: `1px solid ${C.pitch}22`,
              borderRadius: 14,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <TeamBadge team={c} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink, lineHeight: 1.25 }}>
                {c.name}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 8 }}>{c.town}, Co. {c.county}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["A", "B"].map((suffix) => (
                  <button
                    key={suffix}
                    onClick={() => {
                      setSelectedTeam(`${c.clubId}${suffix}`);
                      setScreen("teamDetail");
                    }}
                    style={{
                      background: C.turf,
                      color: C.line,
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 16px",
                      fontFamily: "'League Spartan', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {suffix} team
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamDetailScreen({ teamId, teams, matches, setScreen }) {
  const team = teams.find((t) => t.id === teamId);
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const teamMatches = matches.filter((m) => m.teamA === teamId || m.teamB === teamId);
  if (!team) return null;
  return (
    <div>
      <TopBar title={team.name} onBack={() => setScreen("teams")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TeamBadge team={team} size={56} />
          <div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>{team.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{team.town}, Co. {team.county}</div>
          </div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Fixtures & results
        </div>
        {teamMatches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>No fixtures yet.</div>
        )}
        {teamMatches.map((m) => (
          <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                <PitchBadge pitch={m.pitch} />
              </div>
              <StatusPill status={m.status} />
            </div>
            <MatchRow match={m} teamById={teamById} />
          </div>
        ))}
        {team.contact && (
          <div style={{ marginTop: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>
            <b>Team contact:</b> {team.contact}
          </div>
        )}
      </div>
    </div>
  );
}

function ClubsShowcase({ clubs, setScreen }) {
  const [selectedClub, setSelectedClub] = useState(null);
  return (
    <div style={{ background: "#fff", padding: "16px 12px 14px", borderBottom: `1px solid ${C.pitch}14` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {clubs.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClub(c)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
              padding: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                padding: 3,
                background: `linear-gradient(135deg, ${C.sliotar}, ${c.color})`,
              }}
            >
              <TeamBadge team={c} size={62} />
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: C.ink, textAlign: "center", lineHeight: 1.2 }}>
              {c.name}
            </span>
          </button>
        ))}
      </div>
      {selectedClub && (
        <div
          onClick={() => setSelectedClub(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(20,17,16,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "32px 24px", maxWidth: 300, width: "100%", textAlign: "center", boxShadow: "0 16px 50px rgba(0,0,0,0.4)", position: "relative" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px", padding: 4, background: `linear-gradient(135deg, ${C.sliotar}, ${selectedClub.color})` }}>
              <TeamBadge team={selectedClub} size={112} />
            </div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.ink, marginBottom: 4 }}>{selectedClub.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>{selectedClub.town}, Co. {selectedClub.county}</div>
            <button onClick={() => setSelectedClub(null)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "#f3ecec", border: "none", fontSize: 16, fontWeight: 900, color: C.pitch, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PitchBadge({ pitch }) {
  const num = (pitch.match(/\d+/) || [])[0] || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: C.pitch,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>Pitch {num}</span>
    </div>
  );
}

function FixturesScreen({ teams, clubs, matches, sponsors, setScreen, myClubObj }) {
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const groupMatches = matches.filter((m) => !m.finalLabel);
  const finals = matches.filter((m) => m.finalLabel);

  const upcomingGroupMatches = groupMatches.filter((m) => m.status !== "finished");
  const finishedGroupMatches = groupMatches.filter((m) => m.status === "finished");

  const groupByTime = (list) => {
    const groups = {};
    list.forEach((m) => {
      groups[m.time] = groups[m.time] || [];
      groups[m.time].push(m);
    });
    return groups;
  };
  const upcomingGroups = groupByTime(upcomingGroupMatches);
  const finishedGroups = groupByTime(finishedGroupMatches);

  const renderMatchCard = (m) => (
    <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <PitchBadge pitch={m.pitch} />
        <StatusPill status={m.status} />
      </div>
      <MatchRow match={m} teamById={teamById} />
    </div>
  );

  return (
    <div>
      <TopBar title="Fixtures" followedTeam={myClubObj} />
      <SponsorStrip sponsors={sponsors} />
      <div style={{ padding: 16 }}>
        {matches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Fixtures will appear here once the organiser adds them.
          </div>
        )}

        {Object.keys(upcomingGroups).sort().map((time) => (
          <div key={time} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 6 }}>{time}</div>
            {upcomingGroups[time].map(renderMatchCard)}
          </div>
        ))}

        {finishedGroupMatches.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 18 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, paddingTop: 10, borderTop: `1px solid ${C.pitch}14` }}>
              ✅ Results
            </div>
            {Object.keys(finishedGroups).sort().map((time) => (
              <div key={time} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.inkSoft, marginBottom: 6 }}>{time}</div>
                {finishedGroups[time].map(renderMatchCard)}
              </div>
            ))}
          </div>
        )}

        {finals.length > 0 && (
          <div
            style={{
              background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              border: `2px solid ${C.sliotar}`,
            }}
          >
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
              🏆 Finals Day
            </div>
            {Object.entries(
              finals.reduce((acc, m) => {
                acc[m.time] = acc[m.time] || [];
                acc[m.time].push(m);
                return acc;
              }, {})
            )
              .sort(([t1], [t2]) => t1.localeCompare(t2))
              .map(([time, ms]) => (
                <div key={time}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#fff", opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    {time} — {ms[0].finalLabel === "Presentations" ? "🏆 Presentations" : ms[0].finalLabel?.includes("Shield") ? "🛡️ Shield Finals" : "🏆 Cup Finals"}
                  </div>
                  {ms.map((m) => (
                    <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      {m.finalLabel !== "Presentations" && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <PitchBadge pitch={m.pitch} />
                          <StatusPill status={m.status} />
                        </div>
                      )}
                      <MatchRow match={m} teamById={teamById} />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function computeStandings(teams, matches) {
  const table = {};
  teams.forEach((t) => {
    table[t.id] = { id: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 };
  });
  const headToHead = {}; // key `${a}-${b}` -> winner id
  matches.filter((m) => m.status === "finished").forEach((m) => {
    const ta = table[m.teamA];
    const tb = table[m.teamB];
    if (!ta || !tb) return;
    const sa = scoreTotal(m.goalsA, m.pointsA);
    const sb = scoreTotal(m.goalsB, m.pointsB);
    ta.played++;
    tb.played++;
    if (sa > sb) {
      ta.won++; ta.points += 3; tb.lost++;
      headToHead[`${m.teamA}-${m.teamB}`] = m.teamA;
      headToHead[`${m.teamB}-${m.teamA}`] = m.teamA;
    } else if (sb > sa) {
      tb.won++; tb.points += 3; ta.lost++;
      headToHead[`${m.teamA}-${m.teamB}`] = m.teamB;
      headToHead[`${m.teamB}-${m.teamA}`] = m.teamB;
    } else {
      ta.drawn++; tb.drawn++; ta.points += 1; tb.points += 1;
    }
  });
  const rows = Object.values(table).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const hh = headToHead[`${x.id}-${y.id}`];
    if (hh === x.id) return -1;
    if (hh === y.id) return 1;
    return 0;
  });
  return rows;
}

// Computes the set of auto-triggered announcements based on the actual schedule —
// registration, one per lunch sitting (naming the clubs in it), and one ahead of
// the finals. Recomputes fresh any time the schedule changes, so it always
// reflects reality rather than a fixed guess. Each has a stable `id` so the
// trigger effect can tell "already posted" from "not yet due".
function computeScheduledAnnouncements(matches, lunchWindows, clubs) {
  const list = [];
  const clubName = (cid) => clubs.find((c) => c.id === cid)?.name || cid;
  const timeToMin = (t) => {
    const [h, m] = t.replace(/\s*[ap]\.?m\.?/i, "").trim().split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const minToLabel = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const LEAD_MINUTES = 10; // every scheduled announcement fires this many minutes ahead of its event

  // Registration — fires at 9:02 a.m. on event morning.
  list.push({
    id: "sched-registration",
    triggerMin: 9 * 60 + 2,
    text: `Registration opens at ${EVENT.registration}! Head to the clubhouse to register your team, then over to the club ball wall for your team photo.`,
  });

  // One per lunch sitting, naming the clubs in it — fires 10 minutes ahead so
  // there's time to wrap up a match and walk over.
  if (Array.isArray(lunchWindows)) {
    lunchWindows.forEach((w, i) => {
      const names = (w.clubs || []).map(clubName).join(", ");
      list.push({
        id: `sched-lunch-${i}`,
        triggerMin: timeToMin(w.from) - LEAD_MINUTES,
        text: `Burger break at ${w.from} for: ${names}. Burgers will be ready and handed to your lead mentor at your allocated time.`,
      });
    });
  }

  // Finals — fires 10 minutes ahead of the Shield Final kickoff (first final).
  const shieldFinal = matches.find((m) => m.finalLabel === "A Shield Final");
  if (shieldFinal) {
    list.push({
      id: "sched-finals",
      triggerMin: timeToMin(shieldFinal.time) - LEAD_MINUTES,
      text: `Finals are almost here! Make your way to the main pitch. Shield Finals kick off at ${shieldFinal.time}, Cup Finals to follow.`,
    });
  }

  return list.map((s) => ({ ...s, triggerLabel: minToLabel(Math.max(0, s.triggerMin)) }));
}

function computeGroups(teams, matches) {
  // Two teams are in the same group if they've been drawn against each other in
  // the group stage — connected components of that "has played" graph = the groups.
  // This is derived from the fixtures themselves, so it stays correct even if an
  // admin edits fixtures by hand rather than using the auto-generator.
  const groupMatches = matches.filter((m) => !m.finalLabel && m.teamA && m.teamB);
  const parent = {};
  teams.forEach((t) => {
    parent[t.id] = t.id;
  });
  const find = (x) => {
    while (parent[x] !== x) x = parent[x];
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  groupMatches.forEach((m) => union(m.teamA, m.teamB));

  const buckets = {};
  teams.forEach((t) => {
    const root = find(t.id);
    buckets[root] = buckets[root] || [];
    buckets[root].push(t);
  });
  return Object.values(buckets).filter((g) => g.length > 1);
}

// A group of 4 is "complete" once all 6 of its round-robin matches are finished.
function groupIsComplete(groupTeams, matches) {
  const ids = groupTeams.map((t) => t.id);
  const groupMatches = matches.filter((m) => !m.finalLabel && ids.includes(m.teamA) && ids.includes(m.teamB));
  const expected = (groupTeams.length * (groupTeams.length - 1)) / 2; // 6 for a group of 4
  if (groupMatches.length < expected) return false;
  return groupMatches.every((m) => m.status === "finished");
}

// Once BOTH of a grade's groups are complete, returns the two group winners
// (→ Cup Final) and two runners-up (→ Shield Final). Returns null if either
// group still has results outstanding.
function qualifiersForGrade(teams, matches, grade) {
  const groupedTeams = computeGroups(teams, matches).filter((g) => g[0].id.endsWith(grade));
  if (groupedTeams.length < 2) return null;
  for (const g of groupedTeams) {
    if (!groupIsComplete(g, matches)) return null;
  }
  const standingsPerGroup = groupedTeams.map((g) => computeStandings(g, matches));
  return {
    winners: standingsPerGroup.map((rows) => rows[0].id),
    runnersUp: standingsPerGroup.map((rows) => rows[1].id),
  };
}

// Fills in teamA/teamB for any of the 4 finals that are still blank and whose
// qualifiers are now determinable — never overwrites a final that's already set
// (whether auto-filled earlier or picked manually), so nothing gets clobbered.
function autoFillFinals(matchesList, teams) {
  const qualA = qualifiersForGrade(teams, matchesList, "A");
  const qualB = qualifiersForGrade(teams, matchesList, "B");
  const fillFor = {
    "A Cup Final": qualA?.winners,
    "A Shield Final": qualA?.runnersUp,
    "B Cup Final": qualB?.winners,
    "B Shield Final": qualB?.runnersUp,
  };
  return matchesList.map((m) => {
    if (!m.finalLabel || (m.teamA && m.teamB)) return m;
    const pair = fillFor[m.finalLabel];
    if (pair && pair[0] && pair[1]) {
      return { ...m, teamA: pair[0], teamB: pair[1] };
    }
    return m;
  });
}

function StandingsScreen({ teams, matches, sponsors, myClubObj }) {
  const groupedTeams = computeGroups(teams, matches);
  let aCount = 0, bCount = 0;
  const labeled = groupedTeams
    .map((g) => {
      const grade = g[0].id.endsWith("A") ? "A" : "B";
      const num = grade === "A" ? ++aCount : ++bCount;
      return { grade, num, teams: g };
    })
    .sort((x, y) => (x.grade === y.grade ? x.num - y.num : x.grade.localeCompare(y.grade)));

  return (
    <div>
      <TopBar title="Standings" followedTeam={myClubObj} />
      <SponsorStrip sponsors={sponsors} />
      <div style={{ padding: 16 }}>
        {labeled.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Group tables will appear here once fixtures are added and results come in.
          </div>
        )}

        {labeled.length > 0 && (
          <div style={{ background: "#fff", border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 14, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.ink }}>1st place → Cup Final</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.ink }}>2nd place → Shield Final</span>
            </div>
          </div>
        )}

        {labeled.map((grp) => {
          const rows = computeStandings(grp.teams, matches);
          return (
            <div key={`${grp.grade}${grp.num}`} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
                {grp.grade} Grade — Group {grp.num}
              </div>
              <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr", background: C.turf, color: C.line, fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, padding: "9px 8px", textTransform: "uppercase" }}>
                  <div>Team</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>Pts</div>
                </div>
                {rows.map((r, i) => {
                  const teamObj = teams.find((t) => t.id === r.id);
                  const started = r.played > 0;
                  const isCup = i === 0 && started;
                  const isShield = i === 1 && started;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr",
                        padding: "9px 8px",
                        borderTop: `1px solid ${C.pitch}14`,
                        alignItems: "center",
                        background: isCup ? `${C.sliotar}22` : isShield ? `${C.pitch}0F` : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: C.inkSoft, flexShrink: 0 }}>{i + 1}</span>
                        {teamObj && <TeamBadge team={teamObj} size={26} />}
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}
                        </span>
                        {isCup && <span style={{ fontSize: 13, flexShrink: 0 }}>🏆</span>}
                        {isShield && <span style={{ fontSize: 13, flexShrink: 0 }}>🛡️</span>}
                      </div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.played}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.won}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.drawn}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.lost}</div>
                      <div style={{ textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.pitch }}>{r.points}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, lineHeight: 1.5 }}>
          Win = 3 pts, draw = 1 pt, loss = 0. Score difference is not used as a tiebreaker — level teams are separated by head-to-head result, then a coin toss. 🏆 marks the team currently on course for the Cup Final (1st in group), 🛡️ for the Shield Final (2nd in group).
        </div>
      </div>
    </div>
  );
}

function InfoScreen({ sponsors, announcements, myClubObj, onMentorClick }) {
  const items = [
    {
      title: "Arrival & registration",
      body: "Teams are to arrive by 9:15 a.m. for registration at Lawless Park, Fingallians. On arrival, register your team then proceed to the club ball wall for a team photo. Opening procession at 9:30 a.m., first throw-in at 10:00 a.m., with a target finish of 3:00 p.m.",
    },
    {
      title: "Food & beverages",
      body: "Please bring your own water bottles - a refill station is outside the changing rooms. On arrival each team is given vouchers for players and mentors for burgers from the BBQ at lunchtime (teams called individually to avoid queues), plus vouchers for tea or coffee for mentors. Teas, coffees and breakfast sausage rolls are also available to purchase from the BBQ through the day. A separate BBQ area is open for anyone wanting to buy a burger later on.",
    },
    {
      title: "Parking & directions",
      image: `/parking-map.jpg?v=${CREST_VERSION}`,
      body: "Limited car parking is available at Fingallians GAA, and buses are welcome to park on site. Overflow parking has been kindly provided by the HSE at Swords Business Campus, a short ten-minute walk from the grounds - stewards will be on duty at both locations to guide you.",
      maps: [
        { label: "Open overflow parking in Maps", url: "https://maps.google.com/?q=HSE+Swords+Business+Campus" },
      ],
    },
    {
      title: "Pitch Layout",
      image: `/pitch-layout.jpg?v=${CREST_VERSION}`,
      body: "Pitch 1 is on the all-weather surface. Pitches 2 and 3 are on the main grass pitch. The ball wall (for team photos) is marked top right.",
    },
    {
      title: "Facilities & medical",
      body: "The Order of Malta will provide medical assistance at the entrance to the main pitch - teams are welcome to bring their own first aid kits too. Toilets are at the Fingallians clubhouse through the changing-room entrance. Tents, gazebos or changing rooms will be allocated to visiting teams where available, for storing kit bags. Main-pitch matches can be viewed from the hill on the far side of the pitch; all-weather matches can be watched from outside the pitch.",
    },
    {
      title: "Playing rules",
      list: [
        "Teams of 13 with unlimited substitutions, panel size 15.",
        "Matches: 10 minutes per half, 20 minutes total, with 3 minutes for half-time.",
        "3 points for a win, 1 for a draw, 0 for a loss. There will be 65's.",
        "On taking possession a player may take 4 steps, max 8 steps solo running, then 4 steps to play away — 16 steps maximum from possession to striking the sliotar.",
        "The player who is fouled takes the free. The player closest to the line ball takes the sideline cut.",
        "Goalkeepers may take up to 5 steps for puck-outs.",
        "Unlimited substitutions during stoppages, with the referee's consent, from the centre point of each sideline.",
        "Abuse of referees or officials results in expulsion. Coaches and mentors must not encroach onto the field of play.",
        "Tied teams at end of group stage: separated by (a) previous head-to-head result, in the order of the excel table, then (b) a coin toss. Points difference is not considered.",
        "If level at the end of the final, extra time of 2 x 5 minutes per half is played; if still level, play restarts from the middle and next score wins.",
        "Jersey clash: one team turns their jersey inside out or wears bibs — please bring a set of bibs.",
        "A straight red card disqualifies a player from the rest of the blitz; two yellow cards disqualify a player from the rest of that game.",
        "The organising committee's decision on all matters is binding, including the right to amend the blitz structure.",
      ],
      highlighted: [
        "All mentors must wear bibs at all times so they are clearly identifiable on and around the pitch.",
        "Spectators are welcome inside the main pitch area but must remain around the sides of the pitches only. No spectators are permitted between Pitch 2 and Pitch 3.",
        "Strictly only players, mentors, and referees are permitted on the all-weather (astro) surface, and only with appropriate footwear.",
      ],
      note: "It's not about winning - the goal is for every child to enjoy the day. If there's a clear skill gap between teams, please rest your best players or focus on certain skills to keep matches competitive.",
      preNote: "Scoring: 3 points for a goal, 1 point for a point over the bar.",
    },
    {
      title: "Communications",
      body: "In the days leading up to the festival a lead-mentors WhatsApp group is set up. Any updates arising during the day are circulated through that group, shown as a pop-up in the app, and listed at the top of this Info page.",
    },
  ];
  return (
    <div>
      <TopBar title="Event info" followedTeam={myClubObj} />
      <div style={{ padding: 16 }}>
        {announcements && announcements.length > 0 && (
          <div
            style={{
              background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              border: `2px solid ${C.sliotar}`,
            }}
          >
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
              📢 Announcements
            </div>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 8,
                  background: "#fff",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <Megaphone size={16} color={C.pitch} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.ash}44`,
            borderRadius: 10,
            padding: "16px 16px",
            marginBottom: 16,
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: C.ink,
            lineHeight: 1.6,
          }}
        >
          {WELCOME_PARAGRAPHS.map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "0 0 10px" }}>{p}</p>
          ))}
          <p style={{ margin: 0, fontWeight: 700, color: C.pitch }}>{WELCOME_SIGNOFF}</p>
        </div>

        {items.map((it) => (
          <div key={it.title} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 6 }}>{it.title}</div>
            {it.image && (
              <img
                src={it.image}
                alt={it.title}
                style={{ width: "100%", height: "auto", borderRadius: 8, display: "block", marginBottom: it.body ? 8 : 0 }}
              />
            )}
            {it.body && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>{it.body}</div>}
            {it.list && (
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.6 }}>
                {it.list.map((li, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{li}</li>
                ))}
              </ul>
            )}
            {it.preNote && (
              <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
                {it.preNote}
              </div>
            )}
            {it.highlighted && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {it.highlighted.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff8e1", border: `1.5px solid ${C.sliotar}`, borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>!</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>{h}</span>
                  </div>
                ))}
              </div>
            )}
            {it.note && (
              <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, fontWeight: 500, lineHeight: 1.5, fontStyle: "italic" }}>
                {it.note}
              </div>
            )}
            {it.maps && it.maps.map((m, i) => (
              <a
                key={i}
                href={m.url}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: i === 0 ? 10 : 8,
                  marginRight: 8,
                  background: C.pitch,
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <MapPin size={14} /> {m.label}
              </a>
            ))}
          </div>
        ))}

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, margin: "18px 0 12px" }}>
          Thank You to Our Sponsors
        </div>

        {sponsors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {sponsors.map((s) => (
              <a
                key={s.id}
                href={s.url || undefined}
                onClick={(e) => !s.url && e.preventDefault()}
                style={{
                  background: "#fff",
                  border: `1px solid ${C.pitch}22`,
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 56,
                  minWidth: 120,
                  flex: "1 1 45%",
                  textDecoration: "none",
                }}
              >
                {s.logo ? (
                  <img src={s.logo} alt={s.name} style={{ maxWidth: "100%", maxHeight: 40, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, textAlign: "center" }}>
                    {s.name}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.pitch}14` }}>
          <button
            onClick={onMentorClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: `1.5px solid ${C.pitch}44`,
              borderRadius: 30,
              padding: "10px 20px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: C.pitch,
              cursor: "pointer",
            }}
          >
            <UserCircle size={16} /> Admin login
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Food ordering (coach view) ---------- */
function Stepper({ label, value, onChange, sub, disabled, onLockedTap }) {
  const handleChange = (v) => {
    if (disabled) {
      onLockedTap && onLockedTap();
      return;
    }
    onChange(v);
  };
  return (
    <div style={{ background: disabled ? C.line : "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10, opacity: disabled ? 0.75 : 1 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <button
          onClick={() => handleChange(Math.max(0, value - 1))}
          style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.pitch}33`, background: C.line, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Minus size={18} color={C.pitch} />
        </button>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 22, minWidth: 34, textAlign: "center", color: C.ink }}>{value}</div>
        <button
          onClick={() => handleChange(value + 1)}
          style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: disabled ? C.ash : C.pitch, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function FoodScreen({ clubs, orders, saveOrder, sponsors, defaultClubId, embedded, logAction }) {
  const [clubId, setClubId] = useState(defaultClubId || null);
  const [order, setOrder] = useState(null);
  const [saved, setSaved] = useState(false);
  const [authedClub, setAuthedClub] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const locked = ordersAreLocked();

  useEffect(() => {
    setAuthedClub(false);
    setPasscode("");
    setPasswordError(false);
  }, [clubId]);

  useEffect(() => {
    if (clubId) {
      setOrder(
        orders[clubId] || {
          contactName: "",
          mobile: "",
          players: 0,
          mentors: 0,
          sausageRolls: 0,
          collectionTime: "",
          paid: false,
        }
      );
      setSaved(false);
    }
  }, [clubId]);

  if (!clubId && !embedded) {
    return (
      <div>
        <TopBar title="Food ordering" />
        <SponsorStrip sponsors={sponsors} />
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>
            On the day each club gets its own private link straight to this form. For now, pick your club below.
          </div>
          {clubs.map((t) => (
            <button
              key={t.id}
              onClick={() => setClubId(t.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#fff",
                border: `1px solid ${C.pitch}22`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <TeamBadge team={t} size={34} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!clubId) return null; // embedded with no club yet — parent handles the prompt

  const team = clubs.find((t) => t.id === clubId);

  if (!authedClub) {
    return (
      <div style={embedded ? {} : { padding: 16 }}>
        {!embedded && <TopBar title={team.name} onBack={() => setClubId(null)} />}
        <div style={{ marginTop: embedded ? 0 : 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <TeamBadge team={team} size={40} />
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 15, color: C.ink }}>{team.name}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>Enter your club code and name to view or edit the food order.</div>
            </div>
          </div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type={showPasscode ? "text" : "password"}
              placeholder="Club code"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setPasswordError(false);
              }}
              style={{ width: "100%", padding: "12px 42px 12px 12px", borderRadius: 8, border: `1px solid ${passwordError ? C.pitch : C.pitch + "33"}`, fontFamily: "Inter, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => setShowPasscode((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
            >
              {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            placeholder="Your name (first and last)"
            value={mentorName}
            onChange={(e) => setMentorName(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", marginBottom: 8 }}
          />
          {passwordError && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, marginBottom: 8 }}>
              Incorrect club code. Contact your team mentor.
            </div>
          )}
          <button
            onClick={() => {
              if (!mentorName.trim()) return;
              if (checkPassword(passcode, CLUB_PASSWORDS[clubId])) {
                setAuthedClub(true);
                setOrder((o) => ({ ...o, contactName: o?.contactName || mentorName.trim() }));
                logAction(mentorName.trim(), `Unlocked food order for ${team.name}`);
              } else {
                setPasswordError(true);
              }
            }}
            style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
          >
            Unlock order
          </button>
        </div>
      </div>
    );
  }

  const set = (k, v) => setOrder((o) => ({ ...o, [k]: v }));
  const totalBreakfast = order?.sausageRolls || 0;
  const totalLunch = (order?.players || 0) + (order?.mentors || 0);
  const amountDue = totalBreakfast * SAUSAGE_BAP_PRICE;

  return (
    <div style={{ paddingBottom: embedded ? 10 : 90 }}>
      {!embedded && <TopBar title={team.name} onBack={() => setClubId(null)} />}
      <div style={embedded ? {} : { padding: 16 }}>
        <div style={{ background: C.turf, color: C.line, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 16 }}>{team.name} — food order</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#E9DAD0", marginTop: 4 }}>Order by 19 August</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#E9DAD0", marginTop: 8, lineHeight: 1.5 }}>{MENTOR_BURGER_NOTE}</div>
        </div>

        {locked && (
          <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={18} color={C.pitch} style={{ flexShrink: 0 }} />
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>
              <b>Orders closed on 19 August.</b> This shows your submitted order — contact the organisers if you need to change it.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            placeholder="Contact name"
            value={order?.contactName || ""}
            onChange={(e) => (locked ? setShowLockedModal(true) : set("contactName", e.target.value))}
            readOnly={locked}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 14, background: locked ? C.line : "#fff" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Mobile number (optional)"
            value={order?.mobile || ""}
            onChange={(e) => (locked ? setShowLockedModal(true) : set("mobile", e.target.value))}
            readOnly={locked}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 14, background: locked ? C.line : "#fff" }}
          />
        </div>

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 4, marginBottom: 8 }}>
          Headcount
        </div>
        <Stepper label="Players" value={order?.players || 0} onChange={(v) => set("players", v)} disabled={locked} onLockedTap={() => setShowLockedModal(true)} />
        <Stepper label="Mentors" value={order?.mentors || 0} onChange={(v) => set("mentors", v)} disabled={locked} onLockedTap={() => setShowLockedModal(true)} />

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 10, marginBottom: 8 }}>
          Breakfast
        </div>
        <Stepper label="Swanny's Breakfast Banger (sausage in a bun)" value={order?.sausageRolls || 0} onChange={(v) => set("sausageRolls", v)} sub={`Breakfast, ready on arrival — €${SAUSAGE_BAP_PRICE.toFixed(2)} each, paid on the day`} disabled={locked} onLockedTap={() => setShowLockedModal(true)} />

        <div style={{ background: C.line, border: `1px solid ${C.ash}55`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.ink }}>Total Swanny's Breakfast Bangers (sausage in a bun)</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 20, color: C.pitch }}>{totalBreakfast}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.ash}33` }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.ink }}>Total lunch (burgers — free)</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 20, color: C.pitch }}>{totalLunch}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: C.ink }}>Amount to pay on the day</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 22, color: C.sliotar }}>€{amountDue.toFixed(2)}</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 6 }}>
            Based on a temporary price of €{SAUSAGE_BAP_PRICE.toFixed(2)} per Swanny's Breakfast Banger (sausage in a bun) — burgers are already covered by voucher, no charge.
          </div>
        </div>

        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            <Check size={16} /> Order saved. Reopen this link any time to amend it.
          </div>
        )}

        <button
          onClick={async () => {
            if (locked) {
              setShowLockedModal(true);
              return;
            }
            await saveOrder(clubId, order);
            setSaved(true);
          }}
          style={{
            width: "100%",
            background: locked ? C.ash : C.sliotar,
            color: C.ink,
            border: "none",
            borderRadius: 30,
            padding: "14px 20px",
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: 0.5,
            cursor: "pointer",
            boxShadow: locked ? "none" : "0 4px 12px rgba(238,180,59,0.4)",
          }}
        >
          {locked ? "Orders closed" : "Save order"}
        </button>
      </div>

      {showLockedModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,17,16,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowLockedModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: "26px 22px", maxWidth: 320, width: "100%", textAlign: "center", border: `3px solid ${C.sliotar}` }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 15, color: C.pitch, marginBottom: 10 }}>
              Orders are closed
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.ink, lineHeight: 1.5, marginBottom: 20 }}>
              Food orders closed on 19 August. If you need to change your order, please contact the organisers directly.
            </div>
            <button
              onClick={() => setShowLockedModal(false)}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "11px 30px", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function computeTeamGaps(teamId, matches) {
  if (!teamId) return [];
  const timeToMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const minToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };
  const myTimes = matches
    .filter((m) => (m.teamA === teamId || m.teamB === teamId) && !m.finalLabel)
    .map((m) => timeToMin(m.time))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 0; i < myTimes.length - 1; i++) {
    const freeFrom = myTimes[i] + MATCH_DURATION_MIN;
    const freeTo = myTimes[i + 1];
    const minutes = freeTo - freeFrom;
    if (minutes >= 10) gaps.push({ from: minToTime(freeFrom), to: minToTime(freeTo), minutes });
  }
  return gaps;
}

function TeamScreen({ teams, clubs, matches, orders, saveOrder, sponsors, myClub, myClubName, onOpenWelcome, onChangeClub, lunchWindows, logAction }) {
  if (!myClub) {
    return (
      <div>
        <TopBar title="My Team" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>👋</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 6 }}>
              Choose your club to get started
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 18, lineHeight: 1.5 }}>
              See your team's fixtures, standing, and food order all in one place.
            </div>
            <button
              onClick={onOpenWelcome}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "12px 28px", fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Choose your club
            </button>
          </div>
        </div>
      </div>
    );
  }

  const club = clubs.find((c) => c.id === myClub);
  const teamA = teams.find((t) => t.id === `${myClub}A`);
  const teamB = teams.find((t) => t.id === `${myClub}B`);
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const myTeamIds = [teamA?.id, teamB?.id].filter(Boolean);
  const clubMatches = matches
    .filter((m) => myTeamIds.includes(m.teamA) || myTeamIds.includes(m.teamB))
    .sort((a, b) => a.time.localeCompare(b.time));

  const groupedTeams = computeGroups(teams, matches);
  const groupInfoFor = (teamId) => {
    const grp = groupedTeams.find((g) => g.some((t) => t.id === teamId));
    if (!grp) return null;
    const rows = computeStandings(grp, matches);
    const idx = rows.findIndex((r) => r.id === teamId);
    if (idx === -1) return null;
    return { position: idx + 1, total: rows.length, points: rows[idx].points, played: rows[idx].played };
  };
  const infoA = teamA ? groupInfoFor(teamA.id) : null;
  const infoB = teamB ? groupInfoFor(teamB.id) : null;

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title={club?.name || "My Team"} followedTeam={club} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          {club && <TeamBadge team={club} size={52} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>{club?.name}</div>
            <button
              onClick={onChangeClub}
              style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.pitch, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
            >
              Not your club? Change
            </button>
          </div>
        </div>

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Your Standing
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[{ label: "A Team", info: infoA }, { label: "B Team", info: infoB }].map(({ label, info }) => (
            <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              {info ? (
                <>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.pitch }}>
                    {info.position === 1 ? "🏆 " : info.position === 2 ? "🛡️ " : ""}{info.position}{info.position === 1 ? "st" : info.position === 2 ? "nd" : info.position === 3 ? "rd" : "th"}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>of {info.total} · {info.points} pts</div>
                </>
              ) : (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, padding: "6px 0" }}>Not started</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 4 }}>
          🍔 Burger Break
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginBottom: 8, lineHeight: 1.4 }}>
          Your fixed break, built into the schedule — both your A and B teams rest at the same time. Burgers will be ready to hand to your mentor at this time.
        </div>
        {(() => {
          const myLunch = (Array.isArray(lunchWindows) ? lunchWindows : []).find((w) => w.clubs?.includes(myClub)) || null;
          return (
            <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 14, marginBottom: 10, textAlign: "center" }}>
              {myLunch ? (
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 20, color: C.pitch }}>
                  {myLunch.from}–{myLunch.to}
                </div>
              ) : (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, padding: "6px 0" }}>Generate the schedule to see this</div>
              )}
            </div>
          );
        })()}

        {(() => {
          const myLunch = (Array.isArray(lunchWindows) ? lunchWindows : []).find((w) => w.clubs?.includes(myClub)) || null;
          const overlapsLunch = (gap) => myLunch && gap.from < myLunch.to && gap.to > myLunch.from;
          const otherGapsA = teamA ? computeTeamGaps(teamA.id, matches).filter((g) => !overlapsLunch(g)) : [];
          const otherGapsB = teamB ? computeTeamGaps(teamB.id, matches).filter((g) => !overlapsLunch(g)) : [];
          if (otherGapsA.length === 0 && otherGapsB.length === 0) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Other breaks between matches
              </div>
              {otherGapsA.map((g, i) => (
                <div key={`a${i}`} style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 3 }}>
                  A team: {g.from}–{g.to} <span style={{ opacity: 0.7 }}>({g.minutes} min)</span>
                </div>
              ))}
              {otherGapsB.map((g, i) => (
                <div key={`b${i}`} style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 3 }}>
                  B team: {g.from}–{g.to} <span style={{ opacity: 0.7 }}>({g.minutes} min)</span>
                </div>
              ))}
            </div>
          );
        })()}

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Your Fixtures
        </div>
        {clubMatches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
            No fixtures yet for your club — check back once the organiser adds them.
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          {clubMatches.map((m) => (
            <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                  <PitchBadge pitch={m.pitch} />
                </div>
                <StatusPill status={m.status} />
              </div>
              <MatchRow match={m} teamById={teamById} />
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Food Order
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14 }}>
          <FoodScreen clubs={clubs} orders={orders} saveOrder={saveOrder} sponsors={sponsors} defaultClubId={myClub} embedded logAction={logAction} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Fixture generator: A teams and B teams grouped separately, 3 pitches, plus finals ---------- */
const PITCHES = ["Pitch 1", "Pitch 2", "Pitch 3"];
const SLOT_MINUTES = 25;
const START_HOUR = 10;
const START_MIN = 0;

// Round-robin for a group of 4 via the circle method: 3 rounds, each with 2 matches
// that between them use all 4 teams (so they can run in parallel on different pitches).
const roundRobin4 = (g) => [
  [[g[0], g[1]], [g[2], g[3]]],
  [[g[0], g[2]], [g[1], g[3]]],
  [[g[0], g[3]], [g[1], g[2]]],
];

function minutesToLabel(totalMin) {
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LUNCH_MINUTES = 25;
const MATCH_DURATION_MIN = 23; // 20 min play + 3 min half-time, per the playing rules
const PRESENTATION_MINUTES = 15; // buffer for trophies/presentations after the last final
const LUNCH_MIN_SLOTS = Math.max(1, Math.floor(LUNCH_MINUTES / SLOT_MINUTES));
const LUNCH_REMAINDER_MINUTES = LUNCH_MINUTES - LUNCH_MIN_SLOTS * SLOT_MINUTES; // the bit that doesn't fit a whole slot

// Fills pitches for consecutive slots from the given pool, respecting the absolute
// rest-gap rule (never back-to-back). Runs for at least `minSlots` slots even if the
// pool empties sooner, so a lunch block can be padded to a real fixed duration.
// Mutates `pool` and `lastPlayedSlot`; returns the next free slot index.
function fillSlots(pool, fixtures, startSlot, lastPlayedSlot, minSlots = 0, excludeTeamIds = null, extraOffsetRef = null) {
  let slotIndex = startSlot;
  let slotsUsed = 0;
  let guard = 0;
  const offset = extraOffsetRef ? extraOffsetRef.value : 0;
  while (guard < 200) {
    guard++;
    const used = new Set();
    const slotMatches = [];
    for (let i = 0; i < pool.length && slotMatches.length < PITCHES.length; i++) {
      const m = pool[i];
      const aRested = lastPlayedSlot[m.a.id] === undefined || lastPlayedSlot[m.a.id] < slotIndex - 1;
      const bRested = lastPlayedSlot[m.b.id] === undefined || lastPlayedSlot[m.b.id] < slotIndex - 1;
      const excluded = excludeTeamIds && (excludeTeamIds.has(m.a.id) || excludeTeamIds.has(m.b.id));
      if (!excluded && !used.has(m.a.id) && !used.has(m.b.id) && aRested && bRested) {
        slotMatches.push(m);
        used.add(m.a.id);
        used.add(m.b.id);
        pool.splice(i, 1);
        i--;
      }
    }
    if (slotMatches.length > 0) {
      const timeLabel = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + offset);
      slotMatches.forEach((m, pi) => {
        lastPlayedSlot[m.a.id] = slotIndex;
        lastPlayedSlot[m.b.id] = slotIndex;
        fixtures.push({
          id: `m${Date.now()}_${fixtures.length}_${Math.random().toString(36).slice(2, 6)}`,
          time: timeLabel,
          pitch: PITCHES[pi],
          teamA: m.a.id,
          teamB: m.b.id,
          goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
          status: "scheduled",
        });
      });
    }
    slotIndex++;
    slotsUsed++;

    if (excludeTeamIds) {
      // Exclusion phase (a lunch window): run for exactly minSlots and stop.
      // Whatever's left in the pool is deliberately deferred to a later phase —
      // it is NOT this phase's job to finish, so don't keep looping over it.
      if (slotsUsed >= minSlots) break;
    } else {
      // Normal phase (no exclusions): finish once the pool is actually empty.
      if (pool.length === 0 && slotsUsed >= minSlots) break;
    }
  }
  return slotIndex;
}

function generateGroupFixtures(teams) {
  // Group by CLUB, not by grade — a club's A and B teams always land in the
  // same club-group, so they always share the same lunch window.
  const clubIds = [...new Set(teams.map((t) => t.clubId))];
  // Fixed order (not shuffled) — this specific grouping was chosen deliberately:
  // Lunch 1: Fingallians, St Finian's, Rathvilly | Lunch 2: Knockbridge, Naomh Eoin,
  // Navan O'Mahony's | Lunch 3: Ratoath, Bray Emmets.
  const clubGroup1 = clubIds.slice(0, 4);
  const clubGroup2 = clubIds.slice(4, 8);

  const teamsFor = (clubList, grade) => teams.filter((t) => clubList.includes(t.clubId) && t.id.endsWith(grade));

  // "Group 1" is the same 4 clubs whether you're looking at their A team or B team —
  // this is the actual COMPETITION grouping (feeds the Cup/Shield finals).
  const groupsA = [teamsFor(clubGroup1, "A"), teamsFor(clubGroup2, "A")];
  const groupsB = [teamsFor(clubGroup1, "B"), teamsFor(clubGroup2, "B")];

  const toMatches = (round) => round.map(([a, b]) => ({ a, b }));
  const rrAg1 = roundRobin4(groupsA[0]);
  const rrAg2 = roundRobin4(groupsA[1]);
  const rrBg1 = roundRobin4(groupsB[0]);
  const rrBg2 = roundRobin4(groupsB[1]);

  const fixtures = [];
  const lastPlayedSlot = {};
  let slotIndex = 0;
  const extraOffset = { value: 0 };

  // Warm-up: everyone's first round only (8 matches) — just enough that nobody
  // breaks for lunch before playing at least once.
  const round1All = [...toMatches(rrAg1[0]), ...toMatches(rrAg2[0]), ...toMatches(rrBg1[0]), ...toMatches(rrBg2[0])];
  slotIndex = fillSlots(round1All, fixtures, slotIndex, lastPlayedSlot, 0, null, extraOffset);

  // Remaining pool: rounds 2 and 3 combined (16 matches) — deliberately NOT
  // split, so the 2 lunch phases below have enough slack to actually
  // pack well. Lunch is staggered across 4 phases of just 2 clubs (4 teams)
  // resting at a time, instead of 4 clubs at once — keeps more pitches busy
  // at any given moment. A match that can't be played yet (because it needs a
  // team from the currently-resting pair) is left in the pool and picked up
  // automatically in a later phase.
  let remainingPool = [
    ...toMatches(rrAg1[1]), ...toMatches(rrAg2[1]), ...toMatches(rrBg1[1]), ...toMatches(rrBg2[1]),
    ...toMatches(rrAg1[2]), ...toMatches(rrAg2[2]), ...toMatches(rrBg1[2]), ...toMatches(rrBg2[2]),
  ];

  // 4 clubs per sitting (2 sittings total) — matches the same 4-and-4 split
  // used for the actual competition groups above.
  const lunchPairs = [clubGroup1, clubGroup2];
  const lunchWindows = [];
  lunchPairs.forEach((pair) => {
    const excludeIds = new Set();
    pair.forEach((cid) => {
      excludeIds.add(cid + "A");
      excludeIds.add(cid + "B");
    });
    const phaseStart = slotIndex;
    const fromLabel = minutesToLabel(START_HOUR * 60 + START_MIN + phaseStart * SLOT_MINUTES + extraOffset.value);
    slotIndex = fillSlots(remainingPool, fixtures, slotIndex, lastPlayedSlot, LUNCH_MIN_SLOTS, excludeIds, extraOffset);
    // Add whatever's left of the requested lunch length that doesn't fit a
    // whole match slot — a genuine arbitrary-length break, not just a rounded
    // multiple of 25 minutes.
    extraOffset.value += LUNCH_REMAINDER_MINUTES;
    lunchWindows.push({
      from: fromLabel,
      to: minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + extraOffset.value),
      clubs: pair,
    });
  });

  // Mop-up: anything still unplayed (shouldn't normally be much, if anything —
  // safety net in case a match's teams were still excluded right to the end).
  slotIndex = fillSlots(remainingPool, fixtures, slotIndex, lastPlayedSlot, 0, null, extraOffset);

  // Finals — teams left blank until group placings are known.
  // Shield finals first, then Cup finals.
  const shieldTime = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + extraOffset.value);
  fixtures.push({
    id: `final-ashield-${Date.now()}`,
    time: shieldTime,
    pitch: "Pitch 2",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "A Shield Final",
  });
  fixtures.push({
    id: `final-bshield-${Date.now()}`,
    time: shieldTime,
    pitch: "Pitch 3",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "B Shield Final",
  });

  const cupMinutes = START_HOUR * 60 + START_MIN + (slotIndex + 1) * SLOT_MINUTES + extraOffset.value;
  const cupTime = minutesToLabel(cupMinutes);
  fixtures.push({
    id: `final-acup-${Date.now()}`,
    time: cupTime,
    pitch: "Pitch 2",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "A Cup Final",
  });
  fixtures.push({
    id: `final-bcup-${Date.now()}`,
    time: cupTime,
    pitch: "Pitch 3",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "B Cup Final",
  });

  // Bake presentation time into the actual schedule
  const presentationsFrom = minutesToLabel(cupMinutes + MATCH_DURATION_MIN);
  const presentationsTo = minutesToLabel(cupMinutes + MATCH_DURATION_MIN + PRESENTATION_MINUTES);
  fixtures.push({
    id: `presentations-${Date.now()}`,
    time: presentationsFrom,
    pitch: "",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "Presentations",
  });

  return { fixtures, lunchWindows, presentations: { from: presentationsFrom, to: presentationsTo } };
}

/* ---------- Admin ---------- */
function RefereeLinkCard({ adminName, logAction }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/?ref=${REFEREE_SECRET}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      logAction(adminName, "Copied the referee link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. older browser) — fall back to a manual select.
      window.prompt("Copy this link:", link);
    }
  };

  return (
    <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Flag size={16} color={C.pitch} />
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>Referee Access</div>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14 }}>
        Refs scan this QR code, enter PIN <b>1884</b>, then their name. They'll go straight to score entry for their pitch.
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: `2px solid ${C.sliotar}` }}>
          <QRCodeSVG value={link} size={160} fgColor={C.turf} />
        </div>
      </div>
      <div
        style={{
          background: C.line,
          border: `1px solid ${C.pitch}22`,
          borderRadius: 8,
          padding: "10px 12px",
          fontFamily: "Inter, sans-serif",
          fontSize: 12.5,
          color: C.ink,
          wordBreak: "break-all",
          marginBottom: 10,
        }}
      >
        {link}
      </div>
      <button
        onClick={copyLink}
        style={{
          width: "100%",
          background: copied ? C.sliotar : C.pitch,
          color: copied ? C.ink : "#fff",
          border: "none",
          borderRadius: 8,
          padding: 11,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {copied ? "✓ Copied!" : "Copy link"}
      </button>
    </div>
  );
}

function AdminScreen({ teams, clubs, matches, setMatches, orders, announcements, setAnnouncements, sponsors, setSponsors, persist, auditLog, logAction, lunchWindows, setLunchWindows, wasRecentlySaved, adminName, onLogout, presentations, setPresentations }) {
  const [tab, setTab] = useState("orders");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newFixture, setNewFixture] = useState({ time: "", pitch: "", teamA: "", teamB: "" });
  const [saveError, setSaveError] = useState(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState(null);

  const totals = clubs.reduce(
    (acc, t) => {
      const o = orders[t.id];
      if (!o) return acc;
      acc.sausageRolls += o.sausageRolls || 0;
      acc.burgers += (o.players || 0) + (o.mentors || 0);
      return acc;
    },
    { sausageRolls: 0, burgers: 0 }
  );

  const updateMatch = async (id, patch) => {
    // Pull the freshest copy from the server right before writing, so a second
    // admin/referee saving a different match seconds ago doesn't get clobbered
    // by this save re-writing the whole list from a stale local copy. Skip the
    // fetch if WE just saved seconds ago — that fetch could itself race ahead
    // of our own write and hand back stale data, wiping what we just did.
    const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
    const updatedList = latest.map((m) => (m.id === id ? { ...m, ...patch } : m));
    const next = autoFillFinals(updatedList, teams);
    setMatches(next);
    persist("matches", next).then((r) => {
      if (!r.ok) setSaveError(`Score save failed (${r.error}) — this change may only be showing on your screen. Try again.`);
      else setSaveError(null);
    });

    // If auto-fill just populated a final that was blank before, log it separately.
    next.forEach((m, i) => {
      const before = updatedList[i];
      if (before && before.finalLabel && !before.teamA && m.teamA) {
        const a = teams.find((t) => t.id === m.teamA);
        const b = teams.find((t) => t.id === m.teamB);
        logAction(adminName, `Auto-filled ${m.finalLabel}: ${a?.name || m.teamA} v ${b?.name || m.teamB} (from group standings)`);
      }
    });

    const m = latest.find((x) => x.id === id);
    if (m) {
      if (patch.teamA !== undefined || patch.teamB !== undefined) {
        const updated = { ...m, ...patch };
        const a = teams.find((t) => t.id === updated.teamA);
        const b = teams.find((t) => t.id === updated.teamB);
        logAction(adminName, `Set ${m.finalLabel || "fixture"} teams: ${a?.name || "TBC"} v ${b?.name || "TBC"}`);
        return;
      }
      const a = teams.find((t) => t.id === m.teamA);
      const b = teams.find((t) => t.id === m.teamB);
      const label = `${a?.name || m.teamA || "TBC"} v ${b?.name || m.teamB || "TBC"}`;
      if (patch.status) {
        logAction(adminName, `Marked ${label} as ${patch.status}`);
      } else {
        const updated = { ...m, ...patch };
        logAction(adminName, `Updated score for ${label}: ${scoreLabel(updated.goalsA, updated.pointsA)} - ${scoreLabel(updated.goalsB, updated.pointsB)}`);
      }
    }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar
        title="Mentor dashboard"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.line, opacity: 0.85 }}>
              {adminName}
            </span>
            <button
              onClick={onLogout}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 14, padding: "4px 10px", fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        }
      />
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {["orders", "fixtures", "announce", "sponsors", "log"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: `1px solid ${C.pitch}33`,
              background: tab === t ? C.pitch : "#fff",
              color: tab === t ? "#fff" : C.ink,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {saveError && (
        <div style={{ margin: "10px 16px 0", background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, fontWeight: 600, lineHeight: 1.5 }}>⚠️ {saveError}</div>
          <button onClick={() => setSaveError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.pitch, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {tab === "orders" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              ["Swanny's Breakfast Bangers", totals.sausageRolls],
              ["Beef burgers", totals.burgers],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 26, color: C.pitch }}>{val}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.turf, borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.line }}>Total to collect ({totals.sausageRolls} Swanny's Breakfast Bangers × €{SAUSAGE_BAP_PRICE.toFixed(2)})</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 22, color: C.sliotar }}>€{(totals.sausageRolls * SAUSAGE_BAP_PRICE).toFixed(2)}</span>
          </div>

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 8 }}>
            Amount to collect, by club
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
            {clubs
              .map((t) => ({ team: t, order: orders[t.id] }))
              .sort((a, b) => (b.order?.sausageRolls || 0) - (a.order?.sausageRolls || 0))
              .map(({ team: t, order: o }) => {
                const amount = (o?.sausageRolls || 0) * SAUSAGE_BAP_PRICE;
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderTop: `1px solid ${C.pitch}14` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <TeamBadge team={t} size={24} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    </div>
                    <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: amount > 0 ? C.pitch : C.inkSoft, flexShrink: 0 }}>
                      {o ? `€${amount.toFixed(2)}` : "—"}
                    </span>
                  </div>
                );
              })}
          </div>

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 8 }}>
            Per club
          </div>
          {clubs.map((t) => {
            const o = orders[t.id];
            return (
              <div key={t.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name}</span>
                  {o ? (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: o.paid ? C.inkSoft : C.pitch, fontWeight: 700 }}>
                      {o.paid ? "Paid" : "Unpaid"}
                    </span>
                  ) : (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>No order yet</span>
                  )}
                </div>
                {o && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
                    {o.contactName} · {o.mobile} · {o.sausageRolls} Swanny's Breakfast Bangers (€{(o.sausageRolls * SAUSAGE_BAP_PRICE).toFixed(2)})<br />
                    {(o.players || 0)} players, {(o.mentors || 0)} mentors · {(o.players || 0) + (o.mentors || 0)} burgers total (free)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "fixtures" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              ⚡ Auto-generate the full schedule
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Splits the 8 clubs into two groups of 4 — the same 4-and-4 split is used both for the actual competition fixtures (each club's A and B teams stay together, so As only ever play As, Bs only ever play Bs) and for lunch. Lunch runs in <b>2 sittings of 4 clubs each</b>, {LUNCH_MINUTES} minutes per sitting, starting naturally around 11:15 — a club's A and B teams always break together. No team is ever double-booked or back-to-back. Finishes with 4 finals on the main pitch: A Cup, B Cup, then A Shield, B Shield, plus a {PRESENTATION_MINUTES}-minute presentations slot straight after — this timing is deterministic and reliably finishes well ahead of 3pm. All final-day teams left blank until group placings are known. This replaces any fixtures currently listed below.
            </div>
            <button
              onClick={async () => {
                const hasResults = matches.some((m) => m.status === "finished" || m.goalsA > 0 || m.pointsA > 0 || m.goalsB > 0 || m.pointsB > 0);
                if (hasResults) {
                  const ok = window.confirm(
                    "Some fixtures already have scores or are marked finished. Generating a new schedule will ERASE all of that. Are you sure?"
                  );
                  if (!ok) return;
                }
                setSaveError(null);
                const { fixtures, lunchWindows: newLunch, presentations: newPresentations } = generateGroupFixtures(teams);
                setMatches(fixtures);
                setLunchWindows(newLunch);
                setPresentations(newPresentations);
                const [r1, r2, r3] = await Promise.all([persist("matches", fixtures), persist("lunchWindows", newLunch), persist("presentations", newPresentations)]);
                if (!r1.ok || !r2.ok || !r3.ok) {
                  setSaveError(`Save to the database failed (${r1.error || r2.error || r3.error}). The schedule is showing on THIS screen only and has NOT been saved — reloading or checking on another device will show the old data. Please try again, and if it keeps failing, this needs checking on the Vercel/Turso side.`);
                  return;
                }
                logAction(adminName, `Auto-generated the full schedule with fixed A/B lunch breaks (replaced ${matches.length} existing fixture${matches.length === 1 ? "" : "s"})`);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Generate schedule (24 group + 4 finals)
            </button>
            {Array.isArray(lunchWindows) && lunchWindows.length > 0 && (
              <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, background: "#fff", borderRadius: 8, padding: 10, lineHeight: 1.6 }}>
                {lunchWindows.map((w, i) => (
                  <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
                    <b>Lunch {i + 1}</b> ({w.from}–{w.to}): {w.clubs.map((cid) => clubs.find((c) => c.id === cid)?.name || cid).join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.pitch}33`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>
              Finals fill in automatically the moment a group's results are complete. If you've edited fixtures directly and think a final should be fillable now, recalculate manually here.
            </div>
            <button
              onClick={() => {
                const next = autoFillFinals(matches, teams);
                const changed = next.some((m, i) => m.teamA !== matches[i].teamA);
                setMatches(next);
                persist("matches", next);
                if (changed) {
                  next.forEach((m, i) => {
                    const before = matches[i];
                    if (before.finalLabel && !before.teamA && m.teamA) {
                      const a = teams.find((t) => t.id === m.teamA);
                      const b = teams.find((t) => t.id === m.teamB);
                      logAction(adminName, `Auto-filled ${m.finalLabel}: ${a?.name || m.teamA} v ${b?.name || m.teamB} (from group standings)`);
                    }
                  });
                }
              }}
              style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              🔄 Recalculate finals from standings
            </button>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 8 }}>
              Add fixture
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                placeholder="Time e.g. 9:30"
                value={newFixture.time}
                onChange={(e) => setNewFixture((f) => ({ ...f, time: e.target.value }))}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              />
              <select
                value={newFixture.pitch}
                onChange={(e) => setNewFixture((f) => ({ ...f, pitch: e.target.value }))}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Pitch…</option>
                {PITCHES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <select
                value={newFixture.teamA}
                onChange={(e) => setNewFixture((f) => ({ ...f, teamA: e.target.value, teamB: f.teamB && f.teamB.slice(-1) !== e.target.value.slice(-1) ? "" : f.teamB }))}
                style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Team A…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>v</div>
              <select
                value={newFixture.teamB}
                onChange={(e) => setNewFixture((f) => ({ ...f, teamB: e.target.value }))}
                style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Team B…</option>
                {(newFixture.teamA ? teams.filter((t) => t.id.slice(-1) === newFixture.teamA.slice(-1)) : teams).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {newFixture.teamA && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>
                  Team B is filtered to {newFixture.teamA.endsWith("A") ? "A" : "B"} teams only — As only play As, Bs only play Bs.
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!newFixture.teamA || !newFixture.teamB || newFixture.teamA === newFixture.teamB) return;
                const fixture = {
                  id: `m${Date.now()}`,
                  time: newFixture.time || "TBC",
                  pitch: newFixture.pitch || "TBC",
                  teamA: newFixture.teamA,
                  teamB: newFixture.teamB,
                  goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
                  status: "scheduled",
                };
                const next = [...matches, fixture];
                setMatches(next);
                persist("matches", next);
                const a = teams.find((t) => t.id === newFixture.teamA);
                const b = teams.find((t) => t.id === newFixture.teamB);
                logAction(adminName, `Added fixture: ${a?.name || newFixture.teamA} v ${b?.name || newFixture.teamB} (${fixture.time}, ${fixture.pitch})`);
                setNewFixture({ time: "", pitch: "", teamA: "", teamB: "" });
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              + Add fixture
            </button>
          </div>

          {matches.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>
              No fixtures yet — add the first one above.
            </div>
          )}

          {matches.map((m) => {
            const a = teams.find((t) => t.id === m.teamA);
            const b = teams.find((t) => t.id === m.teamB);
            // Work out which grade this fixture is restricted to, if any.
            const grade = m.finalLabel?.startsWith("A ") ? "A" : m.finalLabel?.startsWith("B ") ? "B" : m.teamA ? m.teamA.slice(-1) : m.teamB ? m.teamB.slice(-1) : null;
            const teamOptions = grade ? teams.filter((t) => t.id.endsWith(grade)) : teams;
            return (
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                    <PitchBadge pitch={m.pitch} />
                    {m.finalLabel && (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: C.sliotar, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {finalIcon(m.finalLabel)} {m.finalLabel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const next = matches.filter((x) => x.id !== m.id);
                      setMatches(next);
                      persist("matches", next);
                      logAction(adminName, `Deleted fixture: ${a?.name || m.teamA || "TBC"} v ${b?.name || m.teamB || "TBC"} (${m.time}, ${m.pitch})`);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                {m.finalLabel !== "Presentations" && (
                  <>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <select
                        value={m.teamA}
                        onChange={(e) => updateMatch(m.id, { teamA: e.target.value })}
                        style={{ flex: 1, minWidth: 0, padding: 7, borderRadius: 6, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}
                      >
                        <option value="">TBC…</option>
                        {teamOptions.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, flexShrink: 0 }}>v</span>
                      <select
                        value={m.teamB}
                        onChange={(e) => updateMatch(m.id, { teamB: e.target.value })}
                        style={{ flex: 1, minWidth: 0, padding: 7, borderRadius: 6, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}
                      >
                        <option value="">TBC…</option>
                        {teamOptions.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <MiniScoreInput label="G" value={m.goalsA} onChange={(v) => updateMatch(m.id, { goalsA: v })} />
                      <MiniScoreInput label="P" value={m.pointsA} onChange={(v) => updateMatch(m.id, { pointsA: v })} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>v</span>
                      <MiniScoreInput label="G" value={m.goalsB} onChange={(v) => updateMatch(m.id, { goalsB: v })} />
                      <MiniScoreInput label="P" value={m.pointsB} onChange={(v) => updateMatch(m.id, { pointsB: v })} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["scheduled", "live", "finished"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateMatch(m.id, { status: s })}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 20,
                            border: `1px solid ${C.pitch}33`,
                            background: m.status === s ? C.pitch : "#fff",
                            color: m.status === s ? "#fff" : C.ink,
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "announce" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              ⏰ Scheduled announcements
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              These post themselves automatically once their time arrives — registration, each lunch sitting, and a heads-up before the finals. Timing is worked out from the actual schedule, so it updates if you regenerate. Tap "Preview" to see exactly what will go out, without actually posting it.
            </div>
            {computeScheduledAnnouncements(matches, lunchWindows, clubs).map((s) => {
              const alreadyPosted = announcements.some((a) => a.id === s.id);
              return (
                <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13, color: C.pitch }}>{s.triggerLabel}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: alreadyPosted ? C.pitch : C.inkSoft, textTransform: "uppercase" }}>
                      {alreadyPosted ? "✓ Posted" : "Not yet due"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.4, marginBottom: 8 }}>{s.text}</div>
                  <button
                    onClick={() => setPreviewAnnouncement(s)}
                    style={{ background: "none", border: `1px solid ${C.pitch}33`, borderRadius: 20, padding: "5px 12px", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.pitch, cursor: "pointer" }}
                  >
                    Preview
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              placeholder="New announcement"
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
            />
            <button
              onClick={() => {
                if (!newAnnouncement.trim()) return;
                const next = [{ id: `a${Date.now()}`, text: newAnnouncement, time: new Date().toLocaleTimeString().slice(0, 5) }, ...announcements];
                setAnnouncements(next);
                persist("announcements", next);
                logAction(adminName, `Posted announcement: "${newAnnouncement}"`);
                setNewAnnouncement("");
              }}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Post
            </button>
          </div>
          {announcements.map((a) => (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</span>
              <button
                onClick={() => {
                  const next = announcements.filter((x) => x.id !== a.id);
                  setAnnouncements(next);
                  persist("announcements", next);
                  logAction(adminName, `Deleted announcement: "${a.text}"`);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "sponsors" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              🔄 Reset sponsor names
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Renames all 6 sponsors to plain "Sponsor 1" through "Sponsor 6" — fixes any leftover "Gold/Silver/Supporter" names from before. Any logos or website links you've already added are kept untouched.
            </div>
            <button
              onClick={() => {
                const next = sponsors.map((s, i) => ({ ...s, name: `Sponsor ${i + 1}` }));
                setSponsors(next);
                persist("sponsors", next);
                logAction(adminName, "Reset all sponsor names to plain Sponsor 1-6");
              }}
              style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Reset all names to Sponsor 1–6
            </button>
          </div>

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Paste a hosted image URL for each logo (e.g. from their website, or an image you've uploaded to Google Drive/Imgur with public sharing on). Leave it blank and the sponsor's name shows instead.
          </div>
          {sponsors.map((s, i) => {
            const update = (patch) => {
              const next = sponsors.map((x, j) => (j === i ? { ...x, ...patch } : x));
              setSponsors(next);
              persist("sponsors", next);
            };
            return (
              <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    value={s.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Sponsor name"
                    style={{ flex: 1, border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700 }}
                  />
                  <button
                    onClick={() => {
                      const next = sponsors.filter((_, j) => j !== i);
                      setSponsors(next);
                      persist("sponsors", next);
                      logAction(adminName, `Removed sponsor: ${s.name}`);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={s.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="Website URL (optional)"
                  style={{ width: "100%", border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12, marginBottom: 6 }}
                />
                <input
                  value={s.logo}
                  onChange={(e) => update({ logo: e.target.value })}
                  placeholder="Logo image URL (optional)"
                  style={{ width: "100%", border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12 }}
                />
                {s.logo && (
                  <div style={{ marginTop: 8, padding: 8, background: C.line, borderRadius: 6, display: "flex", justifyContent: "center" }}>
                    <img src={s.logo} alt={s.name} style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => {
              const next = [...sponsors, { id: `s${Date.now()}`, name: "New sponsor", url: "", logo: "" }];
              setSponsors(next);
              persist("sponsors", next);
              logAction(adminName, "Added a new sponsor slot");
            }}
            style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 10, padding: 12, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, cursor: "pointer" }}
          >
            + Add sponsor
          </button>
        </div>
      )}

      {tab === "log" && (
        <div style={{ padding: 16 }}>
          <RefereeLinkCard adminName={adminName} logAction={logAction} />

          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>Club Codes</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>Each club uses this code to unlock their food order.</div>
          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {Object.entries(CLUB_PASSWORDS).map(([id, code]) => (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${C.pitch}11` }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.ink }}>{clubs.find((c) => c.id === id)?.name || id}</span>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 15, fontWeight: 700, color: C.pitch, letterSpacing: 1 }}>{code}</span>
              </div>
            ))}
          </div>

          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              💾 Download full backup
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Saves everything — teams, fixtures, scores, food orders, announcements, sponsors — as a file on your device. This is independent of the database, so it's your safety net if anything ever needs restoring. Worth doing before the event, and again a few times during the day.
            </div>
            <button
              onClick={() => {
                const backup = {
                  exportedAt: new Date().toISOString(),
                  teams,
                  matches,
                  orders,
                  announcements,
                  sponsors,
                  auditLog,
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                a.href = url;
                a.download = `blitz-backup-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                logAction(adminName, "Downloaded a full data backup");
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Download backup (.json)
            </button>
          </div>

          <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 4 }}>
              🗑️ Reset test data
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Clears fixtures, scores, food orders, announcements, and lunch windows — back to a completely clean slate, as if the event hadn't started yet. Your 8 clubs, sponsors, and admin logins are <b>not</b> affected. Use this to wipe today's test run before the real event. Downloads a backup automatically first, just in case.
            </div>
            <button
              onClick={() => {
                const sure = window.confirm(
                  "This will permanently clear all fixtures, scores, food orders, announcements, and lunch windows. Teams, sponsors and logins are kept. This cannot be undone (though a backup will download first). Continue?"
                );
                if (!sure) return;
                const typed = window.prompt('Type RESET to confirm:');
                if (typed !== "RESET") return;

                // Auto-download a safety backup before wiping anything.
                const backup = { exportedAt: new Date().toISOString(), teams, matches, orders, announcements, sponsors, auditLog };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                a.href = url;
                a.download = `blitz-backup-before-reset-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setMatches(DEFAULT_MATCHES);
                persist("matches", DEFAULT_MATCHES);
                setOrders(DEFAULT_ORDERS);
                persist("orders", DEFAULT_ORDERS);
                setAnnouncements(DEFAULT_ANNOUNCEMENTS);
                persist("announcements", DEFAULT_ANNOUNCEMENTS);
                setLunchWindows([]);
                persist("lunchWindows", []);
                setPresentations(null);
                persist("presentations", null);
                logAction(adminName, "Reset all test data (fixtures, orders, announcements, lunch windows) to a clean slate");
              }}
              style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.pitch}`, borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: C.pitch, cursor: "pointer" }}
            >
              Reset everything to a clean slate
            </button>
          </div>

          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginTop: 16, marginBottom: 10 }}>Activity Log</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Every score update, fixture change, announcement, and login. Most recent first.
          </div>
          {auditLog.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>
              Nothing logged yet.
            </div>
          )}
          {auditLog.map((entry) => (
            <div key={entry.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 12.5, color: C.pitch }}>{entry.admin}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{new Date(entry.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink }}>{entry.action}</div>
            </div>
          ))}

          </div>
        )}

      {previewAnnouncement && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,17,16,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setPreviewAnnouncement(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center", border: `3px solid ${C.sliotar}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
          >
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.pitch, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              👁 Preview only — not posted
            </div>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📢</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.pitch, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
              Announcement
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: C.ink, lineHeight: 1.5, marginBottom: 22 }}>
              {previewAnnouncement.text}
            </div>
            <button
              onClick={() => setPreviewAnnouncement(null)}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "12px 36px", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Close preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniScoreInput({ label, value, onChange, large }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: large ? 6 : 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: large ? 13 : 10, color: C.inkSoft }}>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
        style={{ width: large ? 56 : 36, padding: large ? 12 : 6, borderRadius: large ? 10 : 6, border: `${large ? 2 : 1}px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: large ? 18 : 13, fontWeight: large ? 700 : 400, textAlign: "center" }}
      />
    </div>
  );
}

function RefereeScreen({ teams, matches, setMatches, persist, logAction, wasRecentlySaved }) {
  const [refName, setRefName] = useState(() => {
    try { return localStorage.getItem("refName") || ""; } catch { return ""; }
  });
  const [pinVerified, setPinVerified] = useState(() => {
    try { return localStorage.getItem("refPinOk") === "1"; } catch { return false; }
  });
  const [myPitch, setMyPitch] = useState(() => {
    try { return localStorage.getItem("refPitch") || ""; } catch { return ""; }
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const wasAdjustRef = useRef(false);
  const REF_PIN = "1884";
  const REF_PITCHES = ["Pitch 1", "Pitch 2", "Pitch 3"];

  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };

  if (!pinVerified) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee Access" />
        <div style={{ marginTop: 40, background: "#fff", border: `2px solid ${C.sliotar}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <Flag size={36} color={C.pitch} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.pitch, textTransform: "uppercase", marginBottom: 8 }}>Referee PIN</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>Enter the 4-digit code given at the referee briefing.</div>
          <input type="tel" maxLength={4} placeholder="PIN" value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }} style={{ width: "100%", padding: 16, borderRadius: 12, textAlign: "center", border: `2px solid ${pinError ? C.pitch : C.pitch + "33"}`, fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 12, marginBottom: 12 }} />
          {pinError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, fontWeight: 700, marginBottom: 10 }}>Incorrect PIN.</div>}
          <button onClick={() => { if (pinInput === REF_PIN) { setPinVerified(true); try { localStorage.setItem("refPinOk", "1"); } catch {} } else setPinError(true); }} style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: 14, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    );
  }

  if (!refName) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee" />
        <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Enter your first and last name to record scores.</div>
          <input
            placeholder="First and last name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", marginBottom: 10 }}
          />
          <button
            onClick={() => {
              const name = nameInput.trim();
              if (!name || !name.includes(" ")) return;
              try { localStorage.setItem("refName", name); } catch {}
              setRefName(name);
            }}
            style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
          >
            Continue
          </button>
          {nameInput.trim() && !nameInput.trim().includes(" ") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.pitch, marginTop: 6 }}>Please enter both first and last name.</div>}
        </div>
      </div>
    );
  }

  if (!myPitch) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee" />
        <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 20, textAlign: "center" }}>
          <MapPin size={32} color={C.pitch} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.ink, textTransform: "uppercase", marginBottom: 6 }}>Select Your Pitch</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>You'll only see matches on your assigned pitch.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REF_PITCHES.map((p) => (
              <button key={p} onClick={() => { setMyPitch(p); try { localStorage.setItem("refPitch", p); } catch {} }} style={{ width: "100%", padding: 18, borderRadius: 14, background: p === "Pitch 1" ? "linear-gradient(135deg, #2a7d3f, #1a5c2d)" : `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`, color: "#fff", border: "none", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, cursor: "pointer" }}>{p} {p === "Pitch 1" ? "(All-Weather)" : "(Grass)"}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedId) {
    const m = matches.find((x) => x.id === selectedId);
    if (!m) {
      setSelectedId(null);
      return null;
    }
    const a = teamById(m.teamA);
    const b = teamById(m.teamB);
    const wasAdjust = wasAdjustRef.current;
    const TapBtn = ({ onClick, children, minus }) => (<button onClick={onClick} style={{ width: 48, height: 48, borderRadius: 14, border: minus ? `2px solid ${C.pitch}33` : "none", background: minus ? "#fff" : C.pitch, fontSize: 24, fontWeight: 700, cursor: "pointer", color: minus ? C.pitch : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>);
    const ScoreRow = ({ label, goals, points, onGoals, onPoints }) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 10 }}>{label}</div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>Goals</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <TapBtn minus onClick={() => onGoals(Math.max(0, goals - 1))}>-</TapBtn>
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 36, fontWeight: 900, color: C.ink, minWidth: 40, textAlign: "center" }}>{goals}</span>
              <TapBtn onClick={() => onGoals(goals + 1)}>+</TapBtn>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>Points</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <TapBtn minus onClick={() => onPoints(Math.max(0, points - 1))}>-</TapBtn>
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 36, fontWeight: 900, color: C.ink, minWidth: 40, textAlign: "center" }}>{points}</span>
              <TapBtn onClick={() => onPoints(points + 1)}>+</TapBtn>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: "'League Spartan', sans-serif", fontSize: 14, color: C.inkSoft }}>Total: {scoreLabel(goals, points)} ({scoreTotal(goals, points)} pts)</div>
      </div>
    );
    return (
      <div style={{ padding: 16 }}>
        <TopBar title={wasAdjust ? "Adjust Score" : "Enter Score"} onBack={() => { setSelectedId(null); setSaved(false); }} />
        <div style={{ marginTop: 16, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch }}>{m.time}</span>
            <PitchBadge pitch={m.pitch} />
            {wasAdjust && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.sliotar, background: `${C.sliotar}22`, padding: "3px 8px", borderRadius: 8 }}>Adjusting</span>}
          </div>
          <ScoreRow label={a.name} goals={draft.goalsA} points={draft.pointsA} onGoals={(v) => setDraft((d) => ({ ...d, goalsA: v }))} onPoints={(v) => setDraft((d) => ({ ...d, pointsA: v }))} />
          <div style={{ borderTop: `1px solid ${C.pitch}14`, paddingTop: 16 }}>
            <ScoreRow label={b.name} goals={draft.goalsB} points={draft.pointsB} onGoals={(v) => setDraft((d) => ({ ...d, goalsB: v }))} onPoints={(v) => setDraft((d) => ({ ...d, pointsB: v }))} />
          </div>
          {saved && <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,17,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ background: "#fff", borderRadius: 18, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center", border: `3px solid ${C.sliotar}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}><Check size={40} color={C.pitch} style={{ marginBottom: 12 }} /><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.pitch, textTransform: "uppercase", marginBottom: 8 }}>{wasAdjust ? "Score Adjusted" : "Score Saved"}</div><div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.ink, marginBottom: 20 }}>{scoreLabel(draft.goalsA, draft.pointsA)} v {scoreLabel(draft.goalsB, draft.pointsB)}</div><button onClick={() => { const nm = matches.filter((x) => x.pitch === myPitch && x.status !== "finished" && x.id !== m.id && x.teamA && x.teamB).sort((x, y) => x.time.localeCompare(y.time))[0]; if (nm) { setDraft({ goalsA: nm.goalsA, pointsA: nm.pointsA, goalsB: nm.goalsB, pointsB: nm.pointsB }); setSelectedId(nm.id); } else { setSelectedId(null); } setSaved(false); }} style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: 14, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 8 }}>{(() => { const nm = matches.filter((x) => x.pitch === myPitch && x.status !== "finished" && x.id !== m.id && x.teamA && x.teamB); return nm.length > 0 ? "Next match" : "Back to list"; })()}</button><button onClick={() => { setSelectedId(null); setSaved(false); }} style={{ width: "100%", background: "none", border: "none", color: C.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 8 }}>Back to match list</button></div></div>}
          <button
            onClick={async () => {
              const updatedList = matches.map((x) => (x.id === m.id ? { ...x, ...draft, status: "finished" } : x));
              const next = autoFillFinals(updatedList, teams);
              setMatches(next);
              await persist("matches", next);
              logAction(`Referee: ${refName}`, `${wasAdjust ? "Adjusted" : "Entered final"} score for ${a.name} v ${b.name}: ${scoreLabel(draft.goalsA, draft.pointsA)} - ${scoreLabel(draft.goalsB, draft.pointsB)}`);
              next.forEach((x, i) => { const before = updatedList[i]; if (before && before.finalLabel && !before.teamA && x.teamA) { const fa = teams.find((t) => t.id === x.teamA); const fb = teams.find((t) => t.id === x.teamB); logAction(`Referee: ${refName}`, `Auto-filled ${x.finalLabel}: ${fa?.name || x.teamA} v ${fb?.name || x.teamB}`); } });
              setSaved(true);
            }}
            style={{ width: "100%", background: C.sliotar, color: C.ink, border: "none", borderRadius: 30, padding: 18, fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, cursor: "pointer", marginTop: 10 }}
          >
            {wasAdjust ? "Save adjustment" : "Save final score"}
          </button>
        </div>
      </div>
    );
  }

  const pitchMatches = matches.filter((m) => m.pitch === myPitch && m.teamA && m.teamB && m.finalLabel !== "Presentations");
  const sorted = [...pitchMatches].sort((x, y) => x.time.localeCompare(y.time));
  const finishedCount = sorted.filter((m) => m.status === "finished").length;
  const visible = showFinished ? sorted : sorted.filter((m) => m.status !== "finished");

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar
        title={myPitch}
        right={<span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.line, opacity: 0.85 }}>{refName}</span>}
      />
      <div style={{ padding: "10px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => { setMyPitch(""); try { localStorage.removeItem("refPitch"); } catch {} }} style={{ background: "none", border: "none", color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Change pitch</button>
        <button onClick={() => { try { localStorage.removeItem("refName"); localStorage.removeItem("refPitch"); localStorage.removeItem("refPinOk"); } catch {} setRefName(""); setMyPitch(""); setPinVerified(false); }} style={{ background: "none", border: "none", color: C.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>Sign out</button>
      </div>
      <div style={{ padding: "8px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>
            Tap a match to enter or adjust its score.
          </div>
          {finishedCount > 0 && (
            <button
              onClick={() => setShowFinished((v) => !v)}
              style={{ background: "none", border: "none", color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}
            >
              {showFinished ? "Hide finished" : `Show finished (${finishedCount})`}
            </button>
          )}
        </div>
        {visible.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.inkSoft, textAlign: "center", padding: "40px 20px" }}>
            {sorted.length === 0 ? "No fixtures on this pitch yet." : "All matches on this pitch are done!"}
          </div>
        )}
        {visible.map((m) => {
          const a = teamById(m.teamA);
          const b = teamById(m.teamB);
          return (
            <button
              key={m.id}
              onClick={() => {
                wasAdjustRef.current = m.status === "finished";
                setDraft({ goalsA: m.goalsA, pointsA: m.pointsA, goalsB: m.goalsB, pointsB: m.pointsB });
                setSelectedId(m.id);
                setSaved(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: "#fff",
                border: `1.5px solid ${m.status === "finished" ? C.ash + "55" : C.pitch + "33"}`,
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                cursor: "pointer",
                opacity: m.status === "finished" ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.pitch }}>{m.time}</span>
                <StatusPill status={m.status} />
              </div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, lineHeight: 1.3 }}>
                {m.finalLabel === "Presentations" ? "🏆 Presentations" : (
                  <>
                    {a.name} <span style={{ color: C.inkSoft, fontWeight: 400, fontSize: 14 }}>v</span> {b.name}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <PitchBadge pitch={m.pitch} />
                {m.finalLabel && !m.finalLabel.includes("Presentations") && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.sliotar }}>{finalIcon(m.finalLabel)} {m.finalLabel}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoginModal({ mode, onClose, onMentorSuccess, onRefereeSuccess }) {
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,17,16,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, padding: "24px 22px", maxWidth: 320, width: "100%", border: `3px solid ${C.sliotar}` }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        {mode === "mentor" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <UserCircle size={20} color={C.pitch} />
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Mentor sign-in</span>
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                type={showCode ? "text" : "password"}
                placeholder="Passcode"
                value={code}
                autoFocus
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(false);
                }}
                style={{ width: "100%", padding: "12px 42px 12px 12px", borderRadius: 8, border: `1px solid ${error ? C.pitch : C.pitch + "33"}`, fontFamily: "Inter, sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
              >
                {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, marginBottom: 8 }}>
                That passcode isn't recognised.
              </div>
            )}
            <button
              onClick={() => {
                const found = findAdminByCode(code);
                if (found) onMentorSuccess(found);
                else setError(true);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Enter
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Flag size={20} color={C.pitch} />
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Referee sign-in</span>
            </div>
            <input
              placeholder="Your name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", marginBottom: 10 }}
            />
            <button
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                onRefereeSuccess(trimmed);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WelcomeMessageModal({ onDismiss }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const checkScrolled = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 15) setScrolledToEnd(true);
  };

  useEffect(() => {
    // If the message already fits without scrolling (e.g. a tall screen), don't
    // leave someone stuck unable to trigger a scroll event that will never fire.
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 15) setScrolledToEnd(true);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,17,16,0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "24px 22px 18px",
          maxWidth: 360,
          width: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          border: `3px solid ${C.sliotar}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div ref={scrollRef} onScroll={checkScrolled} style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LogoBadge size={56} ringWidth={2.5} />
          </div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch, textAlign: "center", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Welcome!
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.ink, lineHeight: 1.6 }}>
            {WELCOME_PARAGRAPHS.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "0 0 10px" }}>{p}</p>
            ))}
            <p style={{ margin: 0, fontWeight: 700, color: C.pitch }}>{WELCOME_SIGNOFF}</p>
          </div>
        </div>
        <button
          onClick={() => scrolledToEnd && onDismiss()}
          disabled={!scrolledToEnd}
          style={{
            width: "100%",
            background: scrolledToEnd ? C.pitch : C.ash,
            color: "#fff",
            border: "none",
            borderRadius: 30,
            padding: 12,
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: scrolledToEnd ? "pointer" : "not-allowed",
            marginTop: 14,
            flexShrink: 0,
          }}
        >
          {scrolledToEnd ? "Let's go!" : "Scroll to read the full message ↓"}
        </button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 10, flexShrink: 0 }}>
          You can always read this again on the Info tab.
        </div>
      </div>
    </div>
  );
}

function FoodReminderModal({ onDismiss, onOrderNow }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,17,16,0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "26px 22px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          border: `3px solid ${C.sliotar}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🍔</div>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, color: C.pitch, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.3 }}>
          Don't Forget Your Food Order!
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.ink, lineHeight: 1.6, textAlign: "left", marginBottom: 18 }}>
          <p style={{ margin: "0 0 10px" }}>
            <b>Swanny's Breakfast Bangers</b> (sausage in a bun) will be available at registration — just €2 each.
          </p>
          <p style={{ margin: "0 0 10px" }}>
            Every player and mentor gets a <b>free burger</b>, included by voucher.
          </p>
          <p style={{ margin: "0 0 10px" }}>
            It's important to enter your exact numbers in advance — we'll have everything ready for your team at your allocated time.
          </p>
          <p style={{ margin: 0 }}>
            Order (or check) your club's numbers on the <b>Team tab</b>, using the password your lead mentor has been given.
          </p>
        </div>
        <button
          onClick={onOrderNow}
          style={{
            width: "100%",
            background: C.pitch,
            color: "#fff",
            border: "none",
            borderRadius: 30,
            padding: 12,
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          Order now
        </button>
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: C.inkSoft,
            fontFamily: "Inter, sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: 6,
          }}
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

function playAnnouncementDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  } catch {
    // Web Audio unavailable or blocked — fail silently, the modal still shows.
  }
}

/* ================= APP ================= */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [matches, setMatches] = useState(DEFAULT_MATCHES);
  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
  const [sponsors, setSponsors] = useState(DEFAULT_SPONSORS);
  const [auditLog, setAuditLog] = useState([]);
  const [announcementModal, setAnnouncementModal] = useState(null); // holds the announcement to show, or null
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showFoodReminder, setShowFoodReminder] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [loginModalMode, setLoginModalMode] = useState(null); // null | "mentor" | "referee"
  const [lunchWindows, setLunchWindows] = useState([]);
  const [presentations, setPresentations] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [myClub, setMyClub] = useState(() => {
    try {
      return localStorage.getItem("myClub") || null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") === REFEREE_SECRET) return "referee";
      return localStorage.getItem("myClub") ? "team" : "welcome";
    } catch {
      return "welcome";
    }
  });

  const isRefMode = useRef(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") === REFEREE_SECRET) { isRefMode.current = true; setScreen("referee"); }
    } catch {}
  }, []);

  const chooseClub = useCallback((clubId) => {
    try {
      localStorage.setItem("myClub", clubId);
    } catch {}
    setMyClub(clubId);
    setScreen("team");
  }, []);

  const closeWelcome = useCallback(() => {
    setScreen("today");
  }, []);

  const openWelcome = useCallback(() => {
    setScreen("welcome");
  }, []);

  const changeClub = useCallback(() => {
    try {
      localStorage.removeItem("myClub");
    } catch {}
    setMyClub(null);
    setScreen("welcome");
  }, []);

  const checkForNewAnnouncement = useCallback((list) => {
    if (!list || list.length === 0) return;
    const newest = list[0]; // announcements are unshifted, so index 0 is newest
    let seenId = null;
    try {
      seenId = localStorage.getItem("seenAnnouncementId");
    } catch {}
    if (newest.id !== seenId) {
      setAnnouncementModal(newest);
      playAnnouncementDing();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [t, m, o, a, s, log, lunch, pres] = await Promise.all([
        loadShared("teams", DEFAULT_TEAMS),
        loadShared("matches", DEFAULT_MATCHES),
        loadShared("orders", DEFAULT_ORDERS),
        loadShared("announcements", DEFAULT_ANNOUNCEMENTS),
        loadShared("sponsors", DEFAULT_SPONSORS),
        loadShared("auditLog", []),
        loadShared("lunchWindows", []),
        loadShared("presentations", null),
      ]);
      setTeams(t);
      setMatches(m);
      setOrders(o);
      setAnnouncements(a);
      setSponsors(s);
      setAuditLog(log);
      setLunchWindows(Array.isArray(lunch) ? lunch : []); // old data was an object, not an array — discard if so
      setPresentations(pres && pres.from ? pres : null);
      setLoaded(true);
      checkForNewAnnouncement(a);

      let seenWelcome = null;
      try {
        seenWelcome = localStorage.getItem("seenWelcomeMessage");
      } catch {}
      const clubAlreadyOrdered = myClub ? !!o[myClub] : false;
      if (!seenWelcome) {
        setShowWelcomeMessage(true);
      } else if (!ordersAreLocked() && !clubAlreadyOrdered) {
        setShowFoodReminder(true);
      }
    })();
  }, []);

  // Poll for new announcements while the app stays open, so someone already
  // using the app sees the modal+ding as soon as an organiser posts one.
  useEffect(() => {
    const interval = setInterval(async () => {
      const latest = await loadShared("announcements", DEFAULT_ANNOUNCEMENTS);
      setAnnouncements(latest);
      checkForNewAnnouncement(latest);
    }, 25000);
    return () => clearInterval(interval);
  }, [checkForNewAnnouncement]);

  // Poll for fixture/score changes too, so with multiple people using the app
  // at once (referees entering scores, mentors and parents watching), everyone's
  // Fixtures/Standings/Team views stay current without needing a manual reload.
  // Skips the update if we saved locally very recently, so this can never race
  // ahead of our own save and wipe fixtures we just generated/edited.
  // Also skips entirely in ref mode — the ref is the one writing scores.
  useEffect(() => {
    if (isRefMode.current) return;
    const interval = setInterval(async () => {
      const recentlySaved = Date.now() - (lastSaveTimeRef.current.matches || 0) < 15000;
      if (recentlySaved) return;
      const latest = await loadShared("matches", DEFAULT_MATCHES);
      setMatches(latest);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // (Scheduled-announcement auto-posting effect moved below, after `clubs` is defined.)

  const dismissAnnouncementModal = useCallback(() => {
    if (announcementModal) {
      try {
        localStorage.setItem("seenAnnouncementId", announcementModal.id);
      } catch {}
    }
    setAnnouncementModal(null);
  }, [announcementModal]);

  const dismissWelcomeMessage = useCallback(() => {
    try {
      localStorage.setItem("seenWelcomeMessage", "1");
    } catch {}
    setShowWelcomeMessage(false);
    const clubAlreadyOrdered = myClub ? !!orders[myClub] : false;
    if (!ordersAreLocked() && !clubAlreadyOrdered) setShowFoodReminder(true);
  }, [myClub, orders]);

  const logAction = useCallback((adminName, action) => {
    setAuditLog((prev) => {
      const entry = { id: `log${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time: new Date().toISOString(), admin: adminName, action };
      const next = [entry, ...prev].slice(0, 300); // keep the log from growing unbounded
      saveShared("auditLog", next);
      return next;
    });
  }, []);

  const clubs = useMemo(() => {
    const seen = new Map();
    teams.forEach((t) => {
      const cid = t.clubId || t.id;
      if (!seen.has(cid)) {
        seen.set(cid, {
          id: cid,
          clubId: cid,
          name: t.name.replace(/\s+[AB]$/, ""),
          town: t.town,
          county: t.county,
          color: t.color,
        });
      }
    });
    return Array.from(seen.values());
  }, [teams]);

  // Auto-post scheduled announcements (registration, each lunch sitting, finals)
  // once their trigger time arrives. Whichever open browser's check fires first
  // posts it — checking the latest data first means two browsers checking around
  // the same moment won't both post a duplicate.
  useEffect(() => {
    const checkScheduled = async () => {
      const now = new Date();
      if (!isEventDay(now)) return; // never fire on any day other than the real event day
      const scheduled = computeScheduledAnnouncements(matches, lunchWindows, clubs);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const due = scheduled.filter((s) => nowMin >= s.triggerMin);
      if (due.length === 0) return;
      const latest = await loadShared("announcements", DEFAULT_ANNOUNCEMENTS);
      const existingIds = new Set(latest.map((a) => a.id));
      const toAdd = due.filter((s) => !existingIds.has(s.id));
      if (toAdd.length === 0) return;
      const newEntries = toAdd.map((s) => ({ id: s.id, text: s.text, time: now.toTimeString().slice(0, 5) }));
      const next = [...newEntries, ...latest];
      setAnnouncements(next);
      await saveShared("announcements", next);
      checkForNewAnnouncement(next);
    };
    checkScheduled();
    const interval = setInterval(checkScheduled, 30000);
    return () => clearInterval(interval);
  }, [matches, lunchWindows, clubs, checkForNewAnnouncement]);

  const lastSaveTimeRef = useRef({});
  const persist = useCallback((key, value) => {
    lastSaveTimeRef.current[key] = Date.now();
    return saveShared(key, value);
  }, []);
  const wasRecentlySaved = useCallback((key, ms = 3000) => Date.now() - (lastSaveTimeRef.current[key] || 0) < ms, []);

  const myClubObj = clubs.find((c) => c.id === myClub) || null;

  const saveOrder = useCallback(
    async (clubId, order) => {
      const latest = await loadShared("orders", orders);
      const next = { ...latest, [clubId]: order };
      setOrders(next);
      await saveShared("orders", next);
    },
    [orders]
  );

  if (!loaded) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.turf, gap: 16 }}>
        <img src={BADGE_LOGO} alt="Fingallians" style={{ width: 100, height: 100, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Meas</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>&#183;</span>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Neart</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>&#183;</span>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Bua</span>
        </div>
        <span style={{ color: C.line, fontFamily: "Inter, sans-serif", fontSize: 13 }}>Loading blitz day...</span>
      </div>
    );
  }

  if (screen === "welcome") {
    return <WelcomeScreen clubs={clubs} onChoose={chooseClub} onClose={closeWelcome} myClubName={myClubObj?.name} />;
  }

  if (isRefMode.current && screen === "referee") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", background: C.line, minHeight: "100dvh", fontFamily: "Inter, sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <RefereeScreen teams={teams} matches={matches} setMatches={setMatches} persist={persist} logAction={logAction} wasRecentlySaved={wasRecentlySaved} />
      </div>
    );
  }

  let body;
  if (screen === "today") body = <TodayScreen teams={teams} clubs={clubs} matches={matches} announcements={announcements} sponsors={sponsors} setScreen={setScreen} setSelectedTeam={setSelectedTeam} myClubName={myClubObj?.name} myClubObj={myClubObj} onChangeClub={changeClub} onOpenWelcome={openWelcome} lunchWindows={lunchWindows} presentations={presentations} />;
  else if (screen === "teams") body = <TeamsScreen teams={teams} matches={matches} setScreen={setScreen} setSelectedTeam={setSelectedTeam} />;
  else if (screen === "teamDetail") body = <TeamDetailScreen teamId={selectedTeam} teams={teams} matches={matches} setScreen={setScreen} />;
  else if (screen === "fixtures") body = <FixturesScreen teams={teams} clubs={clubs} matches={matches} sponsors={sponsors} setScreen={setScreen} myClubObj={myClubObj} />;
  else if (screen === "standings") body = <StandingsScreen teams={teams} matches={matches} sponsors={sponsors} myClubObj={myClubObj} />;
  else if (screen === "team") body = <TeamScreen teams={teams} clubs={clubs} matches={matches} orders={orders} saveOrder={saveOrder} sponsors={sponsors} myClub={myClub} myClubName={myClubObj?.name} onOpenWelcome={openWelcome} onChangeClub={changeClub} lunchWindows={lunchWindows} logAction={logAction} />;
  else if (screen === "info") body = <InfoScreen sponsors={sponsors} announcements={announcements} myClubObj={myClubObj} onMentorClick={() => (adminAuthed ? setScreen("admin") : setLoginModalMode("mentor"))} />;
  else if (screen === "admin" && adminAuthed)
    body = (
      <AdminScreen
        teams={teams}
        clubs={clubs}
        matches={matches}
        setMatches={setMatches}
        orders={orders}
        announcements={announcements}
        setAnnouncements={setAnnouncements}
        sponsors={sponsors}
        setSponsors={setSponsors}
        persist={persist}
        auditLog={auditLog}
        logAction={logAction}
        lunchWindows={lunchWindows}
        setLunchWindows={setLunchWindows}
        presentations={presentations}
        setPresentations={setPresentations}
        wasRecentlySaved={wasRecentlySaved}
        adminName={adminName}
        onLogout={() => {
          logAction(adminName, "Logged out");
          setAdminAuthed(false);
          setAdminName("");
          setScreen("today");
        }}
      />
    );
  else if (screen === "referee")
    body = <RefereeScreen teams={teams} matches={matches} setMatches={setMatches} persist={persist} logAction={logAction} wasRecentlySaved={wasRecentlySaved} />;
  // If screen is somehow "admin" without being authed, body stays unset here and
  // falls through to the safety-net default below — no state updates during render.

  if (!body) body = <TodayScreen teams={teams} clubs={clubs} matches={matches} announcements={announcements} sponsors={sponsors} setScreen={setScreen} setSelectedTeam={setSelectedTeam} myClubName={myClubObj?.name} myClubObj={myClubObj} onChangeClub={changeClub} onOpenWelcome={openWelcome} lunchWindows={lunchWindows} presentations={presentations} />;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: C.line, minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
      {screen !== "referee" && screen !== "admin" && (
        <div style={{ textAlign: "center", padding: "6px 0", background: C.line, borderTop: `1px solid #e9e2de` }}>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.pitch, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6 }}>Meas &#183; Neart &#183; Bua</span>
        </div>
      )}
      {screen !== "referee" && <BottomNav screen={screen} setScreen={setScreen} />}

      {loginModalMode && (
        <LoginModal
          mode={loginModalMode}
          onClose={() => setLoginModalMode(null)}
          onMentorSuccess={(name) => {
            setAdminName(name);
            setAdminAuthed(true);
            logAction(name, "Logged in");
            setLoginModalMode(null);
            setScreen("admin");
          }}
          onRefereeSuccess={(name) => {
            try {
              localStorage.setItem("refName", name);
            } catch {}
            setLoginModalMode(null);
            setScreen("referee");
          }}
        />
      )}

      {showWelcomeMessage && screen !== "referee" && <WelcomeMessageModal onDismiss={dismissWelcomeMessage} />}

      {showFoodReminder && screen !== "referee" && !showWelcomeMessage && !(myClub && orders[myClub]) && (
        <FoodReminderModal
          onDismiss={() => setShowFoodReminder(false)}
          onOrderNow={() => {
            setShowFoodReminder(false);
            setScreen("team");
          }}
        />
      )}

      {announcementModal && screen !== "referee" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,17,16,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={dismissAnnouncementModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "28px 24px",
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
              border: `3px solid ${C.sliotar}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>📢</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.pitch, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
              Announcement
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: C.ink, lineHeight: 1.5, marginBottom: 22 }}>
              {announcementModal.text}
            </div>
            <button
              onClick={dismissAnnouncementModal}
              style={{
                background: C.pitch,
                color: "#fff",
                border: "none",
                borderRadius: 30,
                padding: "12px 36px",
                fontFamily: "'League Spartan', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
