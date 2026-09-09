import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function cleanRole(value) {
  const raw = String(value || "Coach / Mentor")
    .replaceAll("_", " ")
    .trim();

  if (!raw || ["coach mentor", "coach", "mentor"].includes(raw.toLowerCase())) return "Coach / Mentor";

  return raw
    .split(/\s+/)
    .map((part) =>
      part.length
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part
    )
    .join(" ");
}

function userName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name ||
    user?.email ||
    "User"
  );
}

function initialsFor(user) {
  const name = String(userName(user) || "").trim();

  if (!name) return "U";

  if (name.includes("@")) {
    const parts = name.split("@")[0].split(/[._-]+/).filter(Boolean);
    return ((parts[0]?.[0] || "U") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    (parts[0]?.charAt(0) || "") +
    (parts[parts.length - 1]?.charAt(0) || "")
  ).toUpperCase();
}

function teamName(team) {
  if (!team) return "Team";

  const label = String(team.label || team.name || "Team").trim();
  const gender = String(team.gender || "").trim();

  if (!gender) return label;

  const genderLabel =
    gender.toLowerCase() === "girls"
      ? "Girls"
      : gender.toLowerCase() === "boys"
        ? "Boys"
        : gender.charAt(0).toUpperCase() + gender.slice(1);

  if (label.toLowerCase().includes(genderLabel.toLowerCase())) {
    return label;
  }

  return `${label} ${genderLabel}`;
}

function ageValue(team) {
  const match = String(team?.label || team?.name || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
}

export default function ProfileModal({
  open,
  onClose,
  user,
  role,
  clubName,
  teams = [],
  allTeams = [],
  canManageTeams = false,
  onAddTeam,
  onRemoveTeam,
  onSignOut,
}) {
  const [busyTeam, setBusyTeam] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setError("");
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll("button:not(:disabled), select:not(:disabled)") || [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus?.(); };
  }, [open]);

  const assignedIds = useMemo(
    () => new Set((teams || []).map((team) => String(team.id))),
    [teams]
  );

  const availableTeams = useMemo(
    () =>
      (allTeams || [])
        .filter((team) => !assignedIds.has(String(team.id)))
        .sort((a, b) => {
          const ageDifference = ageValue(a) - ageValue(b);
          if (ageDifference) return ageDifference;
          return teamName(a).localeCompare(teamName(b));
        }),
    [allTeams, assignedIds]
  );

  if (!open) return null;

  async function removeTeam(teamId) {
    if (!canManageTeams || !onRemoveTeam || busyTeam || adding) return;

    try {
      setError("");
      setBusyTeam(String(teamId));
      await onRemoveTeam(teamId);
    } catch {
      setError("Could not update team assignments. Please try again.");
    } finally {
      setBusyTeam("");
    }
  }

  async function addTeam(teamId) {
    if (!teamId || !canManageTeams || !onAddTeam || adding || busyTeam) return;

    try {
      setError("");
      setAdding(true);
      await onAddTeam(teamId);
    } catch {
      setError("Could not update team assignments. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function signOut() {
    onClose?.();
    await onSignOut?.();
  }

  return createPortal(
    <div
      className="spraoi-profile-modal"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(5,18,34,.58)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        fontFamily: "Inter, Segoe UI, sans-serif",
        lineHeight: 1.4,
        textAlign: "left",
      }}
    >
      <style>{`.spraoi-profile-modal *, .spraoi-profile-modal *::before, .spraoi-profile-modal *::after { box-sizing: border-box; }
        .spraoi-profile-modal button, .spraoi-profile-modal select { font-family: inherit; letter-spacing: normal; text-transform: none; min-height: 0; }
      `}</style>
      <div
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        style={{
          background: "#fff",
          borderRadius: 18,
          maxWidth: 420,
          width: "100%",
          height: "min(420px, calc(100dvh - 32px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(15,23,42,.24)",
          border: "1px solid #e5eaf1",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            flexShrink: 0,
            borderBottom: "1px solid #e5eaf1",
          }}
        >
          <div
            style={{
              fontFamily: "inherit",
              fontSize: 17,
              fontWeight: 800,
              color: "#10243e",
            }}
          >
            Profile
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
              color: "#64748b",
              padding: 4,
            }}
          >
            {"\u00d7"}
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#e8eef7",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#20385f",
              }}
            >
              {initialsFor(user)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#10243e",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email || userName(user)}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginTop: 2,
                }}
              >
                {cleanRole(role)}
                {clubName ? ` \u00b7 ${clubName}` : ""}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20, flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#10243e",
                marginBottom: 8,
              }}
            >
              My Teams
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
                alignContent: "flex-start",
                flex: 1,
                minHeight: 34,
              }}
            >
              {(teams || []).map((team) => (
                <div
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#f5f7fa",
                    border: "1px solid #e1e7ef",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#10243e",
                    }}
                  >
                    {teamName(team)}
                  </span>

                  {canManageTeams && onRemoveTeam ? (
                    <button
                      type="button"
                      disabled={Boolean(busyTeam) || adding}
                      title="Remove team"
                      aria-label={`Remove ${teamName(team)}`}
                      onClick={() => removeTeam(team.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d32f2f",
                        cursor: busyTeam ? "default" : "pointer",
                        width: 14,
                        height: 14,
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      {"\u00d7"}
                    </button>
                  ) : <span aria-hidden="true" style={{ width: 14, height: 14 }} />}
                </div>
              ))}

              {(teams || []).length === 0 && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  No teams assigned
                </div>
              )}
            </div>

            <select
                  defaultValue=""
                  aria-label="Add another team"
                  disabled={!canManageTeams || !onAddTeam || !availableTeams.length || adding || Boolean(busyTeam)}
                  onChange={async (event) => {
                    const value = event.target.value;
                    await addTeam(value);
                    event.target.value = "";
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.5px solid #dfe5ed",
                    background: "#fff",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <option value="">
                    {!canManageTeams || !onAddTeam ? "Assignments managed by your club" : adding ? "Adding team..." : availableTeams.length ? "Add another team..." : "All teams assigned"}
                  </option>

                  {(canManageTeams ? availableTeams : []).map((team) => (
                    <option key={team.id} value={team.id}>
                      {teamName(team)}
                    </option>
                  ))}
            </select>
          </div>

          {error && <div role="alert" style={{ fontSize: 11, color: "#d32f2f", marginBottom: 8 }}>{error}</div>}
          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
              flexShrink: 0,
              marginTop: "auto",
              padding: 12,
              borderRadius: 10,
              border: "1.5px solid rgba(211,47,47,.20)",
              background: "rgba(211,47,47,.04)",
              fontSize: 12,
              fontWeight: 700,
              color: "#d32f2f",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
