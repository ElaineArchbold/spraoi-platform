const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-confirmed-slot-display-final.bak"
);

/*
 * Add two safe derived values beside publishedAllocation state.
 * These DO NOT alter the Coach draft.
 */

const stateMatch = text.match(
  /const \[publishedAllocation,\s*setPublishedAllocation\]\s*=\s*useState\([^;]+;/
);

if (!stateMatch) {
  console.log("STOP: publishedAllocation state not found");
  return;
}

if (!text.includes("const confirmedAllocationTime =")) {
  const helpers = `

  const confirmedAllocationTime = (() => {
    if (!publishedAllocation?.starts_at) return "";

    const d = new Date(publishedAllocation.starts_at);

    if (Number.isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat("en-IE", {
      timeZone: "Europe/Dublin",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(d);
  })();

  const confirmedAllocationFacility = (() => {
    if (!publishedAllocation) return "";

    if (publishedAllocation.facility?.name) {
      return publishedAllocation.facility.name;
    }

    if (publishedAllocation.facility?.location) {
      return publishedAllocation.facility.location;
    }

    const match = (facilities || []).find(
      facility =>
        String(facility.id) ===
        String(publishedAllocation.facility_id || "")
    );

    return match?.name || match?.location || "";
  })();
`;

  text = text.replace(
    stateMatch[0],
    stateMatch[0] + helpers
  );

  console.log("OK: confirmed slot values added");
}


/*
 * Confirmed TIME input:
 * when allocation exists, show Europe/Dublin local time.
 */

text = text.replace(
  /value=\{\s*publishedAllocation\?\.starts_at[\s\S]*?:\s*plannedStartTime\s*\}/g,
  `value={publishedAllocation ? confirmedAllocationTime : plannedStartTime}`
);


/*
 * Older/simple confirmed time binding.
 */

text = text.replace(
  /value=\{plannedStartTime\}\s+disabled=\{Boolean\(publishedAllocation\)\}/g,
  `value={publishedAllocation ? confirmedAllocationTime : plannedStartTime} disabled={Boolean(publishedAllocation)}`
);


/*
 * Confirmed FACILITY:
 * resolve facility_id through the already-loaded Club facilities list.
 */

text = text.replace(
  /value=\{\s*publishedAllocation[\s\S]*?:\s*plannedLocation\s*\}\s+disabled=\{Boolean\(publishedAllocation\)\}/g,
  `value={publishedAllocation ? confirmedAllocationFacility : plannedLocation} disabled={Boolean(publishedAllocation)}`
);


/*
 * Older/simple facility binding.
 */

text = text.replace(
  /value=\{plannedLocation\}\s+disabled=\{Boolean\(publishedAllocation\)\}/g,
  `value={publishedAllocation ? confirmedAllocationFacility : plannedLocation} disabled={Boolean(publishedAllocation)}`
);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("======================================");
console.log("CONFIRMED SLOT DISPLAY FIX COMPLETE");
console.log("Expected Thursday: 19:00 / Newbridge");
console.log("======================================");
