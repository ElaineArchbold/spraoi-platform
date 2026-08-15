const ACTIVE_MODULE_KEY = "spraoi_active_module";
const LEGACY_ACTIVE_SCREEN_KEY = "spraoi_active_screen";

const DEV_MODULE_URLS = {
  club: "http://localhost:5174",
  plus: "http://localhost:5175",
  academy: "http://localhost:5176",
  cup: "http://localhost:5177",
  coach: "http://localhost:5179",
  admin: "http://localhost:5180",
  connect: "http://localhost:5181",
};

const PROD_MODULE_PATHS = {
  club: "/club/",
  academy: "/academy/",
  cup: "/cup/",
  coach: "/coach/",
  admin: "/",
};

const DEFAULT_SCREENS = {
  club: "club-dashboard",
  plus: "plus-dashboard",
  academy: "academy-dashboard",
  cup: "cup-dashboard",
  coach: "coach-dashboard",
  admin: "admin-home",
  connect: "connect-dashboard",
};

function isLocalDevelopment() {
  if (typeof window === "undefined") return false;

  return (
    import.meta.env.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function moduleScreenKey(moduleId) {
  return `spraoi_${String(moduleId || "").toLowerCase()}_active_screen`;
}

export function readModuleScreen(moduleId, fallback = null) {
  if (typeof window === "undefined") return fallback;

  const key = String(moduleId || "").toLowerCase();
  const saved = localStorage.getItem(moduleScreenKey(key));

  return saved && saved.startsWith(`${key}-`) ? saved : fallback;
}

export function writeModuleScreen(moduleId, screen) {
  if (typeof window === "undefined" || !moduleId || !screen) return;

  const key = String(moduleId).toLowerCase();
  const value = String(screen);

  if (!value.startsWith(`${key}-`)) return;

  localStorage.setItem(ACTIVE_MODULE_KEY, key);
  localStorage.setItem(moduleScreenKey(key), value);
  localStorage.setItem(LEGACY_ACTIVE_SCREEN_KEY, value);
}

export function requestedModuleFromUrl(fallbackModule = null) {
  if (typeof window === "undefined") {
    return { moduleId: fallbackModule, screen: null };
  }

  const params = new URLSearchParams(window.location.search);
  const moduleId =
    String(params.get("module") || fallbackModule || "").toLowerCase() || null;

  return {
    moduleId,
    screen: params.get("screen"),
  };
}

export function requestedScreenFromUrl(fallback = null) {
  if (typeof window === "undefined") return fallback;

  return (
    new URLSearchParams(window.location.search).get("screen") ||
    fallback
  );
}

export function requestedTeamFromUrl(fallback = null) {
  if (typeof window === "undefined") return fallback;

  return (
    new URLSearchParams(window.location.search).get("team") ||
    fallback
  );
}

export function moduleBaseUrl(moduleId) {
  if (typeof window === "undefined") return "";

  const key = String(moduleId || "").toLowerCase();

  if (isLocalDevelopment()) {
    return DEV_MODULE_URLS[key] || DEV_MODULE_URLS.club;
  }

  const path = PROD_MODULE_PATHS[key] || PROD_MODULE_PATHS.club;

  return new URL(path, window.location.origin).toString();
}

export function adminShellBaseUrl() {
  return moduleBaseUrl("admin");
}

export function openAdminModule(moduleId, screen = null) {
  if (typeof window === "undefined" || !moduleId) return;

  const key = String(moduleId).toLowerCase();
  const target = new URL(moduleBaseUrl(key));

  const targetScreen =
    screen && String(screen).startsWith(`${key}-`)
      ? String(screen)
      : DEFAULT_SCREENS[key];

  if (targetScreen) {
    target.searchParams.set("screen", targetScreen);
  }

  const activeTeamId =
    localStorage.getItem("spraoi_active_team_id") ||
    localStorage.getItem("spraoi_team_id");

  if (activeTeamId) {
    target.searchParams.set("team", activeTeamId);
  }

  if (targetScreen) {
    writeModuleScreen(key, targetScreen);
  }

  window.location.assign(target.toString());
}