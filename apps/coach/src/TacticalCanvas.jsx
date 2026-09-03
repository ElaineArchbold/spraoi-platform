import { useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 900;
const HEIGHT = 560;

const makeId = () =>
  "tc_" + Date.now() + "_" + Math.random().toString(36).slice(2);

const clone = (value) => JSON.parse(JSON.stringify(value));

function emptyBoard() {
  return {
    sport: "gaa",
    halfPitch: false,
    objects: [],
    strokes: [],
  };
}

export default function TacticalCanvas({
  storageKey = "spraoi_tactics_draft",
  selectedTeam = null,
  initialBoard = null,
  readOnly = false,
  onChange = null,
}) {
  const svgRef = useRef(null);
  const loadedKeyRef = useRef(null);

  const [board, setBoard] = useState(() => initialBoard || emptyBoard());
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(null);

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const [drag, setDrag] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [arrowDraft, setArrowDraft] = useState(null);

  const [presentation, setPresentation] = useState(false);

  const teamName = useMemo(() => {
    if (!selectedTeam) return "Coach";

    const gender =
      String(selectedTeam.gender || "").toLowerCase() === "girls"
        ? "Girls"
        : String(selectedTeam.gender || "").toLowerCase() === "boys"
        ? "Boys"
        : "";

    return [selectedTeam.label, gender].filter(Boolean).join(" ");
  }, [selectedTeam]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);

      if (raw) {
        const restored = JSON.parse(raw);

        setBoard({
          sport: restored.sport || "gaa",
          halfPitch: Boolean(restored.halfPitch),
          objects: Array.isArray(restored.objects) ? restored.objects : [],
          strokes: Array.isArray(restored.strokes) ? restored.strokes : [],
        });
      } else if (initialBoard) {
        setBoard(initialBoard);
      } else {
        setBoard(emptyBoard());
      }

      setHistory([]);
      setFuture([]);
      setSelectedId(null);
      loadedKeyRef.current = storageKey;
    } catch (error) {
      console.error("Could not restore tactics draft", error);
      loadedKeyRef.current = storageKey;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    if (loadedKeyRef.current !== storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(board));
    } catch (error) {
      console.error("Could not autosave tactics draft", error);
    }

    onChange?.(board);
  }, [board, storageKey, onChange]);

  function point(event) {
    const rect = svgRef.current.getBoundingClientRect();

    return {
      x: Math.max(
        18,
        Math.min(
          WIDTH - 18,
          (event.clientX - rect.left) * (WIDTH / rect.width)
        )
      ),
      y: Math.max(
        18,
        Math.min(
          HEIGHT - 18,
          (event.clientY - rect.top) * (HEIGHT / rect.height)
        )
      ),
    };
  }

  function snapshot() {
    return clone(board);
  }

  function commit(nextBoard, before = snapshot()) {
    setHistory((rows) => [...rows, before]);
    setFuture([]);
    setBoard(nextBoard);
  }

  function updateBoard(updater) {
    const before = snapshot();

    const next =
      typeof updater === "function"
        ? updater(before)
        : updater;

    commit(next, before);
  }

  function undo() {
    if (!history.length) return;

    const previous = history[history.length - 1];

    setFuture((rows) => [snapshot(), ...rows]);
    setBoard(previous);
    setHistory((rows) => rows.slice(0, -1));
    setSelectedId(null);
  }

  function redo() {
    if (!future.length) return;

    const next = future[0];

    setHistory((rows) => [...rows, snapshot()]);
    setBoard(next);
    setFuture((rows) => rows.slice(1));
    setSelectedId(null);
  }

  function nextPlayerNumber() {
    return (
      board.objects.filter((obj) =>
        ["playerA", "playerB", "keeper"].includes(obj.type)
      ).length + 1
    );
  }

  function addObject(type, p) {
    if (readOnly) return;

    if (type === "text") {
      const text = window.prompt("Add label");

      if (!text) return;

      updateBoard((current) => ({
        ...current,
        objects: [
          ...current.objects,
          {
            id: makeId(),
            type: "text",
            x: p.x,
            y: p.y,
            text,
          },
        ],
      }));

      return;
    }

    updateBoard((current) => ({
      ...current,
      objects: [
        ...current.objects,
        {
          id: makeId(),
          type,
          x: p.x,
          y: p.y,
          number: ["playerA", "playerB", "keeper"].includes(type)
            ? nextPlayerNumber()
            : null,
        },
      ],
    }));
  }

  function startObjectDrag(event, obj) {
    event.stopPropagation();

    setSelectedId(obj.id);

    if (readOnly || tool !== "select") return;
    if (obj.type === "arrow") return;

    const p = point(event);

    setDrag({
      id: obj.id,
      dx: p.x - obj.x,
      dy: p.y - obj.y,
      before: snapshot(),
    });
  }

  function beginPointer(event) {
    if (readOnly) return;

    const targetObject =
      event.target.closest?.("[data-tactical-object='true']");

    if (targetObject) return;

    const p = point(event);

    if (tool === "select") {
      setSelectedId(null);
      return;
    }

    if (tool === "pen") {
      setDrawing({
        id: makeId(),
        type: "freehand",
        points: [p],
        pointerType: event.pointerType || "mouse",
        before: snapshot(),
      });

      return;
    }

    if (tool === "arrow") {
      setArrowDraft({
        id: makeId(),
        type: "arrow",
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
        before: snapshot(),
      });

      return;
    }

    addObject(tool, p);
  }

  function movePointer(event) {
    const p = point(event);

    if (drag) {
      setBoard((current) => ({
        ...current,
        objects: current.objects.map((obj) =>
          obj.id === drag.id
            ? {
                ...obj,
                x: p.x - drag.dx,
                y: p.y - drag.dy,
              }
            : obj
        ),
      }));

      return;
    }

    if (drawing) {
      setDrawing((current) => ({
        ...current,
        points: [...current.points, p],
      }));

      return;
    }

    if (arrowDraft) {
      setArrowDraft((current) => ({
        ...current,
        x2: p.x,
        y2: p.y,
      }));
    }
  }

  function endPointer() {
    if (drag) {
      setHistory((rows) => [...rows, drag.before]);
      setFuture([]);
      setDrag(null);
      return;
    }

    if (drawing) {
      if (drawing.points.length > 1) {
        setBoard((current) => ({
          ...current,
          strokes: [
            ...current.strokes,
            {
              id: drawing.id,
              type: "freehand",
              points: drawing.points,
            },
          ],
        }));

        setHistory((rows) => [...rows, drawing.before]);
        setFuture([]);
      }

      setDrawing(null);
      return;
    }

    if (arrowDraft) {
      const dx = arrowDraft.x2 - arrowDraft.x1;
      const dy = arrowDraft.y2 - arrowDraft.y1;

      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        setBoard((current) => ({
          ...current,
          objects: [
            ...current.objects,
            {
              id: arrowDraft.id,
              type: "arrow",
              x1: arrowDraft.x1,
              y1: arrowDraft.y1,
              x2: arrowDraft.x2,
              y2: arrowDraft.y2,
            },
          ],
        }));

        setHistory((rows) => [...rows, arrowDraft.before]);
        setFuture([]);
      }

      setArrowDraft(null);
    }
  }

  function deleteSelected() {
    if (!selectedId || readOnly) return;

    updateBoard((current) => ({
      ...current,
      objects: current.objects.filter(
        (obj) => obj.id !== selectedId
      ),
      strokes: current.strokes.filter(
        (stroke) => stroke.id !== selectedId
      ),
    }));

    setSelectedId(null);
  }

  function clearBoard() {
    if (readOnly) return;

    if (
      !board.objects.length &&
      !board.strokes.length
    ) {
      return;
    }

    if (!window.confirm("Clear the tactics board?")) {
      return;
    }

    updateBoard((current) => ({
      ...current,
      objects: [],
      strokes: [],
    }));

    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId || readOnly) return;

    const source =
      board.objects.find((obj) => obj.id === selectedId);

    if (!source) return;

    const copy = {
      ...source,
      id: makeId(),
    };

    if ("x" in copy) copy.x += 28;
    if ("y" in copy) copy.y += 28;

    if (copy.type === "arrow") {
      copy.x1 += 25;
      copy.x2 += 25;
      copy.y1 += 25;
      copy.y2 += 25;
    }

    updateBoard((current) => ({
      ...current,
      objects: [...current.objects, copy],
    }));

    setSelectedId(copy.id);
  }

  function editSelected() {
    if (!selectedId || readOnly) return;

    const obj =
      board.objects.find((item) => item.id === selectedId);

    if (!obj) return;

    if (
      ["playerA", "playerB", "keeper"].includes(obj.type)
    ) {
      const next = window.prompt(
        "Player number / label",
        String(obj.number || "")
      );

      if (next === null) return;

      updateBoard((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === selectedId
            ? { ...item, number: next }
            : item
        ),
      }));

      return;
    }

    if (obj.type === "text") {
      const next = window.prompt(
        "Edit label",
        obj.text || ""
      );

      if (next === null) return;

      updateBoard((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === selectedId
            ? { ...item, text: next }
            : item
        ),
      }));
    }
  }

  function setSport(value) {
    updateBoard((current) => ({
      ...current,
      sport: value,
    }));
  }

  function setHalfPitch(value) {
    updateBoard((current) => ({
      ...current,
      halfPitch: value,
    }));
  }

  function renderPitch() {
    return (
      <>
        <rect
          x="18"
          y="18"
          width={WIDTH - 36}
          height={HEIGHT - 36}
          fill="none"
          stroke="#fff"
          strokeWidth="3"
        />

        {!board.halfPitch && (
          <>
            <line
              x1={WIDTH / 2}
              x2={WIDTH / 2}
              y1="18"
              y2={HEIGHT - 18}
              stroke="rgba(255,255,255,.88)"
              strokeWidth="2"
            />

            <circle
              cx={WIDTH / 2}
              cy={HEIGHT / 2}
              r="55"
              fill="none"
              stroke="rgba(255,255,255,.88)"
              strokeWidth="2"
            />
          </>
        )}

        <line
          x1="145"
          x2="145"
          y1="18"
          y2={HEIGHT - 18}
          stroke="rgba(255,255,255,.72)"
          strokeWidth="2"
        />

        <line
          x1="265"
          x2="265"
          y1="18"
          y2={HEIGHT - 18}
          stroke="rgba(255,255,255,.72)"
          strokeWidth="2"
        />

        {!board.halfPitch && (
          <>
            <line
              x1={WIDTH - 145}
              x2={WIDTH - 145}
              y1="18"
              y2={HEIGHT - 18}
              stroke="rgba(255,255,255,.72)"
              strokeWidth="2"
            />

            <line
              x1={WIDTH - 265}
              x2={WIDTH - 265}
              y1="18"
              y2={HEIGHT - 18}
              stroke="rgba(255,255,255,.72)"
              strokeWidth="2"
            />
          </>
        )}

        <rect
          x="18"
          y={HEIGHT / 2 - 72}
          width="70"
          height="144"
          fill="none"
          stroke="rgba(255,255,255,.82)"
          strokeWidth="2"
        />

        {!board.halfPitch && (
          <rect
            x={WIDTH - 88}
            y={HEIGHT / 2 - 72}
            width="70"
            height="144"
            fill="none"
            stroke="rgba(255,255,255,.82)"
            strokeWidth="2"
          />
        )}
      </>
    );
  }

  function renderObject(obj) {
    const selected = obj.id === selectedId;

    if (obj.type === "arrow") {
      return (
        <line
          key={obj.id}
          x1={obj.x1}
          y1={obj.y1}
          x2={obj.x2}
          y2={obj.y2}
          stroke={selected ? "#7C3AED" : "#fff"}
          strokeWidth={selected ? 10 : 7}
          strokeLinecap="round"
          markerEnd="url(#tc-arrow)"
          data-tactical-object="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            setSelectedId(obj.id);
          }}
        />
      );
    }

    if (obj.type === "text") {
      return (
        <text
          key={obj.id}
          x={obj.x}
          y={obj.y}
          textAnchor="middle"
          fill="#fff"
          fontSize="24"
          fontWeight="900"
          paintOrder="stroke"
          stroke={selected ? "#7C3AED" : "#10243e"}
          strokeWidth={selected ? 7 : 4}
          data-tactical-object="true"
          onPointerDown={(event) =>
            startObjectDrag(event, obj)
          }
        >
          {obj.text}
        </text>
      );
    }

    if (obj.type === "cone") {
      return (
        <g
          key={obj.id}
          transform={`translate(${obj.x} ${obj.y})`}
          data-tactical-object="true"
          onPointerDown={(event) =>
            startObjectDrag(event, obj)
          }
        >
          <path
            d="M0 -17 L15 15 L-15 15 Z"
            fill="#F59E0B"
            stroke={selected ? "#7C3AED" : "#fff"}
            strokeWidth={selected ? 6 : 3}
          />
        </g>
      );
    }

    if (obj.type === "ball") {
      return (
        <circle
          key={obj.id}
          cx={obj.x}
          cy={obj.y}
          r="13"
          fill="#fff"
          stroke={selected ? "#7C3AED" : "#10243e"}
          strokeWidth={selected ? 6 : 3}
          data-tactical-object="true"
          onPointerDown={(event) =>
            startObjectDrag(event, obj)
          }
        />
      );
    }

    const colour =
      obj.type === "playerA"
        ? "#2563EB"
        : obj.type === "playerB"
        ? "#DC2626"
        : "#FACC15";

    return (
      <g
        key={obj.id}
        transform={`translate(${obj.x} ${obj.y})`}
        data-tactical-object="true"
        onPointerDown={(event) =>
          startObjectDrag(event, obj)
        }
        style={{ cursor: "grab" }}
      >
        <circle
          r="24"
          fill={colour}
          stroke={selected ? "#7C3AED" : "#fff"}
          strokeWidth={selected ? 7 : 3}
        />

        <text
          y="6"
          textAnchor="middle"
          fill={obj.type === "keeper" ? "#10243e" : "#fff"}
          fontSize="16"
          fontWeight="900"
          pointerEvents="none"
        >
          {obj.number}
        </text>
      </g>
    );
  }

  function renderStroke(stroke) {
    const selected = stroke.id === selectedId;

    const points = stroke.points
      .map((p) => `${p.x},${p.y}`)
      .join(" ");

    return (
      <polyline
        key={stroke.id}
        points={points}
        fill="none"
        stroke={selected ? "#7C3AED" : "#fff"}
        strokeWidth={selected ? 9 : 6}
        strokeLinecap="round"
        strokeLinejoin="round"
        data-tactical-object="true"
        onPointerDown={(event) => {
          event.stopPropagation();
          setSelectedId(stroke.id);
        }}
      />
    );
  }

  const tools = [
    ["select", "Select"],
    ["playerA", "Team A"],
    ["playerB", "Team B"],
    ["keeper", "Keeper"],
    ["ball", "Ball / Sliotar"],
    ["cone", "Cone"],
    ["arrow", "Arrow"],
    ["pen", "Pen"],
    ["text", "Text"],
  ];

  return (
    <div
      className={
        presentation
          ? "tc-root tc-presentation"
          : "tc-root"
      }
    >
      {!presentation && !readOnly && (
        <div className="tc-toolbar">
          <div className="tc-tools">
            {tools.map(([id, label]) => (
              <button
                key={id}
                className={tool === id ? "active" : ""}
                onClick={() => {
                  setTool(id);
                  setArrowDraft(null);
                  setDrawing(null);
                }}
              >
                {label}
              </button>
            ))}

            <span className="tc-divider" />

            <button
              onClick={undo}
              disabled={!history.length}
            >
              Undo
            </button>

            <button
              onClick={redo}
              disabled={!future.length}
            >
              Redo
            </button>

            <button
              onClick={editSelected}
              disabled={!selectedId}
            >
              Edit
            </button>

            <button
              onClick={duplicateSelected}
              disabled={!selectedId}
            >
              Duplicate
            </button>

            <button
              onClick={deleteSelected}
              disabled={!selectedId}
            >
              Delete
            </button>

            <button onClick={clearBoard}>
              Clear
            </button>
          </div>

          <div className="tc-options">
            <label>
              Sport
              <select
                value={board.sport}
                onChange={(event) =>
                  setSport(event.target.value)
                }
              >
                <option value="gaa">GAA</option>
                <option value="soccer">
                  Soccer — coming soon
                </option>
                <option value="rugby">
                  Rugby — coming soon
                </option>
                <option value="basketball">
                  Basketball — coming soon
                </option>
                <option value="hockey">
                  Hockey — coming soon
                </option>
              </select>
            </label>

            <label className="tc-checkbox">
              <input
                type="checkbox"
                checked={board.halfPitch}
                onChange={(event) =>
                  setHalfPitch(event.target.checked)
                }
              />
              Half pitch
            </label>

            <span className="tc-autosave">
              ✓ Draft auto-saved
            </span>
          </div>
        </div>
      )}

      <div className="tc-board-shell">
        {presentation && (
          <button
            className="tc-exit-presentation"
            onClick={() => setPresentation(false)}
          >
            Exit presentation
          </button>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          onPointerDown={beginPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={
            drag ? undefined : endPointer
          }
          style={{
            width: "100%",
            display: "block",
            borderRadius: presentation ? 0 : 16,
            touchAction: "none",
            background:
              "linear-gradient(90deg,#16793d,#199447 50%,#16793d)",
          }}
        >
          <defs>
            <marker
              id="tc-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L0,6 L9,3 z"
                fill="#fff"
              />
            </marker>
          </defs>

          {renderPitch()}

          {board.strokes.map(renderStroke)}
          {board.objects.map(renderObject)}

          {drawing && (
            <polyline
              points={drawing.points
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {arrowDraft && (
            <line
              x1={arrowDraft.x1}
              y1={arrowDraft.y1}
              x2={arrowDraft.x2}
              y2={arrowDraft.y2}
              stroke="#fff"
              strokeWidth="7"
              strokeLinecap="round"
              markerEnd="url(#tc-arrow)"
            />
          )}
        </svg>
      </div>

      {!readOnly && (
        <div className="tc-footer">
          <span>
            {tool === "pen"
              ? "Draw directly with your stylus or finger."
              : tool === "arrow"
              ? "Press, drag and release to draw an arrow."
              : tool === "select"
              ? "Tap an item to select it, then drag to move it."
              : "Tap the pitch to place the selected item."}
          </span>

          {!presentation && (
            <button
              className="tc-present-button"
              onClick={() => setPresentation(true)}
            >
              Presentation mode
            </button>
          )}
        </div>
      )}

      <style>{`
        .tc-root {
          width: 100%;
          box-sizing: border-box;
        }

        .tc-toolbar,
        .tc-board-shell {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
        }

        .tc-toolbar {
          padding: 12px;
          margin-bottom: 12px;
        }

        .tc-board-shell {
          padding: 12px;
          overflow: auto;
          position: relative;
        }

        .tc-tools,
        .tc-options,
        .tc-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tc-options {
          margin-top: 10px;
        }

        .tc-tools button,
        .tc-footer button,
        .tc-exit-presentation {
          min-height: 42px;
          border: 1px solid #d7dee8;
          background: #fff;
          color: #10243e;
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .tc-tools button.active,
        .tc-present-button {
          background: #7C3AED !important;
          border-color: #7C3AED !important;
          color: #fff !important;
        }

        .tc-tools button:disabled {
          opacity: .4;
          cursor: default;
        }

        .tc-divider {
          width: 1px;
          height: 32px;
          background: #e2e8f0;
        }

        .tc-options label {
          font-size: 12px;
          font-weight: 800;
          color: #10243e;
        }

        .tc-options select {
          margin-left: 7px;
          min-height: 38px;
          padding: 6px 9px;
          border: 1px solid #d7dee8;
          border-radius: 9px;
          background: #fff;
        }

        .tc-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tc-autosave {
          margin-left: auto;
          color: #15803d;
          font-size: 11px;
          font-weight: 800;
        }

        .tc-footer {
          justify-content: space-between;
          margin-top: 10px;
          color: #64748b;
          font-size: 11px;
        }

        .tc-presentation {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #10243e;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tc-presentation .tc-board-shell {
          width: 100vw;
          height: 100vh;
          padding: 0;
          border: 0;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #10243e;
        }

        .tc-presentation svg {
          width: 100vw !important;
          height: 100vh;
          max-height: 100vh;
        }

        .tc-exit-presentation {
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 10002;
          background: rgba(255,255,255,.94);
        }

        @media (max-width: 760px) {
          .tc-board-shell {
            padding: 6px;
          }

          .tc-tools button {
            min-height: 46px;
            padding: 10px 14px;
          }

          .tc-autosave {
            width: 100%;
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
