const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-calendar-dirty-state-fix.bak"
);

/* ============================================================
   1. Remove eager dirty-state wrappers
   ============================================================ */

text = text.replace(
`  function setSections(updater) {
    setHasUnsavedChanges(true);
    setSectionsState(updater);
  }`,
`  function setSections(updater) {
    setSectionsState(updater);
  }`
);

text = text.replace(
`  function setNotes(value) {
    setHasUnsavedChanges(true);
    setNotesState(value);
  }`,
`  function setNotes(value) {
    setNotesState(value);
  }`
);

text = text.replace(
`  function setPlannedStartTime(value) {
    setHasUnsavedChanges(true);
    setPlannedStartTimeState(value);
  }`,
`  function setPlannedStartTime(value) {
    setPlannedStartTimeState(value);
  }`
);

text = text.replace(
`  function setPlannedLocation(value) {
    setHasUnsavedChanges(true);
    setPlannedLocationState(value);
  }`,
`  function setPlannedLocation(value) {
    setPlannedLocationState(value);
  }`
);

console.log("OK: eager dirty tracking removed");


/* ============================================================
   2. Add a baseline snapshot
   ============================================================ */

const refMarker = `  const previewRef = useRef(null);`;

if (
  text.includes(refMarker) &&
  !text.includes("const savedSessionSnapshotRef")
) {
  text = text.replace(
    refMarker,
`${refMarker}
  const savedSessionSnapshotRef = useRef(null);

  function currentSessionSnapshot() {
    return JSON.stringify({
      sections: (sections || []).map((section) => ({
        type: section.type || "",
        label: section.label || "",
        duration: String(section.duration || ""),
        coachId: String(section.coachId || ""),
        coachName: String(section.coachName || ""),
        notes: String(section.notes || ""),
        drills: (section.drills || []).map((drill) => ({
          id: String(drill.id || ""),
          duration_mins: Number(drill.duration_mins || 0),
          coachId: String(drill.coachId || "")
        }))
      })),
      notes: String(notes || ""),
      plannedStartTime: String(plannedStartTime || ""),
      plannedLocation: String(plannedLocation || "")
    });
  }

  function captureSessionBaseline() {
    savedSessionSnapshotRef.current =
      currentSessionSnapshot();

    setHasUnsavedChanges(false);
  }
`
  );

  console.log("OK: session baseline snapshot added");
}


/* ============================================================
   3. Recalculate dirty state only after actual state differs
   ============================================================ */

const allocationComment =
`  // Club facilities and published weekly allocations are the source of truth for confirmed venue/time.`;

if (
  text.includes(allocationComment) &&
  !text.includes("savedSessionSnapshotRef.current === null")
) {
  text = text.replace(
    allocationComment,
`  useEffect(() => {
    if (savedSessionSnapshotRef.current === null) {
      const timer = setTimeout(() => {
        captureSessionBaseline();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (savedSessionSnapshotRef.current === null) {
      return;
    }

    const changed =
      currentSessionSnapshot() !==
      savedSessionSnapshotRef.current;

    setHasUnsavedChanges(changed);
  }, [
    sections,
    notes,
    plannedStartTime,
    plannedLocation
  ]);

${allocationComment}`
  );

  console.log("OK: precise dirty-state comparison added");
}


/* ============================================================
   4. Capture a fresh baseline whenever a different saved
      session is loaded
   ============================================================ */

const editEffectStart = text.indexOf(
  `  useEffect(() => {
    if (!editingSession) return;`
);

if (editEffectStart !== -1) {
  const editEffectEnd =
    text.indexOf(
      `  }, [editingSession`,
      editEffectStart
    );

  if (editEffectEnd !== -1) {
    const insertionPoint =
      text.lastIndexOf(
        "\n",
        editEffectEnd
      );

    if (
      !text.slice(
        editEffectStart,
        editEffectEnd
      ).includes("savedSessionSnapshotRef.current = null")
    ) {
      text =
        text.slice(0, insertionPoint) +
`
    savedSessionSnapshotRef.current = null;

    setTimeout(() => {
      captureSessionBaseline();
    }, 0);
` +
        text.slice(insertionPoint);

      console.log("OK: baseline resets on session load");
    }
  }
}


/* ============================================================
   5. Saving resets baseline
   ============================================================ */

text = text.replace(
`      setHasUnsavedChanges(false);

      if (selectedTeam?.id) {`,
`      captureSessionBaseline();

      if (selectedTeam?.id) {`
);

console.log("OK: successful save resets dirty baseline");


/* ============================================================
   6. Calendar navigation:
      do not remount/glitch unnecessarily
   ============================================================ */

text = text.replace(
`      setHasUnsavedChanges(false);

      if (existingSession) {
        if (onEditSession) {
          await onEditSession(existingSession);
        }

        return;
      }`,
`      if (existingSession) {
        if (
          String(existingSession.id) ===
          String(editingSession?.id || "")
        ) {
          setDay(dayName);
          return;
        }

        savedSessionSnapshotRef.current = null;

        if (onEditSession) {
          await onEditSession(existingSession);
        }

        return;
      }`
);


/*
 * For an empty date, move the calendar cleanly and clear edit
 * without forcing multiple competing date changes.
 */

text = text.replace(
`      sessionStorage.setItem(
        "spraoi_builder_target_date",
        targetDate
      );

      if (onClearEdit) {
        onClearEdit();
      }`,
`      sessionStorage.setItem(
        "spraoi_builder_target_date",
        targetDate
      );

      savedSessionSnapshotRef.current = null;

      setDay(dayName);

      if (onClearEdit) {
        onClearEdit();
      }`
);

console.log("OK: calendar switching stabilised");


/* ============================================================
   7. Remove key-based forced remount if present
   This was contributing to the visible calendar glitch.
   ============================================================ */

text = text.replace(
  /key=\{editingSession\?\.id\s*\|\|\s*"new-session"\}\s*/g,
  ""
);

console.log("OK: forced Builder remount removed");


fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("======================================");
console.log("CALENDAR + DIRTY STATE FIX COMPLETE");
console.log("======================================");
