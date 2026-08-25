const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-pitch-and-history-fix.bak"
);

/* ============================================================
   1. FIX SESSION HISTORY LOADER
   Do NOT join facilities in the main session query.
   ============================================================ */

const loadStart =
  text.indexOf("async function loadTeamSessions(ageGroupId) {");

const loadEnd =
  text.indexOf("\nfunction SessionsListScreen", loadStart);

if (loadStart === -1 || loadEnd === -1) {
  console.log("STOP: loadTeamSessions block not found");
} else {

  const replacement = `async function loadTeamSessions(ageGroupId) {
  if (!ageGroupId) return [];

  const { data: plans, error: plansError } =
    await supabase
      .from("weekly_plans")
      .select("id")
      .eq("age_group_id", ageGroupId);

  if (plansError) throw plansError;

  const planIds = (plans || [])
    .map(plan => plan.id)
    .filter(Boolean);

  if (!planIds.length) return [];

  const { data, error } =
    await supabase
      .from("sessions")
      .select(\`
        *,
        plan:weekly_plans(
          week_number,
          mode,
          age_group_id,
          coach_notes,
          hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name)
        )
      \`)
      .in("plan_id", planIds)
      .not("session_date", "is", null)
      .order("session_date", { ascending: true })
      .order("planned_starts_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

`;

  text =
    text.slice(0, loadStart) +
    replacement +
    text.slice(loadEnd);

  console.log("OK: Sessions history loader simplified");
}


/* ============================================================
   2. REMOVE THE FIRST DUPLICATE PITCH PREFILL EFFECT
   It was directly overwriting planned Coach fields.
   ============================================================ */

const firstPitchStart =
  text.indexOf(
    "  useEffect(() => {\n    let cancelled = false;\n\n    async function loadPublishedPitchForSelectedDay()"
  );

const facilitiesEffect =
  text.indexOf(
    "  useEffect(() => {\n    let cancelled = false;\n    async function loadFacilities()",
    firstPitchStart
  );

if (firstPitchStart !== -1 && facilitiesEffect !== -1) {

  text =
    text.slice(0, firstPitchStart) +
    text.slice(facilitiesEffect);

  console.log(
    "OK: duplicate pitch override effect removed"
  );

} else {
  console.log(
    "WARNING: duplicate pitch effect not found"
  );
}


/* ============================================================
   3. FIX THE REMAINING PUBLISHED ALLOCATION EFFECT
   Allocation should populate confirmed state ONLY.
   It must NOT rewrite Coach planned time/location.
   ============================================================ */

const oldAllocationTail = `      const confirmedTime = (() => { const value = new Date(allocation.starts_at); return \`\${String(value.getHours()).padStart(2, "0")}:\${String(value.getMinutes()).padStart(2, "0")}\`; })();
      const confirmedLocation = allocation.facility?.name || allocation.location || "";
      const differs = Boolean(
        (plannedStartTime && plannedStartTime !== confirmedTime) ||
        (plannedLocation.trim() && confirmedLocation && plannedLocation.trim() !== confirmedLocation)
      );
      setAllocationConflict(differs);
      setPublishedAllocation(allocation);
      setPlannedStartTime(confirmedTime);
      if (confirmedLocation) setPlannedLocation(confirmedLocation);`;

const newAllocationTail = `      const confirmedTime = (() => {
        const value = new Date(allocation.starts_at);

        return Number.isNaN(value.getTime())
          ? ""
          : value.toLocaleTimeString("en-IE", {
              hour: "2-digit",
              minute: "2-digit"
            });
      })();

      const confirmedLocation =
        allocation.facility?.name ||
        allocation.facility?.location ||
        allocation.location ||
        "";

      const differs = Boolean(
        (plannedStartTime &&
          confirmedTime &&
          plannedStartTime !== confirmedTime) ||
        (plannedLocation.trim() &&
          confirmedLocation &&
          plannedLocation.trim() !== confirmedLocation)
      );

      setAllocationConflict(differs);

      setPublishedAllocation({
        ...allocation,
        confirmedTime,
        confirmedLocation
      });

      // IMPORTANT:
      // Do not overwrite the Coach's planned values here.
      // Club allocation is confirmation only.
      // plannedStartTime and plannedLocation remain untouched.`;

if (text.includes(oldAllocationTail)) {
  text = text.replace(
    oldAllocationTail,
    newAllocationTail
  );

  console.log(
    "OK: Club allocation no longer overwrites Coach draft"
  );
} else {
  console.log(
    "WARNING: published allocation assignment block not matched"
  );
}


/* ============================================================
   4. INITIAL BUILDER TIME WHEN EDITING
   Planned value stays planned.
   Confirmed value is shown separately by the allocation UI.
   ============================================================ */

text = text.replace(
`const [plannedStartTime, setPlannedStartTime] = useState(() => editingSession?.planned_starts_at ? new Date(editingSession.planned_starts_at).toTimeString().slice(0,5) : "");`,
`const [plannedStartTime, setPlannedStartTime] = useState(() => {
    if (!editingSession?.planned_starts_at) return "";

    const value = new Date(editingSession.planned_starts_at);

    if (Number.isNaN(value.getTime())) return "";

    return value.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit"
    });
  });`
);

console.log(
  "OK: planned time initialisation fixed"
);


/* ============================================================
   5. MAKE CONFIRMED TIME/FACILITY READ-ONLY DISPLAY
   Do not disable or mutate planned inputs just because an
   allocation exists.
   ============================================================ */

text = text.replace(
  /disabled=\{Boolean\(publishedAllocation\)\}/g,
  ""
);

text = text.replace(
  /background:publishedAllocation\?P\.soft:P\.white/g,
  "background:P.white"
);

console.log(
  "OK: Coach planned fields remain editable"
);


/* ============================================================
   SAVE
   ============================================================ */

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("====================================");
console.log("PITCH + SESSION HISTORY FIX COMPLETE");
console.log("====================================");
