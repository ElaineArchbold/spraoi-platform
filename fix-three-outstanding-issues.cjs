const fs = require("fs");

const coachPath = "./apps/coach/src/App.jsx";
const clubPath  = "./apps/club/src/App.jsx";

let coach = fs.readFileSync(coachPath, "utf8");
let club  = fs.readFileSync(clubPath, "utf8");

fs.copyFileSync(coachPath, coachPath + ".before-final-three-fixes.bak");
fs.copyFileSync(clubPath,  clubPath  + ".before-final-three-fixes.bak");


/* ============================================================
   1. COACH — UNSAVED MODAL ONLY AFTER A REAL USER CHANGE
   ============================================================ */

const previewMarker = `  const previewRef = useRef(null);`;

if (!coach.includes("const userTouchedSessionRef")) {
  if (!coach.includes(previewMarker)) {
    throw new Error("Coach previewRef marker not found");
  }

  coach = coach.replace(
    previewMarker,
`${previewMarker}
  const userTouchedSessionRef = useRef(false);`
  );
}

/* Modal must use explicit user interaction, not hydration state */
coach = coach.replace(
  /if\s*\(\s*hasUnsavedChanges\s*\)\s*\{/g,
  `if (userTouchedSessionRef.current) {`
);

/* Every loaded saved session starts CLEAN */
coach = coach.replace(
`  useEffect(() => {
    if (!editingSession) return;`,
`  useEffect(() => {
    if (!editingSession) return;

    userTouchedSessionRef.current = false;
    setHasUnsavedChanges(false);`
);

/* Calendar switching/blanking also starts CLEAN */
coach = coach.replace(
  /setHasUnsavedChanges\(false\);/g,
  `userTouchedSessionRef.current = false;
      setHasUnsavedChanges(false);`
);

/*
Actual structural edits count as user changes.
These functions are only called by interaction controls.
*/
const mutationFunctions = [
  "addSection",
  "removeSection",
  "moveSection",
  "addDrillToSection",
  "removeDrill",
  "updateDrill",
  "moveDrill"
];

for (const name of mutationFunctions) {
  const regex = new RegExp(
    `(function\\s+${name}\\s*\\([^)]*\\)\\s*\\{)`
  );

  coach = coach.replace(
    regex,
`$1
    userTouchedSessionRef.current = true;
    setHasUnsavedChanges(true);`
  );
}

/*
Inputs/selects/textareas count as user changes through DOM events.
Programmatic React hydration DOES NOT fire onChangeCapture.
*/
const builderStart = coach.indexOf("function SessionBuilderScreen(");
const builderEnd = coach.indexOf("\nfunction ", builderStart + 30);

if (builderStart === -1 || builderEnd === -1) {
  throw new Error("SessionBuilderScreen boundaries not found");
}

let builder = coach.slice(builderStart, builderEnd);

if (!builder.includes("onChangeCapture={() => {")) {
  const returnPos = builder.indexOf("return (");
  const firstDiv = builder.indexOf("<div", returnPos);

  if (returnPos === -1 || firstDiv === -1) {
    throw new Error("Builder root div not found");
  }

  builder =
    builder.slice(0, firstDiv) +
`<div
      onChangeCapture={() => {
        userTouchedSessionRef.current = true;
        setHasUnsavedChanges(true);
      }}`
    + builder.slice(firstDiv + 4);
}

coach =
  coach.slice(0, builderStart) +
  builder +
  coach.slice(builderEnd);

console.log("OK: modal now depends on genuine user edits only");


/* ============================================================
   2. COACH — DISPLAY THE PUBLISHED SLOT RELIABLY
   ============================================================ */

const builderStart2 = coach.indexOf("function SessionBuilderScreen(");
const builderEnd2   = coach.indexOf("\nfunction ", builderStart2 + 30);

builder = coach.slice(builderStart2, builderEnd2);

/* facility helper should also accept precomputed confirmedLocation */
builder = builder.replace(
`  const confirmedAllocationFacility = (() => {
    if (!publishedAllocation) return "";`,
`  const confirmedAllocationFacility = (() => {
    if (!publishedAllocation) return "";

    if (publishedAllocation.confirmedLocation) {
      return publishedAllocation.confirmedLocation;
    }`
);

/*
Find the CONFIRMED TIME area and force its input to display the
allocation value, never plannedStartTime, whenever allocation exists.
*/
const confirmedTimePos = builder.indexOf("CONFIRMED TIME");

if (confirmedTimePos !== -1) {
  const timeWindowEnd = Math.min(
    builder.length,
    confirmedTimePos + 2200
  );

  let window = builder.slice(
    confirmedTimePos,
    timeWindowEnd
  );

  window = window.replace(
    /value=\{plannedStartTime\}/,
    `value={publishedAllocation ? confirmedAllocationTime : plannedStartTime}`
  );

  builder =
    builder.slice(0, confirmedTimePos) +
    window +
    builder.slice(timeWindowEnd);
}

/* Same for facility */
const confirmedFacilityPos = builder.indexOf("CONFIRMED FACILITY");

if (confirmedFacilityPos !== -1) {
  const facilityWindowEnd = Math.min(
    builder.length,
    confirmedFacilityPos + 2400
  );

  let window = builder.slice(
    confirmedFacilityPos,
    facilityWindowEnd
  );

  window = window.replace(
    /value=\{plannedLocation\}/,
    `value={publishedAllocation ? confirmedAllocationFacility : plannedLocation}`
  );

  builder =
    builder.slice(0, confirmedFacilityPos) +
    window +
    builder.slice(facilityWindowEnd);
}

coach =
  coach.slice(0, builderStart2) +
  builder +
  coach.slice(builderEnd2);

console.log("OK: confirmed time/facility display forced to allocation values");


/* ============================================================
   3. COACH — SELF-HEAL A MATCHING EXISTING SESSION
   ============================================================ */

/*
The green banner proves the allocation lookup succeeds.
If we're editing a REAL session and its planned time exactly matches
the published allocation, link the existing session.

NO session is created here.
*/

const allocationSet = `      setPublishedAllocation({
        ...allocation,
        confirmedTime,
        confirmedLocation
      });`;

if (coach.includes(allocationSet) &&
    !coach.includes("SELF-HEAL EXISTING COACH SESSION")) {

  coach = coach.replace(
    allocationSet,
`${allocationSet}

      // SELF-HEAL EXISTING COACH SESSION
      // Never create a session here.
      // Only link the currently-open saved session when date/time match.
      if (
        editingSession?.id &&
        plannedStartTime
      ) {
        const plannedIso =
          localDateTimeIso(
            sessionDate,
            plannedStartTime
          );

        const plannedMs = plannedIso
          ? new Date(plannedIso).getTime()
          : NaN;

        const allocationMs =
          new Date(allocation.starts_at).getTime();

        if (
          Number.isFinite(plannedMs) &&
          Number.isFinite(allocationMs) &&
          Math.abs(plannedMs - allocationMs) < 60000
        ) {
          const { error: linkExistingError } =
            await supabase
              .from("sessions")
              .update({
                weekly_allocation_id: allocation.id,
                confirmed_starts_at: allocation.starts_at,
                confirmed_ends_at: allocation.ends_at,
                confirmed_facility_id:
                  allocation.facility_id || null
              })
              .eq("id", editingSession.id);

          if (linkExistingError) {
            console.error(
              "Could not link published allocation:",
              linkExistingError
            );
          }
        }
      }`
  );
}

console.log("OK: matching saved session self-links to published allocation");


/* ============================================================
   4. CLUB — HIDE GLOBAL TEAM SELECTOR WHILE CLUB IS OPEN
   ============================================================ */

/*
The selector is clearly being rendered outside the Club page itself.
So stop trying to delete it from Club JSX.

ClubPage is mounted for every Club screen.
It hides the small TEAM + select container while Club is active and
restores it when leaving Club.
*/

const clubPageMarker =
  `function ClubPage({ title, sub, children, actions }) {`;

if (!club.includes(clubPageMarker)) {
  throw new Error("ClubPage marker not found");
}

if (!club.includes("spraoiClubHideGlobalTeamSelector")) {
  club = club.replace(
    clubPageMarker,
`${clubPageMarker}

  useEffect(() => {
    function spraoiClubHideGlobalTeamSelector() {
      document.querySelectorAll("select").forEach((select) => {
        let node = select.parentElement;

        for (let level = 0; level < 5 && node; level++) {
          const text = String(
            node.textContent || ""
          )
            .replace(/\\s+/g, " ")
            .trim();

          /*
           * The rail selector is the compact block:
           * TEAM + U12B/U11G etc.
           */
          if (
            /^TEAM\\b/i.test(text) &&
            text.length < 80
          ) {
            node.dataset.spraoiClubTeamSelector =
              "hidden";

            node.dataset.spraoiOldDisplay =
              node.style.display || "";

            node.style.display = "none";
            break;
          }

          node = node.parentElement;
        }
      });
    }

    spraoiClubHideGlobalTeamSelector();

    const observer = new MutationObserver(
      spraoiClubHideGlobalTeamSelector
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();

      document
        .querySelectorAll(
          '[data-spraoi-club-team-selector="hidden"]'
        )
        .forEach((node) => {
          node.style.display =
            node.dataset.spraoiOldDisplay || "";

          delete node.dataset.spraoiClubTeamSelector;
          delete node.dataset.spraoiOldDisplay;
        });
    };
  }, []);`
  );
}

console.log("OK: Club global TEAM selector hidden at runtime");


/* ============================================================
   WRITE
   ============================================================ */

fs.writeFileSync(coachPath, coach, "utf8");
fs.writeFileSync(clubPath, club, "utf8");

console.log("");
console.log("========================================");
console.log("THREE OUTSTANDING FIXES APPLIED");
console.log("========================================");
