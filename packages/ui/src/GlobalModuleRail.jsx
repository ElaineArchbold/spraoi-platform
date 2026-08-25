import { useEffect, useMemo, useState } from "react";
import { openAdminModule } from "./platformNavigation.js";

const MODULES = {
  coach: { label: "Coach", color: "#7C3AED", icon: "/spraoi-coach-icon.png", screen: "coach-dashboard" },
  academy: { label: "Academy", color: "#2563EB", icon: "/spraoi-academy-icon.png", screen: "academy-dashboard" },
  connect: { label: "Connect", color: "#F97316", icon: "/spraoi-connect-icon.png", screen: "connect-dashboard" },
  cup: { label: "Cup", color: "#E4A400", icon: "/spraoi-cup-icon.png", screen: "cup-dashboard" },
  club: { label: "Club", color: "#DC2626", icon: "/spraoi-club-icon.png", screen: "club-dashboard" },
};

const ACCESS_KEY = "spraoi_shell_enabled_modules";
const INITIALS_KEY = "spraoi_shell_user_initials";
const TEAM_KEY = "spraoi_shell_active_team";

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function compactTeamName(team) {
  if (!team) return "";
  const label = String(team.label || team.name || "").trim();
  const gender = String(team.gender || "").trim().toLowerCase();
  let display = label;
  if (gender === "boys" && !/\bboys$/i.test(display)) display += " Boys";
  if (gender === "girls" && !/\bgirls$/i.test(display)) display += " Girls";
  return display
    .replace(/\s*Boys$/i, "B")
    .replace(/\s*Girls$/i, "G")
    .replace(/\s+/g, "");
}

export default function GlobalModuleRail({
  activeModule,
  enabledModules = [],
  club,
  selectedTeam,
  visibleTeams = [],
  onSelectTeam,
  initials = "U",
  onShowProfile,
}) {
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => {
    if (activeModule !== "coach") return;
    localStorage.setItem(
      ACCESS_KEY,
      JSON.stringify([...new Set(enabledModules.map(String))])
    );
    if (initials && initials !== "U") {
      localStorage.setItem(INITIALS_KEY, String(initials).toUpperCase());
    }
    if (selectedTeam?.id) {
      localStorage.setItem(
        TEAM_KEY,
        JSON.stringify({
          id: selectedTeam.id,
          label: selectedTeam.label || selectedTeam.name || "",
          name: selectedTeam.name || selectedTeam.label || "",
          gender: selectedTeam.gender || "",
        })
      );
    }
  }, [
    activeModule,
    JSON.stringify(enabledModules),
    initials,
    selectedTeam?.id,
    selectedTeam?.label,
    selectedTeam?.name,
    selectedTeam?.gender,
  ]);

  const storedModules = useMemo(
    () => readJson(ACCESS_KEY, []),
    [activeModule, JSON.stringify(enabledModules)]
  );

  const effectiveModules =
    activeModule === "coach" || !storedModules.length
      ? [...new Set(enabledModules.map(String))]
      : storedModules;

  const storedInitials =
    typeof window !== "undefined"
      ? localStorage.getItem(INITIALS_KEY)
      : null;
  const effectiveInitials =
    activeModule === "coach"
      ? (initials || storedInitials || "U")
      : (storedInitials || initials || "U");

  const storedTeam = useMemo(
    () => readJson(TEAM_KEY, null),
    [activeModule, selectedTeam?.id]
  );

  // One canonical team across every module. The shared shell value wins;
  // module-local state follows it through the shared context event.
  const canonicalTeamId = String(
    storedTeam?.id || selectedTeam?.id || ""
  );

  const displayedTeam =
    visibleTeams.find((team) => String(team.id) === canonicalTeamId) ||
    (canonicalTeamId && storedTeam ? storedTeam : selectedTeam);

  const moduleKeys = ["coach", "academy", "connect", "cup", "club"].filter(
    (key) => key !== "club" || effectiveModules.includes("club")
  );

  function selectTeam(id) {
    const team = visibleTeams.find((item) => String(item.id) === String(id));
    if (!team) return;
    localStorage.setItem("spraoi_active_team_id", String(team.id));
    localStorage.setItem("spraoi_team_id", String(team.id));
    localStorage.setItem(
      TEAM_KEY,
      JSON.stringify({
        id: team.id,
        label: team.label || team.name || "",
        name: team.name || team.label || "",
        gender: team.gender || "",
      })
    );

    // Same-tab localStorage changes do not fire the browser storage event.
    // Broadcast both legacy team events so every mounted module updates
    // immediately to the exact same team.
    // Keep the Admin URL in sync as well. Module bootstraps prefer the URL,
    // so a stale ?team= value must never override the selector.
    const url = new URL(window.location.href);
    url.searchParams.set("team", String(team.id));
    window.history.replaceState({}, "", url);

    window.dispatchEvent(
      new CustomEvent("spraoi-active-context", {
        detail: { teamId: String(team.id) },
      })
    );
    window.dispatchEvent(
      new CustomEvent("spraoi-team-change", {
        detail: { teamId: String(team.id) },
      })
    );

    onSelectTeam?.(team);
  }

  function openModule(key) {
    if (!effectiveModules.includes(key)) {
      setPermissionOpen(true);
      return;
    }
    if (key === activeModule) return;
    openAdminModule(key, MODULES[key].screen);
  }

  return (
    <>
      <aside
        className="spraoi-global-rail"
        style={{
          width: 82,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 8px",
          gap: 8,
          borderRight: "1px solid #E7ECF3",
          boxSizing: "border-box",
        }}
      >
        <div
          title={club?.name || "Club"}
          style={{
            width: 58,
            height: 58,
            borderRadius: 17,
            background: "#fff",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            border: "1px solid #E4EAF2",
            boxShadow: "0 5px 16px rgba(16,36,62,.07)",
            marginBottom: 4,
          }}
        >
          <img
            src={club?.logo_url || "/spraoi-club-icon.png"}
            alt={club?.name ? `${club.name} crest` : "Club crest"}
            style={{ width: 50, height: 50, objectFit: "contain" }}
          />
        </div>

        <div style={{ width: "100%", display: "grid", placeItems: "center", gap: 3 }}>
          <div
            style={{
              fontSize: 8,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "#64748B",
              fontWeight: 800,
            }}
          >
            Team
          </div>
          <select
            aria-label="Active team"
            value={canonicalTeamId}
            title={compactTeamName(displayedTeam) || "Select team"}
            onChange={(e) => selectTeam(e.target.value)}
            style={{
              width: 62,
              height: 32,
              borderRadius: 9,
              border: "1px solid #DDE4EE",
              background: "#fff",
              color: "#10243e",
              fontSize: 11,
              fontWeight: 800,
              padding: "0 3px",
              cursor: "pointer",
            }}
          >
            {!canonicalTeamId && <option value="">—</option>}
            {visibleTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {compactTeamName(team)}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 7,
          }}
        >
          {moduleKeys.map((key) => {
            const module = MODULES[key];
            const active = activeModule === key;
            const locked = !effectiveModules.includes(key);
            return (
              <button
                key={key}
                type="button"
                className="spraoi-module-switcher-button"
                data-active={active}
                title={locked ? `${module.label} — permission required` : module.label}
                onClick={() => openModule(key)}
                style={{
                  width: "100%",
                  minHeight: 64,
                  borderRadius: 15,
                  border: active ? "1px solid #DDE4EE" : "1px solid transparent",
                  background: active ? "#F1F4F9" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  position: "relative",
                  cursor: locked ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ width: 48, height: 48, display: "grid", placeItems: "center" }}>
                  <img
                    src={module.icon}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: 44,
                      height: 44,
                      objectFit: "contain",
                      filter: locked ? "grayscale(1) opacity(.42)" : "none",
                    }}
                  />
                </span>
                <span
                  style={{
                    color: active ? "#10213A" : "#65758B",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {module.label}
                </span>
                {locked && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 3,
                      fontSize: 9,
                    }}
                  >
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onShowProfile}
          title="Profile & sign out"
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            border: "1px solid #DDE4EE",
            background: "#F4F6FA",
            color: "#10213A",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {String(effectiveInitials || "U").toUpperCase()}
        </button>
      </aside>

      {permissionOpen && (
        <div
          onClick={() => setPermissionOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30000,
            background: "rgba(15,23,42,.52)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px,100%)",
              background: "#fff",
              borderRadius: 18,
              padding: 22,
              boxShadow: "0 24px 70px rgba(15,23,42,.24)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28 }}>🔒</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#10213A", marginTop: 8 }}>
              You don't have permission to access this module
            </div>
            <div style={{ fontSize: 12, color: "#68778D", lineHeight: 1.6, marginTop: 8 }}>
              Your current role does not include access to this module. Contact your Club Administrator if you need access.
            </div>
            <button
              type="button"
              onClick={() => setPermissionOpen(false)}
              style={{
                marginTop: 16,
                minWidth: 110,
                height: 40,
                border: 0,
                borderRadius: 10,
                background: "#10243E",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
