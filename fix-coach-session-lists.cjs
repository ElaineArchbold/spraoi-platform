const fs = require("fs");

const path = "./apps/coach/src/App.jsx";

fs.copyFileSync(
  path,
  path + ".before-session-list-order-fix.bak"
);

let text = fs.readFileSync(path, "utf8");

//
// 1. FIX loadUpcoming
// It currently ignores ageGroupId and therefore loads EVERY team's sessions.
//
const loadStart = text.indexOf(
  "  async function loadUpcoming(ageGroupId) {"
);

const loadEnd = text.indexOf(
  "  async function loadAcademyCoachPlan",
  loadStart
);

if (loadStart === -1 || loadEnd === -1) {
  console.error("STOP: loadUpcoming block not found");
} else {
  const replacement = `  async function loadUpcoming(ageGroupId) {
    if (!ageGroupId) {
      setUpcomingSessions([]);
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .select(\`
        *,
        plan:weekly_plans!inner(
          week_number,
          mode,
          age_group_id,
          hurling_skill:skills!weekly_plans_hurling_focus_skill_id_fkey(name)
        )
      \`)
      .eq("plan.age_group_id", ageGroupId)
      .not("session_date", "is", null)
      .order("session_date", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Could not load Coach sessions:", error);
      setUpcomingSessions([]);
      return;
    }

    setUpcomingSessions(data || []);
  }

`;

  text =
    text.slice(0, loadStart) +
    replacement +
    text.slice(loadEnd);

  console.log("OK: Dashboard/Planner now filtered to selected team");
}

//
// 2. SESSIONS PAGE
// Change descending session-date lists to ascending so nearest dates appear first.
// Restrict this change to SessionsListScreen.
//
const listStart =
  text.indexOf("function SessionsListScreen");

if (listStart === -1) {
  console.error("STOP: SessionsListScreen not found");
} else {
  let nextFunction =
    text.indexOf("\nfunction ", listStart + 25);

  if (nextFunction === -1) nextFunction = text.length;

  let block = text.slice(listStart, nextFunction);

  block = block.replace(
    /\.order\("session_date",\s*\{\s*ascending:\s*false\s*\}\)/g,
    '.order("session_date", { ascending: true })'
  );

  text =
    text.slice(0, listStart) +
    block +
    text.slice(nextFunction);

  console.log("OK: Sessions page now shows nearest dates first");
}

fs.writeFileSync(path, text, "utf8");

console.log("DONE");
