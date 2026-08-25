const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-builder-calendar-session-nav.bak"
);

/* ============================================================
   1. SessionBuilder receives the existing editSession callback
   ============================================================ */

text = text.replace(
`function SessionBuilderScreen({ club, ageGroups, skills, allActivities, coaches, diagramMap, selectedTeam, onNav, editingSession, onClearEdit }) {`,
`function SessionBuilderScreen({ club, ageGroups, skills, allActivities, coaches, diagramMap, selectedTeam, onNav, editingSession, onClearEdit, onEditSession }) {`
);

console.log("OK: Builder edit callback added");


/* ============================================================
   2. Add dirty state BEFORE sections state
   ============================================================ */

const sectionsMarker =
  `  const [sections, setSections] = useState(() => {`;

if (text.includes(sectionsMarker)) {
  text = text.replace(
    sectionsMarker,
`  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [sections, setSectionsState] = useState(() => {`
  );

  console.log("OK: dirty tracking state added");
} else {
  console.log("WARNING: sections state marker not found");
}


/* ============================================================
   3. Wrap setSections so drill/coach/time edits mark dirty
   ============================================================ */

const searchMarker =
  `  const [filterCat, setFilterCat] = useState("");`;

if (
  text.includes(searchMarker) &&
  !text.includes("function setSections(updater)")
) {
  text = text.replace(
    searchMarker,
`  function setSections(updater) {
    setHasUnsavedChanges(true);
    setSectionsState(updater);
  }

${searchMarker}`
  );

  console.log("OK: section edits now mark session dirty");
}


/* ============================================================
   4. Notes changes also mark dirty
   ============================================================ */

text = text.replace(
  `const [notes, setNotes] = useState(editingSession?.plan?.coach_notes || "");`,
  `const [notes, setNotesState] = useState(editingSession?.plan?.coach_notes || "");

  function setNotes(value) {
    setHasUnsavedChanges(true);
    setNotesState(value);
  }`
);


/* ============================================================
   5. Planned time/location changes mark dirty
   ============================================================ */

text = text.replace(
  `const [plannedStartTime, setPlannedStartTime] = useState`,
  `const [plannedStartTime, setPlannedStartTimeState] = useState`
);

const plannedTimeEnd =
  text.indexOf("  const [allocationConflict", text.indexOf("setPlannedStartTimeState"));

if (
  plannedTimeEnd !== -1 &&
  !text.includes("function setPlannedStartTime(value)")
) {
  text =
    text.slice(0, plannedTimeEnd) +
`  function setPlannedStartTime(value) {
    setHasUnsavedChanges(true);
    setPlannedStartTimeState(value);
  }

` +
    text.slice(plannedTimeEnd);
}


/*
  plannedLocation may already exist as a simple state declaration.
*/

text = text.replace(
  `const [plannedLocation, setPlannedLocation] = useState`,
  `const [plannedLocation, setPlannedLocationState] = useState`
);

const locationStatePos =
  text.indexOf("setPlannedLocationState");

if (
  locationStatePos !== -1 &&
  !text.includes("function setPlannedLocation(value)")
) {
  const nextStateLine =
    text.indexOf("\n", text.indexOf(";", locationStatePos)) + 1;

  text =
    text.slice(0, nextStateLine) +
`  function setPlannedLocation(value) {
    setHasUnsavedChanges(true);
    setPlannedLocationState(value);
  }

` +
    text.slice(nextStateLine);
}


/* ============================================================
   6. Correct weekOffset when opening an existing session
   OR when calendar navigation opens an empty future date.
   ============================================================ */

const oldWeekOffset =
  `  const [weekOffset, setWeekOffset] = useState(0);`;

const newWeekOffset =
`  const [weekOffset, setWeekOffset] = useState(() => {
    const targetDate =
      editingSession?.session_date ||
      sessionStorage.getItem("spraoi_builder_target_date");

    if (!targetDate) return 0;

    const target = new Date(targetDate + "T12:00:00");
    const today = new Date();

    const mondayFor = (date) => {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      d.setDate(
        d.getDate() -
        ((d.getDay() + 6) % 7)
      );
      return d;
    };

    const currentMonday = mondayFor(today);
    const targetMonday = mondayFor(target);

    return Math.round(
      (targetMonday.getTime() - currentMonday.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    );
  });`;

if (text.includes(oldWeekOffset)) {
  text = text.replace(
    oldWeekOffset,
    newWeekOffset
  );
  console.log("OK: Builder week locks to session date");
}


/* ============================================================
   7. New empty date can also initialise the selected weekday
   ============================================================ */

const dayStateStart =
  text.indexOf(`  const [day, setDay] = useState(() => {`);

if (dayStateStart !== -1) {

  const existingLine =
`    if (editingSession?.session_date) {`;

  const replacement =
`    const targetDate =
      editingSession?.session_date ||
      sessionStorage.getItem("spraoi_builder_target_date");

    if (targetDate) {
      const parts = targetDate.split("-");
      const d = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );

      return [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
      ][d.getDay()];
    }

    if (false) {`;

  text = text.replace(
    existingLine,
    replacement
  );

  console.log("OK: selected weekday initialises from target date");
}


/* ============================================================
   8. Clear temporary calendar target after Builder mounts
   ============================================================ */

const facilityComment =
`  // Club facilities and published weekly allocations are the source of truth for confirmed venue/time.`;

if (
  text.includes(facilityComment) &&
  !text.includes("sessionStorage.removeItem(\"spraoi_builder_target_date\")")
) {
  text = text.replace(
    facilityComment,
`  useEffect(() => {
    sessionStorage.removeItem("spraoi_builder_target_date");
  }, []);

${facilityComment}`
  );
}


/* ============================================================
   9. Clicking a calendar date loads THAT session
   ============================================================ */

const selectedDateFunction =
`  function selectedSessionDate() {`;

const selectedDatePos =
  text.indexOf(selectedDateFunction);

if (
  selectedDatePos !== -1 &&
  !text.includes("async function openBuilderCalendarDate")
) {
  const functionEnd =
    text.indexOf("\n  }\n", selectedDatePos) + 5;

  const navigationFunction =
`

  async function openBuilderCalendarDate(dayName, dateObject) {
    const targetDate =
      \`\${dateObject.getFullYear()}-\${String(
        dateObject.getMonth() + 1
      ).padStart(2, "0")}-\${String(
        dateObject.getDate()
      ).padStart(2, "0")}\`;

    if (
      editingSession?.session_date === targetDate
    ) {
      setDay(dayName);
      return;
    }

    if (hasUnsavedChanges) {
      const discard = window.confirm(
        "You have unsaved changes. Discard them and open the selected date?"
      );

      if (!discard) return;
    }

    if (!selectedTeam?.id) return;

    try {
      const { data: plans, error: planError } =
        await supabase
          .from("weekly_plans")
          .select("id")
          .eq("age_group_id", selectedTeam.id);

      if (planError) throw planError;

      const planIds = (plans || [])
        .map(plan => plan.id)
        .filter(Boolean);

      let existingSession = null;

      if (planIds.length) {
        const { data: sessions, error: sessionError } =
          await supabase
            .from("sessions")
            .select(
              "id,plan_id,session_date,planned_starts_at,confirmed_starts_at,station_count,created_at"
            )
            .in("plan_id", planIds)
            .eq("session_date", targetDate)
            .order("station_count", {
              ascending: false
            })
            .order("created_at", {
              ascending: false
            })
            .limit(1);

        if (sessionError) throw sessionError;

        existingSession = sessions?.[0] || null;
      }

      setHasUnsavedChanges(false);

      if (existingSession) {
        if (onEditSession) {
          await onEditSession(existingSession);
        }

        return;
      }

      /*
       * No saved session exists on that date.
       * Switch Builder into a clean NEW session,
       * anchored to the clicked date.
       */
      sessionStorage.setItem(
        "spraoi_builder_target_date",
        targetDate
      );

      if (onClearEdit) {
        onClearEdit();
      }

    } catch (error) {
      console.error(
        "Could not open session for calendar date:",
        error
      );

      alert(
        "Could not open that session: " +
        error.message
      );
    }
  }
`;

  text =
    text.slice(0, functionEnd) +
    navigationFunction +
    text.slice(functionEnd);

  console.log("OK: calendar session navigation added");
}


/* ============================================================
   10. Replace calendar day click
   ============================================================ */

const oldDayButton =
`<button key={d} onClick={() => setDay(d)}`;

if (text.includes(oldDayButton)) {
  text = text.replace(
    oldDayButton,
`<button key={d} onClick={() => openBuilderCalendarDate(d, mon)}`
  );

  console.log("OK: calendar dates now open their session");
} else {
  console.log("WARNING: calendar day button not matched");
}


/* ============================================================
   11. Pass editSession callback + force clean remount whenever
       the loaded session changes
   ============================================================ */

text = text.replace(
`editingSession={editingSession} onClearEdit={() => setEditingSession?.(null)} />`,
`key={editingSession?.id || "new-session"} editingSession={editingSession} onClearEdit={() => setEditingSession?.(null)} onEditSession={editSession} />`
);

text = text.replace(
`editingSession={editingSession}
                onClearEdit={() => setEditingSession(null)}
              />`,
`key={editingSession?.id || "new-session"}
                editingSession={editingSession}
                onClearEdit={() => setEditingSession(null)}
                onEditSession={editSession}
              />`
);


/* ============================================================
   12. Successful save is no longer dirty
   ============================================================ */

text = text.replace(
`      if (selectedTeam?.id) {
        localStorage.setItem`,
`      setHasUnsavedChanges(false);

      if (selectedTeam?.id) {
        localStorage.setItem`
);


fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("======================================");
console.log("BUILDER CALENDAR NAVIGATION INSTALLED");
console.log("======================================");
