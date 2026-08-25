const fs = require("fs");

const coachPath = "./apps/coach/src/App.jsx";
const clubPath = "./apps/club/src/App.jsx";
const schedulingPath = "./apps/club/src/ClubScheduling.jsx";

let coach = fs.readFileSync(coachPath, "utf8");
let club = fs.readFileSync(clubPath, "utf8");
let scheduling = fs.existsSync(schedulingPath)
  ? fs.readFileSync(schedulingPath, "utf8")
  : null;

fs.copyFileSync(
  coachPath,
  coachPath + ".before-final-builder-sync-fix.bak"
);

fs.copyFileSync(
  clubPath,
  clubPath + ".before-final-club-selector-fix.bak"
);

if (scheduling) {
  fs.copyFileSync(
    schedulingPath,
    schedulingPath + ".before-final-publish-link-fix.bak"
  );
}

/* ============================================================
   COACH 1 — REAL USER EDIT TRACKING
   ============================================================ */

/*
Remove the snapshot dirty-state system.
It was causing false "unsaved changes" warnings.
*/

const snapshotStart = coach.indexOf(
  `  const savedSessionSnapshotRef = useRef(null);`
);

const allocationComment = coach.indexOf(
  `  // Club facilities and published weekly allocations are the source of truth for confirmed venue/time.`,
  snapshotStart
);

if (
  snapshotStart !== -1 &&
  allocationComment !== -1
) {
  coach =
    coach.slice(0, snapshotStart) +
`  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.removeItem(
        "spraoi_builder_target_date"
      );
    }, 0);

    return () => clearTimeout(timer);
  }, []);

` +
    coach.slice(allocationComment);

  console.log(
    "OK: false-positive snapshot dirty tracking removed"
  );
}

/*
Only USER-facing setters mark the Builder dirty.
Hydration uses the raw State setters.
*/

coach = coach.replace(
`  function setSections(updater) {
    setSectionsState(updater);
  }`,
`  function setSections(updater) {
    setHasUnsavedChanges(true);
    setSectionsState(updater);
  }`
);

coach = coach.replace(
`  function setNotes(value) {
    setNotesState(value);
  }`,
`  function setNotes(value) {
    setHasUnsavedChanges(true);
    setNotesState(value);
  }`
);

coach = coach.replace(
`  function setPlannedStartTime(value) {
    setPlannedStartTimeState(value);
  }`,
`  function setPlannedStartTime(value) {
    setHasUnsavedChanges(true);
    setPlannedStartTimeState(value);
  }`
);

coach = coach.replace(
`  function setPlannedLocation(value) {
    setPlannedLocationState(value);
  }`,
`  function setPlannedLocation(value) {
    setHasUnsavedChanges(true);
    setPlannedLocationState(value);
  }`
);

console.log(
  "OK: dirty flag now represents genuine user edits"
);


/* ============================================================
   COACH 2 — ONE CALENDAR DATE SOURCE
   ============================================================ */

const navStart = coach.indexOf(
  `  async function openBuilderCalendarDate`
);

const facilitiesEffect = coach.indexOf(
  `  useEffect(() => {
    let cancelled = false;
    async function loadFacilities()`,
  navStart
);

if (
  navStart === -1 ||
  facilitiesEffect === -1
) {
  console.log(
    "STOP: Builder calendar navigation block not found"
  );
  process.exit(1);
}

const newNavigation = `  function builderDateForDay(dayName) {
    const dayMap = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6
    };

    const monday = new Date();
    monday.setHours(12, 0, 0, 0);

    monday.setDate(
      monday.getDate() -
      ((monday.getDay() + 6) % 7) +
      (weekOffset || 0) * 7
    );

    monday.setDate(
      monday.getDate() +
      dayMap[dayName]
    );

    return \`\${monday.getFullYear()}-\${String(
      monday.getMonth() + 1
    ).padStart(2, "0")}-\${String(
      monday.getDate()
    ).padStart(2, "0")}\`;
  }


  async function openBuilderCalendarDate(
    dayName,
    _ignoredDateObject
  ) {
    const targetDate =
      builderDateForDay(dayName);

    if (!targetDate || !selectedTeam?.id) {
      return;
    }

    /*
     * If this is genuinely the currently-loaded session,
     * there is nothing to reload.
     */
    if (
      editingSession?.session_date === targetDate
    ) {
      setDay(dayName);
      return;
    }

    /*
     * Only warn after an actual USER edit.
     */
    if (hasUnsavedChanges) {
      const discard = window.confirm(
        "You have unsaved changes. Discard them and open the selected date?"
      );

      if (!discard) return;
    }

    try {
      /*
       * Visually move immediately.
       * The allocation lookup and session lookup now use
       * this exact same day.
       */
      setDay(dayName);
      setHasUnsavedChanges(false);

      const { data: plans, error: planError } =
        await supabase
          .from("weekly_plans")
          .select("id")
          .eq(
            "age_group_id",
            selectedTeam.id
          );

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
              "id,plan_id,session_date,planned_starts_at,confirmed_starts_at,confirmed_ends_at,confirmed_facility_id,weekly_allocation_id,station_count,total_duration_mins,notes,created_at"
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

        existingSession =
          sessions?.[0] || null;
      }

      /*
       * SAVED SESSION:
       * parent editSession fetches the full session +
       * session_activities. The Builder key below then
       * remounts with the new saved session.
       */
      if (existingSession?.id) {
        sessionStorage.removeItem(
          "spraoi_builder_target_date"
        );

        if (onEditSession) {
          await onEditSession(existingSession);
        }

        return;
      }

      /*
       * NO SESSION:
       * make the Builder genuinely blank.
       */
      sessionStorage.setItem(
        "spraoi_builder_target_date",
        targetDate
      );

      setSectionsState([
        {
          id: 1,
          type: "warmup",
          label: "Warm-up",
          drills: [],
          duration: "10",
          coachId: "",
          coachName: "",
          notes: ""
        }
      ]);

      setNotesState("");
      setPlannedStartTimeState("");
      setPlannedLocationState("");
      setPublishedAllocation(null);
      setAllocationConflict(false);
      setNextId(2);
      setHasUnsavedChanges(false);

      if (onClearEdit) {
        onClearEdit();
      }

    } catch (error) {
      console.error(
        "Could not open Builder date:",
        error
      );

      alert(
        "Could not open that date: " +
        error.message
      );
    }
  }

`;

coach =
  coach.slice(0, navStart) +
  newNavigation +
  coach.slice(facilitiesEffect);

console.log(
  "OK: calendar/session navigation rebuilt"
);


/* ============================================================
   COACH 3 — REMOUNT WHEN ACTUAL SESSION CHANGES
   ============================================================ */

/*
Existing Session A -> Existing Session B must rerun the
Builder initialisers so its drills/body cannot remain from A.
*/

coach = coach.replace(
`<SessionBuilderScreen club={club}`,
`<SessionBuilderScreen key={editingSession?.id || sessionStorage.getItem("spraoi_builder_target_date") || "new-session"} club={club}`
);

coach = coach.replace(
`              <SessionBuilderScreen
                club={club}`,
`              <SessionBuilderScreen
                key={editingSession?.id || sessionStorage.getItem("spraoi_builder_target_date") || "new-session"}
                club={club}`
);

console.log(
  "OK: Builder remounts only when loaded session/date changes"
);


/* ============================================================
   COACH 4 — OPEN EDIT SESSION ON ITS OWN WEEK
   ============================================================ */

coach = coach.replace(
`  const [weekOffset, setWeekOffset] = useState(0);`,
`  const [weekOffset, setWeekOffset] = useState(() => {
    const targetDate =
      editingSession?.session_date ||
      sessionStorage.getItem(
        "spraoi_builder_target_date"
      );

    if (!targetDate) return 0;

    const target =
      new Date(targetDate + "T12:00:00");

    const today = new Date();

    function mondayFor(value) {
      const date = new Date(value);
      date.setHours(12, 0, 0, 0);
      date.setDate(
        date.getDate() -
        ((date.getDay() + 6) % 7)
      );
      return date;
    }

    return Math.round(
      (
        mondayFor(target).getTime() -
        mondayFor(today).getTime()
      ) /
      (7 * 24 * 60 * 60 * 1000)
    );
  });`
);


/* ============================================================
   COACH 5 — RESET DIRTY FLAG ON SESSION HYDRATION
   ============================================================ */

coach = coach.replace(
`  useEffect(() => {
    if (!editingSession) return;`,
`  useEffect(() => {
    if (!editingSession) return;

    setHasUnsavedChanges(false);`
);

console.log(
  "OK: saved session hydration is not treated as an edit"
);


/* ============================================================
   COACH 6 — DISPLAY CONFIRMED ALLOCATION, NOT DRAFT VALUE
   ============================================================ */

coach = coach.replace(
  `value={plannedStartTime} disabled={Boolean(publishedAllocation)}`,
  `value={publishedAllocation ? confirmedAllocationTime : plannedStartTime} disabled={Boolean(publishedAllocation)}`
);

coach = coach.replace(
  `value={plannedLocation} disabled={Boolean(publishedAllocation)}`,
  `value={publishedAllocation ? confirmedAllocationFacility : plannedLocation} disabled={Boolean(publishedAllocation)}`
);

console.log(
  "OK: confirmed time/facility display uses allocation"
);


/* ============================================================
   CLUB 1 — REMOVE LEFT-RAIL TEAM SELECTOR
   ============================================================ */

function findMatchingDiv(source, start) {
  const token =
    /<div\b[^>]*>|<\/div>/gi;

  token.lastIndex = start;

  let depth = 0;
  let match;

  while ((match = token.exec(source))) {
    if (/^<div\b/i.test(match[0])) {
      depth++;
    } else {
      depth--;

      if (depth === 0) {
        return token.lastIndex;
      }
    }
  }

  return -1;
}

const sidebarStart =
  club.indexOf("function Sidebar(");

let sidebarEnd =
  sidebarStart === -1
    ? -1
    : club.indexOf(
        "\nfunction ",
        sidebarStart + 20
      );

if (
  sidebarStart !== -1 &&
  sidebarEnd !== -1
) {
  let sidebar =
    club.slice(sidebarStart, sidebarEnd);

  const teamMatch =
    sidebar.match(/>\s*TEAM\s*</i);

  if (teamMatch) {
    const teamPos = teamMatch.index;

    const openingDivs = [];

    let searchAt = 0;

    while (true) {
      const pos =
        sidebar.indexOf("<div", searchAt);

      if (
        pos === -1 ||
        pos > teamPos
      ) break;

      openingDivs.push(pos);
      searchAt = pos + 4;
    }

    let removeStart = -1;
    let removeEnd = -1;

    for (
      let i = openingDivs.length - 1;
      i >= 0;
      i--
    ) {
      const start = openingDivs[i];
      const end =
        findMatchingDiv(sidebar, start);

      if (end === -1) continue;

      const block =
        sidebar.slice(start, end);

      const looksLikeTeamSelector =
        />\s*TEAM\s*</i.test(block) &&
        /<select/i.test(block) &&
        /(selectedTeam|ageGroups|visibleTeams|onSelectTeam)/i.test(block) &&
        block.length < 5000;

      if (looksLikeTeamSelector) {
        removeStart = start;
        removeEnd = end;
        break;
      }
    }

    if (
      removeStart !== -1 &&
      removeEnd !== -1
    ) {
      sidebar =
        sidebar.slice(0, removeStart) +
        sidebar.slice(removeEnd);

      club =
        club.slice(0, sidebarStart) +
        sidebar +
        club.slice(sidebarEnd);

      console.log(
        "OK: Club global TEAM selector removed"
      );
    } else {
      console.log(
        "WARNING: Club TEAM selector container not safely matched"
      );
    }
  } else {
    console.log(
      "WARNING: TEAM label not found in Club Sidebar"
    );
  }
} else {
  console.log(
    "WARNING: Club Sidebar not found"
  );
}


/* ============================================================
   CLUB 2 — PUBLISH MUST LINK EXISTING SESSION
   BUT MUST NEVER CREATE ONE
   ============================================================ */

if (scheduling) {
  /*
   * publishWeek updates the allocation row to published,
   * but the local object can still say "draft".
   *
   * ensureSessionForAllocation has a published guard,
   * so pass the newly-published status explicitly.
   */
  const before = scheduling;

  scheduling = scheduling.replace(
    /ensureSessionForAllocation\(\s*a\s*\)/g,
    `ensureSessionForAllocation({
          ...a,
          status: "published"
        })`
  );

  scheduling = scheduling.replace(
    /ensureSessionForAllocation\(\s*allocation\s*\)/g,
    `ensureSessionForAllocation({
          ...allocation,
          status: "published"
        })`
  );

  /*
   * Never preserve an old phantom session link.
   */
  scheduling = scheduling.replace(
    /session_id:\s*linkedSession\?\.id\s*\|\|\s*existingEvent\?\.session_id\s*\|\|\s*null/g,
    `session_id: linkedSession?.id || null`
  );

  if (scheduling !== before) {
    console.log(
      "OK: Club publish now links real existing session after publish"
    );
  } else {
    console.log(
      "NOTE: no publish-call replacement was required"
    );
  }
}


/* ============================================================
   WRITE
   ============================================================ */

fs.writeFileSync(
  coachPath,
  coach,
  "utf8"
);

fs.writeFileSync(
  clubPath,
  club,
  "utf8"
);

if (scheduling) {
  fs.writeFileSync(
    schedulingPath,
    scheduling,
    "utf8"
  );
}

console.log("");
console.log("========================================");
console.log("FINAL CALENDAR / SESSION SYNC FIX APPLIED");
console.log("========================================");
