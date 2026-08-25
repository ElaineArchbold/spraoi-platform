const fs = require("fs");

const clubPath = "./apps/club/src/ClubScheduling.jsx";
const coachPath = "./apps/coach/src/App.jsx";

//
// BACKUPS
//
fs.copyFileSync(clubPath, clubPath + ".before-publish-match-fix.bak");
fs.copyFileSync(coachPath, coachPath + ".before-character-fix.bak");

//
// ============================================================
// 1. CLUB: published allocation must reuse an existing session
// ============================================================
//

let club = fs.readFileSync(clubPath, "utf8");

const startMarker =
  "  async function ensureSessionForAllocation(allocation) {";

const endMarker =
  "  async function publishWeek";

const start = club.indexOf(startMarker);
const end = club.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.error("STOP: could not find ensureSessionForAllocation/publishWeek.");
  process.exitCode = 1;
} else {
  const replacement = `  async function ensureSessionForAllocation(allocation) {
    // Draft allocations and recurring templates must NEVER create Coach sessions.
    if (!allocation || allocation.status !== "published") return null;

    const allocationDate = String(allocation.starts_at || "").slice(0, 10);
    if (!allocationDate || !allocation.age_group_id) return null;

    const allocationWeekStart = isoDate(
      mondayOf(new Date(\`\${allocationDate}T12:00:00\`))
    );

    const team = ageGroups.find(
      (item) => String(item.id) === String(allocation.age_group_id)
    );

    // Find the weekly plan for this team/week.
    let { data: planRows, error: planLookupError } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("age_group_id", allocation.age_group_id)
      .eq("starts_at", allocationWeekStart)
      .order("created_at", { ascending: true })
      .limit(1);

    if (planLookupError) throw planLookupError;

    let plan = planRows?.[0] || null;

    // A Coach may not have planned this week yet.
    // Create only the weekly container here, not multiple future sessions.
    if (!plan) {
      const { data: latest, error: latestError } = await supabase
        .from("weekly_plans")
        .select("week_number")
        .eq("age_group_id", allocation.age_group_id)
        .order("week_number", { ascending: false })
        .limit(1);

      if (latestError) throw latestError;

      const nextWeek = (latest?.[0]?.week_number || 0) + 1;

      const { data: createdPlan, error: createPlanError } = await supabase
        .from("weekly_plans")
        .insert({
          club_id: club.id,
          age_group_id: allocation.age_group_id,
          week_number: nextWeek,
          season: "2026-27",
          mode: "hurling",
          starts_at: allocationWeekStart,
          published: false
        })
        .select()
        .single();

      if (createPlanError) throw createPlanError;
      plan = createdPlan;
    }

    // If this allocation is already linked, just refresh Club-owned
    // CONFIRMED fields. Never touch Coach-owned planned fields/content.
    const { data: alreadyLinked, error: linkedError } = await supabase
      .from("sessions")
      .select("*")
      .eq("weekly_allocation_id", allocation.id)
      .limit(1);

    if (linkedError) throw linkedError;

    if (alreadyLinked?.[0]) {
      const existing = alreadyLinked[0];

      const { data: refreshed, error: refreshError } = await supabase
        .from("sessions")
        .update({
          confirmed_starts_at: allocation.starts_at,
          confirmed_ends_at: allocation.ends_at,
          confirmed_facility_id: allocation.facility_id || null
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (refreshError) throw refreshError;
      return refreshed;
    }

    // Find Coach-created sessions for the SAME team/week/date.
    const { data: candidates, error: candidateError } = await supabase
      .from("sessions")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("session_date", allocationDate)
      .order("created_at", { ascending: true });

    if (candidateError) throw candidateError;

    const allocationStartMs = new Date(allocation.starts_at).getTime();

    // Match only when Coach planned the same date AND same time.
    // This prevents a different session on the same day being hijacked.
    const matchingSession = (candidates || []).find((session) => {
      if (!session.planned_starts_at) return false;

      const plannedMs = new Date(session.planned_starts_at).getTime();

      return (
        Number.isFinite(plannedMs) &&
        Number.isFinite(allocationStartMs) &&
        Math.abs(plannedMs - allocationStartMs) < 60000
      );
    });

    if (matchingSession) {
      // IMPORTANT:
      // Do NOT update notes, drills, duration, station count,
      // planned time or planned facility.
      const { data: linked, error: linkError } = await supabase
        .from("sessions")
        .update({
          weekly_allocation_id: allocation.id,
          confirmed_starts_at: allocation.starts_at,
          confirmed_ends_at: allocation.ends_at,
          confirmed_facility_id: allocation.facility_id || null
        })
        .eq("id", matchingSession.id)
        .select()
        .single();

      if (linkError) throw linkError;
      return linked;
    }

    // No Coach plan matched this published allocation.
    // Create ONE empty published-session placeholder for this allocation only.
    const durationMins = Math.max(
      0,
      Math.round(
        (new Date(allocation.ends_at).getTime() -
          new Date(allocation.starts_at).getTime()) /
          60000
      )
    );

    const nextSessionNumber =
      Math.max(
        0,
        ...(candidates || []).map((session) =>
          Number(session.session_number || 0)
        )
      ) + 1;

    const { data: createdSession, error: createSessionError } =
      await supabase
        .from("sessions")
        .insert({
          plan_id: plan.id,
          session_number: nextSessionNumber,
          sport: team?.gender === "girls" ? "camogie" : "hurling",
          format: "stations",
          total_duration_mins: durationMins || 60,
          station_count: 0,
          session_date: allocationDate,

          // Club-owned linkage only.
          weekly_allocation_id: allocation.id,
          confirmed_starts_at: allocation.starts_at,
          confirmed_ends_at: allocation.ends_at,
          confirmed_facility_id: allocation.facility_id || null
        })
        .select()
        .single();

    if (createSessionError) throw createSessionError;

    return createdSession;
  }

`;

  club = club.slice(0, start) + replacement + club.slice(end);

  fs.writeFileSync(clubPath, club, "utf8");
  console.log("OK: publish matching now preserves existing Coach sessions");
}

//
// ============================================================
// 2. COACH: remove known mojibake / broken characters
// ============================================================
//

let coach = fs.readFileSync(coachPath, "utf8");

// Known corrupt sequences, written as Unicode escapes so the terminal
// does not have to paste the broken characters themselves.
const replacements = [
  [new RegExp("\\u00c2\\u00b7", "g"), " - "],
  [new RegExp("\\u00e2\\u20ac\\u201d", "g"), " - "],
  [new RegExp("\\u00e2\\u20ac\\u201c", "g"), " - "],
  [new RegExp("\\u00e2\\u2020\\u2019", "g"), ">"],
  [new RegExp("\\u00c3\\u2014", "g"), "x"],
  [new RegExp("\\u00e2\\u2014\\u02c6", "g"), ""]
];

for (const [bad, good] of replacements) {
  coach = coach.replace(bad, good);
}

// Replace the broken Pitch/List label regardless of its corrupt symbol.
coach = coach.replace(
  /\{pitchView\s*\?\s*"[^"]*List"\s*:\s*"[^"]*Pitch"\s*\}/g,
  '{pitchView ? "List" : "Pitch"}'
);

// Replace corrupt close-button characters with safe ASCII.
coach = coach.replace(
  /(<button[^>]*onClick=\{\(\)\s*=>\s*setSessionDetail\(null\)[^>]*>)[^<]*(<\/button>)/g,
  '$1x$2'
);

fs.writeFileSync(coachPath, coach, "utf8");

console.log("OK: Coach broken characters cleaned");

const suspicious = coach
  .split(/\r?\n/)
  .filter((line) => /[\u00c2\u00c3\u00e2\u00f0]/.test(line));

console.log("Remaining suspicious Coach lines:", suspicious.length);
if (suspicious.length) {
  suspicious.slice(0, 20).forEach((line) => console.log(line.trim()));
}
