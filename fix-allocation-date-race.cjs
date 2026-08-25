const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-allocation-date-race-fix.bak"
);

/* ============================================================
   1. Add allocation request guard
   ============================================================ */

const previewMarker = `  const previewRef = useRef(null);`;

if (
  text.includes(previewMarker) &&
  !text.includes("allocationRequestRef")
) {
  text = text.replace(
    previewMarker,
`${previewMarker}
  const allocationRequestRef = useRef(0);`
  );
}

console.log("OK: allocation request guard added");


/* ============================================================
   2. When user changes day, immediately clear the OLD pitch
   ============================================================ */

const navMarker = `  async function openBuilderCalendarDate(
    dayName,
    _ignoredDateObject
  ) {`;

if (text.includes(navMarker)) {
  text = text.replace(
    navMarker,
`${navMarker}

    // Never carry the previous day's Club allocation
    // while the newly-selected day is loading.
    allocationRequestRef.current += 1;
    setPublishedAllocation(null);
    setAllocationConflict(false);`
  );

  console.log("OK: old pitch clears immediately on date change");
} else {
  console.log("WARNING: calendar navigation marker not matched");
}


/* ============================================================
   3. Protect allocation lookup from stale async responses
   ============================================================ */

const effectStart = text.indexOf(
`  useEffect(() => {
    let cancelled = false;
    async function loadPublishedAllocation()`
);

const effectEnd = text.indexOf(
`  }, [selectedTeam?.id, day, weekOffset]);`,
effectStart
);

if (effectStart === -1 || effectEnd === -1) {
  console.log("STOP: published allocation effect not found");
  process.exit(1);
}

let block = text.slice(
  effectStart,
  effectEnd
);

block = block.replace(
`    async function loadPublishedAllocation() {
      setPublishedAllocation(null);
      setAllocationConflict(false);`,
`    async function loadPublishedAllocation() {
      const requestId =
        ++allocationRequestRef.current;

      setPublishedAllocation(null);
      setAllocationConflict(false);`
);

block = block.replace(
`      if (cancelled || !allocation) return;`,
`      if (
        cancelled ||
        requestId !== allocationRequestRef.current ||
        !allocation
      ) return;`
);

/*
Before finally committing the allocation to state,
make absolutely sure this is still the selected date.
*/
block = block.replace(
`      setPublishedAllocation({
        ...allocation,
        confirmedTime,
        confirmedLocation
      });`,
`      if (
        requestId !== allocationRequestRef.current ||
        selectedSessionDate() !== sessionDate
      ) {
        return;
      }

      setPublishedAllocation({
        ...allocation,
        confirmedTime,
        confirmedLocation,
        sessionDate
      });`
);

text =
  text.slice(0, effectStart) +
  block +
  text.slice(effectEnd);

console.log("OK: stale allocation responses blocked");


/* ============================================================
   4. Cancel previous request when effect changes/unmounts
   ============================================================ */

text = text.replace(
`    return () => { cancelled = true; };
  }, [selectedTeam?.id, day, weekOffset]);`,
`    return () => {
      cancelled = true;
      allocationRequestRef.current += 1;
    };
  }, [selectedTeam?.id, day, weekOffset]);`
);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("=======================================");
console.log("PITCH ALLOCATION DATE SYNC FIX COMPLETE");
console.log("=======================================");
