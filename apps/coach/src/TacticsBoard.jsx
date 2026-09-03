import { useMemo } from "react";
import TacticalCanvas from "./TacticalCanvas";

const makeId = () =>
  "board_" + Date.now() + "_" + Math.random().toString(36).slice(2);

export default function TacticsBoard({ selectedTeam }) {
  const draftKey = useMemo(
    () =>
      "spraoi_tactics_draft_" +
      (selectedTeam?.id || "general"),
    [selectedTeam?.id]
  );

  const teamName = useMemo(() => {
    if (!selectedTeam) return "Coach";

    const gender =
      String(selectedTeam.gender || "").toLowerCase() === "girls"
        ? "Girls"
        : String(selectedTeam.gender || "").toLowerCase() === "boys"
        ? "Boys"
        : "";

    return [selectedTeam.label, gender]
      .filter(Boolean)
      .join(" ");
  }, [selectedTeam]);

  function currentBoard() {
    try {
      return JSON.parse(
        localStorage.getItem(draftKey) || "null"
      );
    } catch {
      return null;
    }
  }

  function saveNamedBoard() {
    const board = currentBoard();

    if (!board) {
      alert("There is no board to save yet.");
      return;
    }

    const name =
      window.prompt(
        "Board name",
        teamName + " tactics"
      ) || teamName + " tactics";

    const rows = JSON.parse(
      localStorage.getItem("spraoi_tactics_boards") || "[]"
    );

    const record = {
      id: makeId(),
      name,
      teamId: selectedTeam?.id || null,
      teamName,
      board,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "spraoi_tactics_boards",
      JSON.stringify([record, ...rows])
    );

    alert("Board saved to My Boards.");
  }

  function openNamedBoard() {
    const rows = JSON.parse(
      localStorage.getItem("spraoi_tactics_boards") || "[]"
    );

    if (!rows.length) {
      alert("You haven't saved any named boards yet.");
      return;
    }

    const menu = rows
      .map(
        (row, index) =>
          `${index + 1}. ${row.name}`
      )
      .join("\n");

    const answer = window.prompt(
      "Enter the board number to open:\n\n" + menu
    );

    if (!answer) return;

    const chosen = rows[Number(answer) - 1];

    if (!chosen?.board) return;

    localStorage.setItem(
      draftKey,
      JSON.stringify(chosen.board)
    );

    window.location.reload();
  }

  function exportPng() {
    const svg = document.querySelector(
      ".tc-board-shell svg"
    );

    if (!svg) return;

    const source =
      new XMLSerializer().serializeToString(svg);

    const blob = new Blob(
      [source],
      { type: "image/svg+xml;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas =
        document.createElement("canvas");

      canvas.width = 1800;
      canvas.height = 1120;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((png) => {
        if (!png) return;

        const link =
          document.createElement("a");

        const pngUrl =
          URL.createObjectURL(png);

        link.href = pngUrl;
        link.download =
          "spraoi-tactics-board.png";

        link.click();

        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = url;
  }

  return (
    <div
      style={{
        minHeight: "100%",
        overflow: "auto",
        background: "#f8fafc",
        padding: "22px 24px 42px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#10243e",
              }}
            >
              Tactics Board
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              {teamName} · Your current board is
              saved automatically
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={openNamedBoard}
              style={buttonStyle}
            >
              My Boards
            </button>

            <button
              onClick={saveNamedBoard}
              style={buttonStyle}
            >
              Save Copy
            </button>

            <button
              onClick={exportPng}
              style={{
                ...buttonStyle,
                background: "#7C3AED",
                borderColor: "#7C3AED",
                color: "#fff",
              }}
            >
              Export PNG
            </button>
          </div>
        </div>

        <TacticalCanvas
          storageKey={draftKey}
          selectedTeam={selectedTeam}
        />
      </div>
    </div>
  );
}

const buttonStyle = {
  minHeight: 42,
  padding: "9px 13px",
  borderRadius: 10,
  border: "1px solid #d7dee8",
  background: "#fff",
  color: "#10243e",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};
