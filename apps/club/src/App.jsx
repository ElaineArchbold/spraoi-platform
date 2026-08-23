import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import ClubScheduling from "./ClubScheduling";
import html2canvas from "html2canvas";
import { openAdminModule, requestedTeamFromUrl, readModuleScreen, writeModuleScreen } from "../../../packages/ui/src/platformNavigation.js";
import { LEGAL_POLICIES, LEGAL_POLICY_VERSION, LEGAL_EFFECTIVE_DATE } from "../../../packages/ui/src/legalPolicies.js";
import * as XLSX from "xlsx";
import "../../../packages/ui/src/adminShell.css";
/* ============================================================
   SPRAOI COACH — Desktop-first redesign
   Navy sidebar, purple accents, responsive
   ============================================================ */

// Design tokens (from Figma design system)
const P = {
  p900: "#4a0072", p800: "#6a1b9a", p700: "#7b1fa2", p600: "#7C3AED",
  p500: "#9c27b0", p400: "#ab47bc", p300: "#ce93d8", p200: "#e1bee7", p100: "#f3e5f5", p50: "#faf5fc",
  navy: "#0b2545", ink: "#13243b", muted: "#627187", line: "#dfe7ef",
  soft: "#f6f9fc", cream: "#fffaf2", white: "#ffffff",
  green: "#43a047", orange: "#fb8c00", coral: "#e64a19", sky: "#29b6f6", yellow: "#fbc02d",
};
const F = {
  display: "'Manrope', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

function useSpraoiFonts() {
  useEffect(() => {
    const id = "spraoi-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap";
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

function displayRoleLabel(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "super_admin") return "Super Admin";
  if (normalized === "admin" || normalized === "club_admin") return "Admin";
  if (normalized === "lead_coach") return "Lead Coach";
  if (normalized === "team_admin") return "Team Admin";
  return "Coach/Mentor";
}

function roleCapabilities(role, grants = {}) {
  const normalized = String(role || "").toLowerCase();

  const isClubAdmin = ["club_admin", "super_admin", "admin"].includes(normalized);
  const isLeadCoach = normalized === "lead_coach";
  const isTeamAdmin = normalized === "team_admin";
  const isCoachMentor = ["coach_mentor", "coach", "mentor"].includes(normalized);

  const coachWrite =
    isClubAdmin ||
    isLeadCoach ||
    Boolean(grants.coach_write);

  const academyWrite =
    isClubAdmin ||
    isLeadCoach ||
    Boolean(grants.academy_write);

  const academyPublish =
    isClubAdmin ||
    isLeadCoach ||
    Boolean(grants.academy_publish);

  const connectRead =
    isClubAdmin ||
    isLeadCoach ||
    isTeamAdmin ||
    Boolean(grants.connect_read) ||
    Boolean(grants.connect_write);

  const connectWrite =
    isClubAdmin ||
    isLeadCoach ||
    isTeamAdmin ||
    Boolean(grants.connect_write);

  const cupRead =
    isClubAdmin ||
    isTeamAdmin ||
    Boolean(grants.cup_read) ||
    Boolean(grants.cup_write);

  const cupWrite =
    isClubAdmin ||
    isTeamAdmin ||
    Boolean(grants.cup_write);

  const attendanceManage =
    isClubAdmin ||
    isLeadCoach ||
    isTeamAdmin ||
    isCoachMentor ||
    Boolean(grants.attendance_manage);

  return {
    isClubAdmin,
    isLeadCoach,
    isTeamAdmin,
    isCoachMentor,

    coachWrite,
    academyWrite,
    academyPublish,

    connectRead,
    connectWrite,

    cupRead,
    cupWrite,

    attendanceManage,

    canEditCoachPlans: coachWrite,
    canEditAcademyPlans: academyWrite,
    canPublishAcademy: academyPublish,

    canAddDrills: coachWrite,
    canEditSharedDrills: isClubAdmin || isLeadCoach,
    canDeleteSharedDrills: isClubAdmin,

    canManageTeamStaff: isClubAdmin,
  };
}

const LIMITED_CLUB_SCREENS = new Set([
  "club-scheduling",
]);

function modulesForRole(role, capabilities = {}) {
  const normalized = String(role || "").toLowerCase();

  if (["super_admin", "admin", "club_admin"].includes(normalized)) {
    return ["coach", "club", "cup", "connect", "academy", "plus"];
  }

  if (normalized === "lead_coach") {
    return ["coach", "academy", "connect", "club"];
  }

  if (normalized === "team_admin") {
    return ["club", "coach", "academy", "connect", "cup"];
  }

  if (["coach_mentor", "coach", "mentor"].includes(normalized)) {
    const modules = ["club", "coach", "academy"];

    if (capabilities.connectRead || capabilities.connectWrite) {
      modules.push("connect");
    }

    if (capabilities.cupRead || capabilities.cupWrite) {
      modules.push("cup");
    }

    return modules;
  }

  if (normalized === "cup_helper") {
    return ["cup"];
  }

  if (normalized === "club_staff") {
    return ["club"];
  }

  return [];
}

function canAccessClubScreen(role, screen) {
  const normalized = String(role || "").toLowerCase();

  if (["super_admin", "admin", "club_admin"].includes(normalized)) {
    return true;
  }

  if (normalized === "lead_coach") {
    return ["club-dashboard", "club-teams", "club-coaches"].includes(screen);
  }

  if (
    normalized === "team_admin" ||
    ["coach_mentor", "coach", "mentor"].includes(normalized)
  ) {
    return LIMITED_CLUB_SCREENS.has(screen);
  }

  return false;
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
  else if (key.includes("more")) shape=<><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></>;
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
    catIcon = { icon: "/rest-and-recovery-icon.png", bg: "linear-gradient(135deg, #ab47bc 0%, #6a1b9a 100%)", label: "Warm Up & Recovery", color: "#7C3AED" };

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
const APP_MODULE = import.meta.env.VITE_APP_MODULE || "club";
const MODULE_URLS = {
  coach: null,
  academy: null,
  club: null,
};


function secondaryNavAsset(moduleKey, id) {
  const maps = {
    coach: {
      "coach-dashboard": "/icons/coach/dashboard.svg",
      "coach-planner": "/icons/global/calendar.png",
      "coach-sessions": "/icons/connect/scheduled.png",
      "coach-drills": "/icons/academy/mission.png",
      "coach-players": "/icons/global/profile.png",
    },
    academy: {
      "academy-dashboard": "/icons/academy/home.png",
      "academy-content": "/icons/academy/week-calendar.png",
      "academy-players": "/icons/academy/child-profile.png",
      "academy-parents": "/icons/academy/parent-lock.png",
      "academy-preview": "/icons/academy/child-profile.png",
      "academy-leaderboard": "/icons/academy/leaderboard.png",
      "academy-engagement": "/icons/academy/progress.png",
      "academy-approvals": "/icons/academy/completed.png",
      "academy-settings": "/icons/global/settings.png",
    },
    connect: {
      "dashboard": "/icons/connect/home.svg",
      "events": "/icons/connect/events.png",
      "messages": "/icons/connect/messages.png",
      "groups": "/icons/connect/groups.png",
      "responses": "/icons/connect/availability.png",
      "settings": "/icons/connect/settings.svg",
      "connect-dashboard": "/icons/connect/home.svg",
      "connect-compose": "/icons/connect/send.png",
      "connect-audiences": "/icons/connect/groups.png",
      "connect-inbox": "/icons/connect/messages.png",
      "connect-responses": "/icons/connect/availability.png",
      "connect-templates": "/icons/connect/announcement.png",
      "connect-settings": "/icons/connect/settings.svg",
    },
    cup: {
      "cup-dashboard": "/icons/cup/dashboard.png",
      "cup-events": "/icons/cup/matchday.png",
      "cup-checklist": "/icons/cup/completed.png",
      "cup-teams": "/icons/cup/teams.png",
      "cup-competition": "/icons/cup/competition-bracket.png",
      "cup-matchday": "/icons/cup/matchday.png",
      "cup-content": "/icons/cup/announcements.png",
      "cup-food": "/icons/cup/food.png",
      "cup-schedule": "/icons/cup/fixtures.png",
      "cup-results": "/icons/cup/results.png",
      "cup-standings": "/icons/cup/standings.png",
      "cup-announcements": "/icons/cup/announcements.png",
      "cup-participant-view": "/icons/cup/participant-view.png",
      "cup-settings": "/icons/cup/settings.png",
    },
    club: {
      "club-dashboard": "/icons/club/dashboard.svg",
      "club-setup": "/icons/club/settings.svg",
      "club-teams": "/icons/club/team-shield.svg",
      "club-members": "/icons/club/people.svg",
      "club-coaches": "/icons/club/people.svg",
      "club-permissions": "/icons/club/roles.svg",
      "club-scheduling": "/icons/club/facilities.svg",
      "club-compliance": "/icons/club/compliance.svg",
      "club-facilities": "/icons/club/facilities.svg",
      "club-branding": "/icons/global/edit.png",
      "club-integrations": "/icons/global/external-link.png",
      "club-reports": "/icons/club/reports.svg",
      "club-settings": "/icons/global/settings.png",
    },
  };
  return maps[moduleKey]?.[id] || "/icons/global/chevron.png";
}

function SecondarySidebarIcon({ moduleKey, id }) {
  return (
    <img
      className="spraoi-secondary-nav-icon"
      src={secondaryNavAsset(moduleKey, id)}
      alt=""
      aria-hidden="true"
    />
  );
}

const MODULES = {
  coach: {
    label: "Coach", color: "#7C3AED", icon: "/spraoi-coach-icon.png", tagline: "Plan and deliver better coaching.", nav: [
      { id: "coach-dashboard", icon: "⌂", label: "Dashboard" },
      { id: "coach-planner", icon: "◫", label: "Planner" },
      { id: "coach-sessions", icon: "▶", label: "Sessions" },
      { id: "coach-drills", icon: "◇", label: "Drills" },
      { id: "coach-players", icon: "●", label: "Players" },
    ]
  },
  academy: {
    label: "Academy", color: "#2563EB", icon: "/spraoi-academy-icon.png", tagline: "Turn weekly coaching into child-friendly practice.", nav: [
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
    label: "Cup", color: "#D89A00", icon: "/spraoi-cup-icon.png", tagline: "Set up and run blitzes and tournaments.", nav: [
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
    label: "Connect", color: "#F97316", icon: "/spraoi-connect-icon.png", tagline: "Send messages, links and collect responses.", nav: [
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
    label: "Club", color: "#DC2626", icon: "/spraoi-club-icon.png", tagline: "Set up your club, teams and coaching access.", nav: [
      { id: "club-dashboard", icon: "home", label: "Dashboard" },
      { id: "club-setup", icon: "setup", label: "Club Setup" },
      { id: "club-teams", icon: "teams", label: "Teams" },
      { id: "club-coaches", icon: "coaches", label: "People" },
      { id: "club-scheduling", icon: "schedule", label: "Facilities & Slots" },
      { id: "club-compliance", icon: "compliance", label: "Compliance" },
      { id: "club-permissions", icon: "permissions", label: "Roles & Permissions" },
    ]
  },
};


function ClubNavIcon({ name, size = 17 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const icons = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
    setup: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5 15a1.7 1.7 0 0 0-1.56-1.03H3.3v-3h.14A1.7 1.7 0 0 0 5 9.94a1.7 1.7 0 0 0-.34-1.88L4.6 8l2.12-2.12.06.06A1.7 1.7 0 0 0 8.66 6.3a1.7 1.7 0 0 0 1.03-1.56V4.7h3v.04a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L17.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/></>,
    teams: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6"/><path d="M14.5 14.5c3.4-.3 5.3 1.5 6 4.5"/></>,
    coaches: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="7" r="2.4"/><path d="M2.8 20c.6-4 2.4-6 5.2-6 2.9 0 4.6 2 5.2 6"/><path d="M14 12.5h7"/><path d="M17.5 9v7"/></>,
    compliance: <><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    permissions: <><circle cx="9" cy="11" r="3"/><path d="M2.8 20c.5-3.6 2.6-5.5 6.2-5.5 1.2 0 2.2.2 3 .6"/><path d="M15 14h6"/><path d="M18 11v6"/></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></>,
  };
  return <svg {...common}>{icons[name] || icons.home}</svg>;
}

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
function Sidebar({ activeModule, setActiveModule, activeScreen, onNav, club, selectedTeam, onSelectTeam, enabledModules, onLogout, ageGroups, myTeams, onShowProfile, userInitial, userRole }) {
  const visibleTeams = (ageGroups || []).filter((ag) => (myTeams || []).includes(ag.id));
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  const visibleNavItems = activeModule === "club"
    ? mod.nav.filter((item) => canAccessClubScreen(userRole?.role, item.id))
    : mod.nav;
  function openModule(key, module) {
    if (!enabledModules.includes(key)) return;

    let target = readModuleScreen(key, module.nav[0].id);

    if (key === "club" && !canAccessClubScreen(userRole?.role, target)) {
      target = module.nav.find((item) => canAccessClubScreen(userRole?.role, item.id))?.id || "club-teams";
    }
    if (key !== APP_MODULE) {
      openAdminModule(key, target);
      return;
    }
    setActiveModule(APP_MODULE);
    onNav(target);
  }

  return (
    <div className="spraoi-desktop-shell-nav" style={{ width: 306, minHeight: "100vh", display: "flex", flexShrink: 0, position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", zIndex: 30 }}>
      {/* Fixed global module rail: all modules are always reachable without scrolling */}
      <aside className="spraoi-global-rail" style={{ width: 78, background: "#10243e", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: 8, borderRight: "1px solid rgba(255,255,255,.08)" }}>
        <div title={clubName} style={{ width: 60, height: 60, borderRadius: 17, background: "#fff", display: "grid", placeItems: "center", overflow: "hidden", boxShadow: "0 5px 16px rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.55)", marginBottom: 5 }}>
          <img src={club?.logo_url || "/spraoi-club-icon.png"} alt={`${clubName} crest`} style={{ width: 52, height: 52, objectFit: "contain" }} />
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 62,
            height: 34,
            marginBottom: 5,
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>
          {["coach", "academy", "connect", "cup", "club"].filter((key) => enabledModules.includes(key)).map((key) => {
            const module = MODULES[key];
            const isActive = activeModule === key;
            const locked = !enabledModules.includes(key);
            const darkText = key === "connect";
            return (
              <button className="spraoi-module-switcher-button" data-active={isActive} key={key} title={`${module.label}${locked ? " — contact your administrator" : ""}`} onClick={() => openModule(key, module)} style={{ width: "100%", minHeight: 62, border: "none", borderRadius: 14, cursor: "pointer", background: isActive ? module.color : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, position: "relative", boxShadow: isActive ? "0 8px 22px rgba(0,0,0,.24)" : "none" }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", boxShadow: isActive ? "0 6px 16px rgba(0,0,0,.18)" : "0 3px 10px rgba(0,0,0,.10)" }}><img src={module.icon} alt="" style={{ width: 40, height: 40, objectFit: "contain", filter: locked ? "grayscale(1) opacity(.55)" : "none" }} /></span>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "-.01em", color: isActive ? (darkText ? "#332800" : "#fff") : "rgba(255,255,255,.7)" }}>{module.label}</span>
                {locked && <span style={{ position: "absolute", top: 5, right: 5, fontSize: 9, color: "rgba(255,255,255,.8)" }}>🔒</span>}
              </button>
            );
          })}
        </div>
        <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 58, height: 38, objectFit: "contain", marginBottom: 4, opacity: .96 }} />
        <button onClick={onShowProfile} title="Profile & sign out" style={{ width: 42, height: 42, borderRadius: 13, border: "1px solid rgba(255,255,255,.36)", background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", fontFamily: F.body, fontWeight: 800 }}>{userInitial || "U"}</button>
      </aside>

      {/* Fixed navigation for the active module */}
      <aside className="spraoi-module-sidebar" data-module={activeModule} style={{ width: 228, background: `linear-gradient(180deg, ${mod.color} 0%, ${mod.color}ee 58%, #10243e 100%)`, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "background .22s ease", color: activeModule === "connect" ? "#332800" : "#fff" }}>
        <div className="spraoi-module-title-block" style={{ height: 118, minHeight: 118, boxSizing: "border-box", padding: "18px 16px", borderBottom: activeModule === "connect" ? "1px solid rgba(51,40,0,.18)" : `1px solid ${mod.color}33` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: "#fff", display: "grid", placeItems: "center", border: "1px solid rgba(15,23,42,.10)", boxShadow: "0 7px 18px rgba(0,0,0,.16)", overflow: "hidden", flexShrink: 0 }}>
              <img src="/spraoi-logo.png" alt="Spraoi Sports" style={{ width: 42, height: 42, objectFit: "contain" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", color: activeModule === "connect" ? "#332800" : "#fff", lineHeight: 1.05 }}>{mod.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: activeModule === "connect" ? "#5b4600" : "#fff", marginTop: 5 }}>{clubName}</div>
            </div>
          </div>
        </div>

        {activeModule !== "club" && <div style={{ margin: "11px 12px 4px" }}>
          {visibleTeams.length > 1 ? (
            <select value={selectedTeam?.id || ""} onChange={(e) => { const ag = ageGroups?.find((a) => a.id === e.target.value); if (ag) onSelectTeam(ag); }} style={{ width: "100%", padding: "9px 10px", borderRadius: 9, border: activeModule === "connect" ? "1px solid rgba(51,40,0,.2)" : "1px solid rgba(255,255,255,.2)", background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: activeModule === "connect" ? "#332800" : "#fff", cursor: "pointer" }}>
              {visibleTeams.map((ag) => <option key={ag.id} value={ag.id} style={{ color: P.ink }}>{teamDisplayName(ag)}</option>)}
            </select>
          ) : selectedTeam ? (
            <div style={{ padding: "9px 10px", borderRadius: 9, background: activeModule === "connect" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)", fontFamily: F.body, fontSize: 11, fontWeight: 700 }}>{teamDisplayName(selectedTeam)}</div>
          ) : null}
        </div>}

        <nav style={{ flex: 1, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {visibleNavItems.map((item) => {
            const isActive = activeScreen === item.id || (item.id === "coach-sessions" && activeScreen === "coach-builder");
            const fg = activeModule === "connect" ? "#332800" : "#fff";
            return (
              <button className="spraoi-module-nav-button" data-active={isActive} key={item.id} onClick={() => onNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 10, border: isActive ? "1px solid rgba(255,255,255,.75)" : "1px solid transparent", cursor: "pointer", width: "100%", background: isActive ? "#fff" : "transparent", textAlign: "left", boxShadow: isActive ? "0 4px 12px rgba(16,36,62,.14)" : "none" }}>
                <span className="spraoi-secondary-nav-icon-wrap" style={{ background: "transparent", border: 0, boxShadow: "none", padding: 0 }}>
                  <SecondarySidebarIcon moduleKey={activeModule} id={item.id} />
                </span>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: isActive ? 750 : 650, letterSpacing: "-.01em", color: isActive ? (activeModule === "connect" ? "#5b4600" : mod.color) : "#fff", opacity: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

      </aside>
    </div>
  );
}

function TopBar({ title, sub, children, moduleKey }) {
  const lower = `${title || ""} ${sub || ""}`.toLowerCase();
  let key = moduleKey || "coach";
  if (!moduleKey) {
    if (lower.includes("academy")) key = "academy";
    else if (lower.includes("cup") || lower.includes("tournament") || lower.includes("fixture")) key = "cup";
    else if (lower.includes("connect") || lower.includes("message") || lower.includes("audience") || lower.includes("inbox")) key = "connect";
    else if (lower.includes("club") || lower.includes("permission") || lower.includes("member")) key = "club";
    else if (lower.includes("plus") || lower.includes("challenge") || lower.includes("leaderboard")) key = "plus";
  }
  const module = MODULES[key];
  const isConnect = key === "connect";
  const isAcademy = key === "academy";
  const background = isAcademy
    ? "linear-gradient(135deg, #eef8ff 0%, #d8f0ff 52%, #c8e9fb 100%)"
    : isConnect
      ? "linear-gradient(135deg, #fff8d6 0%, #fbcf45 100%)"
      : key === "club"
        ? "linear-gradient(135deg, #fffafa 0%, #fff0f0 52%, #fbdcdc 100%)"
        : `linear-gradient(135deg, ${module.color}14 0%, ${module.color}2c 100%)`;
  return (
    <div className={`spraoi-topbar spraoi-topbar-${key}`} style={{ height: 118, minHeight: 118, boxSizing: "border-box", padding: "20px 28px", background, borderBottom: `1px solid ${module.color}33`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div className="spraoi-topbar-icon" style={{ width: 64, height: 64, borderRadius: 20, display: "grid", placeItems: "center", background: "#fff", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 10px 26px rgba(16,36,62,.12)", flexShrink: 0 }}>
          <img src={module.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F.display, fontSize: 21, fontWeight: 700, color: isConnect ? "#332800" : P.ink, lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ fontFamily: F.body, fontSize: 12, color: isConnect ? "rgba(51,40,0,.72)" : P.muted, marginTop: 6 }}>{sub}</div>}
        </div>
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>}
    </div>
  );
}

function Btn({ label, variant = "primary", icon, onClick, style }) {
  const styles = {
    primary: { background: "#DC2626", color: P.white, border: "1px solid #DC2626", boxShadow: "0 5px 14px rgba(16,36,62,.12)" },
    secondary: { background: P.white, color: P.ink, border: `1px solid ${P.line}`, boxShadow: "0 2px 8px rgba(16,36,62,.05)" },
    ghost: { background: P.white, color: P.ink, border: `1px solid ${P.line}`, boxShadow: "none" },
  };
  return (
    <button
      className="spraoi-touch-button spraoi-action-button"
      data-variant={variant}
      onClick={onClick}
      style={{ ...styles[variant], ...style }}
    >
      {icon && <span className="spraoi-action-icon">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */
function StatCard({ label, value, sub, color = P.p600, icon }) {
  return (
    <div className="spraoi-stat-card" style={{ background: P.white, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.line}`, borderTop: `3px solid ${color}`, boxShadow: Sh.card }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {icon && (typeof icon === "string" && icon.startsWith("/") ? <span className="spraoi-card-icon-chip" style={{ "--card-accent": color }}><img className="spraoi-card-icon" src={icon} alt="" aria-hidden="true" /></span> : <span className="spraoi-card-icon-fallback" style={{ "--card-accent": color }}>{icon}</span>)}
      </div>
      <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 800, color: P.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
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
        <Btn label="New Session" variant="primary" onClick={() => onNav("coach-builder")} />
      </TopBar>
      <div style={{ padding: "20px 24px" }}>
        {/* Stat cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Favourite Drills" value="★" sub="Your saved drills" color={P.p600} icon="❤️" />
          <div onClick={() => onNav("academy-dashboard")} style={{ background: P.white, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.line}`, borderTop: "3px solid #2563EB", boxShadow: Sh.card, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Academy Sync</span>
              <span style={{ fontSize: 16 }}>🎓</span>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, color: P.ink, lineHeight: 1 }}>Open Academy</div>
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
                    <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>{sess.session_date ? new Date(sess.session_date).getDate() : "?"}</div>
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
        <Btn label="New Session" variant="primary" onClick={() => { const d = new Date(); clickDate(d.getDate()); }} />
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
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>{fullMonths[selectedMonth]} {selectedYear}</div>
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
                      <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 800, color: P.p600, width: 16 }}>{i + 1}</span>
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
                        <span style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: sectionColors[sec.type], width: 18 }}>{di + 1}</span>
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
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, color: P.ink, marginBottom: 6 }}>Session is {totalTime - 60} minutes over</div>
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
          {userRole?.role === "super_admin" && <button onClick={() => setMode("builder")} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${mode === "builder" ? P.p600 : P.line}`, background: mode === "builder" ? P.p50 : P.white, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: mode === "builder" ? P.p600 : P.muted, cursor: "pointer" }}>Create Drill</button>}
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
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink, marginBottom: 4 }}>{selectedDrill.title}</div>
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
    { color: "#7C3AED", label: "Purple" },
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
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: title ? P.ink : P.muted, lineHeight: 1.2, marginBottom: 4 }}>{title || "Drill Title"}</div>
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
        <Btn label="New Session" variant="primary" onClick={() => onNav("coach-builder")} />
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
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>{sess.session_date ? new Date(sess.session_date).getDate() : "?"}</div>
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

/* ============================================================
   CLUB ADMIN — Dashboard, teams, members and RBAC
   ============================================================ */

const CLUB_RED = "#DC2626";
const CLUB_RED_DARK = "#a91f1f";
const CLUB_SOFT = "#fff1f1";

function ClubPage({ title, sub, children, actions }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <style>{`
        @media (max-width: 700px) {
          .spraoi-topbar-club {
            padding: 18px 18px 16px !important;
            min-height: auto !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 14px !important;
          }

          .spraoi-topbar-club .spraoi-topbar-icon {
            display: none !important;
          }

          .spraoi-topbar-club > div:first-of-type {
            width: 100% !important;
            min-width: 0 !important;
            align-items: flex-start !important;
          }

          .spraoi-topbar-club > div:first-of-type > div:last-child {
            width: 100% !important;
            min-width: 0 !important;
          }

          .club-team-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .club-team-actions > * {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 42px !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
        }

        @media (max-width: 390px) {
          .club-team-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <TopBar title={title} sub={sub} moduleKey="club">{actions}</TopBar>

      <div style={{ padding: "22px 24px", maxWidth: 1220, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

function ClubCard({ children, style }) {
  return (
    <div style={{
      background: P.white,
      border: `1px solid ${P.line}`,
      borderRadius: 16,
      padding: 18,
      boxShadow: Sh.card,
      ...style,
    }}>
      {children}
    </div>
  );
}

function ClubDashboardScreen({ club, ageGroups, coaches, selectedTeam, onNav }) {
  return (
    <ClubPage
      title="Dashboard"
      sub={`${club?.name || "Club Spraoi"} · Operating centre`}
      actions={<Btn label="Manage Teams" onClick={() => onNav("club-teams")} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard label="Teams" value={String(ageGroups?.length || 0)} sub="Persistent club teams" color={CLUB_RED} icon="/icons/club/team-shield.svg" />
        <StatCard label="Coaches" value={String(coaches?.length || 0)} sub="Club staff records" color={CLUB_RED_DARK} icon="/icons/club/people.svg" />
        <StatCard label="Active Team" value={selectedTeam ? teamDisplayName(selectedTeam) : "—"} sub="Shared across modules" color="#e57373" icon="/icons/club/team-shield.svg" />
        <StatCard label="Access Model" value="4 roles" sub="Super Admin, Admin, Lead Coach, Coach/Mentor" color="#ef5350" icon="/icons/club/roles.svg" />
      </div>

      <section className="spraoi-dashboard-analytics club-dashboard-analytics"><div className="spraoi-dashboard-section-head"><div><div className="spraoi-dashboard-section-title">Club overview</div><div className="spraoi-dashboard-section-sub">Team and coaching coverage across the club.</div></div><button className="spraoi-download-button club-download" type="button" onClick={()=>{const rows=[["Metric","Value"],["Teams",ageGroups?.length||0],["Coaches",coaches?.length||0],["Active team",selectedTeam?teamDisplayName(selectedTeam):""]];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="club-dashboard.csv";a.click();URL.revokeObjectURL(url);}}>Download</button></div><div className="spraoi-dashboard-chart-grid"><div className="spraoi-chart-card"><div className="spraoi-chart-card-title">Organisation</div><div className="spraoi-mini-kpis"><div><img src="/icons/club/team-shield.svg" alt=""/><span>Teams</span><strong>{ageGroups?.length||0}</strong></div><div><img src="/icons/club/people.svg" alt=""/><span>Coaches / staff</span><strong>{coaches?.length||0}</strong></div><div><img src="/icons/club/roles.svg" alt=""/><span>Access roles</span><strong>4</strong></div></div></div><div className="spraoi-chart-card"><div className="spraoi-chart-card-title">Team coverage</div><div className="spraoi-bar-chart"><div><div className="spraoi-bar-label"><span>Teams with coaching coverage</span><strong>{Math.min(ageGroups?.length||0,coaches?.length||0)} / {ageGroups?.length||0}</strong></div><div className="spraoi-bar-track"><div className="spraoi-bar-fill" style={{width:`${(ageGroups?.length||0)?Math.min(100,((Math.min(ageGroups.length,coaches?.length||0))/ageGroups.length)*100):0}%`,background:CLUB_RED}}/></div></div></div></div></div></section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <ClubCard>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 10 }}>Quick actions</div>
          {[
            ["Set up club details", "club-setup"],
            ["Create and manage teams", "club-teams"],
            ["Manage coaches & mentors", "club-coaches"],
            ["Review safeguarding & vetting", "club-compliance"],
            ["Review roles and permissions", "club-permissions"],
          ].map(([label, route]) => (
            <button key={route} onClick={() => onNav(route)} style={{
              width: "100%", padding: "11px 0", border: "none", borderTop: `1px solid ${P.line}`,
              background: "transparent", display: "flex", justifyContent: "space-between",
              cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: 700, color: P.ink,
            }}>
              <span>{label}</span><span style={{ color: CLUB_RED }}>›</span>
            </button>
          ))}
        </ClubCard>

        <ClubCard>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 10 }}>Active team context</div>
          <div style={{ padding: 14, borderRadius: 12, background: CLUB_SOFT, border: "1px solid #f4caca" }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: CLUB_RED, textTransform: "uppercase" }}>Currently selected</div>
            <div style={{ fontFamily: F.display, fontSize: 23, fontWeight: 800, color: P.ink, marginTop: 4 }}>{selectedTeam ? teamDisplayName(selectedTeam) : "No team selected"}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 6 }}>
              Coach, Academy, Cup, Connect and Plus use this same team selection.
            </div>
          </div>
        </ClubCard>
      </div>
    </ClubPage>
  );
}


function ClubSetupScreen({ club, userRole, onClubUpdated, onNav }) {
  const canEdit = ["super_admin", "admin", "club_admin"].includes(userRole?.role);
  const [name, setName] = useState(club?.name || "");
  const [logoUrl, setLogoUrl] = useState(club?.logo_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(club?.website_url || "");
  const [contactEmail, setContactEmail] = useState(club?.contact_email || "");
  const [primaryColor, setPrimaryColor] = useState(club?.primary_color || "#DC2626");
  const [secondaryColor, setSecondaryColor] = useState(club?.secondary_color || "#ffffff");
  const [contacts, setContacts] = useState([]);
  const [contactTitle, setContactTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmailValue, setContactEmailValue] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [permissionCoach, setPermissionCoach] = useState(null);
  const [permissionRows, setPermissionRows] = useState([]);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    setName(club?.name || "");
    setLogoUrl(club?.logo_url || "");
    setWebsiteUrl(club?.website_url || "");
    setContactEmail(club?.contact_email || "");
    setPrimaryColor(club?.primary_color || "#DC2626");
    setSecondaryColor(club?.secondary_color || "#ffffff");
  }, [club?.id]);

  useEffect(() => {
    loadContacts();
  }, [club?.id]);

  async function loadContacts() {
    if (!club?.id) return;
    const { data, error } = await supabase
      .from("club_contacts")
      .select("*")
      .eq("club_id", club.id)
      .order("sort_order")
      .order("created_at");
    if (error) {
      setContacts([]);
      setContactError(error.message);
    } else {
      setContacts(data || []);
      setContactError("");
    }
  }

  async function saveClub() {
    if (!canEdit || !club?.id || !name.trim()) return;
    setSaving(true);
    setMessage("");
    const payload = {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      contact_email: contactEmail.trim() || null,
      primary_color: primaryColor || "#DC2626",
      secondary_color: secondaryColor || "#ffffff",
    };
    const { data, error } = await supabase
      .from("clubs")
      .update(payload)
      .eq("id", club.id)
      .select("*")
      .single();

    if (error) {
      setMessage("Could not save club details: " + error.message);
    } else {
      setMessage("Club details saved.");
      onClubUpdated?.(data);
    }
    setSaving(false);
  }

  async function addContact() {
    if (!canEdit || !club?.id || !contactTitle.trim() || !contactName.trim()) return;
    setContactError("");
    const { error } = await supabase.from("club_contacts").insert({
      club_id: club.id,
      title: contactTitle.trim(),
      name: contactName.trim(),
      email: contactEmailValue.trim() || null,
      phone: contactPhone.trim() || null,
      sort_order: contacts.length,
    });
    if (error) {
      setContactError(error.message);
      return;
    }
    setContactTitle("");
    setContactName("");
    setContactEmailValue("");
    setContactPhone("");
    await loadContacts();
  }

  async function removeContact(contact) {
    if (!canEdit || !contact?.id) return;
    if (!window.confirm(`Remove ${contact.name} from club leadership contacts?`)) return;
    const { error } = await supabase.from("club_contacts").delete().eq("id", contact.id);
    if (error) setContactError(error.message);
    else await loadContacts();
  }

  return (
    <ClubPage
      title="Setup"
      sub="Club identity, contact details and leadership"
      actions={canEdit ? <Btn label={saving ? "Saving…" : "Save Club Details"} onClick={saveClub} /> : null}
    >
      {!canEdit && (
        <div style={{ marginBottom: 14, padding: 11, borderRadius: 10, background: "#fff8e1", border: "1px solid #f4d58d", fontFamily: F.body, fontSize: 10, color: "#7a4b00" }}>
          Club Setup is read-only for your role. An Admin or Super Admin can change these details.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) minmax(280px,.8fr)", gap: 15, marginBottom: 16 }} className="club-setup-grid">
        <ClubCard>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 14 }}>Club details</div>

          <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Club name</label>
          <input disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} placeholder="Club name" style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 11 }} />

          <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Club logo / crest URL</label>
          <input disabled={!canEdit} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 11 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Contact email</label>
              <input disabled={!canEdit} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="club@example.ie" style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 11 }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Website</label>
              <input disabled={!canEdit} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 11 }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Primary colour</label>
              <input disabled={!canEdit} type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: "100%", height: 42, padding: 4, borderRadius: 9, border: `1px solid ${P.line}`, background: "#fff" }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Secondary colour</label>
              <input disabled={!canEdit} type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ width: "100%", height: 42, padding: 4, borderRadius: 9, border: `1px solid ${P.line}`, background: "#fff" }} />
            </div>
          </div>

          {message && <div style={{ marginTop: 12, fontFamily: F.body, fontSize: 10, color: message === "Club details saved." ? "#16803c" : "#b42318" }}>{message}</div>}
        </ClubCard>

        <ClubCard>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 14 }}>Club identity preview</div>
          <div style={{ minHeight: 220, borderRadius: 16, padding: 20, background: `linear-gradient(145deg, ${primaryColor}18, ${secondaryColor})`, border: `1px solid ${primaryColor}33`, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ width: 100, height: 100, margin: "0 auto 14px", borderRadius: 22, background: "#fff", display: "grid", placeItems: "center", boxShadow: Sh.card, overflow: "hidden" }}>
                {logoUrl ? <img src={logoUrl} alt="" style={{ width: 82, height: 82, objectFit: "contain" }} /> : <img src="/spraoi-club-icon.png" alt="" style={{ width: 72, height: 72, objectFit: "contain" }} />}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: P.ink }}>{name || "Your Club"}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 5 }}>{contactEmail || websiteUrl || "Club details preview"}</div>
            </div>
          </div>
        </ClubCard>
      </div>

      <ClubCard style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 16,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              Legal & Policies
            </div>

            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                color: P.muted,
                marginTop: 4,
              }}
            >
              Terms, Privacy, Parent / Guardian Terms, Acceptable Use and Cookie Policy.
            </div>

            <div
              style={{
                fontFamily: F.body,
                fontSize: 9,
                color: P.muted,
                marginTop: 5,
              }}
            >
              Current version: {LEGAL_POLICY_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
            </div>
          </div>

          <Btn
            label="Open Legal & Policies"
            onClick={() => onNav?.("club-legal")}
           
          />
        </div>
      </ClubCard>

      <ClubCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Club leadership</div>
            <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 3 }}>Add the key people parents and coaches may need to contact. Titles are flexible.</div>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div style={{ padding: 12, borderRadius: 10, background: P.soft, fontFamily: F.body, fontSize: 10, color: P.muted }}>No leadership contacts added yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, marginBottom: 14 }}>
            {contacts.map((contact) => (
              <div key={contact.id} style={{ border: `1px solid ${P.line}`, borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: CLUB_RED, textTransform: "uppercase", letterSpacing: ".05em" }}>{contact.title}</div>
                <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.ink, marginTop: 4 }}>{contact.name}</div>
                {contact.email && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 5 }}>{contact.email}</div>}
                {contact.phone && <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 2 }}>{contact.phone}</div>}
                {canEdit && <button onClick={() => removeContact(contact)} style={{ marginTop: 9, border: "none", background: "transparent", color: P.coral, padding: 0, cursor: "pointer", fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>Remove</button>}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }} className="club-contact-form">
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, marginBottom: 4 }}>Role / title</label>
              <input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="e.g. Juvenile Chair" style={{ width: "100%", boxSizing: "border-box", padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, marginBottom: 4 }}>Name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" style={{ width: "100%", boxSizing: "border-box", padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, marginBottom: 4 }}>Email</label>
              <input value={contactEmailValue} onChange={(e) => setContactEmailValue(e.target.value)} placeholder="Email" style={{ width: "100%", boxSizing: "border-box", padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, marginBottom: 4 }}>Phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" style={{ width: "100%", boxSizing: "border-box", padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            </div>
            <Btn label="Add Contact" onClick={addContact} />
          </div>
        )}

        {contactError && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#fff1f1", color: "#b42318", fontFamily: F.body, fontSize: 10 }}>
            {contactError}
          </div>
        )}
      </ClubCard>

      {permissionCoach && isAdmin && (
        <div
          onClick={() => {
            if (!permissionSaving) {
              setPermissionCoach(null);
              setPermissionRows([]);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10030,
            background: "rgba(15,23,42,.52)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(860px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 48px)",
              overflow: "auto",
              background: P.white,
              borderRadius: 16,
              padding: 22,
              boxShadow: Sh.lift,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 18,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              Permissions · {permissionCoach.name || "Coach"}
            </div>

            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                color: P.muted,
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              Permissions are stored separately for each team assignment.
            </div>

            {permissionRows.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: P.soft,
                  color: P.muted,
                  fontFamily: F.body,
                  fontSize: 10,
                }}
              >
                This person has no active team assignment.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {permissionRows.map((row) => {
                  const normalizedRole = String(row.role || "").toLowerCase();
                  const fixedFull =
                    normalizedRole === "lead_coach" ||
                    normalizedRole === "club_admin";

                  return (
                    <div
                      key={row.id}
                      style={{
                        border: `1px solid ${P.line}`,
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: F.body,
                              fontSize: 12,
                              fontWeight: 800,
                              color: P.ink,
                            }}
                          >
                            {teamDisplayName(row.team)}
                          </div>

                          <div
                            style={{
                              fontFamily: F.body,
                              fontSize: 9,
                              color: P.muted,
                              marginTop: 2,
                            }}
                          >
                            {displayRoleLabel(row.role)}
                          </div>
                        </div>

                        {fixedFull && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: "#ecfdf3",
                              color: "#16803a",
                              fontFamily: F.body,
                              fontSize: 8,
                              fontWeight: 800,
                            }}
                          >
                            ROLE DEFAULT
                          </span>
                        )}
                      </div>

                      <div
                        className="club-permission-editor-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2,minmax(0,1fr))",
                          gap: 10,
                        }}
                      >
                        <label
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            background: P.soft,
                            fontFamily: F.body,
                            fontSize: 10,
                            color: P.ink,
                          }}
                        >
                          <div style={{ fontWeight: 800, marginBottom: 7 }}>
                            Coach
                          </div>
                          <select
                            value={row.coach_write ? "write" : "read"}
                            disabled={fixedFull}
                            onChange={(e) =>
                              updatePermissionRow(row.id, {
                                coach_write: e.target.value === "write",
                              })
                            }
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 8,
                              border: `1px solid ${P.line}`,
                            }}
                          >
                            <option value="read">Read only</option>
                            <option value="write">Can edit</option>
                          </select>
                        </label>

                        <label
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            background: P.soft,
                            fontFamily: F.body,
                            fontSize: 10,
                            color: P.ink,
                          }}
                        >
                          <div style={{ fontWeight: 800, marginBottom: 7 }}>
                            Academy
                          </div>
                          <select
                            value={
                              row.academy_publish
                                ? "publish"
                                : row.academy_write
                                  ? "write"
                                  : "read"
                            }
                            disabled={fixedFull}
                            onChange={(e) => {
                              const value = e.target.value;
                              updatePermissionRow(row.id, {
                                academy_write:
                                  value === "write" ||
                                  value === "publish",
                                academy_publish:
                                  value === "publish",
                              });
                            }}
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 8,
                              border: `1px solid ${P.line}`,
                            }}
                          >
                            <option value="read">Read only</option>
                            <option value="write">Can edit</option>
                            <option value="publish">Can publish</option>
                          </select>
                        </label>

                        <label
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            background: P.soft,
                            fontFamily: F.body,
                            fontSize: 10,
                            color: P.ink,
                          }}
                        >
                          <div style={{ fontWeight: 800, marginBottom: 7 }}>
                            Connect
                          </div>
                          <select
                            value={accessLevel(row, "connect")}
                            disabled={
                              fixedFull ||
                              normalizedRole === "team_admin"
                            }
                            onChange={(e) =>
                              updateAccessLevel(
                                row.id,
                                "connect",
                                e.target.value
                              )
                            }
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 8,
                              border: `1px solid ${P.line}`,
                            }}
                          >
                            <option value="none">No access</option>
                            <option value="read">Read only</option>
                            <option value="write">Read & write</option>
                          </select>
                        </label>

                        <label
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            background: P.soft,
                            fontFamily: F.body,
                            fontSize: 10,
                            color: P.ink,
                          }}
                        >
                          <div style={{ fontWeight: 800, marginBottom: 7 }}>
                            Cup
                          </div>
                          <select
                            value={accessLevel(row, "cup")}
                            disabled={
                              normalizedRole === "team_admin" ||
                              normalizedRole === "club_admin"
                            }
                            onChange={(e) =>
                              updateAccessLevel(
                                row.id,
                                "cup",
                                e.target.value
                              )
                            }
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 8,
                              border: `1px solid ${P.line}`,
                            }}
                          >
                            <option value="none">No access</option>
                            <option value="read">Read only</option>
                            <option value="write">Read & write</option>
                          </select>
                        </label>

                        <label
                          style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: 10,
                            borderRadius: 9,
                            background: P.soft,
                            fontFamily: F.body,
                            fontSize: 10,
                            color: P.ink,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(row.attendance_manage)}
                            disabled={[
                              "lead_coach",
                              "team_admin",
                              "coach_mentor",
                              "coach",
                              "mentor",
                            ].includes(normalizedRole)}
                            onChange={(e) =>
                              updatePermissionRow(row.id, {
                                attendance_manage: e.target.checked,
                              })
                            }
                          />
                          <span>
                            <strong>Attendance</strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: 2,
                                fontSize: 8,
                                color: P.muted,
                              }}
                            >
                              Team Admin and Coach/Mentor receive this by default.
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 18,
              }}
            >
              <Btn
                label={
                  permissionSaving
                    ? "Saving..."
                    : "Save Permissions"
                }
                variant="primary"
                onClick={savePermissionEditor}
              />
              <Btn
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  if (!permissionSaving) {
                    setPermissionCoach(null);
                    setPermissionRows([]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:900px){.club-setup-grid{grid-template-columns:1fr!important}.club-contact-form{grid-template-columns:1fr 1fr!important}}
        @media(max-width:580px){.club-contact-form{grid-template-columns:1fr!important}}
      `}</style>
    </ClubPage>
  );
}

function ClubLegalScreen({ club, currentUserId, onNav }) {
  const [activeKey, setActiveKey] = useState("terms");
  const [acceptedRows, setAcceptedRows] = useState([]);
  const [loadingAcceptances, setLoadingAcceptances] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState("");

  const activePolicy =
    LEGAL_POLICIES.find((policy) => policy.key === activeKey) ||
    LEGAL_POLICIES[0];

  async function loadMyAcceptances() {
    if (!currentUserId) {
      setAcceptedRows([]);
      setLoadingAcceptances(false);
      return;
    }

    setLoadingAcceptances(true);

    const { data, error } = await supabase
      .from("spraoi_policy_acceptances")
      .select("id,policy_key,policy_version,accepted_at")
      .eq("user_id", currentUserId)
      .order("accepted_at", { ascending: false });

    if (error) {
      console.warn(
        "Could not load policy acceptances",
        error.message
      );
      setAcceptedRows([]);
    } else {
      setAcceptedRows(data || []);
    }

    setLoadingAcceptances(false);
  }

  useEffect(() => {
    loadMyAcceptances();
  }, [currentUserId]);

  const currentAcceptance = acceptedRows.find(
    (row) =>
      row.policy_key === activePolicy.key &&
      row.policy_version === activePolicy.version
  );

  async function acceptCurrentPolicy() {
    if (!currentUserId) {
      setMessage(
        "You must be signed in to record an acceptance."
      );
      return;
    }

    if (currentAcceptance) {
      setMessage(
        `${activePolicy.title} ${activePolicy.version} is already accepted.`
      );
      return;
    }

    setAccepting(true);
    setMessage("");

    const { error } = await supabase
      .from("spraoi_policy_acceptances")
      .insert({
        club_id: club?.id || null,
        user_id: currentUserId,
        policy_key: activePolicy.key,
        policy_version: activePolicy.version,
        actor_type: "adult_user",
        parent_guardian_confirmation: false,
      });

    setAccepting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      `${activePolicy.title} ${activePolicy.version} accepted.`
    );

    await loadMyAcceptances();
  }

  return (
    <ClubPage
      title="Legal & Policies"
      sub={`Spraoi Sports private beta · ${LEGAL_POLICY_VERSION}`}
      actions={
        <Btn
          label="Back to Club Setup"
          variant="ghost"
          onClick={() => onNav?.("club-setup")}
        />
      }
    >
      <div
        style={{
          marginBottom: 14,
          padding: 11,
          borderRadius: 10,
          background: "#fff8e1",
          border: "1px solid #f4d58d",
          fontFamily: F.body,
          fontSize: 10,
          lineHeight: 1.55,
          color: "#7a4b00",
        }}
      >
        <b>Private beta:</b> Spraoi Sports does not publish a personal
        email address or home address. A permanent in-platform contact
        route will be added before broader public release.
      </div>

      <div
        className="club-legal-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "230px minmax(0,1fr)",
          gap: 16,
        }}
      >
        <ClubCard style={{ alignSelf: "start" }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 15,
              fontWeight: 800,
              color: P.ink,
              marginBottom: 10,
            }}
          >
            Policies
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {LEGAL_POLICIES.map((policy) => {
              const accepted = acceptedRows.some(
                (row) =>
                  row.policy_key === policy.key &&
                  row.policy_version === policy.version
              );

              return (
                <button
                  key={policy.key}
                  type="button"
                  onClick={() => {
                    setActiveKey(policy.key);
                    setMessage("");
                  }}
                  style={{
                    textAlign: "left",
                    padding: "10px 11px",
                    borderRadius: 9,
                    border: `1px solid ${
                      activeKey === policy.key
                        ? CLUB_RED
                        : P.line
                    }`,
                    background:
                      activeKey === policy.key
                        ? "#fff4f4"
                        : "#fff",
                    color:
                      activeKey === policy.key
                        ? CLUB_RED
                        : P.ink,
                    cursor: "pointer",
                    fontFamily: F.body,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{policy.shortTitle}</span>

                  {accepted && (
                    <span
                      title="Accepted"
                      style={{
                        color: "#16803c",
                        fontSize: 12,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ClubCard>

        <ClubCard>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 21,
                  fontWeight: 800,
                  color: P.ink,
                }}
              >
                {activePolicy.title}
              </div>

              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 9.5,
                  color: P.muted,
                  marginTop: 4,
                }}
              >
                Version {activePolicy.version} · Effective{" "}
                {activePolicy.effectiveDate}
              </div>

              {currentAcceptance && (
                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 9.5,
                    color: "#16803c",
                    marginTop: 5,
                    fontWeight: 800,
                  }}
                >
                  ✓ Accepted{" "}
                  {new Date(
                    currentAcceptance.accepted_at
                  ).toLocaleString("en-IE")}
                </div>
              )}
            </div>

            {!currentAcceptance && (
              <Btn
                label={
                  accepting
                    ? "Saving…"
                    : `Accept ${activePolicy.shortTitle}`
                }
                onClick={acceptCurrentPolicy}
               
              />
            )}
          </div>

          <div style={{ display: "grid", gap: 15 }}>
            {activePolicy.sections.map((section) => (
              <section key={section.heading}>
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: 14,
                    fontWeight: 800,
                    color: P.ink,
                    marginBottom: 6,
                  }}
                >
                  {section.heading}
                </div>

                {section.body.map((paragraph, index) => (
                  <p
                    key={index}
                    style={{
                      margin: index ? "7px 0 0" : 0,
                      fontFamily: F.body,
                      fontSize: 10.5,
                      lineHeight: 1.65,
                      color: "#344054",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {loadingAcceptances && (
            <div
              style={{
                marginTop: 14,
                fontFamily: F.body,
                fontSize: 10,
                color: P.muted,
              }}
            >
              Checking your acceptance record…
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: 14,
                padding: 10,
                borderRadius: 9,
                background:
                  message.includes("accepted") ||
                  message.includes("already")
                    ? "#ecfdf3"
                    : "#fff1f1",
                color:
                  message.includes("accepted") ||
                  message.includes("already")
                    ? "#16803c"
                    : "#b42318",
                fontFamily: F.body,
                fontSize: 10,
              }}
            >
              {message}
            </div>
          )}
        </ClubCard>
      </div>

      <style>{`
        @media(max-width:820px) {
          .club-legal-layout {
            grid-template-columns:1fr!important;
          }
        }
      `}</style>
    </ClubPage>
  );
}


function ClubTeamsCoreScreen({ club, ageGroups, coaches, selectedTeam, onSelectTeam, onReloadTeams, userRole, tabsNode = null }) {
  const [staff, setStaff] = useState([]);
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [showRollover, setShowRollover] = useState(false);
  const [nextAgeLabel, setNextAgeLabel] = useState("");
  const [nextSeason, setNextSeason] = useState("");
  const [rolling, setRolling] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamLabel, setNewTeamLabel] = useState("");
  const [newTeamGender, setNewTeamGender] = useState("boys");
  const [newTeamSport, setNewTeamSport] = useState("both");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const canManageTeams = ["super_admin", "admin", "club_admin"].includes(userRole?.role);

  const roles = [
    { value: "lead_coach", label: "Lead Coach" },
    { value: "team_admin", label: "Team Admin" },
    { value: "coach", label: "Coach" },
    { value: "mentor", label: "Mentor" },
  ];

  async function loadStaff() {
    if (!club?.id) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("team_staff")
      .select("*, coach:coaches(id,name,email,user_id), team:age_groups(id,label,gender)")
      .eq("club_id", club.id)
      .order("created_at");
    if (loadError) setError(loadError.message);
    else { setStaff(data || []); setError(""); }
    setLoading(false);
  }

  async function loadSeasonHistory() {
    if (!selectedTeam?.id) { setSeasonHistory([]); return; }
    const { data, error: historyError } = await supabase
      .from("team_seasons")
      .select("*")
      .eq("team_id", selectedTeam.id)
      .order("created_at", { ascending: false });
    if (historyError) {
      // Migration may not have been run yet; keep the Teams screen usable.
      if (!String(historyError.message || "").toLowerCase().includes("team_seasons")) {
        console.warn("Unable to load team season history:", historyError.message);
      }
      setSeasonHistory([]);
    } else {
      setSeasonHistory(data || []);
    }
  }

  useEffect(() => { loadStaff(); }, [club?.id]);
  useEffect(() => { loadSeasonHistory(); }, [selectedTeam?.id]);

  async function setRole(coach, role) {
    if (!canManageTeams || !selectedTeam?.id || !club?.id) return;
    setSavingId(coach.id);
    setError("");
    const existing = staff.find((row) => row.age_group_id === selectedTeam.id && row.coach_id === coach.id);

    if (!role) {
      if (existing) {
        const { error: deleteError } = await supabase.from("team_staff").delete().eq("id", existing.id);
        if (deleteError) setError(deleteError.message);
        else setStaff((rows) => rows.filter((row) => row.id !== existing.id));
      }
      setSavingId("");
      return;
    }

    // Only one Lead Coach per team in this first RBAC version.
    if (role === "lead_coach") {
      const otherLead = staff.find((row) =>
        row.age_group_id === selectedTeam.id &&
        row.role === "lead_coach" &&
        row.coach_id !== coach.id
      );
      if (otherLead) {
        const confirmed = window.confirm(
          `${otherLead.coach?.name || "Another coach"} is currently Lead Coach. Replace them as Lead Coach?`
        );
        if (!confirmed) { setSavingId(""); return; }
        const { error: demoteError } = await supabase
          .from("team_staff")
          .update({ role: "coach_mentor", updated_at: new Date().toISOString() })
          .eq("id", otherLead.id);
        if (demoteError) {
          setError(demoteError.message);
          setSavingId("");
          return;
        }
        setStaff((rows) => rows.map((row) =>
          row.id === otherLead.id ? { ...row, role: "coach_mentor" } : row
        ));
      }
    }

    const payload = {
      club_id: club.id,
      age_group_id: selectedTeam.id,
      coach_id: coach.id,
      user_id: coach.user_id || null,
      role,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error: updateError } = await supabase
        .from("team_staff").update(payload).eq("id", existing.id)
        .select("*, coach:coaches(id,name,email,user_id)").single();
      if (updateError) setError(updateError.message);
      else setStaff((rows) => rows.map((row) => row.id === existing.id ? data : row));
    } else {
      const { data, error: insertError } = await supabase
        .from("team_staff").insert(payload)
        .select("*, coach:coaches(id,name,email,user_id)").single();
      if (insertError) setError(insertError.message);
      else setStaff((rows) => [...rows, data]);
    }
    setSavingId("");
  }

  function suggestNextAge(label = "") {
    const match = String(label).match(/U\s*(\d+)/i);
    if (!match) return label;
    return `U${Number(match[1]) + 1}`;
  }

  function openRollover() {
    if (!selectedTeam) return;
    setNextAgeLabel(suggestNextAge(selectedTeam.label || ""));
    const year = new Date().getFullYear();
    setNextSeason(`${year + 1}-${String(year + 2).slice(-2)}`);
    setShowRollover(true);
  }

  async function rolloverSeason() {
    if (!selectedTeam?.id || !nextAgeLabel.trim() || !nextSeason.trim() || rolling) return;
    setRolling(true);
    setError("");

    const snapshot = {
      team_id: selectedTeam.id,
      club_id: club.id,
      season_label: nextSeason.trim(),
      age_label: nextAgeLabel.trim(),
      gender: selectedTeam.gender || null,
      cohort_year: selectedTeam.cohort_year || null,
    };

    const { error: historyError } = await supabase
      .from("team_seasons")
      .upsert(snapshot, { onConflict: "team_id,season_label" });

    if (historyError) {
      setError(`Season rollover needs the team_seasons migration: ${historyError.message}`);
      setRolling(false);
      return;
    }

    const { data: updatedTeam, error: teamError } = await supabase
      .from("age_groups")
      .update({
        label: nextAgeLabel.trim(),
        active: true,
      })
      .eq("id", selectedTeam.id)
      .select("*")
      .single();

    if (teamError) {
      setError(teamError.message);
      setRolling(false);
      return;
    }

    // Same team ID; staff assignments remain untouched.
    onSelectTeam(updatedTeam);
    await onReloadTeams?.();
    await loadSeasonHistory();
    setShowRollover(false);
    setRolling(false);
  }

  const selectedStaff = staff.filter((row) => row.age_group_id === selectedTeam?.id);
  const leadCoach = selectedStaff.find((row) => row.role === "lead_coach");
  async function createTeam() {
    if (!canManageTeams || !club?.id || !newTeamLabel.trim()) return;
    setCreatingTeam(true);
    setError("");

    const payload = {
      club_id: club.id,
      label: newTeamLabel.trim(),
      gender: newTeamGender,
      sport: newTeamSport,
    };
    const { data, error: createError } = await supabase
      .from("age_groups")
      .insert(payload)
      .select("*")
      .single();

    if (createError) {
      setError(createError.message);
      setCreatingTeam(false);
      return;
    }

    setNewTeamLabel("");
    setNewTeamGender("boys");
    setNewTeamSport("both");
    setShowAddTeam(false);
    await onReloadTeams?.();
    if (data) onSelectTeam?.(data);
    setCreatingTeam(false);
  }

  const selectedDisplay = selectedTeam
    ? teamDisplayName(selectedTeam)
    : "";

  return (
    <ClubPage
      title="Teams"
      sub="Create club teams, assign Lead Coaches and carry the same team forward each season"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          {canManageTeams && <Btn label="Add Team" onClick={() => setShowAddTeam(true)} />}
          {selectedTeam && canManageTeams && <Btn label="Advance Season" onClick={openRollover} variant="ghost" />}
        </div>
      }
    >
      {tabsNode}
      {error && <div style={{ marginBottom: 12, padding: 11, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontFamily: F.body, fontSize: 11 }}>{error}</div>}

      <div className="club-team-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 15 }}>
        <ClubCard style={{ padding: 14 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Teams</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: CLUB_RED, marginTop: 4 }}>{ageGroups?.length || 0}</div>
        </ClubCard>
        <ClubCard style={{ padding: 14 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Active Team</div>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginTop: 6 }}>{selectedDisplay || "None selected"}</div>
        </ClubCard>
        <ClubCard style={{ padding: 14 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Lead Coach</div>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginTop: 6 }}>{leadCoach?.coach?.name || "Not assigned"}</div>
        </ClubCard>
        <ClubCard style={{ padding: 14 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Staff</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: CLUB_RED, marginTop: 4 }}>{selectedStaff.length}</div>
        </ClubCard>
      </div>

      <div className="club-teams-layout" style={{ display: "grid", gridTemplateColumns: "minmax(240px,.72fr) minmax(430px,1.5fr)", gap: 15 }}>
        <ClubCard>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Club teams</div>
          <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginBottom: 11 }}>Click a team to make it the active team across Spraoi.</div>
          {(ageGroups || []).map((team) => {
            const active = selectedTeam?.id === team.id;
            const teamStaff = staff.filter((row) => row.age_group_id === team.id);
            const lead = teamStaff.find((row) => row.role === "lead_coach");
            return (
              <button key={team.id} onClick={() => onSelectTeam(team)} style={{
                width: "100%", padding: "12px", marginBottom: 7, borderRadius: 12,
                border: `1px solid ${active ? CLUB_RED : P.line}`,
                background: active ? CLUB_SOFT : P.white, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: active ? "0 5px 16px rgba(211,47,47,.10)" : "none",
              }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: active ? "#fff" : P.soft, color: active ? CLUB_RED : P.muted, fontWeight: 800 }}>◆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 800, color: P.ink }}>{teamDisplayName(team)}</div>
                  <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 3 }}>
                    {lead?.coach?.name ? `Lead: ${lead.coach.name} · ` : ""}{teamStaff.length} staff
                  </div>
                </div>
                {active && <span style={{ color: CLUB_RED, fontWeight: 800 }}>✓</span>}
              </button>
            );
          })}
        </ClubCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <ClubCard>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink }}>
                  {selectedTeam ? selectedDisplay : "Select a team"}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4 }}>
                  Persistent team ID · staff stay attached when the age group changes.
                </div>
              </div>
              {selectedTeam && <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: selectedTeam.active === false ? "#b42318" : "#16803c", background: selectedTeam.active === false ? "#fff1f2" : "#ecfdf3", padding: "5px 8px", borderRadius: 999 }}>{selectedTeam.active === false ? "Inactive" : "Active"}</span>}
            </div>

            {!selectedTeam ? (
              <div style={{ padding: 16, borderRadius: 12, background: P.soft, color: P.muted, fontFamily: F.body, fontSize: 11 }}>Choose a team from the left.</div>
            ) : (
              <>
                <div className="club-team-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9, marginBottom: 14 }}>
                  {[
                    ["Current age group", teamDisplayName(selectedTeam, "—")],
                    ["Cohort year", selectedTeam.cohort_year || "Not set"],
                    ["Code", selectedTeam.gender === "girls" ? "Camogie / Football" : selectedTeam.gender === "boys" ? "Hurling / Football" : "Club team"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 10, borderRadius: 10, background: P.soft }}>
                      <div style={{ fontFamily: F.body, fontSize: 8, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 800, color: P.ink, marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Staff & access</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, margin: "4px 0 10px" }}>
                  Lead Coach can edit Coach and Academy plans. Coach / Mentor is read-only. Club Admin has full club control.
                </div>

                {loading ? (
                  <div style={{ padding: 16, color: P.muted, fontFamily: F.body, fontSize: 11 }}>Loading team access…</div>
                ) : (coaches || []).length === 0 ? (
                  <div style={{ padding: 16, color: P.muted, fontFamily: F.body, fontSize: 11, background: P.soft, borderRadius: 10 }}>Add coaches under Members first.</div>
                ) : (
                  (coaches || []).map((coach) => {
                    const assignment = selectedStaff.find((row) => row.coach_id === coach.id);
                    return (
                      <div key={coach.id} className="club-staff-row" style={{
                        display: "grid", gridTemplateColumns: "minmax(170px,1fr) minmax(180px,.8fr)",
                        gap: 12, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${P.line}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: CLUB_SOFT, color: CLUB_RED, display: "grid", placeItems: "center", fontFamily: F.display, fontWeight: 800 }}>{coach.name?.[0] || "?"}</div>
                          <div>
                            <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 800, color: P.ink }}>{coach.name}</div>
                            <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 2 }}>{coach.email || "No login email"}</div>
                          </div>
                        </div>
                        <select value={assignment?.role || ""} disabled={savingId === coach.id} onChange={(e) => setRole(coach, e.target.value)} style={{
                          width: "100%", padding: "9px 10px", borderRadius: 9, border: `1px solid ${P.line}`,
                          background: P.white, fontFamily: F.body, fontSize: 11,
                        }}>
                          <option value="">No access</option>
                          {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </ClubCard>

          {selectedTeam && (
            <ClubCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Season history</div>
                  <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 3 }}>Rollover changes the age-group label but keeps this team’s ID, staff and history.</div>
                </div>
                <button onClick={openRollover} style={{ border: `1px solid ${CLUB_RED}`, color: CLUB_RED, background: "#fff", borderRadius: 9, padding: "7px 10px", cursor: "pointer", fontFamily: F.body, fontSize: 10, fontWeight: 800 }}>Rollover</button>
              </div>

              {seasonHistory.length === 0 ? (
                <div style={{ marginTop: 11, padding: 11, borderRadius: 10, background: P.soft, fontFamily: F.body, fontSize: 10, color: P.muted }}>No completed rollovers recorded yet.</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {seasonHistory.map((season) => (
                    <div key={season.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: `1px solid ${P.line}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 800, color: P.ink }}>{season.season_label}</span>
                      <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>{season.age_label} {season.gender === "girls" ? "Girls" : season.gender === "boys" ? "Boys" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </ClubCard>
          )}
        </div>
      </div>

      {showAddTeam && canManageTeams && (
        <div onClick={() => !creatingTeam && setShowAddTeam(false)} style={{ position: "fixed", inset: 0, zIndex: 15000, background: "rgba(16,36,62,.55)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "#fff", borderRadius: 18, boxShadow: Sh.lift, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", background: CLUB_SOFT, borderBottom: `1px solid ${P.line}` }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink }}>Add Team</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4 }}>Create the team first; then assign its Lead Coach.</div>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Team / age-group label</label>
              <input value={newTeamLabel} onChange={(e) => setNewTeamLabel(e.target.value)} placeholder="e.g. U12 / 2014" style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 12 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Group</label>
                  <select value={newTeamGender} onChange={(e) => setNewTeamGender(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 9, border: `1px solid ${P.line}` }}>
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Codes</label>
                  <select value={newTeamSport} onChange={(e) => setNewTeamSport(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 9, border: `1px solid ${P.line}` }}>
                    <option value="both">Football + Hurling/Camogie</option>
                    <option value="football">Football only</option>
                    <option value="hurling">Hurling/Camogie only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Btn label="Cancel" variant="ghost" onClick={() => setShowAddTeam(false)} />
                <Btn label={creatingTeam ? "Creating…" : "Create Team"} onClick={createTeam} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showRollover && (
        <div onClick={() => !rolling && setShowRollover(false)} style={{ position: "fixed", inset: 0, zIndex: 15000, background: "rgba(16,36,62,.55)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "#fff", borderRadius: 18, boxShadow: Sh.lift, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", background: CLUB_SOFT, borderBottom: `1px solid ${P.line}` }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink }}>Advance Season</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4 }}>Keep the same team ID, Lead Coach and coaching assignments while updating the age label for the new season. A season-history snapshot is retained.</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4 }}>{selectedDisplay} keeps the same team ID and staff assignments.</div>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>New season</label>
              <input value={nextSeason} onChange={(e) => setNextSeason(e.target.value)} placeholder="2027-28" style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 12 }} />
              <label style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink, marginBottom: 5 }}>New age group</label>
              <input value={nextAgeLabel} onChange={(e) => setNextAgeLabel(e.target.value)} placeholder="U12" style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 9, border: `1px solid ${P.line}`, marginBottom: 12 }} />
              <div style={{ padding: 11, borderRadius: 10, background: "#fff8e1", border: "1px solid #f4d58d", fontFamily: F.body, fontSize: 10, color: "#7a4b00", lineHeight: 1.5 }}>
                This changes the current display age only. Coach assignments, player links, parent links and historical plans remain attached to the same team ID.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button disabled={rolling} onClick={() => setShowRollover(false)} style={{ border: `1px solid ${P.line}`, background: "#fff", borderRadius: 9, padding: "9px 12px", cursor: "pointer", fontFamily: F.body, fontWeight: 800 }}>Cancel</button>
                <button disabled={rolling || !nextSeason.trim() || !nextAgeLabel.trim()} onClick={rolloverSeason} style={{ border: "none", background: CLUB_RED, color: "#fff", borderRadius: 9, padding: "9px 13px", cursor: "pointer", fontFamily: F.body, fontWeight: 800 }}>{rolling ? "Rolling over…" : "Confirm Rollover"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:1000px){.club-team-summary-grid{grid-template-columns:repeat(2,1fr)!important}.club-teams-layout{grid-template-columns:1fr!important}}
        @media(max-width:620px){.club-team-summary-grid{grid-template-columns:1fr!important}.club-staff-row,.club-team-detail-grid{grid-template-columns:1fr!important}}
      `}</style>
    </ClubPage>
  );
}

function clubImportHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clubImportValue(row, names) {
  const wanted = names.map(clubImportHeader);

  for (const [key, value] of Object.entries(row || {})) {
    if (wanted.includes(clubImportHeader(key))) {
      return String(value ?? "").trim();
    }
  }

  return "";
}

async function readClubImportFile(file) {
  if (!file) return [];

  const lower = String(file.name || "").toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });
  }

  const raw = await file.text();
  const workbook = XLSX.read(raw, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}


function ClubPlayersParentsPanel({
  club,
  ageGroups = [],
  selectedTeam,
}) {
  const [players, setPlayers] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [links, setLinks] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!club?.id) return;

    setLoading(true);

    const [playerResult, guardianResult, inviteResult] =
      await Promise.all([
        supabase
          .from("journey_players")
          .select("id,name,age_group_id")
          .eq("club_id", club.id)
          .order("name"),

        supabase
          .from("club_guardians")
          .select("id,name,email,phone,user_id")
          .eq("club_id", club.id)
          .order("name"),

        supabase
          .from("spraoi_invitations")
          .select("id,email,status,invite_type,created_at")
          .eq("club_id", club.id)
          .eq("invite_type", "parent_guardian")
          .order("created_at", { ascending: false }),
      ]);

    if (playerResult.error) setMessage(playerResult.error.message);
    if (guardianResult.error) setMessage(guardianResult.error.message);

    const guardianRows = guardianResult.data || [];

    setPlayers(playerResult.data || []);
    setGuardians(guardianRows);
    setInvitations(inviteResult.data || []);

    if (guardianRows.length) {
      const { data, error } = await supabase
        .from("club_player_guardians")
        .select("player_id,guardian_id,is_primary")
        .in(
          "guardian_id",
          guardianRows.map((guardian) => guardian.id)
        );

      if (error) setMessage(error.message);

      setLinks(data || []);
    } else {
      setLinks([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [club?.id]);

  const visiblePlayers = selectedTeam?.id
    ? players.filter(
        (player) =>
          String(player.age_group_id) ===
          String(selectedTeam.id)
      )
    : players;

  function teamLabel(player) {
    const team = ageGroups.find(
      (item) =>
        String(item.id) === String(player.age_group_id)
    );

    return team
      ? teamDisplayName(team)
      : "—";
  }

  function parentsForPlayer(playerId) {
    const guardianIds = links
      .filter(
        (link) =>
          String(link.player_id) === String(playerId)
      )
      .map((link) => String(link.guardian_id));

    return guardians.filter((guardian) =>
      guardianIds.includes(String(guardian.id))
    );
  }

  function academyStatus(guardian) {
    if (guardian?.user_id) return "Active";

    const invite = invitations.find(
      (row) =>
        String(row.email || "").toLowerCase() ===
        String(guardian?.email || "").toLowerCase()
    );

    if (!invite) return "Not invited";
    if (invite.status === "accepted") return "Active";
    if (invite.status === "pending") return "Pending";

    return invite.status || "Not invited";
  }

  async function chooseFile(file) {
    if (!file) return;

    setMessage("");
    setFileName(file.name);

    try {
      const rows = await readClubImportFile(file);

      const mapped = rows
        .map((row, index) => {
          const playerName = clubImportValue(row, [
            "player name",
            "child name",
            "player",
            "child",
            "name",
          ]);

          const teamName = clubImportValue(row, [
            "team",
            "team name",
            "age group",
            "squad",
          ]);

          const parentName = clubImportValue(row, [
            "parent name",
            "guardian name",
            "parent",
            "guardian",
          ]);

          const parentEmail = clubImportValue(row, [
            "parent email",
            "guardian email",
            "email",
          ]);

          const phone = clubImportValue(row, [
            "parent phone",
            "guardian phone",
            "mobile",
            "phone",
          ]);

          const matchedTeam =
            ageGroups.find(
              (team) =>
                String(team.label || "")
                  .trim()
                  .toLowerCase() ===
                String(teamName || "")
                  .trim()
                  .toLowerCase()
            ) ||
            (selectedTeam?.id ? selectedTeam : null);

          return {
            row: index + 2,
            playerName,
            parentName,
            parentEmail,
            phone,
            teamName,
            team: matchedTeam,
            valid: Boolean(
              playerName &&
              matchedTeam?.id
            ),
          };
        })
        .filter(
          (row) =>
            row.playerName ||
            row.parentName ||
            row.parentEmail
        );

      setPreview(mapped);
    } catch (error) {
      setPreview([]);
      setMessage(
        error?.message || "Could not read that file."
      );
    }
  }

  async function importRoster() {
    if (!club?.id) return;

    const valid = preview.filter((row) => row.valid);

    if (!valid.length) {
      setMessage("No valid roster rows to import.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data: currentPlayers, error } =
        await supabase
          .from("journey_players")
          .select("id,name,age_group_id")
          .eq("club_id", club.id);

      if (error) throw error;

      const workingPlayers = [...(currentPlayers || [])];

      const { data: currentGuardians, error: guardianLoadError } =
        await supabase
          .from("club_guardians")
          .select("id,name,email,phone,user_id")
          .eq("club_id", club.id);

      if (guardianLoadError) throw guardianLoadError;

      const workingGuardians = [...(currentGuardians || [])];

      for (const row of valid) {
        let player = workingPlayers.find(
          (item) =>
            String(item.name || "")
              .trim()
              .toLowerCase() ===
              String(row.playerName || "")
                .trim()
                .toLowerCase() &&
            String(item.age_group_id) ===
              String(row.team.id)
        );

        if (!player) {
          const { data, error: playerError } =
            await supabase
              .from("journey_players")
              .insert({
                parent_user_id:
                  "00000000-0000-0000-0000-000000000000",
                club_id: club.id,
                age_group_id: row.team.id,
                name: row.playerName,
              })
              .select("id,name,age_group_id")
              .single();

          if (playerError) throw playerError;

          player = data;
          workingPlayers.push(player);
        }

        if (row.parentEmail) {
          const email = row.parentEmail
            .trim()
            .toLowerCase();

          let guardian = workingGuardians.find(
            (item) =>
              String(item.email || "").toLowerCase() === email
          );

          if (!guardian) {
            const { data, error: guardianError } =
              await supabase
                .from("club_guardians")
                .upsert(
                  {
                    club_id: club.id,
                    name:
                      row.parentName ||
                      email.split("@")[0],
                    email,
                    phone: row.phone || null,
                  },
                  {
                    onConflict: "club_id,email",
                  }
                )
                .select("id,name,email,phone,user_id")
                .single();

            if (guardianError) throw guardianError;

            guardian = data;
            workingGuardians.push(guardian);
          }

          const { error: linkError } = await supabase
            .from("club_player_guardians")
            .upsert(
              {
                player_id: player.id,
                guardian_id: guardian.id,
                is_primary: true,
              },
              {
                onConflict:
                  "player_id,guardian_id",
              }
            );

          if (linkError) throw linkError;
        }
      }

      setPreview([]);
      setFileName("");

      setMessage(
        `${valid.length} roster row${
          valid.length === 1 ? "" : "s"
        } imported.`
      );

      await loadData();
    } catch (error) {
      setMessage(
        error?.message || "Roster import failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: 11,
            borderRadius: 10,
            border: `1px solid ${P.line}`,
            background: P.white,
            fontFamily: F.body,
            fontSize: 10,
            color: P.ink,
          }}
        >
          {message}
        </div>
      )}

      <ClubCard>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 18,
            fontWeight: 800,
            color: P.ink,
          }}
        >
          Players & Parents
        </div>

        <div
          style={{
            fontFamily: F.body,
            fontSize: 10,
            color: P.muted,
            marginTop: 3,
          }}
        >
          {selectedTeam ? teamDisplayName(selectedTeam) : "All club teams"} ·
          children, linked parents and Academy access
        </div>

        <div
          style={{
            overflowX: "auto",
            marginTop: 15,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 760,
            }}
          >
            <thead>
              <tr>
                {[
                  "Child",
                  "Team",
                  "Parent / Guardian",
                  "Parent email",
                  "Academy",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: "left",
                      padding: "9px 8px",
                      borderBottom: `1px solid ${P.line}`,
                      fontFamily: F.body,
                      fontSize: 9,
                      color: P.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading &&
                visiblePlayers.map((player) => {
                  const parentRows =
                    parentsForPlayer(player.id);

                  if (!parentRows.length) {
                    return (
                      <tr key={player.id}>
                        <td style={td}>{player.name}</td>
                        <td style={td}>
                          {teamLabel(player)}
                        </td>
                        <td style={td}>Not linked</td>
                        <td style={td}>—</td>
                        <td style={td}>Not invited</td>
                      </tr>
                    );
                  }

                  return parentRows.map(
                    (guardian, index) => (
                      <tr
                        key={`${player.id}-${guardian.id}`}
                      >
                        <td style={td}>
                          {index === 0
                            ? player.name
                            : ""}
                        </td>

                        <td style={td}>
                          {index === 0
                            ? teamLabel(player)
                            : ""}
                        </td>

                        <td style={td}>
                          {guardian.name}
                        </td>

                        <td style={td}>
                          {guardian.email}
                        </td>

                        <td style={td}>
                          {academyStatus(guardian)}
                        </td>
                      </tr>
                    )
                  );
                })}

              {!loading &&
                visiblePlayers.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: 24,
                        textAlign: "center",
                        fontFamily: F.body,
                        fontSize: 11,
                        color: P.muted,
                      }}
                    >
                      No children are stored for this team yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </ClubCard>

      <div style={{ height: 14 }} />

      <ClubCard>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 16,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              Import players & parents
            </div>

            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                color: P.muted,
                marginTop: 3,
              }}
            >
              Upload ClubZap CSV or Excel. We will look
              for Child/Player Name, Team, Parent Name,
              Parent Email and Phone.
            </div>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            onChange={(event) =>
              chooseFile(event.target.files?.[0])
            }
            style={{
              fontFamily: F.body,
              fontSize: 10,
            }}
          />
        </div>

        {fileName && (
          <div
            style={{
              marginTop: 9,
              fontFamily: F.body,
              fontSize: 9,
              color: P.muted,
            }}
          >
            {fileName}
          </div>
        )}

        {preview.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: 13,
              borderRadius: 12,
              background: P.soft,
            }}
          >
            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              {
                preview.filter((row) => row.valid)
                  .length
              }{" "}
              ready ·{" "}
              {
                preview.filter((row) => !row.valid)
                  .length
              }{" "}
              need review
            </div>

            <div
              style={{
                marginTop: 8,
                display: "grid",
                gap: 5,
              }}
            >
              {preview.slice(0, 6).map((row) => (
                <div
                  key={row.row}
                  style={{
                    fontFamily: F.body,
                    fontSize: 9,
                    color: row.valid
                      ? P.ink
                      : "#b45309",
                  }}
                >
                  {row.playerName || "Missing child"} ·{" "}
                  {row.team?.label ||
                    row.teamName ||
                    "Missing team"}{" "}
                  · {row.parentEmail || "No parent email"}
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={importRoster}
              style={{
                marginTop: 12,
                height: 36,
                border: 0,
                borderRadius: 9,
                background: CLUB_RED,
                color: "#fff",
                padding: "0 13px",
                fontFamily: F.body,
                fontSize: 10,
                fontWeight: 800,
                cursor: busy
                  ? "default"
                  : "pointer",
              }}
            >
              {busy
                ? "Importing…"
                : `Import ${
                    preview.filter(
                      (row) => row.valid
                    ).length
                  }`}
            </button>
          </div>
        )}
      </ClubCard>
    </div>
  );
}


function ClubAttendancePanel({
  club,
  ageGroups = [],
  selectedTeam,
}) {
  const [sessions, setSessions] = useState([]);
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSessions() {
    if (!club?.id) return;

    let query = supabase
      .from("club_attendance_sessions")
      .select("id,age_group_id,session_date,title,source")
      .eq("club_id", club.id)
      .order("session_date", { ascending: false })
      .limit(20);

    if (selectedTeam?.id) {
      query = query.eq(
        "age_group_id",
        selectedTeam.id
      );
    }

    const { data, error } = await query;

    if (error) setMessage(error.message);
    setSessions(data || []);
  }

  useEffect(() => {
    loadSessions();
  }, [club?.id, selectedTeam?.id]);

  async function chooseFile(file) {
    if (!file) return;

    setFileName(file.name);
    setMessage("");

    try {
      const rows = await readClubImportFile(file);

      const mapped = rows
        .map((row, index) => {
          const playerName = clubImportValue(row, [
            "player name",
            "child name",
            "player",
            "child",
            "name",
          ]);

          const teamName = clubImportValue(row, [
            "team",
            "team name",
            "age group",
            "squad",
          ]);

          let date = clubImportValue(row, [
            "date",
            "session date",
            "training date",
          ]);

          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
            const [day, month, year] =
              date.split("/");

            date =
              `${year}-${month.padStart(2, "0")}-` +
              day.padStart(2, "0");
          }

          const rawStatus = clubImportValue(row, [
            "attendance",
            "status",
            "attended",
            "present",
          ]).toLowerCase();

          let status = "unknown";

          if (
            [
              "yes",
              "y",
              "present",
              "attended",
              "1",
              "true",
            ].includes(rawStatus)
          ) {
            status = "present";
          } else if (
            [
              "no",
              "n",
              "absent",
              "0",
              "false",
            ].includes(rawStatus)
          ) {
            status = "absent";
          } else if (
            [
              "excused",
              "apology",
              "apologies",
            ].includes(rawStatus)
          ) {
            status = "excused";
          }

          const team =
            ageGroups.find(
              (item) =>
                String(item.label || "")
                  .trim()
                  .toLowerCase() ===
                String(teamName || "")
                  .trim()
                  .toLowerCase()
            ) ||
            (selectedTeam?.id
              ? selectedTeam
              : null);

          return {
            row: index + 2,
            playerName,
            team,
            teamName,
            date,
            status,
            valid: Boolean(
              playerName &&
              team?.id &&
              /^\d{4}-\d{2}-\d{2}$/.test(date)
            ),
          };
        })
        .filter(
          (row) =>
            row.playerName ||
            row.teamName ||
            row.date
        );

      setPreview(mapped);
    } catch (error) {
      setPreview([]);
      setMessage(
        error?.message ||
          "Could not read attendance file."
      );
    }
  }

  async function importAttendance() {
    if (!club?.id) return;

    const valid = preview.filter((row) => row.valid);

    if (!valid.length) {
      setMessage(
        "No valid attendance rows to import."
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const teamIds = [
        ...new Set(
          valid.map((row) => row.team.id)
        ),
      ];

      const { data: players, error: playerError } =
        await supabase
          .from("journey_players")
          .select("id,name,age_group_id")
          .eq("club_id", club.id)
          .in("age_group_id", teamIds);

      if (playerError) throw playerError;

      const grouped = valid.reduce(
        (map, row) => {
          const key =
            `${row.team.id}|${row.date}`;

          if (!map.has(key)) {
            map.set(key, []);
          }

          map.get(key).push(row);
          return map;
        },
        new Map()
      );

      for (const [key, rows] of grouped) {
        const [teamId, date] =
          key.split("|");

        const { data: existing, error } =
          await supabase
            .from("club_attendance_sessions")
            .select("id")
            .eq("club_id", club.id)
            .eq("age_group_id", teamId)
            .eq("session_date", date)
            .limit(1);

        if (error) throw error;

        let session = existing?.[0];

        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        const { data: matchingEvents } = await supabase
          .from("club_events")
          .select("id,event_type")
          .eq("club_id", club.id)
          .eq("age_group_id", teamId)
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd)
          .order("starts_at")
          .limit(1);
        const linkedEvent = matchingEvents?.[0] || null;

        if (!session) {
          const {
            data,
            error: sessionError,
          } = await supabase
            .from("club_attendance_sessions")
            .insert({
              club_id: club.id,
              age_group_id: teamId,
              session_date: date,
              title: "Training",
              source: "clubzap_import",
              source_reference:
                fileName || null,
              event_id: linkedEvent?.id || null,
            })
            .select("id")
            .single();

          if (sessionError) {
            throw sessionError;
          }

          session = data;
        }

        for (const row of rows) {
          const player = (players || []).find(
            (item) =>
              String(item.age_group_id) ===
                String(teamId) &&
              String(item.name || "")
                .trim()
                .toLowerCase() ===
                String(row.playerName || "")
                  .trim()
                  .toLowerCase()
          );

          if (!player) continue;

          const {
            error: attendanceError,
          } = await supabase
            .from("club_attendance_records")
            .upsert(
              {
                attendance_session_id:
                  session.id,
                player_id: player.id,
                status: row.status,
                source: "clubzap_import",
              },
              {
                onConflict:
                  "attendance_session_id,player_id",
              }
            );

          if (attendanceError) {
            throw attendanceError;
          }

          if (linkedEvent?.id && ["present", "absent", "excused", "late"].includes(row.status)) {
            const { error: eventAttendanceError } = await supabase
              .from("event_attendance")
              .upsert(
                {
                  event_id: linkedEvent.id,
                  player_id: player.id,
                  status: row.status,
                  source: "clubzap_import",
                },
                { onConflict: "event_id,player_id" }
              );
            if (eventAttendanceError) throw eventAttendanceError;
          }
        }
      }

      setPreview([]);
      setFileName("");

      setMessage(
        `${valid.length} attendance row${
          valid.length === 1 ? "" : "s"
        } imported.`
      );

      await loadSessions();
    } catch (error) {
      setMessage(
        error?.message ||
          "Attendance import failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function sessionTeamLabel(session) {
    const team = ageGroups.find(
      (item) =>
        String(item.id) ===
        String(session.age_group_id)
    );

    return team
      ? teamDisplayName(team)
      : "Team";
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: 11,
            borderRadius: 10,
            border: `1px solid ${P.line}`,
            background: P.white,
            fontFamily: F.body,
            fontSize: 10,
            color: P.ink,
          }}
        >
          {message}
        </div>
      )}

      <ClubCard>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 17,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              Attendance
            </div>

            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                color: P.muted,
                marginTop: 3,
              }}
            >
              Upload ClubZap CSV or Excel.
              Required: Player Name, Team, Date,
              Attendance/Status.
            </div>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            onChange={(event) =>
              chooseFile(event.target.files?.[0])
            }
            style={{
              fontFamily: F.body,
              fontSize: 10,
            }}
          />
        </div>

        {preview.length > 0 && (
          <div
            style={{
              marginTop: 14,
              background: P.soft,
              borderRadius: 12,
              padding: 13,
            }}
          >
            <div
              style={{
                fontFamily: F.body,
                fontSize: 10,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              {
                preview.filter((row) => row.valid)
                  .length
              }{" "}
              ready ·{" "}
              {
                preview.filter(
                  (row) => !row.valid
                ).length
              }{" "}
              need review
            </div>

            <div
              style={{
                display: "grid",
                gap: 5,
                marginTop: 8,
              }}
            >
              {preview.slice(0, 6).map((row) => (
                <div
                  key={row.row}
                  style={{
                    fontFamily: F.body,
                    fontSize: 9,
                    color: row.valid
                      ? P.ink
                      : "#b45309",
                  }}
                >
                  {row.playerName || "Missing player"} ·{" "}
                  {row.team?.label ||
                    row.teamName ||
                    "Missing team"}{" "}
                  · {row.date || "Missing date"} ·{" "}
                  {row.status}
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={importAttendance}
              style={{
                marginTop: 12,
                height: 36,
                border: 0,
                borderRadius: 9,
                background: CLUB_RED,
                color: "#fff",
                padding: "0 13px",
                fontFamily: F.body,
                fontSize: 10,
                fontWeight: 800,
                cursor: busy
                  ? "default"
                  : "pointer",
              }}
            >
              {busy
                ? "Importing…"
                : "Import attendance"}
            </button>
          </div>
        )}
      </ClubCard>

      <div style={{ height: 14 }} />

      <ClubCard>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 16,
            fontWeight: 800,
            color: P.ink,
            marginBottom: 10,
          }}
        >
          Recent attendance
        </div>

        {sessions.length === 0 ? (
          <div
            style={{
              fontFamily: F.body,
              fontSize: 10,
              color: P.muted,
              padding: "8px 0",
            }}
          >
            No attendance imported yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  border: `1px solid ${P.line}`,
                  borderRadius: 10,
                  padding: "10px 11px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 11,
                      fontWeight: 800,
                      color: P.ink,
                    }}
                  >
                    {sessionTeamLabel(session)}
                  </div>

                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 9,
                      color: P.muted,
                      marginTop: 2,
                    }}
                  >
                    {session.title || "Training"}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 10,
                    fontWeight: 800,
                    color: P.ink,
                  }}
                >
                  {session.session_date}
                </div>
              </div>
            ))}
          </div>
        )}
      </ClubCard>
    </div>
  );
}


function ClubTeamsScreen(props) {
  const [clubTeamsTab, setClubTeamsTab] = useState("teams");
  const tabs = [["teams","Teams"],["players","Players & Parents"],["attendance","Attendance"]];
  const tabsNode = (
    <div className="spraoi-subnav-tabs" style={{ display:"flex", gap:7, overflowX:"auto", marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${P.line}` }}>
      {tabs.map(([id,label]) => (
        <button key={id} type="button" onClick={() => setClubTeamsTab(id)} style={{ whiteSpace:"nowrap", height:36, borderRadius:9, padding:"0 13px", border:`1px solid ${clubTeamsTab===id?CLUB_RED:P.line}`, background:clubTeamsTab===id?CLUB_SOFT:P.white, color:clubTeamsTab===id?CLUB_RED:P.ink, fontFamily:F.body, fontSize:10, fontWeight:700, cursor:"pointer" }}>{label}</button>
      ))}
    </div>
  );

  if (clubTeamsTab === "teams") return <ClubTeamsCoreScreen {...props} tabsNode={tabsNode} />;

  const pageTitle = clubTeamsTab === "players" ? "Players & Parents" : "Attendance";
  const pageSub = clubTeamsTab === "players"
    ? "Review the players and parent links attached to this team."
    : "Review team attendance records and imported attendance.";

  return (
    <ClubPage title={pageTitle} sub={pageSub}>
      {tabsNode}
      {clubTeamsTab === "players" && <ClubPlayersParentsPanel club={props.club} ageGroups={props.ageGroups} selectedTeam={props.selectedTeam} />}
      {clubTeamsTab === "attendance" && <ClubAttendancePanel club={props.club} ageGroups={props.ageGroups} selectedTeam={props.selectedTeam} />}
    </ClubPage>
  );
}

// Build refresh: People invite roles 2026-08-23
function ClubCoachesScreen({ club, ageGroups, coaches, selectedTeam, onReloadCoaches, userRole, currentUserId }) {
  const [staff, setStaff] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationTeams, setInvitationTeams] = useState([]);
  const [invitationChildren, setInvitationChildren] = useState([]);
  const [journeyPlayers, setJourneyPlayers] = useState([]);

  const [name, setName] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [inviteType, setInviteType] = useState(
    ["super_admin", "admin", "club_admin"].includes(userRole?.role)
      ? "lead_coach"
      : "coach"
  );
  const [teamId, setTeamId] = useState(selectedTeam?.id || "");
  const [childIds, setChildIds] = useState([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = ["super_admin", "admin", "club_admin"].includes(userRole?.role);
  const isLeadCoach = userRole?.role === "lead_coach";
  const canInvite = isAdmin || isLeadCoach;

  useEffect(() => {
    loadPeopleData();
  }, [club?.id, currentUserId]);

  useEffect(() => {
    if (selectedTeam?.id) setTeamId(selectedTeam.id);
  }, [selectedTeam?.id]);

  useEffect(() => {
    setChildIds([]);
  }, [teamId, inviteType]);

  async function loadPeopleData() {
    if (!club?.id) return;

    const [
      staffResult,
      inviteResult,
      playerResult,
    ] = await Promise.all([
      supabase
        .from("team_staff")
        .select("*, coach:coaches(id,name,email,user_id), team:age_groups(id,label,gender)")
        .eq("club_id", club.id)
        .eq("status", "active"),

      supabase
        .from("spraoi_invitations")
        .select("*")
        .eq("club_id", club.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("journey_players")
        .select("id,name,age_group_id,parent_user_id,club_id")
        .eq("club_id", club.id)
        .order("name"),
    ]);

    setStaff(staffResult.data || []);
    setInvitations(inviteResult.data || []);
    setJourneyPlayers(playerResult.data || []);

    const inviteIds = (inviteResult.data || []).map((row) => row.id);

    if (inviteIds.length === 0) {
      setInvitationTeams([]);
      setInvitationChildren([]);
      return;
    }

    const [teamRelationResult, childRelationResult] = await Promise.all([
      supabase
        .from("spraoi_invitation_teams")
        .select("invitation_id,age_group_id")
        .in("invitation_id", inviteIds),

      supabase
        .from("spraoi_invitation_children")
        .select("invitation_id,player_id")
        .in("invitation_id", inviteIds),
    ]);

    setInvitationTeams(teamRelationResult.data || []);
    setInvitationChildren(childRelationResult.data || []);
  }

  const leadCoachTeamIds = isLeadCoach
    ? [...new Set(
        (staff || [])
          .filter(
            (row) =>
              row.user_id === currentUserId &&
              row.role === "lead_coach"
          )
          .map((row) => row.age_group_id)
          .filter(Boolean)
      )]
    : [];

  const availableTeams = isLeadCoach
    ? (ageGroups || []).filter((team) => leadCoachTeamIds.includes(team.id))
    : (ageGroups || []);

  const availableInviteTypes = isAdmin
    ? [
        { value: "club_admin", label: "Club Admin" },
        { value: "lead_coach", label: "Lead Coach" },
        { value: "team_admin", label: "Team Admin" },
        { value: "coach", label: "Coach / Mentor" },
        { value: "parent_guardian", label: "Parent / Guardian" },
      ]
    : [
        { value: "coach", label: "Coach / Mentor" },
      ];

  const selectedTeamPlayers = (journeyPlayers || []).filter(
    (player) => String(player.age_group_id) === String(teamId)
  );

  async function sendInvitation() {
    if (saving || !canInvite || !club?.id) return;

    const cleanName = name.trim();
    const cleanEmail = emailValue.trim().toLowerCase();

    if (!cleanName || !cleanEmail || (inviteType !== "club_admin" && !teamId)) {
      setMessage(inviteType === "club_admin" ? "Please enter a name and email address." : "Please enter a name, email address and team.");
      return;
    }

    if (isLeadCoach && !leadCoachTeamIds.includes(teamId)) {
      setMessage(
        "You can only invite Coach/Mentors to a team where you are the Lead Coach."
      );
      return;
    }

    if (inviteType === "parent_guardian" && childIds.length === 0) {
      setMessage("Please select at least one child for this Parent / Guardian.");
      return;
    }

    setSaving(true);
    setMessage("");

    const body = {
      clubId: club.id,
      name: cleanName,
      email: cleanEmail,
      inviteType,
      teamIds: inviteType === "club_admin" ? [] : [teamId],
      childIds: inviteType === "parent_guardian" ? childIds : [],
    };

    const { data, error } = await supabase.functions.invoke(
      "send-spraoi-invite",
      { body }
    );

    if (error) {
      let detail = error.message || "Edge Function failed.";
      try {
        if (error.context && typeof error.context.json === "function") {
          const responseBody = await error.context.json();
          detail = responseBody?.error || responseBody?.message || detail;
        }
      } catch (responseError) {
        console.warn("Could not read invitation error response:", responseError);
      }
      setMessage("Could not send invitation: " + detail);
      setSaving(false);
      return;
    }

    if (data?.ok === false) {
      setMessage(data.error || "Could not send invitation.");
      setSaving(false);
      return;
    }

    setName("");
    setEmailValue("");
    setChildIds([]);

    setMessage(
      `${availableInviteTypes.find((x) => x.value === inviteType)?.label || "Invitation"} sent to ${cleanEmail}.`
    );

    await loadPeopleData();
    setSaving(false);
  }

  async function cancelInvitation(invitation) {
    if (!invitation?.id) return;

    const confirmed = window.confirm(
      `Cancel the pending invitation for ${invitation.email}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("spraoi_invitations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (error) {
      setMessage("Could not cancel invitation: " + error.message);
      return;
    }

    setMessage("Invitation cancelled.");
    await loadPeopleData();
  }

  async function removeCoachRecord(coach) {
    if (!isAdmin || !coach?.id || !club?.id) return;

    if (
      !window.confirm(
        `Remove ${coach.name || "this coach"} from the club directory and team assignments?\n\nTheir login account itself will not be deleted.`
      )
    ) {
      return;
    }

    const { error: staffError } = await supabase
      .from("team_staff")
      .delete()
      .eq("coach_id", coach.id)
      .eq("club_id", club.id);

    if (staffError) {
      setMessage("Could not remove team assignments: " + staffError.message);
      return;
    }

    const { error } = await supabase
      .from("coaches")
      .delete()
      .eq("id", coach.id)
      .eq("club_id", club.id);

    if (error) {
      setMessage("Could not remove coach: " + error.message);
      return;
    }

    setMessage("Coach removed.");
    await onReloadCoaches?.();
    await loadPeopleData();
  }

  function assignmentsForCoach(coachId) {
    return (staff || [])
      .filter((row) => row.coach_id === coachId)
      .map((row) => ({
        ...row,
        team: (ageGroups || []).find(
          (team) => String(team.id) === String(row.age_group_id)
        ),
      }));
  }

  function openPermissionEditor(coach) {
    if (!isAdmin || !coach?.id) return;

    const rows = assignmentsForCoach(coach.id).map((row) => ({
      ...row,
      coach_write: Boolean(row.coach_write),
      academy_write: Boolean(row.academy_write),
      academy_publish: Boolean(row.academy_publish),
      connect_read: Boolean(row.connect_read),
      connect_write: Boolean(row.connect_write),
      cup_read: Boolean(row.cup_read),
      cup_write: Boolean(row.cup_write),
      attendance_manage: Boolean(row.attendance_manage),
    }));

    setPermissionCoach(coach);
    setPermissionRows(rows);
  }

  function updatePermissionRow(id, patch) {
    setPermissionRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, ...patch };

        if (next.connect_write) next.connect_read = true;
        if (!next.connect_read) next.connect_write = false;

        if (next.cup_write) next.cup_read = true;
        if (!next.cup_read) next.cup_write = false;

        if (next.academy_publish) next.academy_write = true;
        if (!next.academy_write) next.academy_publish = false;

        return next;
      })
    );
  }

  async function savePermissionEditor() {
    if (!isAdmin || permissionSaving || !permissionRows.length) return;

    setPermissionSaving(true);
    setMessage("");

    try {
      for (const row of permissionRows) {
        const payload = {
          coach_write: Boolean(row.coach_write),
          academy_write: Boolean(row.academy_write),
          academy_publish: Boolean(row.academy_publish),
          connect_read: Boolean(row.connect_read || row.connect_write),
          connect_write: Boolean(row.connect_write),
          cup_read: Boolean(row.cup_read || row.cup_write),
          cup_write: Boolean(row.cup_write),
          attendance_manage: Boolean(row.attendance_manage),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("team_staff")
          .update(payload)
          .eq("id", row.id)
          .eq("club_id", club.id);

        if (error) throw error;
      }

      setPermissionCoach(null);
      setPermissionRows([]);
      setMessage("Permissions updated.");
      await loadPeopleData();
    } catch (error) {
      setMessage(
        "Could not update permissions: " +
          (error?.message || "Unknown error")
      );
    } finally {
      setPermissionSaving(false);
    }
  }

  function accessLevel(row, prefix) {
    if (row?.[`${prefix}_write`]) return "write";
    if (row?.[`${prefix}_read`]) return "read";
    return "none";
  }

  function updateAccessLevel(rowId, prefix, value) {
    if (value === "write") {
      updatePermissionRow(rowId, {
        [`${prefix}_read`]: true,
        [`${prefix}_write`]: true,
      });
      return;
    }

    if (value === "read") {
      updatePermissionRow(rowId, {
        [`${prefix}_read`]: true,
        [`${prefix}_write`]: false,
      });
      return;
    }

    updatePermissionRow(rowId, {
      [`${prefix}_read`]: false,
      [`${prefix}_write`]: false,
    });
  }

  function invitationTeamNames(invitationId) {
    const ids = invitationTeams
      .filter((row) => row.invitation_id === invitationId)
      .map((row) => row.age_group_id);

    return ids
      .map((id) =>
        (ageGroups || []).find((team) => String(team.id) === String(id))
      )
      .filter(Boolean)
      .map(teamDisplayName)
      .join(", ");
  }

  function invitationChildNames(invitationId) {
    const ids = invitationChildren
      .filter((row) => row.invitation_id === invitationId)
      .map((row) => row.player_id);

    return ids
      .map((id) =>
        (journeyPlayers || []).find(
          (player) => String(player.id) === String(id)
        )
      )
      .filter(Boolean)
      .map((player) => player.name)
      .join(", ");
  }

  function inviteTypeLabel(value) {
    if (value === "club_admin") return "Club Admin";
    if (value === "lead_coach") return "Lead Coach";
    if (value === "team_admin") return "Team Admin";
    if (value === "coach") return "Coach / Mentor";
    if (value === "parent_guardian") return "Parent / Guardian";
    return value || "Invitation";
  }

  const visibleInvitations = (invitations || []).filter((invite) => {
    if (!isLeadCoach) return true;

    const ids = invitationTeams
      .filter((row) => row.invitation_id === invite.id)
      .map((row) => row.age_group_id);

    return ids.some((id) => leadCoachTeamIds.includes(id));
  });

  const pendingInvitations = visibleInvitations.filter(
    (row) => row.status === "pending"
  );

  const previousInvitations = visibleInvitations.filter(
    (row) => row.status !== "pending"
  );

  return (
    <ClubPage
      title="People"
      sub={
        isLeadCoach
          ? "Invite Coach/Mentors to the teams you lead"
          : "Manage coaches, parents and invitations for your club"
      }
    >
      {canInvite && (
        <ClubCard style={{ marginBottom: 15 }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 17,
              fontWeight: 800,
              color: P.ink,
            }}
          >
            Invite Person
          </div>

          <div
            style={{
              fontFamily: F.body,
              fontSize: 10,
              color: P.muted,
              marginTop: 4,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Access remains pending until the recipient signs in, accepts the
            relevant Spraoi policies and completes their invitation.
          </div>

          <div
            className="club-person-invite-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 1fr 1fr",
              gap: 9,
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: F.body,
                  fontSize: 9,
                  fontWeight: 800,
                  color: P.muted,
                  marginBottom: 4,
                }}
              >
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 9,
                  borderRadius: 8,
                  border: `1px solid ${P.line}`,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: F.body,
                  fontSize: 9,
                  fontWeight: 800,
                  color: P.muted,
                  marginBottom: 4,
                }}
              >
                Email
              </label>
              <input
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                type="email"
                placeholder="email@example.ie"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 9,
                  borderRadius: 8,
                  border: `1px solid ${P.line}`,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: F.body,
                  fontSize: 9,
                  fontWeight: 800,
                  color: P.muted,
                  marginBottom: 4,
                }}
              >
                Role
              </label>
              <select
                value={inviteType}
                onChange={(e) => setInviteType(e.target.value)}
                style={{
                  width: "100%",
                  padding: 9,
                  borderRadius: 8,
                  border: `1px solid ${P.line}`,
                }}
              >
                {availableInviteTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: F.body,
                  fontSize: 9,
                  fontWeight: 800,
                  color: P.muted,
                  marginBottom: 4,
                }}
              >
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                style={{
                  width: "100%",
                  padding: 9,
                  borderRadius: 8,
                  border: `1px solid ${P.line}`,
                }}
              >
                <option value="">Choose team</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {teamDisplayName(team)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {inviteType === "parent_guardian" && teamId && (
            <div
              style={{
                marginTop: 13,
                padding: 12,
                borderRadius: 10,
                background: CLUB_SOFT,
                border: `1px solid ${CLUB_RED}22`,
              }}
            >
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 10,
                  fontWeight: 800,
                  color: P.ink,
                  marginBottom: 8,
                }}
              >
                Children
              </div>

              {selectedTeamPlayers.length === 0 ? (
                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 10,
                    color: P.muted,
                  }}
                >
                  No Academy children are currently attached to this team.
                </div>
              ) : (
                <div
                  className="club-child-picker"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 7,
                  }}
                >
                  {selectedTeamPlayers.map((player) => {
                    const checked = childIds.includes(player.id);

                    return (
                      <label
                        key={player.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 9px",
                          borderRadius: 8,
                          background: "#fff",
                          border: `1px solid ${checked ? CLUB_RED : P.line}`,
                          cursor: "pointer",
                          fontFamily: F.body,
                          fontSize: 10,
                          color: P.ink,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setChildIds((current) =>
                              e.target.checked
                                ? [...new Set([...current, player.id])]
                                : current.filter((id) => id !== player.id)
                            );
                          }}
                        />
                        {player.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 13,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Btn
              label={saving ? "Sending…" : "Send Invitation"}
              onClick={sendInvitation}
             
            />

            {message && (
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 10,
                  color:
                    message.includes("Could not") ||
                    message.includes("Please") ||
                    message.includes("only invite")
                      ? "#b42318"
                      : "#16803c",
                }}
              >
                {message}
              </div>
            )}
          </div>
        </ClubCard>
      )}

      <ClubCard style={{ marginBottom: 15 }}>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 16,
            fontWeight: 800,
            color: P.ink,
            marginBottom: 4,
          }}
        >
          Pending Invitations
        </div>

        <div
          style={{
            fontFamily: F.body,
            fontSize: 10,
            color: P.muted,
            marginBottom: 10,
          }}
        >
          People do not receive active access until they accept.
        </div>

        {pendingInvitations.length === 0 ? (
          <div
            style={{
              fontFamily: F.body,
              fontSize: 11,
              color: P.muted,
            }}
          >
            No pending invitations.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="club-invitation-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1.2fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: 11,
                  border: `1px solid ${P.line}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 11,
                      fontWeight: 800,
                      color: P.ink,
                    }}
                  >
                    {invite.name || invite.email}
                  </div>
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 9,
                      color: P.muted,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {invite.email}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 10,
                    fontWeight: 800,
                    color: CLUB_RED,
                  }}
                >
                  {inviteTypeLabel(invite.invite_type)}
                </div>

                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 9,
                    color: P.muted,
                  }}
                >
                  <div>{invitationTeamNames(invite.id) || "No team"}</div>
                  {invite.invite_type === "parent_guardian" && (
                    <div style={{ marginTop: 3 }}>
                      {invitationChildNames(invite.id) || "No child"}
                    </div>
                  )}
                </div>

                {(isAdmin || invite.invited_by === currentUserId) && (
                  <Btn
                    label="Cancel"
                    variant="ghost"
                    style={{ color: P.coral }}
                    onClick={() => cancelInvitation(invite)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </ClubCard>

      <ClubCard style={{ marginBottom: 15 }}>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 16,
            fontWeight: 800,
            color: P.ink,
            marginBottom: 12,
          }}
        >
          Active Coaching Team
        </div>

        {(coaches || []).length === 0 ? (
          <div
            style={{
              fontFamily: F.body,
              fontSize: 11,
              color: P.muted,
            }}
          >
            No coaches added yet.
          </div>
        ) : (
          (coaches || []).map((coach) => {
            const assignments = assignmentsForCoach(coach.id);

            const visibleAssignments = isLeadCoach
              ? assignments.filter((row) =>
                  leadCoachTeamIds.includes(row.age_group_id)
                )
              : assignments;

            if (isLeadCoach && visibleAssignments.length === 0) return null;

            return (
              <div
                key={coach.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 0",
                  borderTop: `1px solid ${P.line}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: CLUB_SOFT,
                    display: "grid",
                    placeItems: "center",
                    color: CLUB_RED,
                    fontFamily: F.display,
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {(coach.name || "C")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 700,
                      color: P.ink,
                    }}
                  >
                    {coach.name || "Coach"}
                  </div>

                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 10,
                      color: P.muted,
                    }}
                  >
                    {coach.email || "No login email"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      marginTop: 5,
                    }}
                  >
                    {visibleAssignments.length === 0 ? (
                      <span
                        style={{
                          fontFamily: F.body,
                          fontSize: 9,
                          color: P.muted,
                        }}
                      >
                        No team assignment
                      </span>
                    ) : (
                      visibleAssignments.map((row) => (
                        <span
                          key={row.id}
                          style={{
                            padding: "3px 7px",
                            borderRadius: 999,
                            background:
                              row.role === "lead_coach"
                                ? "#fff3e0"
                                : CLUB_SOFT,
                            color:
                              row.role === "lead_coach"
                                ? "#9a5b00"
                                : CLUB_RED,
                            fontFamily: F.body,
                            fontSize: 9,
                            fontWeight: 800,
                          }}
                        >
                          {teamDisplayName(row.team)} ·{" "}
                          {row.role === "lead_coach"
                            ? "Lead Coach"
                            : "Coach/Mentor"}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn
                      label="Permissions"
                      variant="ghost"
                      onClick={() => openPermissionEditor(coach)}
                    />
                    <Btn
                      label="Remove"
                      variant="ghost"
                      style={{ color: P.coral }}
                      onClick={() => removeCoachRecord(coach)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </ClubCard>

      {previousInvitations.length > 0 && (
        <ClubCard>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 15,
              fontWeight: 800,
              color: P.ink,
              marginBottom: 10,
            }}
          >
            Invitation History
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {previousInvitations.slice(0, 20).map((invite) => (
              <div
                key={invite.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: `1px solid ${P.line}`,
                  fontFamily: F.body,
                  fontSize: 10,
                }}
              >
                <div>
                  <strong>{invite.name || invite.email}</strong>
                  <span style={{ color: P.muted }}>
                    {" · "}
                    {inviteTypeLabel(invite.invite_type)}
                  </span>
                </div>

                <span
                  style={{
                    fontWeight: 800,
                    textTransform: "capitalize",
                    color:
                      invite.status === "accepted"
                        ? "#16803c"
                        : invite.status === "cancelled"
                          ? P.coral
                          : P.muted,
                  }}
                >
                  {invite.status}
                </span>
              </div>
            ))}
          </div>
        </ClubCard>
      )}

      <style>{`
        @media(max-width:900px){
          .club-person-invite-grid{
            grid-template-columns:1fr 1fr!important;
          }
          .club-invitation-row{
            grid-template-columns:1fr 1fr!important;
          }
          .club-permission-editor-grid{
            grid-template-columns:1fr!important;
          }
        }

        @media(max-width:560px){
          .club-person-invite-grid,
          .club-invitation-row{
            grid-template-columns:1fr!important;
          }

          .club-child-picker{
            grid-template-columns:1fr!important;
          }
        }
      `}</style>
    </ClubPage>
  );
}

function ClubComplianceScreen({ club, coaches, userRole }) {
  const canManage = ["super_admin", "admin", "club_admin"].includes(userRole?.role);
  const [certs, setCerts] = useState([]);
  const [coachId, setCoachId] = useState("");
  const [certType, setCertType] = useState("Safeguarding");
  const [customType, setCustomType] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadCerts(); }, [club?.id]);

  async function loadCerts() {
    if (!club?.id) return;
    const { data, error: loadError } = await supabase
      .from("coach_certifications")
      .select("*, coach:coaches(id,name,email)")
      .eq("club_id", club.id)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (loadError) {
      setCerts([]);
      setError(loadError.message);
    } else {
      setCerts(data || []);
      setError("");
    }
  }

  function daysUntil(dateValue) {
    if (!dateValue) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(`${dateValue}T12:00:00`);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
  }

  function statusFor(cert) {
    const days = daysUntil(cert.expiry_date);
    if (days === null) return { label: "No expiry", tone: "neutral", days };
    if (days < 0) return { label: "Expired", tone: "danger", days };
    if (days <= 90) return { label: `Expires in ${days} days`, tone: "danger", days };
    if (days <= 183) return { label: "Due within 6 months", tone: "warning", days };
    return { label: "Current", tone: "good", days };
  }

  const alerts = certs
    .map((cert) => ({ cert, status: statusFor(cert) }))
    .filter(({ status }) => status.days !== null && status.days <= 183)
    .sort((a, b) => a.status.days - b.status.days);

  function downloadComplianceTemplate() {
    const headers = ["coach_email","coach_name","certification_type","certificate_number","issue_date","expiry_date","notes"];
    const examples = [
      ["mentor@example.ie","Example Mentor","Safeguarding","SG-1234","2026-01-15","2029-01-15",""],
      ["coach@example.ie","Example Coach","Garda Vetting","GV-9876","2025-09-01","2028-09-01",""],
    ];
    const esc = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
    const csv = [headers, ...examples].map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spraoi-compliance-import-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else current += ch;
    }
    cells.push(current.trim());
    return cells;
  }

  async function handleComplianceCsv(file) {
    if (!file) return;
    setImportFileName(file.name);
    setError("");
    const raw = await file.text();
    const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      setImportRows([]);
      setError("The CSV has no data rows.");
      return;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const required = ["coach_email","certification_type","expiry_date"];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length) {
      setImportRows([]);
      setError(`Missing required columns: ${missing.join(", ")}`);
      return;
    }

    const coachByEmail = new Map((coaches || []).filter((c) => c.email).map((c) => [String(c.email).trim().toLowerCase(), c]));
    const rows = lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
      const coach = coachByEmail.get(String(row.coach_email || "").trim().toLowerCase()) || null;
      const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(String(row.expiry_date || ""));
      const errors = [];
      if (!row.coach_email) errors.push("Coach email required");
      if (!coach) errors.push("Coach email not found in club");
      if (!row.certification_type) errors.push("Certification type required");
      if (!row.expiry_date) errors.push("Expiry date required");
      else if (!dateValid) errors.push("Use YYYY-MM-DD for expiry date");
      if (row.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.issue_date))) errors.push("Use YYYY-MM-DD for issue date");

      return {
        rowNumber: index + 2,
        coach,
        data: row,
        errors,
        valid: errors.length === 0,
      };
    });
    setImportRows(rows);
  }

  async function confirmComplianceImport() {
    const validRows = importRows.filter((row) => row.valid);
    if (!canManage || !club?.id || !validRows.length) return;
    setImporting(true);
    setError("");

    const payload = validRows.map((row) => ({
      club_id: club.id,
      coach_id: row.coach.id,
      certification_type: row.data.certification_type.trim(),
      certificate_number: row.data.certificate_number?.trim() || null,
      issue_date: row.data.issue_date || null,
      expiry_date: row.data.expiry_date,
      notes: row.data.notes?.trim() || null,
      alert_months_before: 6,
    }));

    const { error: importError } = await supabase.from("coach_certifications").insert(payload);
    if (importError) setError("Import failed: " + importError.message);
    else {
      setImportRows([]);
      setImportFileName("");
      await loadCerts();
    }
    setImporting(false);
  }

  async function addCertification() {
    if (!canManage || !club?.id || !coachId || !expiryDate) return;
    setSaving(true);
    setError("");
    const type = certType === "Other" ? customType.trim() : certType;
    if (!type) {
      setError("Enter a certification type.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("coach_certifications").insert({
      club_id: club.id,
      coach_id: coachId,
      certification_type: type,
      certificate_number: certificateNumber.trim() || null,
      issue_date: issueDate || null,
      expiry_date: expiryDate,
      notes: notes.trim() || null,
      alert_months_before: 6,
    });

    if (insertError) setError(insertError.message);
    else {
      setCoachId("");
      setCertType("Safeguarding");
      setCustomType("");
      setIssueDate("");
      setExpiryDate("");
      setCertificateNumber("");
      setNotes("");
      await loadCerts();
    }
    setSaving(false);
  }

  async function removeCertification(cert) {
    if (!canManage || !cert?.id) return;
    if (!window.confirm(`Remove ${cert.certification_type} for ${cert.coach?.name || "this coach"}?`)) return;
    const { error: deleteError } = await supabase.from("coach_certifications").delete().eq("id", cert.id);
    if (deleteError) setError(deleteError.message);
    else await loadCerts();
  }

  const toneStyle = {
    danger: { background: "#fff1f1", color: "#a61b1b", border: "#efb7b7" },
    warning: { background: "#fff8e1", color: "#7a4b00", border: "#efd38c" },
    good: { background: "#edf8ef", color: "#1f6b32", border: "#b8dfc0" },
    neutral: { background: P.soft, color: P.muted, border: P.line },
  };

  return (
    <ClubPage
      title="Compliance"
      sub="Safeguarding, Garda Vetting and coaching certification expiry tracking"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 16 }} className="club-compliance-stats">
        <ClubCard style={{ padding: 15 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Compliance records</div>
          <div style={{ fontFamily: F.display, fontSize: 27, fontWeight: 800, color: CLUB_RED, marginTop: 4 }}>{certs.length}</div>
        </ClubCard>
        <ClubCard style={{ padding: 15 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>6-month alerts</div>
          <div style={{ fontFamily: F.display, fontSize: 27, fontWeight: 800, color: "#b26a00", marginTop: 4 }}>{alerts.filter((x) => x.status.days >= 0).length}</div>
        </ClubCard>
        <ClubCard style={{ padding: 15 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase" }}>Expired</div>
          <div style={{ fontFamily: F.display, fontSize: 27, fontWeight: 800, color: "#a61b1b", marginTop: 4 }}>{alerts.filter((x) => x.status.days < 0).length}</div>
        </ClubCard>
      </div>

      {alerts.length > 0 && (
        <ClubCard style={{ marginBottom: 16, border: "1px solid #efd38c", background: "#fffdf6" }}>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 4 }}>Notifications</div>
          <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginBottom: 12 }}>In-app alerts appear automatically from 6 months before expiry. Expired and 90-day items are highlighted more strongly.</div>
          <div style={{ display: "grid", gap: 8 }}>
            {alerts.slice(0, 8).map(({ cert, status }) => {
              const tone = toneStyle[status.tone];
              return (
                <div key={cert.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 11px", borderRadius: 10, background: tone.background, border: `1px solid ${tone.border}` }}>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 800, color: P.ink }}>{cert.coach?.name || "Coach"} · {cert.certification_type}</div>
                    <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 2 }}>Expiry: {cert.expiry_date}</div>
                  </div>
                  <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: tone.color }}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </ClubCard>
      )}

      {canManage && (
        <ClubCard style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Bulk import</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4 }}>For larger certification lists: download the template, fill it in, upload it, review any errors, then confirm.</div>
            </div>
            <Btn label="Download CSV Template" variant="ghost" onClick={downloadComplianceTemplate} />
          </div>

          <label style={{ display: "block", border: `1.5px dashed ${P.line}`, borderRadius: 12, padding: 18, textAlign: "center", cursor: "pointer", background: P.soft }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => handleComplianceCsv(e.target.files?.[0])} style={{ display: "none" }} />
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 800, color: P.ink }}>Choose completed CSV</div>
            <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 3 }}>Coach emails are matched to existing Coaches & Mentors.</div>
          </label>

          {importFileName && <div style={{ marginTop: 9, fontFamily: F.body, fontSize: 9, color: P.muted }}>Loaded: {importFileName}</div>}

          {importRows.length > 0 && (
            <div style={{ marginTop: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink }}>
                  Preview · {importRows.filter((r) => r.valid).length} ready · {importRows.filter((r) => !r.valid).length} need attention
                </div>
                <Btn
                  label={importing ? "Importing…" : `Import ${importRows.filter((r) => r.valid).length} Valid Rows`}
                  onClick={confirmComplianceImport}
                 
                />
              </div>

              <div style={{ maxHeight: 310, overflow: "auto", border: `1px solid ${P.line}`, borderRadius: 10 }}>
                {importRows.map((row) => (
                  <div key={row.rowNumber} style={{ display: "grid", gridTemplateColumns: "52px 1.2fr 1fr 105px 1.5fr", gap: 8, padding: "8px 10px", borderTop: row.rowNumber === 2 ? "none" : `1px solid ${P.line}`, background: row.valid ? "#fff" : "#fff7f7", alignItems: "center" }}>
                    <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>Row {row.rowNumber}</div>
                    <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: P.ink }}>{row.data.coach_email}</div>
                    <div style={{ fontFamily: F.body, fontSize: 9, color: P.ink }}>{row.data.certification_type}</div>
                    <div style={{ fontFamily: F.body, fontSize: 9, color: P.ink }}>{row.data.expiry_date}</div>
                    <div style={{ fontFamily: F.body, fontSize: 8, color: row.valid ? "#1f6b32" : "#a61b1b", fontWeight: 800 }}>{row.valid ? "Ready" : row.errors.join(" · ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ClubCard>
      )}

      {canManage && (
        <ClubCard style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 4 }}>Add certification</div>
          <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginBottom: 12 }}>Add Safeguarding, Garda Vetting, coaching awards, First Aid or another time-limited requirement.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }} className="club-cert-grid">
            <select value={coachId} onChange={(e) => setCoachId(e.target.value)} style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }}>
              <option value="">Choose coach</option>
              {(coaches || []).map((coach) => <option key={coach.id} value={coach.id}>{coach.name} {coach.email ? `· ${coach.email}` : ""}</option>)}
            </select>
            <select value={certType} onChange={(e) => setCertType(e.target.value)} style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }}>
              <option>Safeguarding</option>
              <option>Garda Vetting</option>
              <option>Coaching Award</option>
              <option>First Aid</option>
              <option>Other</option>
            </select>
            <input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" title="Issue date" style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date" title="Expiry date" style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
          </div>

          {certType === "Other" && <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Certification type" style={{ width: "100%", boxSizing: "border-box", padding: 9, borderRadius: 8, border: `1px solid ${P.line}`, marginBottom: 8 }} />}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 8 }} className="club-cert-grid-bottom">
            <input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} placeholder="Certificate / reference number" style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ padding: 9, borderRadius: 8, border: `1px solid ${P.line}` }} />
            <Btn label={saving ? "Saving…" : "Add Certification"} onClick={addCertification} />
          </div>
        </ClubCard>
      )}

      <ClubCard>
        <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink, marginBottom: 12 }}>Certification register</div>
        {certs.length === 0 ? (
          <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>No certification records added yet.</div>
        ) : certs.map((cert) => {
          const status = statusFor(cert);
          const tone = toneStyle[status.tone];
          return (
            <div key={cert.id} style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr .9fr auto", gap: 10, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${P.line}` }} className="club-cert-row">
              <div>
                <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 800, color: P.ink }}>{cert.coach?.name || "Coach"}</div>
                <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{cert.coach?.email || ""}</div>
              </div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink }}>{cert.certification_type}</div>
                {cert.certificate_number && <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>{cert.certificate_number}</div>}
              </div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>Expires {cert.expiry_date || "—"}</div>
                <span style={{ display: "inline-block", marginTop: 3, padding: "3px 7px", borderRadius: 999, background: tone.background, border: `1px solid ${tone.border}`, color: tone.color, fontFamily: F.body, fontSize: 8, fontWeight: 800 }}>{status.label}</span>
              </div>
              {canManage && <Btn label="Remove" variant="ghost" style={{ color: P.coral }} onClick={() => removeCertification(cert)} />}
            </div>
          );
        })}
      </ClubCard>

      {error && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fff1f1", color: "#a61b1b", fontFamily: F.body, fontSize: 10 }}>{error}</div>}

      <style>{`
        @media(max-width:850px){
          .club-compliance-stats{grid-template-columns:1fr!important}
          .club-cert-grid{grid-template-columns:1fr 1fr!important}
          .club-cert-grid-bottom{grid-template-columns:1fr!important}
          .club-cert-row{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:560px){
          .club-cert-grid,.club-cert-row{grid-template-columns:1fr!important}
        }
      `}</style>
    </ClubPage>
  );
}


const TEAM_PERMISSION_OPTIONS = [
  ["schedule.view", "View schedule"],
  ["players.view", "View players"],
  ["sessions.create", "Create sessions"],
  ["sessions.edit", "Edit sessions"],
  ["attendance.mark", "Mark attendance"],
  ["attendance.view_totals", "View attendance totals"],
  ["availability.view_team", "View team availability"],
  ["availability.manage_team", "Manage team availability"],
  ["events.create", "Create events"],
  ["events.edit", "Edit events"],
  ["messages.send", "Send messages"],
  ["announcements.send", "Send announcements"],
  ["reminders.send", "Send reminders"],
  ["subgroups.manage", "Manage sub-groups"],
  ["members.manage", "Manage team members"],
  ["coach_content.manage", "Manage Coach content"],
  ["academy.publish", "Publish Academy content"],
  ["team_permissions.manage", "Manage team permissions"],
  ["club.pitch_allocations.view", "View Club pitch allocations"],
  ["club.contacts.view", "View key Club contacts"],
];

const SYSTEM_TEAM_ROLE_PRESETS = [
  {
    key: "lead_coach",
    label: "Lead Coach",
    description: "Full Coach, Academy and Connect control for the assigned team, including team permissions.",
    permissions: TEAM_PERMISSION_OPTIONS.map(([key]) => key),
  },
  {
    key: "team_admin",
    label: "Team Admin",
    description: "Team logistics and Connect administration without automatic coaching-content control.",
    permissions: ["schedule.view","players.view","attendance.mark","attendance.view_totals","availability.view_team","availability.manage_team","events.create","events.edit","messages.send","announcements.send","reminders.send","subgroups.manage","members.manage"],
  },
  {
    key: "coach",
    label: "Coach",
    description: "Assigned coaching functions. Extra Connect permissions can be added per person/team.",
    permissions: ["schedule.view","players.view","sessions.create","sessions.edit","coach_content.manage","messages.send"],
  },
  {
    key: "mentor",
    label: "Mentor",
    description: "Read-only team access by default.",
    permissions: ["schedule.view"],
  },
];

function roleKeyFromLabel(label = "") {
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function ClubPermissionsScreen({ club, userRole, ageGroups = [] }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [roleDraft, setRoleDraft] = useState({ label: "", description: "", permissions: [] });
  const [roleSaving, setRoleSaving] = useState(false);
  const [assignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState({ email: "", teamKey: "", teamLabel: "", roles: [] });
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const isSuperAdmin = userRole?.role === "super_admin";
  const canManageRoles = ["super_admin", "admin"].includes(userRole?.role);
  const roles = ["super_admin", "admin", "lead_coach", "coach_mentor"];

  const permMatrix = {
    super_admin: { coach: "full", club: "full", academy: "full", cup: "full", permissions: "manage", drills: "create/edit/delete", teams: "manage" },
    admin: { coach: "full", club: "full", academy: "full", cup: "full", permissions: "manage", drills: "create/edit", teams: "manage" },
    lead_coach: { coach: "full", club: "view", academy: "view", cup: "view", permissions: "view", drills: "create/edit", teams: "manage assigned" },
    coach_mentor: { coach: "read only", club: "read only", academy: "read only", cup: "read only", permissions: "none", drills: "read only", teams: "view assigned" },
  };

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    const [{ data, error: loadError }, { data: staffData, error: staffError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from("user_roles").select("*").order("user_email").order("squad_key"),
      club?.id
        ? supabase
            .from("team_staff")
            .select("id, role, roles, permission_overrides, status, age_group_id, coach:coaches(id,email,user_id), team:age_groups(id,label,gender)")
            .eq("club_id", club.id)
            .eq("status", "active")
        : Promise.resolve({ data: [], error: null }),
      club?.id
        ? supabase
            .from("team_role_definitions")
            .select("id, role_key, label, description, permissions, is_active")
            .eq("club_id", club.id)
            .eq("is_active", true)
            .order("label")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (loadError) {
      setUsers([]);
      setError(loadError.message);
    } else {
      setUsers(data || []);
    }

    if (staffError) {
      console.warn("Unable to load exact team assignments:", staffError.message);
      setTeamAssignments([]);
    } else {
      setTeamAssignments(staffData || []);
    }

    if (roleError) {
      console.warn("Unable to load custom team roles:", roleError.message);
      setCustomRoles([]);
    } else {
      setCustomRoles(roleData || []);
    }

    setLoading(false);
  }

  function assignmentsForUser(user) {
    const email = String(user?.user_email || user?.email || "").trim().toLowerCase();
    if (!email) return [];
    return (teamAssignments || []).filter((row) =>
      String(row.coach?.email || "").trim().toLowerCase() === email
    );
  }


  const availableTeamRoles = [
    ...SYSTEM_TEAM_ROLE_PRESETS.map((role) => ({ key: role.key, label: role.label, description: role.description })),
    ...customRoles.map((role) => ({ key: role.role_key, label: role.label, description: role.description || "Custom team role" })),
  ];

  const assignmentGroups = (() => {
    const groups = new Map();
    (users || []).forEach((row) => {
      const email = String(row.user_email || "").trim().toLowerCase();
      const teamKey = String(row.squad_key || row.squad || "").trim();
      const role = String(row.role || "").trim();
      if (!email || !teamKey || !role || teamKey.toLowerCase() === "all") return;
      const key = `${email}::${teamKey.toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, { email, teamKey, teamLabel: row.squad || teamKey, roles: [], rows: [] });
      const group = groups.get(key);
      if (!group.roles.includes(role)) group.roles.push(role);
      group.rows.push(row);
    });
    return [...groups.values()].sort((a, b) => a.email.localeCompare(b.email) || a.teamLabel.localeCompare(b.teamLabel));
  })();

  function openAssignmentEditor(group = null) {
    setError("");
    if (group) {
      setAssignmentDraft({ email: group.email, teamKey: group.teamKey, teamLabel: group.teamLabel, roles: [...group.roles] });
    } else {
      const firstTeam = ageGroups?.[0];
      setAssignmentDraft({ email: "", teamKey: firstTeam?.label || "", teamLabel: firstTeam?.label || "", roles: [] });
    }
    setAssignmentEditorOpen(true);
  }

  function toggleAssignmentRole(roleKey) {
    setAssignmentDraft((current) => ({
      ...current,
      roles: current.roles.includes(roleKey)
        ? current.roles.filter((item) => item !== roleKey)
        : [...current.roles, roleKey],
    }));
  }

  async function saveTeamRoleAssignments() {
    if (!canManageRoles || assignmentSaving) return;
    const email = String(assignmentDraft.email || "").trim().toLowerCase();
    const teamKey = String(assignmentDraft.teamKey || "").trim();
    const selectedTeam = (ageGroups || []).find((team) => String(team.label) === teamKey);
    const teamLabel = selectedTeam?.label || assignmentDraft.teamLabel || teamKey;
    const wantedRoles = [...new Set(assignmentDraft.roles.filter(Boolean))];

    if (!email || !email.includes("@")) { setError("Enter a valid user email address."); return; }
    if (!teamKey) { setError("Choose a team."); return; }
    if (!wantedRoles.length) { setError("Select at least one team role."); return; }

    setAssignmentSaving(true);
    setError("");

    const existingRows = (users || []).filter((row) =>
      String(row.user_email || "").trim().toLowerCase() === email &&
      String(row.squad_key || row.squad || "").trim().toLowerCase() === teamKey.toLowerCase()
    );
    const existingRoles = new Set(existingRows.map((row) => String(row.role || "").trim()).filter(Boolean));
    const rowsToDelete = existingRows.filter((row) => !wantedRoles.includes(String(row.role || "").trim()));
    const rolesToInsert = wantedRoles.filter((role) => !existingRoles.has(role));

    try {
      for (const row of rowsToDelete) {
        const { error: deleteError } = await supabase.from("user_roles").delete().eq("id", row.id);
        if (deleteError) throw deleteError;
      }
      if (rolesToInsert.length) {
        const { error: insertError } = await supabase.from("user_roles").insert(
          rolesToInsert.map((role) => ({ user_email: email, squad: teamLabel, squad_key: teamKey, role }))
        );
        if (insertError) throw insertError;
      }
      setAssignmentEditorOpen(false);
      await loadUsers();
    } catch (assignmentError) {
      setError(assignmentError?.message || "Unable to save team role assignments.");
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function removeAssignmentGroup(group) {
    if (!canManageRoles || !group?.rows?.length) return;
    const confirmed = window.confirm(`Remove all ${group.teamLabel} team roles for ${group.email}?`);
    if (!confirmed) return;
    setError("");
    for (const row of group.rows) {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("id", row.id);
      if (deleteError) { setError(deleteError.message); return; }
    }
    await loadUsers();
  }

  function toggleRolePermission(permission) {
    setRoleDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function saveCustomRole() {
    if (!club?.id || !canManageRoles || roleSaving) return;
    const label = roleDraft.label.trim();
    const roleKey = roleKeyFromLabel(label);
    if (!label || !roleKey) {
      setError("Give the additional role a name.");
      return;
    }
    setRoleSaving(true);
    setError("");
    const { error: roleError } = await supabase.from("team_role_definitions").insert({
      club_id: club.id,
      role_key: roleKey,
      label,
      description: roleDraft.description.trim() || null,
      permissions: roleDraft.permissions,
      is_active: true,
    });
    if (roleError) {
      setError(roleError.message);
    } else {
      setRoleDraft({ label: "", description: "", permissions: [] });
      setRoleEditorOpen(false);
      await loadUsers();
    }
    setRoleSaving(false);
  }

  async function saveUserRole() {
    if (!editingUser || !isSuperAdmin) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.from("user_roles").update({ role: editRole }).eq("id", editingUser.id);
    if (saveError) setError(saveError.message);
    else {
      await loadUsers();
      setEditingUser(null);
    }
    setSaving(false);
  }

  function startEdit(user) {
    if (!isSuperAdmin) return;
    setEditingUser(user);
    setEditRole(user.role || "coach_mentor");
  }

  const permKeys = ["coach", "club", "academy", "cup", "permissions", "drills", "teams"];

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar title="Roles & Permissions" sub="Spraoi platform access" />
      <div style={{ padding: "20px 28px" }}>
        <div style={{ background: P.white, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.line}`, boxShadow: Sh.card, marginBottom: 20 }}>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>Your platform role</div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 800, color: P.ink, marginTop: 3 }}>{displayRoleLabel(userRole?.role)}</div>
        </div>

        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Team Roles & Permissions</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, maxWidth: 760 }}>
                Roles are permission presets. A person can hold more than one role on the same team, and person/team overrides can be added afterwards. Parent is a child/household relationship, not a team-staff role.
              </div>
            </div>
            {canManageRoles && <Btn label="Add Role" variant="primary" onClick={() => setRoleEditorOpen(true)} />}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontFamily: F.body, fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${P.line}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 9, color: P.muted, position: "sticky", left: 0, background: P.white, zIndex: 1 }}>Permission</th>
                  {[...SYSTEM_TEAM_ROLE_PRESETS, ...customRoles.map((role) => ({ key: role.role_key, label: role.label, description: role.description, permissions: role.permissions || [], custom: true }))].map((role) => (
                    <th key={role.key} title={role.description || ""} style={{ textAlign: "center", padding: "8px 10px", fontSize: 10, color: P.ink, minWidth: 120 }}>
                      {role.label}
                      {role.custom && <div style={{ fontSize: 8, marginTop: 2, color: CLUB_RED, fontWeight: 800 }}>CUSTOM</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEAM_PERMISSION_OPTIONS.map(([permission, label]) => (
                  <tr key={permission} style={{ borderBottom: `1px solid ${P.line}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: P.ink, position: "sticky", left: 0, background: P.white, zIndex: 1 }}>
                      <div>{label}</div>
                      <div style={{ fontSize: 8, color: P.muted, fontWeight: 600 }}>{permission}</div>
                    </td>
                    {[...SYSTEM_TEAM_ROLE_PRESETS, ...customRoles.map((role) => ({ key: role.role_key, permissions: role.permissions || [] }))].map((role) => {
                      const allowed = (role.permissions || []).includes(permission);
                      return (
                        <td key={`${role.key}-${permission}`} style={{ textAlign: "center", padding: "7px 8px" }}>
                          <span aria-label={allowed ? "Allowed" : "Not allowed"} style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24, borderRadius: 7, background: allowed ? "#ecfdf3" : P.soft, color: allowed ? "#16803a" : "#9aa7b6", fontWeight: 900 }}>
                            {allowed ? "✓" : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: CLUB_SOFT, fontFamily: F.body, fontSize: 9, color: P.ink }}>
            Effective team access = all assigned role presets combined + explicit person/team overrides. Backend RLS still needs to enforce the same capabilities before this is treated as the final security boundary.
          </div>
        </div>

        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink }}>Team Staff Assignments</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4, maxWidth: 760 }}>
                Assign one person to a team with one or more roles. Each selected role is stored as its own user_roles row, so roles combine rather than replacing one another. Parent/child relationships are managed separately.
              </div>
            </div>
            {canManageRoles && <Btn label="Assign Roles" variant="primary" onClick={() => openAssignmentEditor()} />}
          </div>

          {assignmentGroups.length === 0 ? (
            <div style={{ padding: "18px 14px", borderRadius: 10, background: P.soft, fontFamily: F.body, fontSize: 10, color: P.muted }}>No team-scoped staff role assignments yet.</div>
          ) : assignmentGroups.map((group) => (
            <div key={`${group.email}-${group.teamKey}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: `1px solid ${P.line}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 800, color: P.ink }}>{group.email}</span>
                  <span style={{ padding: "3px 7px", borderRadius: 999, background: CLUB_SOFT, color: CLUB_RED, fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>{group.teamLabel}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {group.roles.map((roleKey) => {
                    const role = availableTeamRoles.find((item) => item.key === roleKey);
                    return <span key={roleKey} style={{ padding: "3px 7px", borderRadius: 999, background: P.soft, border: `1px solid ${P.line}`, fontFamily: F.body, fontSize: 9, color: P.ink, fontWeight: 800 }}>{role?.label || displayRoleLabel(roleKey)}</span>;
                  })}
                </div>
              </div>
              {canManageRoles && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn label="Edit" variant="ghost" onClick={() => openAssignmentEditor(group)} />
                  <Btn label="Remove" variant="ghost" onClick={() => removeAssignmentGroup(group)} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: P.white, borderRadius: 14, padding: 18, border: `1px solid ${P.line}`, boxShadow: Sh.card }}>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: P.ink, marginBottom: 12 }}>Users & Roles</div>
          {error && <div style={{ padding: 10, borderRadius: 8, background: "#fff1f1", color: "#a91f1f", fontFamily: F.body, fontSize: 10, marginBottom: 10 }}>{error}</div>}
          {loading ? <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>Loading…</div> :
            users.map((u) => <div key={u.id} onClick={() => startEdit(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderTop: `1px solid ${P.line}`, cursor: isSuperAdmin ? "pointer" : "default" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 800, color: P.ink }}>{u.user_email || "No email"}</div>
                {(() => {
                  const assignments = assignmentsForUser(u);
                  if (assignments.length) {
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                        {assignments.map((row) => (
                          <span key={row.id} style={{ padding: "3px 7px", borderRadius: 999, background: P.soft, border: `1px solid ${P.line}`, fontFamily: F.body, fontSize: 9, color: P.ink, fontWeight: 800 }}>
                            {teamDisplayName(row.team)} · {displayRoleLabel(row.role)}
                          </span>
                        ))}
                      </div>
                    );
                  }

                  if (["super_admin", "admin", "club_admin"].includes(String(u.role || "").toLowerCase())) {
                    return <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 3 }}>All club teams</div>;
                  }

                  return <div style={{ fontFamily: F.body, fontSize: 9, color: P.muted, marginTop: 3 }}>No exact team assignment</div>;
                })()}
              </div>
              <span style={{ padding: "4px 9px", borderRadius: 999, background: CLUB_SOFT, color: CLUB_RED, fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>{displayRoleLabel(u.role)}</span>
            </div>)
          }
        </div>

        {assignmentEditorOpen && canManageRoles && (
          <div onClick={() => setAssignmentEditorOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)", overflow: "auto", background: P.white, borderRadius: 16, padding: 24, boxShadow: Sh.lift }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink }}>Assign Team Roles</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4, marginBottom: 16 }}>Choose the person and team, then tick every role they should hold for that team.</div>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.ink, marginBottom: 12 }}>User email
                <input type="email" value={assignmentDraft.email} onChange={(e) => setAssignmentDraft((current) => ({ ...current, email: e.target.value }))} placeholder="name@example.com" style={{ width: "100%", marginTop: 5, padding: "10px 11px", borderRadius: 8, border: `1px solid ${P.line}`, fontFamily: F.body }} />
              </label>
              <label style={{ display: "block", fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.ink, marginBottom: 14 }}>Team
                <select value={assignmentDraft.teamKey} onChange={(e) => { const team = (ageGroups || []).find((item) => String(item.label) === e.target.value); setAssignmentDraft((current) => ({ ...current, teamKey: e.target.value, teamLabel: team?.label || e.target.value })); }} style={{ width: "100%", marginTop: 5, padding: "10px 11px", borderRadius: 8, border: `1px solid ${P.line}`, fontFamily: F.body }}>
                  <option value="">Select team…</option>
                  {(ageGroups || []).map((team) => <option key={team.id || team.label} value={team.label}>{teamDisplayName(team, team.label)}</option>)}
                </select>
              </label>
              <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Roles</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {availableTeamRoles.map((role) => {
                  const checked = assignmentDraft.roles.includes(role.key);
                  return (
                    <label key={role.key} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px", borderRadius: 9, border: `1px solid ${checked ? "#f0a6a6" : P.line}`, background: checked ? CLUB_SOFT : P.white, cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleAssignmentRole(role.key)} style={{ marginTop: 2 }} />
                      <span>
                        <span style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink }}>{role.label}</span>
                        <span style={{ display: "block", fontFamily: F.body, fontSize: 8, color: P.muted, marginTop: 2 }}>{role.description || "Team role"}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <Btn label={assignmentSaving ? "Saving..." : "Save Assignments"} variant="primary" onClick={saveTeamRoleAssignments} />
                <Btn label="Cancel" variant="ghost" onClick={() => setAssignmentEditorOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {roleEditorOpen && canManageRoles && (
          <div onClick={() => setRoleEditorOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)", overflow: "auto", background: P.white, borderRadius: 16, padding: 24, boxShadow: Sh.lift }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.ink }}>Add Team Role</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 4, marginBottom: 16 }}>Create an additional role such as Lead Mentor, Fixtures Coordinator or Communications Lead, then choose exactly what it can do.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 12, marginBottom: 16 }} className="club-role-editor-grid">
                <label style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.ink }}>Role name
                  <input value={roleDraft.label} onChange={(e) => setRoleDraft((current) => ({ ...current, label: e.target.value }))} placeholder="e.g. Lead Mentor" style={{ width: "100%", marginTop: 5, padding: "10px 11px", borderRadius: 8, border: `1px solid ${P.line}`, fontFamily: F.body }} />
                </label>
                <label style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.ink }}>Description
                  <input value={roleDraft.description} onChange={(e) => setRoleDraft((current) => ({ ...current, description: e.target.value }))} placeholder="What is this role responsible for?" style={{ width: "100%", marginTop: 5, padding: "10px 11px", borderRadius: 8, border: `1px solid ${P.line}`, fontFamily: F.body }} />
                </label>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 800, color: P.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Permissions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }} className="club-role-permissions-grid">
                {TEAM_PERMISSION_OPTIONS.map(([permission, label]) => {
                  const checked = roleDraft.permissions.includes(permission);
                  return (
                    <label key={permission} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 10px", borderRadius: 9, border: `1px solid ${checked ? "#f0a6a6" : P.line}`, background: checked ? CLUB_SOFT : P.white, cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleRolePermission(permission)} style={{ marginTop: 2 }} />
                      <span>
                        <span style={{ display: "block", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: P.ink }}>{label}</span>
                        <span style={{ display: "block", fontFamily: F.body, fontSize: 8, color: P.muted, marginTop: 2 }}>{permission}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <Btn label={roleSaving ? "Saving..." : "Create Role"} variant="primary" onClick={saveCustomRole} />
                <Btn label="Cancel" variant="ghost" onClick={() => setRoleEditorOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {editingUser && isSuperAdmin && (
          <div onClick={() => setEditingUser(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, calc(100vw - 32px))", background: P.white, borderRadius: 16, padding: 24, boxShadow: Sh.lift }}>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 5 }}>Edit User Role</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginBottom: 16 }}>{editingUser.user_email}</div>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, marginBottom: 16 }}>
                {roles.map((r) => <option key={r} value={r}>{displayRoleLabel(r)}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label={saving ? "Saving..." : "Save Changes"} variant="primary" onClick={saveUserRole} />
                <Btn label="Cancel" variant="ghost" onClick={() => setEditingUser(null)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


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
  fontWeight: 800,
  backdropFilter: "blur(8px)",
};

function AcademyPhonePreview({ planSessions = [], extras = [], skills = [], overrides = {}, published = false, compact = false, selectedTeam = null }) {
  const recommendations = getAcademyWeeklyRecommendations(planSessions, skills, overrides, selectedTeam);
  const football = recommendations.filter((item) => item.code === "football");
  const hurling = recommendations.filter((item) => item.code === "hurling");
  const grouped = { steps: [], exercises: [], runs: [], bonus: [], recovery: [] };
  extras.forEach((extra) => grouped[academyExtraGroup(extra)].push(extra));
  const section = (title, items, color, icon, render) => items.length ? <div style={{ background:"#fff",border:`1px solid ${color}33`,borderRadius:14,padding:11,marginTop:9 }}><div style={{ display:"flex",alignItems:"center",gap:7,fontFamily:F.body,fontSize:10,fontWeight:800,color,textTransform:"uppercase" }}><span>{icon}</span>{title}</div><div style={{ display:"grid",gap:7,marginTop:8 }}>{items.map(render)}</div></div> : null;
  const taskRow=(item)=><div key={item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc" }}><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:800,color:P.ink}}>{item.title}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2}}>{item.target || item.description || item.instruction || "Complete this mission"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:800,color:"#b45309"}}>+{item.xp || item.xp_reward || 10} XP</span></div>;
  const skillRow=(item)=><div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"#f8fafc"}}><div style={{width:32,height:32,borderRadius:9,background:"#e0f2fe",display:"grid",placeItems:"center"}}>▶</div><div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontSize:10,fontWeight:800,color:P.ink}}>{item.matchedSkill?.name || "Choose weekly video"}</div><div style={{fontFamily:F.body,fontSize:8,color:P.muted,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Based on {item.sourceDrills.length} Coach drill{item.sourceDrills.length===1?"":"s"}</div></div><span style={{fontFamily:F.body,fontSize:8,fontWeight:800,color:"#b45309"}}>+20 XP</span></div>;
  const visibleCount = football.length+hurling.length+Object.values(grouped).reduce((sum,items)=>sum+items.length,0);
  return <div style={{ width: compact ? 300 : "min(390px,100%)", maxHeight: compact ? 600 : "none", overflow:"hidden", background:"#fff",borderRadius:compact?26:32,border:compact?"6px solid #16324a":"8px solid #16324a",boxShadow:"0 22px 52px rgba(7,89,133,.2)" }}><div style={{background:"linear-gradient(135deg,#38bdf8,#0284c7)",padding:compact?"16px 14px":"22px 18px",color:"#fff",position:"relative",overflow:"hidden"}}><img src="/spraoi-academy-icon.png" alt="" style={{position:"absolute",right:8,bottom:-8,width:compact?68:88,height:compact?68:88,objectFit:"contain",background:"#fff",borderRadius:18,padding:6}}/><div style={{fontFamily:F.body,fontSize:8,fontWeight:800,opacity:.85,textTransform:"uppercase"}}>Club Spraoi Academy</div><div style={{fontFamily:F.display,fontSize:compact?18:24,fontWeight:800,marginTop:3,maxWidth:"70%"}}>Your weekly adventure</div><div style={{display:"flex",gap:6,marginTop:11}}><span style={previewPill}>⭐ {recommendations.length*20+extras.reduce((s,x)=>s+Number(x.xp||x.xp_reward||0),0)} XP</span><span style={previewPill}>🏅 Badges</span></div></div><div style={{padding:compact?10:15,background:"#f3f9fd",maxHeight:compact?460:"none",overflowY:"auto"}}>{visibleCount===0?<div style={{padding:18,textAlign:"center",fontFamily:F.body,fontSize:10,color:P.muted}}>Add weekly content to see the child experience here.</div>:<>{section("Step Goals",grouped.steps,"#0f9f6e","👟",taskRow)}{section("Exercises",grouped.exercises,"#7c3aed","💪",taskRow)}{section("Run Challenge",grouped.runs,"#D89A00","🏃",taskRow)}{section("Football Skills",football,"#2563eb","⚽",skillRow)}{section(selectedTeam?.gender === "girls" ? "Camogie Skills" : "Hurling Skills",hurling,"#dc2626","🏑",skillRow)}{section("Bonus",grouped.bonus,"#d97706","✨",taskRow)}{section("Rest & Recovery",grouped.recovery,"#0f766e","🌙",taskRow)}</>}<div style={{marginTop:10,padding:9,borderRadius:11,background:published?"#dcfce7":"#fff7ed",color:published?"#15803d":"#b45309",fontFamily:F.body,fontSize:8,fontWeight:800,textAlign:"center"}}>{published?"✓ Published to children":"Preview mode · not published"}</div></div></div>;
}

function AcademyDashboardScreen({ selectedTeam, weeklyPlan, planSessions, extras = [], skills = [], overrides = {}, published = false, onSetOverride, onNav }) {
  const academyBlue = "#2563EB";
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
          <div style={{ fontFamily: F.display, fontSize: 27, lineHeight: 1.15, fontWeight: 800, color: P.ink, marginTop: 8 }}>{value}</div>
        </div>
        <div className="spraoi-card-icon-chip" style={{ "--card-accent": accent }}>
          {typeof icon === "string" && icon.startsWith("/") ? <img className="spraoi-card-icon" src={icon} alt="" aria-hidden="true" /> : <span className="spraoi-card-icon-fallback" style={{ "--card-accent": accent }}>{icon}</span>}
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
        <Btn label="Manage Weekly Content" variant="primary" onClick={() => onNav("academy-content")} style={{ background: academyBlue, boxShadow: "0 5px 16px rgba(2,119,189,.22)" }} />
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
              <h2 style={{ fontFamily: F.display, fontSize: 25, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-.025em", margin: "13px 0 7px" }}>
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
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Suggested Weekly Videos</div>
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
                          <span style={{ fontFamily: F.body, fontSize: 9, lineHeight: 1, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".06em" }}>{rec.label}</span>
                          <span style={{ width: 3, height: 3, borderRadius: "50%", background: P.line }} />
                          <span style={{ fontFamily: F.body, fontSize: 9, color: P.muted }}>Based on {rec.sourceDrills.length} Coach drill{rec.sourceDrills.length===1?"":"s"}</span>
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 800, color: P.ink, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewSkill?.name || "No video match"}</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginTop: 3 }}>One weekly child video for this code</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                        <span style={{ padding: "5px 8px", borderRadius: 999, background: selected ? "#dcfce7" : "#fff7ed", color: selected ? "#15803d" : "#c2410c", fontFamily: F.body, fontSize: 9, fontWeight: 800 }}>{isPreviewSelected ? "Selected" : "Suggested"}</span>
                        <div className="academy-match-actions" style={{display:"flex",gap:6,flexWrap:"wrap"}}><button onClick={()=>setPreviewIndexes((current)=>({...current,[rec.code]:Math.max(0,previewIndex-1)}))} disabled={previewIndex===0} style={{height:30,borderRadius:8,border:`1px solid ${P.line}`,background:"#fff",color:previewIndex===0?P.muted:academyBlue,padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:800,cursor:previewIndex===0?"default":"pointer"}}>Previous</button><button onClick={()=>setPreviewIndexes((current)=>({...current,[rec.code]:Math.min(options.length-1,previewIndex+1)}))} disabled={previewIndex>=options.length-1} style={{height:30,borderRadius:8,border:`1px solid ${P.line}`,background:"#fff",color:previewIndex>=options.length-1?P.muted:academyBlue,padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:800,cursor:previewIndex>=options.length-1?"default":"pointer"}}>Next suggestion</button>{previewSkill?.id && !isPreviewSelected && <button onClick={() => onSetOverride?.(rec.code, previewSkill.id)} style={{height:30,borderRadius:8,border:0,background:academyBlue,color:"#fff",padding:"0 10px",fontFamily:F.body,fontSize:9,fontWeight:800,cursor:"pointer"}}>Use this video</button>}<span style={{alignSelf:"center",fontFamily:F.body,fontSize:9,color:P.muted}}>Suggestion {options.length?previewIndex+1:0} of {options.length}</span></div>
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
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Weekly engagement</div>
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
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink }}>41</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>practice opens</span></div>
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink }}>29</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>completions</span></div>
                <div><span style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink }}>8</span><span style={{ fontFamily: F.body, fontSize: 10, color: P.muted, marginLeft: 5 }}>active streaks</span></div>
              </div>
            </section>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Publish readiness</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>{completedSetupSteps} of {setupSteps.length} steps complete</div>
                </div>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: `conic-gradient(${academyBlue} ${setupProgress * 3.6}deg, #e8edf3 0deg)`, display: "grid", placeItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: P.white, display: "grid", placeItems: "center", fontFamily: F.body, fontSize: 10, fontWeight: 800, color: academyDark }}>{setupProgress}%</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
                {setupSteps.map((step, index) => (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", background: step.complete ? "#dcfce7" : "#f1f5f9", color: step.complete ? "#15803d" : "#94a3b8", fontFamily: F.body, fontSize: 10, fontWeight: 800 }}>{step.complete ? "✓" : index + 1}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: step.complete ? 600 : 700, color: step.complete ? P.muted : P.ink, textDecoration: step.complete ? "line-through" : "none" }}>{step.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => onNav("academy-content")} style={{ width: "100%", height: 36, borderRadius: 9, border: "none", background: academyBlue, color: P.white, fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: "pointer", marginTop: 18 }}>Continue setup</button>
            </section>

            <section style={{ background: P.white, borderRadius: 16, border: `1px solid ${P.line}`, boxShadow: Sh.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>Parent access</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted, marginTop: 2 }}>5 invitations still need attention</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center", fontWeight: 800 }}>@</div>
              </div>
              <div style={{ marginTop: 15, height: 7, borderRadius: 999, background: "#e8edf3", overflow: "hidden" }}><div style={{ width: "79%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #0284c7, #22d3ee)" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                <span style={{ fontFamily: F.body, fontSize: 10, color: P.muted }}>19 linked</span>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: academyBlue }}>79%</span>
              </div>
              <button onClick={() => onNav("academy-parents")} style={{ width: "100%", height: 34, borderRadius: 9, border: `1px solid ${P.line}`, background: P.white, color: P.ink, fontFamily: F.body, fontSize: 10, fontWeight: 800, cursor: "pointer", marginTop: 14 }}>Manage parent access</button>
            </section>

            <section style={{ background: academySoft, borderRadius: 16, border: "1px solid #cfeeff", padding: 16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12 }}><div><div style={{ fontFamily:F.display,fontSize:16,fontWeight:800,color:academyDark }}>Live child preview</div><div style={{fontFamily:F.body,fontSize:10,color:"#477084",marginTop:2}}>Only sections with content are shown.</div></div><button onClick={()=>onNav("academy-preview")} style={{border:0,background:"transparent",color:academyBlue,fontFamily:F.body,fontSize:10,fontWeight:800,cursor:"pointer"}}>Open full →</button></div>
              <div style={{display:"grid",placeItems:"center"}}><AcademyPhonePreview planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} compact selectedTeam={selectedTeam} /></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACADEMY_BLUE = "#2563EB";
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
        <div><div style={{ fontFamily: F.display, fontSize: 21, fontWeight: 700, color: ACADEMY_DARK }}>{title}</div><div style={{ fontFamily: F.body, fontSize: 12, color: "#4c7187", marginTop: 2 }}>{sub}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}

function AcademyCard({ children, style }) { return <div style={{ background: P.white, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18, boxShadow: Sh.card, ...style }}>{children}</div>; }
function AcademyBadge({ children, color = ACADEMY_BLUE, bg = ACADEMY_SOFT }) { return <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 8px", borderRadius: 999, background: bg, color, fontFamily: F.body, fontSize: 9, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>; }

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
    { key:"run", label:"Run Challenge", icon:"🏃", color:"#D89A00", test:x=>(x.type||x.activity_type)==="run" },
    { key:"skill", label:"Extra Skill Practice", icon:"🎯", color:"#2563eb", test:x=>(x.type||x.activity_type)==="skill" },
    { key:"club", label:"Bonus & Club Activities", icon:"✨", color:"#d97706", test:x=>(x.type||x.activity_type)==="club" },
    { key:"recovery", label:"Rest & Recovery", icon:"🌙", color:"#0f766e", test:x=>(x.type||x.activity_type)==="recovery" },
  ];
  return <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
    <AcademyPageHeader title="Weekly Content" sub={`${selectedTeam?.label || "Selected team"} · Build, review and publish the child experience`} actions={<Btn label={published ? "Unpublish week" : "Review & publish"} variant="primary" icon={published ? "↓" : "↑"} onClick={requestPublish} style={{ background: published ? P.green : ACADEMY_BLUE }} />} />
    <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><AcademyBadge>Weekly readiness</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:800,color:P.ink,marginTop:8}}>{published?"This week is live":"Complete the checks before publishing"}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{validation.map(v=><AcademyBadge key={v.label} color={v.ok?"#15803d":"#b45309"} bg={v.ok?"#dcfce7":"#fff7ed"}>{v.ok?"✓":"!"} {v.label}</AcademyBadge>)}</div></div>
      </AcademyCard>
      <AcademyCard style={{ marginBottom: 16, borderColor: "#b9e3f8" }}>
        <div><AcademyBadge>Suggested weekly videos</AcademyBadge><div style={{fontFamily:F.display,fontSize:18,fontWeight:800,color:P.ink,marginTop:8}}>One video per code</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Browse suggestions, then explicitly select the Football and {selectedTeam?.gender === "girls" ? "Camogie" : "Hurling"} videos for this week.</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginTop:16}}>{recommendations.map(rec=>{const options=rec.alternatives?.length?rec.alternatives:(rec.matchedSkill?[rec.matchedSkill]:[]);const idx=Math.min(previewIndexes[rec.code]??Math.max(0,options.findIndex(x=>x.id===rec.matchedSkill?.id)),Math.max(0,options.length-1));const skill=options[idx]||rec.matchedSkill;const selected=overrides?.[rec.code]===skill?.id;return <div key={rec.code} style={{border:`1px solid ${selected?"#86efac":"#bae6fd"}`,borderRadius:16,padding:15,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><AcademyBadge color={rec.code==="football"?"#1d4ed8":"#b91c1c"} bg={rec.code==="football"?"#dbeafe":"#fee2e2"}>{rec.label}</AcademyBadge><AcademyBadge color={selected?"#15803d":"#0369a1"} bg={selected?"#dcfce7":"#e0f2fe"}>{selected?"Selected":"Suggestion"}</AcademyBadge></div><div style={{fontFamily:F.display,fontSize:18,fontWeight:800,color:P.ink,marginTop:10}}>{skill?.name||"No match available"}</div>{skill?.video_url&&<div style={{borderRadius:11,overflow:"hidden",background:"#071827",marginTop:10}}><iframe title={skill.name} src={skill.video_url.replace("watch?v=","embed/").split("&")[0]} style={{width:"100%",height:180,border:0,display:"block"}} allowFullScreen /></div>}<div className="academy-match-actions" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7,marginTop:10}}><button disabled={idx===0} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.max(0,idx-1)}))} style={smallAction(idx===0)}>Previous</button><button disabled={idx>=options.length-1} onClick={()=>setPreviewIndexes(p=>({...p,[rec.code]:Math.min(options.length-1,idx+1)}))} style={smallAction(idx>=options.length-1)}>Next suggestion</button><button disabled={!skill?.id||selected} onClick={()=>skill?.id&&onSetOverride?.(rec.code,skill.id)} style={{...smallAction(false),background:selected?"#dcfce7":ACADEMY_BLUE,color:selected?"#15803d":"#fff",border:0}}>{selected?"Selected":"Use this video"}</button></div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:7}}>Suggestion {options.length?idx+1:0} of {options.length} · based on {rec.sourceDrills.length} Coach activities</div></div>})}</div>
      </AcademyCard>
      <div className="academy-content-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, alignItems:"start" }}>
        <AcademyCard>
          <div style={{fontFamily:F.display,fontSize:18,fontWeight:800,color:P.ink}}>{editingId?"Edit activity":"Add an activity"}</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>Add multiple items to a section; they will appear together on one child card.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8,marginTop:13}}>{ACADEMY_TEMPLATES.map(t=><button key={t.title} onClick={()=>applyTemplate(t)} style={{border:`1px solid ${P.line}`,borderRadius:12,background:P.white,padding:10,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:20}}>{t.icon}</div><div style={{fontFamily:F.body,fontSize:10,fontWeight:800,color:P.ink,marginTop:4}}>{t.title}</div><div style={{fontFamily:F.body,fontSize:9,color:ACADEMY_BLUE}}>{t.xp} XP</div></button>)}</div>
          <div className="academy-form-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:15}}><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Activity name</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={inputStyle}/></label><label style={{gridColumn:"1/-1"}}><span style={labelStyle}>Child instructions</span><textarea value={draft.instruction} onChange={e=>setDraft({...draft,instruction:e.target.value})} style={{...inputStyle,minHeight:72,paddingTop:9}}/></label><label><span style={labelStyle}>Target</span><input value={draft.target} onChange={e=>setDraft({...draft,target:e.target.value})} style={inputStyle}/></label><label><span style={labelStyle}>XP</span><input type="number" min="0" value={draft.xp} onChange={e=>setDraft({...draft,xp:Number(e.target.value)})} style={inputStyle}/></label><label><span style={labelStyle}>Section</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})} style={inputStyle}><option value="steps">Step Goals</option><option value="exercise">Exercises</option><option value="run">Run Challenge</option><option value="skill">Extra Skill Practice</option><option value="club">Bonus & Club Activity</option><option value="recovery">Rest & Recovery</option></select></label><label style={{display:"flex",alignItems:"center",gap:8,marginTop:22,fontFamily:F.body,fontSize:11}}><input type="checkbox" checked={draft.required} onChange={e=>setDraft({...draft,required:e.target.checked})}/> Required</label></div>
          <div style={{display:"flex",gap:8,marginTop:13}}><button onClick={saveDraft} style={{height:38,border:0,borderRadius:10,background:ACADEMY_BLUE,color:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:800,cursor:"pointer"}}>{editingId?"Save changes":"＋ Add to week"}</button>{editingId&&<button onClick={resetDraft} style={{height:38,border:`1px solid ${P.line}`,borderRadius:10,background:"#fff",padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:800,cursor:"pointer"}}>Cancel</button>}</div>
        </AcademyCard>
        <div style={{display:"grid",gap:12}}>{groups.map(group=>{const items=extras.filter(group.test);if(!items.length)return null;return <AcademyCard key={group.key} style={{borderTop:`4px solid ${group.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:800,color:P.ink}}>{group.icon} {group.label}</div><AcademyBadge>{items.length}</AcademyBadge></div><div style={{display:"grid",gap:8,marginTop:10}}>{items.map((x,i)=><div key={x.id} style={{border:`1px solid ${P.line}`,borderRadius:11,padding:11,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontFamily:F.body,fontSize:11,fontWeight:800,color:P.ink}}>{x.title}</div><div style={{fontFamily:F.body,fontSize:9,color:P.muted,marginTop:2}}>{x.target||x.instruction||x.description}</div></div><div style={{display:"flex",gap:3}}><button title="Move up" disabled={i===0} onClick={()=>onMoveExtra?.(x.id,-1,group.test)} style={iconAction(i===0)}>↑</button><button title="Move down" disabled={i===items.length-1} onClick={()=>onMoveExtra?.(x.id,1,group.test)} style={iconAction(i===items.length-1)}>↓</button><button title="Edit" onClick={()=>beginEdit(x)} style={iconAction(false)}>✎</button><button title="Remove" onClick={()=>onRemoveExtra(x.id)} style={{...iconAction(false),color:"#dc2626"}}>×</button></div></div><div style={{display:"flex",gap:6,marginTop:7}}><AcademyBadge color="#b45309" bg="#fff7ed">{x.xp||x.xp_reward||0} XP</AcademyBadge>{x.required&&<AcademyBadge color="#b91c1c" bg="#fef2f2">Required</AcademyBadge>}</div></div>)}</div></AcademyCard>})}</div>
      </div>
    </div>
    {publishReview&&<div style={{position:"fixed",inset:0,zIndex:5000,background:"rgba(15,23,42,.55)",display:"grid",placeItems:"center",padding:18}}><div style={{width:"min(520px,100%)",background:"#fff",borderRadius:20,padding:22,boxShadow:"0 30px 80px rgba(15,23,42,.3)"}}><div style={{fontFamily:F.display,fontSize:22,fontWeight:800,color:P.ink}}>Review before publishing</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:5}}>Only published content is visible in the child app for {selectedTeam?.label||"this team"}.</div><div style={{display:"grid",gap:8,marginTop:16}}>{validation.map(v=><div key={v.label} style={{display:"flex",justifyContent:"space-between",padding:10,borderRadius:10,background:v.ok?"#f0fdf4":"#fff7ed",fontFamily:F.body,fontSize:11,fontWeight:800,color:v.ok?"#15803d":"#b45309"}}><span>{v.label}</span><span>{v.ok?"Ready":"Needs attention"}</span></div>)}</div><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,flexWrap:"wrap"}}><button onClick={()=>setPublishReview(false)} style={modalButton(false)}>Keep editing</button><button disabled={!canPublish} onClick={()=>{if(canPublish){onPublish?.();setPublishReview(false)}}} style={{...modalButton(true),opacity:canPublish?1:.45,cursor:canPublish?"pointer":"default"}}>Publish to children</button></div></div></div>}
  </div>;
}
const smallAction=(disabled)=>({height:36,border:`1px solid ${P.line}`,borderRadius:9,background:"#fff",color:disabled?P.muted:ACADEMY_BLUE,fontFamily:F.body,fontSize:9,fontWeight:800,cursor:disabled?"default":"pointer"});
const iconAction=(disabled)=>({width:28,height:28,border:`1px solid ${P.line}`,borderRadius:7,background:"#fff",color:disabled?"#cbd5e1":P.ink,cursor:disabled?"default":"pointer",fontWeight:800});
const modalButton=(primary)=>({height:38,border:primary?0:`1px solid ${P.line}`,borderRadius:10,background:primary?ACADEMY_BLUE:"#fff",color:primary?"#fff":P.ink,padding:"0 15px",fontFamily:F.body,fontSize:11,fontWeight:800,cursor:"pointer"});
const labelStyle={display:"block",fontFamily:F.body,fontSize:9,fontWeight:800,color:P.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5};
const inputStyle={width:"100%",height:38,border:`1px solid ${P.line}`,borderRadius:9,padding:"0 10px",boxSizing:"border-box",fontFamily:F.body,fontSize:11,color:P.ink,background:P.white,outline:"none"};

function AcademyPlayers({ selectedTeam }) { const players=Array.from({length:12},(_,i)=>({id:i,name:["Aoife Murphy","Cian Byrne","Saoirse Kelly","Rory Walsh","Niamh Doyle","Oisín Ryan","Emma Nolan","Darragh Flynn","Lucy Brennan","Conor Murray","Mia O'Brien","Sean Gallagher"][i],xp:420-i*21,streak:(i%5)+1})); return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Players" sub={`${selectedTeam?.label||"Team"} · Academy profiles and progress`} /><div style={{padding:24,maxWidth:1180,margin:"0 auto"}}><AcademyCard><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>{players.map(p=><div key={p.id} style={{border:`1px solid ${P.line}`,borderRadius:13,padding:13,display:"flex",alignItems:"center",gap:11}}><div style={{width:40,height:40,borderRadius:"50%",background:ACADEMY_SOFT,color:ACADEMY_BLUE,display:"grid",placeItems:"center",fontWeight:800}}>{p.name[0]}</div><div style={{flex:1}}><div style={{fontFamily:F.body,fontSize:12,fontWeight:800,color:P.ink}}>{p.name}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:2}}>{p.xp} XP · {p.streak} day streak</div></div><span style={{fontSize:17}}>🔥</span></div>)}</div></AcademyCard></div></div>; }

function AcademyParents({ selectedTeam, parentRows, setParentRows }) {
  const [teamLink] = useState(()=>`${window.location.origin}/academy/join/${selectedTeam?.id||"club-spraoi"}`);
  const parseFile = (file) => { const r=new FileReader(); r.onload=()=>{ const lines=String(r.result||"").split(/\r?\n/).filter(Boolean); const headers=lines.shift()?.split(",").map(h=>h.trim().toLowerCase())||[]; const find=(names)=>headers.findIndex(h=>names.includes(h)); const pi=find(["parent name","parent","guardian name"]), ei=find(["parent email","email","guardian email"]), ci=find(["child name","child","player name"]); const rows=lines.map((l,i)=>{const c=l.split(",").map(x=>x.trim());return{id:`upload-${Date.now()}-${i}`,parent:c[pi]||"",email:c[ei]||"",child:c[ci]||"",status:c[ei]&&c[ci]?"Ready":"Needs review",link:`${teamLink}?invite=${i+1}`}}); setParentRows(rows); }; r.readAsText(file); };
  const copy=(text)=>navigator.clipboard?.writeText(text);
  return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Parent Access" sub={`${selectedTeam?.label||"Team"} · Upload families and send child-app invitations`} actions={<Btn label="Copy team link" variant="primary" icon="⧉" onClick={()=>copy(teamLink)} style={{background:ACADEMY_BLUE}}/>}/><div style={{padding:24,maxWidth:1180,margin:"0 auto",display:"grid",gap:16}}>
    <AcademyCard><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center"}}><div><div style={{fontFamily:F.display,fontSize:18,fontWeight:800,color:P.ink}}>Upload parent and child list</div><div style={{fontFamily:F.body,fontSize:11,color:P.muted,marginTop:4}}>CSV columns: Parent Name, Parent Email, Child Name. One parent can appear on multiple rows for multiple children.</div></div><label style={{height:38,padding:"0 14px",borderRadius:10,background:ACADEMY_BLUE,color:"#fff",display:"flex",alignItems:"center",fontFamily:F.body,fontSize:11,fontWeight:800,cursor:"pointer"}}>Upload CSV<input type="file" accept=".csv,text/csv" onChange={(e)=>e.target.files?.[0]&&parseFile(e.target.files[0])} style={{display:"none"}}/></label></div></AcademyCard>
    <AcademyCard><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><div style={{fontFamily:F.display,fontSize:17,fontWeight:800,color:P.ink}}>Invitation review</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:3}}>{parentRows.length} family links prepared</div></div><button onClick={()=>setParentRows(rows=>rows.map(r=>({...r,status:r.email&&r.child?"Sent":r.status})))} style={{height:36,border:0,borderRadius:9,background:parentRows.length?ACADEMY_BLUE:"#cbd5e1",color:"#fff",padding:"0 13px",fontFamily:F.body,fontSize:10,fontWeight:800,cursor:parentRows.length?"pointer":"default"}}>Send all ready invitations</button></div>
    <div style={{overflowX:"auto",marginTop:14}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}><thead><tr>{["Parent","Email","Child","Status","App link"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 8px",borderBottom:`1px solid ${P.line}`,fontFamily:F.body,fontSize:9,color:P.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{parentRows.length===0?<tr><td colSpan="5" style={{padding:22,textAlign:"center",fontFamily:F.body,fontSize:11,color:P.muted}}>Upload a CSV to review parent-child links.</td></tr>:parentRows.map(r=><tr key={r.id}><td style={td}>{r.parent}</td><td style={td}>{r.email}</td><td style={td}>{r.child}</td><td style={td}><AcademyBadge color={r.status==="Sent"?"#15803d":r.status==="Ready"?ACADEMY_BLUE:"#b45309"} bg={r.status==="Sent"?"#dcfce7":r.status==="Ready"?ACADEMY_SOFT:"#fff7ed"}>{r.status}</AcademyBadge></td><td style={td}><button onClick={()=>copy(r.link)} style={{border:`1px solid ${P.line}`,background:P.white,borderRadius:8,padding:"6px 9px",fontFamily:F.body,fontSize:9,fontWeight:800,cursor:"pointer"}}>Copy link</button></td></tr>)}</tbody></table></div></AcademyCard>
  </div></div>;
}
const td={padding:"10px 8px",borderBottom:`1px solid ${P.line}`,fontFamily:F.body,fontSize:10,color:P.ink};

function AcademyPreview({ planSessions, extras, skills = [], overrides = {}, published, selectedTeam }) { return <div style={{flex:1,overflow:"auto",background:"linear-gradient(180deg,#e8f7ff,#f8fbff)"}}><AcademyPageHeader title="Child Preview" sub="Exactly what a child will see after publishing" /><div style={{padding:24,display:"grid",placeItems:"center"}}><AcademyPhonePreview planSessions={planSessions} extras={extras} skills={skills} overrides={overrides} published={published} selectedTeam={selectedTeam} /></div></div>;
}


function AcademyEngagement() { return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Engagement" sub="Completion, activity and invitation health" /><div style={{padding:24,maxWidth:1180,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}><MetricCard label="Active children" value="17" detail="of 24 this week" accent={ACADEMY_BLUE} icon="✓"/><MetricCard label="Completion" value="68%" detail="across all missions" accent="#0ea5e9" icon="◒"/><MetricCard label="XP earned" value="4,820" detail="this week" accent="#7c3aed" icon="★"/><MetricCard label="Parent opens" value="83%" detail="invitation and app links" accent="#16a34a" icon="↗"/></div></div>; }

function AcademySettings({ published }) { return <div style={{flex:1,overflow:"auto",background:P.soft}}><AcademyPageHeader title="Settings" sub="Publishing, XP, privacy and parent access defaults" /><div style={{padding:24,maxWidth:900,margin:"0 auto",display:"grid",gap:12}}>{[["Publishing","Only published weeks are visible in the child app.",published?"Published":"Draft"],["Leaderboard privacy","Use first name plus surname initial by default.","Enabled"],["Default XP","Coach foundations receive 20 XP unless changed.","20 XP"],["Parent claiming","Parents can link multiple children using one account.","Enabled"]].map(x=><AcademyCard key={x[0]}><div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}><div><div style={{fontFamily:F.body,fontSize:12,fontWeight:800,color:P.ink}}>{x[0]}</div><div style={{fontFamily:F.body,fontSize:10,color:P.muted,marginTop:3}}>{x[1]}</div></div><AcademyBadge>{x[2]}</AcademyBadge></div></AcademyCard>)}</div></div>; }

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
  if (module.label === "Club") {
    return (
      <div style={{ flex: 1, minHeight: "100vh", overflow: "auto", background: `linear-gradient(180deg, ${module.color}12 0%, ${P.soft} 380px)` }}>
        <TopBar title={screenLabel} sub={`Club · ${clubName}`} />
        <div style={{ minHeight: "calc(100vh - 92px)", display: "grid", placeItems: "center", padding: "44px 24px" }}>
          <div style={{ width: "min(780px, 100%)", textAlign: "center", padding: "68px 38px", borderRadius: 30, background: `linear-gradient(145deg, ${module.color}18 0%, ${module.color}40 100%)`, border: `2px solid ${module.color}42`, boxShadow: "0 20px 54px rgba(16,36,62,.11)" }}>
            <div style={{ width: 118, height: 118, borderRadius: 32, margin: "0 auto 26px", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 14px 34px rgba(16,36,62,.15)" }}>
              <img src={module.icon} alt="" style={{ width: 82, height: 82, objectFit: "contain" }} />
            </div>
            <div style={{ display: "inline-block", padding: "8px 16px", borderRadius: 999, background: module.color, color: "#fff", fontFamily: F.body, fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 20 }}>Spraoi Club</div>
            <div style={{ fontFamily: F.display, fontSize: "clamp(44px, 7vw, 78px)", lineHeight: .94, fontWeight: 1000, letterSpacing: "-.05em", color: P.ink }}>COMING SOON</div>
            <div style={{ margin: "22px auto 0", maxWidth: 540, fontFamily: F.body, fontSize: 15, lineHeight: 1.65, color: P.muted }}>{screenLabel} is planned for the Club module and is coming soon.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: `linear-gradient(180deg, ${module.color}0d 0%, ${P.soft} 320px)` }}>
      <TopBar title={screenLabel} sub={`${module.label} · ${clubName}`} />
      <div style={{ padding: "28px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ borderRadius: 22, padding: "28px 30px", background: `linear-gradient(135deg, ${module.color} 0%, ${module.color}c9 100%)`, color: module.id === "connect" ? "#332800" : "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, boxShadow: `0 18px 40px ${module.color}30`, marginBottom: 22 }}>
          <div style={{ maxWidth: 650 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", opacity: .72, marginBottom: 8 }}>{module.label} module</div>
            <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 800, lineHeight: 1.05, marginBottom: 8 }}>{screenLabel}</div>
            <div style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.55, opacity: .88 }}>{module.tagline}</div>
          </div>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 16px 34px rgba(15,23,42,.16)" }}>
            <img src={module.icon} alt={`${module.label} icon`} style={{ width: 88, height: 88, objectFit: "contain" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {module.nav.slice(0, 4).map((item, index) => (
            <div key={item.id} style={{ background: P.white, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18, boxShadow: Sh.card }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: `${module.color}12`, color: module.color, fontSize: 18, fontWeight: 800, marginBottom: 13 }}>{item.icon}</div>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, color: P.ink }}>{item.label}</div>
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
          <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: P.ink, margin: "0 0 8px" }}>{module.label} access required</h2>
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
function MobileHeader({ activeModule, setActiveModule, onNav, enabledModules, club, selectedTeam, ageGroups = [], myTeams = [], onSelectTeam, onShowProfile, userInitial }) {
  const [open, setOpen] = useState(false);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  const mobileTeams = myTeams?.length ? ageGroups.filter((ag) => myTeams.includes(ag.id)) : ageGroups;
  const initial = userInitial || clubName[0];

  function openModule(key, module) {
    if (!enabledModules.includes(key)) {
      onNav(`access-denied-${key}`);
      setOpen(false);
      return;
    }
    if (key !== APP_MODULE) {
      openAdminModule(key, module.nav[0].id);
      return;
    }
    setActiveModule(APP_MODULE);
    onNav(module.nav[0].id);
    setOpen(false);
  }

  return (
    <>
      <div className="spraoi-mobile-app-header" data-module={activeModule}>
        <div className="spraoi-mobile-app-header-row">
          <button onClick={() => setOpen(true)} className="spraoi-mobile-club-button" aria-label="Switch module">
            <img src={club?.logo_url || "/spraoi-club-icon.png"} alt={`${clubName} crest`} />
          </button>

          <div className="spraoi-mobile-module-name">{mod.label}</div>

          <button onClick={onShowProfile} aria-label="Open profile" className="spraoi-mobile-profile-button">
            {initial}
          </button>
        </div>

        <div className="spraoi-mobile-team-row">
          <div className="spraoi-mobile-clubwide">Club-wide</div>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,18,34,.62)", padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 82, width: "100%", maxWidth: 430, background: P.white, borderRadius: 20, padding: 16, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, color: P.ink, fontSize: 18, marginBottom: 12 }}>Switch module</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {["coach","academy","connect","cup","club"].filter((key) => MODULES[key] && enabledModules.includes(key)).map((key) => {
                const m = MODULES[key];
                const unlocked = enabledModules.includes(key);
                return (
                  <button key={key} onClick={() => openModule(key, m)} style={{ position: "relative", border: `1px solid ${activeModule === key ? m.color : P.line}`, background: activeModule === key ? `${m.color}0d` : P.white, borderRadius: 14, padding: 13, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" }}>
                    <span style={{ width: 46, height: 46, borderRadius: 13, background: "#fff", border: "1px solid rgba(15,23,42,.08)", display: "grid", placeItems: "center", padding: 0, boxSizing: "border-box", flexShrink: 0, boxShadow: "0 3px 10px rgba(15,23,42,.08)" }}>
                      <img src={m.icon} alt="" style={{ width: 34, height: 34, objectFit: "contain", display: "block", opacity: unlocked ? 1 : .5, filter: unlocked ? "none" : "grayscale(1)" }} />
                    </span>
                    <div>
                      <div style={{ fontFamily: F.display, fontWeight: 700, color: P.ink, fontSize: 13 }}>{m.label}</div>
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

function MobileNav({ activeModule, screen, onNav, enabledModules, userRole }) {
  const module = MODULES[activeModule];
  const [showMore, setShowMore] = useState(false);

  const isTeamAdmin = String(userRole?.role || "").toLowerCase() === "team_admin";

  const items = isTeamAdmin
    ? [
        { id: "club-teams", label: "Teams" },
        { id: "club-coaches", label: "People" },
      ]
    : [
        { id: "club-dashboard", label: "Dashboard" },
        { id: "club-teams", label: "Teams" },
        { id: "club-coaches", label: "People" },
        { id: "club-scheduling", label: "Facilities" },
      ];

  const moreItems = isTeamAdmin
    ? []
    : [
        { id: "club-setup", label: "Club Setup" },
        { id: "club-compliance", label: "Compliance" },
        { id: "club-permissions", label: "Roles & Permissions" },
      ];

  const moreActive = moreItems.some((item) => item.id === screen);

  return (
    <>
      {showMore && (
        <>
          <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,35,60,.28)", zIndex: 198 }} />
          <div className="spraoi-mobile-more-sheet">
            <div className="spraoi-mobile-more-title">More {module.label} tools</div>
            <div className="spraoi-mobile-more-grid">
              {moreItems.map((item) => {
                const isActive = screen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setShowMore(false); onNav(item.id); }}
                    className="spraoi-mobile-more-button"
                    data-active={isActive}
                    style={{ "--module-color": module.color }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="spraoi-mobile-bottom-nav" style={{ "--module-color": module.color }}>
        {items.map((item) => {
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => onNav(item.id)}
              className="spraoi-mobile-bottom-nav-button"
              data-active={isActive}
            >
              <span className="spraoi-mobile-bottom-nav-chip">
                <img src={secondaryNavAsset(activeModule, item.id)} alt="" aria-hidden="true" className="spraoi-mobile-bottom-nav-icon" />
              </span>
              <span className="spraoi-mobile-bottom-nav-label">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowMore((value) => !value)}
          aria-label="More sections"
          className="spraoi-mobile-bottom-nav-button"
          data-active={moreActive || showMore}
        >
          <span className="spraoi-mobile-bottom-nav-chip">
            <img src="/icons/global/more.png" alt="" aria-hidden="true" className="spraoi-mobile-bottom-nav-icon" />
          </span>
          <span className="spraoi-mobile-bottom-nav-label">More</span>
        </button>
      </div>
    </>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

/* ============================================================
   CLUB MODULE ENTRY
   Single source of truth for Club screens rendered by Admin.
   ============================================================ */
export function ClubModule({
  screen, onNav, club, ageGroups, coaches, selectedTeam, onSelectTeam,
  onReloadTeams, onReloadCoaches, userRole, currentUserId, onClubUpdated,
}) {
  return (
    <>
      {screen === "club-dashboard" && <ClubDashboardScreen club={club} ageGroups={ageGroups} coaches={coaches} selectedTeam={selectedTeam} onNav={onNav} />}
      {screen === "club-setup" && <ClubSetupScreen club={club} userRole={userRole} onClubUpdated={onClubUpdated} onNav={onNav} />}
      {screen === "club-legal" && <ClubLegalScreen club={club} currentUserId={currentUserId} onNav={onNav} />}
      {screen === "club-teams" && <ClubTeamsScreen club={club} ageGroups={ageGroups} coaches={coaches} selectedTeam={selectedTeam} onSelectTeam={onSelectTeam} onReloadTeams={onReloadTeams} userRole={userRole} />}
      {screen === "club-coaches" && <ClubCoachesScreen club={club} ageGroups={ageGroups} coaches={coaches} selectedTeam={selectedTeam} onReloadCoaches={onReloadCoaches} userRole={userRole} currentUserId={currentUserId} />}
      {screen === "club-compliance" && <ClubComplianceScreen club={club} coaches={coaches} userRole={userRole} />}
      {screen === "club-permissions" && <ClubPermissionsScreen club={club} userRole={userRole} ageGroups={ageGroups} />}
      {screen === "club-scheduling" && <ClubPage title="Facilities & Slots" sub="Manage facilities, recurring training slots and weekly pitch allocations.">
        <ClubScheduling club={club} ageGroups={ageGroups} currentUserId={currentUserId || ""} hideHeader />
      </ClubPage>}
    </>
  );
}

function SpraoiInviteAcceptance({ token, session }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState("");
  const [acceptedKeys, setAcceptedKeys] = useState([]);
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [openPolicyKey, setOpenPolicyKey] = useState(null);
  const [inviteTeamNames, setInviteTeamNames] = useState([]);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSetupComplete, setPasswordSetupComplete] = useState(
    () => session?.user?.user_metadata?.spraoi_account_setup_required !== true
  );

  useEffect(() => {
    loadInvitation();
  }, [token, session?.user?.id]);

  async function loadInvitation() {
    if (!token || !session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("spraoi_invitations")
      .select("id,club_id,email,name,invite_type,role,status,token,expires_at,accepted_at,clubs(name)")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      setMessage("We could not load this invitation: " + error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage(
        "This invitation could not be found or does not belong to the signed-in account."
      );
      setLoading(false);
      return;
    }

    setInvitation(data);

    const { data: teamLinks } = await supabase
      .from("spraoi_invitation_teams")
      .select("age_group_id")
      .eq("invitation_id", data.id);

    const invitedTeamIds = (teamLinks || []).map((row) => row.age_group_id).filter(Boolean);
    if (invitedTeamIds.length > 0) {
      const { data: teams } = await supabase
        .from("age_groups")
        .select("id,label")
        .in("id", invitedTeamIds);
      setInviteTeamNames((teams || []).map((team) => team.label).filter(Boolean));
    } else {
      setInviteTeamNames([]);
    }

    setPasswordSetupComplete(
      session?.user?.user_metadata?.spraoi_account_setup_required !== true
    );
    setLoading(false);
  }

  const isParent = invitation?.invite_type === "parent_guardian";
  const inviteFirstName = String(
    invitation?.name || session?.user?.user_metadata?.first_name || session?.user?.user_metadata?.name || ""
  ).trim().split(/\s+/)[0] || "there";
  const inviteClubName = invitation?.clubs?.name || session?.user?.user_metadata?.club_name || "Spraoi Sports";
  const inviteTeamText = inviteTeamNames.length > 0
    ? inviteTeamNames.join(", ")
    : Array.isArray(session?.user?.user_metadata?.team_names)
      ? session.user.user_metadata.team_names.join(", ")
      : "";

  async function createInvitePassword() {
    setMessage("");

    if (setupPassword.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setMessage("The passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const existingMetadata = session?.user?.user_metadata || {};
    const { error } = await supabase.auth.updateUser({
      password: setupPassword,
      data: {
        ...existingMetadata,
        spraoi_account_setup_required: false,
      },
    });

    if (error) {
      setMessage("Could not create your password: " + error.message);
      setSavingPassword(false);
      return;
    }

    setPasswordSetupComplete(true);
    setSetupPassword("");
    setSetupPasswordConfirm("");
    setSavingPassword(false);
    setMessage("Password created. Review the policies below to finish joining Spraoi.");
  }

  const requiredKeys = isParent
    ? ["terms", "privacy", "parent_guardian"]
    : ["terms", "privacy", "acceptable_use"];

  const requiredPolicies = requiredKeys
    .map((key) => LEGAL_POLICIES.find((policy) => policy.key === key))
    .filter(Boolean);

  const allPoliciesAccepted =
    requiredKeys.length > 0 &&
    requiredKeys.every((key) => acceptedKeys.includes(key));

  const canAccept =
    invitation?.status === "pending" &&
    passwordSetupComplete &&
    allPoliciesAccepted &&
    (!isParent || guardianConfirmed);

  function togglePolicy(key) {
    setAcceptedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  async function acceptInvitation() {
    if (!canAccept || !token) return;

    setAccepting(true);
    setMessage("");

    const body = {
      token,
      inviteToken: token,
      acceptedPolicies: requiredKeys,
      acceptedPolicyKeys: requiredKeys,
      policyKeys: requiredKeys,
      policyVersion: LEGAL_POLICY_VERSION,
      parentGuardianConfirmation: isParent ? guardianConfirmed : false,
    };

    const { data, error } = await supabase.functions.invoke(
      "accept-spraoi-invite",
      { body }
    );

    if (error) {
      let detail = error.message || "Edge Function returned an error.";
      let status = "";
      try {
        const response = error?.context;
        if (response) {
          status = response.status ? `HTTP ${response.status}` : "";

          if (typeof response.clone === "function") {
            const clone = response.clone();
            const raw = await clone.text();
            if (raw) {
              try {
                const payload = JSON.parse(raw);
                detail = payload?.error || payload?.message || raw || detail;
              } catch {
                detail = raw;
              }
            }
          } else if (typeof response.json === "function") {
            const payload = await response.json();
            detail = payload?.error || payload?.message || detail;
          } else if (typeof response === "string") {
            detail = response;
          }
        }
      } catch (responseError) {
        console.warn("Could not read accept-invitation error response:", responseError);
      }

      console.error("accept-spraoi-invite failed", {
        status,
        detail,
        error,
      });

      setMessage(
        `Could not accept invitation${status ? ` (${status})` : ""}: ${detail}`
      );
      setAccepting(false);
      return;
    }

    if (data?.ok === false) {
      setMessage(data.error || "Could not accept invitation.");
      setAccepting(false);
      return;
    }

    setMessage("Invitation accepted.");

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    window.setTimeout(() => {
      if (isParent) {
        window.location.assign(
          isLocal
            ? "http://localhost:5178"
            : "https://academy.spraoisports.com"
        );
      } else {
        window.location.assign(
          isLocal
            ? "http://localhost:5174"
            : "https://admin.spraoisports.com/?module=club"
        );
      }
    }, 650);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: P.navy,
          display: "grid",
          placeItems: "center",
          padding: 20,
          fontFamily: F.body,
        }}
      >
        <div style={{ color: "#fff" }}>Loading invitation…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.navy,
        padding: "28px 16px",
        fontFamily: F.body,
      }}
    >
      <div
        style={{
          width: "min(620px,100%)",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src="/spraoi-logo-white.png"
            alt="Spraoi Sports"
            style={{ width: 180, height: "auto" }}
          />
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 22,
            boxShadow: "0 18px 48px rgba(0,0,0,.22)",
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 24,
              fontWeight: 800,
              color: P.ink,
            }}
          >
            {passwordSetupComplete ? `Welcome back, ${inviteFirstName}` : `Welcome, ${inviteFirstName}`}
          </div>

          {invitation && (
            <>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  color: P.muted,
                  lineHeight: 1.55,
                }}
              >
                You've been invited to join <strong style={{ color: P.ink }}>{inviteClubName}</strong>
                {inviteTeamText ? <> · <strong style={{ color: P.ink }}>{inviteTeamText}</strong></> : null}
                {" on Spraoi Sports."}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  marginTop: 12,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: CLUB_SOFT,
                  color: CLUB_RED,
                  fontWeight: 800,
                  fontSize: 10,
                }}
              >
                {isParent
                  ? "Parent / Guardian"
                  : invitation.invite_type === "club_admin"
                    ? "Club Admin"
                    : invitation.invite_type === "lead_coach"
                      ? "Lead Coach"
                      : invitation.invite_type === "team_admin"
                        ? "Team Admin"
                        : "Coach / Mentor"}
              </div>

              {!passwordSetupComplete && invitation.status === "pending" && (
                <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "#f8fafc", border: `1px solid ${P.line}` }}>
                  <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 17, color: P.ink }}>Create your password</div>
                  <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.55, color: P.muted }}>
                    Create a password to finish setting up your Spraoi Sports account. You'll use your email and this password next time you sign in.
                  </div>
                  <label style={{ display: "block", marginTop: 14, fontSize: 10, fontWeight: 800, color: P.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Password</label>
                  <div style={{ position: "relative", marginTop: 4 }}>
                    <input type={showSetupPassword ? "text" : "password"} value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" style={{ width: "100%", boxSizing: "border-box", padding: "12px 58px 12px 13px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, background: "#fff" }} />
                    <button type="button" onClick={() => setShowSetupPassword((current) => !current)} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", fontSize: 10, fontWeight: 800, color: P.muted, cursor: "pointer" }}>{showSetupPassword ? "Hide" : "Show"}</button>
                  </div>
                  <label style={{ display: "block", marginTop: 12, fontSize: 10, fontWeight: 800, color: P.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Confirm password</label>
                  <input type={showSetupPassword ? "text" : "password"} value={setupPasswordConfirm} onChange={(event) => setSetupPasswordConfirm(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createInvitePassword()} autoComplete="new-password" placeholder="Repeat your password" style={{ width: "100%", boxSizing: "border-box", marginTop: 4, padding: "12px 13px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, background: "#fff" }} />
                  <button type="button" onClick={createInvitePassword} disabled={savingPassword || !setupPassword || !setupPasswordConfirm} style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 10, border: 0, background: CLUB_RED, color: "#fff", fontFamily: F.display, fontWeight: 800, cursor: "pointer", opacity: savingPassword || !setupPassword || !setupPasswordConfirm ? .6 : 1 }}>{savingPassword ? "Creating password…" : "Create password & continue"}</button>
                </div>
              )}

              {invitation.status !== "pending" && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 11,
                    borderRadius: 9,
                    background: "#fff7ed",
                    color: "#9a3412",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  This invitation is {invitation.status}.
                </div>
              )}

              <div
                style={{
                  marginTop: 20,
                  fontFamily: F.display,
                  fontWeight: 800,
                  fontSize: 16,
                  color: P.ink,
                }}
              >
                Required policies
              </div>
              {!passwordSetupComplete && (
                <div style={{ marginTop: 5, marginBottom: 8, fontSize: 10, color: P.muted }}>Create your password first, then accept the policies to finish joining.</div>
              )}

              <div
                style={{
                  marginTop: 5,
                  marginBottom: 12,
                  fontSize: 10,
                  color: P.muted,
                }}
              >
                Version {LEGAL_POLICY_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {requiredPolicies.map((policy) => {
                  const checked = acceptedKeys.includes(policy.key);

                  return (
                    <div
                      key={policy.key}
                      style={{
                        border: `1px solid ${checked ? CLUB_RED : P.line}`,
                        borderRadius: 10,
                        padding: 11,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 800,
                          color: P.ink,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePolicy(policy.key)}
                        />
                        <span style={{ flex: 1 }}>
                          I accept the {policy.title}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenPolicyKey(
                            openPolicyKey === policy.key ? null : policy.key
                          )
                        }
                        style={{
                          marginTop: 7,
                          border: 0,
                          background: "transparent",
                          color: CLUB_RED,
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {openPolicyKey === policy.key
                          ? "Hide policy"
                          : "Read policy"}
                      </button>

                      {openPolicyKey === policy.key && (
                        <div
                          style={{
                            marginTop: 10,
                            maxHeight: 260,
                            overflowY: "auto",
                            padding: 10,
                            borderRadius: 8,
                            background: "#f8fafc",
                            fontSize: 10,
                            lineHeight: 1.55,
                            color: P.ink,
                          }}
                        >
                          {(policy.sections || []).map((section, index) => (
                            <div
                              key={`${policy.key}-${index}`}
                              style={{ marginBottom: 12 }}
                            >
                              <div style={{ fontWeight: 800 }}>
                                {section.heading}
                              </div>

                              {(section.body || []).map((paragraph, pIndex) => (
                                <div
                                  key={pIndex}
                                  style={{ marginTop: 5 }}
                                >
                                  {paragraph}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isParent && (
                <label
                  style={{
                    marginTop: 13,
                    padding: 11,
                    borderRadius: 10,
                    background: CLUB_SOFT,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    cursor: "pointer",
                    fontSize: 10,
                    lineHeight: 1.5,
                    color: P.ink,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={guardianConfirmed}
                    onChange={(e) =>
                      setGuardianConfirmed(e.target.checked)
                    }
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    I confirm that I am the parent or legal guardian,
                    or I am otherwise authorised to link this child
                    profile to my account.
                  </span>
                </label>
              )}

              <button
                type="button"
                disabled={!canAccept || accepting}
                onClick={acceptInvitation}
                style={{
                  width: "100%",
                  marginTop: 18,
                  height: 44,
                  border: 0,
                  borderRadius: 10,
                  background: CLUB_RED,
                  color: "#fff",
                  fontFamily: F.body,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: canAccept ? "pointer" : "default",
                  opacity: canAccept && !accepting ? 1 : 0.45,
                }}
              >
                {accepting ? "Accepting…" : "Accept Invitation"}
              </button>
            </>
          )}

          {message && (
            <div
              style={{
                marginTop: 13,
                padding: 10,
                borderRadius: 9,
                background: message === "Invitation accepted."
                  ? "#ecfdf3"
                  : "#fff1f2",
                color: message === "Invitation accepted."
                  ? "#166534"
                  : "#b42318",
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 9,
              color: P.muted,
            }}
          >
            Need help? Contact spraoisportsapp@gmail.com
          </div>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  useSpraoiFonts();
  // Auth state
  const [session, setSession] = useState(null);
  const userDisplayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "";

  const userInitial = (() => {
    const value = String(userDisplayName || "U").trim();

    if (!value) return "U";

    if (value.includes("@")) {
      const local = value
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .trim();

      const parts = local.split(/\s+/).filter(Boolean);

      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : local.slice(0, 2).toUpperCase();
    }

    const parts = value.split(/\s+/).filter(Boolean);

    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : value.slice(0, 2).toUpperCase();
  })();
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    return search.get("type") === "recovery" || hash.get("type") === "recovery";
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoverySaving, setRecoverySaving] = useState(false);

  // User role state
  const [userRole, setUserRole] = useState(null); // { role, club_id, modules }
  const [enabledModules, setEnabledModules] = useState([]);

  // App state — this standalone build owns CLUB only.
  // Other module buttons return to the single Admin shell, which renders the canonical module.
  const [screen, setScreen] = useState(() => readModuleScreen(APP_MODULE, MODULES[APP_MODULE]?.nav?.[0]?.id || "club-dashboard"));
  const [activeModule, setActiveModule] = useState(APP_MODULE);

  useEffect(() => {
    if (!String(screen || "").startsWith(`${APP_MODULE}-`)) {
      setScreen(readModuleScreen(APP_MODULE, MODULES[APP_MODULE]?.nav?.[0]?.id || "club-dashboard"));
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
  const permissions =
    userRole?.capabilities ||
    roleCapabilities(userRole?.role);

  const isTeamScopedUser =
    permissions.isTeamAdmin || permissions.isCoachMentor;

  const scopedAgeGroups = isTeamScopedUser
    ? ageGroups.filter((ag) => myTeams.includes(ag.id))
    : ageGroups;

  useEffect(() => {
    if (authLoading || !userRole || !screen) return;
    if (String(screen).startsWith("access-denied-")) return;

    const moduleKey = String(screen).split("-")[0];

    if (!enabledModules.includes(moduleKey)) {
      setScreen(`access-denied-${moduleKey}`);
      return;
    }

    if (
      moduleKey === "club" &&
      !canAccessClubScreen(userRole?.role, screen)
    ) {
      const normalizedRole = String(userRole?.role || "").toLowerCase();

      const fallback =
        normalizedRole === "team_admin" ||
        ["coach_mentor", "coach", "mentor"].includes(normalizedRole)
          ? "club-scheduling"
          : "club-dashboard";

      if (screen !== fallback) {
        setScreen(fallback);
      }
    }
  }, [screen, userRole?.role, enabledModules, authLoading]);

const [showProfile, setShowProfile] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [pitchView, setPitchView] = useState(false);
  const [shareToken] = useState(() => new URLSearchParams(window.location.search).get("share"));
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite"));
  const [sharedSession, setSharedSession] = useState(null);
  const [shareLoading, setShareLoading] = useState(!!new URLSearchParams(window.location.search).get("share"));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadUserRole(s.user.id, s.user.email);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setAuthLoading(false);
        return;
      }

      if (s) loadUserRole(s.user.id, s.user.email);
      else { setAuthLoading(false); setUserRole(null); }
    });
    loadDiagramMap();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => { subscription.unsubscribe(); window.removeEventListener("resize", handleResize); };
  }, []);

  async function loadUserRole(userId, userEmail) {
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("*");

      if (roleError) {
        console.warn("Unable to load user roles:", roleError.message);
      }

      const normalizedEmail = String(userEmail || "").trim().toLowerCase();

      const emailRoleRows = (roleRows || []).filter((row) =>
        normalizedEmail &&
        String(row.user_email || row.email || "").trim().toLowerCase() === normalizedEmail
      );

      const rolePriority = {
        super_admin: 6,
        admin: 5,
        club_admin: 5,
        lead_coach: 4,
        team_admin: 3,
        club_staff: 2,
        coach_mentor: 1,
        coach: 1,
        mentor: 1,
      };

      const roleData = [...emailRoleRows].sort((a, b) => {
        const aAll = String(a.squad_key || a.squad || "").trim().toLowerCase() === "all" ? 1 : 0;
        const bAll = String(b.squad_key || b.squad || "").trim().toLowerCase() === "all" ? 1 : 0;

        if (aAll !== bAll) return bAll - aAll;

        return (
          (rolePriority[String(b.role || "").toLowerCase()] ?? -1) -
          (rolePriority[String(a.role || "").toLowerCase()] ?? -1)
        );
      })[0] || (roleRows || []).find((row) =>
        [row.user_id, row.auth_user_id, row.profile_id]
          .filter(Boolean)
          .some((value) => String(value) === String(userId))
      ) || null;

      let { data: staffRows, error: staffError } = await supabase
        .from("team_staff")
        .select("id, club_id, age_group_id, role, status, coach_id, coach_write, academy_write, academy_publish, connect_read, connect_write, cup_read, cup_write, attendance_manage")
        .eq("user_id", userId)
        .eq("status", "active");

      let matchingCoach = null;

      // Legacy/pending coach records may exist before the auth user is linked.
      if ((!staffRows?.length || staffError) && userEmail) {
        const { data } = await supabase
          .from("coaches")
          .select("id, club_id")
          .ilike("email", userEmail)
          .limit(1)
          .maybeSingle();

        matchingCoach = data || null;

        if (matchingCoach?.id) {
          const { data: pendingRows, error: pendingError } = await supabase
            .from("team_staff")
            .select("id, club_id, age_group_id, role, status, coach_id, coach_write, academy_write, academy_publish, connect_read, connect_write, cup_read, cup_write, attendance_manage")
            .eq("coach_id", matchingCoach.id)
            .eq("status", "active");

          if (!pendingError && pendingRows?.length) {
            staffRows = pendingRows;

            await supabase
              .from("coaches")
              .update({ user_id: userId })
              .eq("id", matchingCoach.id);

            await supabase
              .from("team_staff")
              .update({ user_id: userId })
              .in("id", pendingRows.map((row) => row.id));
          }
        }
      }

      const accountRole = String(roleData?.role || "").toLowerCase();

      const hasPlatformRole = [
        "super_admin",
        "admin",
        "club_admin",
        "lead_coach",
      ].includes(accountRole);

      let effectiveRole = roleData?.role || "no_access";

      let assignedTeamIds = [];

      if (!staffError && staffRows?.length) {
        assignedTeamIds = [
          ...new Set(
            staffRows
              .map((row) => row.age_group_id)
              .filter(Boolean)
          ),
        ];

        if (!hasPlatformRole) {
          const staffPriority = {
            club_admin: 5,
            lead_coach: 4,
            team_admin: 3,
            club_staff: 2,
            coach_mentor: 1,
            coach: 1,
            mentor: 1,
          };

          effectiveRole =
            [...staffRows]
              .sort(
                (a, b) =>
                  (staffPriority[String(b.role || "").toLowerCase()] || 0) -
                  (staffPriority[String(a.role || "").toLowerCase()] || 0)
              )[0]?.role || effectiveRole;
        }
      }

      // coach_assignments is fallback-only for older unmigrated coach accounts.
      if (!staffRows?.length) {
        const { data: assignments, error: assignmentError } = await supabase
          .from("coach_assignments")
          .select("age_group_id")
          .eq("user_id", userId);

        if (!assignmentError && assignments?.length) {
          assignedTeamIds = [
            ...new Set(
              assignments
                .map((assignment) => assignment.age_group_id)
                .filter(Boolean)
            ),
          ];

          if (!roleData && effectiveRole === "no_access") {
            effectiveRole = "coach_mentor";
          }
        }
      }

      // Team-scoped membership determines the club where no global role exists.
      const roleClubId =
        roleData?.club_id ||
        roleData?.club?.id ||
        null;

      const staffClubId =
        (staffRows || []).find((row) => row.club_id)?.club_id ||
        matchingCoach?.club_id ||
        null;

      const effectiveClubId = roleClubId || staffClubId || null;

      let clubData = null;

      if (effectiveClubId) {
        const { data } = await supabase
          .from("clubs")
          .select("*")
          .eq("id", effectiveClubId)
          .maybeSingle();

        clubData = data || null;
      }

      // Branding fallback only. This must never grant permissions.
      if (!clubData) {
        const { data } = await supabase
          .from("clubs")
          .select("*")
          .eq("slug", "club-spraoi")
          .maybeSingle();

        clubData = data || null;
      }

      if (!clubData) {
        const { data } = await supabase
          .from("clubs")
          .select("*")
          .eq("slug", "fingallians")
          .maybeSingle();

        clubData = data || null;
      }

      if (clubData) {
        setClub(clubData);
      }

      if (effectiveClubId) {
        loadAgeGroups(effectiveClubId);
        loadCoaches(effectiveClubId);
      }

      // Coach/Academy content should only load for roles that can use it.
      if (["super_admin", "admin", "club_admin", "lead_coach", "team_admin", "coach_mentor", "coach", "mentor"].includes(
        String(effectiveRole || "").toLowerCase()
      )) {
        loadSkills();
        loadActivities();
        loadUpcoming();
      }

      const staffGrants = (staffRows || []).reduce(
        (grants, row) => ({
          coach_write:
            grants.coach_write || Boolean(row.coach_write),

          academy_write:
            grants.academy_write || Boolean(row.academy_write),

          academy_publish:
            grants.academy_publish || Boolean(row.academy_publish),

          connect_read:
            grants.connect_read ||
            Boolean(row.connect_read) ||
            Boolean(row.connect_write),

          connect_write:
            grants.connect_write || Boolean(row.connect_write),

          cup_read:
            grants.cup_read ||
            Boolean(row.cup_read) ||
            Boolean(row.cup_write),

          cup_write:
            grants.cup_write || Boolean(row.cup_write),

          attendance_manage:
            grants.attendance_manage ||
            Boolean(row.attendance_manage),
        }),
        {
          coach_write: false,
          academy_write: false,
          academy_publish: false,
          connect_read: false,
          connect_write: false,
          cup_read: false,
          cup_write: false,
          attendance_manage: false,
        }
      );

      const capabilities = roleCapabilities(
        effectiveRole,
        staffGrants
      );

      setEnabledModules(
        modulesForRole(effectiveRole, capabilities)
      );

      setUserRole({
        ...(roleData || {}),
        role: effectiveRole,
        club_id: effectiveClubId,
        capabilities,
      });

      setMyTeams([...new Set(assignedTeamIds)]);
    } catch (error) {
      console.error("Unable to initialise platform access:", error);

      // Permission failures must never elevate access.
      setEnabledModules([]);
      setUserRole({
        role: "no_access",
        club_id: null,
        capabilities: roleCapabilities("no_access"),
      });
      setMyTeams([]);
    } finally {
      setAuthLoading(false);
    }
  }

  async function currentCoachId() {
    if (!session?.user?.id || !club?.id) return null;
    const { data: byUser } = await supabase
      .from("coaches")
      .select("id")
      .eq("club_id", club.id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (byUser?.id) return byUser.id;

    const userEmail = String(session.user.email || "").trim();
    if (!userEmail) return null;
    const { data: byEmail } = await supabase
      .from("coaches")
      .select("id")
      .eq("club_id", club.id)
      .ilike("email", userEmail)
      .maybeSingle();
    return byEmail?.id || null;
  }

  async function addProfileTeam(ageGroupId) {
    if (!ageGroupId || !session?.user?.id || !club?.id) return;
    const coachId = await currentCoachId();

    // Legacy membership is retained during migration.
    await supabase.from("coach_assignments").upsert(
      { user_id: session.user.id, club_id: club.id, age_group_id: ageGroupId },
      { onConflict: "user_id,age_group_id", ignoreDuplicates: true }
    );

    // Current membership source used by RBAC and the other modules.
    if (coachId) {
      const role = permissions.isClubAdmin ? "club_admin" : (permissions.isLeadCoach ? "lead_coach" : "coach_mentor");
      const { error } = await supabase.from("team_staff").upsert(
        {
          club_id: club.id,
          age_group_id: ageGroupId,
          coach_id: coachId,
          user_id: session.user.id,
          role,
          status: "active",
        },
        { onConflict: "age_group_id,coach_id" }
      );
      if (error) console.warn("Could not sync team_staff assignment:", error.message);
    }

    setMyTeams((current) => [...new Set([...(current || []), ageGroupId])]);
  }

  async function removeProfileTeam(ageGroupId) {
    if (!ageGroupId || !session?.user?.id) return;

    await supabase
      .from("coach_assignments")
      .delete()
      .eq("user_id", session.user.id)
      .eq("age_group_id", ageGroupId);

    const coachId = await currentCoachId();
    let staffDelete = supabase
      .from("team_staff")
      .delete()
      .eq("age_group_id", ageGroupId);
    if (coachId) staffDelete = staffDelete.eq("coach_id", coachId);
    else staffDelete = staffDelete.eq("user_id", session.user.id);
    const { error } = await staffDelete;
    if (error) console.warn("Could not remove team_staff assignment:", error.message);

    setMyTeams((current) => (current || []).filter((id) => String(id) !== String(ageGroupId)));
    if (String(selectedTeam?.id || "") === String(ageGroupId)) {
      const nextId = (myTeams || []).find((id) => String(id) !== String(ageGroupId));
      const nextTeam = ageGroups.find((team) => String(team.id) === String(nextId));
      setSelectedTeam(nextTeam || null);
      saveActiveContext(nextTeam || null, club);
    }
  }

  async function sendPasswordReset() {
    const cleanEmail = String(email || "").trim();

    if (!cleanEmail) {
      setAuthError("Enter your email address first.");
      return;
    }

    setLoggingIn(true);
    setAuthError("");
    setResetSent(false);

    const redirectTo =
      `${window.location.origin}${window.location.pathname}`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo }
      );

    if (error) {
      setAuthError(error.message);
    } else {
      setResetSent(true);
    }

    setLoggingIn(false);
  }

  async function saveRecoveredPassword() {
    setAuthError("");

    if (newPassword.length < 8) {
      setAuthError("Your new password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setAuthError("The passwords do not match.");
      return;
    }

    setRecoverySaving(true);

    const { error } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (error) {
      setAuthError(error.message);
      setRecoverySaving(false);
      return;
    }

    setNewPassword("");
    setConfirmNewPassword("");
    setRecoveryMode(false);

    await supabase.auth.signOut();

    setSession(null);
    setAuthError(
      "Password updated successfully. Sign in with your new password."
    );
    setRecoverySaving(false);

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }
  async function login() { setLoggingIn(true); setAuthError(""); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); setLoggingIn(false); }
  async function signup() { setLoggingIn(true); setAuthError(""); const { error } = await supabase.auth.signUp({ email, password }); if (error) setAuthError(error.message); else setAuthError("Check your email to confirm."); setLoggingIn(false); }
  async function logout() { await supabase.auth.signOut(); setSession(null); setUserRole(null); setClub(null); setSelectedTeam(null); }

  // Restore and synchronise the one active team shared by every Spraoi module.
  useEffect(() => {
    if (!ageGroups.length) return;
    const savedId = requestedTeamFromUrl(null) || localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
    const found = ageGroups.find((ag) => String(ag.id) === String(savedId));
    if (found && String(found.id) !== String(selectedTeam?.id || "")) {
      setSelectedTeam(found);
      saveActiveContext(found, club);
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
  async function loadCoaches(clubId = club?.id) { if (!clubId) return; const { data } = await supabase.from("coaches").select("*").eq("club_id", clubId).order("name"); setCoaches(data || []); }
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
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, marginTop: 4 }}>{sharedSession.hurling_skill?.name || "Session Plan"}</div>
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
                  <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.p600 }}>{i + 1}</span>
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

  // Password recovery takes priority over normal authenticated routing.
  if (recoveryMode && session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: P.navy,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.body,
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 400, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src="/spraoi-logo-white.png"
              alt="Spraoi Sports"
              style={{
                width: 180,
                height: "auto",
                marginBottom: 10,
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.55)",
              }}
            >
              Reset your password
            </div>
          </div>

          <div
            style={{
              background: P.white,
              borderRadius: 18,
              padding: 28,
              boxShadow: Sh.lift,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 20,
                fontWeight: 800,
                color: P.ink,
              }}
            >
              Choose a new password
            </div>

            <div
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: P.muted,
                marginTop: 5,
                marginBottom: 18,
              }}
            >
              Enter a new password for your Spraoi Sports account.
            </div>

            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: P.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              New password
            </label>

            <div
              style={{
                position: "relative",
                marginTop: 4,
                marginBottom: 14,
              }}
            >
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 58px 12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${P.line}`,
                  fontFamily: F.body,
                  fontSize: 13,
                  background: P.soft,
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword((current) => !current)
                }
                aria-label={
                  showNewPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showNewPassword}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  padding: "5px 4px",
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 800,
                  color: P.muted,
                  cursor: "pointer",
                }}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: P.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Confirm new password
            </label>

            <input
              type={showNewPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) =>
                setConfirmNewPassword(e.target.value)
              }
              autoComplete="new-password"
              placeholder="Repeat your new password"
              onKeyDown={(e) =>
                e.key === "Enter" &&
                saveRecoveredPassword()
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: 10,
                border: `1.5px solid ${P.line}`,
                fontFamily: F.body,
                fontSize: 13,
                marginTop: 4,
                background: P.soft,
              }}
            />

            {authError && (
              <div
                style={{
                  color: P.coral,
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={saveRecoveredPassword}
              disabled={
                recoverySaving ||
                !newPassword ||
                !confirmNewPassword
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "none",
                fontFamily: F.display,
                fontSize: 14,
                fontWeight: 800,
                background: CLUB_RED,
                color: "#fff",
                cursor: "pointer",
                marginTop: 18,
                opacity:
                  recoverySaving ||
                  !newPassword ||
                  !confirmNewPassword
                    ? 0.6
                    : 1,
              }}
            >
              {recoverySaving
                ? "Updating..."
                : "Update password"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Invitation acceptance takes priority once the recipient is authenticated.
  if (session && inviteToken) {
    return (
      <SpraoiInviteAcceptance
        token={inviteToken}
        session={session}
      />
    );
  }

  // Login screen
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: P.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, padding: 16 }}>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/spraoi-logo-white.png" alt="Spraoi Sports" style={{ width: 180, height: "auto", marginBottom: 10 }} />
            <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
              {inviteToken ? "Sign in to accept your invitation" : "Club Admin"}
            </div>
          </div>
          <div style={{ background: P.white, borderRadius: 18, padding: 28, boxShadow: Sh.lift }}>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 16 }}>Sign In</div>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@email.com" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 13, marginTop: 4, marginBottom: 12, background: P.soft }} />
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <div style={{ position: "relative", width: "100%", marginTop: 4, marginBottom: 16 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                onKeyDown={(e) => e.key === "Enter" && login()}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 58px 12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${P.line}`,
                  fontFamily: F.body,
                  fontSize: 13,
                  background: P.soft
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  padding: "5px 4px",
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 800,
                  color: P.muted,
                  cursor: "pointer"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: -8,
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword((current) => !current);
                  setResetSent(false);
                  setAuthError("");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 800,
                  color: CLUB_RED,
                  cursor: "pointer",
                }}
              >
                Forgot password?
              </button>
            </div>

            {showForgotPassword && (
              <div
                style={{
                  background: "#fff7f7",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: 13,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: F.body,
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: P.ink,
                  }}
                >
                  {resetSent
                    ? `We've sent a password reset link to ${email}.`
                    : "Enter your email above and we'll send you a secure password reset link."}
                </div>

                {!resetSent && (
                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={loggingIn || !email}
                    style={{
                      width: "100%",
                      height: 36,
                      border: "none",
                      borderRadius: 9,
                      background: CLUB_RED,
                      color: "#fff",
                      fontFamily: F.body,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      marginTop: 10,
                      opacity:
                        loggingIn || !email
                          ? 0.6
                          : 1,
                    }}
                  >
                    {loggingIn
                      ? "Sending..."
                      : "Send reset link"}
                  </button>
                )}
              </div>
            )}

            {authError && <div style={{ color: P.coral, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
            <button onClick={login} disabled={loggingIn || !email || !password} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontFamily: F.display, fontSize: 14, fontWeight: 800, background: CLUB_RED, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(211,47,47,.28)" }}>
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
                        await addProfileTeam(boys.id);
                        selectTeam(boys);
                      }} style={{ flex: 1, padding: "14px 10px", borderRadius: 12, border: `1.5px solid ${P.line}`, background: P.soft, cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: P.p600 }}>{label}</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: P.p600, marginTop: 2 }}>Boys</div>
                      </button>
                    )}
                    {girls && (
                      <button onClick={async () => {
                        await addProfileTeam(girls.id);
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
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", fontFamily: F.body, paddingTop: showMobile ? 116 : 0, paddingBottom: showMobile ? 78 : 0, boxSizing: "border-box" }}>
      {showMobile && <MobileHeader activeModule={activeModule} setActiveModule={setActiveModule} onNav={setScreen} enabledModules={enabledModules} club={club} selectedTeam={selectedTeam} ageGroups={scopedAgeGroups} myTeams={myTeams} onSelectTeam={selectTeam} onShowProfile={()=>setShowProfile(true)} userInitial={userInitial} />}

      {/* Sidebar — desktop only */}
      {!showMobile && <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} activeScreen={screen} onNav={setScreen} club={club} selectedTeam={selectedTeam} onSelectTeam={selectTeam} enabledModules={enabledModules} onLogout={logout} ageGroups={scopedAgeGroups} myTeams={myTeams} onShowProfile={() => setShowProfile(true)} userInitial={userInitial} userRole={userRole} />}

      {/* COACH screens */}
      {screen === "coach-dashboard" && <DashboardScreen club={club} ageGroups={ageGroups} planSessions={planSessions} weeklyPlan={weeklyPlan} upcomingSessions={upcomingSessions} onNav={setScreen} onOpenSession={openSession} allActivities={allActivities} selectedTeam={selectedTeam} />}
      {screen === "coach-planner" && <PlannerScreen onNav={setScreen} club={club} ageGroups={ageGroups} upcomingSessions={upcomingSessions} onOpenSession={openSession} allActivities={allActivities} coaches={coaches} skills={skills} diagramMap={diagramMap} selectedTeam={selectedTeam} />}
      {screen === "coach-sessions" && <SessionsListScreen club={club} selectedTeam={selectedTeam} onOpenSession={openSession} onNav={setScreen} onEditSession={editSession} />}
      {screen === "coach-builder" && <SessionBuilderScreen club={club} ageGroups={ageGroups} skills={skills} allActivities={allActivities} coaches={coaches} diagramMap={diagramMap} selectedTeam={selectedTeam} onNav={setScreen} editingSession={editingSession} onClearEdit={() => setEditingSession(null)} />}
      {screen === "coach-drills" && <DrillsScreen allActivities={allActivities} diagramMap={diagramMap} favouriteIds={favouriteIds} onToggleFavourite={toggleFavourite} userRole={userRole} />}
      {screen === "coach-players" && <PlayersScreen club={club} ageGroups={ageGroups} selectedTeam={selectedTeam} />}

      {/* CLUB screens */}
      {screen === "club-dashboard" && <ClubDashboardScreen club={club} ageGroups={ageGroups} coaches={coaches} selectedTeam={selectedTeam} onNav={setScreen} />}
      {screen === "club-setup" && <ClubSetupScreen club={club} userRole={userRole} onClubUpdated={setClub} onNav={setScreen} />}
      {screen === "club-legal" && <ClubLegalScreen club={club} currentUserId={session?.user?.id} onNav={setScreen} />}
      {screen === "club-teams" && <ClubTeamsScreen club={club} ageGroups={scopedAgeGroups} coaches={coaches} selectedTeam={selectedTeam} onSelectTeam={selectTeam} onReloadTeams={() => loadAgeGroups(club?.id)} userRole={userRole} />}
      {screen === "club-coaches" && <ClubCoachesScreen club={club} ageGroups={scopedAgeGroups} coaches={coaches} selectedTeam={selectedTeam} onReloadCoaches={() => loadCoaches(club?.id)} userRole={userRole} currentUserId={session?.user?.id} />}
      {screen === "club-compliance" && <ClubComplianceScreen club={club} coaches={coaches} userRole={userRole} />}
      {screen === "club-permissions" && <ClubPermissionsScreen club={club} userRole={userRole} ageGroups={ageGroups} />}
      {screen === "club-scheduling" && <ClubPage title="Facilities & Slots" sub="Manage facilities, recurring training slots and weekly pitch allocations.">
        <ClubScheduling
          club={club}
          ageGroups={scopedAgeGroups}
          currentUserId={session?.user?.id || ""}
          hideHeader
          readOnly={permissions.isTeamAdmin || permissions.isCoachMentor}
        />
      </ClubPage>}

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
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink }}>Profile</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: P.muted }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {/* User info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${P.p600}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 18, fontWeight: 800, color: P.p600 }}>
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
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: P.ink }}>{teamDisplayName(ag)}</span>
                      {permissions.canManageTeamStaff && <button onClick={async () => {
                        await removeProfileTeam(ag.id);
                      }} title="Remove team" style={{ background: "none", border: "none", color: P.coral, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>}
                    </div>
                  ))}
                  {myTeams.length === 0 && <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>No teams selected yet</div>}
                </div>
                {/* Add more teams — only users with team-management permission */}
                {permissions.canManageTeamStaff && <select onChange={async (e) => {
                  const agId = e.target.value;
                  if (!agId || myTeams.includes(agId)) return;
                  await addProfileTeam(agId);
                  e.target.value = "";
                }} style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${P.line}`, fontFamily: F.body, fontSize: 12, color: P.muted }}>
                  <option value="">Add another team...</option>
                  {ageGroups.filter((ag) => !myTeams.includes(ag.id)).sort((a, b) => parseInt(a.label.replace("U", "")) - parseInt(b.label.replace("U", ""))).map((ag) => (
                    <option key={ag.id} value={ag.id}>{teamDisplayName(ag)}</option>
                  ))}
                </select>}
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
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink, marginBottom: 6 }}>Link Copied!</div>
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
                <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: P.ink }}>Session Details</div>
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
                  <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: P.ink }}>
                    {sessionDetail.session_date ? new Date(sessionDetail.session_date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : "Training Session"}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: P.muted }}>{selectedTeam ? teamDisplayName(selectedTeam) : "Team"} · {sessionDetail.total_duration_mins}min · {sessionDetail.session_activities?.length || 0} drills</div>
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
                          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: P.p600, width: 22 }}>{i + 1}</span>
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
                          <span style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: "#fff" }}>{i + 1}</span>
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
      {showMobile && <MobileNav activeModule={activeModule} screen={screen} onNav={setScreen} enabledModules={enabledModules} userRole={userRole} />}
    </div>
  );
}




