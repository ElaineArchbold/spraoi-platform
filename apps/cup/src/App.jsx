import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import html2canvas from "html2canvas";
import { CUP_EVENTS_KEY, cupRead, cupReadSection, cupWriteSection, cupActiveEvent, cupSetActiveEvent, cupCreateEvent, cupUpdateEvent, cupDuplicateEvent, cupRefAccess, cupRefLink, cupGenerateSchedule, cupResolveFinals } from "./cupEventStore";
import { openAdminModule, requestedScreenFromUrl, requestedTeamFromUrl, readModuleScreen, writeModuleScreen } from "../../../packages/ui/src/platformNavigation.js";

/* ============================================================
   SPRAOI COACH — Desktop-first redesign
   Navy sidebar, purple accents, responsive
   ============================================================ */

// Design tokens (from Figma design system)
const P = {
  p900: "#4a0072", p800: "#6a1b9a", p700: "#7b1fa2", p600: "#8e24aa",
  p500: "#9c27b0", p400: "#ab47bc", p300: "#ce93d8", p200: "#e1bee7", p100: "#f3e5f5", p50: "#faf5fc",
  navy: "#0b2545", ink: "#13243b", muted: "#627187", line: "#dfe7ef",
  soft: "#f6f9fc", cream: "#fffaf2", white: "#ffffff",
  green: "#43a047", orange: "#fb8c00", coral: "#e64a19", sky: "#29b6f6", yellow: "#fbc02d",
};
const F = {
  display: "'Nunito', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

function useSpraoiFonts() {
  useEffect(() => {
    const id = "spraoi-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Nunito:wght@600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);
}
const Sh = {
  card: "0 2px 12px rgba(142,36,170,.06), 0 1px 3px rgba(13,49,87,.05)",
  lift: "0 8px 24px rgba(142,36,170,.12), 0 2px 6px rgba(13,49,87,.06)",
};

/* ============================================================
   CATEGORY ICON MAPPING — sport + category dual tags on drill cards
   ============================================================ */

const ACTIVE_TEAM_KEY = "spraoi_active_team_id";
const ACTIVE_CLUB_KEY = "spraoi_active_club_id";
const ACTIVE_CONTEXT_EVENT = "spraoi-active-context";
const ACTIVE_MODULE_KEY = "spraoi_active_module";
const ACTIVE_SCREEN_KEY = "spraoi_active_screen";

function saveActiveContext(team, club) {
  if (team?.id) {
    localStorage.setItem(ACTIVE_TEAM_KEY, String(team.id));
    // Keep the legacy key during the transition so older module builds still follow.
    localStorage.setItem("spraoi_team_id", String(team.id));
  } else {
    localStorage.removeItem(ACTIVE_TEAM_KEY);
    localStorage.removeItem("spraoi_team_id");
  }
  if (club?.id) localStorage.setItem(ACTIVE_CLUB_KEY, String(club.id));
  window.dispatchEvent(new CustomEvent(ACTIVE_CONTEXT_EVENT, {
    detail: { teamId: team?.id || null, clubId: club?.id || null }
  }));
}

function roleCapabilities(role) {
  const normalized = String(role || "").toLowerCase();
  return {
    isClubAdmin: ["club_admin", "super_admin", "admin"].includes(normalized),
    isLeadCoach: normalized === "lead_coach",
    isCoachMentor: ["coach_mentor", "coach", "mentor"].includes(normalized),
    canEditCoachPlans: ["club_admin", "super_admin", "admin", "lead_coach"].includes(normalized),
    canEditAcademyPlans: ["club_admin", "super_admin", "admin", "lead_coach"].includes(normalized),
    canPublishAcademy: ["club_admin", "super_admin", "admin", "lead_coach"].includes(normalized),
    canAddDrills: ["club_admin", "super_admin", "admin", "lead_coach"].includes(normalized),
    canEditSharedDrills: ["club_admin", "super_admin", "admin"].includes(normalized),
    canDeleteSharedDrills: ["club_admin", "super_admin", "admin"].includes(normalized),
    canManageTeamStaff: ["club_admin", "super_admin", "admin"].includes(normalized),
  };
}

function teamDisplayName(team, fallback = "Team") {
  if (!team) return fallback;
  const base = String(team.label || team.name || fallback).trim();
  const gender = String(team.gender || "").toLowerCase();
  const suffix = gender === "girls" ? "Girls" : gender === "boys" ? "Boys" : "";
  return suffix && !new RegExp(`\\b${suffix}$`, "i").test(base) ? `${base} ${suffix}` : base;
}


function SpraoiNavIcon({ name = "", size = 18 }) {
  const key = String(name || "").toLowerCase();
  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.9, strokeLinecap:"round", strokeLinejoin:"round", "aria-hidden":true };
  let shape;
  if (key.includes("dashboard")) shape=<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>;
  else if (key.includes("planner")||key.includes("schedule")||key.includes("event")) shape=<><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/></>;
  else if (key.includes("session")||key.includes("matchday")) shape=<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m10 9 5 3-5 3V9Z"/></>;
  else if (key.includes("drill")||key.includes("content")||key.includes("template")) shape=<><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"/><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20"/></>;
  else if (key.includes("team")||key.includes("player")||key.includes("participant")||key.includes("audience")||key.includes("member")) shape=<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M14.5 14.5c3.4-.3 5.3 1.5 6 4.5"/></>;
  else if (key.includes("parent")||key.includes("coach")) shape=<><circle cx="8" cy="8" r="3"/><path d="M2.8 20c.6-4 2.4-6 5.2-6s4.6 2 5.2 6"/><path d="M16 8h5M18.5 5.5v5"/></>;
  else if (key.includes("preview")) shape=<><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></>;
  else if (key.includes("leader")||key.includes("result")||key.includes("competition")||key.includes("reward")) shape=<><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></>;
  else if (key.includes("engagement")||key.includes("report")) shape=<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>;
  else if (key.includes("setting")||key.includes("setup")) shape=<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5 15a1.7 1.7 0 0 0-1.56-1.03H3.3v-3h.14A1.7 1.7 0 0 0 5 9.94a1.7 1.7 0 0 0-.34-1.88L4.6 8l2.12-2.12.06.06A1.7 1.7 0 0 0 8.66 6.3a1.7 1.7 0 0 0 1.03-1.56V4.7h3v.04a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L17.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/></>;
  else if (key.includes("permission")||key.includes("compliance")) shape=<><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>;
  else if (key.includes("food")) shape=<><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 6 4 9h-4"/></>;
  else if (key.includes("compose")||key.includes("announcement")||key.includes("inbox")) shape=<><path d="M4 5h16v12H8l-4 4V5Z"/><path d="m7 9 5 3 5-3"/></>;
  else shape=<><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></>;
  return <svg {...common}>{shape}</svg>;
}

function getDrillIcons(activity) {
  const sport = (activity.sport || "").toLowerCase();
  const cat = (activity.category || activity.skill?.category || "").toLowerCase();
  const title = (activity.title || "").toLowerCase();

  // Sport icon (always based on sport field)
  const sportIcon = (sport === "hurling" || sport === "camogie")
    ? { icon: "/hurling-icon.png", bg: "linear-gradient(135deg, #ef5350 0%, #b71c1c 100%)", label: sport === "camogie" ? "Camogie" : "Hurling", color: "#c51417" }
    : { icon: "/football-icon.png", bg: "linear-gradient(135deg, #42a5f5 0%, #1565c0 100%)", label: "Football", color: "#1d4ed8" };

  // Category icon (based on category/skill type)
  let catIcon = null;
  if (cat.includes("speed") || cat.includes("agility") || cat.includes("abc") || cat.includes("running") || title.includes("speed") || title.includes("agility") || title.includes("sprint"))
    catIcon = { icon: "/speed-mechanics-icon.png", bg: "linear-gradient(135deg, #fbc02d 0%, #f57f17 100%)", label: "Speed & Agility", color: "#f57f17" };
  else if (cat.includes("warm") || cat.includes("cool") || cat.includes("stretch") || cat.includes("recovery") || cat.includes("rest") || title.includes("warm up") || title.includes("cooldown"))
    catIcon = { icon: "/rest-and-recovery-icon.png", bg: "linear-gradient(135deg, #ab47bc 0%, #6a1b9a 100%)", label: "Warm Up & Recovery", color: "#8e24aa" };

  return { sportIcon, catIcon };
}
// Backwards-compatible helper (used in smaller contexts)
function getCategoryIcon(activity) {
  const { sportIcon, catIcon } = getDrillIcons(activity);
  return catIcon || sportIcon;
}

/* ============================================================
   MODULE CONFIG
   ============================================================ */
const APP_MODULE = "cup";
const MODULE_URLS = {
  coach: null,
  academy: null,
  club: null,
  cup: null,
};

const MODULES = {
  coach: {
    label: "Coach", color: "#8e24aa", icon: "/spraoi-coach-icon.png", tagline: "Plan and deliver better coaching.", nav: [
      { id: "coach-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "coach-planner", icon: "◫", label: "Planner" },
      { id: "coach-sessions", icon: "▶", label: "Sessions" },
      { id: "coach-drills", icon: "◇", label: "Drills" },
      { id: "coach-players", icon: "●", label: "Players" },
    ]
  },
  academy: {
    label: "Academy", color: "#0277bd", icon: "/spraoi-academy-icon.png", tagline: "Turn weekly coaching into child-friendly practice.", nav: [
      { id: "academy-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "academy-content", icon: "✦", label: "Weekly Content" },
      { id: "academy-players", icon: "●", label: "Players" },
      { id: "academy-parents", icon: "♧", label: "Parent Access" },
      { id: "academy-preview", icon: "◉", label: "Child Preview" },
      { id: "academy-leaderboard", icon: "★", label: "Leaderboard" },
      { id: "academy-engagement", icon: "↗", label: "Engagement" },
      { id: "academy-settings", icon: "⚙", label: "Settings" },
    ],
  },
  cup: {
    label: "Cup", color: "#e65100", icon: "/spraoi-cup-icon.png", tagline: "Set up and run blitzes and tournaments.", nav: [
      { id: "cup-events", icon: "◆", label: "Events" },
      { id: "cup-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "cup-teams", icon: "●", label: "Teams" },
      { id: "cup-competition", icon: "◇", label: "Competition" },
      { id: "cup-matchday", icon: "★", label: "Matchday" },
      { id: "cup-content", icon: "i", label: "Event Content" },
      { id: "cup-food", icon: "🍽", label: "Lunch & Logistics" },
    ]
  },
  plus: {
    label: "Plus", color: "#43a047", icon: "/spraoi-plus-icon.png", tagline: "Create club challenges and seasonal campaigns.", nav: [
      { id: "plus-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "plus-challenges", icon: "⚡", label: "Challenges" },
      { id: "plus-create", icon: "+", label: "Create Challenge" },
      { id: "plus-participants", icon: "●", label: "Participants" },
      { id: "plus-leaderboards", icon: "★", label: "Leaderboards" },
      { id: "plus-rewards", icon: "◆", label: "Rewards" },
      { id: "plus-templates", icon: "◇", label: "Templates" },
      { id: "plus-settings", icon: "⚙", label: "Settings" },
    ]
  },
  connect: {
    label: "Connect", color: "#f4b400", icon: "/spraoi-connect-icon.png", tagline: "Send messages, links and collect responses.", nav: [
      { id: "connect-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "connect-compose", icon: "✎", label: "Compose" },
      { id: "connect-audiences", icon: "●", label: "Audiences" },
      { id: "connect-inbox", icon: "▣", label: "Inbox" },
      { id: "connect-responses", icon: "✓", label: "Responses" },
      { id: "connect-templates", icon: "◇", label: "Templates" },
      { id: "connect-settings", icon: "⚙", label: "Settings" },
    ]
  },
  club: {
    label: "Club", color: "#d32f2f", icon: "/spraoi-club-icon.png", tagline: "The operating centre for your club.", nav: [
      { id: "club-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "club-teams", icon: "◆", label: "Teams" },
      { id: "club-members", icon: "●", label: "Members" },
      { id: "club-permissions", icon: "◇", label: "Roles & Permissions" },
      { id: "club-facilities", icon: "⌖", label: "Facilities" },
      { id: "club-branding", icon: "✦", label: "Branding" },
      { id: "club-integrations", icon: "↔", label: "Integrations" },
      { id: "club-reports", icon: "↗", label: "Reports" },
      { id: "club-audit", icon: "▤", label: "Audit Log" },
      { id: "club-settings", icon: "⚙", label: "Settings" },
    ]
  },
};

function normalizeModuleIds(moduleIds = []) {
  const aliases = {
    journey: "academy",
    blitz: "cup",
    challenge: "plus",
  };
  return [...new Set(moduleIds.map((id) => aliases[id] || id))];
}

/* ============================================================
   SIDEBAR — with module switcher
   ============================================================ */
function Sidebar({ activeModule, setActiveModule, activeScreen, onNav, club, selectedTeam, onSelectTeam, enabledModules, onLogout, ageGroups, myTeams, onShowProfile, canManageAllTeams = false }) {
  const visibleTeams = canManageAllTeams ? (ageGroups || []) : (ageGroups || []).filter((ag) => (myTeams || []).includes(ag.id));
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  const [cupSidebarEvents, setCupSidebarEvents] = useState([]);
  const [cupSidebarEventId, setCupSidebarEventId] = useState(() => cupActiveEvent());

  useEffect(() => {
    if (activeModule !== "cup") return;
    let cancelled = false;
    (async () => {
      const es = await cupRead(CUP_EVENTS_KEY, []);
      if (cancelled) return;
      const teamId = selectedTeam?.id;
      const scoped = teamId
        ? (Array.isArray(es) ? es : []).filter((e) => e?.ownerTeamId && String(e.ownerTeamId) === String(teamId))
        : [];
      setCupSidebarEvents(scoped);

      const remembered = cupActiveEvent();
      const current = remembered && scoped.some((e) => e.id === remembered)
        ? remembered
        : scoped[0]?.id || "";

      setCupSidebarEventId(current);
      if (current) cupSetActiveEvent(current);
    })();
    return () => { cancelled = true; };
  }, [activeModule, activeScreen, selectedTeam?.id]);

  const cupSidebarEvent = cupSidebarEvents.find((e) => e.id === cupSidebarEventId) || null;

  function openModule(key, module) {
    const target = module.nav[0].id;
    if (key !== APP_MODULE) {
      openAdminModule(key, target);
      return;
    }
    setActiveModule(APP_MODULE);
    onNav(target);
  }

  return (
    <div style={{ width: 306, minHeight: "100vh", display: "flex", flexShrink: 0, position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", zIndex: 30 }}>
      {/* Fixed global module rail: all modules are always reachable without scrolling */}
      <aside style={{ width: 78, background: "#10243e", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: 8, borderRight: "1px solid rgba(255,255,255,.08)" }}>
        <div title={clubName} style={{ width: 60, height: 60, borderRadius: 17, background: "#fff", display: "grid", placeItems: "center", overflow: "hidden", boxShadow: "0 5px 16px rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.55)", marginBottom: 5 }}>
          <img src={club?.logo_url || "/spraoi-club-icon.png"} alt={`${clubName} crest`} style={{ width: 52, height: 52, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>
          {Object.entries(MODULES).filter(([key]) => !["plus","connect"].includes(key)).map(([key, module]) => {
            const isActive = activeModule === key;
            const locked = !enabledModules.includes(key);
            const darkText = key === "connect";
            return (
              <button key={key} title={`${module.label}${locked ? " — contact your administrator" : ""}`} onClick={() => openModule(key, module)} style={{ width: "100%", minHeight: 62, border: "none", borderRadius: 14, cursor: "pointer", background: isActive ? module.color : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, position: "relative", boxShadow: isActive ? "0 8px 22px rgba(0,0,0,.24)" : "none" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", boxShadow: isActive ? "0 6px 16px rgba(0,0,0,.18)" : "0 3px 10px rgba(0,0,0,.10)" }}><img src={module.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: locked ? "grayscale(1) opacity(.55)" : "none" }} /></span>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "-.01em", color: isActive ? (darkText ? "#332800" : "#fff") : "rgba(255,255,255,.7)" }}>{module.label}</span>
                {locked && <span style={{ position: "absolute", top: 5, right: 5, fontSize: 9, color: "rgba(255,255,255,.8)" }}>🔒</span>}
              </button>
            );
          })}
        </div>
        <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 58, height: 38, objectFit: "contain", marginBottom: 4, opacity: .96 }} />
        <button onClick={onShowProfile} title="Profile & sign out" style={{ width: 42, height: 42, borderRadius: 13, border: "1px solid rgba(255,255,255,.36)", background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", fontFamily: F.body, fontWeight: 800 }}>EA</button>
      </aside>

      {/* Fixed navigation for the active module */}
      <aside style={{ width: 228, background: `linear-gradient(180deg, ${mod.color} 0%, ${mod.color}ee 58%, #10243e 100%)`, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "background .22s ease", color: activeModule === "connect" ? "#332800" : "#fff" }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: activeModule === "connect" ? "1px solid rgba(51,40,0,.18)" : "1px solid rgba(255,255,255,.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fff", display: "grid", placeItems: "center", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 7px 18px rgba(0,0,0,.14)" }}>
              <img src={mod.icon} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 19, fontWeight: 900, color: activeModule === "connect" ? "#332800" : "#fff", lineHeight: 1 }}>{mod.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: activeModule === "connect" ? "rgba(51,40,0,.72)" : "rgba(255,255,255,.74)", marginTop: 5 }}>{clubName}</div>
            </div>
          </div>
        </div>

        <div style={{ margin: "11px 12px 4px" }}>
          {activeModule === "cup" ? (
            <div>
         <div style={{ marginBottom: 10 }}>
  <div
    style={{
      fontFamily: F.body,
      fontSize: 9,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: ".08em",
      color: "rgba(255,255,255,.68)",
      margin: "0 2px 5px"
    }}
  >
    Current team
  </div>

  {visibleTeams.length > 1 ? (
    <select
      value={selectedTeam?.id || ""}
      onChange={(e) => {
        const ag = ageGroups?.find((a) => a.id === e.target.value);
        if (ag) onSelectTeam(ag);
      }}
      style={{
        width: "100%",
        padding: "9px 10px",
        borderRadius: 9,
        border: "1px solid rgba(255,255,255,.2)",
        background: "rgba(255,255,255,.14)",
        fontFamily: F.body,
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        cursor: "pointer"
      }}
    >
      {visibleTeams.map((ag) => (
        <option key={ag.id} value={ag.id} style={{ color: P.ink }}>
          {teamDisplayName(ag)}
        </option>
      ))}
    </select>
  ) : selectedTeam ? (
    <div
      style={{
        padding: "9px 10px",
        borderRadius: 9,
        background: "rgba(255,255,255,.14)",
        fontFamily: F.body,
        fontSize: 11,
        fontWeight: 700
      }}
    >
      {teamDisplayName(selectedTeam)}
    </div>
  ) : null}

  <div
    style={{
      fontFamily: F.body,
      fontSize: 8,
      color: "rgba(255,255,255,.68)",
      marginTop: 5,
      paddingLeft: 2
    }}
  >
    Cup events are managed in this team context
  </div>

              </div>
              <div style={{ fontFamily: F.body, fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.68)", margin: "0 2px 5px" }}>Current event</div>
              {cupSidebarEvents.length > 0 ? (
                <>
                  <select
                    value={cupSidebarEventId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCupSidebarEventId(id);
                      cupSetActiveEvent(id);
                      window.dispatchEvent(
                        new CustomEvent("spraoi-cup-event-selected", {
                          detail: { eventId: id },
                        })
                      );
                      onNav("cup-dashboard");
                    }}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.15)", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}
                  >
                    {cupSidebarEvents.map((ev) => <option key={ev.id} value={ev.id} style={{ color: P.ink }}>{ev.name}</option>)}
                  </select>
                  {cupSidebarEvent && <div style={{ fontFamily: F.body, fontSize: 8, color: "rgba(255,255,255,.72)", lineHeight: 1.45, padding: "5px 3px 0" }}>{cupSidebarEvent.date || "Date TBC"}{cupSidebarEvent.venue ? ` · ${cupSidebarEvent.venue}` : ""}</div>}
                </>
              ) : (
                <div style={{ padding: "9px 10px", borderRadius: 9, background: "rgba(255,255,255,.12)", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.85)" }}>
                  No event assigned to this team
                </div>
              )}
            </div>
          ) : visibleTeams.length > 1 ? (
            <select value={selectedTeam?.id || ""} onChange={(e) => { const ag = ageGroups?.find((a) => a.id === e.target.value); if (ag) onSelectTeam(ag); }} style={{ width: "100%", padding: "9px 10px", borderRadius: 9, border: activeModule === "connect" ? "1px solid rgba(51,40,0,.2)" : "1px solid rgba(255,255,255,.2)", background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: activeModule === "connect" ? "#332800" : "#fff", cursor: "pointer" }}>
              {visibleTeams.map((ag) => <option key={ag.id} value={ag.id} style={{ color: P.ink }}>{teamDisplayName(ag)}</option>)}
            </select>
          ) : selectedTeam ? (
            <div style={{ padding: "9px 10px", borderRadius: 9, background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700 }}>{teamDisplayName(selectedTeam)}</div>
          ) : null}
        </div>

        <nav style={{ flex: 1, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {mod.nav.map((item) => {
            const isActive = activeScreen === item.id || (item.id === "coach-sessions" && activeScreen === "coach-builder");
            const fg = activeModule === "connect" ? "#332800" : "#fff";
            return (
              <button key={item.id} onClick={() => onNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 10, border: "none", cursor: "pointer", width: "100%", background: isActive ? "#fff" : "transparent", textAlign: "left" }}>
                <span style={{ fontSize: 15, color: isActive ? (activeModule === "connect" ? "#5b4600" : mod.color) : "#fff", opacity: 1 }}><SpraoiNavIcon name={item.id} size={16} /></span>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: isActive ? 700 : 550, letterSpacing: "-.01em", color: isActive ? (activeModule === "connect" ? "#5b4600" : mod.color) : "#fff", opacity: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>


      </aside>
    </div>
  );
}


function MobileAccessibilityStyles() {
  return <style>{`
    .spraoi-page-header { box-sizing: border-box; }
    .spraoi-page-header-main { min-width: 0; }
    .spraoi-page-header-actions { min-width: 0; }
    .spraoi-shell button { touch-action: manipulation; }
    @media (max-width: 760px) {
      .spraoi-page-header {
        padding: 14px 14px !important;
        min-height: auto !important;
        align-items: flex-start !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      .spraoi-page-header-main { width: 100% !important; gap: 10px !important; align-items: center !important; }
      .spraoi-page-header-icon { width: 48px !important; height: 48px !important; border-radius: 15px !important; flex: 0 0 48px !important; }
      .spraoi-page-header-icon img { width: 36px !important; height: 36px !important; }
      .spraoi-page-header-title { font-size: 20px !important; line-height: 1.12 !important; overflow-wrap: anywhere; }
      .spraoi-page-header-sub { font-size: 11px !important; line-height: 1.4 !important; overflow-wrap: anywhere; }
      .spraoi-page-header-actions { width: 100% !important; display: grid !important; grid-template-columns: 1fr !important; gap: 8px !important; }
      .spraoi-page-header-actions > button { width: 100% !important; min-height: 44px !important; justify-content: center !important; }
      .spraoi-shell input, .spraoi-shell select, .spraoi-shell textarea { font-size: 16px !important; }
      .spraoi-shell { overflow-x: hidden; }
    }
  `}</style>;
}

function TopBar({ title, sub, children }) {
  const lower = `${title || ""} ${sub || ""}`.toLowerCase();
  let key = "coach";
  if (lower.includes("academy")) key = "academy";
  else if (lower.includes("cup") || lower.includes("tournament") || lower.includes("fixture")) key = "cup";
  else if (lower.includes("connect") || lower.includes("message") || lower.includes("audience") || lower.includes("inbox")) key = "connect";
  else if (lower.includes("club") || lower.includes("permission") || lower.includes("member")) key = "club";
  else if (lower.includes("plus") || lower.includes("challenge") || lower.includes("leaderboard")) key = "plus";
  const module = MODULES[key];
  const isConnect = key === "connect";
  const isAcademy = key === "academy";
  const background = isAcademy
    ? "linear-gradient(135deg, #eef8ff 0%, #d8f0ff 52%, #c8e9fb 100%)"
    : isConnect
      ? "linear-gradient(135deg, #fff8d6 0%, #fbcf45 100%)"
      : `linear-gradient(135deg, ${module.color}16 0%, ${module.color}32 100%)`;
  return (
    <div className="spraoi-page-header" style={{ padding: "20px 28px", background, borderBottom: `1px solid ${module.color}28`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 92 }}>
      <div className="spraoi-page-header-main" style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div className="spraoi-page-header-icon" style={{ width: 64, height: 64, borderRadius: 20, display: "grid", placeItems: "center", background: "#fff", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 10px 26px rgba(16,36,62,.12)", flexShrink: 0 }}>
          <img src={module.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="spraoi-page-header-title" style={{ fontFamily: F.display, fontSize: 24, fontWeight: 900, color: isConnect ? "#332800" : P.ink, lineHeight: 1.1 }}>{title}</div>
          {sub && <div className="spraoi-page-header-sub" style={{ fontFamily: F.body, fontSize: 12, color: isConnect ? "rgba(51,40,0,.72)" : P.muted, marginTop: 6 }}>{sub}</div>}
        </div>
      </div>
      {children && <div className="spraoi-page-header-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>}
    </div>
  );
}

function Btn({ label, variant = "primary", icon, onClick, style }) {
  const styles = {
    primary: { background: P.p600, color: P.white, border: "none", boxShadow: "0 4px 14px rgba(142,36,170,.25)" },
    secondary: { background: P.p50, color: P.p600, border: `1.5px solid ${P.p200}` },
    ghost: { background: "transparent", color: P.ink, border: `1.5px solid ${P.line}` },
  };
  return (
    <button onClick={onClick} style={{ height: 36, padding: "0 16px", borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 12, fontWeight: 700, ...styles[variant], ...style }}>
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */
function StatCard({ label, value, sub, color = P.p600, icon }) {
  return (
    <div style={{ background: P.white, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.line}`, borderTop: `3px solid ${color}`, boxShadow: Sh.card }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: P.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* ============================================================
   DASHBOARD SCREEN — matches Figma design
   ============================================================ */

function CoachReadOnlyNotice({ title = "Read-only access", message = "Coach / Mentor accounts can view this team’s Coach content but cannot create or edit plans." }) {
  return (
    <div style={{
      margin: "16px 24px 0",
      padding: "12px 14px",
      borderRadius: 12,
      background: "#fff8e1",
      border: "1px solid #f4d58d",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      fontFamily: F.body,
    }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#7a4b00" }}>{title}</div>
        <div style={{ fontSize: 10, color: "#8a641f", marginTop: 3, lineHeight: 1.45 }}>{message}</div>
      </div>
    </div>
  );
}

function DashboardScreen({ club, ageGroups, planSessions, weeklyPlan, upcomingSessions, onNav, onOpenSession, allActivities, selectedTeam, canEdit }) {
  const today = new Date().toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  // Filter sessions for selected team on dashboard
  const teamSessions = selectedTeam ? (upcomingSessions || []).filter((s) => s.plan?.age_group_id === selectedTeam.id) : (upcomingSessions || []);

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <style>{`
        @media (max-width: 900px) {
          .session-builder-layout { flex-direction: column !important; padding: 12px !important; }
          .session-drill-library { width: 100% !important; }
          .session-drill-library > div { position: static !important; }
        }
        @media (max-width: 560px) {
          .session-builder-layout { gap: 10px !important; }
          .session-sport-filters { grid-template-columns: 1fr !important; }
          .academy-match-actions { display: grid !important; grid-template-columns: 1fr !important; }
        }
      `}
</style>
      <TopBar title="Dashboard" sub={today}>
        {canEdit && <Btn label="+ New Session" variant="primary" onClick={() => onNav("coach-builder")} />}
      </TopBar>
      {!canEdit && <CoachReadOnlyNotice />}
      <div style={{ padding: "20px 24px" }}>
        {/* Stat cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Favourite Drills" value="★" sub="Your saved drills" color={P.p600} icon="❤️" />
          <div onClick={() => onNav("academy-dashboard")} style={{ background: P.white, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.line}`, borderTop: "3px solid #0277bd", boxShadow: Sh.card, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Academy Sync</span>
              <span style={{ fontSize: 16 }}>🎓</span>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 900, color: P.ink, lineHeight: 1 }}>Open Academy</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 6 }}>Review skills generated from this week's plan</div>
          </div>
          <StatCard label="Drills" value={String(allActivities?.length || 0)} sub={`${allActivities?.filter(a => a.sport === 'football').length || 0} football`} color={P.sky} icon="📖" />
          <StatCard label="Next Session" value={teamSessions?.[0]?.session_date ? new Date(upcomingSessions[0].session_date).getDate() : "—"} sub={teamSessions?.[0]?.session_date ? new Date(upcomingSessions[0].session_date).toLocaleDateString("en-IE", { weekday: "short", month: "short" }) : "None scheduled"} color={P.green} icon="📅" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Upcoming Sessions */}
          <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Upcoming Sessions</div>
              <button onClick={() => onNav("coach-planner")} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, cursor: "pointer" }}>View Calendar</button>
            </div>
            {(!teamSessions || teamSessions.length === 0) ? (
              <div style={{ fontFamily: F.body, fontSize: 12, color: P.muted, padding: "12px 0" }}>No upcoming sessions scheduled.</div>
            ) : (
              teamSessions.slice(0, 4).map((sess, i) => (
                <div key={sess.id || i} onClick={() => onOpenSession(sess)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? `1px solid ${P.line}` : "none", cursor: "pointer" }}>
                  <div style={{ width: 40, textAlign: "center", background: P.soft, borderRadius: 8, padding: "6px 0" }}>
                    <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.muted, textTransform: "uppercase" }}>{sess.session_date ? new Date(sess.session_date).toLocaleDateString("en-IE", { weekday: "short" }) : ""}</div>
                    <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>{sess.session_date ? new Date(sess.session_date).getDate() : "?"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink }}>{sess.plan?.hurling_skill?.name || "Training Session"}</div>
                    <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{sess.session_date ? new Date(sess.session_date).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" }) : ""} · {sess.total_duration_mins || "?"}min</div>
                  </div>
                  <Btn label="View" variant="ghost" style={{ height: 28, fontSize: 11 }} onClick={() => onOpenSession(sess)} />
                </div>
              ))
            )}
          </div>

          {/* Session Focus */}
          <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginBottom: 14 }}>Session Focus</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Simple donut placeholder */}
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: `conic-gradient(${P.p600} 0% 40%, ${P.orange} 40% 70%, ${P.sky} 70% 90%, ${P.line} 90% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: P.white }} />
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: P.ink }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.p600 }} /> Skills 40%</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.orange }} /> Game Play 30%</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.sky }} /> Conditioning 20%</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.line }} /> Other 10%</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Recent Drills */}
          <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Recent Drills</div>
              <button onClick={() => onNav("coach-drills")} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, cursor: "pointer" }}>View All</button>
            </div>
            {(allActivities || []).slice(0, 3).map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? `1px solid ${P.line}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${P.p600}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink }}>{a.title}</div>
                  <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{a.skill?.name || a.category || ""}</div>
                </div>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, padding: "2px 8px", background: `${P.p600}12`, borderRadius: 4 }}>{a.difficulty || ""}</span>
                <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>⏱ {a.duration_mins || "?"}min</span>
                <Btn label="Use Drill" variant="ghost" style={{ height: 26, fontSize: 10, padding: "0 8px" }} onClick={() => onNav("coach-builder")} />
              </div>
            ))}
          </div>

          {/* Coaches & Teams */}
          <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Coaches & Teams</div>
              <button onClick={() => onNav("coach-players")} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, cursor: "pointer" }}>Manage</button>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 6 }}>Coaches</div>
            <div style={{ marginBottom: 12 }}>
              {["Donal", "Shane", "Mark", "Paul", "Sarah", "Emma", "Claire", "Lisa"].slice(0, 4).map((name, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${P.p600}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 9, fontWeight: 800, color: P.p600 }}>{name[0]}</div>
                  <span style={{ fontFamily: F.body, fontSize: 11, color: P.ink }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 6 }}>Team Panels</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["Hurling A", "Hurling B", "Football A", "Football B"].map((team) => (
                <details key={team} style={{ background: P.soft, borderRadius: 6, padding: "4px 8px" }}>
                  <summary style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.ink, cursor: "pointer", padding: "4px 0" }}>{team}</summary>
                  <div style={{ padding: "4px 0 6px", fontFamily: F.body, fontSize: 10, color: P.muted }}>
                    Assign players in the Players section
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PLACEHOLDER SCREENS
   ============================================================ */
function PlannerScreen({ onNav, club, ageGroups, upcomingSessions, onOpenSession, allActivities, coaches, skills, diagramMap, selectedTeam, canEdit }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [buildingDate, setBuildingDate] = useState(null); // date string if building a session
  const [buildDrills, setBuildDrills] = useState([]);
  const [buildSearch, setBuildSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < startOffset; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const sessionsByDate = {};
  (upcomingSessions || []).forEach((sess) => {
    if (!sess.session_date) return;
    // Only show sessions for the selected team
    if (selectedTeam && sess.plan?.age_group_id && sess.plan.age_group_id !== selectedTeam.id) return;
    // Parse date parts directly to avoid timezone issues
    const parts = sess.session_date.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-indexed
    const day = parseInt(parts[2]);
    if (month === selectedMonth && year === selectedYear) {
      sessionsByDate[day] = sessionsByDate[day] || [];
      sessionsByDate[day].push(sess);
    }
  });

  const today = new Date();
  const isToday = (day) => day === today.getDate() && selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  function clickDate(day) {
    const sessions = sessionsByDate[day];
    if (sessions && sessions.length > 0) {
      onOpenSession(sessions[0]);
    } else {
      if (!canEdit) return;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setBuildingDate(dateStr);
      setBuildDrills([]);
    }
  }

  function addDrillToBuild(activity) {
    setBuildDrills((d) => [...d, { ...activity, coachId: "" }]);
  }

  async function saveSession(forceSave = false) {
    if (!canEdit) return;
    if (!selectedTeam || buildDrills.length === 0 || saving) return;
    setSaving(true);
    const { data: existing } = await supabase.from("weekly_plans").select("id, week_number").eq("age_group_id", selectedTeam.id).order("week_number", { ascending: false }).limit(1);
    const nextWeek = (existing?.[0]?.week_number || 0) + 1;
    const { data: plan } = await supabase.from("weekly_plans").insert({
      club_id: club.id, age_group_id: selectedTeam.id, week_number: nextWeek, season: "2026-27",
      mode: selectedTeam.gender === "girls" ? "camogie" : "hurling", starts_at: buildingDate, published: true,
    }).select().single();
    if (plan) {
      const totalTime = buildDrills.reduce((t, d) => t + (d.duration_mins || 0), 0);
      const { data: sess } = await supabase.from("sessions").insert({
        plan_id: plan.id, session_number: 1, sport: selectedTeam.gender === "girls" ? "camogie" : "hurling",
        format: "stations", total_duration_mins: totalTime, station_count: buildDrills.length, session_date: buildingDate,
      }).select().single();
      if (sess) {
        await supabase.from("session_activities").insert(buildDrills.map((d, i) => ({
          session_id: sess.id, activity_id: d.id, station_number: i + 1, sort_order: i, assigned_coach_id: d.coachId || null,
        })));
      }
    }
    setBuildingDate(null); setBuildDrills([]);
    setSaving(false);
    // Refresh would happen on next load
  }

  // Filtered drills for builder
  let filtered = allActivities || [];
  if (buildSearch.trim()) { const q = buildSearch.toLowerCase(); filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.skill?.name?.toLowerCase().includes(q)); }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Planner" sub={`${fullMonths[selectedMonth]} ${selectedYear}`}>
        {canEdit && <Btn label="+ New Session" variant="primary" onClick={() => { const d = new Date(); clickDate(d.getDate()); }} />}
      </TopBar>
      {!canEdit && <CoachReadOnlyNotice message="You can open and review existing sessions, but only a Lead Coach or Club Admin can add a new session." />}
      <div style={{ padding: "20px 24px", display: "flex", gap: 20 }}>
        {/* Calendar */}
        <div style={{ flex: 1 }}>
          {/* Month tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 16, overflowX: "auto" }}>
            {months.map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)} style={{ padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 700, background: selectedMonth === i ? P.p600 : "transparent", color: selectedMonth === i ? "#fff" : P.muted }}>{m}</button>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ background: P.white, borderRadius: 14, padding: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>{fullMonths[selectedMonth]} {selectedYear}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setSelectedMonth((m) => m > 0 ? m - 1 : 11)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${P.line}`, background: P.white, cursor: "pointer", fontSize: 12 }}>◀</button>
                <button onClick={() => setSelectedMonth((m) => m < 11 ? m + 1 : 0)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${P.line}`, background: P.white, cursor: "pointer", fontSize: 12 }}>▶</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                <div key={d} style={{ textAlign: "center", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.muted, padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {calDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const sessions = sessionsByDate[day];
                const todayBorder = isToday(day);
                return (
                  <div key={day} onClick={() => clickDate(day)} style={{ minHeight: 52, padding: 4, borderRadius: 6, border: todayBorder ? `2px solid ${P.p600}` : `1px solid ${P.line}`, background: todayBorder ? P.p50 : P.white, cursor: "pointer" }}>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: todayBorder ? 800 : 500, color: todayBorder ? P.p600 : P.ink }}>{day}</div>
                    {sessions && sessions.map((s, si) => (
                      <div key={si} style={{ background: P.p100, borderRadius: 3, padding: "1px 3px", marginTop: 2 }}>
                        <div style={{ fontFamily: F.body, fontSize: 8, fontWeight: 700, color: P.p700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.plan?.hurling_skill?.name || "Session"}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel — session builder (when building) or empty */}
        {buildingDate && (
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ background: P.white, borderRadius: 14, padding: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, position: "sticky", top: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink }}>New Session</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{new Date(buildingDate).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" })}</div>
                </div>
                <button onClick={() => setBuildingDate(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: P.muted }}>×</button>
              </div>

              {/* Added drills */}
              {buildDrills.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {buildDrills.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${P.line}` }}>
                      <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 900, color: P.p600, width: 16 }}>{i + 1}</span>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
                      {coaches.length > 0 && (
                        <select value={d.coachId || ""} onChange={(e) => setBuildDrills((ds) => ds.map((dd, ii) => ii === i ? { ...dd, coachId: e.target.value } : dd))} style={{ width: 60, fontSize: 9, padding: 2, borderRadius: 4, border: `1px solid ${P.line}` }}>
                          <option value="">Coach</option>
                          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name.split(" ")[0]}</option>)}
                        </select>
                      )}
                      <button onClick={() => setBuildDrills((ds) => ds.filter((_, ii) => ii !== i))} style={{ background: "none", border: "none", color: P.coral, cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                  ))}
                  <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 6 }}>{buildDrills.reduce((t, d) => t + (d.duration_mins || 0), 0)} min · {buildDrills.length} drills</div>
                </div>
              )}

              {/* Save button */}
              {buildDrills.length > 0 && (
                <Btn label={saving ? "Saving..." : "Save Session"} variant="primary" onClick={saveSession} style={{ width: "100%", marginBottom: 12 }} />
              )}

              {/* Search + add drills */}
              <input type="text" placeholder="Search drills to add..." value={buildSearch} onChange={(e) => setBuildSearch(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11, marginBottom: 8 }} />
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {filtered.slice(0, 20).map((a) => (
                  <div key={a.id} onClick={() => addDrillToBuild(a)} style={{ padding: "6px 0", borderBottom: `1px solid ${P.line}`, cursor: "pointer" }}>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink }}>{a.title}</div>
                    <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{a.skill?.name || ""} · {a.duration_mins || "?"}m</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function SessionBuilderScreen({ club, ageGroups, skills, allActivities, coaches, diagramMap, selectedTeam, onNav, editingSession, onClearEdit }) {
  const [sections, setSections] = useState(() => {
    if (editingSession) {
      // Restore phases from JSON if available
      let phases = null;
      try { phases = editingSession.notes ? JSON.parse(editingSession.notes) : null; } catch { }

      if (phases && Array.isArray(phases)) {
        // Rebuild sections from saved phases + activities
        const activities = (editingSession.session_activities || []).sort((a, b) => a.sort_order - b.sort_order);
        let drillIdx = 0;
        return phases.map((phase, i) => {
          const drills = [];
          if (phase.type === "stations" && phase.drillCount > 0) {
            for (let j = 0; j < phase.drillCount && drillIdx < activities.length; j++) {
              const sa = activities[drillIdx++];
              drills.push({ ...sa.activity, coachId: sa.assigned_coach_id || "", coachName: sa.coach?.name || "" });
            }
          }
          return { id: i + 1, type: phase.type, label: phase.label, drills, duration: phase.duration || "", coachId: phase.coachId || "", coachName: phase.coachName || "", notes: phase.notes || "" };
        });
      } else if (editingSession.session_activities?.length > 0) {
        // Fallback: just load as stations
        const drills = editingSession.session_activities.sort((a, b) => a.sort_order - b.sort_order).map((sa) => ({
          ...sa.activity, coachId: sa.assigned_coach_id || "", coachName: sa.coach?.name || "",
        }));
        return [{ id: 1, type: "stations", label: "Stations", drills }];
      }
    }
    return [{ id: 1, type: "warmup", label: "Warm-up", drills: [], duration: "10" }];
  });
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [day, setDay] = useState(() => {
    if (editingSession?.session_date) {
      const parts = editingSession.session_date.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    }
    return "";
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [notes, setNotes] = useState(editingSession?.plan?.coach_notes || "");
  const [saving, setSaving] = useState(false);
  const [nextId, setNextId] = useState(2);
  const previewRef = useRef(null);

  // Pre-fill handled in useState initializers above

  function addSection(type) {
    const labels = { warmup: "Warm-up", stations: "Stations", match: "Training Match", cooldown: "Cool-down", other: "Other" };
    const recommendedDurations = { warmup: "10", cooldown: "5", match: "15" };
    setSections((s) => [...s, { id: nextId, type, label: labels[type] || type, drills: [], duration: recommendedDurations[type] || "" }]);
    setNextId((n) => n + 1);
  }
  function removeSection(id) { setSections((s) => s.filter((sec) => sec.id !== id)); }
  function moveSection(id, dir) {
    setSections((s) => {
      const idx = s.findIndex((sec) => sec.id === id);
      if (idx < 0) return s;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= s.length) return s;
      const arr = [...s];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }
  function addDrillToSection(sectionId, activity) {
    setSections((s) => s.map((sec) => sec.id === sectionId ? { ...sec, drills: [...sec.drills, { ...activity, coachId: "", coachName: "" }] } : sec));
  }
  function removeDrill(sectionId, drillIdx) {
    setSections((s) => s.map((sec) => sec.id === sectionId ? { ...sec, drills: sec.drills.filter((_, i) => i !== drillIdx) } : sec));
  }
  function updateDrill(sectionId, drillIdx, updates) {
    setSections((s) => s.map((sec) => sec.id === sectionId ? { ...sec, drills: sec.drills.map((d, i) => i === drillIdx ? { ...d, ...updates } : d) } : sec));
  }
  function moveDrill(sectionId, fromIdx, toIdx) {
    setSections((s) => s.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const drills = [...sec.drills];
      const [item] = drills.splice(fromIdx, 1);
      drills.splice(toIdx, 0, item);
      return { ...sec, drills };
    }));
  }

  const allDrills = sections.flatMap((s) => s.drills);
  const totalTime = allDrills.reduce((t, d) => t + (d.duration_mins || 0), 0) + sections.filter((s) => s.type !== "stations").reduce((t, s) => t + (parseInt(s.duration) || 0), 0);
  const sectionColors = { warmup: P.orange, stations: P.p600, match: P.green, cooldown: P.sky, other: P.muted };

  // Filter library
  let filtered = allActivities || [];
  if (search.trim()) { const q = search.toLowerCase(); filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.skill?.name?.toLowerCase().includes(q)); }
  if (filterCat) filtered = filtered.filter((a) => a.category === filterCat || a.skill?.category === filterCat);
  if (filterSport) filtered = filtered.filter((a) => {
    const sport = String(a.sport || "").toLowerCase();
    const text = [a.title, a.description, a.category, a.skill?.name, a.skill?.category].filter(Boolean).join(" ").toLowerCase();
    const athletic = /(agility|athletic|movement|speed|balance|coordination|footwork|reaction|mobility|warm.?up|fitness)/.test(text);
    if (filterSport === "athletic") return athletic;
    if (filterSport === "hurling") return sport === "hurling" || sport === "camogie";
    return sport === "football";
  });
  const categories = [...new Set((allActivities || []).map((a) => a.category || a.skill?.category).filter(Boolean))].sort();

  async function saveSession(forceSave = false) {
    if (!selectedTeam) { alert("No team selected. Select a team in the sidebar first."); return; }
    if (saving) return;
    if (totalTime > 60 && !forceSave) { setShowTimeModal(true); return; }
    setShowTimeModal(false);
    const hasDrills = allDrills.length > 0;
    const hasSections = sections.some((s) => s.type !== "stations" && s.duration);
    if (!hasDrills && !hasSections) { alert("Add drills or set section times first. You have " + sections.length + " sections with " + allDrills.length + " drills."); return; }
    setSaving(true);
    try {
      let planId, sessionId;
      // Build phases JSON (stores warmup/cooldown/match sections)
      const phasesJson = JSON.stringify(sections.map((s) => ({ type: s.type, label: s.label, duration: s.duration || null, coachId: s.coachId || null, coachName: s.coachName || null, notes: s.notes || null, drillCount: s.drills.length })));

      if (editingSession) {
        planId = editingSession.plan_id;
        sessionId = editingSession.id;
        await supabase.from("session_activities").delete().eq("session_id", sessionId);
        await supabase.from("sessions").update({ total_duration_mins: totalTime, station_count: allDrills.length, notes: phasesJson }).eq("id", sessionId);
        if (notes) await supabase.from("weekly_plans").update({ coach_notes: notes }).eq("id", planId);
      } else {
        const { data: existing } = await supabase.from("weekly_plans").select("week_number").eq("age_group_id", selectedTeam.id).order("week_number", { ascending: false }).limit(1);
        const nextWeek = (existing?.[0]?.week_number || 0) + 1;
        const { data: plan, error: planErr } = await supabase.from("weekly_plans").insert({
          club_id: club.id, age_group_id: selectedTeam.id, week_number: nextWeek, season: "2026-27",
          mode: selectedTeam.gender === "girls" ? "camogie" : "hurling", coach_notes: notes, published: true,
          starts_at: day ? (() => { const d = new Date(); const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }; const diff = dayMap[day] - d.getDay(); d.setDate(d.getDate() + (diff < 0 ? diff + 7 : diff)); return d.toISOString().split("T")[0]; })() : new Date().toISOString().split("T")[0],
        }).select().single();
        if (planErr || !plan) { alert("Save failed: " + (planErr?.message || "")); setSaving(false); return; }
        planId = plan.id;
        const { data: sess } = await supabase.from("sessions").insert({
          plan_id: plan.id, session_number: 1, sport: selectedTeam.gender === "girls" ? "camogie" : "hurling",
          format: "stations", total_duration_mins: totalTime, station_count: allDrills.length, notes: phasesJson,
          ...(plan.starts_at ? { session_date: plan.starts_at } : {}),
        }).select().single();
        sessionId = sess?.id;
      }
      if (sessionId && allDrills.length > 0) {
        await supabase.from("session_activities").insert(allDrills.map((d, i) => ({
          session_id: sessionId, activity_id: d.id, station_number: i + 1, sort_order: i, assigned_coach_id: d.coachId || null,
        })));
      }
      setSections([{ id: 1, type: "warmup", label: "Warm-up", drills: [], duration: "10" }]); setNotes(""); setDay("");
      if (onClearEdit) onClearEdit();
      alert(editingSession ? "Session updated!" : "Session saved!");
      onNav("coach-sessions"); // Navigate back to sessions list
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  }



  async function shareAsImage() {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { useCORS: true, scale: 2, backgroundColor: "#fff", windowWidth: 500 });
    canvas.toBlob((blob) => {
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "session.png", { type: "image/png" })] })) {
        navigator.share({ files: [new File([blob], "session.png", { type: "image/png" })] }).catch(() => { });
      } else {
        const link = document.createElement("a"); link.download = "session-plan.png"; link.href = URL.createObjectURL(blob); link.click();
      }
    }, "image/png");
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Session Builder" sub={selectedTeam ? teamDisplayName(selectedTeam) : "Select a team"}>
        <Btn label="Share" variant="ghost" onClick={shareAsImage} />
        <Btn label="Save Session" variant="primary" onClick={saveSession} style={{ opacity: allDrills.length > 0 ? 1 : 0.5 }} />
      </TopBar>
      <div className="session-builder-layout" style={{ padding: "16px 20px", display: "flex", gap: 16 }}>
        {/* Main — session structure */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Week diary picker */}
          <div style={{ background: P.white, borderRadius: 12, padding: 14, border: `1px solid ${P.line}`, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button onClick={() => setWeekOffset((w) => (w || 0) - 1)} style={{ background: P.soft, border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12 }}>◀</button>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink }}>
                {(() => { const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() || 7) + 1 + (weekOffset || 0) * 7); return `Week of ${mon.toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`; })()}
              </span>
              <button onClick={() => setWeekOffset((w) => (w || 0) + 1)} style={{ background: P.soft, border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12 }}>▶</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() || 7) + 1 + (weekOffset || 0) * 7 + i);
                const isSelected = day === d;
                const isToday = mon.toDateString() === new Date().toDateString();
                return (
                  <button key={d} onClick={() => setDay(d)} style={{ padding: "8px 2px", borderRadius: 8, border: isSelected ? `2px solid ${P.p600}` : isToday ? `2px solid ${P.line}` : "2px solid transparent", background: isSelected ? P.p50 : P.white, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: isSelected ? P.p600 : P.muted }}>{d}</div>
                    <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: isSelected ? P.p600 : P.ink }}>{mon.getDate()}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{day ? `Selected: ${day}` : "Pick a day"}</span>
              <span><strong style={{ fontFamily: F.display, fontSize: 16, color: P.ink }}>{totalTime}</strong> <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>min</span> · <strong style={{ fontFamily: F.display, fontSize: 16, color: P.ink }}>{allDrills.length}</strong> <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>drills</span></span>
            </div>
          </div>

          {/* Shareable content area */}
          <div ref={previewRef}>
            {/* Sections */}
            {sections.map((sec) => (
              <div key={sec.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: sectionColors[sec.type] || P.muted }} />
                  <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, color: P.ink }}>{sec.label}</span>
                  <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{sec.drills.reduce((t, d) => t + (d.duration_mins || 0), 0)}min</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                    <button onClick={() => moveSection(sec.id, -1)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 10 }}>▲</button>
                    <button onClick={() => moveSection(sec.id, 1)} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer", fontSize: 10 }}>▼</button>
                    <button onClick={() => removeSection(sec.id)} style={{ background: "none", border: "none", color: P.coral, cursor: "pointer", fontSize: 12 }}>×</button>
                  </div>
                </div>
                {sec.type === "stations" ? (
                  /* Stations — drill cards from library */
                  sec.drills.length === 0 ? (
                    <div style={{ background: P.white, borderRadius: 10, padding: 12, border: `1.5px dashed ${P.line}`, textAlign: "center", fontFamily: F.body, fontSize: 11, color: P.muted }}>
                      Click a drill from the library to add →
                    </div>
                  ) : (
                    sec.drills.map((d, di) => (
                      <div key={di} style={{ background: P.white, borderRadius: 10, padding: "10px 12px", border: `1px solid ${P.line}`, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: F.display, fontSize: 12, fontWeight: 900, color: sectionColors[sec.type], width: 18 }}>{di + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                        </div>
                        {coaches.length > 0 ? (
                          <select value={d.coachId || ""} onChange={(e) => updateDrill(sec.id, di, { coachId: e.target.value })} style={{ width: 70, padding: "3px", borderRadius: 5, border: `1px solid ${d.coachId ? P.p600 : P.line}`, fontSize: 9, color: d.coachId ? P.p600 : P.muted }}>
                            <option value="">Coach</option>
                            {coaches.map((c) => <option key={c.id} value={c.id}>{c.name.split(" ")[0]}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder="Coach" value={d.coachName || ""} onChange={(e) => updateDrill(sec.id, di, { coachName: e.target.value })} style={{ width: 60, padding: "3px 5px", borderRadius: 5, border: `1px solid ${P.line}`, fontSize: 9 }} />
                        )}
                        <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{d.duration_mins || "?"}m</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          <button onClick={() => di > 0 && moveDrill(sec.id, di, di - 1)} style={{ background: "none", border: "none", color: di > 0 ? P.ink : P.line, cursor: di > 0 ? "pointer" : "default", fontSize: 9, padding: 0, lineHeight: 1 }}>▲</button>
                          <button onClick={() => di < sec.drills.length - 1 && moveDrill(sec.id, di, di + 1)} style={{ background: "none", border: "none", color: di < sec.drills.length - 1 ? P.ink : P.line, cursor: di < sec.drills.length - 1 ? "pointer" : "default", fontSize: 9, padding: 0, lineHeight: 1 }}>▼</button>
                        </div>
                        <button onClick={() => removeDrill(sec.id, di)} style={{ background: "none", border: "none", color: P.coral, cursor: "pointer", fontSize: 14 }}>×</button>
                      </div>
                    ))
                  )
                ) : (
                  /* Warmup / Cooldown / Match — time + coach only */
                  <div style={{ background: P.white, borderRadius: 10, padding: "12px 14px", border: `1px solid ${P.line}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" placeholder="10" value={sec.duration || ""} onChange={(e) => setSections((s) => s.map((ss) => ss.id === sec.id ? { ...ss, duration: e.target.value } : ss))} style={{ width: 44, padding: "6px", borderRadius: 6, border: `1.5px solid ${P.line}`, fontSize: 12, textAlign: "center", fontFamily: F.body }} />
                      <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>min</span>
                    </div>
                    {coaches.length > 0 ? (
                      <select value={sec.coachId || ""} onChange={(e) => setSections((s) => s.map((ss) => ss.id === sec.id ? { ...ss, coachId: e.target.value } : ss))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }}>
                        <option value="">Assign coach...</option>
                        {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="Coach name..." value={sec.coachName || ""} onChange={(e) => setSections((s) => s.map((ss) => ss.id === sec.id ? { ...ss, coachName: e.target.value } : ss))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }} />
                    )}
                    <input type="text" placeholder="Notes..." value={sec.notes || ""} onChange={(e) => setSections((s) => s.map((ss) => ss.id === sec.id ? { ...ss, notes: e.target.value } : ss))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add section buttons */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["warmup", "Warm-up"], ["stations", "Stations"], ["match", "Match"], ["cooldown", "Cool-down"]].map(([type, label]) => (
              <button key={type} onClick={() => addSection(type)} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, background: P.white, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, cursor: "pointer" }}>
                + {label}
              </button>
            ))}
          </div>

          {/* Coach notes */}
          <div style={{ marginTop: 14 }}>
            <textarea placeholder="Coach notes for this session..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, resize: "vertical", background: P.white }} />
          </div>
        </div>

        {/* Right — Drill Library */}
        <div className="session-drill-library" style={{ width: 260, flexShrink: 0 }}>
          <div style={{ background: P.white, borderRadius: 12, padding: 14, border: `1px solid ${P.line}`, boxShadow: Sh.card, position: "sticky", top: 76 }}>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Drill Library</div>
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11, marginBottom: 6 }} />
            <div className="session-sport-filters" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 8 }}>
              {[
                { id: "football", label: "Football", icon: "/football-icon.png", color: "#1565c0" },
                { id: "hurling", label: selectedTeam?.gender === "girls" ? "Camogie" : "Hurling", icon: "/hurling-icon.png", color: "#c51417" },
                { id: "athletic", label: "Athletic", emoji: "⚡", color: "#7c3aed" },
              ].map((option) => {
                const active = filterSport === option.id;
                return <button key={option.id} onClick={() => setFilterSport(active ? "" : option.id)} style={{ minWidth:0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${active ? option.color : P.line}`, background: active ? `${option.color}12` : P.white, color: active ? option.color : P.muted, fontFamily: F.body, fontSize: 9, fontWeight: 800, cursor: "pointer" }}>{option.icon ? <img src={option.icon} alt="" style={{ width: 15, height: 15, objectFit: "contain" }} /> : <span style={{fontSize:14}}>{option.emoji}</span>}<span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{option.label}</span></button>;
              })}
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${P.line}`, fontFamily: F.body, fontSize: 10, marginBottom: 8 }}>
              <option value="">All ({(allActivities || []).length})</option>
              {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {filtered.slice(0, 30).map((a) => {
                const targetSection = sections.find((s) => s.type === "stations") || sections[sections.length - 1];
                const { sportIcon, catIcon } = getDrillIcons(a);
                return (
                  <div key={a.id} onClick={() => targetSection && addDrillToSection(targetSection.id, a)} style={{ padding: "7px 6px", borderBottom: `1px solid ${P.line}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, transition: "background .12s" }} onMouseEnter={(e) => e.currentTarget.style.background = P.soft} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: sportIcon.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                      <img src={sportIcon.icon} alt="" style={{ width: 18, height: 18, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }} />
                      {catIcon && <img src={catIcon.icon} alt="" style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, objectFit: "contain", background: "#fff", borderRadius: 3, padding: 1 }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                      <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{a.skill?.name || a.category || ""} · {a.duration_mins || "?"}m</div>
                    </div>
                  </div>
                );
              })}
              {filtered.length > 30 && <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, padding: 6, textAlign: "center" }}>Showing 30 of {filtered.length}</div>}
            </div>
          </div>
        </div>
      </div>
      {showTimeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(11,37,69,.45)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowTimeModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: P.white, borderRadius: 18, padding: 22, boxShadow: "0 24px 70px rgba(11,37,69,.25)", border: `1px solid ${P.line}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>⏱</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 900, color: P.ink, marginBottom: 6 }}>Session is {totalTime - 60} minutes over</div>
            <div style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.6, color: P.muted, marginBottom: 18 }}>This plan totals <strong style={{ color: P.ink }}>{totalTime} minutes</strong>. Review the warm-up, section and drill times to bring it closer to the recommended 60-minute session.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Btn label="Review times" variant="ghost" onClick={() => setShowTimeModal(false)} />
              <Btn label="Save anyway" variant="primary" onClick={() => saveSession(true)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function DrillsScreen({ allActivities, diagramMap, favouriteIds, onToggleFavourite, userRole }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null); // index in filtered array
  const [mode, setMode] = useState("library"); // "library" or "builder"
  const [builderDrill, setBuilderDrill] = useState(null); // drill to copy into builder
  const [customDrillsVersion, setCustomDrillsVersion] = useState(0); // trigger re-render when custom drills change

  // Merge custom drills from localStorage into activities
  const customDrills = (() => { void customDrillsVersion; try { return JSON.parse(localStorage.getItem("spraoi_custom_drills") || "[]"); } catch { return []; } })();
  const mergedActivities = [...allActivities, ...customDrills.map((c) => ({
    id: c.id, title: c.title, description: c.description, coaching_points: c.coachingPoints,
    setup: c.setup, equipment: c.equipment, sport: c.sport, category: c.category,
    difficulty: c.difficulty, duration_mins: c.duration, customDiagram: c.customDiagram || null,
    isCustom: true, skill: { name: c.category?.replace(/_/g, " ") || "", category: c.category },
  }))];

  const categories = [...new Set(mergedActivities.map((a) => a.category || a.skill?.category).filter(Boolean))].sort();
  let filtered = [...mergedActivities];
  if (search.trim()) { const q = search.toLowerCase(); filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.skill?.name?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)); }
  if (filterCat) filtered = filtered.filter((a) => a.category === filterCat || a.skill?.category === filterCat);

  // Sort favourites first
  filtered.sort((a, b) => {
    const af = (favouriteIds || []).includes(a.id) ? 0 : 1;
    const bf = (favouriteIds || []).includes(b.id) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.title.localeCompare(b.title);
  });

  const selectedDrill = selectedIdx !== null ? filtered[selectedIdx] : null;

  function goNext() { if (selectedIdx !== null && selectedIdx < filtered.length - 1) setSelectedIdx(selectedIdx + 1); }
  function goPrev() { if (selectedIdx !== null && selectedIdx > 0) setSelectedIdx(selectedIdx - 1); }

  // Keyboard nav
  useEffect(() => {
    function handleKey(e) {
      if (selectedIdx === null) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape") setSelectedIdx(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIdx, filtered.length]);

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Drills Library" sub={`${mergedActivities.length} activities${customDrills.length > 0 ? ` (${customDrills.length} custom)` : ""}`}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setMode("library"); setBuilderDrill(null); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${mode === "library" ? P.p600 : P.line}`, background: mode === "library" ? P.p50 : P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: mode === "library" ? P.p600 : P.muted, cursor: "pointer" }}>Library</button>
          {userRole?.role === "super_admin" && <button onClick={() => setMode("builder")} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${mode === "builder" ? P.p600 : P.line}`, background: mode === "builder" ? P.p50 : P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: mode === "builder" ? P.p600 : P.muted, cursor: "pointer" }}>+ Create Drill</button>}
        </div>
      </TopBar>

      {mode === "builder" ? (
        <DrillCardBuilder diagramMap={diagramMap} allActivities={allActivities} userRole={userRole} copyFrom={builderDrill} onBack={() => { setMode("library"); setBuilderDrill(null); setCustomDrillsVersion((v) => v + 1); }} />
      ) : (
        <div style={{ padding: "20px 28px" }}>
          {/* Search + Filter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input type="text" placeholder="Search drills..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, background: P.white }} />
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, background: P.white }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filtered.slice(0, 60).map((a, idx) => {
              const isFav = (favouriteIds || []).includes(a.id);
              const hasVideo = !!a.skill?.video_url;
              const diffColor = a.difficulty === "advanced" ? P.coral : a.difficulty === "developing" ? P.orange : P.green;
              const { sportIcon, catIcon } = getDrillIcons(a);
              const df = a.customDiagram || diagramMap[a.title];
              return (
                <div key={a.id} onClick={() => setSelectedIdx(idx)} style={{ background: P.white, borderRadius: 14, border: `1.5px solid ${isFav ? "#fbc02d55" : P.line}`, overflow: "hidden", cursor: "pointer", boxShadow: Sh.card, position: "relative", transition: "transform .15s, box-shadow .15s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
                  {/* Badges — sport + category + difficulty */}
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, zIndex: 1, flexWrap: "wrap" }}>
                    {a.isCustom && <span style={{ background: P.p600, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>Custom</span>}
                    <span style={{ background: sportIcon.color, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 3 }}>
                      <img src={sportIcon.icon} alt="" style={{ width: 10, height: 10, objectFit: "contain" }} />{a.sport}
                    </span>
                    {catIcon && <span style={{ background: catIcon.color, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 3 }}>
                      <img src={catIcon.icon} alt="" style={{ width: 10, height: 10, objectFit: "contain" }} />{catIcon.label.split(" ")[0]}
                    </span>}
                    <span style={{ background: diffColor, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff" }}>{a.difficulty || "foundation"}</span>
                  </div>
                  {isFav && <div style={{ position: "absolute", top: 8, right: 8, background: "#fbc02d", borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", zIndex: 1 }}>★</div>}
                  {hasVideo && <div style={{ position: "absolute", top: 8, right: isFav ? 32 : 8, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", zIndex: 1 }}>▶</div>}
                  {/* Image: diagram if available, otherwise sport icon gradient */}
                  {df ? (
                    <img src={df.startsWith("data:") ? df : `/diagrams/${df}`} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: 130, background: sportIcon.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      <img src={sportIcon.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))", marginBottom: 4 }} />
                      {catIcon && <img src={catIcon.icon} alt="" style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, objectFit: "contain", opacity: 0.7 }} />}
                      <div style={{ position: "absolute", top: -20, right: -20, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                    </div>
                  )}
                  {/* Info */}
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink, lineHeight: 1.2, marginBottom: 4 }}>{a.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{a.skill?.name || a.category || ""}</span>
                      <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>·</span>
                      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.ink }}>{a.duration_mins || "?"}min</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > 60 && <div style={{ textAlign: "center", padding: 16, fontFamily: F.body, fontSize: 12, color: P.muted }}>Showing 60 of {filtered.length} — refine your search</div>}
        </div>
      )}

      {/* Drill detail modal with arrow nav + favourite */}
      {selectedDrill && (
        <div onClick={() => setSelectedIdx(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: P.white, borderRadius: 16, maxWidth: 500, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: Sh.lift }}>
            {/* Header with nav arrows + favourite */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${P.line}`, position: "sticky", top: 0, background: P.white, borderRadius: "16px 16px 0 0", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={goPrev} disabled={selectedIdx === 0} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.line}`, background: P.white, cursor: selectedIdx > 0 ? "pointer" : "not-allowed", fontSize: 14, opacity: selectedIdx > 0 ? 1 : 0.3 }}>◀</button>
                <span style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{selectedIdx + 1} / {filtered.length}</span>
                <button onClick={goNext} disabled={selectedIdx >= filtered.length - 1} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.line}`, background: P.white, cursor: selectedIdx < filtered.length - 1 ? "pointer" : "not-allowed", fontSize: 14, opacity: selectedIdx < filtered.length - 1 ? 1 : 0.3 }}>▶</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => onToggleFavourite && onToggleFavourite(selectedDrill.id)} style={{ padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${(favouriteIds || []).includes(selectedDrill.id) ? "#fbc02d" : P.line}`, background: (favouriteIds || []).includes(selectedDrill.id) ? "#fbc02d15" : P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: (favouriteIds || []).includes(selectedDrill.id) ? "#f59e0b" : P.muted, cursor: "pointer" }}>
                  {(favouriteIds || []).includes(selectedDrill.id) ? "★ Favourited" : "☆ Favourite"}
                </button>
                {userRole?.role === "super_admin" && <button onClick={() => { if (!window.confirm(`Copy & edit "${selectedDrill.title}"?\n\nThis will create an editable copy in your custom cards.`)) return; setBuilderDrill(selectedDrill); setMode("builder"); setSelectedIdx(null); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${P.p600}`, background: P.p50, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, cursor: "pointer" }}>Copy & Edit</button>}
                <button onClick={() => setSelectedIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: P.muted }}>×</button>
              </div>
            </div>
            {/* Content */}
            <div style={{ padding: 18 }}>
              {/* Diagram + category icons header */}
              {(() => {
                const { sportIcon, catIcon } = getDrillIcons(selectedDrill); const df = selectedDrill.customDiagram || diagramMap[selectedDrill.title]; return df ? (
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <img src={df.startsWith("data:") ? df : `/diagrams/${df}`} alt="" style={{ width: "100%", borderRadius: 12 }} />
                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                      <span style={{ background: sportIcon.color, borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                        <img src={sportIcon.icon} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                        <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{selectedDrill.sport}</span>
                      </span>
                      {catIcon && <span style={{ background: catIcon.color, borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                        <img src={catIcon.icon} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                        <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{catIcon.label.split(" ")[0]}</span>
                      </span>}
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 120, background: sportIcon.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", marginBottom: 14 }}>
                    <img src={sportIcon.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }} />
                    {catIcon && <img src={catIcon.icon} alt="" style={{ position: "absolute", bottom: 10, right: 12, width: 28, height: 28, objectFit: "contain", opacity: 0.7 }} />}
                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                      <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 6, padding: "3px 8px", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{selectedDrill.sport}</span>
                      {catIcon && <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 6, padding: "3px 8px", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{catIcon.label.split(" ")[0]}</span>}
                    </div>
                    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                  </div>
                );
              })()}
              {selectedDrill.equipment && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginBottom: 10, padding: "6px 10px", background: P.soft, borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 700, color: P.ink }}>Equipment:</span> {selectedDrill.equipment}</div>}
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: P.ink, marginBottom: 4 }}>{selectedDrill.title}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginBottom: 12 }}>{selectedDrill.skill?.name || ""} · {selectedDrill.sport} · {selectedDrill.duration_mins || "?"}min · {selectedDrill.difficulty}</div>
              {selectedDrill.description && <div style={{ fontFamily: F.body, fontSize: 13, color: P.ink, lineHeight: 1.5, marginBottom: 14 }}>{selectedDrill.description}</div>}
              {selectedDrill.coaching_points && <div style={{ marginBottom: 14 }}><div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 6 }}>Coaching Points</div><div style={{ fontFamily: F.body, fontSize: 12, color: P.ink, lineHeight: 1.6, background: P.soft, borderRadius: 10, padding: 14 }}>{selectedDrill.coaching_points.split("•").filter(Boolean).map((pt, i) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ color: P.p600, fontWeight: 700 }}>•</span><span>{pt.trim()}</span></div>)}</div></div>}
              {selectedDrill.setup && <div style={{ marginBottom: 14 }}><div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 4 }}>Setup</div><div style={{ fontFamily: F.body, fontSize: 12, color: P.ink, lineHeight: 1.5 }}>{selectedDrill.setup}</div></div>}
              {selectedDrill.skill?.video_url && (
                <a href={selectedDrill.skill.video_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#ff000012", border: "1.5px solid #ff000022", textDecoration: "none", fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "#cc0000" }}>
                  ▶ Watch Skill Video — {selectedDrill.skill?.name}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   DIAGRAM CREATOR — drag-and-drop pitch diagram builder
   ============================================================ */
function DiagramCreator({ onSave, onClose, initialElements, backgroundImage }) {
  const [elements, setElements] = useState(initialElements || []);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedEl, setSelectedEl] = useState(null);
  const [arrowStart, setArrowStart] = useState(null);
  const [tool, setTool] = useState("select"); // select, player, cone, ball, hurdle, arrow, text
  const [playerColor, setPlayerColor] = useState("#073B74");
  const [nextLabel, setNextLabel] = useState("A");
  const svgRef = useRef(null);

  const W = 440, H = 320;

  function getSvgPoint(e) {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }

  function handleCanvasClick(e) {
    if (dragRef.current) { dragRef.current = false; return; } // skip click after drag
    const pt = getSvgPoint(e);
    if (tool === "player") {
      setElements((els) => [...els, { id: Date.now(), type: "player", x: pt.x, y: pt.y, color: playerColor, label: nextLabel }]);
      setNextLabel(String.fromCharCode(nextLabel.charCodeAt(0) + 1 > 90 ? 65 : nextLabel.charCodeAt(0) + 1));
    } else if (tool === "cone") {
      setElements((els) => [...els, { id: Date.now(), type: "cone", x: pt.x, y: pt.y }]);
    } else if (tool === "ball") {
      setElements((els) => [...els, { id: Date.now(), type: "ball", x: pt.x, y: pt.y }]);
    } else if (tool === "hurdle") {
      setElements((els) => [...els, { id: Date.now(), type: "hurdle", x: pt.x, y: pt.y }]);
    } else if (tool === "text") {
      const text = prompt("Label text:");
      if (text) setElements((els) => [...els, { id: Date.now(), type: "text", x: pt.x, y: pt.y, text }]);
    } else if (tool === "arrow") {
      if (!arrowStart) { setArrowStart(pt); }
      else { setElements((els) => [...els, { id: Date.now(), type: "arrow", x1: arrowStart.x, y1: arrowStart.y, x2: pt.x, y2: pt.y }]); setArrowStart(null); }
    } else if (tool === "select") {
      // Hit test — find element under click
      const hit = findElementAt(pt);
      setSelectedEl(hit ? hit.id : null);
    }
  }

  function findElementAt(pt) {
    // Search in reverse (top-most first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "arrow") {
        // Check distance to line segment
        const dx = el.x2 - el.x1, dy = el.y2 - el.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        const t = Math.max(0, Math.min(1, ((pt.x - el.x1) * dx + (pt.y - el.y1) * dy) / (len * len)));
        const px = el.x1 + t * dx, py = el.y1 + t * dy;
        const dist = Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);
        if (dist < 10) return el;
      } else {
        const dist = Math.sqrt((pt.x - el.x) ** 2 + (pt.y - el.y) ** 2);
        const hitRadius = el.type === "player" ? 16 : el.type === "text" ? 20 : 12;
        if (dist < hitRadius) return el;
      }
    }
    return null;
  }

  const dragRef = useRef(false);

  function handlePointerDown(e) {
    if (tool !== "select") return;
    const pt = getSvgPoint(e);
    const hit = findElementAt(pt);
    if (hit) {
      e.preventDefault();
      setSelectedEl(hit.id);
      setDragging(hit.id);
      dragRef.current = false;
      setDragOffset({ x: pt.x - (hit.x || hit.x1 || 0), y: pt.y - (hit.y || hit.y1 || 0) });
      svgRef.current.setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    dragRef.current = true;
    const pt = getSvgPoint(e);
    const nx = pt.x - dragOffset.x;
    const ny = pt.y - dragOffset.y;
    setElements((els) => els.map((el) => {
      if (el.id !== dragging) return el;
      if (el.type === "arrow") {
        const dx = nx - el.x1;
        const dy = ny - el.y1;
        return { ...el, x1: nx, y1: ny, x2: el.x2 + dx, y2: el.y2 + dy };
      }
      return { ...el, x: nx, y: ny };
    }));
  }

  function handlePointerUp(e) {
    if (dragging) {
      try { svgRef.current.releasePointerCapture(e.pointerId); } catch { }
    }
    setDragging(null);
  }

  function deleteSelected() {
    if (selectedEl) { setElements((els) => els.filter((el) => el.id !== selectedEl)); setSelectedEl(null); }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
      if (e.key === "Escape") { setSelectedEl(null); setArrowStart(null); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedEl]);

  function clearAll() { if (confirm("Clear all elements?")) { setElements([]); setSelectedEl(null); } }

  function saveDiagram() {
    const svg = svgRef.current;
    const clone = svg.cloneNode(true);
    // Remove selection indicators
    clone.querySelectorAll("[data-selection]").forEach((el) => el.remove());
    const svgData = new XMLSerializer().serializeToString(clone);
    const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    onSave(dataUrl, elements);
  }

  const tools = [
    { id: "select", label: "Select", icon: "↖" },
    { id: "player", label: "Player", icon: "●" },
    { id: "cone", label: "Cone", icon: "▲" },
    { id: "ball", label: "Ball", icon: "◉" },
    { id: "hurdle", label: "Hurdle", icon: "═" },
    { id: "arrow", label: "Arrow", icon: "→" },
    { id: "text", label: "Text", icon: "T" },
  ];
  const playerColors = [
    { color: "#073B74", label: "Navy" },
    { color: "#8e24aa", label: "Purple" },
    { color: "#c51417", label: "Red" },
    { color: "#43a047", label: "Green" },
    { color: "#f57f17", label: "Gold" },
    { color: "#fff", label: "White" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: P.white, borderRadius: 16, width: "100%", maxWidth: 640, boxShadow: Sh.lift, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${P.line}` }}>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Create Diagram</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveDiagram} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: P.p600, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Save Diagram</button>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: P.muted }}>×</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderBottom: `1px solid ${P.line}`, flexWrap: "wrap" }}>
          {tools.map((t) => (
            <button key={t.id} onClick={() => { setTool(t.id); setArrowStart(null); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${tool === t.id ? P.p600 : P.line}`, background: tool === t.id ? P.p50 : P.white, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: tool === t.id ? P.p600 : P.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: P.line, margin: "0 4px" }} />
          {tool === "player" && playerColors.map((pc) => (
            <button key={pc.color} onClick={() => setPlayerColor(pc.color)} style={{ width: 20, height: 20, borderRadius: "50%", background: pc.color, border: playerColor === pc.color ? `2.5px solid ${P.p600}` : `2px solid ${P.line}`, cursor: "pointer" }} title={pc.label} />
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {selectedEl && <button onClick={deleteSelected} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${P.coral}`, background: "#fff", fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.coral, cursor: "pointer" }}>Delete</button>}
            <button onClick={clearAll} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${P.line}`, background: P.white, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, cursor: "pointer" }}>Clear</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ padding: "12px 14px" }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", borderRadius: 10, cursor: tool === "select" ? (dragging ? "grabbing" : "default") : "crosshair", display: "block", border: `1.5px solid ${P.line}`, userSelect: "none", touchAction: "none" }}
            onClick={handleCanvasClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            {/* Pitch background */}
            <defs>
              <linearGradient id="pitchBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5cb85c" /><stop offset="50%" stopColor="#4a9835" /><stop offset="100%" stopColor="#3d8030" /></linearGradient>
            </defs>
            <rect width={W} height={H} fill="url(#pitchBg)" rx="14" />
            <rect x="14" y="14" width={W - 28} height={H - 28} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" rx="8" />
            <line x1={W / 2} y1="14" x2={W / 2} y2={H - 14} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="8,6" />
            <circle cx={W / 2} cy={H / 2} r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <circle cx={W / 2} cy={H / 2} r="3" fill="rgba(255,255,255,0.4)" />

            {/* Background image from previous diagram (if no elements to restore) */}
            {backgroundImage && elements.length === 0 && (
              <image href={backgroundImage} x="0" y="0" width={W} height={H} opacity="0.5" style={{ pointerEvents: "none" }} />
            )}

            {/* Elements */}
            {elements.map((el) => {
              const isSelected = selectedEl === el.id;
              if (el.type === "player") return (
                <g key={el.id} style={{ cursor: "move" }}>
                  {isSelected && <circle cx={el.x} cy={el.y} r="18" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3,3" data-selection="true" />}
                  <circle cx={el.x} cy={el.y} r="14" fill={el.color} stroke="#fff" strokeWidth="2.5" />
                  <text x={el.x} y={el.y + 4} textAnchor="middle" fill={el.color === "#fff" ? "#333" : "#fff"} fontSize="10" fontWeight="800" fontFamily="sans-serif">{el.label}</text>
                </g>
              );
              if (el.type === "cone") return (
                <g key={el.id} style={{ cursor: "move" }}>
                  {isSelected && <circle cx={el.x} cy={el.y} r="12" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3,3" data-selection="true" />}
                  <polygon points={`${el.x},${el.y - 10} ${el.x - 7},${el.y + 5} ${el.x + 7},${el.y + 5}`} fill="#FF7A00" stroke="#fff" strokeWidth="1.5" />
                </g>
              );
              if (el.type === "ball") return (
                <g key={el.id} style={{ cursor: "move" }}>
                  {isSelected && <circle cx={el.x} cy={el.y} r="12" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3,3" data-selection="true" />}
                  <circle cx={el.x} cy={el.y} r="7" fill="#FFB400" stroke="#fff" strokeWidth="2" />
                </g>
              );
              if (el.type === "hurdle") return (
                <g key={el.id} style={{ cursor: "move" }}>
                  {isSelected && <rect x={el.x - 16} y={el.y - 6} width="32" height="12" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3,3" rx="3" data-selection="true" />}
                  <rect x={el.x - 12} y={el.y - 3} width="24" height="6" fill="#e64a19" stroke="#fff" strokeWidth="1.5" rx="2" />
                  <line x1={el.x - 10} y1={el.y + 3} x2={el.x - 10} y2={el.y + 8} stroke="#fff" strokeWidth="1.5" />
                  <line x1={el.x + 10} y1={el.y + 3} x2={el.x + 10} y2={el.y + 8} stroke="#fff" strokeWidth="1.5" />
                </g>
              );
              if (el.type === "arrow") {
                const dx = el.x2 - el.x1, dy = el.y2 - el.y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len, uy = dy / len;
                const ax = el.x2 - ux * 8, ay = el.y2 - uy * 8;
                const px = -uy * 5, py = ux * 5;
                return (
                  <g key={el.id} style={{ cursor: "move" }}>
                    {isSelected && <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="#fff" strokeWidth="6" strokeDasharray="3,3" data-selection="true" />}
                    <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeDasharray="6,4" />
                    <polygon points={`${el.x2},${el.y2} ${ax + px},${ay + py} ${ax - px},${ay - py}`} fill="rgba(255,255,255,0.8)" />
                  </g>
                );
              }
              if (el.type === "text") return (
                <g key={el.id} style={{ cursor: "move" }}>
                  {isSelected && <rect x={el.x - 2} y={el.y - 12} width={el.text.length * 7 + 4} height="16" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3,3" rx="2" data-selection="true" />}
                  <text x={el.x} y={el.y} fill="#fff" fontSize="12" fontWeight="700" fontFamily="sans-serif">{el.text}</text>
                </g>
              );
              return null;
            })}

            {/* Arrow preview while drawing */}
            {tool === "arrow" && arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="4" fill="rgba(255,255,255,0.6)" />
            )}

            {/* Watermark */}
            <text x={W - 16} y={H - 10} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700" fontFamily="sans-serif">SPRAOI SPORTS</text>
          </svg>
          <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 8, textAlign: "center" }}>
            {backgroundImage && elements.length === 0 && <div style={{ color: P.orange, marginBottom: 4 }}>Previous diagram shown as reference (faded). Place new elements on top.</div>}
            {tool === "arrow" && arrowStart ? "Click to set arrow end point" : tool === "select" ? "Click elements to select, drag to move" : `Click on pitch to place ${tool}`}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   DRILL CARD BUILDER — Create custom drill cards from scratch
   ============================================================ */
function DrillCardBuilder({ diagramMap, allActivities, userRole, copyFrom, onBack }) {
  const [title, setTitle] = useState(copyFrom?.title ? copyFrom.title + " (Copy)" : "");
  const [description, setDescription] = useState(copyFrom?.description || "");
  const [coachingPoints, setCoachingPoints] = useState(copyFrom?.coaching_points || copyFrom?.coachingPoints || "");
  const [setup, setSetup] = useState(copyFrom?.setup || "");
  const [equipment, setEquipment] = useState(copyFrom?.equipment || "");
  const [sport, setSport] = useState(copyFrom?.sport || "football");
  const [category, setCategory] = useState(copyFrom?.category || "");
  const [difficulty, setDifficulty] = useState(copyFrom?.difficulty || "foundation");
  const [duration, setDuration] = useState(String(copyFrom?.duration_mins || copyFrom?.duration || "10"));
  const [selectedDiagram, setSelectedDiagram] = useState(() => {
    if (copyFrom && diagramMap[copyFrom.title]) return diagramMap[copyFrom.title];
    return copyFrom?.diagram || "";
  });
  const [diagramSearch, setDiagramSearch] = useState("");
  const [showDiagramPicker, setShowDiagramPicker] = useState(false);
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [customDiagram, setCustomDiagram] = useState(""); // data URL from creator
  const [diagramElements, setDiagramElements] = useState([]); // elements for re-edit
  const [savedCards, setSavedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem("spraoi_custom_drills") || "[]"); } catch { return []; }
  });
  const [editingIdx, setEditingIdx] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const cardRef = useRef(null);

  const isSuperAdmin = userRole?.role === "super_admin";
  const categories = ["agility", "speed", "warm_up", "cool_down", "passing", "shooting", "tackling", "catching", "striking", "lifting", "blocking", "hooking", "soloing", "handpass", "kickpass", "free_taking", "goalkeeping", "game", "other"];

  // Diagram list for picker
  const diagramEntries = Object.entries(diagramMap || {});
  const filteredDiagrams = diagramSearch.trim()
    ? diagramEntries.filter(([name]) => name.toLowerCase().includes(diagramSearch.toLowerCase()))
    : diagramEntries.slice(0, 40);

  function saveCard() {
    if (!title.trim()) { showToast("Add a title first"); return; }
    if (title.trim().endsWith("(Copy)")) { showToast("Rename the card — remove '(Copy)' and give it a unique name"); return; }
    if (!description.trim()) { showToast("Add a description"); return; }
    if (!coachingPoints.trim()) { showToast("Add at least one coaching point"); return; }
    // Duplicate title check (skip if editing the same card)
    const isDuplicate = savedCards.some((c, i) => c.title.toLowerCase() === title.trim().toLowerCase() && i !== editingIdx);
    if (isDuplicate) { showToast("A card with this title already exists"); return; }
    const card = { id: editingIdx !== null ? savedCards[editingIdx].id : Date.now().toString(), title: title.trim(), description, coachingPoints, setup, equipment, sport, category, difficulty, duration: parseInt(duration) || 10, diagram: selectedDiagram, customDiagram: customDiagram || null, diagramElements: diagramElements.length > 0 ? diagramElements : null, createdAt: editingIdx !== null ? savedCards[editingIdx].createdAt : new Date().toISOString() };
    let updated;
    if (editingIdx !== null) { updated = [...savedCards]; updated[editingIdx] = card; } else { updated = [...savedCards, card]; }
    setSavedCards(updated);
    try { localStorage.setItem("spraoi_custom_drills", JSON.stringify(updated)); }
    catch (e) { showToast("Warning: storage full — diagram image may not persist"); }
    showToast(editingIdx !== null ? "Card updated!" : "Card saved!");
    setEditingIdx(null);
    // Don't reset form — stay on it so they can see the result, just clear editing state
  }

  function showToast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); }

  function resetForm() {
    setTitle(""); setDescription(""); setCoachingPoints(""); setSetup("");
    setEquipment(""); setSport("football"); setCategory(""); setDifficulty("foundation");
    setDuration("10"); setSelectedDiagram(""); setEditingIdx(null); setCustomDiagram("");
    setDiagramElements([]);
  }

  function editCard(idx) {
    const c = savedCards[idx];
    if (!c) return;
    const proceed = window.confirm(`Edit "${c.title}"?\n\nThis card may be in use in coaching plans. Changes will apply everywhere it appears.`);
    if (!proceed) return;
    setTitle(c.title || ""); setDescription(c.description || ""); setCoachingPoints(c.coachingPoints || "");
    setSetup(c.setup || ""); setEquipment(c.equipment || ""); setSport(c.sport || "football");
    setCategory(c.category || ""); setDifficulty(c.difficulty || "foundation");
    setDuration(String(c.duration || 10)); setSelectedDiagram(c.diagram || "");
    setCustomDiagram(c.customDiagram || ""); setDiagramElements(c.diagramElements || []);
    setEditingIdx(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteCard(idx) {
    if (!isSuperAdmin) { alert("Only admins can delete drill cards"); return; }
    if (!confirm("Delete this card?")) return;
    const updated = savedCards.filter((_, i) => i !== idx);
    setSavedCards(updated);
    localStorage.setItem("spraoi_custom_drills", JSON.stringify(updated));
  }

  function copyFromExisting(activity) {
    setTitle((activity.title || "") + " (Copy)"); setDescription(activity.description || "");
    setCoachingPoints(activity.coaching_points || ""); setSetup(activity.setup || "");
    setEquipment(activity.equipment || ""); setSport(activity.sport || "football");
    setCategory(activity.category || ""); setDifficulty(activity.difficulty || "foundation");
    setDuration(String(activity.duration_mins || 10));
    if (diagramMap[activity.title]) setSelectedDiagram(diagramMap[activity.title]);
  }

  const { sportIcon, catIcon } = getDrillIcons({ sport, category, title });

  return (
    <div style={{ padding: "16px 24px" }}>
      {/* Back button */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${P.line}`, background: P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, cursor: "pointer" }}>← Back to Library</button>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT — Form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Quick copy from existing */}
          <div style={{ background: P.white, borderRadius: 12, padding: 14, border: `1px solid ${P.line}`, marginBottom: 14 }}>
            <div style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Copy from existing drill</div>
            <select onChange={(e) => { const a = (allActivities || []).find((x) => x.id === e.target.value); if (a) copyFromExisting(a); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }}>
              <option value="">Select a drill to copy...</option>
              {(allActivities || []).map((a) => <option key={a.id} value={a.id}>{a.title} ({a.sport})</option>)}
            </select>
          </div>

          {/* Main form */}
          <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginBottom: 14 }}>{editingIdx !== null ? "Edit Card" : "New Drill Card"}</div>

            {/* Title */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cone Slalom Sprint" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginBottom: 12 }} />

            {/* Sport + Category + Difficulty row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Sport</label>
                <select value={sport} onChange={(e) => setSport(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }}>
                  <option value="football">Football</option>
                  <option value="hurling">Hurling</option>
                  <option value="camogie">Camogie</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }}>
                  <option value="">General</option>
                  {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 11 }}>
                  <option value="foundation">Foundation</option>
                  <option value="developing">Developing</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Duration (minutes)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="10" style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, marginBottom: 12 }} />

            {/* Description */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the drill..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, resize: "vertical", marginBottom: 12 }} />

            {/* Coaching Points */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Coaching Points</label>
            <textarea value={coachingPoints} onChange={(e) => setCoachingPoints(e.target.value)} placeholder="Key points, use bullet • for separation..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, resize: "vertical", marginBottom: 12 }} />

            {/* Setup */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Setup</label>
            <textarea value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="How to set up the drill..." rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, resize: "vertical", marginBottom: 12 }} />

            {/* Equipment */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Equipment</label>
            <input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. Cones, bibs, sliotars" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, marginBottom: 12 }} />

            {/* Diagram picker */}
            <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Diagram</label>
            {/* Show current diagram if exists */}
            {(customDiagram || selectedDiagram) && (
              <div style={{ marginBottom: 10, position: "relative", cursor: "pointer", borderRadius: 10, overflow: "hidden", border: `1.5px solid ${P.line}` }} onClick={() => setShowDiagramCreator(true)}>
                <img src={customDiagram || `/diagrams/${selectedDiagram}`} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "1"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}><span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "#fff" }}>Click to edit diagram</span></div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowDiagramCreator(true)} style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${P.p600}`, background: P.p50, fontFamily: F.body, fontSize: 11, fontWeight: 700, cursor: "pointer", color: P.p600 }}>
                {(customDiagram || diagramElements.length > 0) ? "Edit Diagram" : "+ Create Diagram"}
              </button>
              <button onClick={() => setShowDiagramPicker(!showDiagramPicker)} style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${P.line}`, background: P.white, fontFamily: F.body, fontSize: 11, fontWeight: 600, cursor: "pointer", color: P.ink }}>
                {selectedDiagram ? "Change from Library" : "Pick from Library"}
              </button>
              {(selectedDiagram || customDiagram) && (
                <button onClick={() => { setSelectedDiagram(""); setCustomDiagram(""); setDiagramElements([]); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${P.coral}`, background: "#fff", fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.coral, cursor: "pointer" }}>Remove</button>
              )}
            </div>
            {showDiagramPicker && (
              <div style={{ background: P.soft, borderRadius: 10, padding: 12, border: `1px solid ${P.line}`, marginBottom: 12, maxHeight: 280, overflowY: "auto" }}>
                <input type="text" value={diagramSearch} onChange={(e) => setDiagramSearch(e.target.value)} placeholder="Search diagrams..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${P.line}`, fontFamily: F.body, fontSize: 11, marginBottom: 8 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {filteredDiagrams.map(([name, file]) => (
                    <div key={file} onClick={() => { setSelectedDiagram(file); setShowDiagramPicker(false); }} style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", border: selectedDiagram === file ? `2px solid ${P.p600}` : `1px solid ${P.line}`, background: P.white, transition: "border .12s" }}>
                      <img src={`/diagrams/${file}`} alt={name} style={{ width: "100%", height: 50, objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "3px 4px", fontFamily: F.body, fontSize: 8, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                    </div>
                  ))}
                </div>
                {filteredDiagrams.length === 0 && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, textAlign: "center", padding: 12 }}>No diagrams found</div>}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Btn label={editingIdx !== null ? "Update Card" : "Save Card"} variant="primary" onClick={saveCard} />
              {editingIdx !== null && <Btn label="Cancel" variant="ghost" onClick={resetForm} />}
              <Btn label="New Card" variant="ghost" onClick={resetForm} />
            </div>

            {/* Guidelines */}
            <div style={{ marginTop: 14, padding: "10px 12px", background: P.cream, borderRadius: 8, border: "1px solid #f0e6d6" }}>
              <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.orange, textTransform: "uppercase", marginBottom: 4 }}>Card Guidelines</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.ink, lineHeight: 1.6 }}>
                • Every card needs: title, sport, difficulty, duration, description, coaching points<br />
                • Coaching points should be actionable and age-appropriate<br />
                • Use clear, simple language suitable for all coaches<br />
                • Pick a diagram that closely matches your drill setup<br />
                • Keep descriptions concise (2-3 sentences max)
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview + Saved Cards */}
        <div style={{ width: 320, flexShrink: 0 }}>
          {/* Live Preview */}
          <div style={{ position: "sticky", top: 76 }}>
            <div style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Live Preview</div>
            <div ref={cardRef} style={{ background: P.white, borderRadius: 14, border: `1.5px solid ${P.line}`, overflow: "hidden", boxShadow: Sh.card }}>
              {/* Card header — diagram or icon gradient */}
              {(selectedDiagram || customDiagram) ? (
                <div style={{ position: "relative", cursor: customDiagram ? "pointer" : "default" }} onClick={() => { if (customDiagram) setShowDiagramCreator(true); }}>
                  <img src={customDiagram || `/diagrams/${selectedDiagram}`} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  {customDiagram && <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "4px 8px", fontFamily: F.body, fontSize: 9, fontWeight: 700, color: "#fff" }}>Click to edit</div>}
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                    <span style={{ background: sportIcon.color, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 3 }}>
                      <img src={sportIcon.icon} alt="" style={{ width: 10, height: 10, objectFit: "contain" }} />{sport}
                    </span>
                    {catIcon && <span style={{ background: catIcon.color, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 3 }}>
                      <img src={catIcon.icon} alt="" style={{ width: 10, height: 10, objectFit: "contain" }} />{catIcon.label.split(" ")[0]}
                    </span>}
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <span style={{ background: difficulty === "advanced" ? P.coral : difficulty === "developing" ? P.orange : P.green, borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff" }}>{difficulty}</span>
                  </div>
                </div>
              ) : (
                <div style={{ width: "100%", height: 130, background: sportIcon.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <img src={sportIcon.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))", marginBottom: 4 }} />
                  {catIcon && <img src={catIcon.icon} alt="" style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, objectFit: "contain", opacity: 0.7 }} />}
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                    <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{sport}</span>
                    {catIcon && <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{catIcon.label.split(" ")[0]}</span>}
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <span style={{ background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "2px 6px", fontFamily: F.body, fontSize: 8, fontWeight: 700, color: "#fff" }}>{difficulty}</span>
                  </div>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                </div>
              )}
              {/* Card content */}
              <div style={{ padding: "12px 14px" }}>
                {equipment && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginBottom: 8, padding: "5px 8px", background: P.soft, borderRadius: 5, display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, color: P.ink }}>Equipment:</span> {equipment}</div>}
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 900, color: title ? P.ink : P.muted, lineHeight: 1.2, marginBottom: 4 }}>{title || "Drill Title"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{category ? category.replace(/_/g, " ") : "category"}</span>
                  <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>·</span>
                  <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.ink }}>{duration || "?"}min</span>
                </div>
                {description && <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5, marginBottom: 8 }}>{description}</div>}
                {coachingPoints && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 4 }}>Coaching Points</div>
                    <div style={{ fontFamily: F.body, fontSize: 10, color: P.ink, lineHeight: 1.5, background: P.soft, borderRadius: 6, padding: 8 }}>
                      {coachingPoints.split("•").filter(Boolean).map((pt, i) => <div key={i} style={{ display: "flex", gap: 4, marginBottom: 2 }}><span style={{ color: P.p600, fontWeight: 700 }}>•</span><span>{pt.trim()}</span></div>)}
                    </div>
                  </div>
                )}
                {setup && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 4 }}>Setup</div>
                    <div style={{ fontFamily: F.body, fontSize: 10, color: P.ink, lineHeight: 1.5 }}>{setup}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Saved cards list */}
            {savedCards.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Your Cards ({savedCards.length})</div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {savedCards.map((c, idx) => {
                    const ci = getDrillIcons(c);
                    return (
                      <div key={c.id || idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: P.white, borderRadius: 8, border: `1px solid ${P.line}`, marginBottom: 6, cursor: "pointer" }} onClick={() => editCard(idx)}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: ci.sportIcon.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <img src={ci.sportIcon.icon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                          <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{c.sport} · {c.duration}min</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteCard(idx); }} style={{ background: "none", border: "none", color: P.coral, cursor: isSuperAdmin ? "pointer" : "not-allowed", fontSize: 14, padding: "2px 4px", opacity: isSuperAdmin ? 1 : 0.3 }} title={isSuperAdmin ? "Delete" : "Admin only"}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 99999, background: P.ink, color: "#fff", padding: "12px 24px", borderRadius: 10, fontFamily: F.body, fontSize: 13, fontWeight: 700, boxShadow: Sh.lift }}>
          {toastMsg}
        </div>
      )}

      {/* Diagram Creator Modal */}
      {showDiagramCreator && (
        <DiagramCreator
          key={diagramElements.length + "-" + (diagramElements[0]?.id || "new")}
          initialElements={diagramElements}
          backgroundImage={diagramElements.length === 0 ? (customDiagram || (selectedDiagram ? `/diagrams/${selectedDiagram}` : "")) : ""}
          onSave={(dataUrl, els) => {
            setCustomDiagram(dataUrl); setDiagramElements(els); setSelectedDiagram(""); setShowDiagramCreator(false);
            // Auto-populate equipment from diagram elements
            const counts = {};
            els.forEach((el) => { if (el.type === "cone") counts.cones = (counts.cones || 0) + 1; if (el.type === "ball") counts.balls = (counts.balls || 0) + 1; if (el.type === "hurdle") counts.hurdles = (counts.hurdles || 0) + 1; });
            const parts = [];
            if (counts.cones) parts.push(`${counts.cones} cone${counts.cones > 1 ? "s" : ""}`);
            if (counts.hurdles) parts.push(`${counts.hurdles} hurdle${counts.hurdles > 1 ? "s" : ""}`);
            if (counts.balls) parts.push(`${counts.balls} ball${counts.balls > 1 ? "s" : ""}`);
            if (parts.length > 0) setEquipment(parts.join(", "));
          }}
          onClose={() => setShowDiagramCreator(false)}
        />
      )}
    </div>
  );
}


function PlayersScreen({ club, ageGroups, selectedTeam }) {
  const [players, setPlayers] = useState([]);
  const [csvPreview, setCsvPreview] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (club && !loaded) {
      supabase.from("journey_players").select("*, age_group:age_groups(label, gender)").eq("club_id", club.id).order("name").then(({ data }) => { setPlayers(data || []); setLoaded(true); });
    }
  }, [club]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").map((l) => l.trim()).filter(Boolean);
      const hasHeader = lines[0].toLowerCase().includes("name");
      const data = (hasHeader ? lines.slice(1) : lines).map((line) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        return { name: parts[0] || "", ageGroup: parts[1] || "", email: parts[2] || "" };
      }).filter((p) => p.name);
      setCsvPreview(data);
    };
    reader.readAsText(file);
  }

  async function importPlayers() {
    if (!csvPreview || !club) return;
    const agMap = Object.fromEntries(ageGroups.map((ag) => [ag.label.toLowerCase(), ag.id]));
    const rows = csvPreview.map((p) => ({
      parent_user_id: "00000000-0000-0000-0000-000000000000",
      club_id: club.id,
      age_group_id: agMap[p.ageGroup.toLowerCase()] || (selectedTeam?.id || null),
      name: p.name,
    }));
    await supabase.from("journey_players").insert(rows);
    setCsvPreview(null);
    setLoaded(false);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Players" sub={`${players.length} in squad`} />
      <div style={{ padding: "20px 28px" }}>
        {/* Upload */}
        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1.5px dashed ${P.p600}44`, marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink }}>Import Players</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>Upload CSV/Excel: Name, Age Group, Parent Email</div>
          </div>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ fontFamily: F.body, fontSize: 11 }} />
        </div>

        {/* CSV Preview */}
        {csvPreview && (
          <div style={{ background: P.white, borderRadius: 12, padding: 16, border: `1px solid ${P.line}`, marginBottom: 16 }}>
            <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Preview ({csvPreview.length} players)</div>
            {csvPreview.slice(0, 8).map((p, i) => <div key={i} style={{ fontFamily: F.body, fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${P.line}` }}>{p.name} {p.ageGroup && `(${p.ageGroup})`}</div>)}
            {csvPreview.length > 8 && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>...and {csvPreview.length - 8} more</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn label="Cancel" variant="ghost" onClick={() => setCsvPreview(null)} />
              <Btn label={`Import ${csvPreview.length}`} variant="primary" onClick={importPlayers} />
            </div>
          </div>
        )}

        {/* Player list */}
        <div style={{ background: P.white, borderRadius: 14, border: `1px solid ${P.line}`, overflow: "hidden" }}>
          {players.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < players.length - 1 ? `1px solid ${P.line}` : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${P.p600}18`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 12, fontWeight: 800, color: P.p600 }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: P.ink }}>{p.name}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{p.age_group?.label || ""} {p.age_group?.gender === "girls" ? "Girls" : "Boys"}</div>
              </div>
            </div>
          ))}
          {players.length === 0 && <div style={{ padding: 24, textAlign: "center", fontFamily: F.body, fontSize: 12, color: P.muted }}>No players yet. Import a CSV to get started.</div>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SESSIONS LIST — view/edit saved sessions
   ============================================================ */
function SessionsListScreen({ club, selectedTeam, onOpenSession, onNav, onEditSession, canEdit }) {
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reload every time this component mounts
    if (club) {
      const query = supabase.from("sessions").select("*, plan:weekly_plans(week_number, mode, starts_at, coach_notes, age_group_id, hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name)), session_activities(id)").order("session_date", { ascending: false, nullsFirst: false }).limit(30);
      query.then(({ data }) => {
        let results = data || [];
        if (selectedTeam) results = results.filter((s) => s.plan?.age_group_id === selectedTeam.id);
        setSessions(results);
        setLoaded(true);
      });
    }
  }, [club, selectedTeam]);

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Sessions" sub={`${sessions.length} saved sessions`}>
        <Btn label="+ New Session" variant="primary" onClick={() => onNav("coach-builder")} />
      </TopBar>
      <div style={{ padding: "20px 24px" }}>
        {sessions.length === 0 && loaded && (
          <div style={{ background: P.white, borderRadius: 14, padding: 28, textAlign: "center", border: `1px solid ${P.line}` }}>
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>No sessions yet</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: P.muted, marginTop: 4 }}>Go to the Planner to create your first session.</div>
          </div>
        )}
        {sessions.map((sess) => (
          <div key={sess.id} onClick={() => onOpenSession(sess)} style={{ background: P.white, borderRadius: 12, padding: "14px 18px", border: `1px solid ${P.line}`, marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: Sh.card }}>
            <div style={{ width: 44, textAlign: "center", background: P.soft, borderRadius: 8, padding: "6px 0", flexShrink: 0 }}>
              <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.muted, textTransform: "uppercase" }}>{sess.session_date ? new Date(sess.session_date).toLocaleDateString("en-IE", { weekday: "short" }) : ""}</div>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>{sess.session_date ? new Date(sess.session_date).getDate() : "?"}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink }}>{sess.plan?.hurling_skill?.name || "Training Session"}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>
                {sess.session_date ? new Date(sess.session_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : ""} · {sess.total_duration_mins || "?"}min · {sess.session_activities?.length || 0} drills
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn label="View" variant="ghost" style={{ height: 28, fontSize: 10 }} onClick={(e) => { e.stopPropagation(); onOpenSession(sess); }} />
              <Btn label="Share" variant="ghost" style={{ height: 28, fontSize: 10, color: P.p600 }} onClick={(e) => { e.stopPropagation(); onOpenSession(sess); }} />
              {canEdit && <Btn label="Edit" variant="secondary" style={{ height: 28, fontSize: 10 }} onClick={(e) => { e.stopPropagation(); onEditSession(sess); }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   CLUB PERMISSIONS — RBAC matrix and user role management
   ============================================================ */
function ClubPermissionsScreen({ club, userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editModules, setEditModules] = useState([]);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = userRole?.role === "super_admin";
  const allModules = ["coach", "club", "blitz", "connect", "journey", "challenge"];
  const roles = ["super_admin", "club_admin", "coach", "parent"];

  // Permission matrix definition
  const permMatrix = {
    super_admin: { coach: "full", club: "full", blitz: "full", connect: "full", journey: "full", challenge: "full", permissions: "manage", drills: "create/delete", diagrams: "edit", teams: "manage" },
    club_admin: { coach: "full", club: "full", blitz: "full", connect: "full", journey: "view", challenge: "view", permissions: "view", drills: "create", diagrams: "view", teams: "manage" },
    coach: { coach: "assigned teams", club: "none", blitz: "view", connect: "full", journey: "none", challenge: "none", permissions: "none", drills: "create", diagrams: "view", teams: "view own" },
    parent: { coach: "none", club: "none", blitz: "none", connect: "view", journey: "child only", challenge: "child only", permissions: "none", drills: "none", diagrams: "none", teams: "none" },
  };

  useEffect(() => {
    if (club) loadUsers();
  }, [club]);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from("user_roles").select("*").eq("club_id", club.id).order("role");
    setUsers(data || []);
    setLoading(false);
  }

  async function saveUserRole() {
    if (!editingUser || !isSuperAdmin) return;
    setSaving(true);
    const updates = { role: editRole };
    if (editRole === "coach" || editRole === "parent") updates.modules = editModules;
    await supabase.from("user_roles").update(updates).eq("id", editingUser.id);
    await loadUsers();
    setEditingUser(null);
    setSaving(false);
  }

  function startEdit(user) {
    if (!isSuperAdmin) return;
    setEditingUser(user);
    setEditRole(user.role);
    setEditModules(user.modules || []);
  }

  function toggleModule(mod) {
    setEditModules((m) => m.includes(mod) ? m.filter((x) => x !== mod) : [...m, mod]);
  }

  const permKeys = ["coach", "club", "blitz", "connect", "journey", "challenge", "permissions", "drills", "diagrams", "teams"];

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Permissions" sub="Role-based access control" />
      <div style={{ padding: "20px 28px" }}>

        {/* RBAC Matrix */}
        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card, marginBottom: 20 }}>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginBottom: 14 }}>Access Matrix</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${P.line}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: P.muted, textTransform: "uppercase", fontSize: 9 }}>Permission</th>
                  {roles.map((r) => (
                    <th key={r} style={{ textAlign: "center", padding: "8px 10px", fontWeight: 700, color: P.ink, fontSize: 10, textTransform: "uppercase" }}>{r.replace("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permKeys.map((key) => (
                  <tr key={key} style={{ borderBottom: `1px solid ${P.line}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: P.ink, textTransform: "capitalize" }}>{key}</td>
                    {roles.map((r) => {
                      const val = permMatrix[r]?.[key] || "none";
                      const color = val === "full" || val === "manage" || val === "create/delete" ? P.green : val === "none" ? P.line : val.includes("view") ? P.sky : P.orange;
                      const bg = val === "full" || val === "manage" || val === "create/delete" ? "#e8f5e9" : val === "none" ? P.soft : val.includes("view") ? "#e3f2fd" : "#fff3e0";
                      return (
                        <td key={r} style={{ textAlign: "center", padding: "6px 8px" }}>
                          <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, background: bg, color, fontWeight: 700, fontSize: 9 }}>{val}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User list with roles */}
        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Users & Roles</div>
            <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{users.length} users</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 20, fontFamily: F.body, fontSize: 12, color: P.muted }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, fontFamily: F.body, fontSize: 12, color: P.muted }}>No users found</div>
          ) : (
            <div>
              {users.map((u) => {
                const roleColor = u.role === "super_admin" ? P.p600 : u.role === "club_admin" ? "#d32f2f" : u.role === "coach" ? P.green : P.sky;
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: `1px solid ${P.line}`, cursor: isSuperAdmin ? "pointer" : "default" }} onClick={() => startEdit(u)}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: roleColor + "20", display: "flex", alignItems: "center", justifyContent: "center", color: roleColor, fontFamily: F.display, fontSize: 12, fontWeight: 800 }}>
                      {(u.user_id || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink }}>{u.user_id?.substring(0, 8)}...</div>
                      <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{u.modules?.join(", ") || "all modules"}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 6, background: roleColor + "15", color: roleColor, fontFamily: F.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{u.role?.replace("_", " ")}</span>
                    {isSuperAdmin && <span style={{ fontFamily: F.body, fontSize: 10, color: P.p600, fontWeight: 700 }}>Edit</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit role modal */}
        {editingUser && isSuperAdmin && (
          <div onClick={() => setEditingUser(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: P.white, borderRadius: 16, maxWidth: 420, width: "100%", padding: 24, boxShadow: Sh.lift }}>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 16 }}>Edit User Role</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginBottom: 14 }}>User: {editingUser.user_id?.substring(0, 12)}...</div>

              {/* Role selector */}
              <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, marginBottom: 14 }}>
                {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ").toUpperCase()}</option>)}
              </select>

              {/* Module access (for coach/parent) */}
              {(editRole === "coach" || editRole === "parent") && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Module Access</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {allModules.map((mod) => (
                      <button key={mod} onClick={() => toggleModule(mod)} style={{ padding: "6px 12px", borderRadius: 6, border: `1.5px solid ${editModules.includes(mod) ? P.p600 : P.line}`, background: editModules.includes(mod) ? P.p50 : P.white, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: editModules.includes(mod) ? P.p600 : P.muted, cursor: "pointer", textTransform: "capitalize" }}>
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* What this role can do */}
              <div style={{ background: P.soft, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.muted, textTransform: "uppercase", marginBottom: 6 }}>This role can:</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: P.ink, lineHeight: 1.6 }}>
                  {Object.entries(permMatrix[editRole] || {}).filter(([_, v]) => v !== "none").map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 6 }}>
                      <span style={{ color: P.p600, fontWeight: 700 }}>•</span>
                      <span><strong style={{ textTransform: "capitalize" }}>{k}:</strong> {v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label={saving ? "Saving..." : "Save Changes"} variant="primary" onClick={saveUserRole} />
                <Btn label="Cancel" variant="ghost" onClick={() => setEditingUser(null)} />
              </div>
            </div>
          </div>
        )}

        {/* Info for non-admins */}
        {!isSuperAdmin && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: P.cream, borderRadius: 10, border: "1px solid #f0e6d6" }}>
            <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink }}>
              <strong>Your role:</strong> {userRole?.role?.replace("_", " ")} — contact a super admin to change permissions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



/* ============================================================
   ACADEMY ADMIN — separate admin module connected to Coach plans
   ============================================================ */

function academyWords(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2);
}
function academyBestSkill(activity, skills = []) {
  const activityWords = new Set(academyWords([activity?.title, activity?.description, activity?.coaching_points, activity?.category, activity?.skill?.name].join(" ")));
  const sport = String(activity?.sport || activity?.skill?.sport || "").toLowerCase();
  const concepts = [["lift","jab","roll","scoop"],["strike","shoot","accuracy"],["kick","punt"],["pass","handpass"],["catch","receive"],["carry","solo","run"]];
  return (skills || []).filter((skill) => skill.video_url).map((skill) => {
    let score = activity?.skill_id === skill.id || activity?.skill?.id === skill.id ? 120 : 0;
    const skillSport = String(skill.sport || "").toLowerCase();
    if (sport && (sport === skillSport || (sport === "camogie" && skillSport === "hurling"))) score += 28;
    const skillWords = academyWords([skill.matchedSkill?.name || "Needs review", skill.category, skill.description].join(" "));
    skillWords.forEach((word) => { if (activityWords.has(word)) score += 8; });
    concepts.forEach((terms) => {
      const activityHas = terms.some((term) => [...activityWords].some((word) => word.includes(term)));
      const skillHas = terms.some((term) => skillWords.some((word) => word.includes(term)));
      if (activityHas && skillHas) score += 18;
    });
    return { skill, score };
  }).sort((a,b) => b.score-a.score)[0] || null;
}
function getAcademyFoundationReviews(planSessions, skills = [], overrides = {}) {
  return getFoundationActivities(planSessions).map((foundation) => {
    const sourceActivity = (planSessions || []).flatMap((session) => session.session_activities || []).find((link) => (link.activity?.id || link.activity_id) === foundation.id)?.activity || foundation;
    const overrideId = overrides?.[foundation.id];
    const override = (skills || []).find((skill) => skill.id === overrideId && skill.video_url);
    const linked = sourceActivity?.skill?.video_url ? sourceActivity.skill : null;
    const ranked = academyBestSkill(sourceActivity, skills);
    const matched = override || linked || ranked?.skill || null;
    return { ...foundation, sourceActivity, matchedSkill: matched, matchScore: override ? 999 : linked ? 120 : ranked?.score || 0, overridden: Boolean(override) };
  });
}

function academyCodeFor(item) {
  const sport = String(item?.matchedSkill?.sport || item?.sourceActivity?.sport || item?.sport || "").toLowerCase();
  if (sport.includes("football")) return "football";
  if (sport.includes("hurl") || sport.includes("camogie")) return "hurling";
  return null;
}
function academySkillScoreForCode(activity, skill, code) {
  if (!skill?.video_url) return 0;
  const skillSport = String(skill.sport || "").toLowerCase();
  const validForCode = code === "football"
    ? skillSport.includes("football")
    : (skillSport.includes("hurl") || skillSport.includes("camogie"));
  if (!validForCode) return 0;

  const sourceText = [
    activity?.title,
    activity?.description,
    activity?.coaching_points,
    activity?.category,
    activity?.skill?.name,
    activity?.sessionTitle,
  ].filter(Boolean).join(" ");
  const sourceWords = new Set(academyWords(sourceText));
  const skillWords = academyWords([skill.name, skill.category, skill.description].filter(Boolean).join(" "));
  const sourceSport = String(activity?.sport || activity?.skill?.sport || "").toLowerCase();

  let score = 0;
  if (activity?.skill_id === skill.id || activity?.skill?.id === skill.id) score += 160;
  if (sourceSport) {
    if (code === "football" && sourceSport.includes("football")) score += 34;
    if (code === "hurling" && (sourceSport.includes("hurl") || sourceSport.includes("camogie"))) score += 34;
  }

  skillWords.forEach((word) => {
    if (sourceWords.has(word)) score += 10;
  });

  const concepts = [
    ["lift", "jab", "roll", "scoop", "pick"],
    ["strike", "shoot", "accuracy", "score"],
    ["kick", "punt"],
    ["pass", "handpass", "hand"],
    ["catch", "receive", "high"],
    ["carry", "solo", "run", "bounce"],
    ["tackle", "block", "hook"],
    ["move", "space", "support"],
  ];
  concepts.forEach((terms) => {
    const sourceHas = terms.some((term) => [...sourceWords].some((word) => word.includes(term)));
    const skillHas = terms.some((term) => skillWords.some((word) => word.includes(term)));
    if (sourceHas && skillHas) score += 24;
  });

  return score;
}

function getAcademyWeeklyRecommendations(planSessions, skills = [], overrides = {}, selectedTeam = null) {
  const allFoundations = getAcademyFoundationReviews(planSessions, skills, overrides);
  const sourceActivities = allFoundations.map((item) => ({
    ...item.sourceActivity,
    id: item.id,
    title: item.title,
    sessionTitle: item.sessionTitle,
    matchedSkill: item.matchedSkill,
  }));

  const isGirlsTeam = String(selectedTeam?.gender || "").toLowerCase() === "girls";
  return ["football", "hurling"].map((code) => {
    const codeOverrideId = overrides?.[code];
    const codeOverride = (skills || []).find((skill) => skill.id === codeOverrideId && skill.video_url);

    const codeSkills = (skills || []).filter((skill) => {
      if (!skill.video_url) return false;
      const sport = String(skill.sport || "").toLowerCase();
      return code === "football"
        ? sport.includes("football")
        : (sport.includes("hurl") || sport.includes("camogie"));
    });

    const tallies = new Map();
    sourceActivities.forEach((activity) => {
      const ranked = codeSkills
        .map((skill) => ({ skill, score: academySkillScoreForCode(activity, skill, code) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (!best || best.score <= 0) return;
      const existing = tallies.get(best.skill.id) || { skill: best.skill, frequency: 0, totalScore: 0, sources: [] };
      existing.frequency += 1;
      existing.totalScore += best.score;
      existing.sources.push(activity);
      tallies.set(best.skill.id, existing);
    });

    const rankedThemes = [...tallies.values()].sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return b.totalScore - a.totalScore;
    });

    let selectedTheme = rankedThemes[0] || null;

    if (!selectedTheme && codeSkills.length) {
      const corpusActivity = {
        title: sourceActivities.map((item) => item.title).join(" "),
        description: sourceActivities.map((item) => item.description || "").join(" "),
        coaching_points: sourceActivities.map((item) => item.coaching_points || "").join(" "),
        category: sourceActivities.map((item) => item.category || "").join(" "),
        sessionTitle: sourceActivities.map((item) => item.sessionTitle || "").join(" "),
      };
      const fallback = codeSkills
        .map((skill) => ({ skill, score: academySkillScoreForCode(corpusActivity, skill, code) }))
        .sort((a, b) => b.score - a.score)[0];
      if (fallback) selectedTheme = { skill: fallback.skill, frequency: 0, totalScore: fallback.score, sources: sourceActivities };
    }

    const matchedSkill = codeOverride || selectedTheme?.skill || codeSkills[0] || null;
    const sourceDrills = selectedTheme?.sources?.length ? selectedTheme.sources : sourceActivities;
    const uniqueSources = [];
    const seen = new Set();
    sourceDrills.forEach((item) => {
      const key = String(item.id || item.title);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSources.push(item);
      }
    });

    const rankedAlternativeSkills = [];
    const alternativeSeen = new Set();
    [...rankedThemes.map((theme) => theme.skill), ...codeSkills].forEach((skill) => {
      if (skill?.id && !alternativeSeen.has(skill.id)) {
        alternativeSeen.add(skill.id);
        rankedAlternativeSkills.push(skill);
      }
    });
    if (codeOverride && !alternativeSeen.has(codeOverride.id)) rankedAlternativeSkills.unshift(codeOverride);

    return {
      id: code,
      code,
      label: code === "football" ? "Football" : (isGirlsTeam ? "Camogie" : "Hurling"),
      matchedSkill,
      overridden: Boolean(codeOverride),
      matchScore: codeOverride ? 999 : selectedTheme?.totalScore || 0,
      frequency: selectedTheme?.frequency || 0,
      sourceDrills: uniqueSources,
      alternatives: rankedAlternativeSkills,
      needsReview: !matchedSkill || (selectedTheme?.frequency || 0) < 2,
    };
  });
}

function academyExtraGroup(extra) {
  const raw = `${extra?.type || extra?.activity_type || ""} ${extra?.title || ""} ${extra?.description || extra?.instruction || ""}`.toLowerCase();
  if (raw.includes("step")) return "steps";
  if (raw.includes("run") || raw.includes("jog") || raw.includes("lap")) return "runs";
  if (raw.includes("bonus") || raw.includes("club") || raw.includes("friday") || raw.includes("match") || raw.includes("camp")) return "bonus";
  if (raw.includes("recovery") || raw.includes("stretch") || raw.includes("water") || raw.includes("sleep")) return "recovery";
  return "exercises";
}
const previewPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,.2)",
  border: "1px solid rgba(255,255,255,.28)",
  color: "#fff",
  fontFamily: F.body,
  fontSize: 8,
  fontWeight: 900,
  backdropFilter: "blur(8px)",
};

function AcademyPhonePreview({ planSessions = [], extras = [], skills = [], overrides = {}, published = false, compact = false, selectedTeam = null }) {
  const recommendations = getAcademyWeeklyRecommendations(planSessions, skills, overrides, selectedTeam);
  const football = recommendations.filter((item) => item.code === "football");
  const hurling = recommendations.filter((item) => item.code === "hurling");
  const grouped = { steps: [], exercises: [], runs: [], bonus: [], recovery: [] };
  extras.forEach((extra) => grouped[academyExtraGroup(extra)].push(extra));
  const section = (title, items, color, icon, render) => items.length ? <div style={{ background:"#fff",border:`1px solid ${color}33`,borderRadius:14,padding:11,marginTop:9 }}><div style={{ display:"flex",alignItems:"center",gap:7,fontFamily:F.body,fontSize:10,fontWeight:900,color,textTransform:"uppercase" }}><span>{icon}</span>{title}</div><div style={{ display:"grid",gap:7,marginTop:8 }}>{items.map(render)}</div></div> : null;
  const taskRow=(item)=><div key={item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc" }}><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink}}>{item.title}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2}}>{item.target || item.description || item.instruction || "Complete this mission"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:"#b45309"}}>+{item.xp || item.xp_reward || 10} XP</span></div>;
  const skillRow=(item)=><div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc"}}><div style={{width:32,height:32,borderRadius:9,background:"#e0f2fe",display:"grid",placeItems:"center"}}>▶</div><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink}}>{item.matchedSkill?.name || "Choose weekly video"}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Based on {item.sourceDrills.length} Coach drill{item.sourceDrills.length===1?"":"s"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:"#b45309"}}>+20 XP</span></div>;
  const visibleCount = football.length+hurling.length+Object.values(grouped).reduce((sum,items)=>sum+items.length,0);
  return <div style={{ width: compact ? 300 : "min(390px,100%)", maxHeight: compact ? 600 : "none", overflow:"hidden", background:"#fff",borderRadius:compact?26:32,border:compact?"6px solid #16324a":"8px solid #16324a",boxShadow:"0 22px 52px rgba(7,89,133,.2)" }}><div style={{background:"linear-gradient(135deg,#38bdf8,#0284c7)",padding:compact?"16px 14px":"22px 18px",color:"#fff",position:"relative",overflow:"hidden"}}><img src="/spraoi-academy-icon.png" alt="" style={{position:"absolute",right:8,bottom:-8,width:compact?68:88,height:compact?68:88,objectFit:"contain",background:"#fff",borderRadius:18,padding:6}}/><div style={{fontFamily:F.body,fontSize:8,fontWeight:900,opacity:.85,textTransform:"uppercase"}}>Club Spraoi Academy</div><div style={{fontFamily:F.display,fontSize:compact?18:24,fontWeight:900,marginTop:3,maxWidth:"70%"}}>Your weekly adventure</div><div style={{display:"flex",gap:6,marginTop:11}}><span style={previewPill}>⭐ {recommendations.length*20+extras.reduce((s,x)=>s+Number(x.xp||x.xp_reward||0),0)} XP</span><span style={previewPill}>🏅 Badges</span></div></div><div style={{padding:compact?10:15,background:"#f3f9fd",maxHeight:compact?460:"none",overflowY:"auto"}}>{visibleCount===0?<div style={{padding:18,textAlign:"center",fontFamily:F.body,fontSize:10,color:P.muted}}>Add weekly content to see the child experience here.</div>:<>{section("Step Goals",grouped.steps,"#0f9f6e","👟",taskRow)}{section("Exercises",grouped.exercises,"#7c3aed","💪",taskRow)}{section("Run Challenge",grouped.runs,"#e65100","🏃",taskRow)}{section("Football Skills",football,"#2563eb","⚽",skillRow)}{section(selectedTeam?.gender === "girls" ? "Camogie Skills" : "Hurling Skills",hurling,"#dc2626","🏑",skillRow)}{section("Bonus",grouped.bonus,"#d97706","✨",taskRow)}{section("Rest & Recovery",grouped.recovery,"#0f766e","🌙",taskRow)}</>}<div style={{marginTop:10,padding:9,borderRadius:11,background:published?"#dcfce7":"#fff7ed",color:published?"#15803d":"#b45309",fontFamily:F.body,fontSize:8,fontWeight:900,textAlign:"center"}}>{published?"✓ Published to children":"Preview mode · not published"}</div></div></div>;
}

function AcademyDashboardScreen({ selectedTeam, weeklyPlan, planSessions, extras = [], skills = [], overrides = {}, published = false, onSetOverride, onNav }) {
  const academyBlue = "#0277bd";
  const academyDark = "#075985";
  const academySoft = "#eef8ff";
  const teamName = selectedTeam
    ? teamDisplayName(selectedTeam)
    : "No team selected";

  const weeklyRecommendations = getAcademyWeeklyRecommendations(planSessions, skills, overrides, selectedTeam);
  const [previewIndexes, setPreviewIndexes] = useState({});
  const sessionCount = Array.isArray(planSessions) ? planSessions.length : 0;
  const hasPlan = Boolean(weeklyPlan);
  const hasSkills = weeklyRecommendations.length > 0;
  const setupSteps = [
    { label: "Coach plan connected", complete: hasPlan },
    { label: "Weekly videos suggested", complete: hasSkills },
    { label: "Weekly videos reviewed", complete: false },
    { label: "Weekly content published", complete: false },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;
  const setupProgress = Math.round((completedSetupSteps / setupSteps.length) * 100);

  const weekLabel = (() => {
    const sourceDate = weeklyPlan?.week_start || weeklyPlan?.week_start_date || weeklyPlan?.created_at;
    if (!sourceDate) return "Current week";
    const date = new Date(sourceDate);
    if (Number.isNaN(date.getTime())) return "Current week";
    return `Week of ${date.toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`;
  })();

  const MetricCard = ({ label, value, detail, trend, accent, icon, onClick }) => (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", background: P.white, border: `1px solid ${P.line}`,
        borderRadius: 14, padding: 16, boxShadow: "0 1px 2px rgba(15,23,42,.03)",
        cursor: onClick ? "pointer" : "default", minWidth: 0, position: "relative", overflow: "hidden"
      }}
    >
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted }}>{label}</div>
          <div style={{ fontFamily: F.display, fontSize: 27, lineHeight: 1.15, fontWeight: 900, color: P.ink, marginTop: 8 }}>{value}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}12`, color: accent, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 900 }}>
          {icon}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, minHeight: 16 }}>
        {trend && <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: trend.color, background: trend.bg, padding: "3px 6px", borderRadius: 999 }}>{trend.label}</span>}
        <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{detail}</span>
      </div>
    </button>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: "auto", background: "#f7f9fc" }}>
      <TopBar title="Academy Admin" sub={`${teamName} · ${weekLabel}`}>
        <Btn label="Child Preview" variant="ghost" icon="◉" onClick={() => onNav("academy-preview")} />
        <Btn label="Manage Weekly Content" variant="primary" icon="＋" onClick={() => onNav("academy-content")} style={{ background: academyBlue, boxShadow: "0 5px 16px rgba(2,119,189,.22)" }} />
      </TopBar>

      <div style={{ padding: "22px 24px 32px", maxWidth: 1500, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <section style={{
          background: "linear-gradient(115deg, #e9f7ff 0%, #d9f0ff 54%, #c8eaff 100%)",
          borderRadius: 18, padding: "22px 24px", color: academyDark, marginBottom: 18,
          boxShadow: "0 14px 32px rgba(7,89,133,.16)", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "rgba(2,119,189,.06)", right: -65, top: -110 }} />
          <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(2,119,189,.12)", right: 155, bottom: -80 }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 999, background: "rgba(255,255,255,.75)", fontFamily: F.body, fontSize: 10, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasPlan ? "#86efac" : "#fbbf24" }} />
                {hasPlan ? "Coach plan connected" : "Action required"}
              </div>
              <h2 style={{ fontFamily: F.display, fontSize: 25, lineHeight: 1.15, fontWeight: 900, letterSpacing: "-.025em", margin: "13px 0 7px" }}>
                {hasSkills ? `${weeklyRecommendations.length} primary ${weeklyRecommendations.length === 1 ? "skill is" : "skills are"} ready for Academy` : "Prepare this week’s Academy experience"}
              </h2>
              <p style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.6, color: "#4c7187", margin: 0 }}>
                {hasSkills
                  ? "Review the child-friendly practices generated from the Coach plan, make any edits, then publish them to parents and players."
                  : "Academy imports the selected team’s saved Coach plan automatically. Add bonus activities here when the weekly foundations are ready."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onNav("academy-content")} style={{ height: 38, padding: "0 15px", borderRadius: 10, border: "none", background: P.white, color: academyDark, fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,.12)" }}>
                Review Weekly Content →
              </button>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
          <MetricCard label="Academy players" value="24" detail="in this squad" accent={academyBlue} icon="P" onClick={() => onNav("academy-players")} />
          <MetricCard label="Parents linked" value="19" detail="5 invitations pending" trend={{ label: "79% linked", color: "#0369a1", bg: "#e0f2fe" }} accent="#0ea5e9" icon="↗" onClick={() => onNav("academy-parents")} />
          <MetricCard label="Active this week" value="17" detail="of 24 players" trend={{ label: "+8%", color: "#15803d", bg: "#dcfce7" }} accent={P.green} icon="✓" onClick={() => onNav("academy-engagement")} />
          <MetricCard label="Completion rate" value="68%" detail="across published practices" trend={{ label: "+12%", color: "#15803d", bg: "#dcfce7" }} accent={P.orange} icon="◒" onClick={() => onNav("academy-engagement")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.65fr) minmax(300px, .85fr)", gap: 18, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, overflow: "hidden" }}>
              <div style={{ padding: "17px 18px", borderBottom: `1px solid ${P.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>Suggested Weekly Videos</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>One Football and one Hurling/Camogie video can be chosen from {sessionCount} connected Coach {sessionCount === 1 ? "session" : "sessions"}</div>
                </div>
                <button onClick={() => onNav("academy-content")} style={{ border: "none", background: "transparent", color: academyBlue, fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>View all →</button>
              </div>

              {weeklyRecommendations.length > 0 ? (
                <div>
                  {weeklyRecommendations.map((rec, index) => {
                    const selected = Boolean(overrides?.[rec.code]);
                    const color = rec.code === "football" ? "#2563eb" : "#dc2626";
                    const bg = rec.code === "football" ? "#eff6ff" : "#fff1f2";
                    const options = rec.alternatives?.length ? rec.alternatives : (rec.matchedSkill ? [rec.matchedSkill] : []);
                    const defaultIndex = Math.max(0, options.findIndex((skill) => skill.id === rec.matchedSkill?.id));
                    const previewIndex = Math.min(previewIndexes[rec.code] ?? defaultIndex, Math.max(options.length - 1, 0));
                    const previewSkill = options[previewIndex] || rec.matchedSkill;
                    const isPreviewSelected = Boolean(overrides?.[rec.code] && overrides[rec.code] === previewSkill?.id);
                    return <div key={rec.code} style={{ display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "14px 18px", borderBottom: index < weeklyRecommendations.length - 1 ? `1px solid ${P.line}` : "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: "grid", placeItems: "center", fontSize: 20 }}>{rec.code === "football" ? "⚽" : "🏑"}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: F.body, fontSize: 9, lineHeight: 1, fontWeight: 900, color, textTransform: "uppercase", letterSpacing: ".06em" }}>{rec.label}</span>
                          <span style={{ width: 3, height: 3, borderRadius: "50%", background: P.line }} />
                          <span style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>Based on {rec.sourceDrills.length} Coach drill{rec.sourceDrills.length===1?"":"s"}</span>
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 800, color: P.ink, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewSkill?.name || "No video match"}</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 3 }}>One weekly child video for this code</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                        <span style={{ padding: "5px 8px", borderRadius: 999, background: selected ? "#dcfce7" : "#fff7ed", color: selected ? "#15803d" : "#c2410c", fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>{isPreviewSelected ? "Selected" : "Suggested"}</span>
                        <div className="academy-match-actions" style={{display:"flex",gap:6,flexWrap:"wrap"}}><button onClick={()=>setPreviewIndexes((current)=>({...current,[rec.code]:Math.max(0,previewIndex-1)}))} disabled={previewIndex===0} style={{height:30,borderRadius:8,border:`1px solid ${P.line}`,background:"#fff",color:previewIndex===0?P.muted:academyBlue,padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:900,cursor:previewIndex===0?"default":"pointer"}}>Previous</button><button onClick={()=>setPreviewIndexes((current)=>({...current,[rec.code]:Math.min(options.length-1,previewIndex+1)}))} disabled={previewIndex>=options.length-1} style={{height:30,borderRadius:8,border:`1px solid ${P.line}`,background:"#fff",color:previewIndex>=options.length-1?P.muted:academyBlue,padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:900,cursor:previewIndex>=options.length-1?"default":"pointer"}}>Next suggestion</button>{previewSkill?.id && !isPreviewSelected && <button onClick={() => onSetOverride?.(rec.code, previewSkill.id)} style={{height:30,borderRadius:8,border:0,background:academyBlue,color:"#fff",padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:900,cursor:"pointer"}}>Use this video</button>}<span style={{alignSelf:"center",fontFamily:F.body,fontSize:9,color:P.muted}}>Suggestion {options.length?previewIndex+1:0} of {options.length}</span></div>
                        <button onClick={() => onNav("academy-content")} aria-label={`Review ${rec.label}`} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.line}`, background: P.white, color: P.muted, cursor: "pointer" }}>›</button>
                      </div>
                    </div>
                  })}
                </div>
              ) : (
                <div style={{ padding: "28px 18px", textAlign: "center" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: academySoft, color: academyBlue, display: "grid", placeItems: "center", fontSize: 20, margin: "0 auto 11px" }}>＋</div>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 800, color: P.ink }}>No skills imported yet</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>Select this week’s primary skills in Coach Planner.</div>
                  <div style={{ marginTop: 12, fontFamily: F.body, fontSize: 10, color: academyBlue, fontWeight: 800 }}>Waiting for the selected team’s saved Coach plan</div>
                </div>
              )}
            </section>

            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>Weekly engagement</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>Player activity over the last seven days</div>
                </div>
                <button onClick={() => onNav("academy-engagement")} style={{ border: "none", background: "transparent", color: academyBlue, fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Open engagement →</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(34px, 1fr))", gap: 10, alignItems: "end", height: 150, padding: "0 4px", borderBottom: `1px solid ${P.line}` }}>
                {[42, 58, 46, 72, 65, 88, 76].map((height, index) => (
                  <div key={index} style={{ display: "flex", height: "100%", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 7 }}>
                    <div style={{ width: "100%", maxWidth: 36, height: `${height}%`, borderRadius: "7px 7px 2px 2px", background: index === 5 ? academyBlue : "#bae6fd", transition: "height .2s ease" }} />
                    <span style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"][index]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>41</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>practice opens</span></div>
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>29</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>completions</span></div>
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>8</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>active streaks</span></div>
              </div>
            </section>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>Publish readiness</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>{completedSetupSteps} of {setupSteps.length} steps complete</div>
                </div>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: `conic-gradient(${academyBlue} ${setupProgress * 3.6}deg, #e8edf3 0deg)`, display: "grid", placeItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: P.white, display: "grid", placeItems: "center", fontFamily: F.body, fontSize: 10, fontWeight: 900, color: academyDark }}>{setupProgress}%</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
                {setupSteps.map((step, index) => (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", background: step.complete ? "#dcfce7" : "#f1f5f9", color: step.complete ? "#15803d" : "#94a3b8", fontFamily: F.body, fontSize: 10, fontWeight: 900 }}>{step.complete ? "✓" : index + 1}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: step.complete ? 600 : 700, color: step.complete ? P.muted : P.ink, textDecoration: step.complete ? "line-through" : "none" }}>{step.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => onNav("academy-content")} style={{ width: "100%", height: 36, borderRadius: 9, border: "none", background: academyBlue, color: P.white, fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: "pointer", marginTop: 18 }}>Continue setup</button>
            </section>

            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>Parent access</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>5 invitations still need attention</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center", fontWeight: 900 }}>@</div>
              </div>
              <div style={{ marginTop: 15, height: 7, borderRadius: 999, background: "#e8edf3", overflow: "hidden" }}><div style={{ width: "79%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #0284c7, #22d3ee)" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>19 linked</span>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: academyBlue }}>79%</span>
              </div>
              <button onClick={() => onNav("academy-parents")} style={{ width: "100%", height: 34, borderRadius: 9, border: `1px solid ${P.line}`, background: P.white, color: P.ink, fontFamily: F.body, fontSize: 10, fontWeight: 800, cursor: "pointer", marginTop: 14 }}>Manage parent access</button>
            </section>

            <section style={{ background: academySoft, borderRadius: 16, border: "1px solid #cfeeff", padding: 16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12 }}><div><div style={{ fontFamily:F.display,fontSize:16,fontWeight:900,color:academyDark }}>Live child preview</div><div style={{fontFamily:F.body,fontSize:10,color:"#477084",marginTop:2}}>Only sections with content are shown.</div></div><button onClick={()=>onNav("academy-preview")} style={{border:0,background:"transparent",color:academyBlue,fontFamily:F.body,fontSize:10,fontWeight:900,cursor:"pointer"}}>Open full →</button></div>
              <div style={{display:"grid",placeItems:"center"}}><AcademyPhonePreview planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} compact selectedTeam={selectedTeam} /></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACADEMY_BLUE = "#0277bd";
const ACADEMY_DARK = "#075985";
const ACADEMY_SOFT = "#eef8ff";
const ACADEMY_TEMPLATES = [
  { type: "steps", icon: "👟", title: "Step goal", instruction: "Reach your step target this week.", xp: 20, target: "20,000 steps" },
  { type: "run", icon: "🏃", title: "Run challenge", instruction: "Complete a steady run with an adult.", xp: 25, target: "2 km" },
  { type: "exercise", icon: "⭐", title: "Star jumps", instruction: "Complete 3 sets with a short rest.", xp: 10, target: "3 × 20" },
  { type: "exercise", icon: "🦵", title: "Lunges", instruction: "Keep your chest tall and alternate legs.", xp: 10, target: "20 each side" },
  { type: "exercise", icon: "⬇", title: "Squats", instruction: "Sit back, keep your knees tracking forward.", xp: 10, target: "3 × 15" },
  { type: "skill", icon: "🎯", title: "Skill repetitions", instruction: "Practise this week’s key skill at home.", xp: 20, target: "50 repetitions" },
  { type: "club", icon: "🏑", title: "Friday Night Hurling", instruction: "Attend the club session and check in.", xp: 30, target: "Attend" },
  { type: "club", icon: "📅", title: "Club activity", instruction: "Take part in this week’s bonus club activity.", xp: 20, target: "Attend" },
];

function AcademyPageHeader({ title, sub, actions }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#f8fcff 0%,#e9f6ff 100%)", borderBottom: "1px solid #cfeeff", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", boxShadow: "0 10px 26px rgba(2,119,189,.12)" }}><img src="/spraoi-academy-icon.png" alt="Academy" style={{ width: 48, height: 48, objectFit: "contain" }} /></div>
        <div><div style={{ fontFamily: F.display, fontSize: 23, fontWeight: 900, color: ACADEMY_DARK }}>{title}</div><div style={{ fontFamily: F.body, fontSize: 12, color: "#4c7187", marginTop: 2 }}>{sub}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}

function AcademyCard({ children, style }) { return <div style={{ background: P.white, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18, boxShadow: Sh.card, ...style }}>{children}</div>; }
function AcademyBadge({ children, color = ACADEMY_BLUE, bg = ACADEMY_SOFT }) { return <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 8px", borderRadius: 999, background: bg, color, fontFamily: F.body, fontSize: 9, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>; }

function getFoundationActivities(planSessions) {
  const rows = [];
  (planSessions || []).forEach((session, sessionIndex) => {
    const acts = session.session_activities || session.activities || [];
    acts.forEach((sa, activityIndex) => {
      const activity = sa.activity || sa.activities || sa;
      rows.push({
        id: sa.id || `${session.id}-${activityIndex}`,
        sessionId: session.id,
        sessionTitle: session.title || session.name || `Session ${sessionIndex + 1}`,
        title: activity?.title || activity?.name || "Coach drill",
        description: activity?.description || activity?.instructions || "Imported from the Coach weekly plan.",
        duration: sa.duration_mins || activity?.duration_mins || activity?.duration || null,
        sport: activity?.sport || session?.sport || "Training",
        skill: activity?.skill?.name || activity?.skill_name || "Weekly focus",
        skillId: activity?.skill?.id || activity?.skill_id || null,
        videoUrl: activity?.skill?.video_url || activity?.video_url || null,
        category: activity?.skill?.category || activity?.category || "skill",
      });
    });
  });
  return rows;
}

function AcademyWeeklyContent({ selectedTeam, weeklyPlan, planSessions, extras, skills = [], overrides = {}, onSetOverride, onAddExtra, onUpdateExtra, onRemoveExtra, onMoveExtra, published, onPublish }) {
  const recommendations = getAcademyWeeklyRecommendations(planSessions, skills, overrides, selectedTeam);
  const [previewIndexes, setPreviewIndexes] = useState({});
  const [draft, setDraft] = useState({ title: "", instruction: "", target: "", xp: 15, type: "exercise", required: false });
  const [editingId, setEditingId] = useState(null);
  const [publishReview, setPublishReview] = useState(false);
  const applyTemplate = (t) => { setEditingId(null); setDraft({ title: t.title, instruction: t.instruction, target: t.target, xp: t.xp, type: t.type, required: false }); };
  const resetDraft = () => { setEditingId(null); setDraft({ title: "", instruction: "", target: "", xp: 15, type: "exercise", required: false }); };
  const saveDraft = () => {
    if (!draft.title.trim()) return;
    if (editingId) onUpdateExtra?.(editingId, draft);
    else onAddExtra({ ...draft, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
    resetDraft();
  };
  const beginEdit = (item) => { setEditingId(item.id); setDraft({ title:item.title||"", instruction:item.instruction||item.description||"", target:item.target||"", xp:Number(item.xp||item.xp_reward||15), type:item.type||item.activity_type||"exercise", required:Boolean(item.required) }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectedFootball = Boolean(overrides?.football);
  const selectedHurling = Boolean(overrides?.hurling);
  const validation = [
    { label: "Coach plan available", ok: Boolean(weeklyPlan?.id) },
    { label: "Football video selected", ok: selectedFootball },
    { label: `${selectedTeam?.gender === "girls" ? "Camogie" : "Hurling"} video selected`, ok: selectedHurling },
    { label: "Selected videos have approved links", ok: recommendations.filter(r => overrides?.[r.code]).every(r => skills.find(x => x.id === overrides?.[r.code])?.video_url) },
  ];
  const canPublish = validation.every(x => x.ok);
  const requestPublish = () => { if (published) onPublish?.(); else setPublishReview(true); };
  const groups = [
    { key:"steps", label:"Step Goals", icon:"👟", color:"#0f9f6e", test:x=>(x.type||x.activity_type)==="steps" },
    { key:"exercise", label:"Exercises", icon:"💪", color:"#7c3aed", test:x=>(x.type||x.activity_type)==="exercise" },
    { key:"run", label:"Run Challenge", icon:"🏃", color:"#e65100", test:x=>(x.type||x.activity_type)==="run" },
    { key:"skill", label:"Extra Skill Practice", icon:"🎯", color:"#2563eb", test:x=>(x.type||x.activity_type)==="skill" },
    { key:"club", label:"Bonus & Club Activities", icon:"✨", color:"#d97706", test:x=>(x.type||x.activity_type)==="club" },
    { key:"recovery", label:"Rest & Recovery", icon:"🌙", color:"#0f766e", test:x=>(x.type||x.activity_type)==="recovery" },
  ];
  return <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
    <AcademyPageHeader title="Weekly Content" sub={`${selectedTeam?.label || "Selected team"} · Build, review and publish the child experience`} actions={<Btn label={published ? "Unpublish week" : "Review & publish"} variant="primary" icon={published ? "↓" : "↑"} onClick={requestPublish} style={{ background: published ? P.green : ACADEMY_BLUE }} />} />
    <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><AcademyBadge>Weekly readiness</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:8}}>{published?"This week is live":"Complete the checks before publishing"}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{validation.map(v=><AcademyBadge key={v.label} color={v.ok?"#15803d":"#b45309"} bg={v.ok?"#dcfce7":"#fff7ed"}>{v.ok?"✓":"!"} {v.label}</AcademyBadge>)}</div></div>
      </AcademyCard>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div><AcademyBadge>Suggested weekly videos</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:8}}>One video per code</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Browse suggestions, then explicitly select the Football and {selectedTeam?.gender === "girls" ? "Camogie" : "Hurling"} videos for this week.</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginTop:16}}>{recommendations.map(rec=>{const options=rec.alternatives?.length?rec.alternatives:(rec.matchedSkill?[rec.matchedSkill]:[]);const idx=Math.min(previewIndexes[rec.code]??Math.max(0,options.findIndex(x=>x.id===rec.matchedSkill?.id)),Math.max(0,options.length-1));const skill=options[idx]||rec.matchedSkill;const selected=overrides?.[rec.code]===skill?.id;return <div key={rec.code} style={{border:`1px solid ${selected?"#86efac":"#bae6fd"}`,borderRadius:16,padding:15,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><AcademyBadge color={rec.code==="football"?"#1d4ed8":"#b91c1c"} bg={rec.code==="football"?"#dbeafe":"#fee2e2"}>{rec.label}</AcademyBadge><AcademyBadge color={selected?"#15803d":"#0369a1"} bg={selected?"#dcfce7":"#e0f2fe"}>{selected?"Selected":"Suggestion"}</AcademyBadge></div><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:10}}>{skill?.name||"No match available"}</div>{skill?.video_url&&<div style={{borderRadius:11,overflow:"hidden",background:"#071827",marginTop:10}}><iframe title={skill.name} src={skill.video_url.replace("watch?v=","embed/").split("&")[0]} style={{width:"100%",height:180,border:0,display:"block"}} allowFullScreen /></div>}<div className="academy-match-actions" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7,marginTop:10}}><button disabled={idx===0} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.max(0,idx-1)}))} style={smallAction(idx===0)}>Previous</button><button disabled={idx>=options.length-1} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.min(options.length-1,idx+1)}))} style={smallAction(idx>=options.length-1)}>Next suggestion</button><button disabled={!skill?.id||selected} onClick={()=>skill?.id&&onSetOverride?.(rec.code,skill.id)} style={{...smallAction(false),background:selected?"#dcfce7":ACADEMY_BLUE,color:selected?"#15803d":"#fff",border:0}}>{selected?"Selected":"Use this video"}</button></div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:7}}>Suggestion {options.length?idx+1:0} of {options.length} · based on {rec.sourceDrills.length} Coach activities</div></div>})}</div>
      </AcademyCard>
      <div className="academy-content-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, alignItems:"start" }}>
        <AcademyCard>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>{editingId?"Edit activity":"Add an activity"}</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Add multiple items to a section; they will appear together on one child card.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8,marginTop:13}}>{ACADEMY_TEMPLATES.map(t=><button key={t.title} onClick={()=>applyTemplate(t)} style={{border:`1px solid ${P.line}`,borderRadius:12,background:P.white,padding:10,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:20}}>{t.icon}</div><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink,marginTop:4}}>{t.title}</div><div style={{fontFamily:F.body,fontSize:9,color:ACADEMY_BLUE}}>{t.xp} XP</div></button>)}</div>
          <div className="academy-form-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:15}}><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Activity name</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={inputStyle}/></label><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Child instructions</span><textarea value={draft.instruction} onChange={e=>setDraft({...draft,instruction:e.target.value})} style={{...inputStyle,minHeight:72,paddingTop:9}}/></label><label><span style={labelStyle}>Target</span><input value={draft.target} onChange={e=>setDraft({...draft,target:e.target.value})} style={inputStyle}/></label><label><span style={labelStyle}>XP</span><input type="number" min="0" value={draft.xp} onChange={e=>setDraft({...draft,xp:Number(e.target.value)})} style={inputStyle}/></label><label><span style={labelStyle}>Section</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})} style={inputStyle}><option value="steps">Step Goals</option><option value="exercise">Exercises</option><option value="run">Run Challenge</option><option value="skill">Extra Skill Practice</option><option value="club">Bonus & Club Activity</option><option value="recovery">Rest & Recovery</option></select></label><label style={{display:"flex",alignItems:"center",gap:8,marginTop:22,fontFamily:F.body,fontSize:11}}><input type="checkbox" checked={draft.required} onChange={e=>setDraft({...draft,required:e.target.checked})}/> Required</label></div>
          <div style={{display:"flex",gap:8,marginTop:13}}><button onClick={saveDraft} style={{height:38,border:0,borderRadius:10,background:ACADEMY_BLUE,color:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"}}>{editingId?"Save changes":"＋ Add to week"}</button>{editingId&&<button onClick={resetDraft} style={{height:38,border:`1px solid ${P.line}`,borderRadius:10,background:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"}}>Cancel</button>}</div>
        </AcademyCard>
        <div style={{display:"grid",gap:12}}>{groups.map(group=>{const items=extras.filter(group.test);if(!items.length)return null;return <AcademyCard key={group.key} style={{borderTop:`4px solid ${group.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>{group.icon} {group.label}</div><AcademyBadge>{items.length}</AcademyBadge></div><div style={{display:"grid",gap:8,marginTop:10}}>{items.map((x,i)=><div key={x.id} style={{border:`1px solid ${P.line}`,borderRadius:11,padding:11,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontFamily:F.body,fontSize:11,fontWeight:900,color:P.ink}}>{x.title}</div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:2}}>{x.target||x.instruction||x.description}</div></div><div style={{display:"flex",gap:3}}><button title="Move up" disabled={i===0} onClick={()=>onMoveExtra?.(x.id,-1,group.test)} style={iconAction(i===0)}>↑</button><button title="Move down" disabled={i===items.length-1} onClick={()=>onMoveExtra?.(x.id,1,group.test)} style={iconAction(i===items.length-1)}>↓</button><button title="Edit" onClick={()=>beginEdit(x)} style={iconAction(false)}>✎</button><button title="Remove" onClick={()=>onRemoveExtra(x.id)} style={{...iconAction(false),color:"#dc2626"}}>×</button></div></div><div style={{display:"flex",gap:6,marginTop:7}}><AcademyBadge color="#b45309" bg="#fff7ed">{x.xp||x.xp_reward||0} XP</AcademyBadge>{x.required&&<AcademyBadge color="#b91c1c" bg="#fef2f2">Required</AcademyBadge>}</div></div>)}</div></AcademyCard>})}</div>
      </div>
    </div>
    {publishReview&&<div style={{position:"fixed",inset:0,zIndex:5000,background:"rgba(15,23,42,.55)",display:"grid",placeItems:"center",padding:18}}><div style={{width:"min(520px,100%)",background:"#fff",borderRadius:20,padding:22,boxShadow:"0 30px 80px rgba(15,23,42,.3)"}}><div style={{fontFamily:F.display,fontSize:22,fontWeight:900,color:P.ink}}>Review before publishing</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:5}}>Only published content is visible in the child app for {selectedTeam?.label||"this team"}.</div><div style={{display:"grid",gap:8,marginTop:16}}>{validation.map(v=><div key={v.label} style={{display:"flex",justifyContent:"space-between",padding:10,borderRadius:10,background:v.ok?"#f0fdf4":"#fff7ed",fontFamily:F.body,fontSize:11,fontWeight:800,color:v.ok?"#15803d":"#b45309"}}><span>{v.label}</span><span>{v.ok?"Ready":"Needs attention"}</span></div>)}</div><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,flexWrap:"wrap"}}><button onClick={()=>setPublishReview(false)} style={modalButton(false)}>Keep editing</button><button disabled={!canPublish} onClick={()=>{if(canPublish){onPublish?.();setPublishReview(false)}}} style={{...modalButton(true),opacity:canPublish?1:.45,cursor:canPublish?"pointer":"default"}}>Publish to children</button></div></div></div>}
  </div>;
}
const smallAction=(disabled)=>({height:36,border:`1px solid ${P.line}`,borderRadius:9,background:"#fff",color:disabled?P.muted:ACADEMY_BLUE,fontFamily:F.body,fontSize:9,fontWeight:900,cursor:disabled?"default":"pointer"});
const iconAction=(disabled)=>({width:28,height:28,border:`1px solid ${P.line}`,borderRadius:7,background:"#fff",color:disabled?"#cbd5e1":P.ink,cursor:disabled?"default":"pointer",fontWeight:900});
const modalButton=(primary)=>({height:38,border:primary?0:`1px solid ${P.line}`,borderRadius:10,background:primary?ACADEMY_BLUE:"#fff",color:primary?"#fff":P.ink,padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"});
const labelStyle={display:"block",fontFamily:F.body,fontSize:9,fontWeight:900,color:P.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5};
const inputStyle={width:"100%",height:38,border:`1px solid ${P.line}`,borderRadius:9,padding:"0 10px",boxSizing:"border-box",fontFamily:F.body,fontSize:11,color:P.ink,background:P.white,outline:"none"};

function AcademyPlayers({ selectedTeam }) { const players=Array.from({length:12},(_,i)=>({id:i,name:["Aoife Murphy","Cian Byrne","Saoirse Kelly","Rory Walsh","Niamh Doyle","Oisín Ryan","Emma Nolan","Darragh Flynn","Lucy Brennan","Conor Murray","Mia O'Brien","Sean Gallagher"][i],xp:420-i*21,streak:(i%5)+1})); return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Players" sub={`${selectedTeam?.label||"Team"} · Academy profiles and progress`} /><div style={{padding:24,maxWidth:1180,margin:"0 auto"}}><AcademyCard><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>{players.map(p=><div key={p.id} style={{border:`1px solid ${P.line}`,borderRadius:13,padding:13,display:"flex",alignItems:"center",gap:11}}><div style={{width:40,height:40,borderRadius:"50%",background:ACADEMY_SOFT,color:ACADEMY_BLUE,display:"grid",placeItems:"center",fontWeight:900}}>{p.name[0]}</div><div style={{flex:1}}><div style={{fontFamily:F.body,fontSize:12,fontWeight:900,color:P.ink}}>{p.name}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:2}}>{p.xp} XP · {p.streak} day streak</div></div><span style={{fontSize:17}}>🔥</span></div>)}</div></AcademyCard></div></div>; }

function AcademyParents({ selectedTeam, parentRows, setParentRows }) {
  const [teamLink] = useState(()=>`${window.location.origin}/academy/join/${selectedTeam?.id||"club-spraoi"}`);
  const parseFile = (file) => { const r=new FileReader(); r.onload=()=>{ const lines=String(r.result||"").split(/\r?\n/).filter(Boolean); const headers=lines.shift()?.split(",").map(h=>h.trim().toLowerCase())||[]; const find=(names)=>headers.findIndex(h=>names.includes(h)); const pi=find(["parent name","parent","guardian name"]), ei=find(["parent email","email","guardian email"]), ci=find(["child name","child","player name"]); const rows=lines.map((l,i)=>{const c=l.split(",").map(x=>x.trim());return{id:`upload-${Date.now()}-${i}`,parent:c[pi]||"",email:c[ei]||"",child:c[ci]||"",status:c[ei]&&c[ci]?"Ready":"Needs review",link:`${teamLink}?invite=${i+1}`}}); setParentRows(rows); }; r.readAsText(file); };
  const copy=(text)=>navigator.clipboard?.writeText(text);
  return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Parent Access" sub={`${selectedTeam?.label||"Team"} · Upload families and send child-app invitations`} actions={<Btn label="Copy team link" variant="primary" icon="⧉" onClick={()=>copy(teamLink)} style={{background:ACADEMY_BLUE}}/>}/><div style={{padding:24,maxWidth:1180,margin:"0 auto",display:"grid",gap:16}}>
    <AcademyCard><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center"}}><div><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Upload parent and child list</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>CSV columns: Parent Name, Parent Email, Child Name. One parent can appear on multiple rows for multiple children.</div></div><label style={{height:38,padding:"0 14px",borderRadius:10,background:ACADEMY_BLUE,color:"#fff",display:"flex",alignItems:"center",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"}}>Upload CSV<input type="file" accept=".csv,text/csv" onChange={(e)=>e.target.files?.[0]&&parseFile(e.target.files[0])} style={{display:"none"}}/></label></div></AcademyCard>
    <AcademyCard><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><div style={{fontFamily:F.display,fontSize:17,fontWeight:900,color:P.ink}}>Invitation review</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:3}}>{parentRows.length} family links prepared</div></div><button onClick={()=>setParentRows(rows=>rows.map(r=>({...r,status:r.email&&r.child?"Sent":r.status})))} style={{height:36,border:0,borderRadius:9,background:parentRows.length?ACADEMY_BLUE:"#cbd5e1",color:"#fff",padding:"0 13px",fontFamily:F.body,fontSize:10,fontWeight:900,cursor:parentRows.length?"pointer":"default"}}>Send all ready invitations</button></div>
    <div style={{overflowX:"auto",marginTop:14}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}><thead><tr>{["Parent","Email","Child","Status","App link"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 8px",borderBottom:`1px solid ${P.line}`,fontFamily:F.body,fontSize:9,color:P.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{parentRows.length===0?<tr><td colSpan="5" style={{padding:22,textAlign:"center",fontFamily:F.body,fontSize:11,color:P.muted}}>Upload a CSV to review parent-child links.</td></tr>:parentRows.map(r=><tr key={r.id}><td style={td}>{r.parent}</td><td style={td}>{r.email}</td><td style={td}>{r.child}</td><td style={td}><AcademyBadge color={r.status==="Sent"?"#15803d":r.status==="Ready"?ACADEMY_BLUE:"#b45309"} bg={r.status==="Sent"?"#dcfce7":r.status==="Ready"?ACADEMY_SOFT:"#fff7ed"}>{r.status}</AcademyBadge></td><td style={td}><button onClick={()=>copy(r.link)} style={{border:`1px solid ${P.line}`,background:P.white,borderRadius:8,padding:"6px 9px",fontFamily:F.body,fontSize:9,fontWeight:800,cursor:"pointer"}}>Copy link</button></td></tr>)}</tbody></table></div></AcademyCard>
  </div></div>;
}
const td={padding:"10px 8px",borderBottom:`1px solid ${P.line}`,fontFamily:F.body,fontSize:10,color:P.ink};

function AcademyPreview({ planSessions, extras, skills = [], overrides = {}, published, selectedTeam }) { return <div style={{flex:1,overflow:"auto",background:"linear-gradient(180deg,#e8f7ff,#f8fbff)"}}><AcademyPageHeader title="Child Preview" sub="Exactly what a child will see after publishing" /><div style={{padding:24,display:"grid",placeItems:"center"}}><AcademyPhonePreview planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} selectedTeam={selectedTeam} /></div></div>;
}


function AcademyEngagement() { return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Engagement" sub="Completion, activity and invitation health" /><div style={{padding:24,maxWidth:1180,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}><MetricCard label="Active children" value="17" detail="of 24 this week" accent={ACADEMY_BLUE} icon="✓"/><MetricCard label="Completion" value="68%" detail="across all missions" accent="#0ea5e9" icon="◒"/><MetricCard label="XP earned" value="4,820" detail="this week" accent="#7c3aed" icon="★"/><MetricCard label="Parent opens" value="83%" detail="invitation and app links" accent="#16a34a" icon="↗"/></div></div>; }

function AcademySettings({ published }) { return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Settings" sub="Publishing, XP, privacy and parent access defaults" /><div style={{padding:24,maxWidth:900,margin:"0 auto",display:"grid",gap:12}}>{[["Publishing","Only published weeks are visible in the child app.",published?"Published":"Draft"],["Leaderboard privacy","Use first name plus surname initial by default.","Enabled"],["Default XP","Coach foundations receive 20 XP unless changed.","20 XP"],["Parent claiming","Parents can link multiple children using one account.","Enabled"]].map(x=><AcademyCard key={x[0]}><div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}><div><div style={{fontFamily:F.body,fontSize:12,fontWeight:900,color:P.ink}}>{x[0]}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:3}}>{x[1]}</div></div><AcademyBadge>{x[2]}</AcademyBadge></div></AcademyCard>)}</div></div>; }

function AcademySectionScreen({ screen, selectedTeam, weeklyPlan, planSessions, extras, skills, overrides, onSetOverride, onAddExtra, onUpdateExtra, onRemoveExtra, onMoveExtra, published, onPublish, parentRows, setParentRows }) {
  if (screen === "academy-content") return <AcademyWeeklyContent selectedTeam={selectedTeam} weeklyPlan={weeklyPlan} planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} onSetOverride={onSetOverride} onAddExtra={onAddExtra} onUpdateExtra={onUpdateExtra} onRemoveExtra={onRemoveExtra} onMoveExtra={onMoveExtra} published={published} onPublish={onPublish}/>;
  if (screen === "academy-players") return <AcademyPlayers selectedTeam={selectedTeam}/>;
  if (screen === "academy-parents") return <AcademyParents selectedTeam={selectedTeam} parentRows={parentRows} setParentRows={setParentRows}/>;
  if (screen === "academy-preview") return <AcademyPreview planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} selectedTeam={selectedTeam}/>;
  if (screen === "academy-engagement") return <AcademyEngagement/>;
  if (screen === "academy-leaderboard") return <AcademyLeaderboard extras={extras}/>;
  return <AcademySettings published={published}/>;
}

/* ============================================================
   MODULE PLACEHOLDER — for modules not yet built
   ============================================================ */
function ModulePlaceholder({ module, screen, club }) {
  const screenLabel = module.nav.find((n) => n.id === screen)?.label || screen;
  const clubName = club?.name || "Club Spraoi";
  return (
    <div style={{ flex: 1, overflow: "auto", background: `linear-gradient(180deg, ${module.color}0d 0%, ${P.soft} 320px)` }}>
      <TopBar title={screenLabel} sub={`${module.label} · ${clubName}`} />
      <div style={{ padding: "28px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ borderRadius: 22, padding: "28px 30px", background: `linear-gradient(135deg, ${module.color} 0%, ${module.color}c9 100%)`, color: module.id === "connect" ? "#332800" : "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, boxShadow: `0 18px 40px ${module.color}30`, marginBottom: 22 }}>
          <div style={{ maxWidth: 650 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", opacity: .72, marginBottom: 8 }}>{module.label} module</div>
            <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 900, lineHeight: 1.05, marginBottom: 8 }}>{screenLabel}</div>
            <div style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.55, opacity: .88 }}>{module.tagline}</div>
          </div>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 16px 34px rgba(15,23,42,.16)" }}>
            <img src={module.icon} alt={`${module.label} icon`} style={{ width: 88, height: 88, objectFit: "contain" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {module.nav.slice(0, 4).map((item, index) => (
            <div key={item.id} style={{ background: P.white, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18, boxShadow: Sh.card }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: `${module.color}12`, color: module.color, fontSize: 18, fontWeight: 900, marginBottom: 13 }}>{item.icon}</div>
              <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 15, color: P.ink }}>{item.label}</div>
              <div style={{ fontFamily: F.body, color: P.muted, fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{index === 0 ? "Your overview and priority actions will live here." : "This connected workspace is ready for the next build phase."}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccessDeniedScreen({ module, club }) {
  const clubName = club?.name || "Club Spraoi";
  return (
    <div style={{ flex: 1, overflow: "auto", background: `linear-gradient(180deg, ${module.color}10, ${P.soft} 380px)` }}>
      <TopBar title={module.label} sub={clubName} />
      <div style={{ minHeight: "calc(100vh - 60px)", display: "grid", placeItems: "center", padding: 28 }}>
        <div style={{ maxWidth: 540, width: "100%", background: P.white, borderRadius: 22, padding: 34, textAlign: "center", border: `1px solid ${P.line}`, boxShadow: Sh.lift }}>
          <div style={{ width: 100, height: 100, borderRadius: 26, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", margin: "0 auto 18px", position: "relative", boxShadow: "0 14px 30px rgba(15,23,42,.12)" }}>
            <img src={module.icon} alt="" style={{ width: 70, height: 70, objectFit: "contain", filter: "grayscale(.3)" }} />
            <span style={{ position: "absolute", right: -3, bottom: -3, width: 30, height: 30, borderRadius: "50%", background: P.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 13 }}>🔒</span>
          </div>
          <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 900, color: P.ink, margin: "0 0 8px" }}>{module.label} access required</h2>
          <p style={{ fontFamily: F.body, color: P.muted, fontSize: 13, lineHeight: 1.65, margin: "0 auto 18px", maxWidth: 420 }}>You can see every Spraoi module so the platform always feels consistent, but your current role does not include access to {module.label}. Please contact your Club Spraoi administrator.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 10, background: `${module.color}0e`, color: module.color, fontFamily: F.body, fontSize: 11, fontWeight: 800 }}>Administrator approval needed</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MOBILE BOTTOM NAV — shows modules
   ============================================================ */
function MobileHeader({ activeModule, setActiveModule, onNav, enabledModules, club, selectedTeam, ageGroups = [], myTeams = [], onSelectTeam, onShowProfile }) {
  const [open, setOpen] = useState(false);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  const mobileTeams = myTeams?.length ? ageGroups.filter((ag) => myTeams.includes(ag.id)) : ageGroups;
  function openModule(key, module) {
    if (!enabledModules.includes(key)) {
      onNav(`access-denied-${key}`);
      setOpen(false);
      return;
    }
    const target = readModuleScreen(key, module.nav[0].id);
    if (key !== APP_MODULE) {
      openAdminModule(key, target);
      return;
    }
    setActiveModule(APP_MODULE);
    onNav(target);
    setOpen(false);
  }
  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 62, zIndex: 200, padding: "0 12px", background: mod.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 5px 18px ${mod.color}35` }}>
        <button onClick={() => setOpen(true)} style={{ border: "1px solid rgba(15,23,42,.10)", background: "#fff", width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer", padding: 0, boxSizing: "border-box", boxShadow: "0 5px 14px rgba(15,23,42,.14)" }}>
          <img src={mod.icon} alt={mod.label} style={{ width: 31, height: 31, objectFit: "contain", display: "block" }} />
        </button>
        <div style={{ minWidth:0, flex:1, padding:"0 10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {mobileTeams.length > 1 ? (
            <select aria-label="Current team" value={selectedTeam?.id || ""} onChange={(e)=>{ const ag=ageGroups.find(a=>String(a.id)===String(e.target.value)); if(ag&&onSelectTeam) onSelectTeam(ag); }} style={{ maxWidth:220, width:"100%", border:"1px solid rgba(255,255,255,.42)", background:"rgba(255,255,255,.18)", color:"#fff", borderRadius:10, padding:"8px 10px", fontFamily:F.body, fontSize:16, fontWeight:900 }}>
              {!selectedTeam && <option value="" style={{color:P.ink}}>Select team</option>}
              {mobileTeams.map(ag=><option key={ag.id} value={ag.id} style={{color:P.ink}}>{teamDisplayName(ag)}</option>)}
            </select>
          ) : <div style={{fontFamily:F.body,fontSize:11,fontWeight:900}}>{selectedTeam ? teamDisplayName(selectedTeam) : clubName}</div>}
        </div>
        <button onClick={onShowProfile} aria-label="Open profile" style={{ width:42,height:42,borderRadius:12,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.14)",color:"#fff",display:"grid",placeItems:"center",fontFamily:F.display,fontWeight:900,cursor:"pointer" }}>{clubName[0]}</button>
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,18,34,.62)", padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 58, width: "100%", maxWidth: 430, background: P.white, borderRadius: 20, padding: 16, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontWeight: 900, color: P.ink, fontSize: 18, marginBottom: 12 }}>Switch module</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {Object.entries(MODULES).filter(([key]) => !["plus","connect"].includes(key)).map(([key, m]) => {
                const unlocked = enabledModules.includes(key);
                return (
                  <button key={key} onClick={() => openModule(key, m)} style={{ position: "relative", border: `1px solid ${activeModule === key ? m.color : P.line}`, background: activeModule === key ? `${m.color}0d` : P.white, borderRadius: 14, padding: 13, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" }}>
                    <img src={m.icon} alt="" style={{ width: 38, height: 38, objectFit: "contain", opacity: unlocked ? 1 : .5, filter: unlocked ? "none" : "grayscale(1)" }} />
                    <div>
                      <div style={{ fontFamily: F.display, fontWeight: 900, color: P.ink, fontSize: 13 }}>{m.label}</div>
                      <div style={{ fontFamily: F.body, color: unlocked ? P.muted : m.color, fontSize: 9 }}>{unlocked ? "Open module" : "Access required"}</div>
                    </div>
                    {!unlocked && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10 }}>🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNav({ activeModule, screen, onNav, enabledModules }) {
  const module = MODULES[activeModule];
  const hasAccess = true;
  const items = module.nav.slice(0, 5);
  if (!hasAccess) return null;
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${P.line}`, display: "flex", padding: "6px 4px calc(env(safe-area-inset-bottom, 0px) + 5px)", zIndex: 200, boxShadow: "0 -7px 24px rgba(15,35,60,.08)" }}>
      {items.map((item) => {
        const isActive = screen === item.id || (item.id === "coach-sessions" && screen === "coach-builder");
        return (
          <button key={item.id} onClick={() => onNav(item.id)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", color: isActive ? module.color : P.muted, padding: "3px 1px" }}>
            <span style={{ width: 28, height: 24, borderRadius: 8, display: "grid", placeItems: "center", background: isActive ? `${module.color}12` : "transparent", fontSize: 14, fontWeight: 900 }}><SpraoiNavIcon name={item.id} size={16} /></span>
            <span style={{ fontSize: 8, lineHeight: 1.1, fontWeight: isActive ? 900 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label.replace("Weekly ", "").replace("Parent ", "")}</span>
          </button>
        );
      })}
    </div>
  );
}


/* ============================================================
   SPRAOI CUP — real organiser screens
   Uses the same shell/layout as Coach, with Cup orange styling.
   ============================================================ */

const CUP_ORANGE = "#e65100";
const CUP_ORANGE_SOFT = "#fff3e8";

const CUP_EVENT = {
  name: "Fingallians U12 Hurling Blitz",
  date: "Saturday 22 August 2026",
  venue: "Lawless Memorial Park, Fingallians GAA, Swords",
  registration: "9:15 a.m.",
  firstThrowIn: "10:00 a.m.",
  targetFinish: "3:00 p.m.",
};

const CUP_DEFAULT_CLUBS = [
  { id: "fing", name: "Fingallians GAA", town: "Swords", county: "Dublin" },
  { id: "finian", name: "St. Finian's GAA, Swords", town: "Swords", county: "Dublin" },
  { id: "rathvilly", name: "Rathvilly GAA", town: "Rathvilly", county: "Carlow" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth" },
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath" },
  { id: "brayemmets", name: "Bray Emmets GAA", town: "Bray", county: "Wicklow" },
];

function cupBuildTeams(clubs) {
  return clubs.flatMap((c) => ["A", "B"].map((suffix) => ({
    id: `${c.id}${suffix}`,
    clubId: c.id,
    name: `${c.name} ${suffix}`,
    town: c.town,
    county: c.county,
  })));
}

function cupTeamKey(team) {
  const clubId = String(team?.clubId || "").trim();

  let grade = String(team?.grade || "").trim().toUpperCase();

  // Older Cup team records did not have a grade property.
  // Recover A/B/C/D from the team name or id so legacy rows
  // deduplicate correctly with newer competition-team records.
  if (!grade) {
    const nameMatch = String(team?.name || "").trim().match(/\b([A-D])$/i);
    if (nameMatch) grade = nameMatch[1].toUpperCase();
  }

  if (!grade && clubId) {
    const id = String(team?.id || "");
    const remainder = id.startsWith(clubId) ? id.slice(clubId.length) : "";
    const idMatch = remainder.match(/^[-_ ]?([A-D])(?:[-_ ]|$)/i);
    if (idMatch) grade = idMatch[1].toUpperCase();
  }

  return clubId && grade
    ? `${clubId}::${grade}`
    : `id::${String(team?.id || "")}`;
}

function cupNormaliseTeams(rawTeams = [], rawMatches = []) {
  const teams = Array.isArray(rawTeams) ? rawTeams.filter(Boolean) : [];
  const matches = Array.isArray(rawMatches) ? rawMatches : [];
  const referencedIds = new Set();

  matches.forEach((match) => {
    if (match?.teamA) referencedIds.add(String(match.teamA));
    if (match?.teamB) referencedIds.add(String(match.teamB));
  });

  const groups = new Map();

  teams.forEach((team) => {
    const key = cupTeamKey(team);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(team);
  });

  const idMap = {};
  const cleanedTeams = [];
  let changed = false;

  groups.forEach((group) => {
    if (!group.length) return;
    if (group.length > 1) changed = true;

    const survivor =
      group.find((team) => referencedIds.has(String(team.id))) ||
      group[0];

    const merged = { ...survivor };

    const preferText = [
      "name",
      "town",
      "county",
      "foodCode",
      "arrivalTime",
      "departureTime",
      "transportNotes",
      "logo_url",
      "primary_color",
      "secondary_color",
      "accent_color",
    ];

    preferText.forEach((field) => {
      if (merged[field]) return;
      const source = group.find((team) => team?.[field]);
      if (source) merged[field] = source[field];
    });

    ["playerCount", "mentorCount", "coachBusCount", "passengerCount"].forEach((field) => {
      merged[field] = Math.max(
        ...group.map((team) => Number(team?.[field] || 0))
      );
    });

    group.forEach((team) => {
      if (team?.id) idMap[String(team.id)] = String(survivor.id);
    });

    cleanedTeams.push(merged);
  });

  const cleanedMatches = matches.map((match) => {
    const nextTeamA = match?.teamA
      ? idMap[String(match.teamA)] || match.teamA
      : match?.teamA;

    const nextTeamB = match?.teamB
      ? idMap[String(match.teamB)] || match.teamB
      : match?.teamB;

    if (
      nextTeamA !== match?.teamA ||
      nextTeamB !== match?.teamB
    ) {
      changed = true;
    }

    return {
      ...match,
      teamA: nextTeamA,
      teamB: nextTeamB,
    };
  });

  return {
    teams: cleanedTeams,
    matches: cleanedMatches,
    idMap,
    changed,
  };
}

const CUP_DEFAULT_TEAMS = cupBuildTeams(CUP_DEFAULT_CLUBS);

async function cupLoadShared(key, fallback) {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).single();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch {
    return fallback;
  }
}

function cupScoreTotal(goals = 0, points = 0) {
  return Number(goals || 0) * 3 + Number(points || 0);
}

function cupScoreLabel(goals = 0, points = 0) {
  return `${Number(goals || 0)}-${String(Number(points || 0)).padStart(2, "0")}`;
}

function cupComputeGroups(teams, matches) {
  const groupMatches = (matches || []).filter((m) => !m.finalLabel && m.teamA && m.teamB);
  const parent = {};
  teams.forEach((t) => { parent[t.id] = t.id; });

  const find = (id) => {
    if (!parent[id]) return id;
    let current = id;
    while (parent[current] !== current) current = parent[current];
    return current;
  };

  const union = (a, b) => {
    if (!parent[a] || !parent[b]) return;
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  groupMatches.forEach((m) => union(m.teamA, m.teamB));

  const groups = {};
  teams.forEach((t) => {
    const root = find(t.id);
    groups[root] = groups[root] || [];
    groups[root].push(t);
  });
  return Object.values(groups).filter((g) => g.length > 1);
}

function cupComputeStandings(teams, matches) {
  const table = {};
  teams.forEach((t) => {
    table[t.id] = { id: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 };
  });

  const headToHead = {};
  (matches || []).filter((m) => m.status === "finished").forEach((m) => {
    const a = table[m.teamA], b = table[m.teamB];
    if (!a || !b) return;
    const sa = cupScoreTotal(m.goalsA, m.pointsA);
    const sb = cupScoreTotal(m.goalsB, m.pointsB);
    a.played += 1; b.played += 1;
    if (sa > sb) {
      a.won += 1; a.points += 3; b.lost += 1;
      headToHead[`${a.id}-${b.id}`] = a.id;
      headToHead[`${b.id}-${a.id}`] = a.id;
    } else if (sb > sa) {
      b.won += 1; b.points += 3; a.lost += 1;
      headToHead[`${a.id}-${b.id}`] = b.id;
      headToHead[`${b.id}-${a.id}`] = b.id;
    } else {
      a.drawn += 1; b.drawn += 1; a.points += 1; b.points += 1;
    }
  });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const winner = headToHead[`${a.id}-${b.id}`];
    if (winner === a.id) return -1;
    if (winner === b.id) return 1;
    return 0;
  });
}

function CupCard({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      border: "1px solid #fed7aa",
      boxShadow: "0 8px 24px rgba(124,45,18,.06), 0 1px 3px rgba(15,23,42,.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CupBtn({ label, onClick, variant = "primary", icon, style = {} }) {
  const styles = variant === "ghost"
    ? { background: "#fff", color: "#9a3412", border: "1.5px solid #fed7aa" }
    : variant === "soft"
      ? { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" }
      : { background: CUP_ORANGE, color: "#fff", border: "none", boxShadow: "0 5px 16px rgba(230,81,0,.22)" };

  return (
    <button onClick={onClick} style={{
      minHeight: 38,
      padding: "0 15px",
      borderRadius: 10,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontFamily: F.body,
      fontSize: 11,
      fontWeight: 900,
      ...styles,
      ...style,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}


function CupRichTextEditor({ value, onChange }) {
  const run = (command, arg = null) => {
    document.execCommand(command, false, arg);
  };
  const tool = (label, command, arg = null) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); run(command, arg); }} style={{ border: `1px solid ${P.line}`, background: P.white, borderRadius: 7, minWidth: 30, height: 28, padding: "0 8px", cursor: "pointer", fontFamily: F.body, fontWeight: 800, fontSize: 10, color: P.ink }}>{label}</button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "7px 8px", border: `1px solid ${P.line}`, borderBottom: 0, borderRadius: "9px 9px 0 0", background: P.soft }}>
        {tool("B", "bold")}
        {tool("I", "italic")}
        {tool("U", "underline")}
        {tool("• List", "insertUnorderedList")}
        {tool("1. List", "insertOrderedList")}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); const url = prompt("Link URL"); if (url) run("createLink", url); }} style={{ border: `1px solid ${P.line}`, background: P.white, borderRadius: 7, height: 28, padding: "0 8px", cursor: "pointer", fontFamily: F.body, fontWeight: 800, fontSize: 10, color: P.ink }}>Link</button>
        {tool("Clear", "removeFormat")}
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value || "" }}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        style={{ minHeight: 105, padding: 10, border: `1px solid ${P.line}`, borderRadius: "0 0 9px 9px", background: P.white, fontFamily: F.body, fontSize: 11, lineHeight: 1.55, color: P.ink, outline: "none" }}
      />
    </div>
  );
}

function CupTopBar({ title, sub, children }) {
  return (
    <div className="cup-page-header" style={{
      padding: "20px 28px",
      minHeight: 98,
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 56%, #fed7aa 100%)",
      borderBottom: "1px solid rgba(230,81,0,.16)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}>
      <div className="cup-page-header-main" style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div className="cup-page-header-icon" style={{
          width: 66,
          height: 66,
          borderRadius: 20,
          display: "grid",
          placeItems: "center",
          background: "#fff",
          border: "1px solid rgba(124,45,18,.10)",
          boxShadow: "0 10px 26px rgba(124,45,18,.12)",
          flexShrink: 0,
        }}>
          <img src="/spraoi-cup-icon.png" alt="" style={{ width: 50, height: 50, objectFit: "contain" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 900, color: "#c2410c", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 4 }}>Spraoi Cup</div>
          <div className="cup-page-header-title" style={{ fontFamily: F.display, fontSize: 25, fontWeight: 900, color: P.ink, lineHeight: 1.08 }}>{title}</div>
          {sub && <div className="cup-page-header-sub" style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 6, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      </div>
      {children && <div className="cup-page-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{children}</div>}
    </div>
  );
}


function CupStatCard({ label, value, sub, icon, color = CUP_ORANGE }) {
  return (
    <CupCard style={{ padding: "16px 18px", borderTop: `4px solid ${color}`, minHeight: 112 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 900, color: P.muted, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
        {icon && <span style={{ width: 30, height: 30, borderRadius: 9, background: `${color}12`, display: "grid", placeItems: "center", fontSize: 15 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: F.display, fontSize: 29, fontWeight: 900, color: P.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
    </CupCard>
  );
}


const cupParticipantBase=()=>{
  if(typeof window!=="undefined"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")){
    return "http://localhost:5182";
  }
  return cupParticipantBase();
};

function CupModuleScreen({ screen, onNav, contextTeam, selectedEventId = "", cupStore = null, canEditSchedule = false, canManageAllEvents = false }) {
  const storeEventsKey = cupStore?.CUP_EVENTS_KEY || CUP_EVENTS_KEY;
  const storeRead = cupStore?.cupRead || cupRead;
  const storeReadSection = cupStore?.cupReadSection || cupReadSection;
  const storeWriteSection = cupStore?.cupWriteSection || cupWriteSection;
  const storeActiveEvent = cupStore?.cupActiveEvent || cupActiveEvent;
  const storeSetActiveEvent = cupStore?.cupSetActiveEvent || cupSetActiveEvent;
  const storeCreateEvent = cupStore?.cupCreateEvent || cupCreateEvent;
  const storeUpdateEvent = cupStore?.cupUpdateEvent || cupUpdateEvent;
  const storeDuplicateEvent = cupStore?.cupDuplicateEvent || cupDuplicateEvent;
  const DEFAULT_CONFIG={startTime:"10:00",targetFinish:"15:00",matchDurationMins:20,turnaroundMins:5,lunchMinutes:30,lunchCapacity:90,presentationMinutes:15,groupCount:2,pitches:[{id:"p1",name:"Pitch 1"},{id:"p2",name:"Pitch 2"},{id:"p3",name:"Pitch 3"}],placements:[{id:"cup",label:"Cup",enabled:true,rank:1},{id:"shield",label:"Shield",enabled:true,rank:2},{id:"plate",label:"Plate",enabled:false,rank:3},{id:"bowl",label:"Bowl",enabled:false,rank:4}],stages:[]};
  const DEFAULT_INFO={
    welcomeMessage:"Teams are to arrive by 9:15 a.m. for registration at Lawless Park, Fingallians. On arrival, register your team then proceed to the club ball wall for a team photo. Opening procession at 9:30 a.m., first throw-in at 10:00 a.m., with a target finish of 3:00 p.m.",
    facilities:"Pitch 1 is on the all-weather surface. Pitches 2 and 3 are on the main grass pitch. The ball wall for team photos is beside the playing areas. Toilets are at the Fingallians clubhouse through the changing-room entrance. Tents, gazebos or changing rooms will be allocated to visiting teams where available for storing kit bags. Main-pitch matches can be viewed from the hill on the far side; all-weather matches can be watched from outside the pitch.",
    parking:"Limited car parking is available at Fingallians GAA, and buses are welcome to park on site. Overflow parking has been kindly provided by the HSE at Swords Business Campus, a short ten-minute walk from the grounds. Stewards will be on duty at both locations to guide you.",
    foodAndDrink:"Please bring your own water bottles; a refill station is outside the changing rooms. Teams can receive player and mentor vouchers for burgers at lunchtime, with teams called at their allocated lunch time to avoid queues, plus tea or coffee vouchers for mentors. Teas, coffees and breakfast sausage rolls can also be made available to purchase during the day.",
    healthAndSafety:"The Order of Malta will provide medical assistance at the entrance to the main pitch; teams are welcome to bring their own first-aid kits. Only players, mentors and referees are permitted on the all-weather surface and appropriate footwear must be worn. Spectators must remain around the sides of the pitches and not between adjacent pitches. Mentors should remain clearly identifiable and must not enter the field of play unless required.",
    arrivalRegistration:"Teams are to arrive by 9:15 a.m. for registration. On arrival, register your team and follow organiser directions for team photos or opening activities.",
    venueInfo:"Pitch and venue layout information can be added here, including which pitches are grass/all-weather and where team meeting points are located.",
    playingRules:"Add the event playing rules here, including team size, substitutions, match length, scoring, tiebreakers and any event-specific rules.",
    contacts:"Add event-day contact details or instructions here. Announcements can also be used for live updates.",
    other:"Updates during the day can be circulated to lead mentors and published as announcements in the participant app. The organising committee may amend the event structure where necessary to keep the day running safely and on time.",
    customSections:[]
  };
  const [events,setEvents]=useState([]),[eventId,setEventId]=useState(storeActiveEvent()),[event,setEvent]=useState(null),[clubs,setClubs]=useState(CUP_DEFAULT_CLUBS),[teams,setTeams]=useState(CUP_DEFAULT_TEAMS),[matches,setMatches]=useState([]),[config,setConfig]=useState(DEFAULT_CONFIG),[refs,setRefs]=useState([]),[announcements,setAnnouncements]=useState([]),[info,setInfo]=useState(DEFAULT_INFO),[sponsors,setSponsors]=useState([]),[food,setFood]=useState([]),[orders,setOrders]=useState([]),[lunchWindows,setLunchWindows]=useState([]),[loading,setLoading]=useState(true),[saveState,setSaveState]=useState("saved"),[editingAnnouncementId,setEditingAnnouncementId]=useState(null),[editingSponsorId,setEditingSponsorId]=useState(null);
  const inp={border:`1px solid ${P.line}`,borderRadius:9,padding:"8px 9px",fontFamily:F.body,fontSize:11,color:P.ink,background:P.white,width:"100%",boxSizing:"border-box"};
  const uid=(p="x")=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const eventBelongsToTeam=(e,teamId)=>Boolean(teamId) && Boolean(e?.ownerTeamId) && String(e.ownerTeamId)===String(teamId);
  const isArchivedEvent=(e)=>String(e?.status||"").toLowerCase()==="archived";
  const eventDateKey=(e)=>{
    const raw=String(e?.date||"").trim();
    if(!raw)return "";
    const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const todayEventKey=()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const isPastEvent=(e)=>{
    const key=eventDateKey(e);
    return Boolean(key) && key<todayEventKey();
  };
  const isEventDay=(e)=>{
    const key=eventDateKey(e);
    return Boolean(key) && key===todayEventKey();
  };
  const effectiveEventStatus=(e)=>{
    const stored=String(e?.status||"draft").toLowerCase();
    if(stored==="archived")return "archived";
    if(stored==="draft")return "draft";
    if(isPastEvent(e))return "past";
    if(isEventDay(e))return "live";
    return "published";
  };
  const eventsForSelectedTeam=contextTeam?.id ? events.filter((e)=>eventBelongsToTeam(e,contextTeam.id) && !isArchivedEvent(e)) : events.filter((e)=>!isArchivedEvent(e));

  const archiveEvent=async(e)=>{
    if(!e?.id)return;
    if(!confirm(`Archive "${e.name}"?\n\nArchived events are kept with all teams, fixtures, results, event content and orders, but are removed from the normal Upcoming and Past event lists.`))return;

    await storeUpdateEvent(e.id,{
      status:"archived",
      archivedAt:new Date().toISOString(),
    });

    const next=await storeRead(storeEventsKey,[]);
    setEvents(Array.isArray(next)?next:[]);

    if(String(e.id)===String(eventId)){
      setEventId("");
      setEvent(null);
      storeSetActiveEvent("");
      setClubs([]);
      setTeams([]);
      setMatches([]);
      setRefs([]);
      setAnnouncements([]);
      setSponsors([]);
      setFood([]);
      setOrders([]);
      setLunchWindows([]);
    }
  };

  const restoreArchivedEvent=async(e)=>{
    if(!e?.id)return;
    await storeUpdateEvent(e.id,{
      status:"published",
      archivedAt:null,
      restoredAt:new Date().toISOString(),
    });
    const next=await storeRead(storeEventsKey,[]);
    setEvents(Array.isArray(next)?next:[]);
  };

  const deleteEventPermanently=async(e)=>{
    if(!e?.id)return;

    const first=confirm(`Delete "${e.name}" permanently?\n\nOnly use Delete for test events, mistakes or accidental duplicates. Real events should be archived.`);
    if(!first)return;

    const typed=prompt(`Type DELETE to permanently remove "${e.name}".`);
    if(String(typed||"").trim().toUpperCase()!=="DELETE")return;

    const all=await storeRead(storeEventsKey,[]);
    const nextEvents=(Array.isArray(all)?all:[]).filter((x)=>String(x.id)!==String(e.id));

    // CUP_EVENTS_KEY is the only non-section key. Write it directly through the same kv_store table.
    const { error:eventListError }=await supabase
      .from("kv_store")
      .upsert({key:storeEventsKey,value:nextEvents},{onConflict:"key"});
    if(eventListError)throw eventListError;

    // Remove every per-event kv_store section. This also removes future/unknown
    // sections rather than relying on a hard-coded section list.
    const prefix=`cup:event:${e.id}:`;
    const { data:sectionRows, error:sectionLookupError }=await supabase
      .from("kv_store")
      .select("key")
      .like("key",`${prefix}%`);
    if(sectionLookupError)throw sectionLookupError;

    const keys=(sectionRows||[]).map((row)=>row.key).filter(Boolean);
    if(keys.length){
      const { error:deleteSectionsError }=await supabase
        .from("kv_store")
        .delete()
        .in("key",keys);
      if(deleteSectionsError)throw deleteSectionsError;
    }

    setEvents(nextEvents);

    if(String(e.id)===String(eventId)){
      setEventId("");
      setEvent(null);
      storeSetActiveEvent("");
      setClubs([]);
      setTeams([]);
      setMatches([]);
      setRefs([]);
      setAnnouncements([]);
      setSponsors([]);
      setFood([]);
      setOrders([]);
      setLunchWindows([]);
    }
  };
  const save=async(section,value,setter)=>{
    setter(value);
    if(!eventId)return;
    setSaveState("saving");
    try{await storeWriteSection(eventId,section,value);setSaveState("saved")}
    catch(error){console.error(`Cup ${section} save failed`,error);setSaveState("error");throw error}
  };
  const loadEvent=async(id)=>{
    if(!id){setLoading(false);return}
    setLoading(true);
    try {
      const es=await storeRead(storeEventsKey,[]);
      setEvents(Array.isArray(es)?es:[]);
      setEvent(es.find(e=>String(e.id)===String(id))||null);
      const vals=await Promise.all([["clubs",CUP_DEFAULT_CLUBS],["teams",CUP_DEFAULT_TEAMS],["matches",[]],["config",DEFAULT_CONFIG],["refereeAccess",[]],["announcements",[]],["eventInfo",DEFAULT_INFO],["sponsors",[]],["foodMenu",[]],["orders",[]],["lunchWindows",[]]].map(([k,f])=>storeReadSection(id,k,f)));
      const loadedClubs=Array.isArray(vals[0])?vals[0]:[];
      const rawTeams=Array.isArray(vals[1])?vals[1]:[];
      const rawMatches=Array.isArray(vals[2])?vals[2]:[];

      const normalised=cupNormaliseTeams(rawTeams,rawMatches);

      const rawOrders=Array.isArray(vals[9])?vals[9]:[];
      let ordersChanged=false;

      const cleanedOrders=rawOrders.map((order)=>{
        const mapped=order?.teamId
          ? normalised.idMap[String(order.teamId)]
          : null;

        if(mapped && mapped!==String(order.teamId)){
          ordersChanged=true;
          return {...order,teamId:mapped};
        }

        return order;
      });

      setClubs(loadedClubs);
      setTeams(normalised.teams);
      setMatches(normalised.matches);
      setConfig({...DEFAULT_CONFIG,...(vals[3]||{})});
      setRefs(Array.isArray(vals[4])?vals[4]:[]);
      setAnnouncements(Array.isArray(vals[5])?vals[5]:[]);
      setInfo({...DEFAULT_INFO,...(vals[6]||{})});
      setSponsors(Array.isArray(vals[7])?vals[7]:[]);
      setFood(Array.isArray(vals[8])?vals[8]:[]);
      setOrders(cleanedOrders);
      setLunchWindows(Array.isArray(vals[10])?vals[10]:[]);

      if(normalised.changed){
        await storeWriteSection(id,"teams",normalised.teams);
        await storeWriteSection(id,"matches",normalised.matches);
      }

      if(ordersChanged){
        await storeWriteSection(id,"orders",cleanedOrders);
      }
    } catch (error) {
      console.error("Cup event load failed",error);
      setEvent(null);
      setClubs([]);setTeams([]);setMatches([]);setRefs([]);setAnnouncements([]);setSponsors([]);setFood([]);setOrders([]);setLunchWindows([]);
    } finally { setLoading(false); }
  };
  const [broadcastSelectedEventId,setBroadcastSelectedEventId]=useState("");

  // ONE source of truth for the active Cup event.
  // Admin passes selectedEventId directly; standalone Cup can also update
  // through the shared browser event / cupActiveEvent fallback.
  useEffect(()=>{
    let cancelled=false;

    (async()=>{
      setLoading(true);

      try{
        const esRaw=await storeRead(storeEventsKey,[]);
        if(cancelled)return;

        const es=Array.isArray(esRaw)?esRaw:[];
        setEvents(es);

        const requestedId=String(
          selectedEventId ||
          broadcastSelectedEventId ||
          storeActiveEvent() ||
          ""
        ).trim();

        const selected=requestedId
          ? es.find((e)=>String(e.id)===requestedId && !isArchivedEvent(e))
          : null;

        const belongsToCurrentTeam=selected && (
          !contextTeam?.id ||
          eventBelongsToTeam(selected,contextTeam.id)
        );

        if(!selected || !belongsToCurrentTeam){
          setEventId("");
          setEvent(null);
          setClubs([]);
          setTeams([]);
          setMatches([]);
          setRefs([]);
          setAnnouncements([]);
          setSponsors([]);
          setFood([]);
          setOrders([]);
          setLunchWindows([]);
          setLoading(false);
          return;
        }

        setEventId(selected.id);
        storeSetActiveEvent(selected.id);
        await loadEvent(selected.id);
      }catch(error){
        console.error("Cup active event load failed",error);
        if(!cancelled){
          setEventId("");
          setEvent(null);
          setClubs([]);
          setTeams([]);
          setMatches([]);
          setRefs([]);
          setAnnouncements([]);
          setSponsors([]);
          setFood([]);
          setOrders([]);
          setLunchWindows([]);
          setLoading(false);
        }
      }
    })();

    return()=>{cancelled=true};
  },[selectedEventId,broadcastSelectedEventId,contextTeam?.id]);

  useEffect(()=>{
    const handleSelectedEvent=(event)=>{
      const id=String(event?.detail?.eventId || storeActiveEvent() || "").trim();
      setBroadcastSelectedEventId(id);
    };

    window.addEventListener("spraoi-cup-event-selected",handleSelectedEvent);
    return()=>window.removeEventListener("spraoi-cup-event-selected",handleSelectedEvent);
  },[]);

  const switchEvent=async(id)=>{
    const nextId=String(id||"").trim();
    storeSetActiveEvent(nextId);
    setBroadcastSelectedEventId(nextId);
    if(onNav)onNav("cup-dashboard");
  };
  const createEvent=async()=>{const name=prompt("Event name");if(!name)return;const date=prompt("Event date (YYYY-MM-DD)","")||"";const venue=prompt("Venue","")||"";const e=await storeCreateEvent({name,date,venue,ownerTeamId:contextTeam?.id||"",ownerTeamLabel:contextTeam?.label||contextTeam?.name||""});setEvents(await storeRead(storeEventsKey,[]));await switchEvent(e.id)};
  const duplicate=async(e)=>{const name=prompt("New event name",`${e.name} Copy`);if(!name)return;const date=prompt("New event date (YYYY-MM-DD)","")||"";const n=await storeDuplicateEvent(e,{name,date,venue:e.venue,ownerTeamId:e.ownerTeamId||contextTeam?.id||"",ownerTeamLabel:e.ownerTeamLabel||contextTeam?.label||contextTeam?.name||""});setEvents(await storeRead(storeEventsKey,[]));await switchEvent(n.id)};
  const teamById=id=>teams.find(t=>t.id===id)||{name:id||"TBC"};
  const clubById=id=>clubs.find(c=>c.id===id)||{id,name:id||"Unknown club"};
  const finished=matches.filter(m=>m.status==="finished"),live=matches.filter(m=>m.status==="live"),pitches=config.pitches||[];
  const field=(label,child)=><label style={{display:"grid",gap:5,fontFamily:F.body,fontSize:9,fontWeight:800,color:P.muted,textTransform:"uppercase"}}>{label}{child}</label>;
  const setEventStatus=async(status)=>{
    const updated=await storeUpdateEvent(eventId,{status});
    setEvent(updated);
    setEvents(await storeRead(storeEventsKey,[]));
  };
  const currentEffectiveStatus=effectiveEventStatus(event);
  const statusLabel=currentEffectiveStatus.toUpperCase();
  const statusColor=currentEffectiveStatus==="live"?"#c62828":currentEffectiveStatus==="published"?"#2e7d32":currentEffectiveStatus==="past"?P.muted:currentEffectiveStatus==="archived"?P.muted:CUP_ORANGE;
  const sectionWrap=(title,sub,children,action)=><div style={{flex:1,overflow:"auto",background:"#fffaf5"}}>
    <style>{`
      @media (max-width: 900px) {
        .cup-dashboard-stats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        .cup-dashboard-main { grid-template-columns: 1fr !important; }
        .cup-page-header { padding: 16px !important; align-items: flex-start !important; flex-direction: column !important; min-height: auto !important; }
        .cup-page-header-actions { width: 100% !important; justify-content: flex-start !important; }
      }
      @media (max-width: 560px) {
        .cup-dashboard-stats { grid-template-columns: 1fr !important; }
        .cup-page-header-main { align-items: flex-start !important; }
        .cup-page-header-icon { width: 52px !important; height: 52px !important; border-radius: 16px !important; }
        .cup-page-header-icon img { width: 39px !important; height: 39px !important; }
        .cup-page-header-title { font-size: 21px !important; }
        .cup-page-header-actions > button { flex: 1 1 auto !important; }
      }
    `}</style>
    <CupTopBar title={title} sub={sub}>{action}</CupTopBar>
    {event && <div style={{margin:"16px 24px 0",padding:"15px 16px",borderRadius:18,background:"#fff",border:"1px solid #fed7aa",boxShadow:"0 8px 24px rgba(124,45,18,.06)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
      <div style={{minWidth:220,flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
          <div style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:CUP_ORANGE,textTransform:"uppercase",letterSpacing:".1em"}}>Current event</div>
          <span style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:statusColor,background:`${statusColor}12`,border:`1px solid ${statusColor}30`,borderRadius:999,padding:"3px 7px"}}>{statusLabel}</span>
          <span style={{fontFamily:F.body,fontSize:8,fontWeight:800,color:saveState==="error"?"#b91c1c":P.muted}}>{saveState==="saving"?"Saving…":saveState==="error"?"Save failed":"✓ Autosaved"}</span>
        </div>
        <div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:P.ink,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{event.name}</div>
        <div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:4}}>{event.date || "Date TBC"}{event.venue ? ` · ${event.venue}` : ""}{event.ownerTeamLabel?` · ${event.ownerTeamLabel}`:" · Unassigned event"}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {event.status==="draft"&&<CupBtn label="Publish Event" icon="↑" onClick={()=>confirm("Publish this event to the participant app?\n\nOnce published, it will show as LIVE automatically on the event date and move to Past Events the following day.")&&setEventStatus("published")}/>}
        {eventsForSelectedTeam.length>0 ? (
          <select value={eventId} onChange={e=>switchEvent(e.target.value)} style={{...inp,width:225,fontWeight:800,borderColor:"#fdba74",background:"#fffaf5"}}>
            {eventsForSelectedTeam.map(ev=><option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        ) : contextTeam?.id ? (
          <button onClick={()=>onNav("cup-events")} style={{height:36,padding:"0 13px",borderRadius:10,border:"1.5px solid #fdba74",background:"#fffaf5",color:CUP_ORANGE,fontFamily:F.body,fontSize:10,fontWeight:900,cursor:"pointer"}}>No event for this team</button>
        ) : null}
      </div>
    </div>}
    <div style={{padding:24,maxWidth:1280,margin:"0 auto"}}>{children}</div>
  </div>;
  if(loading)return sectionWrap("Cup","Loading tournament data…",<div style={{color:P.muted}}>Loading…</div>);
  if(!event && screen!=="cup-events"){
    const unassignedEvents=(events||[]).filter((e)=>!e?.ownerTeamId);
    const claimLegacyEvent=async(e)=>{
      if(!contextTeam?.id)return;
      const targetLabel=teamDisplayName(contextTeam);
      if(!confirm(`Assign "${e.name}" to ${targetLabel}?\n\nThis is a one-time migration of this legacy Cup event. After assignment it will only appear for ${targetLabel}.`))return;

      const updated=await storeUpdateEvent(e.id,{
        ownerTeamId:contextTeam.id,
        ownerTeamLabel:targetLabel,
      });

      const allEvents=await storeRead(storeEventsKey,[]);
      setEvents(Array.isArray(allEvents)?allEvents:[]);
      storeSetActiveEvent(updated.id);
      setBroadcastSelectedEventId(updated.id);
      onNav("cup-dashboard");
    };

    return sectionWrap(
      "Cup",
      contextTeam?`${teamDisplayName(contextTeam)} · no Cup event selected`:"No Cup event selected",
      <CupCard style={{padding:22,maxWidth:760}}>
        <div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:P.ink}}>No Cup event is assigned to this team</div>
        <div style={{fontFamily:F.body,fontSize:10.5,color:P.muted,lineHeight:1.6,marginTop:7}}>
          {unassignedEvents.length
            ? "You have older Cup events that were created before events were linked to exact teams. Choose the correct event below to assign it to this team once."
            : "There are no unassigned legacy events available. Open Events to create a new Cup event for this team."}
        </div>

        {unassignedEvents.length>0 && (
          <div style={{display:"grid",gap:8,marginTop:14}}>
            {unassignedEvents.map((e)=>(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"11px 12px",border:`1px solid ${P.line}`,borderRadius:12,background:P.soft,flexWrap:"wrap"}}>
                <div style={{minWidth:200,flex:1}}>
                  <div style={{fontFamily:F.display,fontSize:13,fontWeight:900,color:P.ink}}>{e.name}</div>
                  <div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:3}}>
                    {e.date||"Date TBC"}{e.venue?` · ${e.venue}`:""} · Unassigned legacy event
                  </div>
                </div>
                <CupBtn label={`Assign to ${teamDisplayName(contextTeam)}`} onClick={()=>claimLegacyEvent(e)}/>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:14}}>
          <CupBtn label="Open Events" variant="ghost" onClick={()=>onNav("cup-events")}/>
        </div>
      </CupCard>
    );
  }
  if(screen==="cup-matchday")return sectionWrap("Matchday","Scores and referee access in one place",<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><CupCard style={{padding:18}}><div style={{fontFamily:F.display,fontSize:18,fontWeight:900}}>Results & Scoring</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,lineHeight:1.6,margin:"6px 0 14px"}}>Lead coaches can enter or correct any match score and status.</div><CupBtn label="Open Results" onClick={()=>onNav("cup-results")}/></CupCard><CupCard style={{padding:18}}><div style={{fontFamily:F.display,fontSize:18,fontWeight:900}}>Referee Access</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,lineHeight:1.6,margin:"6px 0 14px"}}>Create pitch-only referee links, codes and reset access.</div><CupBtn label="Manage Referees" onClick={()=>onNav("cup-referees")}/></CupCard></div>);
  if(screen==="cup-content"){
    const infoItems=[
      ["Welcome",info.welcomeMessage],["Arrival & Registration",info.arrivalRegistration],["Facilities",info.facilities],
      ["Parking & Directions",info.parking],["Pitch / Venue Information",info.venueInfo],["Food & Drink",info.foodAndDrink],
      ["Health & Safety / Medical",info.healthAndSafety],["Playing Rules",info.playingRules],["Contacts",info.contacts],["Other",info.other],
      ...(Array.isArray(info.customSections)?info.customSections.map((section)=>[section.heading||"Additional Information",section.content]):[])
    ].filter(([,v])=>String(v||"").trim());
    return sectionWrap("Event Content","See what participants will receive without opening each editor",<>
      <div style={{display:"grid",gridTemplateColumns:"1.25fr 1fr 1fr",gap:14}}>
        <CupCard style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:17,fontWeight:900}}>Event Information</div><CupBtn label="Edit" variant="ghost" onClick={()=>onNav("cup-information")}/></div>
          {infoItems.length?infoItems.map(([label,value])=><div key={label} style={{padding:"9px 0",borderTop:`1px solid ${P.line}`}}><div style={{fontSize:8,fontWeight:900,color:CUP_ORANGE,textTransform:"uppercase"}}>{label}</div><div style={{fontSize:9.5,color:P.ink,lineHeight:1.5,marginTop:3}}>{String(value).length>150?`${String(value).slice(0,150)}…`:value}</div></div>):<div style={{fontSize:10,color:P.muted,marginTop:10}}>No event information added yet.</div>}
        </CupCard>
        <CupCard style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:17,fontWeight:900}}>Announcements</div><CupBtn label="Manage" variant="ghost" onClick={()=>onNav("cup-announcements")}/></div>
          {announcements.length?announcements.slice(0,6).map(a=><div key={a.id} style={{padding:"9px 0",borderTop:`1px solid ${P.line}`}}><div style={{fontSize:10,fontWeight:900,color:P.ink,textTransform:"none"}}>{a.emoji||"📣"} {a.title||"Untitled"}</div><div style={{fontSize:8.5,color:P.muted,marginTop:2,textTransform:"none"}}>{a.status||"draft"}{a.publishAt?` · ${new Date(a.publishAt).toLocaleString()}`:""}</div></div>):<div style={{fontSize:10,color:P.muted,marginTop:10}}>No announcements yet.</div>}
        </CupCard>
        <CupCard style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:17,fontWeight:900}}>Sponsors</div><CupBtn label="Manage" variant="ghost" onClick={()=>onNav("cup-sponsors")}/></div>
          {sponsors.length?sponsors.slice(0,6).map(s=><div key={s.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderTop:`1px solid ${P.line}`,opacity:s.active===false?.5:1}}><div style={{width:42,height:32,borderRadius:7,border:`1px solid ${P.line}`,display:"grid",placeItems:"center",overflow:"hidden"}}>{s.logo_url?<img src={s.logo_url} style={{maxWidth:"88%",maxHeight:"84%",objectFit:"contain"}}/>:<span style={{fontSize:7}}>Logo</span>}</div><div><div style={{fontSize:10,fontWeight:900}}>{s.name||"Unnamed sponsor"}</div><div style={{fontSize:8,color:P.muted}}>{s.label||"Supporting Sponsor"}</div></div></div>):<div style={{fontSize:10,color:P.muted,marginTop:10}}>No sponsors added.</div>}
        </CupCard>
      </div>
      <CupCard style={{padding:16,marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div><div style={{fontFamily:F.display,fontSize:15,fontWeight:900}}>Participant Preview</div><div style={{fontSize:9,color:P.muted,marginTop:3}}>Open the participant-facing app for this event.</div></div>
        <CupBtn label="Open Preview" onClick={()=>onNav("cup-participant-view")}/>
      </CupCard>
    </>);
  }
  if(screen==="cup-events"){
    const currentTeamLabel=teamDisplayName(contextTeam,"selected team");
    const visibleEvents=canManageAllEvents
      ? events
      : (events||[]).filter((e)=>!e?.ownerTeamId || (contextTeam?.id && String(e.ownerTeamId)===String(contextTeam.id)));
    const activeEvents=visibleEvents.filter((e)=>!isArchivedEvent(e));
    const upcomingEvents=activeEvents
      .filter((e)=>!isPastEvent(e))
      .sort((a,b)=>String(eventDateKey(a)||"9999-12-31").localeCompare(String(eventDateKey(b)||"9999-12-31")));
    const pastEvents=activeEvents
      .filter((e)=>isPastEvent(e))
      .sort((a,b)=>String(eventDateKey(b)||"").localeCompare(String(eventDateKey(a)||"")));
    const archivedEvents=visibleEvents
      .filter((e)=>isArchivedEvent(e))
      .sort((a,b)=>String(eventDateKey(b)||"").localeCompare(String(eventDateKey(a)||"")));
    const assignEvent=async(e)=>{
      if(!contextTeam?.id)return;
      const action=e.ownerTeamId ? "Move" : "Assign";
      if(!confirm(`${action} "${e.name}" to ${currentTeamLabel}?`))return;
      const updated=await storeUpdateEvent(e.id,{ownerTeamId:contextTeam.id,ownerTeamLabel:currentTeamLabel});
      const next=await storeRead(storeEventsKey,[]);
      setEvents(Array.isArray(next)?next:[]);
      if(updated?.id){
        storeSetActiveEvent(updated.id);
        setBroadcastSelectedEventId(updated.id);
      }
    };

    return sectionWrap("Events","All saved Cup events. Assign each event to the team that owns it.",<div style={{display:"grid",gap:14}}>
      {event && <CupCard style={{padding:16}}>
        <div style={{fontFamily:F.display,fontSize:17,fontWeight:900,marginBottom:10}}>Current event details</div>
        <div style={{display:"grid",gridTemplateColumns:"1.3fr .8fr 1fr",gap:10}}>
          {field("Event name",<input value={event?.name||""} onChange={e=>setEvent({...event,name:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{name:event.name});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}
          {field("Date",<input type="date" value={event?.date||""} onChange={e=>setEvent({...event,date:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{date:event.date});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}
          {field("Venue",<input value={event?.venue||""} onChange={e=>setEvent({...event,venue:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{venue:event.venue});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}
        </div>
      </CupCard>}

      {!events.length ? (
        <CupCard style={{padding:22,textAlign:"center"}}>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>No Cup events saved yet</div>
          <div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:5}}>Create the first event for {currentTeamLabel}.</div>
        </CupCard>
      ) : (
        <>
          <div style={{display:"grid",gap:10}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>Upcoming Events</div>
              <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:2}}>Published events switch to LIVE automatically on their event date.</div>
            </div>

            {upcomingEvents.length===0 ? (
              <CupCard style={{padding:18}}>
                <div style={{fontFamily:F.body,fontSize:10,color:P.muted}}>No upcoming events.</div>
              </CupCard>
            ) : upcomingEvents.map(e=>{
              const assigned=Boolean(e.ownerTeamId);
              const belongsHere=contextTeam?.id&&eventBelongsToTeam(e,contextTeam.id);
              const effective=effectiveEventStatus(e);
              return <CupCard key={e.id} style={{padding:16,borderLeft:e.id===eventId?`4px solid ${CUP_ORANGE}`:undefined}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{minWidth:220,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      <div style={{fontFamily:F.display,fontSize:17,fontWeight:900}}>{e.name}</div>
                      <span style={{fontFamily:F.body,fontSize:8,fontWeight:900,borderRadius:999,padding:"3px 7px",background:assigned?"#eef7ff":"#fff4de",color:assigned?"#1565c0":"#a14d00"}}>{assigned?(e.ownerTeamLabel||"Assigned"):"Unassigned"}</span>
                      <span style={{fontFamily:F.body,fontSize:8,fontWeight:900,borderRadius:999,padding:"3px 7px",background:effective==="live"?"#fee2e2":effective==="published"?"#dcfce7":"#fff4de",color:effective==="live"?"#b91c1c":effective==="published"?"#166534":"#a14d00"}}>{effective.toUpperCase()}</span>
                    </div>
                    <div style={{fontSize:10,color:P.muted,marginTop:4}}>{e.date||"Date TBC"}{e.venue?` · ${e.venue}`:""}</div>
                  </div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {belongsHere && <CupBtn label="Open" variant="ghost" onClick={()=>switchEvent(e.id)}/>}
                    {!contextTeam?.id && <CupBtn label="Open" variant="ghost" onClick={()=>switchEvent(e.id)}/>}
                    {contextTeam?.id && !belongsHere && !assigned && <CupBtn label={`Assign to ${currentTeamLabel}`} variant="ghost" onClick={()=>assignEvent(e)}/>}
                    {contextTeam?.id && canManageAllEvents && assigned && !belongsHere && <CupBtn label="Move to current team" variant="ghost" onClick={()=>assignEvent(e)}/>}
                    <CupBtn label="Duplicate" variant="ghost" onClick={()=>duplicate(e)}/>
                    <CupBtn label="Archive" variant="ghost" onClick={()=>archiveEvent(e)}/>
                    <CupBtn label="Delete" variant="ghost" onClick={()=>deleteEventPermanently(e)}/>
                  </div>
                </div>
              </CupCard>
            })}
          </div>

          <div style={{display:"grid",gap:10,marginTop:14}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>Past Events</div>
              <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:2}}>Events move here automatically the day after their event date.</div>
            </div>

            {pastEvents.length===0 ? (
              <CupCard style={{padding:18}}>
                <div style={{fontFamily:F.body,fontSize:10,color:P.muted}}>No past events yet.</div>
              </CupCard>
            ) : pastEvents.map(e=>{
              const belongsHere=contextTeam?.id&&eventBelongsToTeam(e,contextTeam.id);
              return <CupCard key={e.id} style={{padding:15,opacity:.94}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{minWidth:220,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      <div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>{e.name}</div>
                      <span style={{fontFamily:F.body,fontSize:8,fontWeight:900,borderRadius:999,padding:"3px 7px",background:"#f1f5f9",color:P.muted}}>PAST</span>
                    </div>
                    <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>
                      {e.date||"Date TBC"}{e.venue?` · ${e.venue}`:""}{e.ownerTeamLabel?` · ${e.ownerTeamLabel}`:""}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {(belongsHere||!contextTeam?.id)&&<CupBtn label="Open" variant="ghost" onClick={()=>switchEvent(e.id)}/>}
                    <CupBtn label="Duplicate" variant="ghost" onClick={()=>duplicate(e)}/>
                    <CupBtn label="Archive" variant="ghost" onClick={()=>archiveEvent(e)}/>
                    <CupBtn label="Delete" variant="ghost" onClick={()=>deleteEventPermanently(e)}/>
                  </div>
                </div>
              </CupCard>
            })}
          </div>
        </>
      )}

      {archivedEvents.length>0 && (
        <div style={{display:"grid",gap:10,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>Archived events</div>
              <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:2}}>Archived event history is kept here and removed from the normal Upcoming and Past event lists.</div>
            </div>
            <span style={{fontFamily:F.body,fontSize:9,fontWeight:900,padding:"4px 8px",borderRadius:999,background:P.soft,color:P.muted}}>{archivedEvents.length}</span>
          </div>

          {archivedEvents.map((e)=>(
            <CupCard key={e.id} style={{padding:14,opacity:.88}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{minWidth:220,flex:1}}>
                  <div style={{fontFamily:F.display,fontSize:15,fontWeight:900,color:P.ink}}>{e.name}</div>
                  <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>
                    {e.date||"Date TBC"}{e.venue?` · ${e.venue}`:""}{e.ownerTeamLabel?` · ${e.ownerTeamLabel}`:""} · Archived
                  </div>
                </div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  <CupBtn label="Restore" variant="ghost" onClick={()=>restoreArchivedEvent(e)}/>
                  <CupBtn label="Delete" variant="ghost" onClick={()=>deleteEventPermanently(e)}/>
                </div>
              </div>
            </CupCard>
          ))}
        </div>
      )}
    </div>,<CupBtn label="+ Create Event" onClick={createEvent}/>);
  }
  if(screen==="cup-teams"){
    const grades=["A","B","C","D"];
    const toggleGrade=async(club,grade,enabled)=>{
      const existingTeams=teams.filter(
        t=>t.clubId===club.id&&String(t.grade||"").toUpperCase()===grade
      );

      const existing=existingTeams[0];

      if(enabled&&!existing){
        const t={
          id:`${club.id}-${grade}-${Date.now()}`,
          clubId:club.id,
          name:`${club.name} ${grade}`,
          grade,
          playerCount:0,
          mentorCount:0,
          foodCode:String(Math.floor(1000+Math.random()*9000)),
          coachBusCount:0,
          passengerCount:0,
          arrivalTime:"",
          departureTime:"",
          transportNotes:""
        };

        await save("teams",[...teams,t],setTeams);
        return;
      }

      if(!enabled&&existingTeams.length){
        const ids=new Set(existingTeams.map(t=>String(t.id)));

        const used=matches.some(
          m=>ids.has(String(m.teamA))||ids.has(String(m.teamB))
        );

        if(
          used &&
          !confirm(`${existing.name} already has fixtures. Removing this grade will leave those fixtures without that team. Continue?`)
        ) return;

        await save(
          "teams",
          teams.filter(
            t=>!(
              t.clubId===club.id &&
              String(t.grade||"").toUpperCase()===grade
            )
          ),
          setTeams
        );
      }
    };
    return sectionWrap("Teams",`${clubs.length} clubs · ${teams.length} competition teams`,<>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><CupBtn label="+ Add Club" onClick={async()=>{const name=prompt("Club name");if(!name)return;const id=uid("club");const c={id,name,town:"",county:"",logo_url:"",primary_color:"#10243E",secondary_color:"#FFFFFF",accent_color:CUP_ORANGE};await save("clubs",[...clubs,c],setClubs);await save("teams",[...teams,{id:`${id}-A-${Date.now()}`,clubId:id,name:`${name} A`,grade:"A",playerCount:0,mentorCount:0,foodCode:String(Math.floor(1000+Math.random()*9000)),coachBusCount:0,passengerCount:0,arrivalTime:"",departureTime:"",transportNotes:""}],setTeams)}}/></div>
      <div className="cup-team-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {clubs.map(c=>{
          const clubTeams=teams.filter(t=>t.clubId===c.id);
          return <CupCard key={c.id} style={{padding:16}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:64,height:64,borderRadius:14,border:`1px solid ${P.line}`,display:"grid",placeItems:"center",overflow:"hidden",background:P.white}}>{c.logo_url?<img src={c.logo_url} style={{maxWidth:"84%",maxHeight:"84%",width:"auto",height:"auto",objectFit:"contain"}}/>:<b>{c.name.slice(0,2)}</b>}</div>
              <div style={{flex:1}}>
                <input value={c.name||""} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,name:e.target.value}:x),setClubs)} style={{...inp,fontFamily:F.display,fontWeight:900,fontSize:14,textTransform:"none"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}><input placeholder="Town" value={c.town||""} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,town:e.target.value}:x),setClubs)} style={inp}/><input placeholder="County" value={c.county||""} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,county:e.target.value}:x),setClubs)} style={inp}/></div>
              </div>
              <label style={{fontSize:9,color:CUP_ORANGE,fontWeight:900,cursor:"pointer",padding:"8px 9px",border:`1px solid ${CUP_ORANGE}44`,borderRadius:9}}>Upload crest<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>save("clubs",clubs.map(x=>x.id===c.id?{...x,logo_url:String(r.result)}:x),setClubs);r.readAsDataURL(f)}}/></label>
            </div>
            <div style={{marginTop:11,padding:"10px 12px",background:P.soft,borderRadius:10}}>
              <div style={{fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase",marginBottom:7}}>Competition teams</div>
              <div style={{display:"flex",gap:13,flexWrap:"wrap"}}>{grades.map(g=>{const checked=clubTeams.some(t=>String(t.grade||"").toUpperCase()===g);return <label key={g} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,fontWeight:900,color:P.ink}}><input type="checkbox" checked={checked} onChange={e=>toggleGrade(c,g,e.target.checked)}/> {g}</label>})}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:10}}>
              {field("Primary",<input type="color" value={c.primary_color||"#10243E"} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,primary_color:e.target.value}:x),setClubs)} style={{...inp,height:34,padding:3}}/>)}
              {field("Secondary",<input type="color" value={c.secondary_color||"#FFFFFF"} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,secondary_color:e.target.value}:x),setClubs)} style={{...inp,height:34,padding:3}}/>)}
              {field("Accent",<input type="color" value={c.accent_color||CUP_ORANGE} onChange={e=>save("clubs",clubs.map(x=>x.id===c.id?{...x,accent_color:e.target.value}:x),setClubs)} style={{...inp,height:34,padding:3}}/>)}
            </div>
            {clubTeams.sort((a,b)=>String(a.grade).localeCompare(String(b.grade))).map(t=><div key={t.id} style={{display:"grid",gridTemplateColumns:"54px 1fr 68px 68px 78px",gap:7,alignItems:"end",borderTop:`1px solid ${P.line}`,paddingTop:9,marginTop:9}}>
              <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:CUP_ORANGE,textAlign:"center",paddingBottom:7}}>{t.grade||"—"}</div>
              {field("Team name",<input value={t.name||""} onChange={e=>save("teams",teams.map(x=>x.id===t.id?{...x,name:e.target.value}:x),setTeams)} style={{...inp,textTransform:"none"}}/>)}
              {field("Players",<input type="number" min="0" value={t.playerCount||0} onChange={e=>save("teams",teams.map(x=>x.id===t.id?{...x,playerCount:+e.target.value}:x),setTeams)} style={inp}/>)}
              {field("Mentors",<input type="number" min="0" value={t.mentorCount||0} onChange={e=>save("teams",teams.map(x=>x.id===t.id?{...x,mentorCount:+e.target.value}:x),setTeams)} style={inp}/>)}
              {field("Food code",<input value={t.foodCode||""} onChange={e=>save("teams",teams.map(x=>x.id===t.id?{...x,foodCode:e.target.value}:x),setTeams)} style={inp}/>)}
            </div>)}
          </CupCard>
        })}
      </div>
    </>);
  }
  if(screen==="cup-competition"){
    const grades=[...new Set(teams.map(t=>String(t.grade||"").toUpperCase()).filter(Boolean))].sort();
    const placements=config.placements||DEFAULT_CONFIG.placements;
    return sectionWrap("Competition","Set up grades, groups, pitches and qualification routes",<>
      <div style={{display:"grid",gap:14}}>
        <CupCard style={{padding:18}}>
          <div style={{fontFamily:F.display,fontSize:16,fontWeight:900,marginBottom:10}}>Competition overview</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{grades.map(g=><div key={g} style={{background:P.soft,borderRadius:10,padding:11}}><div style={{fontSize:8,color:P.muted,fontWeight:900}}>GRADE {g}</div><div style={{fontFamily:F.display,fontSize:20,fontWeight:900,color:CUP_ORANGE,marginTop:2}}>{teams.filter(t=>String(t.grade||"").toUpperCase()===g).length}</div><div style={{fontSize:8,color:P.muted}}>teams entered</div></div>)}</div>
        </CupCard>
        <CupCard style={{padding:18}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>{field("Start",<input type="time" value={config.startTime} onChange={e=>save("config",{...config,startTime:e.target.value},setConfig)} style={inp}/>)}{field("Target finish",<input type="time" value={config.targetFinish} onChange={e=>save("config",{...config,targetFinish:e.target.value},setConfig)} style={inp}/>)}{field("Match mins",<input type="number" value={config.matchDurationMins} onChange={e=>save("config",{...config,matchDurationMins:+e.target.value},setConfig)} style={inp}/>)}{field("Turnaround",<input type="number" value={config.turnaroundMins} onChange={e=>save("config",{...config,turnaroundMins:+e.target.value},setConfig)} style={inp}/>)}{field("Lunch mins",<input type="number" min="30" value={config.lunchMinutes||30} onChange={e=>save("config",{...config,lunchMinutes:Math.max(30,+e.target.value||30)},setConfig)} style={inp}/>)}{field("Maximum people per lunch slot",<input type="number" min="1" value={config.lunchCapacity||90} onChange={e=>save("config",{...config,lunchCapacity:Math.max(1,+e.target.value||90)},setConfig)} style={inp}/>)}{field("Groups / grade",<input type="number" min="1" max="4" value={config.groupCount} onChange={e=>save("config",{...config,groupCount:+e.target.value},setConfig)} style={inp}/>)}</div>
        </CupCard>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <CupCard style={{padding:18}}><div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontFamily:F.display}}>Pitches</b><CupBtn label="+ Pitch" variant="ghost" onClick={()=>save("config",{...config,pitches:[...pitches,{id:uid("pitch"),name:`Pitch ${pitches.length+1}`}]},setConfig)}/></div>{pitches.map((p,i)=><div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginTop:8}}><input value={p.name} onChange={e=>save("config",{...config,pitches:pitches.map((x,j)=>j===i?{...x,name:e.target.value}:x)},setConfig)} style={inp}/><CupBtn label="Remove" variant="ghost" onClick={()=>save("config",{...config,pitches:pitches.filter((_,j)=>j!==i)},setConfig)}/></div>)}</CupCard>
          <CupCard style={{padding:18}}>
            <div style={{fontFamily:F.display,fontSize:16,fontWeight:900}}>Placement competitions</div>
            <div style={{fontSize:9.5,color:P.muted,lineHeight:1.5,marginTop:4}}>Applied independently to every enabled grade. With 2 groups: Cup = group winners, Shield = runners-up, Plate = 3rd, Bowl = 4th. With 1 group: Cup = 1st v 2nd, Shield = 3rd v 4th, Plate = 5th v 6th, Bowl = 7th v 8th.</div>
            {placements.map((pl,i)=><label key={pl.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${P.line}`,fontSize:10}}><span style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={pl.enabled!==false} onChange={e=>save("config",{...config,placements:placements.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x)},setConfig)}/><b>{pl.label}</b></span><span style={{color:P.muted}}>Position {pl.rank}</span></label>)}
          </CupCard>
        </div>
        <CupCard style={{padding:16,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
          <div><div style={{fontFamily:F.display,fontSize:15,fontWeight:900}}>Schedule & Finals</div><div style={{fontSize:9,color:P.muted,marginTop:3}}>Generate the grade-aware schedule, then manually amend any fixture or final if you have Lead Mentor / Club Admin permission.</div></div>
          <CupBtn label="Open Schedule" onClick={()=>onNav("cup-schedule")}/>
        </CupCard>
      </div>
    </>);
  }
  if(screen==="cup-schedule"){
    const timeMins=(value)=>{const [h,m]=String(value||"").split(":").map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
    const warningFor=(candidate,id)=>{
      const warnings=[];
      const candTeams=[candidate.teamA,candidate.teamB].filter(Boolean);
      for(const other of matches){
        if(other.id===id)continue;
        const shared=candTeams.filter(t=>t===other.teamA||t===other.teamB);
        if(candidate.time&&other.time===candidate.time){
          if(candidate.pitchId&&other.pitchId===candidate.pitchId)warnings.push(`Pitch conflict: ${candidate.pitch||candidate.pitchId} already has another match at ${candidate.time}.`);
          else if(candidate.pitch&&other.pitch===candidate.pitch)warnings.push(`Pitch conflict: ${candidate.pitch} already has another match at ${candidate.time}.`);
          if(shared.length)warnings.push(`Double booking: ${shared.map(t=>teamById(t).name).join(", ")} already plays at ${candidate.time}.`);
        }
        if(shared.length&&candidate.time&&other.time){
          const a=timeMins(candidate.time),b=timeMins(other.time);
          const slot=(Number(config.matchDurationMins)||20)+(Number(config.turnaroundMins)||5);
          if(a!==null&&b!==null&&Math.abs(a-b)>0&&Math.abs(a-b)<=slot)warnings.push(`Back-to-back warning: ${shared.map(t=>teamById(t).name).join(", ")} also plays at ${other.time}.`);
        }
      }
      return [...new Set(warnings)];
    };
    const amend=async(m,patch)=>{
      if(!canEditSchedule){alert("Only the Lead Mentor / Club Admin can manually amend the schedule.");return}
      const candidate={...m,...patch,...((m.finalLabel&&(Object.prototype.hasOwnProperty.call(patch,"teamA")||Object.prototype.hasOwnProperty.call(patch,"teamB")))?{manualOverride:true}:{})};
      if(patch.pitchId){
        const p=pitches.find(x=>x.id===patch.pitchId);
        candidate.pitch=p?.name||candidate.pitch;
      }
      const warnings=warningFor(candidate,m.id);
      if(warnings.length&&!confirm(`Schedule warning:\n\n${warnings.join("\n")}\n\nSave this change anyway?`))return;
      await save("matches",matches.map(x=>x.id===m.id?candidate:x),setMatches);
    };
    return sectionWrap("Schedule",`${matches.length} fixtures · ${pitches.length} pitches`,<>
      {!canEditSchedule&&<CupCard style={{padding:12,marginBottom:12,background:"#FFF8EE"}}><div style={{fontSize:10,color:P.muted}}>Schedule editing is read-only. Manual amendments are available to the Lead Mentor / Club Admin.</div></CupCard>}
      {lunchWindows.length>0&&<CupCard style={{padding:14,marginBottom:12,background:"#FFF8EE"}}><div style={{fontFamily:F.display,fontSize:15,fontWeight:900}}>Allocated lunch breaks</div><div style={{fontSize:10,color:P.muted,lineHeight:1.7,marginTop:5}}>{lunchWindows.map((w,i)=><div key={i}><b style={{color:P.ink}}>Lunch {i+1}: {w.from}–{w.to}</b> · {(w.clubIds||w.clubs||[]).map(cid=>clubs.find(c=>c.id===cid)?.name||cid).join(", ")}</div>)}</div></CupCard>}
      <CupCard style={{overflow:"hidden"}}>
        {matches.map((m,i)=>{
          const warnings=warningFor(m,m.id);
          return <div key={m.id} style={{padding:"9px 10px",borderTop:i?`1px solid ${P.line}`:"none",background:warnings.length?"#FFF9ED":P.white}}>
            <div style={{display:"grid",gridTemplateColumns:"82px 130px 1fr 1fr 125px",gap:8,alignItems:"center",fontSize:10}}>
              <input type="time" value={m.time||""} disabled={!canEditSchedule} onChange={e=>amend(m,{time:e.target.value})} style={{...inp,padding:"6px 7px"}}/>
              <select value={m.pitchId||pitches.find(p=>p.name===m.pitch)?.id||""} disabled={!canEditSchedule} onChange={e=>amend(m,{pitchId:e.target.value})} style={{...inp,padding:"6px 7px"}}><option value="">Pitch TBC</option>{pitches.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={m.teamA||""} disabled={!canEditSchedule} onChange={e=>amend(m,{teamA:e.target.value})} style={inp}><option value="">{m.teamASource||"TBC"}</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select value={m.teamB||""} disabled={!canEditSchedule} onChange={e=>amend(m,{teamB:e.target.value})} style={inp}><option value="">{m.teamBSource||"TBC"}</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <b style={{color:m.finalLabel?CUP_ORANGE:P.muted}}>{m.stageLabel||m.finalLabel}</b>
            </div>
            {warnings.length>0&&<div style={{marginTop:6,fontSize:8.5,fontWeight:800,color:"#b45309"}}>⚠ {warnings.join(" · ")}</div>}
          </div>
        })}
      </CupCard>
    </>,<CupBtn label="Generate Schedule" onClick={async()=>{if(matches.length&&!confirm("Replace the current schedule? Existing manual changes will be overwritten."))return;const generated=cupGenerateSchedule(teams,config);await save("matches",generated.fixtures||generated,setMatches);await save("lunchWindows",generated.lunchWindows||[],setLunchWindows)}}/>);
  }
  if(screen==="cup-results"){
    const updateResult=async(m,patch)=>{
      let next=matches.map(x=>x.id===m.id?{...x,...patch,lastEditedBy:"Lead coach",lastEditedAt:new Date().toISOString()}:x);
      next=cupResolveFinals(next,teams,config);
      await save("matches",next,setMatches);
    };
    return sectionWrap("Results","Scores automatically populate qualified finals; Lead Mentor / Club Admin can still amend finals in Schedule",<div className="cup-results-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>{matches.map(m=><CupCard key={m.id} style={{padding:14,borderLeft:m.finalLabel?`4px solid ${CUP_ORANGE}`:undefined}}><b style={{fontFamily:F.display}}>{m.time} · {m.pitch}</b><div style={{fontSize:9,color:P.muted,marginTop:3}}>{m.stageLabel||m.finalLabel}</div>{[["A",m.teamA,"goalsA","pointsA"],["B",m.teamB,"goalsB","pointsB"]].map(([k,id,g,p])=><div key={k} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:7,marginTop:8,alignItems:"center"}}><b style={{fontSize:10}}>{teamById(id).name}</b><input type="number" min="0" value={m[g]||0} onChange={e=>updateResult(m,{[g]:+e.target.value})} style={inp}/><input type="number" min="0" value={m[p]||0} onChange={e=>updateResult(m,{[p]:+e.target.value})} style={inp}/></div>)}<select value={m.status||"scheduled"} onChange={e=>updateResult(m,{status:e.target.value})} style={{...inp,marginTop:8}}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="finished">Finished</option></select>{m.lastEditedBy&&<div style={{fontSize:8,color:P.muted,marginTop:5}}>Last edited by {m.lastEditedBy}</div>}</CupCard>)}</div>);
  }
  if(screen==="cup-referees")return sectionWrap("Referees","Pitch-only score access with link, code and reset controls",<div style={{display:"grid",gap:10}}>{refs.map(r=><CupCard key={r.id} style={{padding:15,opacity:r.active?1:.55}}><div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontFamily:F.display}}>{r.label}</b><b style={{color:r.active?P.green:"#b91c1c"}}>{r.active?"ACTIVE":"DISABLED"}</b></div><div style={{fontFamily:"monospace",fontSize:9,background:P.soft,padding:8,borderRadius:8,marginTop:8,wordBreak:"break-all"}}>{`${cupParticipantBase()}/?event=${encodeURIComponent(eventId)}&ref=${encodeURIComponent(r.id)}`}</div><div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}><strong style={{fontSize:22,color:CUP_ORANGE,letterSpacing:3}}>{r.code}</strong><CupBtn label="Copy" variant="ghost" onClick={()=>navigator.clipboard.writeText(`Referee link: ${`${cupParticipantBase()}/?event=${encodeURIComponent(eventId)}&ref=${encodeURIComponent(r.id)}`}\nCode: ${r.code}`)}/><CupBtn label="New code" variant="ghost" onClick={()=>save("refereeAccess",refs.map(x=>x.id===r.id?{...x,code:String(Math.floor(100000+Math.random()*900000)),version:(x.version||1)+1}:x),setRefs)}/><CupBtn label={r.active?"Disable":"Enable"} variant="ghost" onClick={()=>save("refereeAccess",refs.map(x=>x.id===r.id?{...x,active:!x.active,version:(x.version||1)+1}:x),setRefs)}/></div></CupCard>)}</div>,<><CupBtn label="+ Referee" onClick={()=>{const label=prompt("Referee name/label","Pitch referee");if(!label)return;const ids=(prompt(`Pitch IDs, comma separated:\n${pitches.map(p=>`${p.id} = ${p.name}`).join("\n")}`,pitches[0]?.id||"")||"").split(",").map(x=>x.trim()).filter(Boolean);save("refereeAccess",[...refs,cupRefAccess(eventId,ids,label)],setRefs)}}/><CupBtn label="Reset All" variant="ghost" onClick={()=>confirm("Invalidate every existing referee session?")&&save("refereeAccess",refs.map(r=>({...r,active:false,version:(r.version||1)+1})),setRefs)}/></>);
  if(screen==="cup-announcements"){
    const emojis=["📣","⚠️","🚗","🅿️","🍔","☕","🏑","⚽","🏆","🌧️","⏰","📍","🚑","✅","ℹ️","🎉"];
    const createDraft=async()=>{const draft={id:uid("ann"),emoji:"📣",title:"New announcement",html:"",text:"",status:"draft",publishAt:"",expiresAt:"",active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await save("announcements",[draft,...announcements],setAnnouncements);setEditingAnnouncementId(draft.id)};
    const updateAnnouncement=async(id,patch)=>save("announcements",announcements.map(a=>a.id===id?{...a,...patch,updatedAt:new Date().toISOString()}:a),setAnnouncements);
    const editing=announcements.find(a=>a.id===editingAnnouncementId);
    return sectionWrap("Announcements","Draft, schedule and publish event updates",<div style={{display:"grid",gap:10}}>
      {announcements.length===0&&<CupCard style={{padding:18,color:P.muted,fontSize:10}}>No announcements yet.</CupCard>}
      {announcements.map(a=><CupCard key={a.id} style={{padding:13,borderLeft:`4px solid ${a.status==="published"?"#2e7d32":a.status==="scheduled"?CUP_ORANGE:P.line}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div style={{minWidth:0}}><div style={{fontSize:11,fontWeight:900,color:P.ink,textTransform:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.emoji||"📣"} {a.title||"Untitled announcement"}</div><div style={{fontSize:8.5,color:P.muted,marginTop:3,textTransform:"none"}}>{a.status||"draft"}{a.publishAt?` · ${new Date(a.publishAt).toLocaleString()}`:""}{a.expiresAt?` · until ${new Date(a.expiresAt).toLocaleString()}`:""}</div></div>
          <CupBtn label="Edit" variant="ghost" onClick={()=>setEditingAnnouncementId(a.id)}/>
        </div>
      </CupCard>)}
      {editing&&<div onClick={()=>setEditingAnnouncementId(null)} style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(4,18,34,.55)",display:"grid",placeItems:"center",padding:20}}><div onClick={e=>e.stopPropagation()} style={{width:"min(780px,95vw)",maxHeight:"90vh",overflow:"auto",background:P.white,borderRadius:16,padding:18,boxShadow:Sh.lift,textTransform:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:18,fontWeight:900}}>Edit announcement</div><button onClick={()=>setEditingAnnouncementId(null)} style={{border:0,background:"transparent",fontSize:22,cursor:"pointer"}}>×</button></div>
        <div style={{display:"grid",gridTemplateColumns:"85px 1fr",gap:8,marginTop:12}}><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Emoji<select value={editing.emoji||"📣"} onChange={e=>updateAnnouncement(editing.id,{emoji:e.target.value})} style={{...inp,textTransform:"none"}}>{emojis.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Title<input value={editing.title||""} onChange={e=>updateAnnouncement(editing.id,{title:e.target.value})} style={{...inp,textTransform:"none"}}/></label></div>
        <div style={{marginTop:10,textTransform:"none"}}><div style={{fontSize:9,fontWeight:800,color:P.muted,marginBottom:5}}>Message</div><CupRichTextEditor value={editing.html||editing.text||""} onChange={html=>updateAnnouncement(editing.id,{html,text:html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()})}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Publish date & time<input type="datetime-local" value={editing.publishAt||editing.startsAt||""} onChange={e=>updateAnnouncement(editing.id,{publishAt:e.target.value})} style={{...inp,textTransform:"none"}}/></label><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Optional expiry<input type="datetime-local" value={editing.expiresAt||editing.endsAt||""} onChange={e=>updateAnnouncement(editing.id,{expiresAt:e.target.value})} style={{...inp,textTransform:"none"}}/></label></div>
        <div style={{display:"flex",gap:7,marginTop:12,flexWrap:"wrap"}}><CupBtn label="Save Draft" variant="ghost" onClick={()=>updateAnnouncement(editing.id,{status:"draft"})}/><CupBtn label="Publish Now" onClick={()=>updateAnnouncement(editing.id,{status:"published",publishAt:new Date().toISOString().slice(0,16)})}/><CupBtn label="Schedule" variant="ghost" onClick={()=>{if(!editing.publishAt){alert("Choose a publish date and time first.");return}updateAnnouncement(editing.id,{status:"scheduled"})}}/><CupBtn label="Delete" variant="ghost" onClick={()=>{if(confirm("Delete this announcement?")){save("announcements",announcements.filter(x=>x.id!==editing.id),setAnnouncements);setEditingAnnouncementId(null)}}}/></div>
      </div></div>}
    </div>,<CupBtn label="+ Create Announcement" onClick={createDraft}/>);
  }
  if(screen==="cup-information"){
    const builtIn=[
      ["welcomeMessage","Welcome"],
      ["arrivalRegistration","Arrival & Registration"],
      ["facilities","Facilities"],
      ["parking","Parking & Directions"],
      ["venueInfo","Pitch / Venue Information"],
      ["foodAndDrink","Food & Drink"],
      ["healthAndSafety","Health & Safety / Medical"],
      ["playingRules","Playing Rules"],
      ["contacts","Contacts / Communications"],
      ["other","Other Information"]
    ];
    const custom=Array.isArray(info.customSections)?info.customSections:[];
    const updateCustom=(index,patch)=>save("eventInfo",{...info,customSections:custom.map((section,i)=>i===index?{...section,...patch}:section)},setInfo);
    const moveCustom=(index,dir)=>{
      const target=index+dir;
      if(target<0||target>=custom.length)return;
      const next=[...custom];
      [next[index],next[target]]=[next[target],next[index]];
      save("eventInfo",{...info,customSections:next},setInfo);
    };
    const removeCustom=(index)=>{
      if(!confirm("Remove this custom section?"))return;
      save("eventInfo",{...info,customSections:custom.filter((_,i)=>i!==index)},setInfo);
    };
    return sectionWrap("Event Information","Every populated section is mirrored in the participant app",<div style={{display:"grid",gap:10,maxWidth:900}}>
      {builtIn.map(([k,l])=><CupCard key={k} style={{padding:14}}>{field(l,<textarea rows={k==="welcomeMessage"?4:3} value={info[k]||""} onChange={e=>save("eventInfo",{...info,[k]:e.target.value},setInfo)} style={inp}/>)}</CupCard>)}
      {custom.map((section,index)=><CupCard key={section.id||index} style={{padding:14,borderLeft:`4px solid ${CUP_ORANGE}`}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:F.display,fontSize:14,fontWeight:900,color:P.ink}}>Custom section {index+1}</div>
          <div style={{display:"flex",gap:6}}>
            <CupBtn label="↑" variant="ghost" onClick={()=>moveCustom(index,-1)}/>
            <CupBtn label="↓" variant="ghost" onClick={()=>moveCustom(index,1)}/>
            <CupBtn label="Remove" variant="ghost" onClick={()=>removeCustom(index)}/>
          </div>
        </div>
        <div style={{display:"grid",gap:8}}>
          {field("Heading",<input value={section.heading||""} onChange={e=>updateCustom(index,{heading:e.target.value})} style={inp}/>)}
          {field("Content",<textarea rows={3} value={section.content||""} onChange={e=>updateCustom(index,{content:e.target.value})} style={inp}/>)}
        </div>
      </CupCard>)}
    </div>,<CupBtn label="+ Custom Section" onClick={()=>save("eventInfo",{...info,customSections:[...custom,{id:uid("info"),heading:"Additional Information",content:""}]},setInfo)}/>);
  }
  if(screen==="cup-sponsors"){
    const editing=sponsors.find(s=>s.id===editingSponsorId);
    const updateSponsor=(id,patch)=>save("sponsors",sponsors.map(s=>s.id===id?{...s,...patch}:s),setSponsors);
    const addSponsor=async()=>{const s={id:uid("sponsor"),name:"New sponsor",label:"Supporting Sponsor",logo_url:"",website_url:"",active:true,sort_order:sponsors.length+1};await save("sponsors",[...sponsors,s],setSponsors);setEditingSponsorId(s.id)};
    return sectionWrap("Sponsors","List view; click Edit only when you need to change a sponsor",<div style={{display:"grid",gap:9}}>
      {sponsors.length===0&&<CupCard style={{padding:18,fontSize:10,color:P.muted}}>No sponsors added.</CupCard>}
      {sponsors.map(s=><CupCard key={s.id} style={{padding:12,display:"grid",gridTemplateColumns:"72px 1fr 150px auto",gap:10,alignItems:"center",opacity:s.active===false?.55:1}}><div style={{width:66,height:48,border:`1px solid ${P.line}`,borderRadius:10,display:"grid",placeItems:"center",overflow:"hidden"}}>{s.logo_url?<img src={s.logo_url} style={{maxWidth:"88%",maxHeight:"84%",objectFit:"contain"}}/>:<span style={{fontSize:8,color:P.muted}}>Logo</span>}</div><div><div style={{fontSize:11,fontWeight:900}}>{s.name||"Unnamed sponsor"}</div><div style={{fontSize:8.5,color:P.muted,marginTop:2}}>{s.website_url||"No website"}</div></div><div style={{fontSize:9,fontWeight:800,color:P.muted}}>{s.label||"Supporting Sponsor"} · {s.active===false?"Hidden":"Active"}</div><CupBtn label="Edit" variant="ghost" onClick={()=>setEditingSponsorId(s.id)}/></CupCard>)}
      {editing&&<div onClick={()=>setEditingSponsorId(null)} style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(4,18,34,.55)",display:"grid",placeItems:"center",padding:20}}><div onClick={e=>e.stopPropagation()} style={{width:"min(650px,95vw)",background:P.white,borderRadius:16,padding:18,boxShadow:Sh.lift}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:18,fontWeight:900}}>Edit sponsor</div><button onClick={()=>setEditingSponsorId(null)} style={{border:0,background:"transparent",fontSize:22,cursor:"pointer"}}>×</button></div>
        <div style={{display:"grid",gridTemplateColumns:"130px 1fr",gap:12,marginTop:12}}>
          <div><div style={{width:120,height:78,border:`1px solid ${P.line}`,borderRadius:12,display:"grid",placeItems:"center",overflow:"hidden"}}>{editing.logo_url?<img src={editing.logo_url} style={{maxWidth:"90%",maxHeight:"86%",objectFit:"contain"}}/>:<span style={{fontSize:9,color:P.muted}}>No logo</span>}</div><label style={{display:"block",fontSize:9,fontWeight:900,color:CUP_ORANGE,marginTop:7,cursor:"pointer"}}>Upload logo<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>updateSponsor(editing.id,{logo_url:String(r.result)});r.readAsDataURL(f)}}/></label></div>
          <div style={{display:"grid",gap:8}}><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Name<input value={editing.name||""} onChange={e=>updateSponsor(editing.id,{name:e.target.value})} style={{...inp,textTransform:"none"}}/></label><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Website<input value={editing.website_url||""} onChange={e=>updateSponsor(editing.id,{website_url:e.target.value})} style={{...inp,textTransform:"none"}}/></label><label style={{display:"grid",gap:5,fontSize:9,fontWeight:800,color:P.muted}}>Level<select value={editing.label||"Supporting Sponsor"} onChange={e=>updateSponsor(editing.id,{label:e.target.value})} style={inp}><option>Main Sponsor</option><option>Event Partner</option><option>Supporting Sponsor</option><option>Food Partner</option><option>Transport Partner</option></select></label><label style={{fontSize:10,fontWeight:800}}><input type="checkbox" checked={editing.active!==false} onChange={e=>updateSponsor(editing.id,{active:e.target.checked})}/> Active / visible</label></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:7,marginTop:14}}><CupBtn label="Delete" variant="ghost" onClick={()=>{if(confirm("Delete this sponsor?")){save("sponsors",sponsors.filter(x=>x.id!==editing.id),setSponsors);setEditingSponsorId(null)}}}/><CupBtn label="Done" onClick={()=>setEditingSponsorId(null)}/></div>
      </div></div>}
    </div>,<CupBtn label="+ Sponsor" onClick={addSponsor}/>);
  }
  if(screen==="cup-food") {
    const pc=teams.reduce((n,t)=>n+Number(t.playerCount||0),0);
    const mc=teams.reduce((n,t)=>n+Number(t.mentorCount||0),0);
    // Transport is managed once per visiting club, not once per A/B team.
    // For backwards compatibility the values are stored onto every team for that club.
    const clubTransport=clubs.map(c=>{
      const clubTeams=teams.filter(t=>t.clubId===c.id);
      const source=clubTeams.find(t=>Number(t.coachBusCount||0)>0 || Number(t.passengerCount||0)>0 || t.arrivalTime || t.departureTime || t.transportNotes) || clubTeams[0] || {};
      return {
        clubId:c.id,
        clubName:c.name,
        coachBusCount:Number(source.coachBusCount||0),
        passengerCount:Number(source.passengerCount||0),
        arrivalTime:source.arrivalTime||"",
        departureTime:source.departureTime||"",
        transportNotes:source.transportNotes||""
      };
    });
    const transportClubs=clubTransport.filter(c=>c.coachBusCount>0 || c.passengerCount>0 || c.arrivalTime || c.departureTime || c.transportNotes);
    const coachBusTotal=clubTransport.reduce((n,c)=>n+Number(c.coachBusCount||0),0);
    const passengerTotal=clubTransport.reduce((n,c)=>n+Number(c.passengerCount||0),0);

    const windowClubIds=(w)=>Array.isArray(w.clubIds)?w.clubIds:(Array.isArray(w.clubs)?w.clubs:[]);
    const teamsForWindow=(w)=>{
      const ids=windowClubIds(w);
      return teams.filter(t=>ids.includes(t.clubId));
    };
    const foodQtyForWindow=(w,f)=>{
      const slotTeams=teamsForWindow(w);
      const players=slotTeams.reduce((n,t)=>n+Number(t.playerCount||0),0);
      const mentors=slotTeams.reduce((n,t)=>n+Number(t.mentorCount||0),0);
      return (f.freeForPlayers?players:0)+(f.freeForMentors?mentors:0);
    };
    const slotPeople=(w)=>{
      const slotTeams=teamsForWindow(w);
      return {
        teams:slotTeams,
        players:slotTeams.reduce((n,t)=>n+Number(t.playerCount||0),0),
        mentors:slotTeams.reduce((n,t)=>n+Number(t.mentorCount||0),0)
      };
    };
    const addLunchWindow=async()=>{
      const last=lunchWindows[lunchWindows.length-1];
      const from=last?.to||"12:00";
      const to=from==="12:00"?"12:30":"13:00";
      await save("lunchWindows",[...lunchWindows,{id:uid("lunch"),from,to,clubIds:[],capacity:Number(config.lunchCapacity||90)}],setLunchWindows);
    };
    const updateLunchWindow=(idx,patch)=>{
      const next=lunchWindows.map((w,i)=>i===idx?{...w,...patch}:w);
      return save("lunchWindows",next,setLunchWindows);
    };
    const toggleClubInLunchWindow=(idx,clubId,checked)=>{
      const w=lunchWindows[idx];
      const current=windowClubIds(w);
      const clubIds=checked?[...new Set([...current,clubId])]:current.filter(id=>id!==clubId);
      return updateLunchWindow(idx,{clubIds,clubs:undefined});
    };
    const updateClubTransport=(clubId,patch)=>save(
      "teams",
      teams.map(t=>t.clubId===clubId?{...t,...patch}:t),
      setTeams
    );

    const hostSummaryText=()=>{
      const lines=[];
      lines.push(`${event?.name||"Spraoi Cup"} — Host Club Summary`);
      lines.push("");

      lines.push("LUNCH & CATERING");
      if(!lunchWindows.length){
        lines.push("No lunch slots have been generated yet.");
      } else {
        lunchWindows.forEach((w,idx)=>{
          const totals=slotPeople(w);
          lines.push(`Lunch ${idx+1}: ${w.from||"TBC"}–${w.to||"TBC"}`);
          lines.push(`Clubs: ${[...new Set(totals.teams.map(t=>clubById(t.clubId).name))].join(", ")||"None assigned"}`);
          lines.push(`${totals.players} players · ${totals.mentors} mentors`);
          food.filter(f=>f.active!==false).forEach(f=>{
            lines.push(`${foodQtyForWindow(w,f)} × ${f.name||"Food item"}`);
          });
          lines.push("");
        });
      }

      lines.push("COACHES / BUSES");
      if(!transportClubs.length){
        lines.push("No coach/bus information entered.");
      } else {
        transportClubs.forEach(c=>{
          let row=`${c.clubName}: ${c.coachBusCount} coach/bus`;
          if(c.coachBusCount!==1) row+="es";
          if(c.passengerCount) row+=` · ${c.passengerCount} passengers`;
          if(c.arrivalTime) row+=` · arrive ${c.arrivalTime}`;
          if(c.departureTime) row+=` · depart ${c.departureTime}`;
          if(c.transportNotes) row+=` · ${c.transportNotes}`;
          lines.push(row);
        });
      }

      return lines.join("\n");
    };

    const shareHostSummary=async()=>{
      const shareText=hostSummaryText();
      try{
        if(navigator.share){
          await navigator.share({
            title:`${event?.name||"Spraoi Cup"} Host Club Summary`,
            text:shareText
          });
          return;
        }
      }catch(err){
        if(err?.name==="AbortError") return;
      }

      try{
        await navigator.clipboard.writeText(shareText);
        alert("Host Club Summary copied to clipboard.");
      }catch{
        window.prompt("Copy Host Club Summary:",shareText);
      }
    };

    return sectionWrap(
      "Lunch & Logistics",
      "Plan lunch serving slots, exact food quantities and visiting team transport",
      <div style={{display:"grid",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
          <CupStatCard label="Players" value={pc} icon="👥"/>
          <CupStatCard label="Mentors" value={mc} color={P.green} icon="🧑‍🏫"/>
          <CupStatCard label="Lunch slots" value={lunchWindows.length} color="#fb8c00" icon="🍔"/>
          <CupStatCard label="Coaches / buses" value={coachBusTotal} sub={passengerTotal?`${passengerTotal} passengers declared`:"Transport numbers not complete"} color="#0284c7" icon="🚌"/>
        </div>

        <CupCard style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Lunch serving times</div>
              <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>Lunch slots are created automatically when you generate the Cup schedule. You can still amend the times or club allocations here. Player and mentor numbers are calculated automatically from Teams.</div>
            </div>
            <CupBtn label="+ Lunch slot" onClick={addLunchWindow}/>
          </div>

          {lunchWindows.length===0&&<div style={{marginTop:14,padding:14,borderRadius:12,background:P.soft,fontSize:10,color:P.muted}}>No lunch times have been added yet.</div>}

          <div style={{display:"grid",gap:12,marginTop:12}}>
            {lunchWindows.map((w,idx)=>{
              const totals=slotPeople(w);
              return <div key={w.id||idx} style={{border:`1px solid ${P.line}`,borderRadius:14,padding:14,background:"#fffaf5"}}>
                <div style={{display:"grid",gridTemplateColumns:"120px 120px 1fr auto",gap:8,alignItems:"end"}}>
                  {field("From",<input type="time" value={w.from||""} onChange={e=>updateLunchWindow(idx,{from:e.target.value})} style={inp}/>)}
                  {field("To",<input type="time" value={w.to||""} onChange={e=>updateLunchWindow(idx,{to:e.target.value})} style={inp}/>)}
                  <div>
                    <div style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase",marginBottom:5}}>Clubs in this slot</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {clubs.map(c=>{
                        const checked=windowClubIds(w).includes(c.id);
                        return <label key={c.id} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 8px",border:`1px solid ${checked?"#fdba74":P.line}`,borderRadius:9,background:checked?"#fff7ed":"#fff",fontSize:9,fontWeight:800,cursor:"pointer"}}>
                          <input type="checkbox" checked={checked} onChange={e=>toggleClubInLunchWindow(idx,c.id,e.target.checked)}/>
                          {c.name}
                        </label>;
                      })}
                    </div>
                  </div>
                  <CupBtn label="Remove" variant="ghost" onClick={()=>save("lunchWindows",lunchWindows.filter((_,i)=>i!==idx),setLunchWindows)}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:12}}>
                  <div style={{padding:10,borderRadius:10,background:P.white,border:`1px solid ${P.line}`}}><div style={{fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase"}}>Teams</div><div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:P.ink,marginTop:2}}>{totals.teams.length}</div></div>
                  <div style={{padding:10,borderRadius:10,background:P.white,border:`1px solid ${P.line}`}}><div style={{fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase"}}>Players</div><div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:P.ink,marginTop:2}}>{totals.players}</div></div>
                  <div style={{padding:10,borderRadius:10,background:P.white,border:`1px solid ${P.line}`}}><div style={{fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase"}}>Mentors</div><div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:P.ink,marginTop:2}}>{totals.mentors}</div></div>
                  <div style={{padding:10,borderRadius:10,background:P.white,border:`1px solid ${P.line}`}}><div style={{fontSize:8,fontWeight:900,color:P.muted,textTransform:"uppercase"}}>Total people</div><div style={{fontFamily:F.display,fontSize:19,fontWeight:900,color:CUP_ORANGE,marginTop:2}}>{totals.players+totals.mentors}</div></div>
                </div>

                {food.filter(f=>f.active!==false).length>0&&<div style={{marginTop:12,overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,fontSize:9}}>
                    <thead><tr>{["Food item","Players","Mentors","Needed for slot"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 8px",borderBottom:`1px solid ${P.line}`,color:P.muted,fontSize:8,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {food.filter(f=>f.active!==false).map(f=><tr key={f.id}>
                        <td style={{padding:"8px",borderBottom:`1px solid ${P.line}`,fontWeight:900}}>{f.name||"Food item"}</td>
                        <td style={{padding:"8px",borderBottom:`1px solid ${P.line}`}}>{f.freeForPlayers?totals.players:"—"}</td>
                        <td style={{padding:"8px",borderBottom:`1px solid ${P.line}`}}>{f.freeForMentors?totals.mentors:"—"}</td>
                        <td style={{padding:"8px",borderBottom:`1px solid ${P.line}`,fontWeight:900,color:CUP_ORANGE}}>{foodQtyForWindow(w,f)}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>}
              </div>;
            })}
          </div>
        </CupCard>

        <CupCard style={{padding:18}}>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Food items</div>
          <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>Mark which items are provided to players and/or mentors. Those settings drive the quantities above.</div>
          <div style={{display:"grid",gap:8,marginTop:12}}>
            {food.map((f,i)=><div key={f.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 120px 120px auto",gap:7,alignItems:"center"}}>
              <input value={f.name||""} onChange={e=>save("foodMenu",food.map((x,j)=>j===i?{...x,name:e.target.value}:x),setFood)} style={inp}/>
              <input type="number" step=".5" placeholder="Optional €" value={f.price??""} onChange={e=>save("foodMenu",food.map((x,j)=>j===i?{...x,price:e.target.value===""?null:+e.target.value}:x),setFood)} style={inp}/>
              <label style={{fontSize:9,fontWeight:800}}><input type="checkbox" checked={!!f.freeForPlayers} onChange={e=>save("foodMenu",food.map((x,j)=>j===i?{...x,freeForPlayers:e.target.checked}:x),setFood)}/> For players</label>
              <label style={{fontSize:9,fontWeight:800}}><input type="checkbox" checked={!!f.freeForMentors} onChange={e=>save("foodMenu",food.map((x,j)=>j===i?{...x,freeForMentors:e.target.checked}:x),setFood)}/> For mentors</label>
              <CupBtn label="Remove" variant="ghost" onClick={()=>save("foodMenu",food.filter((_,j)=>j!==i),setFood)}/>
            </div>)}
          </div>
          <div style={{marginTop:10}}><CupBtn label="+ Food item" variant="ghost" onClick={()=>save("foodMenu",[...food,{id:uid("food"),name:"Burger",price:null,active:true,freeForPlayers:true,freeForMentors:true}],setFood)}/></div>
        </CupCard>

        <CupCard style={{padding:18}}>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Buses / coaches</div>
          <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>Each visiting club is listed once. Enter only the coach/bus information the host club needs for arrivals and departures.</div>
          <div style={{overflowX:"auto",marginTop:12}}>
            <table style={{width:"100%",minWidth:760,borderCollapse:"collapse",fontFamily:F.body,fontSize:9}}>
              <thead>
                <tr>{["Club","Coaches / buses","Passengers","Arrival","Departure","Notes"].map(h=><th key={h} style={{textAlign:"left",padding:"7px",borderBottom:`1px solid ${P.line}`,fontSize:8,color:P.muted,textTransform:"uppercase"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {clubTransport.map(c=><tr key={c.clubId}>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`,fontWeight:900}}>{c.clubName}</td>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`}}><input type="number" min="0" value={c.coachBusCount||0} onChange={e=>updateClubTransport(c.clubId,{coachBusCount:+e.target.value})} style={{...inp,width:100}}/></td>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`}}><input type="number" min="0" value={c.passengerCount||0} onChange={e=>updateClubTransport(c.clubId,{passengerCount:+e.target.value})} style={{...inp,width:100}}/></td>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`}}><input type="time" value={c.arrivalTime||""} onChange={e=>updateClubTransport(c.clubId,{arrivalTime:e.target.value})} style={{...inp,width:110}}/></td>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`}}><input type="time" value={c.departureTime||""} onChange={e=>updateClubTransport(c.clubId,{departureTime:e.target.value})} style={{...inp,width:110}}/></td>
                  <td style={{padding:"7px",borderBottom:`1px solid ${P.line}`}}><input value={c.transportNotes||""} placeholder="Coach access / arrival note" onChange={e=>updateClubTransport(c.clubId,{transportNotes:e.target.value})} style={{...inp,minWidth:200}}/></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </CupCard>

        <CupCard style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Host Club Summary</div>
              <div style={{fontFamily:F.body,fontSize:9.5,color:P.muted,marginTop:3}}>One operational view for catering, serving and coach/bus arrivals.</div>
            </div>
            <CupBtn label="Share Summary" onClick={shareHostSummary}/>
          </div>

          <div style={{display:"grid",gap:10,marginTop:12}}>
            {lunchWindows.map((w,idx)=>{
              const totals=slotPeople(w);
              return <div key={w.id||idx} style={{padding:12,borderRadius:12,border:`1px solid ${P.line}`,background:P.soft}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontFamily:F.display,fontSize:14,fontWeight:900,color:P.ink}}>{w.from||"TBC"}–{w.to||"TBC"}</div>
                    <div style={{fontSize:9,color:P.muted,marginTop:2}}>{[...new Set(totals.teams.map(t=>clubById(t.clubId).name))].join(", ")||"No clubs assigned"}</div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:10,fontWeight:900,color:CUP_ORANGE}}>{totals.players} players · {totals.mentors} mentors</div><div style={{fontSize:9,fontWeight:800,color:(totals.players+totals.mentors)>Number(w.capacity||config.lunchCapacity||90)?"#b91c1c":P.muted,marginTop:2}}>{totals.players+totals.mentors} / {Number(w.capacity||config.lunchCapacity||90)} people{(totals.players+totals.mentors)>Number(w.capacity||config.lunchCapacity||90)?" · OVER CAPACITY":""}</div></div>
                </div>
                {food.filter(f=>f.active!==false).length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
                  {food.filter(f=>f.active!==false).map(f=><span key={f.id} style={{padding:"5px 8px",borderRadius:999,background:"#fff",border:`1px solid ${P.line}`,fontSize:9,fontWeight:800}}>{foodQtyForWindow(w,f)} × {f.name}</span>)}
                </div>}
              </div>;
            })}
            {lunchWindows.length===0&&<div style={{fontSize:10,color:P.muted}}>Add lunch serving slots above to build the catering summary.</div>}
          </div>

          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${P.line}`}}>
            <div style={{fontFamily:F.display,fontSize:14,fontWeight:900,color:P.ink}}>Transport summary</div>
            <div style={{fontSize:9.5,color:P.muted,marginTop:3}}>{coachBusTotal} coaches / buses · {passengerTotal} passengers</div>
            <div style={{display:"grid",gap:6,marginTop:9}}>
              {transportClubs.map(c=><div key={c.clubId} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 10px",borderRadius:10,background:P.soft,fontSize:9.5}}>
                <b>{c.clubName}</b>
                <span>{Number(c.coachBusCount||0)} coach/bus{Number(c.coachBusCount||0)===1?"":"es"}{c.passengerCount?` · ${Number(c.passengerCount||0)} passengers`:""}{c.arrivalTime?` · arrive ${c.arrivalTime}`:""}{c.departureTime?` · depart ${c.departureTime}`:""}{c.transportNotes?` · ${c.transportNotes}`:""}</span>
              </div>)}
              {transportClubs.length===0&&<div style={{fontSize:10,color:P.muted}}>No coach or bus arrivals have been entered yet.</div>}
            </div>
          </div>
        </CupCard>
      </div>
    );
  }
  if(screen==="cup-participant-view") {const url=`${cupParticipantBase()}/?event=${encodeURIComponent(eventId)}${event?.status==="draft"?"&preview=1":""}`;return sectionWrap("Participant View","Mobile event-day experience for parents, players and team mentors",<CupCard style={{padding:18}}><div style={{fontFamily:"monospace",fontSize:10,background:P.soft,padding:10,borderRadius:9,wordBreak:"break-all"}}>{url}</div><div style={{marginTop:12}}><CupBtn label="Open Participant App" onClick={()=>window.open(url,"_blank")}/></div></CupCard>)}
  if(screen==="cup-settings")return sectionWrap("Settings","Current event details",<CupCard style={{padding:18,maxWidth:760}}><div style={{display:"grid",gap:10}}>{field("Event name",<input value={event?.name||""} onChange={e=>setEvent({...event,name:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{name:event.name});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}{field("Date",<input type="date" value={event?.date||""} onChange={e=>setEvent({...event,date:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{date:event.date});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}{field("Venue",<input value={event?.venue||""} onChange={e=>setEvent({...event,venue:e.target.value})} onBlur={async()=>{const n=await storeUpdateEvent(eventId,{venue:event.venue});setEvent(n);setEvents(await storeRead(storeEventsKey,[]))}} style={inp}/>)}</div></CupCard>);
  const upcoming=matches.filter(m=>m.status!=="finished").slice(0,6);
  const activeSponsors=sponsors.filter(s=>s.active!==false).length;

  const dashboardCoachBusTotal=clubs.reduce((total,club)=>{
    const clubTeams=teams.filter(t=>t.clubId===club.id);

    const source=
      clubTeams.find(
        t=>
          Number(t.coachBusCount||0)>0 ||
          Number(t.passengerCount||0)>0 ||
          t.arrivalTime ||
          t.departureTime ||
          t.transportNotes
      ) ||
      clubTeams[0];

    return total+Number(source?.coachBusCount||0);
  },0);

  const readiness=[
    {label:"Teams",ok:teams.length>0,value:`${teams.length} teams`},
    {label:"Schedule",ok:matches.length>0,value:matches.length?`${matches.length} fixtures`:"Not generated"},
    {label:"Event info",ok:Object.values(info||{}).some(v=>String(v||"").trim()),value:"Participant content"},
    {label:"Food",ok:food.length>0,value:food.length?`${food.length} menu items`:"Optional"},
  ];
  const participantUrl=`${cupParticipantBase()}/?event=${encodeURIComponent(eventId)}${event?.status==="draft"?"&preview=1":""}`;
  return sectionWrap("Cup Dashboard",event?.name?`${event.name}${event.date?` · ${event.date}`:""}`:"Set up and run your event",<>
    <div className="cup-dashboard-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
      <CupStatCard label="Teams" value={teams.length} sub={`${clubs.length} clubs registered`} icon="👥"/>
      <CupStatCard label="Fixtures" value={matches.length} sub={`${finished.length} finished · ${live.length} live`} color="#fb8c00" icon="📅"/>
      <CupStatCard label="Pitches" value={pitches.length} sub={pitches.length?pitches.map(p=>p.name).join(" · "):"No pitches configured"} color="#0284c7" icon="📍"/>
      <CupStatCard label="Event status" value={statusLabel} sub={`${announcements.length} announcements · ${activeSponsors} sponsors`} color={statusColor} icon="✓"/>
    </div>

    <CupCard style={{padding:18,marginBottom:18,borderColor:"#fdba74",background:"linear-gradient(135deg,#fff 0%,#fffaf5 100%)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{minWidth:220}}>
          <div style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:CUP_ORANGE,textTransform:"uppercase",letterSpacing:".1em"}}>Event day</div>
          <div style={{fontFamily:F.display,fontSize:22,fontWeight:900,color:P.ink,marginTop:4}}>{event?.name||"Your Cup Event"}</div>
          <div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:5}}>{event?.venue||"Venue TBC"} · {config.startTime||"Start TBC"}–{config.targetFinish||"Finish TBC"}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <CupBtn label="Participant View" variant="ghost" icon="↗" onClick={()=>window.open(participantUrl,"_blank")}/>
          <CupBtn label="Manage Event Content" icon="i" onClick={()=>onNav("cup-content")}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:16}}>
        {readiness.map(item=><div key={item.label} style={{padding:"11px 12px",borderRadius:12,background:item.ok?"#fff7ed":"#f8fafc",border:`1px solid ${item.ok?"#fed7aa":P.line}`}}><div style={{fontSize:8,fontWeight:900,color:item.ok?"#c2410c":P.muted,textTransform:"uppercase"}}>{item.ok?"✓":"○"} {item.label}</div><div style={{fontFamily:F.body,fontSize:10,fontWeight:800,color:P.ink,marginTop:3}}>{item.value}</div></div>)}
      </div>
    </CupCard>

    <div className="cup-dashboard-main" style={{display:"grid",gridTemplateColumns:"1.35fr .85fr",gap:18,marginBottom:18}}>
      <CupCard style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Upcoming fixtures</div><div style={{fontSize:9,color:P.muted,marginTop:2}}>What is coming next on event day</div></div><CupBtn label="Competition" variant="ghost" onClick={()=>onNav("cup-competition")}/></div>
        {upcoming.length?upcoming.map((m,i)=><div key={m.id} style={{display:"grid",gridTemplateColumns:"58px 78px 1fr",gap:9,padding:"11px 0",borderTop:i?`1px solid ${P.line}`:"none",fontSize:10,alignItems:"center"}}><span style={{fontWeight:900,color:CUP_ORANGE}}>{m.time||"TBC"}</span><span style={{fontWeight:800,color:P.muted}}>{m.pitch||"Pitch"}</span><span style={{fontWeight:800,color:P.ink}}>{teamById(m.teamA).name} <span style={{color:P.muted,fontWeight:600}}>v</span> {teamById(m.teamB).name}</span></div>):<div style={{padding:"18px 0",color:P.muted,fontSize:10}}>No fixtures generated yet. Set up teams and competition structure to build the schedule.</div>}
      </CupCard>
      <CupCard style={{padding:18}}>
        <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>Event details</div>
        <div style={{fontSize:9,color:P.muted,marginTop:2,marginBottom:8}}>At-a-glance organiser information</div>
        {[['Date',event?.date],['Venue',event?.venue],['Start',config.startTime],['Target finish',config.targetFinish],['Lunch',`${config.lunchMinutes||30} min minimum`]].map(([l,v],i)=><div key={l} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"10px 0",borderTop:i?`1px solid ${P.line}`:"none",fontSize:10}}><span style={{color:P.muted}}>{l}</span><b style={{textAlign:"right",color:P.ink}}>{v||"—"}</b></div>)}
      </CupCard>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
      <CupCard style={{padding:16}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:900}}>Teams</div><div style={{fontSize:10,color:P.muted,margin:"4px 0 12px"}}>{teams.length} competition teams across {clubs.length} clubs.</div><CupBtn label="Manage Teams" variant="ghost" onClick={()=>onNav("cup-teams")}/></CupCard>
      <CupCard style={{padding:16}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:900}}>Event Content</div><div style={{fontSize:10,color:P.muted,margin:"4px 0 12px"}}>{announcements.length} announcements · {activeSponsors} active sponsors.</div><CupBtn label="Open Content" variant="ghost" onClick={()=>onNav("cup-content")}/></CupCard>
      <CupCard style={{padding:16}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:900}}>Lunch & Logistics</div><div style={{fontSize:10,color:P.muted,margin:"4px 0 12px"}}>{lunchWindows.length} lunch slots · {dashboardCoachBusTotal} coaches/buses.</div><CupBtn label="Open Logistics" variant="ghost" onClick={()=>onNav("cup-food")}/></CupCard>
    </div>
  </>,<CupBtn label="+ New Event" onClick={createEvent}/>);

}

/* ============================================================
   MAIN APP
   ============================================================ */

/* ============================================================
   CUP MODULE ENTRY
   Single source of truth for Cup screens rendered by Admin.
   ============================================================ */
export function CupModule({
  screen,
  onNav,
  contextTeam,
  selectedEventId = "",
  cupStore = null,
  canEditSchedule = false,
  canManageAllEvents = false,
}) {
  return (
    <CupModuleScreen
      screen={screen}
      onNav={onNav}
      contextTeam={contextTeam}
      selectedEventId={selectedEventId}
      cupStore={cupStore}
      canEditSchedule={canEditSchedule}
      canManageAllEvents={canManageAllEvents}
    />
  );
}

export default function App() {
  useSpraoiFonts();
  // Auth state
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // User role state
  const [userRole, setUserRole] = useState(null); // { role, club_id, modules }
  const [enabledModules, setEnabledModules] = useState([]);
  useEffect(() => {
    if (APP_MODULE === "cup") {
      setEnabledModules((mods) => mods.includes("cup") ? mods : [...mods, "cup"]);
    }
  }, []);

  // App state — this standalone build owns CUP only.
  // Other module buttons return to the single Admin shell, which renders the canonical module.
  const [screen, setScreen] = useState(() => {
    const requested = requestedScreenFromUrl(null);
    if (requested && String(requested).startsWith("cup-")) return requested;
    return readModuleScreen(APP_MODULE, MODULES[APP_MODULE]?.nav?.[0]?.id || "cup-events");
  });
  const [activeModule, setActiveModule] = useState(APP_MODULE);

  useEffect(() => {
    if (!String(screen || "").startsWith(`${APP_MODULE}-`)) {
      setScreen(readModuleScreen(APP_MODULE, MODULES[APP_MODULE]?.nav?.[0]?.id || "cup-dashboard"));
      return;
    }
    if (activeModule !== APP_MODULE) setActiveModule(APP_MODULE);
    writeModuleScreen(APP_MODULE, screen);
  }, [screen, activeModule]);
  const [club, setClub] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null); // the age group object
  const [skills, setSkills] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [diagramMap, setDiagramMap] = useState({});
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [planSessions, setPlanSessions] = useState([]);
  const [academyExtras, setAcademyExtras] = useState(() => { try { return JSON.parse(localStorage.getItem("spraoi_academy_extras") || "[]"); } catch { return []; } });
  const [academyPublished, setAcademyPublished] = useState(() => localStorage.getItem("spraoi_academy_published") === "true");
  const [academyVideoOverrides, setAcademyVideoOverrides] = useState({});
  const [academyParents, setAcademyParents] = useState(() => { try { return JSON.parse(localStorage.getItem("spraoi_academy_parents") || "[]"); } catch { return []; } });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [editingSession, setEditingSession] = useState(null); // full session object for pre-filling builder
  const [myTeams, setMyTeams] = useState([]); // age groups this coach is assigned to
  const permissions = roleCapabilities(userRole?.role);
  const coachAccessLabel = permissions.isClubAdmin ? "Club Admin" : permissions.isLeadCoach ? "Lead Coach" : "Coach / Mentor";
  const [showProfile, setShowProfile] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [pitchView, setPitchView] = useState(false);
  const [shareToken] = useState(() => new URLSearchParams(window.location.search).get("share"));
  const [sharedSession, setSharedSession] = useState(null);
  const [shareLoading, setShareLoading] = useState(!!new URLSearchParams(window.location.search).get("share"));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadUserRole(s.user.id, s.user.email);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadUserRole(s.user.id, s.user.email);
      else { setAuthLoading(false); setUserRole(null); }
    });
    loadDiagramMap();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => { subscription.unsubscribe(); window.removeEventListener("resize", handleResize); };
  }, []);

  async function loadUserRole(userId, userEmail) {
    const allModules = ["coach", "club", "cup", "connect", "academy", "plus"];

    try {
      // The existing project has used more than one user_roles schema over time.
      // Load the available rows first, then match against whichever identity field exists.
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("*");

      if (roleError) console.warn("Unable to load user roles:", roleError.message);

      const roleData = (roleRows || []).find((row) =>
        [row.user_id, row.auth_user_id, row.profile_id, row.id]
          .filter(Boolean)
          .some((value) => String(value) === String(userId))
      ) || null;

      const clubId = roleData?.club_id || roleData?.club?.id || null;
      let clubData = null;

      if (clubId) {
        const { data } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();
        clubData = data || null;
      }

      if (!clubData) {
        const { data: clubSpraoi } = await supabase.from("clubs").select("*").eq("slug", "club-spraoi").maybeSingle();
        clubData = clubSpraoi || null;
      }

      if (!clubData) {
        const { data: legacyClub } = await supabase.from("clubs").select("*").eq("slug", "fingallians").maybeSingle();
        clubData = legacyClub || null;
      }

      if (clubData) setClub(clubData);

      // During platform build/testing Elaine has access to every module.
      // RBAC can later narrow this list without changing the navigation shell.
      setEnabledModules(allModules);
      setUserRole(roleData || { role: "coach_mentor", club_id: clubData?.id || null, capabilities: roleCapabilities("coach_mentor") });

      const effectiveClubId = clubId || clubData?.id;
      if (effectiveClubId) {
        loadAgeGroups(effectiveClubId);
        loadCoaches(effectiveClubId);
      }
      loadSkills();
      loadActivities();
      loadUpcoming();

      // RBAC team assignment. New installations use team_staff; older ones can
      // continue to use coach_assignments while the migration is rolled out.
      let assignedTeamIds = [];
      let effectiveRole = roleData?.role || "coach_mentor";

      let { data: staffRows, error: staffError } = await supabase
        .from("team_staff")
        .select("id, age_group_id, role, status, coach_id")
        .eq("user_id", userId)
        .eq("status", "active");

      // A Club Admin can assign a coach before that coach first signs in. On the
      // first sign-in, link the matching coach email to the auth user automatically.
      if ((!staffRows?.length || staffError) && userEmail) {
        const { data: matchingCoach } = await supabase
          .from("coaches")
          .select("id")
          .eq("club_id", effectiveClubId)
          .ilike("email", userEmail)
          .maybeSingle();
        if (matchingCoach?.id) {
          const { data: pendingRows } = await supabase
            .from("team_staff")
            .select("id, age_group_id, role, status, coach_id")
            .eq("coach_id", matchingCoach.id)
            .eq("status", "active");
          staffRows = pendingRows || [];
          if (staffRows.length) {
            await supabase.from("coaches").update({ user_id: userId }).eq("id", matchingCoach.id);
            await supabase.from("team_staff").update({ user_id: userId }).in("id", staffRows.map((row) => row.id));
          }
        }
      }

      if (!staffError && staffRows?.length) {
        assignedTeamIds = [...new Set(staffRows.map((row) => row.age_group_id).filter(Boolean))];
        const priority = { club_admin: 3, lead_coach: 2, coach_mentor: 1 };
        effectiveRole = [...staffRows]
          .sort((a, b) => (priority[b.role] || 0) - (priority[a.role] || 0))[0]?.role || effectiveRole;
      } else {
        const { data: assignments, error: assignmentError } = await supabase
          .from("coach_assignments")
          .select("age_group_id")
          .eq("user_id", userId);
        if (!assignmentError && assignments?.length) {
          assignedTeamIds = assignments.map((assignment) => assignment.age_group_id);
        }
      }

      const capabilities = roleCapabilities(effectiveRole);
      setUserRole({ ...(roleData || {}), role: effectiveRole, club_id: effectiveClubId, capabilities });
      setMyTeams(capabilities.isClubAdmin ? [] : assignedTeamIds);
    } catch (error) {
      console.error("Unable to initialise platform access:", error);
      // Never lock Elaine out of a module because an older RBAC table differs.
      setEnabledModules(allModules);
      setUserRole({ role: "coach_mentor", club_id: null, capabilities: roleCapabilities("coach_mentor") });
      setMyTeams([]);
      loadSkills();
      loadActivities();
      loadUpcoming();
    } finally {
      setAuthLoading(false);
    }
  }

  async function login() { setLoggingIn(true); setAuthError(""); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); setLoggingIn(false); }
  async function signup() { setLoggingIn(true); setAuthError(""); const { error } = await supabase.auth.signUp({ email, password }); if (error) setAuthError(error.message); else setAuthError("Check your email to confirm."); setLoggingIn(false); }
  async function logout() { await supabase.auth.signOut(); setSession(null); setUserRole(null); setClub(null); setSelectedTeam(null); }

  // Restore and synchronise the one active team shared by every Spraoi module.
  useEffect(() => {
    if (!ageGroups.length || !userRole?.role) return;
    const allowedTeams = permissions.isClubAdmin
      ? ageGroups
      : ageGroups.filter((ag) => (myTeams || []).includes(ag.id));
    const savedId = requestedTeamFromUrl(null) || localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
    const found = allowedTeams.find((ag) => String(ag.id) === String(savedId));

    if (found && String(found.id) !== String(selectedTeam?.id || "")) {
      setSelectedTeam(found);
      saveActiveContext(found, club);
    } else if (!found && selectedTeam && !allowedTeams.some((ag) => String(ag.id) === String(selectedTeam.id))) {
      setSelectedTeam(null);
    } else if (!selectedTeam && allowedTeams.length > 0) {
      // Cup needs a context team for shared club data, but state changes must
      // happen in an effect, never while rendering.
      setSelectedTeam(allowedTeams[0]);
      saveActiveContext(allowedTeams[0], club);
    }
  }, [ageGroups, myTeams, userRole?.role, selectedTeam?.id, permissions.isClubAdmin, club?.id]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.type === "storage" && event.key && ![ACTIVE_TEAM_KEY, "spraoi_team_id", ACTIVE_CLUB_KEY].includes(event.key)) return;
      const teamId = event?.detail?.teamId || localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
      if (!teamId) {
        setSelectedTeam(null);
        return;
      }
      const allowedTeams = permissions.isClubAdmin
        ? ageGroups
        : ageGroups.filter((ag) => (myTeams || []).includes(ag.id));
      const found = allowedTeams.find((ag) => String(ag.id) === String(teamId));
      if (found) setSelectedTeam(found);
      else if (!permissions.isClubAdmin) setSelectedTeam(null);
    };
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(ACTIVE_CONTEXT_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(ACTIVE_CONTEXT_EVENT, syncFromStorage);
    };
  }, [ageGroups, myTeams, userRole?.role]);

  useEffect(() => {
    if (club?.id) localStorage.setItem(ACTIVE_CLUB_KEY, String(club.id));
  }, [club?.id]);

  useEffect(() => { if (selectedTeam?.id) loadAcademyCoachPlan(selectedTeam.id); }, [selectedTeam?.id]);

  function selectTeam(ag) {
    setSelectedTeam(ag);
    saveActiveContext(ag, club);
    loadUpcoming(ag.id);
    loadAcademyCoachPlan(ag.id);
  }
  function clearTeam() {
    setSelectedTeam(null);
    saveActiveContext(null, club);
  }

  async function loadAgeGroups(clubId) { const { data } = await supabase.from("age_groups").select("*").eq("club_id", clubId).order("label"); setAgeGroups(data || []); }
  async function loadSkills() { const { data } = await supabase.from("skills").select("*").order("sport, category, name"); setSkills(data || []); }
  async function loadActivities() { const { data } = await supabase.from("activities").select("*, skill:skills!activities_skill_id_fkey(name, category, video_url)").order("title"); setAllActivities(data || []); }
  async function loadCoaches(clubId) { const { data } = await supabase.from("coaches").select("*").eq("club_id", clubId); setCoaches(data || []); }
  async function loadDiagramMap() { try { const r = await fetch("/diagrams/diagram-map.json"); setDiagramMap(await r.json()); } catch { } }
  async function loadUpcoming(ageGroupId) {
    let query = supabase.from("sessions").select("*, plan:weekly_plans(week_number, mode, age_group_id, hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name))").order("session_date", { ascending: true }).limit(50);
    const { data } = await query;
    let results = (data || []).filter((s) => s.session_date);
    // Store all for planner, filtered for dashboard
    setUpcomingSessions(results);
  }

  async function loadAcademyCoachPlan(ageGroupId) {
    if (!ageGroupId) { setWeeklyPlan(null); setPlanSessions([]); return; }
    try {
      const { data: plans, error: planError } = await supabase.from("weekly_plans").select("*").eq("age_group_id", ageGroupId).order("created_at", { ascending: false }).limit(1);
      if (planError) throw planError;
      const plan = plans?.[0] || null;
      setWeeklyPlan(plan);
      setAcademyPublished(Boolean(plan?.published));
      setAcademyVideoOverrides(plan?.academy_video_overrides || {});
      if (!plan?.id) { setPlanSessions([]); setAcademyExtras([]); return; }
      const { data: savedExtras } = await supabase.from("journey_exercises").select("*").eq("plan_id", plan.id).order("sort_order", { ascending: true });
      if (savedExtras) setAcademyExtras(savedExtras.map(x => ({ ...x, xp: x.xp_reward, type: x.activity_type || "exercise", instruction: x.description || "", target: "" })));
      const { data: sessions, error: sessionError } = await supabase.from("sessions").select("*").eq("plan_id", plan.id).order("session_date", { ascending: true });
      if (sessionError) throw sessionError;
      const sessionList = sessions || [];
      if (!sessionList.length) { setPlanSessions([]); return; }
      const ids = sessionList.map(x => x.id);
      const { data: links, error: linksError } = await supabase.from("session_activities").select("*").in("session_id", ids).order("sort_order", { ascending: true });
      if (linksError) throw linksError;
      const activityIds = [...new Set((links || []).map(x => x.activity_id).filter(Boolean))];
      let activities = [];
      if (activityIds.length) {
        const { data } = await supabase.from("activities").select("*, skill:skills(id, name, sport, category, video_url)").in("id", activityIds);
        activities = data || [];
      }
      const amap = Object.fromEntries(activities.map(a => [a.id, a]));
      const hydrated = sessionList.map(sess => ({ ...sess, session_activities: (links || []).filter(x => x.session_id === sess.id).map(x => ({ ...x, activity: amap[x.activity_id] || { id: x.activity_id, title: "Coach drill" } })) }));
      setPlanSessions(hydrated);
    } catch (error) {
      console.error("Academy Coach sync failed", error);
      setWeeklyPlan(null); setPlanSessions([]);
    }
  }

  async function setAcademyVideoOverride(activityId, skillId) {
    const next = { ...academyVideoOverrides };
    if (skillId) next[activityId] = skillId; else delete next[activityId];
    setAcademyVideoOverrides(next);
    if (weeklyPlan?.id) {
      const { error } = await supabase.from("weekly_plans").update({ academy_video_overrides: next }).eq("id", weeklyPlan.id);
      if (error) console.error("Could not save Academy video choice", error);
    }
  }

  async function addAcademyExtra(extra) {
    if (!weeklyPlan?.id || !selectedTeam?.id || !club?.id) {
      setAcademyExtras(prev => { const next=[...prev, extra]; localStorage.setItem("spraoi_academy_extras", JSON.stringify(next)); return next; });
      return;
    }
    const { data, error } = await supabase.from("journey_exercises").insert({
      plan_id: weeklyPlan.id,
      age_group_id: selectedTeam.id,
      club_id: club.id,
      title: extra.title,
      description: [extra.target, extra.instruction].filter(Boolean).join(" · ") || null,
      xp_reward: Number(extra.xp) || 5,
      sort_order: academyExtras.length,
      activity_type: extra.type || "exercise",
      required: Boolean(extra.required),
    }).select().single();
    if (error) {
      console.warn("Academy extra saved locally because the optional activity_type/required columns are not available yet", error.message);
      setAcademyExtras(prev => { const next=[...prev, extra]; localStorage.setItem("spraoi_academy_extras", JSON.stringify(next)); return next; });
      return;
    }
    setAcademyExtras(prev => [...prev, { ...extra, ...data, xp: data.xp_reward, type: data.activity_type || extra.type }]);
  }
  async function removeAcademyExtra(id) {
    if (!String(id).startsWith("local-")) await supabase.from("journey_exercises").delete().eq("id", id);
    setAcademyExtras(prev => { const next=prev.filter(x=>x.id!==id); localStorage.setItem("spraoi_academy_extras", JSON.stringify(next)); return next; });
  }
  async function updateAcademyExtra(id, changes) {
    const merged = academyExtras.find(x => x.id === id);
    if (!merged) return;
    if (!String(id).startsWith("local-")) {
      const { error } = await supabase.from("journey_exercises").update({
        title: changes.title,
        description: [changes.target, changes.instruction].filter(Boolean).join(" · ") || null,
        xp_reward: Number(changes.xp) || 0,
        activity_type: changes.type || "exercise",
        required: Boolean(changes.required),
      }).eq("id", id);
      if (error) console.warn("Could not update Academy activity remotely", error.message);
    }
    setAcademyExtras(prev => { const next=prev.map(x=>x.id===id?{...x,...changes,xp:changes.xp}:x); localStorage.setItem("spraoi_academy_extras",JSON.stringify(next)); return next; });
  }
  async function moveAcademyExtra(id, direction, groupTest) {
    const group = academyExtras.filter(groupTest);
    const current = group.findIndex(x => x.id === id);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= group.length) return;
    const a = group[current], b = group[target];
    const full = [...academyExtras];
    const ia = full.findIndex(x=>x.id===a.id), ib = full.findIndex(x=>x.id===b.id);
    [full[ia], full[ib]] = [full[ib], full[ia]];
    setAcademyExtras(full);
    localStorage.setItem("spraoi_academy_extras", JSON.stringify(full));
    await Promise.all(full.filter(x=>!String(x.id).startsWith("local-")).map((x,index)=>supabase.from("journey_exercises").update({sort_order:index}).eq("id",x.id)));
  }

  async function publishAcademyWeek() {
    const next=!academyPublished;
    if (weeklyPlan?.id) await supabase.from("weekly_plans").update({ published: next }).eq("id", weeklyPlan.id);
    setAcademyPublished(next);
    localStorage.setItem("spraoi_academy_published", String(next));
  }
  function updateAcademyParents(value) { setAcademyParents(prev => { const next=typeof value === "function" ? value(prev) : value; localStorage.setItem("spraoi_academy_parents", JSON.stringify(next)); return next; }); }

  async function toggleFavourite(activityId) {
    const isFav = favouriteIds.includes(activityId);
    if (isFav) {
      setFavouriteIds((prev) => prev.filter((id) => id !== activityId));
      await supabase.from("coach_favourites").delete().eq("activity_id", activityId);
    } else {
      setFavouriteIds((prev) => [...prev, activityId]);
      const coachId = coaches[0]?.id;
      if (coachId) await supabase.from("coach_favourites").insert({ coach_id: coachId, activity_id: activityId });
    }
  }

  // Auth loading
  if (authLoading && !shareToken) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.navy, fontFamily: F.body }}>
        <div style={{ width: 66, height: 66, borderRadius: 20, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 10px 28px rgba(0,0,0,.18)" }}><img src="/spraoi-cup-icon.png" alt="Spraoi Cup" style={{ width: 48, height: 48, objectFit: "contain" }} /></div>
      </div>
    );
  }

  // Public share view — no login required
  if (shareToken) {
    if (!sharedSession && shareLoading) {
      supabase.from("weekly_plans").select("*, hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name), sessions(*, session_activities(*, activity:activities(*, skill:skills!activities_skill_id_fkey(name, category)), coach:coaches(name)))").eq("share_token", shareToken).single().then(({ data }) => { setSharedSession(data); setShareLoading(false); });
      return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.soft, fontFamily: F.body }}><div style={{ fontFamily: F.body, fontSize: 12, color: P.muted }}>Loading...</div></div>;
    }
    if (!sharedSession) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.soft, fontFamily: F.body }}><div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Session not found</div></div>;

    const sess = sharedSession.sessions?.[0];
    const activities = sess?.session_activities?.sort((a, b) => a.sort_order - b.sort_order) || [];
    let phases = null;
    try { phases = sess?.notes ? JSON.parse(sess.notes) : null; } catch { }

    return (
      <div style={{ minHeight: "100vh", background: P.soft, fontFamily: F.body }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ background: `linear-gradient(135deg, ${P.p700}, ${P.p900})`, borderRadius: 14, padding: 20, color: "#fff", marginBottom: 16 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", opacity: 0.6 }}>Training Session</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 900, marginTop: 4 }}>{sharedSession.hurling_skill?.name || "Session Plan"}</div>
            {sess?.session_date && <div style={{ fontFamily: F.body, fontSize: 12, opacity: 0.8, marginTop: 4 }}>{new Date(sess.session_date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</div>}
            <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sess?.total_duration_mins || "?"}min · {activities.length} drills</div>
          </div>
          {sharedSession.coach_notes && <div style={{ background: P.cream, borderRadius: 10, padding: 12, marginBottom: 14, fontFamily: F.body, fontSize: 12, color: P.ink, lineHeight: 1.5 }}><strong style={{ color: P.orange }}>Notes:</strong> {sharedSession.coach_notes}</div>}
          {phases && phases.filter((p) => p.type !== "stations" && p.duration).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4, background: P.white, borderRadius: 8, border: `1px solid ${P.line}`, flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.type === "warmup" ? P.orange : p.type === "cooldown" ? "#29b6f6" : P.green }} />
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink }}>{p.label} — {p.duration}min</span>
              {p.coachName && <span style={{ fontFamily: F.body, fontSize: 10, color: P.p600, marginLeft: "auto" }}>{p.coachName}</span>}
              {p.notes && <div style={{ width: "100%", fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4, paddingLeft: 16 }}>{p.notes}</div>}
            </div>
          ))}
          {activities.map((sa, i) => {
            const act = sa.activity || {};
            const { sportIcon, catIcon } = getDrillIcons(act);
            const df = diagramMap[act.title];
            return (
              <div key={sa.id} style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.line}`, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 900, color: P.p600 }}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: sportIcon.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                    <img src={sportIcon.icon} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }} />
                    {catIcon && <img src={catIcon.icon} alt="" style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, objectFit: "contain", background: "#fff", borderRadius: 2, padding: 1 }} />}
                  </div>
                  <div style={{ flex: 1 }}><div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink }}>{act.title}</div><div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{act.skill?.name || ""} · {act.duration_mins || "?"}min</div></div>
                  {sa.coach && <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600 }}>{sa.coach.name}</span>}
                </div>
                {df && <img src={`/diagrams/${df}`} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />}
                {sa.coach?.name && <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, marginBottom: 6, background: `${P.p600}10`, borderRadius: 4, padding: "3px 8px", display: "inline-block" }}>Coach: {sa.coach.name}</div>}
                {act.description && <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5, marginBottom: 6 }}>{act.description}</div>}
                {act.coaching_points && <div style={{ marginBottom: 6 }}><div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, marginBottom: 2 }}>COACHING POINTS</div><div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5, background: P.soft, borderRadius: 6, padding: 8 }}>{act.coaching_points}</div></div>}
                {act.setup && <div style={{ marginBottom: 6 }}><div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, marginBottom: 2 }}>SETUP</div><div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5 }}>{act.setup}</div></div>}
                {act.equipment && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}><strong>Equipment:</strong> {act.equipment}</div>}
              </div>
            );
          })}
          <div style={{ textAlign: "center", padding: "16px 0", fontFamily: F.body, fontSize: 10, color: P.muted }}>Spraoi Sports · spraoisports.com</div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: P.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, padding: 16 }}>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 180, height: "auto", marginBottom: 10 }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,.72)", marginTop: 4 }}>
              <img src="/spraoi-cup-icon.png" alt="" style={{ width:22, height:22, objectFit:"contain", background:"#fff", borderRadius:7, padding:2, boxSizing:"border-box" }} />
              <span>Cup</span>
            </div>
          </div>
          <div style={{ background: P.white, borderRadius: 18, padding: 28, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 16 }}>Sign In</div>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="organiser@email.com" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginTop: 4, marginBottom: 12, background: P.soft }} />
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" onKeyDown={(e) => e.key === "Enter" && login()} style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginTop: 4, marginBottom: 16, background: P.soft }} />
            {authError && <div style={{ color: P.coral, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
            <button onClick={login} disabled={loggingIn || !email || !password} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontFamily: F.display, fontSize: 14, fontWeight: 800, background: CUP_ORANGE, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(230,81,0,.28)" }}>
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
            <button onClick={signup} disabled={loggingIn} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: "none", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: P.muted, cursor: "pointer", marginTop: 8 }}>
              Don't have an account? Sign up
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading club data
  if (!club) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.soft, fontFamily: F.body }}>
        <div style={{ width: 66, height: 66, borderRadius: 20, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 10px 28px rgba(16,36,62,.12)" }}><img src="/spraoi-cup-icon.png" alt="Spraoi Cup" style={{ width: 48, height: 48, objectFit: "contain" }} /></div>
      </div>
    );
  }

  // Team access is RBAC-owned.
  // Admins may see all club teams; Lead Coach / Coach-Mentor only see assigned teams.
  if (!selectedTeam && ageGroups.length > 0) {
    if (!permissions.isClubAdmin && myTeams.length === 0) {
      return (
        <div style={{ minHeight: "100vh", background: P.soft, display: "grid", placeItems: "center", fontFamily: F.body, padding: 18 }}>
          <div style={{ width: "min(100%, 520px)", background: P.white, borderRadius: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 24, textAlign: "center" }}>
            <img src="/spraoi-cup-icon.png" alt="" style={{ width: 64, height: 64, objectFit: "contain" }} />
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 900, color: P.ink, marginTop: 10 }}>No team assigned</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, lineHeight: 1.6, marginTop: 6 }}>
              A Club Admin must assign your account to a team before team or Cup event data is shown.
            </div>
          </div>
        </div>
      );
    }

    // Never call selectTeam() during render. Calling a state setter here
    // causes React's "Too many re-renders" error. The team-selection effect
    // above owns automatic restoration/selection.
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: P.soft, fontFamily: F.body }}>
        <div style={{ textAlign: "center", color: P.muted }}>
          <img src="/spraoi-cup-icon.png" alt="" style={{ width: 54, height: 54, objectFit: "contain", marginBottom: 10 }} />
          <div style={{ fontFamily: F.display, fontWeight: 900, color: P.ink }}>Loading Cup…</div>
        </div>
      </div>
    );
  }

  async function openSession(sess) {
    const { data } = await supabase.from("sessions").select("*, session_activities(*, activity:activities(*, skill:skills!activities_skill_id_fkey(name, category)), coach:coaches(name)), plan:weekly_plans(week_number, mode, coach_notes, hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name))").eq("id", sess.id).single();
    setSessionDetail(data);
    setPitchView(false);
  }

  async function editSession(sess) {
    const { data } = await supabase.from("sessions").select("*, session_activities(*, activity:activities(*, skill:skills!activities_skill_id_fkey(name, category)), coach:coaches(name)), plan:weekly_plans(week_number, mode, coach_notes)").eq("id", sess.id).single();
    setEditingSession(data);
    setScreen("coach-builder");
  }

  async function shareSessionImage() {
    if (!sessionDetail) { alert("Open a session first"); return; }
    try {
      const { data: plan } = await supabase.from("weekly_plans").select("share_token").eq("id", sessionDetail.plan_id).single();
      if (!plan?.share_token) { alert("Could not get share link"); return; }
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${plan.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareUrl(shareUrl);
    } catch (e) {
      alert("Share error: " + e.message);
    }
  }

  const showMobile = isMobile;

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", fontFamily: F.body, paddingTop: showMobile ? 62 : 0, paddingBottom: showMobile ? 68 : 0, boxSizing: "border-box" }}>
      {showMobile && <MobileHeader activeModule={activeModule} setActiveModule={setActiveModule} onNav={setScreen} enabledModules={enabledModules} club={club} selectedTeam={selectedTeam} ageGroups={ageGroups} myTeams={myTeams} onSelectTeam={selectTeam} onShowProfile={()=>setShowProfile(true)} />}

      {/* Sidebar — desktop only */}
      {!showMobile && <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} activeScreen={screen} onNav={setScreen} club={club} selectedTeam={selectedTeam} onSelectTeam={selectTeam} enabledModules={enabledModules} onLogout={logout} ageGroups={ageGroups} myTeams={myTeams} onShowProfile={() => setShowProfile(true)} canManageAllTeams={permissions.isClubAdmin} />}

      {/* COACH screens */}
      {screen === "coach-dashboard" && <DashboardScreen club={club} ageGroups={ageGroups} planSessions={planSessions} weeklyPlan={weeklyPlan} upcomingSessions={upcomingSessions} onNav={setScreen} onOpenSession={openSession} allActivities={allActivities} selectedTeam={selectedTeam} canEdit={permissions.canEditCoachPlans} />}
      {screen === "coach-planner" && <PlannerScreen onNav={setScreen} club={club} ageGroups={ageGroups} upcomingSessions={upcomingSessions} onOpenSession={openSession} allActivities={allActivities} coaches={coaches} skills={skills} diagramMap={diagramMap} selectedTeam={selectedTeam} canEdit={permissions.canEditCoachPlans} />}
      {screen === "coach-sessions" && <SessionsListScreen club={club} selectedTeam={selectedTeam} onOpenSession={openSession} onNav={setScreen} onEditSession={editSession} canEdit={permissions.canEditCoachPlans} />}
      {screen === "coach-builder" && (
        permissions.canEditCoachPlans
          ? <SessionBuilderScreen club={club} ageGroups={ageGroups} skills={skills} allActivities={allActivities} coaches={coaches} diagramMap={diagramMap} selectedTeam={selectedTeam} onNav={setScreen} editingSession={editingSession} onClearEdit={() => setEditingSession(null)} />
          : <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
              <TopBar title="Session Builder" sub={selectedTeam?.label || "No team selected"} />
              <CoachReadOnlyNotice title="Editing unavailable" message="Your Coach / Mentor role is read-only. Ask a Club Admin to assign Lead Coach access if you need to create or amend sessions." />
            </div>
      )}
      {screen === "coach-drills" && <DrillsScreen allActivities={allActivities} diagramMap={diagramMap} favouriteIds={favouriteIds} onToggleFavourite={toggleFavourite} userRole={userRole} />}
      {screen === "coach-players" && <PlayersScreen club={club} ageGroups={ageGroups} selectedTeam={selectedTeam} />}

      {/* CLUB screens */}
      {screen === "club-permissions" && <ClubPermissionsScreen club={club} userRole={userRole} />}
      {screen.startsWith("club-") && screen !== "club-permissions" && <ModulePlaceholder module={MODULES.club} screen={screen} club={club} />}

      {/* CUP screens */}
      {screen.startsWith("cup-") && <CupModuleScreen screen={screen} onNav={setScreen} contextTeam={selectedTeam} canEditSchedule={permissions.isLeadCoach || permissions.isClubAdmin} />}

      {/* CONNECT screens */}
      {screen.startsWith("connect-") && <ModulePlaceholder module={MODULES.connect} screen={screen} club={club} />}

      {/* ACADEMY ADMIN screens */}
      {screen === "academy-dashboard" && (
        <AcademyDashboardScreen
          selectedTeam={selectedTeam}
          weeklyPlan={weeklyPlan}
          planSessions={planSessions}
          extras={academyExtras}
          skills={skills}
          overrides={academyVideoOverrides}
          published={academyPublished}
          onSetOverride={setAcademyVideoOverride}
          onNav={setScreen}
        />
      )}
      {screen.startsWith("academy-") && screen !== "academy-dashboard" && (
        <AcademySectionScreen screen={screen} onNav={setScreen} selectedTeam={selectedTeam} weeklyPlan={weeklyPlan} planSessions={planSessions} extras={academyExtras} skills={skills} overrides={academyVideoOverrides} onSetOverride={setAcademyVideoOverride} onAddExtra={addAcademyExtra} onUpdateExtra={updateAcademyExtra} onRemoveExtra={removeAcademyExtra} onMoveExtra={moveAcademyExtra} published={academyPublished} onPublish={publishAcademyWeek} parentRows={academyParents} setParentRows={updateAcademyParents} />
      )}

      {/* PLUS screens */}
      {screen.startsWith("plus-") && <ModulePlaceholder module={MODULES.plus} screen={screen} club={club} />}

      {screen.startsWith("access-denied-") && <AccessDeniedScreen module={MODULES[screen.replace("access-denied-", "")] || MODULES[activeModule]} club={club} />}

      {/* Profile Modal */}
      {showProfile && (
        <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: P.white, borderRadius: 18, maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: Sh.lift }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${P.line}` }}>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>Profile</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: P.muted }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {/* User info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${P.p600}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 18, fontWeight: 900, color: P.p600 }}>
                  {session?.user?.email?.[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: P.ink }}>{session?.user?.email || "Coach"}</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{club?.name}</div>
                </div>
              </div>

              {/* My Teams — assignments are controlled by Club Admin */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink, marginBottom: 8 }}>My Teams</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(permissions.isClubAdmin ? ageGroups : ageGroups.filter((ag) => myTeams.includes(ag.id))).map((ag) => (
                    <div key={ag.id} style={{ padding: "6px 10px", borderRadius: 8, background: P.soft, border: `1px solid ${P.line}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink }}>{teamDisplayName(ag)}</span>
                    </div>
                  ))}
                  {!permissions.isClubAdmin && myTeams.length === 0 && (
                    <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>No team assigned</div>
                  )}
                </div>
              </div>

              {/* Logout */}
              <button onClick={() => { setShowProfile(false); logout(); }} style={{ width: "100%", padding: 12, borderRadius: 10, border: `1.5px solid ${P.coral}33`, background: `${P.coral}08`, fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.coral, cursor: "pointer" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {shareUrl && (
        <div onClick={() => setShareUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: P.white, borderRadius: 16, maxWidth: 400, width: "100%", padding: 24, boxShadow: Sh.lift, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink, marginBottom: 6 }}>Link Copied!</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: P.muted, marginBottom: 14 }}>Share this link with your coaches. They can view the full session without an account.</div>
            <div style={{ background: P.soft, borderRadius: 8, padding: "10px 12px", marginBottom: 16, wordBreak: "break-all", fontFamily: F.body, fontSize: 11, color: P.ink, textAlign: "left" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${P.p600}`, background: P.white, fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.p600, cursor: "pointer" }}>Copy Again</button>
              <a href={`https://wa.me/?text=${encodeURIComponent("Training session plan: " + shareUrl)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#25d366", fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", textDecoration: "none", textAlign: "center" }}>WhatsApp</a>
            </div>
            <button onClick={() => setShareUrl(null)} style={{ marginTop: 12, background: "none", border: "none", fontFamily: F.body, fontSize: 11, color: P.muted, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {sessionDetail && (
        <div onClick={() => setSessionDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: P.white, borderRadius: 18, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: Sh.lift }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${P.line}`, position: "sticky", top: 0, background: P.white, borderRadius: "18px 18px 0 0", zIndex: 1 }}>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>Session Details</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>
                  {sessionDetail.session_date ? new Date(sessionDetail.session_date).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" }) : ""}
                  {sessionDetail.plan?.hurling_skill?.name ? ` · ${sessionDetail.plan.hurling_skill.matchedSkill?.name || "Needs review"}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPitchView(!pitchView)} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${pitchView ? "#43a047" : P.line}`, background: pitchView ? "#e8f5e9" : P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: pitchView ? "#2e7d32" : P.muted, cursor: "pointer" }}>
                  {pitchView ? "◈ List" : "◈ Pitch"}
                </button>
                <button onClick={() => { setSessionDetail(null); editSession(sessionDetail); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${P.p600}`, background: P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.p600, cursor: "pointer" }}>Edit</button>
                <button onClick={shareSessionImage} data-share-btn style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: P.p600, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Share</button>
                <button onClick={() => setSessionDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: P.muted }}>×</button>
              </div>
            </div>

            {/* Content */}
            <div id="session-detail-content" style={{ padding: 20 }}>
              {/* Header for share image */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src="/spraoi-logo-white.png" alt="" style={{ width: 80, height: "auto", display: "none" }} />
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>
                    {sessionDetail.session_date ? new Date(sessionDetail.session_date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : "Training Session"}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{selectedTeam?.label} {selectedTeam?.gender === "girls" ? "Girls" : "Boys"} · {sessionDetail.total_duration_mins}min · {sessionDetail.session_activities?.length || 0} drills</div>
                </div>
              </div>

              {/* Coach notes */}
              {sessionDetail.plan?.coach_notes && (
                <div style={{ background: P.cream, borderRadius: 10, padding: 12, marginBottom: 16, fontFamily: F.body, fontSize: 12, color: P.ink, lineHeight: 1.5 }}>
                  <strong style={{ color: P.orange }}>Coach Notes:</strong> {sessionDetail.plan.coach_notes}
                </div>
              )}

              {/* Session phases from notes JSON */}
              {(() => {
                let phases = null;
                try { phases = sessionDetail.notes ? JSON.parse(sessionDetail.notes) : null; } catch { }
                if (phases && Array.isArray(phases)) {
                  return phases.filter((p) => p.type !== "stations" && p.duration).map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.type === "warmup" ? P.orange : p.type === "cooldown" ? "#29b6f6" : P.green }} />
                      <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink }}>{p.label}</span>
                      <span style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{p.duration}min</span>
                      {p.coachName && <span style={{ fontFamily: F.body, fontSize: 10, color: P.p600 }}>{p.coachName}</span>}
                    </div>
                  ));
                }
                return null;
              })()}

              {!pitchView ? (
                /* List view — text only for easy reading */
                <div>
                  {sessionDetail.session_activities?.sort((a, b) => a.sort_order - b.sort_order).map((sa, i) => {
                    const act = sa.activity || {};
                    return (
                      <div key={sa.id} style={{ padding: "12px 0", borderBottom: `1px solid ${P.line}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 900, color: P.p600, width: 22 }}>{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink }}>{act.title}</div>
                            <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{act.skill?.name || ""} · {act.duration_mins || "?"}min</div>
                          </div>
                          {sa.coach && <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600 }}>{sa.coach.name}</span>}
                        </div>
                        {act.description && <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5, marginBottom: 4, marginLeft: 32 }}>{act.description}</div>}
                        {act.coaching_points && (
                          <div style={{ marginLeft: 32, marginBottom: 4 }}>
                            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 2 }}>Coaching Points</div>
                            <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5, background: P.soft, borderRadius: 6, padding: 8 }}>{act.coaching_points}</div>
                          </div>
                        )}
                        {act.setup && (
                          <div style={{ marginLeft: 32, marginBottom: 4 }}>
                            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, textTransform: "uppercase", marginBottom: 2 }}>Setup</div>
                            <div style={{ fontFamily: F.body, fontSize: 11, color: P.ink, lineHeight: 1.5 }}>{act.setup}</div>
                          </div>
                        )}
                        {act.equipment && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 32 }}><strong>Equipment:</strong> {act.equipment}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Pitch setup view */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {sessionDetail.session_activities?.sort((a, b) => a.sort_order - b.sort_order).map((sa, i) => {
                    const { sportIcon, catIcon } = getDrillIcons(sa.activity || {});
                    const df = diagramMap[sa.activity?.title];
                    return (
                      <div key={sa.id} style={{ borderRadius: 10, overflow: "hidden", border: `1.5px solid ${P.line}` }}>
                        <div style={{ background: P.p600, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: F.display, fontSize: 12, fontWeight: 900, color: "#fff" }}>{i + 1}</span>
                          <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{sa.activity?.title?.substring(0, 20)}</span>
                        </div>
                        {sa.coach && <div style={{ background: P.p50, padding: "3px 10px", fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600 }}>{sa.coach.name}</div>}
                        {df ? (
                          <img src={`/diagrams/${df}`} alt="" style={{ width: "100%", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: 80, background: sportIcon.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={sportIcon.icon} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.25))" }} />
                            {catIcon && <img src={catIcon.icon} alt="" style={{ width: 20, height: 20, objectFit: "contain", marginLeft: 6, opacity: 0.7 }} />}
                          </div>
                        )}
                        {sa.activity?.setup && <div style={{ padding: "6px 10px", fontFamily: F.body, fontSize: 10, color: P.ink, lineHeight: 1.4 }}>{sa.activity.setup.substring(0, 80)}...</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      {showMobile && <MobileNav activeModule={activeModule} screen={screen} onNav={setScreen} enabledModules={enabledModules} />}
    </div>
  );
}
