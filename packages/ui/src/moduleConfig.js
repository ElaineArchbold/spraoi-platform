const ACTIVE_MODULE_KEY = "spraoi_active_module";
const LEGACY_ACTIVE_SCREEN_KEY = "spraoi_active_screen";
const ACTIVE_TEAM_KEY = "spraoi_active_team_id";
const ACTIVE_CLUB_KEY = "spraoi_active_club_id";
const ACTIVE_EVENT_KEY = "spraoi_active_cup_event_id";

const DEV_MODULE_URLS = {
  club: "http://localhost:5174",
  plus: "http://localhost:5175",
  academy: "http://localhost:5176",
  cup: "http://localhost:5177",
  coach: "http://localhost:5179",
  admin: "http://localhost:5180",
};

export function moduleScreenKey(moduleId) {
  return `spraoi_${String(moduleId || "").toLowerCase()}_active_screen`;
}

export function readModuleScreen(moduleId, fallback = null) {
  if (typeof window === "undefined") return fallback;

  const moduleKey = String(moduleId || "").toLowerCase();
  const saved = localStorage.getItem(moduleScreenKey(moduleKey));

  if (saved && saved.startsWith(`${moduleKey}-`)) {
    return saved;
  }

  const legacy = localStorage.getItem(LEGACY_ACTIVE_SCREEN_KEY);
  if (legacy && legacy.startsWith(`${moduleKey}-`)) {
    localStorage.setItem(moduleScreenKey(moduleKey), legacy);
    return legacy;
  }

  return fallback;
}

export function writeModuleScreen(moduleId, screen) {
  if (typeof window === "undefined" || !moduleId || !screen) return;

  const moduleKey = String(moduleId).toLowerCase();
  if (!String(screen).startsWith(`${moduleKey}-`)) return;

  localStorage.setItem(ACTIVE_MODULE_KEY, moduleKey);
  localStorage.setItem(moduleScreenKey(moduleKey), String(screen));
  localStorage.setItem(LEGACY_ACTIVE_SCREEN_KEY, String(screen));
}

export function requestedModuleFromUrl(fallbackModule = null) {
  if (typeof window === "undefined") {
    return { moduleId: fallbackModule, screen: null };
  }

  const params = new URLSearchParams(window.location.search);
  const rawModule = params.get("module");
  const moduleId = String(rawModule || fallbackModule || "").toLowerCase() || null;
  const screen = params.get("screen");

  return { moduleId, screen };
}

export function requestedScreenFromUrl(fallback = null) {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get("screen") || fallback;
}

export function readActiveTeamId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_TEAM_KEY) || localStorage.getItem("spraoi_team_id");
}

export function readActiveClubId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CLUB_KEY);
}

export function readActiveCupEventId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_EVENT_KEY);
}

export function moduleBaseUrl(moduleId) {
  if (typeof window === "undefined") return "";

  const moduleKey = String(moduleId || "").toLowerCase();

  if (import.meta.env.DEV) {
    return DEV_MODULE_URLS[moduleKey] || DEV_MODULE_URLS.admin;
  }

  const url = new URL(window.location.origin);
  url.searchParams.set("module", moduleKey);
  return url.toString();
}

export function adminShellBaseUrl() {
  return moduleBaseUrl("admin");
}

export function openAdminModule(moduleId, screen = null) {
  if (typeof window === "undefined" || !moduleId) return;

  const moduleKey = String(moduleId).toLowerCase();
  const targetScreen = screen || readModuleScreen(moduleKey, `${moduleKey}-dashboard`);

  writeModuleScreen(moduleKey, targetScreen);

  const url = new URL(moduleBaseUrl(moduleKey));
  url.searchParams.set("screen", targetScreen);

  window.location.assign(url.toString());
}
