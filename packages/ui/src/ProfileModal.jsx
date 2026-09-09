import { useMemo, useState } from "react";

function cleanRole(value) {
  const raw = String(value || "Coach / Mentor")
    .replaceAll("_", " ")
    .trim();

  if (!raw) return "Coach / Mentor";

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
    return name.charAt(0).toUpperCase();
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
    if (!canManageTeams || !onRemoveTeam || busyTeam) return;

    try {
      setBusyTeam(String(teamId));
      await onRemoveTeam(teamId);
    } finally {
      setBusyTeam("");
    }
  }

  async function addTeam(teamId) {
    if (!teamId || !canManageTeams || !onAddTeam || adding) return;

    try {
      setAdding(true);
      await onAddTeam(teamId);
    } finally {
      setAdding(false);
    }
  }

  async function signOut() {
    onClose?.();
    await onSignOut?.();
  }

  return (
    <div
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
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        style={{
          background: "#fff",
          borderRadius: 18,
          maxWidth: 420,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
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

        <div style={{ padding: 20 }}>
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

          <div style={{ marginBottom: 20 }}>
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
                marginBottom:
                  canManageTeams && availableTeams.length ? 10 : 0,
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

                  {canManageTeams && onRemoveTeam && (
                    <button
                      type="button"
                      disabled={Boolean(busyTeam)}
                      title="Remove team"
                      aria-label={`Remove ${teamName(team)}`}
                      onClick={() => removeTeam(team.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d32f2f",
                        cursor: busyTeam ? "default" : "pointer",
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      {"\u00d7"}
                    </button>
                  )}
                </div>
              ))}

              {(teams || []).length === 0 && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  No teams assigned
                </div>
              )}
            </div>

            {canManageTeams &&
              onAddTeam &&
              availableTeams.length > 0 && (
                <select
                  defaultValue=""
                  disabled={adding}
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
                    {adding ? "Adding team..." : "Add another team..."}
                  </option>

                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {teamName(team)}
                    </option>
                  ))}
                </select>
              )}
          </div>

          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
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
    </div>
  );
}
