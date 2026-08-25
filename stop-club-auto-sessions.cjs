const fs = require("fs");

const path = "./apps/club/src/ClubScheduling.jsx";

if (!fs.existsSync(path)) {
  console.log("STOP: ClubScheduling.jsx not found");
  return;
}

let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-no-auto-sessions.bak"
);

const start =
  text.indexOf(
    "  async function ensureSessionForAllocation(allocation) {"
  );

const end =
  text.indexOf(
    "  async function publishWeek",
    start
  );

if (start === -1 || end === -1) {
  console.log(
    "STOP: ensureSessionForAllocation block not found"
  );
  return;
}

const replacement = `  async function ensureSessionForAllocation(allocation) {
    // Club publishing MUST NOT create Coach sessions.
    //
    // It may only link a session that a Coach has already
    // created for the exact same team, date and time.

    if (!allocation || allocation.status !== "published") {
      return null;
    }

    if (
      !allocation.age_group_id ||
      !allocation.starts_at
    ) {
      return null;
    }

    const allocationDate =
      String(allocation.starts_at).slice(0, 10);

    const allocationStart =
      new Date(allocation.starts_at).getTime();

    if (
      !allocationDate ||
      !Number.isFinite(allocationStart)
    ) {
      return null;
    }

    // --------------------------------------------------------
    // Already linked?
    // Refresh confirmation only.
    // --------------------------------------------------------

    const { data: alreadyLinked, error: linkedError } =
      await supabase
        .from("sessions")
        .select("*")
        .eq("weekly_allocation_id", allocation.id)
        .limit(1);

    if (linkedError) throw linkedError;

    if (alreadyLinked?.[0]) {
      const existing = alreadyLinked[0];

      const { data: refreshed, error: refreshError } =
        await supabase
          .from("sessions")
          .update({
            confirmed_starts_at: allocation.starts_at,
            confirmed_ends_at: allocation.ends_at,
            confirmed_facility_id:
              allocation.facility_id || null
          })
          .eq("id", existing.id)
          .select()
          .single();

      if (refreshError) throw refreshError;

      return refreshed;
    }

    // --------------------------------------------------------
    // Find plans belonging to this team.
    // --------------------------------------------------------

    const { data: plans, error: planError } =
      await supabase
        .from("weekly_plans")
        .select("id")
        .eq(
          "age_group_id",
          allocation.age_group_id
        );

    if (planError) throw planError;

    const planIds =
      (plans || []).map(plan => plan.id);

    if (!planIds.length) {
      // No Coach plan exists.
      // DO NOT CREATE ONE.
      return null;
    }

    // --------------------------------------------------------
    // Find Coach-created sessions on this date.
    // --------------------------------------------------------

    const { data: sessions, error: sessionError } =
      await supabase
        .from("sessions")
        .select("*")
        .in("plan_id", planIds)
        .eq("session_date", allocationDate);

    if (sessionError) throw sessionError;

    const matchingSession =
      (sessions || []).find(session => {
        if (!session.planned_starts_at) {
          return false;
        }

        const plannedStart =
          new Date(
            session.planned_starts_at
          ).getTime();

        return (
          Number.isFinite(plannedStart) &&
          Math.abs(
            plannedStart - allocationStart
          ) < 60000
        );
      });

    if (!matchingSession) {
      // Pitch allocation exists,
      // but Coach has not created a matching session.
      //
      // Correct behaviour: leave Coach empty.
      return null;
    }

    // --------------------------------------------------------
    // Link confirmation to the REAL Coach session.
    // Do not touch drills, notes, sections or duration.
    // --------------------------------------------------------

    const { data: linked, error: linkError } =
      await supabase
        .from("sessions")
        .update({
          weekly_allocation_id: allocation.id,
          confirmed_starts_at: allocation.starts_at,
          confirmed_ends_at: allocation.ends_at,
          confirmed_facility_id:
            allocation.facility_id || null
        })
        .eq("id", matchingSession.id)
        .select()
        .single();

    if (linkError) throw linkError;

    return linked;
  }

`;

text =
  text.slice(0, start) +
  replacement +
  text.slice(end);


/* ============================================================
   IMPORTANT:
   Do not retain an old/phantom event.session_id when there is
   no actual matching Coach session.
   ============================================================ */

text = text.replace(
  /session_id:\s*linkedSession\?\.id\s*\|\|\s*existingEvent\?\.session_id\s*\|\|\s*null/g,
  "session_id: linkedSession?.id || null"
);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("=======================================");
console.log("AUTO-CREATED COACH SESSIONS REMOVED");
console.log("=======================================");
console.log("");
console.log("Club publishing can now ONLY:");
console.log("- publish the pitch allocation");
console.log("- link an existing matching Coach session");
console.log("");
console.log("It can NEVER create a Coach session.");
