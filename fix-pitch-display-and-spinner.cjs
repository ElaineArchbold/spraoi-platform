const fs = require("fs");

/* ============================================================
   COACH — DISPLAY THE ACTUAL PUBLISHED ALLOCATION
   ============================================================ */

const coachPath = "./apps/coach/src/App.jsx";
let coach = fs.readFileSync(coachPath, "utf8");

fs.copyFileSync(
  coachPath,
  coachPath + ".before-final-pitch-display-fix.bak"
);

/*
  Stop the allocation lookup from overwriting the Coach's
  planned draft values.
*/

const allocationStart = coach.indexOf(
  "async function loadPublishedAllocation()"
);

if (allocationStart !== -1) {
  const allocationEnd = coach.indexOf(
    "loadPublishedAllocation();",
    allocationStart
  );

  if (allocationEnd !== -1) {
    let block = coach.slice(
      allocationStart,
      allocationEnd
    );

    block = block.replace(
      /\s*setPlannedStartTime\(confirmedTime\);/g,
      ""
    );

    block = block.replace(
      /\s*setPlannedFacilityId\(allocation\.facility_id\s*\|\|\s*""\);/g,
      ""
    );

    block = block.replace(
      /\s*if\s*\(confirmedLocation\)\s*setPlannedLocation\(confirmedLocation\);/g,
      ""
    );

    coach =
      coach.slice(0, allocationStart) +
      block +
      coach.slice(allocationEnd);

    console.log(
      "OK: Club allocation no longer overwrites Coach draft"
    );
  }
}

/*
  The confirmed fields must display from publishedAllocation
  itself — NOT from the Coach planned fields.
*/

coach = coach.replace(
`<input type="time" value={plannedStartTime} disabled={Boolean(publishedAllocation)} onChange={(e)=>setPlannedStartTime(e.target.value)}`,
`<input
                  type="time"
                  value={
                    publishedAllocation?.starts_at
                      ? new Date(
                          publishedAllocation.starts_at
                        ).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                          }
                        )
                      : plannedStartTime
                  }
                  disabled={Boolean(publishedAllocation)}
                  onChange={(e)=>setPlannedStartTime(e.target.value)}`
);

coach = coach.replace(
`<input list="spraoi-club-facilities" value={plannedLocation} disabled={Boolean(publishedAllocation)}`,
`<input
                  list="spraoi-club-facilities"
                  value={
                    publishedAllocation
                      ? (
                          publishedAllocation.facility?.name ||
                          publishedAllocation.facility?.location ||
                          facilities.find(
                            (facility) =>
                              String(facility.id) ===
                              String(
                                publishedAllocation.facility_id || ""
                              )
                          )?.name ||
                          facilities.find(
                            (facility) =>
                              String(facility.id) ===
                              String(
                                publishedAllocation.facility_id || ""
                              )
                          )?.location ||
                          ""
                        )
                      : plannedLocation
                  }
                  disabled={Boolean(publishedAllocation)}`
);

fs.writeFileSync(coachPath, coach, "utf8");

console.log(
  "OK: confirmed pitch/time now display directly from Club allocation"
);


/* ============================================================
   CLUB — SAFE SPINNER USING EXISTING busy STATE
   ============================================================ */

const clubPath = "./apps/club/src/ClubScheduling.jsx";
let club = fs.readFileSync(clubPath, "utf8");

fs.copyFileSync(
  clubPath,
  clubPath + ".before-safe-svg-spinner.bak"
);

const oldPublishButton = `                <button
                  type="button"
                  onClick={publishWeek}
                  disabled={busy}
                  style={btn(true)}
                >
                  Publish Week
                </button>`;

const newPublishButton = `                <button
                  type="button"
                  onClick={publishWeek}
                  disabled={busy}
                  style={{
                    ...btn(true),
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    opacity: busy ? 0.8 : 1,
                    cursor: busy ? "wait" : "pointer"
                  }}
                >
                  {busy && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="rgba(255,255,255,.4)"
                        strokeWidth="3"
                      />
                      <path
                        d="M12 3a9 9 0 0 1 9 9"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 12 12"
                          to="360 12 12"
                          dur="0.7s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </svg>
                  )}

                  {busy ? "Publishing..." : "Publish Week"}
                </button>`;

if (club.includes(oldPublishButton)) {
  club = club.replace(
    oldPublishButton,
    newPublishButton
  );

  console.log(
    "OK: Club Publish button spinner installed"
  );
} else {
  console.log(
    "WARNING: exact Publish button was not found"
  );
}

fs.writeFileSync(clubPath, club, "utf8");

console.log("");
console.log("=====================================");
console.log("PITCH DISPLAY + SPINNER FIX COMPLETE");
console.log("=====================================");
