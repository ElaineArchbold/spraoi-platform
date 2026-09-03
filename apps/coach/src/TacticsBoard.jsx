import { useMemo } from "react";
import TacticalCanvas from "./TacticalCanvas";
import { supabase } from "./supabaseClient";

const CLUB_ID = "76df4b9c-666c-48e1-9cd6-0d9ed2471503";

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

  async function currentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  async function saveBoard({
    shared = false,
    name = null,
  } = {}) {
    const board = currentBoard();

    if (!board) {
      alert("There is no board to save yet.");
      return;
    }

    const user = await currentUser();

    if (!user) {
      alert("You need to be signed in to save boards.");
      return;
    }

    const boardName =
      name ||
      window.prompt(
        shared
          ? "Name this board before sharing"
          : "Board name",
        teamName + " tactics"
      );

    if (!boardName) return;

    const { error } = await supabase
      .from("tactics_boards")
      .insert({
        club_id: CLUB_ID,
        age_group_id: selectedTeam?.id || null,
        created_by: user.id,
        name: boardName.trim(),
        board_data: board,
        shared_with_team: shared,
      });

    if (error) {
      console.error(error);
      alert("Could not save this board.");
      return;
    }

    alert(
      shared
        ? "Board shared with your team coaches."
        : "Board saved to My Boards."
    );
  }

  async function openNamedBoard() {
    const user = await currentUser();

    if (!user) {
      alert("You need to be signed in.");
      return;
    }

    let query = supabase
      .from("tactics_boards")
      .select(
        "id,name,board_data,shared_with_team,created_by,updated_at"
      )
      .order("updated_at", { ascending: false });

    if (selectedTeam?.id) {
      query = query.eq(
        "age_group_id",
        selectedTeam.id
      );
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error(error);
      alert("Could not load your boards.");
      return;
    }

    if (!rows?.length) {
      alert("There are no saved or shared boards yet.");
      return;
    }

    const menu = rows
      .map((row, index) => {
        const source =
          row.created_by === user.id
            ? "My board"
            : "Shared";

        return `${index + 1}. ${row.name} - ${source}`;
      })
      .join("\n");

    const answer = window.prompt(
      "Enter the board number to open:\n\n" + menu
    );

    if (!answer) return;

    const chosen = rows[Number(answer) - 1];

    if (!chosen?.board_data) return;

    localStorage.setItem(
      draftKey,
      JSON.stringify(chosen.board_data)
    );

    window.location.reload();
  }

  async function deleteMyBoard() {
    const user = await currentUser();

    if (!user) return;

    const { data: rows, error } = await supabase
      .from("tactics_boards")
      .select("id,name")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });

    if (error || !rows?.length) {
      alert("You don't have any saved boards to delete.");
      return;
    }

    const menu = rows
      .map(
        (row, index) =>
          `${index + 1}. ${row.name}`
      )
      .join("\n");

    const answer = window.prompt(
      "Enter the board number to delete:\n\n" +
        menu
    );

    if (!answer) return;

    const chosen = rows[Number(answer) - 1];

    if (!chosen) return;

    if (
      !window.confirm(
        `Delete "${chosen.name}"?`
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("tactics_boards")
      .delete()
      .eq("id", chosen.id)
      .eq("created_by", user.id);

    if (deleteError) {
      console.error(deleteError);
      alert("Could not delete this board.");
      return;
    }

    alert("Board deleted.");
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
              {teamName} ? Your current board is
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
              onClick={() =>
                saveBoard({ shared: false })
              }
              style={buttonStyle}
            >
              Save Copy
            </button>

            <button
              onClick={() =>
                saveBoard({ shared: true })
              }
              style={{
                ...buttonStyle,
                background: "#0F766E",
                borderColor: "#0F766E",
                color: "#fff",
              }}
            >
              Share with Team
            </button>

            <button
              onClick={deleteMyBoard}
              style={buttonStyle}
            >
              Delete Board
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
