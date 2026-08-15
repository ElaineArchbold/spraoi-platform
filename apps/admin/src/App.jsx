import { useEffect } from "react";

const DEV_MODULE_URLS = {
  club: "http://localhost:5174",
  academy: "http://localhost:5176",
  cup: "http://localhost:5177",
  coach: "http://localhost:5179",
};

const PROD_MODULE_PATHS = {
  club: "/club/",
  academy: "/academy/",
  cup: "/cup/",
  coach: "/coach/",
};

const VALID_MODULES = new Set(Object.keys(PROD_MODULE_PATHS));

function isLocalDevelopment() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function requestedModule() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = String(params.get("module") || "").toLowerCase();

  if (VALID_MODULES.has(fromUrl)) return fromUrl;

  // Admin is routing infrastructure only.
  // With no explicit module, enter through Club.
  return "club";
}

export default function App() {
  useEffect(() => {
    const moduleId = requestedModule();
    const params = new URLSearchParams(window.location.search);

    const target = isLocalDevelopment()
      ? new URL(DEV_MODULE_URLS[moduleId])
      : new URL(PROD_MODULE_PATHS[moduleId], window.location.origin);

    const screen = params.get("screen");
    const team = params.get("team");

    if (screen && screen.startsWith(`${moduleId}-`)) {
      target.searchParams.set("screen", screen);
    }

    if (team) {
      target.searchParams.set("team", team);
    }

    window.location.replace(target.toString());
  }, []);

  return null;
}