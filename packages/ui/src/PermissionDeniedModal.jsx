import React from "react";

export default function PermissionDeniedModal({
  open,
  onClose,
  teamName = "",
  accent = "#7C3AED",
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(15,23,42,.52)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(430px,100%)",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(15,23,42,.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "22px 22px 18px", textAlign: "center" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              margin: "0 auto 14px",
              display: "grid",
              placeItems: "center",
              background: `${accent}18`,
              color: accent,
              fontSize: 25,
              fontWeight: 900,
            }}
          >
            🔒
          </div>
          <div style={{ fontFamily: "Manrope, Segoe UI, sans-serif", fontSize: 20, fontWeight: 800, color: "#13243b" }}>
            You don't have permission to do that
          </div>
          <div style={{ fontFamily: "Inter, Segoe UI, sans-serif", fontSize: 12, lineHeight: 1.65, color: "#627187", marginTop: 9 }}>
            {teamName
              ? `You don't currently have permission to manage this for ${teamName}.`
              : "Your current role does not have permission to make this change."}
            <br />
            Contact your Club Administrator if you need this access.
          </div>
        </div>
        <div style={{ padding: "14px 18px 18px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            autoFocus
            style={{ minWidth: 120, height: 40, border: 0, borderRadius: 10, background: accent, color: "#fff", fontFamily: "Inter, Segoe UI, sans-serif", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
