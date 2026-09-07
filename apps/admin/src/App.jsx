import { useEffect, useMemo, useRef, useState } from "react";
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

  // Invitation links authenticate through Supabase and then redirect back to
  // admin.spraoisports.com with ?invite=<token>. The Club app owns the invite
  // onboarding/password flow, so it must be mounted before the normal Admin
  // shell default (Coach) is allowed to render.
  if (params.get("invite")) return "club";

  const moduleId = String(params.get("module") || "").toLowerCase();

  // Explicit module navigation is respected while using the app,
  // but a fresh normal login defaults to Coach.
  if (MODULE_ORDER.includes(moduleId)) {
    return moduleId;
  }

  return "coach";
}

export default function App() {
  const initial = useMemo(() => requestedModule(), []);
  const [activeModule, setActiveModule] = useState(initial);
  const [mountedModules, setMountedModules] = useState([initial]);
  const mountedModulesRef = useRef(new Set([initial]));
  const [switchingModule, setSwitchingModule] = useState(false);
  useEffect(() => {
    window.__SPRAOI_ADMIN_SHELL__ = true;

    const switchModule = (moduleId, screen = null, team = null) => {
      const key = String(moduleId || "").toLowerCase();
      if (!MODULE_ORDER.includes(key)) return;

      const isFirstMount = !mountedModulesRef.current.has(key);

      if (isFirstMount) {
        mountedModulesRef.current.add(key);
        setMountedModules(Array.from(mountedModulesRef.current));
        setSwitchingModule(true);
      }

      setActiveModule(key);

      const url = new URL(window.location.href);
      url.searchParams.set("module", key);
      url.searchParams.set("screen", screen || DEFAULT_SCREEN[key]);

      const canonicalTeam =
        team ||
        localStorage.getItem("spraoi_active_team_id") ||
        localStorage.getItem("spraoi_team_id") ||
        "";

      if (canonicalTeam) {
        url.searchParams.set("team", canonicalTeam);
      } else {
        url.searchParams.delete("team");
      }

      window.history.replaceState({}, "", url);

      window.dispatchEvent(new CustomEvent("spraoi:shell-screen", {
        detail: { moduleId: key, screen: screen || DEFAULT_SCREEN[key], team: team || null }
      }));

      window.setTimeout(() => {
        setSwitchingModule(false);
      }, 250);
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
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f7f9fc"
      }}
    >
      {mountedModules.map((moduleId) => {
        const ModuleApp = apps[moduleId];
        if (!ModuleApp) return null;

        return (
          <div
            key={moduleId}
            style={{
              display: activeModule === moduleId ? "block" : "none",
              width: "100%",
              minHeight: "100vh"
            }}
          >
            <ModuleApp />
          </div>
        );
      })}

      {switchingModule && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "grid",
            placeItems: "center",
            background: "#0B2A4A"
          }}
        >
          <img
            src="/spraoi-logo.png"
            alt="Spraoi Sports"
            style={{
              width: 54,
              height: 54,
              objectFit: "contain"
            }}
          />
        </div>
      )}
    </div>
  );
}

// trigger admin rebuild for permissions deployment

// Vercel deployment trigger - Academy/Coach dependency update
