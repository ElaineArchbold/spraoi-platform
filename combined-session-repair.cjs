const fs = require("fs");

const coachPath = "./apps/coach/src/App.jsx";
const clubPath  = "./apps/club/src/ClubScheduling.jsx";

fs.copyFileSync(coachPath, coachPath + ".before-combined-session-repair.bak");
fs.copyFileSync(clubPath, clubPath + ".before-combined-session-repair.bak");

let coach = fs.readFileSync(coachPath, "utf8");
let club  = fs.readFileSync(clubPath, "utf8");

function replaceBetween(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);

  if (start === -1 || end === -1) {
    console.log("WARNING: " + label + " markers not found");
    return text;
  }

  console.log("OK: " + label);
  return text.slice(0, start) + replacement + text.slice(end);
}

/* ============================================================
   1. COACH SESSION LOADER
   One source of truth for Dashboard + Planner + Sessions.
   Selected team only.
   ============================================================ */

coach = replaceBetween(
  coach,
  "  async function loadUpcoming(ageGroupId) {",
  "  async function loadAcademyCoachPlan",
`  async function loadUpcoming(ageGroupId) {
    if (!ageGroupId) {
      setUpcomingSessions([]);
      return;
    }

    const { data, error } = await supabase
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
      .not("session_date", "is", null)
      .order("session_date", { ascending: true })
      .limit(250);

    if (error) {
      console.error("Could not load Coach sessions:", error);
      setUpcomingSessions([]);
      return;
    }

    const teamSessions = (data || [])
      .filter(
        session =>
          String(session?.plan?.age_group_id || "") ===
          String(ageGroupId)
      )
      .sort((a, b) =>
        String(a.session_date || "").localeCompare(
          String(b.session_date || "")
        )
      );

    setUpcomingSessions(teamSessions);
  }

`,
  "Coach selected-team session loader"
);

/* ============================================================
   2. PASS upcomingSessions INTO Sessions screen
   ============================================================ */

coach = coach.replace(
  /<SessionsListScreen club=\{club\}\s+selectedTeam=\{selectedTeam\}\s+onOpenSession=\{openSession\}\s+onNav=\{setScreen\}\s+onEditSession=\{editSession\}\s*\/>/g,
  `<SessionsListScreen
        club={club}
        selectedTeam={selectedTeam}
        upcomingSessions={upcomingSessions}
        onOpenSession={openSession}
        onNav={setScreen}
        onEditSession={editSession}
      />`
);

coach = coach.replace(
  /<SessionsListScreen club=\{club\}\s+selectedTeam=\{selectedTeam\}\s+onOpenSession=\{openSession\}\s+onNav=\{onNav\}\s+onEditSession=\{editSession\}\s*\/>/g,
  `<SessionsListScreen
        club={club}
        selectedTeam={selectedTeam}
        upcomingSessions={upcomingSessions}
        onOpenSession={openSession}
        onNav={onNav}
        onEditSession={editSession}
      />`
);

console.log("OK: Sessions screen receives shared session data");

/* ============================================================
   3. REPLACE SessionsListScreen
   Upcoming first, previous underneath, month visible.
   ============================================================ */

const sessionsStart = coach.indexOf("function SessionsListScreen");

if (sessionsStart !== -1) {
  let sessionsEnd = coach.indexOf("\nfunction ", sessionsStart + 30);

  if (sessionsEnd !== -1) {
    const sessionsReplacement = `function SessionsListScreen({
  club,
  selectedTeam,
  upcomingSessions = [],
  onOpenSession,
  onNav,
  onEditSession
}) {
  const todayKey = (() => {
    const d = new Date();
    return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
  })();

  const sessions = [...(upcomingSessions || [])]
    .filter(session => session?.session_date)
    .sort((a, b) =>
      String(a.session_date).localeCompare(String(b.session_date))
    );

  const future = sessions.filter(
    session => String(session.session_date) >= todayKey
  );

  const previous = sessions
    .filter(session => String(session.session_date) < todayKey)
    .sort((a, b) =>
      String(b.session_date).localeCompare(String(a.session_date))
    );

  function SessionRow({ session }) {
    const d = new Date(\`\${session.session_date}T12:00:00\`);

    const venue =
      session.confirmed_facility?.name ||
      session.facility?.name ||
      null;

    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        marginBottom: 10,
        background: P.white,
        border: \`1px solid \${P.line}\`,
        borderRadius: 14,
        boxShadow: Sh.card
      }}>
        <div style={{
          minWidth: 58,
          textAlign: "center",
          background: P.soft,
          borderRadius: 10,
          padding: "7px 5px"
        }}>
          <div style={{
            fontFamily: F.body,
            fontSize: 9,
            fontWeight: 800,
            color: P.muted,
            textTransform: "uppercase"
          }}>
            {d.toLocaleDateString("en-IE", { weekday: "short" })}
          </div>

          <div style={{
            fontFamily: F.display,
            fontSize: 18,
            fontWeight: 800,
            color: P.ink,
            lineHeight: 1.1
          }}>
            {d.getDate()}
          </div>

          <div style={{
            fontFamily: F.body,
            fontSize: 8,
            fontWeight: 800,
            color: P.muted,
            textTransform: "uppercase",
            marginTop: 2
          }}>
            {d.toLocaleDateString("en-IE", { month: "short" })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: F.body,
            fontSize: 14,
            fontWeight: 800,
            color: P.ink
          }}>
            {session.plan?.hurling_skill?.name || "Training Session"}
          </div>

          <div style={{
            fontFamily: F.body,
            fontSize: 10,
            color: P.muted,
            marginTop: 2
          }}>
            {d.toLocaleDateString("en-IE", {
              weekday: "long",
              day: "numeric",
              month: "short"
            })}
            {" - "}
            {session.total_duration_mins || 0}min
            {" - "}
            {session.station_count || 0} drills
          </div>

          {venue && (
            <div style={{
              fontFamily: F.body,
              fontSize: 10,
              color: P.muted,
              marginTop: 3
            }}>
              {venue}
            </div>
          )}
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 7
        }}>
          <Btn
            label="View"
            variant="ghost"
            onClick={() => onOpenSession(session)}
          />

          <Btn
            label="Edit"
            variant="ghost"
            onClick={() => onEditSession(session)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.soft }}>
      <TopBar
        title="Sessions"
        sub={\`\${sessions.length} saved session\${sessions.length === 1 ? "" : "s"}\`}
      >
        <Btn
          label="New Session"
          variant="primary"
          onClick={() => onNav("coach-builder")}
        />
      </TopBar>

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 20
      }}>
        <div style={{
          fontFamily: F.display,
          fontSize: 17,
          fontWeight: 800,
          color: P.ink,
          marginBottom: 12
        }}>
          Upcoming Sessions
        </div>

        {future.length ? (
          future.map(session => (
            <SessionRow key={session.id} session={session} />
          ))
        ) : (
          <div style={{
            background: P.white,
            border: \`1px solid \${P.line}\`,
            borderRadius: 14,
            padding: 18,
            fontFamily: F.body,
            fontSize: 12,
            color: P.muted,
            marginBottom: 24
          }}>
            No upcoming sessions.
          </div>
        )}

        {previous.length > 0 && (
          <>
            <div style={{
              fontFamily: F.display,
              fontSize: 17,
              fontWeight: 800,
              color: P.ink,
              marginTop: 28,
              marginBottom: 12
            }}>
              Previous Sessions
            </div>

            {previous.map(session => (
              <SessionRow key={session.id} session={session} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

`;

    coach =
      coach.slice(0, sessionsStart) +
      sessionsReplacement +
      coach.slice(sessionsEnd);

    console.log("OK: Sessions page rebuilt");
  } else {
    console.log("WARNING: end of SessionsListScreen not found");
  }
} else {
  console.log("WARNING: SessionsListScreen not found");
}

/* ============================================================
   4. PLANNER NEW SESSION BUTTON
   Open full Session Builder instead of only quick side panel.
   ============================================================ */

coach = coach.replace(
  /label="New Session"\s+variant="primary"\s+onClick=\{\(\)\s*=>\s*setBuildingDate\([^}]+\)\}/g,
  'label="New Session" variant="primary" onClick={() => onNav("coach-builder")}'
);

coach = coach.replace(
  /onClick=\{\(\)\s*=>\s*setBuildingDate\([^}]+\)\}([^>]*>)\s*New Session/g,
  'onClick={() => onNav("coach-builder")}$1New Session'
);

console.log("OK: Planner New Session opens full builder");

/* ============================================================
   5. PUBLISHED PITCH PREFILL
   ============================================================ */

const facilitiesMarker = `  useEffect(() => {
    let cancelled = false;
    async function loadFacilities() {`;

if (
  coach.includes(facilitiesMarker) &&
  !coach.includes("loadPublishedPitchForSelectedDay")
) {
  const pitchEffect = `  useEffect(() => {
    let cancelled = false;

    async function loadPublishedPitchForSelectedDay() {
      if (!selectedTeam?.id || !day) return;

      const sessionDate =
        editingSession?.session_date ||
        selectedSessionDate();

      if (!sessionDate) return;

      const dayStart = \`\${sessionDate}T00:00:00\`;
      const dayEnd = \`\${sessionDate}T23:59:59\`;

      const { data: allocation, error } = await supabase
        .from("weekly_training_allocations")
        .select(\`
          id,
          age_group_id,
          facility_id,
          starts_at,
          ends_at,
          status,
          facility:facilities(id,name,location)
        \`)
        .eq("age_group_id", selectedTeam.id)
        .eq("status", "published")
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled || error) {
        if (error) {
          console.error("Pitch allocation lookup failed:", error);
        }
        return;
      }

      if (!allocation) {
        return;
      }

      const startText = String(allocation.starts_at || "");
      const timeMatch = startText.match(/T(\\d{2}:\\d{2})/);

      if (timeMatch?.[1]) {
        setPlannedStartTime(timeMatch[1]);
      }

      const facilityName =
        allocation.facility?.name ||
        allocation.facility?.location ||
        "";

      if (facilityName) {
        setPlannedLocation(facilityName);
      }
    }

    loadPublishedPitchForSelectedDay();

    return () => {
      cancelled = true;
    };
  }, [
    selectedTeam?.id,
    day,
    weekOffset,
    editingSession?.id
  ]);


`;

  coach = coach.replace(
    facilitiesMarker,
    pitchEffect + facilitiesMarker
  );

  console.log("OK: published pitch prefill installed");
} else {
  console.log("OK: published pitch prefill already present");
}

/* ============================================================
   6. COACH BUILDER
   Never write obsolete planned_location field.
   Preserve confirmed Club allocation.
   ============================================================ */

coach = coach.replace(
  /,\s*planned_location:\s*plannedLocation\.trim\(\)\s*\|\|\s*null/g,
  ""
);

coach = coach.replace(
  /planned_location:\s*plannedLocation\.trim\(\)\s*\|\|\s*null,?/g,
  ""
);

coach = coach.replace(
  /editingSession\?\.planned_location\s*\|\|\s*null/g,
  "null"
);

console.log("OK: obsolete planned_location writes removed");

/* ============================================================
   7. CLUB PUBLISH MATCHING
   Existing Coach session wins.
   Only published allocations create/link sessions.
   ============================================================ */

const ensureStart =
  club.indexOf("  async function ensureSessionForAllocation(allocation) {");

const publishStart =
  club.indexOf("  async function publishWeek", ensureStart);

if (ensureStart !== -1 && publishStart !== -1) {
  const ensureReplacement = `  async function ensureSessionForAllocation(allocation) {
    if (!allocation || allocation.status !== "published") {
      return null;
    }

    const allocationDate =
      String(allocation.starts_at || "").slice(0, 10);

    if (!allocationDate || !allocation.age_group_id) {
      return null;
    }

    const allocationWeekStart = isoDate(
      mondayOf(new Date(\`\${allocationDate}T12:00:00\`))
    );

    const team = ageGroups.find(
      item =>
        String(item.id) ===
        String(allocation.age_group_id)
    );

    let { data: planRows, error: planLookupError } =
      await supabase
        .from("weekly_plans")
        .select("*")
        .eq("age_group_id", allocation.age_group_id)
        .eq("starts_at", allocationWeekStart)
        .order("created_at", { ascending: true })
        .limit(1);

    if (planLookupError) throw planLookupError;

    let plan = planRows?.[0] || null;

    if (!plan) {
      const { data: latest, error: latestError } =
        await supabase
          .from("weekly_plans")
          .select("week_number")
          .eq("age_group_id", allocation.age_group_id)
          .order("week_number", { ascending: false })
          .limit(1);

      if (latestError) throw latestError;

      const nextWeek =
        (latest?.[0]?.week_number || 0) + 1;

      const { data: createdPlan, error: createPlanError } =
        await supabase
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

    const { data: linkedRows, error: linkedError } =
      await supabase
        .from("sessions")
        .select("*")
        .eq("weekly_allocation_id", allocation.id)
        .limit(1);

    if (linkedError) throw linkedError;

    if (linkedRows?.[0]) {
      const existing = linkedRows[0];

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

    const { data: candidates, error: candidateError } =
      await supabase
        .from("sessions")
        .select("*")
        .eq("plan_id", plan.id)
        .eq("session_date", allocationDate)
        .order("created_at", { ascending: true });

    if (candidateError) throw candidateError;

    const allocationStart =
      new Date(allocation.starts_at).getTime();

    const matchingSession =
      (candidates || []).find(session => {
        if (!session.planned_starts_at) return false;

        const plannedStart =
          new Date(session.planned_starts_at).getTime();

        return (
          Number.isFinite(plannedStart) &&
          Number.isFinite(allocationStart) &&
          Math.abs(plannedStart - allocationStart) < 60000
        );
      });

    if (matchingSession) {
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

    const durationMins = Math.max(
      0,
      Math.round(
        (
          new Date(allocation.ends_at).getTime() -
          new Date(allocation.starts_at).getTime()
        ) / 60000
      )
    );

    const nextSessionNumber =
      Math.max(
        0,
        ...(candidates || []).map(
          session => Number(session.session_number || 0)
        )
      ) + 1;

    const { data: createdSession, error: createSessionError } =
      await supabase
        .from("sessions")
        .insert({
          plan_id: plan.id,
          session_number: nextSessionNumber,
          sport:
            team?.gender === "girls"
              ? "camogie"
              : "hurling",
          format: "stations",
          total_duration_mins: durationMins || 60,
          station_count: 0,
          session_date: allocationDate,

          weekly_allocation_id: allocation.id,
          confirmed_starts_at: allocation.starts_at,
          confirmed_ends_at: allocation.ends_at,
          confirmed_facility_id:
            allocation.facility_id || null
        })
        .select()
        .single();

    if (createSessionError) {
      throw createSessionError;
    }

    return createdSession;
  }

`;

  club =
    club.slice(0, ensureStart) +
    ensureReplacement +
    club.slice(publishStart);

  console.log("OK: Club publish matching repaired");
} else {
  console.log("WARNING: Club publish matcher not found");
}

/* ============================================================
   8. CLEAN CORRUPTED COACH CHARACTERS
   ============================================================ */

const cp1252Extra = {
  "\u20AC": 0x80,
  "\u201A": 0x82,
  "\u0192": 0x83,
  "\u201E": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02C6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8A,
  "\u2039": 0x8B,
  "\u0152": 0x8C,
  "\u017D": 0x8E,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201C": 0x93,
  "\u201D": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02DC": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9A,
  "\u203A": 0x9B,
  "\u0153": 0x9C,
  "\u017E": 0x9E,
  "\u0178": 0x9F
};

function byteFor(ch) {
  const code = ch.codePointAt(0);

  if (code <= 0x7f) return code;
  if (code >= 0xa0 && code <= 0xff) return code;

  return cp1252Extra[ch] ?? null;
}

function repairRun(run) {
  const bytes = [];

  for (const ch of run) {
    const b = byteFor(ch);
    if (b === null) return run;
    bytes.push(b);
  }

  const fixed = Buffer.from(bytes).toString("utf8");

  if (fixed.includes("\uFFFD")) return run;

  const before =
    (run.match(/[ÂÃâð]/g) || []).length;

  const after =
    (fixed.match(/[ÂÃâð]/g) || []).length;

  return after < before ? fixed : run;
}

for (let pass = 0; pass < 3; pass++) {
  const next = coach.replace(
    /[ÂÃâð][^\x00-\x7F]{1,8}/g,
    repairRun
  );

  if (next === coach) break;

  coach = next;
}

/* Safe JSX arrows */
coach = coach.replace(
  /Manage A\/B groups >/g,
  'Manage A/B groups {"→"}'
);

coach = coach.replace(
  /Click a drill from the library to add >/g,
  'Click a drill from the library to add {"→"}'
);

coach = coach.replace(
  /Review Weekly Content >/g,
  'Review Weekly Content {"→"}'
);

coach = coach.replace(
  />View all ><\/button>/g,
  '>View all {"→"}</button>'
);

coach = coach.replace(
  />Open engagement ><\/button>/g,
  '>Open engagement {"→"}</button>'
);

coach = coach.replace(
  />Open full ><\/button>/g,
  '>Open full {"→"}</button>'
);

console.log("OK: Coach character cleanup complete");

/* ============================================================
   SAVE
   ============================================================ */

fs.writeFileSync(coachPath, coach, "utf8");
fs.writeFileSync(clubPath, club, "utf8");

const remaining = coach
  .split(/\r?\n/)
  .filter(line => /[ÂÃâð]/.test(line));

console.log("");
console.log("====================================");
console.log("COMBINED SESSION REPAIR COMPLETE");
console.log("Remaining suspicious Coach lines:", remaining.length);
console.log("====================================");

if (remaining.length) {
  remaining.slice(0, 20).forEach(line =>
    console.log(line.trim())
  );
}
