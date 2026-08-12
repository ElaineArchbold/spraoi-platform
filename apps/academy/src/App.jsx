import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import html2canvas from "html2canvas";

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
  display: "'Nunito', system-ui, sans-serif",
  body: "'Work Sans', system-ui, sans-serif",
};
const Sh = {
  card: "0 2px 12px rgba(142,36,170,.06), 0 1px 3px rgba(13,49,87,.05)",
  lift: "0 8px 24px rgba(142,36,170,.12), 0 2px 6px rgba(13,49,87,.06)",
};

/* ============================================================
   CATEGORY ICON MAPPING — sport + category dual tags on drill cards
   ============================================================ */

function mondayKeyForDate(value) {
  const d = value ? new Date(`${String(value).slice(0,10)}T12:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const ACTIVE_TEAM_KEY = "spraoi_active_team_id";
const ACTIVE_CLUB_KEY = "spraoi_active_club_id";
const ACTIVE_CONTEXT_EVENT = "spraoi-active-context";

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
const APP_MODULE = import.meta.env.VITE_APP_MODULE || "academy";
const MODULE_URLS = {
  coach: import.meta.env.VITE_COACH_URL || "http://localhost:5173",
  academy: import.meta.env.VITE_ACADEMY_ADMIN_URL || "http://localhost:5176",
  club: import.meta.env.VITE_CLUB_URL || "http://localhost:5174",
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
      { id: "academy-approvals", icon: "✓", label: "Approvals" },
      { id: "academy-settings", icon: "⚙", label: "Settings" },
    ],
  },
  cup: {
    label: "Cup", color: "#e65100", icon: "/spraoi-cup-icon.png", tagline: "Set up and run blitzes and tournaments.", nav: [
      { id: "cup-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "cup-events", icon: "◆", label: "Events" },
      { id: "cup-teams", icon: "●", label: "Teams" },
      { id: "cup-schedule", icon: "◫", label: "Schedule" },
      { id: "cup-results", icon: "★", label: "Results" },
      { id: "cup-participant-view", icon: "↗", label: "Participant View" },
      { id: "cup-settings", icon: "⚙", label: "Settings" },
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
function Sidebar({ activeModule, setActiveModule, activeScreen, onNav, club, selectedTeam, onSelectTeam, enabledModules, onLogout, ageGroups, myTeams, onShowProfile }) {
  const visibleTeams = myTeams?.length ? (ageGroups || []).filter((ag) => myTeams.includes(ag.id)) : (ageGroups || []);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";

  function openModule(key, module) {
    const externalUrl = MODULE_URLS[key];
    if (key !== APP_MODULE && externalUrl) {
      window.location.assign(externalUrl);
      return;
    }
    setActiveModule(key);
    onNav(module.nav[0].id);
  }

  return (
    <div style={{ width: 306, minHeight: "100vh", display: "flex", flexShrink: 0, position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", zIndex: 30 }}>
      {/* Fixed global module rail: all modules are always reachable without scrolling */}
      <aside style={{ width: 78, background: "#10243e", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: 8, borderRight: "1px solid rgba(255,255,255,.08)" }}>
        <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 56, height: 36, objectFit: "contain", marginBottom: 6 }} />
        <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>
          {Object.entries(MODULES).map(([key, module]) => {
            const isActive = activeModule === key;
            const locked = !enabledModules.includes(key);
            const darkText = key === "connect";
            return (
              <button key={key} title={`${module.label}${locked ? " — contact your administrator" : ""}`} onClick={() => openModule(key, module)} style={{ width: "100%", minHeight: 62, border: "none", borderRadius: 14, cursor: "pointer", background: isActive ? module.color : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, position: "relative", boxShadow: isActive ? "0 8px 22px rgba(0,0,0,.24)" : "none" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", boxShadow: isActive ? "0 6px 16px rgba(0,0,0,.18)" : "0 3px 10px rgba(0,0,0,.10)" }}><img src={module.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: locked ? "grayscale(1) opacity(.55)" : "none" }} /></span>
                <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: isActive ? (darkText ? "#332800" : "#fff") : "rgba(255,255,255,.7)" }}>{module.label}</span>
                {locked && <span style={{ position: "absolute", top: 5, right: 5, fontSize: 9, color: "rgba(255,255,255,.8)" }}>🔒</span>}
              </button>
            );
          })}
        </div>
        <button onClick={onShowProfile} title="Profile" style={{ width: 42, height: 42, borderRadius: 13, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontWeight: 900 }}>EA</button>
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
          {visibleTeams.length > 1 ? (
            <select value={selectedTeam?.id || ""} onChange={(e) => { const ag = ageGroups?.find((a) => a.id === e.target.value); if (ag) onSelectTeam(ag); }} style={{ width: "100%", padding: "9px 10px", borderRadius: 9, border: activeModule === "connect" ? "1px solid rgba(51,40,0,.2)" : "1px solid rgba(255,255,255,.2)", background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: activeModule === "connect" ? "#332800" : "#fff", cursor: "pointer" }}>
              {visibleTeams.map((ag) => <option key={ag.id} value={ag.id} style={{ color: P.ink }}>{ag.label} {ag.gender === "girls" ? "Girls" : "Boys"}</option>)}
            </select>
          ) : selectedTeam ? (
            <div style={{ padding: "9px 10px", borderRadius: 9, background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700 }}>{selectedTeam.label} {selectedTeam.gender === "girls" ? "Girls" : "Boys"}</div>
          ) : null}
        </div>

        <nav style={{ flex: 1, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {mod.nav.map((item) => {
            const isActive = activeScreen === item.id || (item.id === "coach-sessions" && activeScreen === "coach-builder");
            const fg = activeModule === "connect" ? "#332800" : "#fff";
            return (
              <button key={item.id} onClick={() => onNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 10, border: "none", cursor: "pointer", width: "100%", background: isActive ? (activeModule === "connect" ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.2)") : "transparent", textAlign: "left" }}>
                <span style={{ fontSize: 15, color: fg, opacity: isActive ? 1 : .7 }}>{item.icon}</span>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: isActive ? 800 : 600, color: fg, opacity: isActive ? 1 : .76 }}>{item.label}</span>
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
      .spraoi-touch-button { min-height: 42px !important; }
      .spraoi-shell input, .spraoi-shell select, .spraoi-shell textarea { font-size: 16px !important; }
      .spraoi-shell { overflow-x: hidden; }
    }
    @media (max-width: 520px) {
      .spraoi-page-header { padding: 12px !important; }
      .spraoi-page-header-main { align-items: flex-start !important; }
      .spraoi-page-header-icon { width: 44px !important; height: 44px !important; flex-basis: 44px !important; }
      .spraoi-page-header-icon img { width: 33px !important; height: 33px !important; }
      .spraoi-page-header-title { font-size: 19px !important; }
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
    <button className="spraoi-touch-button" onClick={onClick} style={{ height: 36, padding: "0 16px", borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 12, fontWeight: 700, ...styles[variant], ...style }}>
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
function DashboardScreen({ club, ageGroups, planSessions, weeklyPlan, upcomingSessions, onNav, onOpenSession, allActivities, selectedTeam }) {
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
        <Btn label="+ New Session" variant="primary" onClick={() => onNav("coach-builder")} />
      </TopBar>
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
function PlannerScreen({ onNav, club, ageGroups, upcomingSessions, onOpenSession, allActivities, coaches, skills, diagramMap, selectedTeam }) {
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
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setBuildingDate(dateStr);
      setBuildDrills([]);
    }
  }

  function addDrillToBuild(activity) {
    setBuildDrills((d) => [...d, { ...activity, coachId: "" }]);
  }

  async function saveSession(forceSave = false) {
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
        <Btn label="+ New Session" variant="primary" onClick={() => { const d = new Date(); clickDate(d.getDate()); }} />
      </TopBar>
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
      <TopBar title="Session Builder" sub={selectedTeam ? `${selectedTeam.label} ${selectedTeam.gender === "girls" ? "Girls" : "Boys"}` : "Select a team"}>
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
function SessionsListScreen({ club, selectedTeam, onOpenSession, onNav, onEditSession }) {
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
              <Btn label="Edit" variant="secondary" style={{ height: 28, fontSize: 10 }} onClick={(e) => { e.stopPropagation(); onEditSession(sess); }} />
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

  // Academy Admin must remain usable before Coach is connected. When there are no
  // Coach sessions yet, show the club skill library as manual choices instead of
  // blocking the Academy screen. Once Coach sessions exist, the same cards become
  // Coach-informed recommendations.
  const isGirlsTeam = String(selectedTeam?.gender || "").toLowerCase() === "girls";
  if (sourceActivities.length === 0) {
    return ["football", "hurling"].map((code) => {
      const codeSkills = (skills || []).filter((skill) => {
        if (!skill.video_url) return false;
        const sport = String(skill.sport || "").toLowerCase();
        return code === "football" ? sport.includes("football") : (sport.includes("hurl") || sport.includes("camogie"));
      });
      const override = codeSkills.find((skill) => skill.id === overrides?.[code]) || null;
      return {
        id: code, code,
        label: code === "football" ? "Football" : (isGirlsTeam ? "Camogie" : "Hurling"),
        matchedSkill: override || codeSkills[0] || null,
        overridden: Boolean(override),
        matchScore: 0, frequency: 0, sourceDrills: [], alternatives: codeSkills,
        needsReview: true, manualOnly: true,
      };
    });
  }

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
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.frequency - a.frequency;
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

function AcademyPhonePreview({ weeklyPlan = null, planSessions = [], extras = [], skills = [], overrides = {}, published = false, compact = false, selectedTeam = null }) {
  const recommendations = getAcademyWeeklyRecommendations(planSessions, skills, overrides, selectedTeam);
  const football = recommendations.filter((item) => item.code === "football");
  const hurling = recommendations.filter((item) => item.code === "hurling");
  const grouped = { steps: [], exercises: [], runs: [], bonus: [], recovery: [] };
  extras.forEach((extra) => grouped[academyExtraGroup(extra)].push(extra));
  const section = (title, items, color, icon, render) => items.length ? <div style={{ background:"#fff",border:`1px solid ${color}33`,borderRadius:14,padding:11,marginTop:9 }}><div style={{ display:"flex",alignItems:"center",gap:7,fontFamily:F.body,fontSize:10,fontWeight:900,color,textTransform:"uppercase" }}><span>{icon}</span>{title}</div><div style={{ display:"grid",gap:7,marginTop:8 }}>{items.map(render)}</div></div> : null;
  const taskRow=(item)=><div key={item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc" }}><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink}}>{item.title}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2}}>{item.target || item.description || item.instruction || "Complete this mission"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:"#b45309"}}>+{item.xp || item.xp_reward || 10} XP</span></div>;
  const skillRow=(item)=><div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc"}}><div style={{width:32,height:32,borderRadius:9,background:"#e0f2fe",display:"grid",placeItems:"center"}}>▶</div><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink}}>{item.matchedSkill?.name || "Choose weekly video"}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Based on {item.sourceDrills.length} Coach drill{item.sourceDrills.length===1?"":"s"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:900,color:"#b45309"}}>+20 XP</span></div>;
  const visibleCount = football.length+hurling.length+Object.values(grouped).reduce((sum,items)=>sum+items.length,0);
  return <div style={{ width: compact ? 300 : "min(390px,100%)", maxHeight: compact ? 600 : "none", overflow:"hidden", background:"#fff",borderRadius:compact?26:32,border:compact?"6px solid #16324a":"8px solid #16324a",boxShadow:"0 22px 52px rgba(7,89,133,.2)" }}><div style={{background:"linear-gradient(135deg,#38bdf8,#0284c7)",padding:compact?"16px 14px":"22px 18px",color:"#fff",position:"relative",overflow:"hidden"}}><img src="/spraoi-academy-icon.png" alt="" style={{position:"absolute",right:8,bottom:-8,width:compact?68:88,height:compact?68:88,objectFit:"contain",background:"#fff",borderRadius:18,padding:6}}/><div style={{fontFamily:F.body,fontSize:8,fontWeight:900,opacity:.85,textTransform:"uppercase"}}>Spraoi Academy</div><div style={{fontFamily:F.display,fontSize:compact?18:24,fontWeight:900,marginTop:3,maxWidth:"70%"}}>{getAcademyWeekRange(weeklyPlan)}</div><div style={{display:"flex",gap:6,marginTop:11}}><span style={previewPill}>⭐ {recommendations.length*20+extras.reduce((s,x)=>s+Number(x.xp||x.xp_reward||0),0)} XP</span><span style={previewPill}>🏅 Badges</span></div></div><div style={{padding:compact?10:15,background:"#f3f9fd",maxHeight:compact?460:"none",overflowY:"auto"}}>{visibleCount===0?<div style={{padding:18,textAlign:"center",fontFamily:F.body,fontSize:10,color:P.muted}}>Add weekly content to see the child experience here.</div>:<>{section("Football",football,"#2563eb","⚽",skillRow)}{section(selectedTeam?.gender === "girls" ? "Camogie" : "Hurling",hurling,"#dc2626","🏑",skillRow)}{section("Fitness",[...grouped.steps,...grouped.exercises,...grouped.runs],"#7c3aed","💪",taskRow)}{section("Rest & Recovery",grouped.recovery,"#0f766e","🌙",taskRow)}{section("Bonus",grouped.bonus,"#d97706","✨",taskRow)}</>}<div style={{marginTop:10,padding:9,borderRadius:11,background:published?"#dcfce7":"#fff7ed",color:published?"#15803d":"#b45309",fontFamily:F.body,fontSize:8,fontWeight:900,textAlign:"center"}}>{published?"✓ Published to children":"Preview mode · not published"}</div></div></div>;
}

function AcademyDashboardScreen({ selectedTeam, weeklyPlan, planSessions, extras = [], skills = [], overrides = {}, published = false, onSetOverride, onNav }) {
  const academyBlue = "#0277bd";
  const academyDark = "#075985";
  const academySoft = "#eef8ff";
  const teamName = selectedTeam
    ? `${selectedTeam.label} ${selectedTeam.gender === "girls" ? "Girls" : "Boys"}`
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

  const weekLabel = getAcademyWeekRange(weeklyPlan);

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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, padding: 16 }}>
                  {weeklyRecommendations.map((rec) => {
                    const color = rec.code === "football" ? "#2563eb" : "#dc2626";
                    const bg = rec.code === "football" ? "#eff6ff" : "#fff1f2";
                    const options = rec.alternatives?.length ? rec.alternatives : (rec.matchedSkill ? [rec.matchedSkill] : []);
                    const defaultIndex = Math.max(0, options.findIndex((skill) => skill.id === rec.matchedSkill?.id));
                    const previewIndex = Math.min(previewIndexes[rec.code] ?? defaultIndex, Math.max(options.length - 1, 0));
                    const previewSkill = options[previewIndex] || rec.matchedSkill;
                    const isPreviewSelected = Boolean(overrides?.[rec.code] && overrides[rec.code] === previewSkill?.id);
                    const hasDifferentSelection = Boolean(overrides?.[rec.code] && !isPreviewSelected);
                    const embedUrl = previewSkill?.video_url
                      ? previewSkill.video_url.replace("youtu.be/", "www.youtube.com/embed/").replace("watch?v=", "embed/").split("&")[0]
                      : "";
                    return <div key={rec.code} style={{ border: `1px solid ${isPreviewSelected ? "#86efac" : P.line}`, borderRadius: 16, background: "#fff", padding: 14, minWidth: 0, boxShadow: "0 5px 16px rgba(15,23,42,.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                          <div style={{ width: 36, height: 36, flex: "0 0 auto", borderRadius: 10, background: bg, display: "grid", placeItems: "center", fontSize: 18 }}>{rec.code === "football" ? "⚽" : "🏑"}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: F.body, fontSize: 9, lineHeight: 1, fontWeight: 900, color, textTransform: "uppercase", letterSpacing: ".06em" }}>{rec.label}</div>
                            <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 4 }}>Based on {rec.sourceDrills.length} Coach drill{rec.sourceDrills.length === 1 ? "" : "s"}</div>
                          </div>
                        </div>
                        <span style={{ padding: "5px 8px", borderRadius: 999, background: isPreviewSelected ? "#dcfce7" : "#fff7ed", color: isPreviewSelected ? "#15803d" : "#c2410c", fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>{isPreviewSelected ? "Selected" : "Suggested"}</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) 34px", alignItems: "center", gap: 8 }}>
                        <button aria-label="Previous video suggestion" disabled={previewIndex === 0} onClick={() => setPreviewIndexes((current) => ({ ...current, [rec.code]: Math.max(0, previewIndex - 1) }))} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${P.line}`, background: "#fff", color: previewIndex === 0 ? "#cbd5e1" : academyBlue, fontSize: 22, lineHeight: 1, cursor: previewIndex === 0 ? "default" : "pointer" }}>‹</button>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: "#071827", display: "grid", placeItems: "center" }}>
                            {embedUrl ? <iframe title={previewSkill?.name || `${rec.label} suggestion`} src={embedUrl} style={{ width: "100%", height: "100%", border: 0, display: "block" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div style={{ color: "#cbd5e1", fontFamily: F.body, fontSize: 10, textAlign: "center", padding: 16 }}>No playable video is linked to this skill.</div>}
                          </div>
                        </div>
                        <button aria-label="Next video suggestion" disabled={previewIndex >= options.length - 1} onClick={() => setPreviewIndexes((current) => ({ ...current, [rec.code]: Math.min(options.length - 1, previewIndex + 1) }))} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${P.line}`, background: "#fff", color: previewIndex >= options.length - 1 ? "#cbd5e1" : academyBlue, fontSize: 22, lineHeight: 1, cursor: previewIndex >= options.length - 1 ? "default" : "pointer" }}>›</button>
                      </div>

                      <div style={{ textAlign: "center", marginTop: 10 }}>
                        <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: P.ink }}>{previewSkill?.name || "No video match"}</div>
                        <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 3 }}>Suggestion {options.length ? previewIndex + 1 : 0} of {options.length}</div>
                        {hasDifferentSelection && <div style={{ fontFamily: F.body, fontSize: 9, color: "#b45309", marginTop: 4 }}>A different video is currently selected for this week.</div>}
                      </div>

                      <button disabled={!previewSkill?.id || isPreviewSelected} onClick={() => previewSkill?.id && onSetOverride?.(rec.code, previewSkill.id)} style={{ width: "100%", minHeight: 38, borderRadius: 10, border: 0, background: isPreviewSelected ? "#dcfce7" : academyBlue, color: isPreviewSelected ? "#15803d" : "#fff", marginTop: 11, padding: "8px 12px", fontFamily: F.body, fontSize: 10, fontWeight: 900, cursor: !previewSkill?.id || isPreviewSelected ? "default" : "pointer" }}>{isPreviewSelected ? "✓ Selected for this week" : "Use this video"}</button>
                    </div>;
                  })}
                </div>
              ) : (
                <div style={{ padding: "28px 18px", textAlign: "center" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: academySoft, color: academyBlue, display: "grid", placeItems: "center", fontSize: 20, margin: "0 auto 11px" }}>＋</div>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 800, color: P.ink }}>No weekly video suggestions yet</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>Save this week’s Coach sessions to generate Football and Hurling/Camogie matches.</div>
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
              <div style={{display:"grid",placeItems:"center"}}><AcademyPhonePreview weeklyPlan={weeklyPlan} planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} compact selectedTeam={selectedTeam} /></div>
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
  { type: "run", icon: "🏃", title: "Run activity", instruction: "Complete a steady run with an adult.", xp: 25, target: "2 km" },
  { type: "exercise", icon: "⭐", title: "Star jumps", instruction: "Complete 3 sets with a short rest.", xp: 10, target: "3 × 20" },
  { type: "exercise", icon: "🦵", title: "Lunges", instruction: "Keep your chest tall and alternate legs.", xp: 10, target: "20 each side" },
  { type: "exercise", icon: "⬇", title: "Squats", instruction: "Sit back, keep your knees tracking forward.", xp: 10, target: "3 × 15" },
  { type: "skill", icon: "🎯", title: "Skill repetitions", instruction: "Practise this week’s key skill at home.", xp: 20, target: "50 repetitions" },
  { type: "club", icon: "🏑", title: "Friday Night Hurling", instruction: "Attend the club session and check in.", xp: 30, target: "Attend", verification_type: "coach" },
  { type: "club", icon: "📅", title: "Club activity", instruction: "Take part in this week’s bonus club activity.", xp: 20, target: "Attend" },
];

function getAcademyWeekRange(weeklyPlan) {
  const raw = weeklyPlan?.starts_at || weeklyPlan?.week_start || weeklyPlan?.week_start_date || weeklyPlan?.created_at;
  const mondayKey = mondayKeyForDate(raw || new Date().toISOString().slice(0,10));
  const start = new Date(`${mondayKey}T12:00:00`);
  return `Week commencing ${start.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: start.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}`;
}

function AcademyPageHeader({ title, sub, actions }) {
  return (
    <div className="spraoi-page-header" style={{ background: "linear-gradient(135deg,#f8fcff 0%,#e9f6ff 100%)", borderBottom: "1px solid #cfeeff", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
      <div className="spraoi-page-header-main" style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
        <div className="spraoi-page-header-icon" style={{ width: 64, height: 64, borderRadius: 20, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", boxShadow: "0 10px 26px rgba(2,119,189,.12)", flexShrink: 0 }}><img src="/spraoi-academy-icon.png" alt="Academy" style={{ width: 48, height: 48, objectFit: "contain" }} /></div>
        <div style={{ minWidth: 0 }}><div className="spraoi-page-header-title" style={{ fontFamily: F.display, fontSize: 23, fontWeight: 900, color: ACADEMY_DARK }}>{title}</div><div className="spraoi-page-header-sub" style={{ fontFamily: F.body, fontSize: 12, color: "#4c7187", marginTop: 2 }}>{sub}</div></div>
      </div>
      <div className="spraoi-page-header-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}

function AcademyCard({ children, style }) { return <div style={{ background: P.white, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18, boxShadow: Sh.card, ...style }}>{children}</div>; }
function AcademyMetricCard({ label, value, detail, accent = ACADEMY_BLUE, icon }) {
  return <AcademyCard style={{ position: "relative", overflow: "hidden", minWidth: 0 }}>
    <div style={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: accent }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted }}>{label}</div>
        <div style={{ fontFamily: F.display, fontSize: 27, lineHeight: 1.15, fontWeight: 900, color: P.ink, marginTop: 8 }}>{value}</div>
      </div>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}12`, color: accent, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 900, flexShrink: 0 }}>{icon}</div>
    </div>
    <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 9 }}>{detail}</div>
  </AcademyCard>;
}
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
  const [draft, setDraft] = useState({ title: "", instruction: "", target: "", xp: 15, type: "exercise", required: false, verification_type: "self" });
  const [editingId, setEditingId] = useState(null);
  const [publishReview, setPublishReview] = useState(false);
  const applyTemplate = (t) => { setEditingId(null); setDraft({ title: t.title, instruction: t.instruction, target: t.target, xp: t.xp, type: t.type, required: false, verification_type: t.verification_type || "self" }); };
  const resetDraft = () => { setEditingId(null); setDraft({ title: "", instruction: "", target: "", xp: 15, type: "exercise", required: false, verification_type: "self" }); };
  const saveDraft = () => {
    if (!draft.title.trim()) return;
    if (editingId) onUpdateExtra?.(editingId, draft);
    else onAddExtra({ ...draft, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
    resetDraft();
  };
  const beginEdit = (item) => { setEditingId(item.id); setDraft({ title:item.title||"", instruction:item.instruction||item.description||"", target:item.target||"", xp:Number(item.xp||item.xp_reward||15), type:item.type||item.activity_type||"exercise", required:Boolean(item.required), verification_type:item.verification_type||"self" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectedFootball = Boolean(overrides?.football);
  const selectedHurling = Boolean(overrides?.hurling);
  const validation = [
    { label: "Team selected", ok: Boolean(selectedTeam?.id) },
    { label: "Football video selected", ok: selectedFootball },
    { label: `${selectedTeam?.gender === "girls" ? "Camogie" : "Hurling"} video selected`, ok: selectedHurling },
    { label: "Selected videos have approved links", ok: recommendations.filter(r => overrides?.[r.code]).every(r => skills.find(x => x.id === overrides?.[r.code])?.video_url) },
  ];
  const canPublish = validation.every(x => x.ok);
  const requestPublish = () => { if (published) onPublish?.(); else setPublishReview(true); };
  const groups = [
    { key:"steps", label:"Step Goals", icon:"👟", color:"#0f9f6e", test:x=>(x.type||x.activity_type)==="steps" },
    { key:"exercise", label:"Exercises", icon:"💪", color:"#7c3aed", test:x=>(x.type||x.activity_type)==="exercise" },
    { key:"run", label:"Run Activity", icon:"🏃", color:"#e65100", test:x=>(x.type||x.activity_type)==="run" },
    { key:"skill", label:"Extra Skill Practice", icon:"🎯", color:"#2563eb", test:x=>(x.type||x.activity_type)==="skill" },
    { key:"club", label:"Bonus & Club Activities", icon:"✨", color:"#d97706", test:x=>(x.type||x.activity_type)==="club" },
    { key:"recovery", label:"Rest & Recovery", icon:"🌙", color:"#0f766e", test:x=>(x.type||x.activity_type)==="recovery" },
  ];
  return <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
    <AcademyPageHeader title="Weekly Content" sub={`${selectedTeam?.label || "Selected team"} · ${getAcademyWeekRange(weeklyPlan)} · Build, review and publish the child experience`} actions={<Btn label={published ? "Unpublish week" : "Review & publish"} variant="primary" icon={published ? "↓" : "↑"} onClick={requestPublish} style={{ background: published ? P.green : ACADEMY_BLUE }} />} />
    <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><AcademyBadge>Weekly readiness</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:8}}>{published?"This week is live":"Complete the checks before publishing"}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{validation.map(v=><AcademyBadge key={v.label} color={v.ok?"#15803d":"#b45309"} bg={v.ok?"#dcfce7":"#fff7ed"}>{v.ok?"✓":"!"} {v.label}</AcademyBadge>)}</div></div>
      </AcademyCard>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div><AcademyBadge>Suggested weekly videos</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:8}}>One video per code</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Browse suggestions, then explicitly select the Football and {selectedTeam?.gender === "girls" ? "Camogie" : "Hurling"} videos for this week.</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginTop:16}}>{recommendations.map(rec=>{const options=rec.alternatives?.length?rec.alternatives:(rec.matchedSkill?[rec.matchedSkill]:[]);const idx=Math.min(previewIndexes[rec.code]??Math.max(0,options.findIndex(x=>x.id===rec.matchedSkill?.id)),Math.max(0,options.length-1));const skill=options[idx]||rec.matchedSkill;const selected=overrides?.[rec.code]===skill?.id;return <div key={rec.code} style={{border:`1px solid ${selected?"#86efac":"#bae6fd"}`,borderRadius:16,padding:15,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><AcademyBadge color={rec.code==="football"?"#1d4ed8":"#b91c1c"} bg={rec.code==="football"?"#dbeafe":"#fee2e2"}>{rec.label}</AcademyBadge><AcademyBadge color={selected?"#15803d":"#0369a1"} bg={selected?"#dcfce7":"#e0f2fe"}>{selected?"Selected":"Suggestion"}</AcademyBadge></div><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink,marginTop:10}}>{skill?.name||"No match available"}</div>{skill?.video_url&&<div style={{borderRadius:11,overflow:"hidden",background:"#071827",marginTop:10}}><iframe title={skill.name} src={skill.video_url.replace("watch?v=","embed/").split("&")[0]} style={{width:"100%",height:180,border:0,display:"block"}} allowFullScreen /></div>}<div className="academy-match-actions" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7,marginTop:10}}><button disabled={idx===0} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.max(0,idx-1)}))} style={smallAction(idx===0)}>Previous</button><button disabled={idx>=options.length-1} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.min(options.length-1,idx+1)}))} style={smallAction(idx>=options.length-1)}>Next suggestion</button><button disabled={!skill?.id||selected} onClick={()=>skill?.id&&onSetOverride?.(rec.code,skill.id)} style={{...smallAction(false),background:selected?"#dcfce7":ACADEMY_BLUE,color:selected?"#15803d":"#fff",border:0}}>{selected?"Selected":"Use this video"}</button></div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:7}}>Suggestion {options.length?idx+1:0} of {options.length} · {rec.sourceDrills.length ? `based on ${rec.sourceDrills.length} Coach activities` : "manual Academy selection"}</div></div>})}</div>
      </AcademyCard>
      <div className="academy-content-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, alignItems:"start" }}>
        <AcademyCard>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>{editingId?"Edit activity":"Add an activity"}</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Add multiple items to a section; they will appear together on one child card.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8,marginTop:13}}>{ACADEMY_TEMPLATES.map(t=><button key={t.title} onClick={()=>applyTemplate(t)} style={{border:`1px solid ${P.line}`,borderRadius:12,background:P.white,padding:10,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:20}}>{t.icon}</div><div style={{fontFamily:F.body,fontSize:10,fontWeight:900,color:P.ink,marginTop:4}}>{t.title}</div><div style={{fontFamily:F.body,fontSize:9,color:ACADEMY_BLUE}}>{t.xp} XP</div></button>)}</div>
          <div className="academy-form-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:15}}><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Activity name</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={inputStyle}/></label><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Child instructions</span><textarea value={draft.instruction} onChange={e=>setDraft({...draft,instruction:e.target.value})} style={{...inputStyle,minHeight:72,paddingTop:9}}/></label><label><span style={labelStyle}>Target</span><input value={draft.target} onChange={e=>setDraft({...draft,target:e.target.value})} style={inputStyle}/></label><label><span style={labelStyle}>XP</span><input type="number" min="0" value={draft.xp} onChange={e=>setDraft({...draft,xp:Number(e.target.value)})} style={inputStyle}/></label><label><span style={labelStyle}>Section</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})} style={inputStyle}><option value="steps">Step Goals</option><option value="exercise">Exercises</option><option value="run">Run Activity</option><option value="skill">Extra Skill Practice</option><option value="club">Bonus & Club Activity</option><option value="recovery">Rest & Recovery</option></select></label><label style={{display:"flex",alignItems:"center",gap:8,marginTop:22,fontFamily:F.body,fontSize:11}}><input type="checkbox" checked={draft.required} onChange={e=>setDraft({...draft,required:e.target.checked})}/> Required</label><label><span style={labelStyle}>Verification</span><select value={draft.verification_type||"self"} onChange={e=>setDraft({...draft,verification_type:e.target.value})} style={inputStyle}><option value="self">Player verified</option><option value="coach">Coach verified</option></select></label></div>
          <div style={{display:"flex",gap:8,marginTop:13}}><button onClick={saveDraft} style={{height:38,border:0,borderRadius:10,background:ACADEMY_BLUE,color:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"}}>{editingId?"Save changes":"＋ Add to week"}</button>{editingId&&<button onClick={resetDraft} style={{height:38,border:`1px solid ${P.line}`,borderRadius:10,background:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:900,cursor:"pointer"}}>Cancel</button>}</div>
        </AcademyCard>
        <div style={{display:"grid",gap:12}}>{groups.map(group=>{const items=extras.filter(group.test);if(!items.length)return null;return <AcademyCard key={group.key} style={{borderTop:`4px solid ${group.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:900,color:P.ink}}>{group.icon} {group.label}</div><AcademyBadge>{items.length}</AcademyBadge></div><div style={{display:"grid",gap:8,marginTop:10}}>{items.map((x,i)=><div key={x.id} style={{border:`1px solid ${P.line}`,borderRadius:11,padding:11,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontFamily:F.body,fontSize:11,fontWeight:900,color:P.ink}}>{x.title}</div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:2}}>{x.target||x.instruction||x.description}</div></div><div style={{display:"flex",gap:3}}><button title="Move up" disabled={i===0} onClick={()=>onMoveExtra?.(x.id,-1,group.test)} style={iconAction(i===0)}>↑</button><button title="Move down" disabled={i===items.length-1} onClick={()=>onMoveExtra?.(x.id,1,group.test)} style={iconAction(i===items.length-1)}>↓</button><button title="Edit" onClick={()=>beginEdit(x)} style={iconAction(false)}>✎</button><button title="Remove" onClick={()=>onRemoveExtra(x.id)} style={{...iconAction(false),color:"#dc2626"}}>×</button></div></div><div style={{display:"flex",gap:6,marginTop:7}}><AcademyBadge color="#b45309" bg="#fff7ed">{x.xp||x.xp_reward||0} XP</AcademyBadge>{x.required&&<AcademyBadge color="#b91c1c" bg="#fef2f2">Required</AcademyBadge>}<AcademyBadge color={(x.verification_type||"self")==="coach"?"#0369a1":P.muted} bg={(x.verification_type||"self")==="coach"?"#e0f2fe":P.soft}>{(x.verification_type||"self")==="coach"?"Coach verified":"Player verified"}</AcademyBadge></div></div>)}</div></AcademyCard>})}</div>
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

function AcademyPlayers({ selectedTeam, club }) {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    if (!selectedTeam?.id) { setPlayers([]); return; }
    const { data, error } = await supabase
      .from("journey_players")
      .select("*")
      .eq("age_group_id", selectedTeam.id)
      .order("name");
    if (error) { setMessage(error.message); return; }
    setPlayers(data || []);
  }

  useEffect(() => { loadPlayers(); }, [selectedTeam?.id]);

  async function addPlayer() {
    if (!name.trim() || !selectedTeam?.id || !club?.id) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("journey_players").insert({
      parent_user_id: "00000000-0000-0000-0000-000000000000",
      club_id: club.id,
      age_group_id: selectedTeam.id,
      name: name.trim(),
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setName("");
    setMessage("Player added");
    await loadPlayers();
  }

  async function removePlayer(id) {
    if (!window.confirm("Remove this player from Academy?")) return;
    const { error } = await supabase.from("journey_players").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setMessage("Player removed");
    await loadPlayers();
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <AcademyPageHeader title="Players" sub={`${selectedTeam?.label || "Select a team"} · Add players and manage parent access`} />
      <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto", display: "grid", gap: 16 }}>
        <AcademyCard>
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: P.ink }}>Add a player</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>Academy uses the existing Spraoi Club team. Add the child here, then send the Parent Access link.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Player name" style={{ ...inputStyle, flex: "1 1 260px" }} />
            <button onClick={addPlayer} disabled={saving || !name.trim() || !selectedTeam?.id || !club?.id} style={{ height: 38, border: 0, borderRadius: 10, background: ACADEMY_BLUE, color: "#fff", padding: "0 16px", fontFamily: F.body, fontSize: 11, fontWeight: 900, cursor: "pointer", opacity: saving || !name.trim() || !selectedTeam?.id || !club?.id ? .55 : 1 }}>{saving ? "Adding…" : "＋ Add player"}</button>
          </div>
          {message && <div style={{ fontFamily: F.body, fontSize: 10, color: ACADEMY_BLUE, marginTop: 8 }}>{message}</div>}
        </AcademyCard>
        <AcademyCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 900, color: P.ink }}>Team players</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 2 }}>{players.length} Academy player{players.length === 1 ? "" : "s"}</div>
            </div>
          </div>
          {players.length === 0 ? (
            <div style={{ padding: 22, textAlign: "center", fontFamily: F.body, fontSize: 11, color: P.muted }}>No Academy players on this team yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
              {players.map((player) => {
                const linked = player.parent_user_id && player.parent_user_id !== "00000000-0000-0000-0000-000000000000";
                return <div key={player.id} style={{ border: `1px solid ${P.line}`, borderRadius: 13, padding: 13, display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: ACADEMY_SOFT, color: ACADEMY_BLUE, display: "grid", placeItems: "center", fontWeight: 900 }}>{player.name?.[0] || "P"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 900, color: P.ink }}>{player.name}</div>
                    <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 2 }}>{linked ? "Parent linked" : "Awaiting parent"}</div>
                  </div>
                  <button onClick={() => removePlayer(player.id)} title="Remove player" style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>;
              })}
            </div>
          )}
        </AcademyCard>
      </div>
    </div>
  );
}

function AcademyParents({ selectedTeam, parentRows, setParentRows }) {
  const [copied, setCopied] = useState(false);
  const academyChildBase = import.meta.env.VITE_ACADEMY_CHILD_URL || ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5175" : "https://academy.spraoisports.com");
  const teamLink = `${academyChildBase}/?team=${encodeURIComponent(selectedTeam?.id || "")}`;

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function parseFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "").split(/\r?\n/).filter(Boolean);
      const headers = lines.shift()?.split(",").map((h) => h.trim().toLowerCase()) || [];
      const find = (names) => headers.findIndex((h) => names.includes(h));
      const pi = find(["parent name", "parent", "guardian name"]);
      const ei = find(["parent email", "email", "guardian email"]);
      const ci = find(["child name", "child", "player name"]);
      setParentRows(lines.map((line, i) => {
        const cells = line.split(",").map((x) => x.trim());
        return { id: `upload-${Date.now()}-${i}`, parent: cells[pi] || "", email: cells[ei] || "", child: cells[ci] || "", status: cells[ei] && cells[ci] ? "Ready" : "Needs review", link: `${teamLink}&invite=${i + 1}` };
      }));
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <AcademyPageHeader title="Parent Access" sub={`${selectedTeam?.label || "Team"} · Send parents into the Academy child onboarding flow`} actions={<Btn label="Copy team link" variant="primary" icon="⧉" onClick={() => copy(teamLink)} style={{ background: ACADEMY_BLUE }} />} />
      <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto", display: "grid", gap: 16 }}>
        {copied && <div style={{ position: "fixed", right: 22, top: 76, zIndex: 6000, background: "#0f172a", color: "#fff", padding: "10px 14px", borderRadius: 10, fontFamily: F.body, fontSize: 11, fontWeight: 800, boxShadow: "0 12px 30px rgba(15,23,42,.25)" }}>Link copied</div>}
        <AcademyCard>
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: P.ink }}>Team parent link</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>Open this link to test the exact selected team in the child app.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ flex: "1 1 420px", padding: "10px 12px", borderRadius: 9, background: P.soft, fontSize: 10, overflowWrap: "anywhere" }}>{teamLink}</code>
            <button onClick={() => copy(teamLink)} style={{ height: 36, border: 0, borderRadius: 9, background: ACADEMY_BLUE, color: "#fff", padding: "0 13px", fontFamily: F.body, fontSize: 10, fontWeight: 900, cursor: "pointer" }}>Copy link</button>
          </div>
        </AcademyCard>
        <AcademyCard>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: P.ink }}>Optional parent CSV</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 4 }}>CSV columns: Parent Name, Parent Email, Child Name.</div>
            </div>
            <label style={{ height: 38, padding: "0 14px", borderRadius: 10, background: ACADEMY_BLUE, color: "#fff", display: "flex", alignItems: "center", fontFamily: F.body, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
              Upload CSV<input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
            </label>
          </div>
        </AcademyCard>
        {parentRows?.length > 0 && <AcademyCard><div style={{ display: "grid", gap: 8 }}>{parentRows.map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, padding: 10, border: `1px solid ${P.line}`, borderRadius: 10, fontFamily: F.body, fontSize: 10 }}><span>{row.parent}</span><span>{row.email}</span><span>{row.child}</span><span style={{ fontWeight: 800, color: row.status === "Ready" ? "#15803d" : "#b45309" }}>{row.status}</span></div>)}</div></AcademyCard>}
      </div>
    </div>
  );
}

function AcademyPreview({ weeklyPlan, planSessions, extras, skills = [], overrides = {}, published, selectedTeam }) { return <div style={{flex:1,overflow:"auto",background:"linear-gradient(180deg,#e8f7ff,#f8fbff)"}}><AcademyPageHeader title="Child Preview" sub={`${getAcademyWeekRange(weeklyPlan)} · Exactly what a child will see after publishing`} /><div style={{padding:24,display:"grid",placeItems:"center"}}><AcademyPhonePreview weeklyPlan={weeklyPlan} planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} selectedTeam={selectedTeam} /></div></div>;
}


function AcademyLeaderboard({ selectedTeam }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    async function load() {
      if (!selectedTeam?.id) { if (live) { setPlayers([]); setLoading(false); } return; }
      setLoading(true);
      const { data, error } = await supabase.from("journey_players").select("id,name,xp_total,last_active").eq("age_group_id", selectedTeam.id).order("xp_total", { ascending: false });
      if (live) { setPlayers(error ? [] : (data || [])); setLoading(false); }
    }
    load();
    return () => { live = false; };
  }, [selectedTeam?.id]);
  return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Leaderboard" sub={`${selectedTeam?.label || "Team"} · Academy XP`} /><div style={{padding:24,maxWidth:900,margin:"0 auto"}}><AcademyCard>{loading?<div style={{fontFamily:F.body,fontSize:12,color:P.muted}}>Loading leaderboard…</div>:players.length===0?<div style={{fontFamily:F.body,fontSize:12,color:P.muted}}>No Academy player activity yet for this team.</div>:players.map((p,i)=><div key={p.id} style={{display:"grid",gridTemplateColumns:"44px 1fr auto",gap:12,alignItems:"center",padding:"12px 4px",borderTop:i?`1px solid ${P.line}`:"none"}}><div style={{width:34,height:34,borderRadius:12,display:"grid",placeItems:"center",background:i<3?"#e0f2fe":P.soft,fontFamily:F.display,fontWeight:900,color:ACADEMY_BLUE}}>{i+1}</div><div><div style={{fontFamily:F.body,fontSize:12,fontWeight:900,color:P.ink}}>{p.name}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:2}}>{p.last_active?`Last active ${new Date(p.last_active).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}`:"No activity yet"}</div></div><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:ACADEMY_BLUE}}>{Number(p.xp_total||0)} XP</div></div>)}</AcademyCard></div></div>;
}

function AcademyEngagement({ selectedTeam }) {
  const [stats,setStats]=useState({players:0,active:0,completions:0,xp:0});
  const [loading,setLoading]=useState(true);
  const [errorText,setErrorText]=useState("");
  useEffect(()=>{ let live=true; (async()=>{
    try {
      setLoading(true); setErrorText("");
      if(!selectedTeam?.id){ if(live){setStats({players:0,active:0,completions:0,xp:0});setLoading(false);} return; }
      const {data:players,error:pe}=await supabase.from("journey_players").select("id,last_active,xp_total").eq("age_group_id",selectedTeam.id);
      if(pe) throw pe; const safe=players||[]; const ids=safe.map(p=>p.id);
      let progress=[]; if(ids.length){ const {data,error}=await supabase.from("player_progress").select("id,player_id,xp_earned").in("player_id",ids); if(error) console.warn("Engagement progress unavailable",error.message); else progress=data||[]; }
      const monday=mondayKeyForDate(new Date().toISOString().slice(0,10)); const cutoff=new Date(`${monday}T00:00:00`);
      const active=safe.filter(p=>p.last_active && new Date(p.last_active)>=cutoff).length;
      const xp=progress.reduce((sum,row)=>sum+Number(row.xp_earned||0),0);
      if(live) setStats({players:safe.length,active,completions:progress.length,xp});
    } catch(err){ console.error("Academy engagement failed",err); if(live)setErrorText(err?.message||"Could not load engagement data"); }
    finally { if(live)setLoading(false); }
  })(); return()=>{live=false}; },[selectedTeam?.id]);
  const value=v=>loading?"…":String(v);
  return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Engagement" sub={`${selectedTeam?.label||"Team"} · ${getAcademyWeekRange(null)}`} /><div style={{padding:24,maxWidth:1180,margin:"0 auto"}}>{errorText&&<AcademyCard style={{marginBottom:12,borderColor:"#fecaca",color:"#991b1b"}}>Engagement data could not be fully loaded: {errorText}</AcademyCard>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}><AcademyMetricCard label="Academy players" value={value(stats.players)} detail="in this team" accent={ACADEMY_BLUE} icon="●"/><AcademyMetricCard label="Active this week" value={value(stats.active)} detail="since Monday" accent="#0ea5e9" icon="✓"/><AcademyMetricCard label="Completions" value={value(stats.completions)} detail="recorded child activities" accent="#7c3aed" icon="◒"/><AcademyMetricCard label="XP earned" value={value(stats.xp)} detail="recorded this week" accent="#16a34a" icon="★"/></div></div></div>;
}

function AcademyApprovals({ selectedTeam, weeklyPlan }) {
  const [activities, setActivities] = useState([]);
  const [players, setPlayers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [errorText, setErrorText] = useState("");

  async function load() {
    if (!selectedTeam?.id || !weeklyPlan?.id) { setActivities([]); setPlayers([]); setClaims([]); setLoading(false); return; }
    setLoading(true); setErrorText("");
    try {
      const [{ data: acts, error: ae }, { data: pls, error: pe }] = await Promise.all([
        supabase.from("journey_exercises").select("*").eq("age_group_id", selectedTeam.id).eq("plan_id", weeklyPlan.id).eq("verification_type", "coach").order("sort_order", { ascending: true }),
        supabase.from("journey_players").select("id,name,xp_total").eq("age_group_id", selectedTeam.id).order("name"),
      ]);
      if (ae) throw ae; if (pe) throw pe;
      const safeActs = acts || [];
      let rows = [];
      if (safeActs.length) {
        const { data, error } = await supabase.from("player_progress").select("*").in("exercise_id", safeActs.map(a => a.id));
        if (error) throw error;
        rows = data || [];
      }
      setActivities(safeActs); setPlayers(pls || []); setClaims(rows);
    } catch (err) {
      console.error("Academy approvals failed", err);
      setErrorText(err?.message || "Could not load approvals");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [selectedTeam?.id, weeklyPlan?.id]);

  async function approve(activity, player) {
    const key = `${activity.id}:${player.id}`;
    setBusyKey(key); setErrorText("");
    try {
      const existing = claims.find(c => c.exercise_id === activity.id && c.player_id === player.id);
      if (existing?.status === "approved") return;
      const { data: auth } = await supabase.auth.getUser();
      const verifier = auth?.user?.id || null;
      const xp = Number(activity.xp_reward || 15);
      let approvedRow;
      if (existing) {
        const { data, error } = await supabase.from("player_progress").update({ status:"approved", verified_by:verifier, verified_at:new Date().toISOString(), xp_earned:xp }).eq("id", existing.id).select().single();
        if (error) throw error; approvedRow = data;
      } else {
        const { data, error } = await supabase.from("player_progress").insert({ player_id:player.id, club_id:activity.club_id || null, age_group_id:selectedTeam.id, exercise_id:activity.id, plan_id:activity.plan_id || null, status:"approved", claimed_at:null, verified_by:verifier, verified_at:new Date().toISOString(), xp_earned:xp }).select().single();
        if (error) throw error; approvedRow = data;
      }
      const currentXp = Number(player.xp_total || 0);
      const { error: xpError } = await supabase.from("journey_players").update({ xp_total: currentXp + xp, last_active: new Date().toISOString().slice(0,10) }).eq("id", player.id);
      if (xpError) throw xpError;
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, xp_total: currentXp + xp } : p));
      setClaims(prev => existing ? prev.map(c => c.id === existing.id ? approvedRow : c) : [...prev, approvedRow]);
    } catch (err) {
      console.error("Approval failed", err); setErrorText(err?.message || "Approval failed");
    } finally { setBusyKey(""); }
  }

  async function unapprove(activity, player) {
    const key = `${activity.id}:${player.id}`;
    setBusyKey(key); setErrorText("");
    try {
      const existing = claims.find(c => c.exercise_id === activity.id && c.player_id === player.id);
      if (!existing || existing.status !== "approved") return;
      const awardedXp = Number(existing.xp_earned || activity.xp_reward || 0);
      const currentXp = Number(player.xp_total || 0);
      const nextXp = Math.max(0, currentXp - awardedXp);

      // A player-created claim goes back to pending. An admin-created attendance
      // (claimed_at is null) is removed completely and returns to Not claimed.
      if (existing.claimed_at) {
        const { data, error } = await supabase.from("player_progress").update({
          status: "pending",
          verified_by: null,
          verified_at: null,
          xp_earned: 0,
        }).eq("id", existing.id).select().single();
        if (error) throw error;
        setClaims(prev => prev.map(c => c.id === existing.id ? data : c));
      } else {
        const { error } = await supabase.from("player_progress").delete().eq("id", existing.id);
        if (error) throw error;
        setClaims(prev => prev.filter(c => c.id !== existing.id));
      }

      const { error: xpError } = await supabase.from("journey_players").update({ xp_total: nextXp }).eq("id", player.id);
      if (xpError) throw xpError;
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, xp_total: nextXp } : p));
    } catch (err) {
      console.error("Unapprove failed", err); setErrorText(err?.message || "Could not unapprove attendance");
    } finally { setBusyKey(""); }
  }

  async function approveAllPending(activity) {
    const pending = players.filter(p => claims.some(c => c.exercise_id === activity.id && c.player_id === p.id && c.status === "pending"));
    for (const player of pending) await approve(activity, player);
  }

  const pendingTotal = claims.filter(c => c.status === "pending").length;
  return <div style={{flex:1,overflow:"auto",background:P.soft}}>
    <AcademyPageHeader title="Approvals" sub={`${selectedTeam?.label || "Team"} · ${pendingTotal} awaiting coach verification`} />
    <div style={{padding:24,maxWidth:1050,margin:"0 auto"}}>
      {errorText && <AcademyCard style={{marginBottom:12,borderColor:"#fecaca",color:"#991b1b"}}>{errorText}</AcademyCard>}
      {loading ? <AcademyCard><div style={{fontFamily:F.body,fontSize:12,color:P.muted}}>Loading approvals…</div></AcademyCard> : activities.length===0 ? <AcademyCard><div style={{fontFamily:F.display,fontSize:18,fontWeight:900,color:P.ink}}>No coach-verified activities yet</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>In Weekly Content, add Friday Night Hurling (or another activity) and choose Coach verified.</div></AcademyCard> : activities.map(activity => {
        const activityClaims = claims.filter(c => c.exercise_id === activity.id);
        const pending = activityClaims.filter(c => c.status === "pending").length;
        const approved = activityClaims.filter(c => c.status === "approved").length;
        return <AcademyCard key={activity.id} style={{marginBottom:14,borderTop:"4px solid #0288d1"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:12}}>
            <div><AcademyBadge color="#0369a1" bg="#e0f2fe">Coach verified</AcademyBadge><div style={{fontFamily:F.display,fontSize:20,fontWeight:900,color:P.ink,marginTop:6}}>{activity.title}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:3}}>Weekly Academy activity · +{activity.xp_reward || 15} XP</div></div>
            <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><AcademyBadge color="#b45309" bg="#fff7ed">{pending} pending</AcademyBadge><AcademyBadge color="#15803d" bg="#dcfce7">{approved} approved</AcademyBadge>{pending>0 && <button onClick={()=>approveAllPending(activity)} style={{height:34,border:0,borderRadius:9,background:ACADEMY_BLUE,color:"#fff",padding:"0 12px",fontFamily:F.body,fontSize:10,fontWeight:900,cursor:"pointer"}}>Approve all claims</button>}</div>
          </div>
          <div style={{borderTop:`1px solid ${P.line}`}}>{players.map(player => {
            const claim = activityClaims.find(c => c.player_id === player.id);
            const status = claim?.status || "unclaimed";
            const key = `${activity.id}:${player.id}`;
            return <div key={player.id} style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) auto auto",gap:10,alignItems:"center",padding:"10px 2px",borderBottom:`1px solid ${P.line}`}}>
              <div><div style={{fontFamily:F.body,fontSize:11,fontWeight:900,color:P.ink}}>{player.name}</div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:2}}>{status==="pending"?"Player says they attended":status==="approved"?"Attendance verified":"No claim yet"}</div></div>
              <AcademyBadge color={status==="approved"?"#15803d":status==="pending"?"#b45309":P.muted} bg={status==="approved"?"#dcfce7":status==="pending"?"#fff7ed":P.soft}>{status==="approved"?"✓ Approved":status==="pending"?"⏳ Pending":"Not claimed"}</AcademyBadge>
              {status!=="approved" ? <button disabled={busyKey===key} onClick={()=>approve(activity,player)} style={{height:32,border:0,borderRadius:8,background:status==="pending"?ACADEMY_BLUE:"#e0f2fe",color:status==="pending"?"#fff":"#0369a1",padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:900,cursor:"pointer"}}>{busyKey===key?"Saving…":status==="pending"?"Approve":"Mark attended"}</button> : <div style={{display:"flex",alignItems:"center",gap:7,justifyContent:"flex-end",flexWrap:"wrap"}}><div style={{fontFamily:F.body,fontSize:9,fontWeight:800,color:"#15803d"}}>+{activity.xp_reward || 15} XP</div><button disabled={busyKey===key} onClick={()=>unapprove(activity,player)} style={{height:30,border:"1px solid #fecaca",borderRadius:8,background:"#fff",color:"#b91c1c",padding:"0 9px",fontFamily:F.body,fontSize:9,fontWeight:900,cursor:busyKey===key?"default":"pointer",opacity:busyKey===key?.55:1}}>{busyKey===key?"Saving…":"Unapprove"}</button></div>}
            </div>;
          })}</div>
        </AcademyCard>;
      })}
    </div>
  </div>;
}

function AcademySettings({ published, onNav }) {
  const items = [
    { title: "Players", desc: "Add or remove Academy players for the selected Spraoi Club team.", label: "Manage", action: () => onNav?.("academy-players") },
    { title: "Parent Access", desc: "Copy the live team link and test parent/player onboarding.", label: "Open", action: () => onNav?.("academy-parents") },
    { title: "Weekly Content", desc: "Review the Coach plan, choose Football/Hurling skills and publish homework.", label: published ? "Published" : "Open", action: () => onNav?.("academy-content") },
    { title: "Coach Approvals", desc: "Verify attendance and coach-approved Academy activities.", label: "Open", action: () => onNav?.("academy-approvals") },
    { title: "Teams", desc: "Create and amend teams in Spraoi Club. Academy uses those teams rather than maintaining a separate team list.", label: "Open Spraoi Club", action: () => window.location.assign(MODULE_URLS.club) },
  ];
  return <div style={{ flex: 1, overflow: "auto", background: P.soft }}><AcademyPageHeader title="Settings" sub="Academy setup and shortcuts" /><div style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 12 }}>{items.map((item) => <AcademyCard key={item.title}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 220 }}><div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 900, color: P.ink }}>{item.title}</div><div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 3 }}>{item.desc}</div></div><button onClick={item.action} style={{ height: 34, border: 0, borderRadius: 9, background: ACADEMY_BLUE, color: "#fff", padding: "0 12px", fontFamily: F.body, fontSize: 10, fontWeight: 900, cursor: "pointer" }}>{item.label}</button></div></AcademyCard>)}</div></div>;
}

function AcademySectionScreen({ screen, onNav, club, selectedTeam, weeklyPlan, planSessions, extras, skills, overrides, onSetOverride, onAddExtra, onUpdateExtra, onRemoveExtra, onMoveExtra, published, onPublish, parentRows, setParentRows }) {
  if (screen === "academy-content") return <AcademyWeeklyContent selectedTeam={selectedTeam} weeklyPlan={weeklyPlan} planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} onSetOverride={onSetOverride} onAddExtra={onAddExtra} onUpdateExtra={onUpdateExtra} onRemoveExtra={onRemoveExtra} onMoveExtra={onMoveExtra} published={published} onPublish={onPublish}/>;
  if (screen === "academy-players") return <AcademyPlayers selectedTeam={selectedTeam} club={club}/>;
  if (screen === "academy-parents") return <AcademyParents selectedTeam={selectedTeam} parentRows={parentRows} setParentRows={setParentRows}/>;
  if (screen === "academy-preview") return <AcademyPreview weeklyPlan={weeklyPlan} planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} selectedTeam={selectedTeam}/>;
  if (screen === "academy-engagement") return <AcademyEngagement selectedTeam={selectedTeam}/>;
  if (screen === "academy-approvals") return <AcademyApprovals selectedTeam={selectedTeam} weeklyPlan={weeklyPlan}/>;
  if (screen === "academy-leaderboard") return <AcademyLeaderboard selectedTeam={selectedTeam}/>;
  return <AcademySettings published={published} onNav={onNav}/>;
}

/* ============================================================
   MODULE PLACEHOLDER — for modules not yet built
   ============================================================ */
function ModulePlaceholder({ module, screen, club }) {
  const screenLabel = module.nav.find((n) => n.id === screen)?.label || screen;
  const clubName = club?.name || "Club Spraoi";
  if (module?.label === "Connect") return (
    <div style={{ flex: 1, overflow: "auto", background: "linear-gradient(180deg,#fffbea,#f8fafc 360px)" }}>
      <TopBar title="Spraoi Connect" sub={`${clubName} · Coming Soon`} />
      <div style={{ minHeight: "calc(100vh - 60px)", display: "grid", placeItems: "center", padding: 28 }}>
        <div style={{ maxWidth: 520, textAlign: "center", background: P.white, border: `1px solid ${P.line}`, borderRadius: 22, padding: 34, boxShadow: Sh.lift }}>
          <img src="/spraoi-connect-icon.png" alt="Spraoi Connect" style={{ width: 104, height: 104, objectFit: "contain", marginBottom: 16 }} />
          <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 900, color: "#8a6500" }}>Coming Soon</div>
          <div style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: P.muted, marginTop: 8 }}>Spraoi Connect is the next module after Academy. Messaging, announcements and responses will be added here.</div>
        </div>
      </div>
    </div>
  );
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
function MobileHeader({ activeModule, setActiveModule, onNav, enabledModules, club, selectedTeam }) {
  const [open, setOpen] = useState(false);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  function openModule(key, module) {
    setActiveModule(key);
    onNav(enabledModules.includes(key) ? module.nav[0].id : `access-denied-${key}`);
    setOpen(false);
  }
  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 62, zIndex: 200, padding: "0 12px", background: mod.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 5px 18px ${mod.color}35` }}>
        <button onClick={() => setOpen(true)} style={{ border: "none", background: "rgba(255,255,255,.16)", width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <img src={mod.icon} alt={mod.label} style={{ width: 31, height: 31, objectFit: "contain" }} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900 }}>{mod.label}</div>
          <div style={{ fontFamily: F.body, fontSize: 9, opacity: .78 }}>{selectedTeam ? `${selectedTeam.label} ${selectedTeam.gender === "girls" ? "Girls" : "Boys"}` : clubName}</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", fontFamily: F.display, fontWeight: 900 }}>{clubName[0]}</div>
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,18,34,.62)", padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 58, width: "100%", maxWidth: 430, background: P.white, borderRadius: 20, padding: 16, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontWeight: 900, color: P.ink, fontSize: 18, marginBottom: 12 }}>Switch module</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {Object.entries(MODULES).map(([key, m]) => {
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
            <span style={{ width: 28, height: 24, borderRadius: 8, display: "grid", placeItems: "center", background: isActive ? `${module.color}12` : "transparent", fontSize: 14, fontWeight: 900 }}>{item.icon}</span>
            <span style={{ fontSize: 8, lineHeight: 1.1, fontWeight: isActive ? 900 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label.replace("Weekly ", "").replace("Parent ", "")}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
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

  // App state
  const [screen, setScreen] = useState("academy-dashboard");
  const [activeModule, setActiveModule] = useState("academy");

  useEffect(() => {
    const prefix = String(screen || "").split("-")[0];
    if (MODULES[prefix] && prefix !== activeModule) {
      setActiveModule(prefix);
    }
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
      setUserRole(roleData || { role: "super_admin", club_id: clubData?.id || null });

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
      setUserRole({ role: "super_admin", club_id: null });
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
    if (!ageGroups.length) return;
    const savedId = localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
    const found = ageGroups.find((ag) => String(ag.id) === String(savedId));
    if (found && String(found.id) !== String(selectedTeam?.id || "")) {
      setSelectedTeam(found);
    } else if (!found && selectedTeam && !ageGroups.some((ag) => String(ag.id) === String(selectedTeam.id))) {
      setSelectedTeam(null);
    }
  }, [ageGroups]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.type === "storage" && event.key && ![ACTIVE_TEAM_KEY, "spraoi_team_id", ACTIVE_CLUB_KEY].includes(event.key)) return;
      const teamId = event?.detail?.teamId || localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
      if (!teamId) {
        setSelectedTeam(null);
        return;
      }
      const found = ageGroups.find((ag) => String(ag.id) === String(teamId));
      if (found) setSelectedTeam(found);
    };
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(ACTIVE_CONTEXT_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(ACTIVE_CONTEXT_EVENT, syncFromStorage);
    };
  }, [ageGroups]);

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
      const weekStartDate = mondayKeyForDate(new Date().toISOString().slice(0,10));
      const end = new Date(`${weekStartDate}T12:00:00`); end.setDate(end.getDate()+7);
      const weekEndDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`;

      // Pull every plan for the selected team, then all sessions whose actual training date falls in this Monday-Sunday week.
      const { data: teamPlans, error: teamPlanError } = await supabase.from("weekly_plans").select("*").eq("age_group_id", ageGroupId).order("starts_at", { ascending: false });
      if (teamPlanError) throw teamPlanError;
      const planIds = (teamPlans || []).map(p=>p.id);
      let sessions = [];
      if (planIds.length) {
        const { data, error } = await supabase.from("sessions").select("*").in("plan_id", planIds).gte("session_date", weekStartDate).lt("session_date", weekEndDate).order("session_date", { ascending: true });
        if (error) throw error; sessions = data || [];
      }
      const sessionPlanIds = [...new Set(sessions.map(s=>s.plan_id).filter(Boolean))];
      const currentWeekPlans = (teamPlans || []).filter(p=>p.starts_at && mondayKeyForDate(p.starts_at)===weekStartDate);
      let plan = currentWeekPlans.find(p=>p.published) || currentWeekPlans[0] || (teamPlans || []).find(p=>sessionPlanIds.includes(p.id)) || null;
      setWeeklyPlan(plan ? { ...plan, starts_at: weekStartDate } : null);
      setAcademyPublished(Boolean(plan?.published));
      setAcademyVideoOverrides(plan?.academy_video_overrides || {});
      if (!plan && !sessions.length) { setPlanSessions([]); setAcademyExtras([]); return; }

      if (plan?.id) {
        const { data: savedExtras } = await supabase.from("journey_exercises").select("*").eq("plan_id", plan.id).order("sort_order", { ascending: true });
        if (savedExtras) setAcademyExtras(savedExtras.map(x => ({ ...x, xp: x.xp_reward, type: x.activity_type || "exercise", instruction: x.description || "", target: "", verification_type: x.verification_type || "self" })));
      } else setAcademyExtras([]);

      const ids = sessions.map(x=>x.id);
      if (!ids.length) { setPlanSessions([]); return; }
      const { data: links, error: linksError } = await supabase.from("session_activities").select("*").in("session_id", ids).order("sort_order", { ascending: true });
      if (linksError) throw linksError;
      const activityIds = [...new Set((links || []).map(x => x.activity_id).filter(Boolean))];
      let activities = [];
      if (activityIds.length) {
        const { data } = await supabase.from("activities").select("*, skill:skills(id, name, sport, category, video_url)").in("id", activityIds);
        activities = data || [];
      }
      const amap = Object.fromEntries(activities.map(a=>[a.id,a]));
      setPlanSessions(sessions.map(sess=>({ ...sess, session_activities:(links||[]).filter(x=>x.session_id===sess.id).map(x=>({ ...x, activity:amap[x.activity_id] || { id:x.activity_id, title:"Coach drill" } })) })));
    } catch (error) {
      console.error("Academy Coach sync failed", error); setWeeklyPlan(null); setPlanSessions([]); setAcademyExtras([]);
    }
  }

  async function ensureAcademyPlan() {
    if (weeklyPlan?.id) return weeklyPlan;
    if (!selectedTeam?.id || !club?.id) return null;

    const now = new Date();
    const day = now.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - daysFromMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekStartDate = weekStart.toISOString().split("T")[0];
    const weekEndDate = weekEnd.toISOString().split("T")[0];

    const { data: currentWeek, error: currentError } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("age_group_id", selectedTeam.id)
      .gte("starts_at", weekStartDate)
      .lt("starts_at", weekEndDate)
      .order("starts_at", { ascending: false })
      .limit(1);
    if (currentError) { alert("Could not load Academy week: " + currentError.message); return null; }
    if (currentWeek?.[0]) {
      setWeeklyPlan(currentWeek[0]);
      setAcademyPublished(Boolean(currentWeek[0].published));
      setAcademyVideoOverrides(currentWeek[0].academy_video_overrides || {});
      return currentWeek[0];
    }

    const { data: latest } = await supabase
      .from("weekly_plans")
      .select("week_number")
      .eq("age_group_id", selectedTeam.id)
      .order("week_number", { ascending: false })
      .limit(1);
    const nextWeek = Number(latest?.[0]?.week_number || 0) + 1;
    const { data: created, error } = await supabase.from("weekly_plans").insert({
      club_id: club.id,
      age_group_id: selectedTeam.id,
      week_number: nextWeek,
      season: "2026-27",
      mode: selectedTeam.gender === "girls" ? "camogie" : "hurling",
      starts_at: weekStartDate,
      published: false,
      academy_video_overrides: {},
    }).select().single();
    if (error) { alert("Could not create Academy draft: " + error.message); return null; }
    setWeeklyPlan(created);
    setPlanSessions([]);
    setAcademyPublished(false);
    setAcademyVideoOverrides({});
    return created;
  }

  async function setAcademyVideoOverride(activityId, skillId) {
    const next = { ...academyVideoOverrides };
    if (skillId) next[activityId] = skillId; else delete next[activityId];
    setAcademyVideoOverrides(next);
    const plan = await ensureAcademyPlan();
    if (plan?.id) {
      const { error } = await supabase.from("weekly_plans").update({ academy_video_overrides: next }).eq("id", plan.id);
      if (error) console.error("Could not save Academy video choice", error);
    }
  }

  async function addAcademyExtra(extra) {
    if (!permissions.canEditAcademyPlans) { alert("This team is read-only for your Coach / Mentor role."); return; }
    if (!selectedTeam?.id || !club?.id) return;
    const plan = await ensureAcademyPlan();
    if (!plan?.id) {
      setAcademyExtras(prev => { const next=[...prev, extra]; localStorage.setItem("spraoi_academy_extras", JSON.stringify(next)); return next; });
      return;
    }
    const { data, error } = await supabase.from("journey_exercises").insert({
      plan_id: plan.id,
      age_group_id: selectedTeam.id,
      club_id: club.id,
      title: extra.title,
      description: [extra.target, extra.instruction].filter(Boolean).join(" · ") || null,
      xp_reward: Number(extra.xp) || 5,
      sort_order: academyExtras.length,
      activity_type: extra.type || "exercise",
      required: Boolean(extra.required),
      verification_type: extra.verification_type || "self",
    }).select().single();
    if (error) {
      console.warn("Academy extra saved locally because the optional activity_type/required columns are not available yet", error.message);
      setAcademyExtras(prev => { const next=[...prev, extra]; localStorage.setItem("spraoi_academy_extras", JSON.stringify(next)); return next; });
      return;
    }
    setAcademyExtras(prev => [...prev, { ...extra, ...data, xp: data.xp_reward, type: data.activity_type || extra.type }]);
  }
  async function removeAcademyExtra(id) {
    if (!String(id).startsWith("local-")) {
      await supabase.from("player_progress").delete().eq("exercise_id", id);
      await supabase.from("journey_exercises").delete().eq("id", id);
    }
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
        verification_type: changes.verification_type || "self",
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
    if (!permissions.canPublishAcademy) { alert("Only a Lead Coach or Club Admin can publish Academy content."); return; }
    const next=!academyPublished;
    const plan = await ensureAcademyPlan();
    if (!plan?.id) return;
    const { error } = await supabase.from("weekly_plans").update({ published: next, academy_video_overrides: academyVideoOverrides }).eq("id", plan.id);
    if (error) { alert("Could not publish Academy week: " + error.message); return; }
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
        <img src="/spraoi-icon.png" alt="Spraoi" style={{ width: 48, height: 48, opacity: 0.7 }} />
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
            <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>Coach Platform</div>
          </div>
          <div style={{ background: P.white, borderRadius: 18, padding: 28, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 16 }}>Sign In</div>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@email.com" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginTop: 4, marginBottom: 12, background: P.soft }} />
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" onKeyDown={(e) => e.key === "Enter" && login()} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginTop: 4, marginBottom: 16, background: P.soft }} />
            {authError && <div style={{ color: P.coral, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
            <button onClick={login} disabled={loggingIn || !email || !password} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontFamily: F.display, fontSize: 14, fontWeight: 800, background: P.p600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(142,36,170,.3)" }}>
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
        <img src="/spraoi-icon.png" alt="Spraoi" style={{ width: 48, height: 48, opacity: 0.5 }} />
      </div>
    );
  }

  // Team setup — show selection screen if no teams assigned
  if (!selectedTeam && ageGroups.length > 0) {
    if (myTeams.length === 0) {
      // No teams assigned — show selection screen
      const labels = [...new Set(ageGroups.map((ag) => ag.label))].sort((a, b) => parseInt(a.replace("U", "")) - parseInt(b.replace("U", "")));
      return (
        <div style={{ minHeight: "100vh", background: P.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, padding: 16 }}>
          <div style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 140, height: "auto", marginBottom: 8 }} />
              <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{club?.name}</div>
            </div>
            <div style={{ background: P.white, borderRadius: 18, padding: 24, boxShadow: Sh.lift }}>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 4 }}>Select your teams</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: P.muted, marginBottom: 16 }}>Choose the groups you coach. You can change this later in your profile.</div>
              {labels.map((label) => {
                const boys = ageGroups.find((ag) => ag.label === label && ag.gender !== "girls");
                const girls = ageGroups.find((ag) => ag.label === label && ag.gender === "girls");
                return (
                  <div key={label} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {boys && (
                      <button onClick={async () => {
                        await supabase.from("coach_assignments").insert({ user_id: session.user.id, club_id: club.id, age_group_id: boys.id });
                        setMyTeams((t) => [...(t === "all" ? [] : t), boys.id]);
                        selectTeam(boys);
                      }} style={{ flex: 1, padding: "14px 10px", borderRadius: 12, border: `1.5px solid ${P.line}`, background: P.soft, cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: P.p600 }}>{label}</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, marginTop: 2 }}>Boys</div>
                      </button>
                    )}
                    {girls && (
                      <button onClick={async () => {
                        await supabase.from("coach_assignments").insert({ user_id: session.user.id, club_id: club.id, age_group_id: girls.id });
                        setMyTeams((t) => [...(t === "all" ? [] : t), girls.id]);
                        selectTeam(girls);
                      }} style={{ flex: 1, padding: "14px 10px", borderRadius: 12, border: `1.5px solid #d81b6033`, background: "#fef0f5", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: "#d81b60" }}>{label}</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: "#d81b60", marginTop: 2 }}>Girls</div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    // Has teams — auto-select the first one
    const firstTeam = ageGroups.find((ag) => myTeams.includes(ag.id));
    if (firstTeam) selectTeam(firstTeam);
    return null;
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
    <div className="spraoi-shell" style={{ display: "flex", minHeight: "100vh", width: "100%", fontFamily: F.body, paddingTop: showMobile ? 62 : 0, paddingBottom: showMobile ? 68 : 0, boxSizing: "border-box" }}>
      <MobileAccessibilityStyles />
      {showMobile && <MobileHeader activeModule={activeModule} setActiveModule={setActiveModule} onNav={setScreen} enabledModules={enabledModules} club={club} selectedTeam={selectedTeam} />}

      {/* Sidebar — desktop only */}
      {!showMobile && <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} activeScreen={screen} onNav={setScreen} club={club} selectedTeam={selectedTeam} onSelectTeam={selectTeam} enabledModules={enabledModules} onLogout={logout} ageGroups={ageGroups} myTeams={myTeams} onShowProfile={() => setShowProfile(true)} />}

      {/* COACH screens */}
      {screen === "coach-dashboard" && <DashboardScreen club={club} ageGroups={ageGroups} planSessions={planSessions} weeklyPlan={weeklyPlan} upcomingSessions={upcomingSessions} onNav={setScreen} onOpenSession={openSession} allActivities={allActivities} selectedTeam={selectedTeam} />}
      {screen === "coach-planner" && <PlannerScreen onNav={setScreen} club={club} ageGroups={ageGroups} upcomingSessions={upcomingSessions} onOpenSession={openSession} allActivities={allActivities} coaches={coaches} skills={skills} diagramMap={diagramMap} selectedTeam={selectedTeam} />}
      {screen === "coach-sessions" && <SessionsListScreen club={club} selectedTeam={selectedTeam} onOpenSession={openSession} onNav={setScreen} onEditSession={editSession} />}
      {screen === "coach-builder" && <SessionBuilderScreen club={club} ageGroups={ageGroups} skills={skills} allActivities={allActivities} coaches={coaches} diagramMap={diagramMap} selectedTeam={selectedTeam} onNav={setScreen} editingSession={editingSession} onClearEdit={() => setEditingSession(null)} />}
      {screen === "coach-drills" && <DrillsScreen allActivities={allActivities} diagramMap={diagramMap} favouriteIds={favouriteIds} onToggleFavourite={toggleFavourite} userRole={userRole} />}
      {screen === "coach-players" && <PlayersScreen club={club} ageGroups={ageGroups} selectedTeam={selectedTeam} />}

      {/* CLUB screens */}
      {screen === "club-permissions" && <ClubPermissionsScreen club={club} userRole={userRole} />}
      {screen.startsWith("club-") && screen !== "club-permissions" && <ModulePlaceholder module={MODULES.club} screen={screen} club={club} />}

      {/* CUP screens */}
      {screen.startsWith("cup-") && <ModulePlaceholder module={MODULES.cup} screen={screen} club={club} />}

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
        <AcademySectionScreen screen={screen} onNav={setScreen} club={club} selectedTeam={selectedTeam} weeklyPlan={weeklyPlan} planSessions={planSessions} extras={academyExtras} skills={skills} overrides={academyVideoOverrides} onSetOverride={setAcademyVideoOverride} onAddExtra={addAcademyExtra} onUpdateExtra={updateAcademyExtra} onRemoveExtra={removeAcademyExtra} onMoveExtra={moveAcademyExtra} published={academyPublished} onPublish={publishAcademyWeek} parentRows={academyParents} setParentRows={updateAcademyParents} />
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
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{userRole?.role?.replace("_", " ") || "Coach"} · {club?.name}</div>
                </div>
              </div>

              {/* My Teams */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink, marginBottom: 8 }}>My Teams</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {ageGroups.filter((ag) => myTeams.includes(ag.id)).map((ag) => (
                    <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, background: P.soft, border: `1px solid ${P.line}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink }}>{ag.label} {ag.gender === "girls" ? "Girls" : "Boys"}</span>
                      <button onClick={async () => {
                        await supabase.from("coach_assignments").delete().eq("user_id", session.user.id).eq("age_group_id", ag.id);
                        setMyTeams((t) => t.filter((id) => id !== ag.id));
                        if (selectedTeam?.id === ag.id) setSelectedTeam(null);
                      }} style={{ background: "none", border: "none", color: P.coral, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                    </div>
                  ))}
                  {myTeams.length === 0 && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>No teams selected yet</div>}
                </div>
                {/* Add more teams */}
                <select onChange={async (e) => {
                  const agId = e.target.value;
                  if (!agId || myTeams.includes(agId)) return;
                  await supabase.from("coach_assignments").insert({ user_id: session.user.id, club_id: club.id, age_group_id: agId });
                  setMyTeams((t) => [...t, agId]);
                  e.target.value = "";
                }} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, color: P.muted }}>
                  <option value="">+ Add another team...</option>
                  {ageGroups.filter((ag) => !myTeams.includes(ag.id)).sort((a, b) => parseInt(a.label.replace("U", "")) - parseInt(b.label.replace("U", ""))).map((ag) => (
                    <option key={ag.id} value={ag.id}>{ag.label} {ag.gender === "girls" ? "Girls" : "Boys"}</option>
                  ))}
                </select>
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
