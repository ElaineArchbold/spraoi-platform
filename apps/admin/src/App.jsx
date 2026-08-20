import { useEffect, useMemo, useState } from "react";
import CoachApp from "../../coach/src/App.jsx";
import AcademyApp from "../../academy/src/App.jsx";
import ConnectApp from "../../connect/src/App.jsx";
import CupApp from "../../cup/src/App.jsx";
import ClubApp from "../../club/src/App.jsx";

const MODULE_ORDER = ["coach", "academy", "connect", "cup", "club"];
const DEFAULT_SCREEN = {
  coach: "coach-dashboard",
  academy: "academy-dashboard",
  connect: "connect-dashboard",
  cup: "cup-dashboard",
  club: "club-dashboard",
};

function requestedModule() {
  const params = new URLSearchParams(window.location.search);
  const moduleId = String(params.get("module") || "coach").toLowerCase();
  return MODULE_ORDER.includes(moduleId) ? moduleId : "coach";
}

export default function App() {
  const initial = useMemo(() => requestedModule(), []);
  const [activeModule, setActiveModule] = useState(initial);
  const [mounted, setMounted] = useState(() => new Set([initial]));

  useEffect(() => {
    window.__SPRAOI_ADMIN_SHELL__ = true;

    const switchModule = (moduleId, screen = null, team = null) => {
      const key = String(moduleId || "").toLowerCase();
      if (!MODULE_ORDER.includes(key)) return;

      setMounted((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
      setActiveModule(key);

      const url = new URL(window.location.href);
      url.searchParams.set("module", key);
      url.searchParams.set("screen", screen || DEFAULT_SCREEN[key]);
      if (team) url.searchParams.set("team", team);
      window.history.replaceState({}, "", url);

      window.dispatchEvent(new CustomEvent("spraoi:shell-screen", {
        detail: { moduleId: key, screen: screen || DEFAULT_SCREEN[key], team: team || null }
      }));
    };

    const onSwitch = (event) => {
      const detail = event?.detail || {};
      switchModule(detail.moduleId, detail.screen, detail.team);
    };

    const onPopState = () => switchModule(requestedModule());

    window.addEventListener("spraoi:switch-module", onSwitch);
    window.addEventListener("popstate", onPopState);

    return () => {
      delete window.__SPRAOI_ADMIN_SHELL__;
      window.removeEventListener("spraoi:switch-module", onSwitch);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const apps = {
    coach: CoachApp,
    academy: AcademyApp,
    connect: ConnectApp,
    cup: CupApp,
    club: ClubApp,
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#f7f9fc" }}>
      {MODULE_ORDER.map((moduleId) => {
        if (!mounted.has(moduleId)) return null;
        const ModuleApp = apps[moduleId];
        return (
          <div
            key={moduleId}
            aria-hidden={activeModule !== moduleId}
            style={{ display: activeModule === moduleId ? "block" : "none", minHeight: "100vh" }}
          >
            <ModuleApp />
          </div>
        );
      })}
    </div>
  );
}

// trigger admin rebuild for permissions deployment
