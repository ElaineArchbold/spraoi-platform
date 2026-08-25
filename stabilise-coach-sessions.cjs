const fs = require("fs");

const path = "./apps/coach/src/App.jsx";

fs.copyFileSync(
  path,
  path + ".before-coach-stabilisation.bak"
);

let text = fs.readFileSync(path, "utf8");

function replaceComponent(name, replacement) {
  const start = text.indexOf(`function ${name}`);

  if (start === -1) {
    console.log(`WARNING: ${name} not found`);
    return;
  }

  let end = text.indexOf("\nfunction ", start + 20);

  if (end === -1) {
    console.log(`WARNING: end of ${name} not found`);
    return;
  }

  text =
    text.slice(0, start) +
    replacement +
    text.slice(end);

  console.log(`OK: ${name} replaced`);
}

/* ============================================================
   1. TEAM-SPECIFIC SESSION LOADER FOR DASHBOARD + PLANNER
   ============================================================ */

const loaderStart =
  text.indexOf("  async function loadUpcoming(ageGroupId) {");

const loaderEnd =
  text.indexOf(
    "  async function loadAcademyCoachPlan",
    loaderStart
  );

if (loaderStart !== -1 && loaderEnd !== -1) {

  const loader = `  async function loadUpcoming(ageGroupId) {
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
      console.error("Coach session load failed:", error);
      setUpcomingSessions([]);
      return;
    }

    const filtered = (data || [])
      .filter(session =>
        String(session?.plan?.age_group_id || "") ===
        String(ageGroupId)
      )
      .sort((a, b) =>
        String(a.session_date || "").localeCompare(
          String(b.session_date || "")
        )
      );

    setUpcomingSessions(filtered);
  }

`;

  text =
    text.slice(0, loaderStart) +
    loader +
    text.slice(loaderEnd);

  console.log(
    "OK: Dashboard/Planner session loader fixed"
  );

} else {
  console.log(
    "WARNING: loadUpcoming could not be replaced"
  );
}

/* ============================================================
   2. PLANNER NEW SESSION BUTTON
   It must go to Sessions, NOT open quick builder.
   ============================================================ */

const plannerStart =
  text.indexOf("function PlannerScreen");

if (plannerStart !== -1) {

  let plannerEnd =
    text.indexOf("\nfunction ", plannerStart + 30);

  if (plannerEnd === -1) plannerEnd = text.length;

  let planner =
    text.slice(plannerStart, plannerEnd);

  // Btn component version
  planner = planner.replace(
    /<Btn([\s\S]*?)label="New Session"([\s\S]*?)onClick=\{[^}]*\}([\s\S]*?)\/>/g,
    `<Btn$1label="New Session"$2onClick={() => onNav("coach-sessions")}$3/>`
  );

  // normal button version
  planner = planner.replace(
    /onClick=\{\(\)\s*=>\s*setBuildingDate\([^)]*\)\}/g,
    'onClick={() => onNav("coach-sessions")}'
  );

  text =
    text.slice(0, plannerStart) +
    planner +
    text.slice(plannerEnd);

  console.log(
    "OK: Planner New Session now opens Sessions"
  );

} else {
  console.log("WARNING: PlannerScreen not found");
}

/* ============================================================
   3. REBUILD SESSIONS PAGE
   It loads directly from DB, selected team only.
   Upcoming first.
   Month shown.
   ============================================================ */

replaceComponent(
  "SessionsListScreen",
`function SessionsListScreen({
  club,
  selectedTeam,
  onOpenSession,
  onNav,
  onEditSession
}) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      if (!selectedTeam?.id) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }

      setLoadingSessions(true);

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

      if (cancelled) return;

      if (error) {
        console.error("Sessions page load failed:", error);
        setSessions([]);
        setLoadingSessions(false);
        return;
      }

      const filtered = (data || [])
        .filter(session =>
          String(session?.plan?.age_group_id || "") ===
          String(selectedTeam.id)
        )
        .sort((a, b) =>
          String(a.session_date || "").localeCompare(
            String(b.session_date || "")
          )
        );

      setSessions(filtered);
      setLoadingSessions(false);
    }

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [selectedTeam?.id]);

  const today = (() => {
    const d = new Date();

    return \`\${d.getFullYear()}-\${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-\${String(
      d.getDate()
    ).padStart(2, "0")}\`;
  })();

  const upcoming = sessions.filter(
    session =>
      String(session.session_date || "") >= today
  );

  const previous = sessions
    .filter(
      session =>
        String(session.session_date || "") < today
    )
    .sort((a, b) =>
      String(b.session_date || "").localeCompare(
        String(a.session_date || "")
      )
    );

  function SessionRow({ session }) {
    const date = new Date(
      \`\${session.session_date}T12:00:00\`
    );

    const title =
      session.plan?.hurling_skill?.name ||
      "Training Session";

    const start =
      session.confirmed_starts_at ||
      session.planned_starts_at ||
      null;

    const time = start
      ? String(start).match(/T(\\d{2}:\\d{2})/)?.[1]
      : null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 16,
          background: P.white,
          border: \`1px solid \${P.line}\`,
          borderRadius: 14,
          boxShadow: Sh.card,
          marginBottom: 10
        }}
      >
        <div
          style={{
            width: 58,
            flexShrink: 0,
            textAlign: "center",
            background: P.soft,
            borderRadius: 10,
            padding: "7px 4px"
          }}
        >
          <div
            style={{
              fontFamily: F.body,
              fontSize: 9,
              fontWeight: 800,
              color: P.muted,
              textTransform: "uppercase"
            }}
          >
            {date.toLocaleDateString(
              "en-IE",
              { weekday: "short" }
            )}
          </div>

          <div
            style={{
              fontFamily: F.display,
              fontSize: 18,
              fontWeight: 800,
              color: P.ink,
              lineHeight: 1.05
            }}
          >
            {date.getDate()}
          </div>

          <div
            style={{
              fontFamily: F.body,
              fontSize: 8,
              fontWeight: 800,
              color: P.muted,
              textTransform: "uppercase",
              marginTop: 3
            }}
          >
            {date.toLocaleDateString(
              "en-IE",
              { month: "short" }
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: F.body,
              fontSize: 14,
              fontWeight: 800,
              color: P.ink
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontFamily: F.body,
              fontSize: 10,
              color: P.muted,
              marginTop: 3
            }}
          >
            {date.toLocaleDateString(
              "en-IE",
              {
                weekday: "long",
                day: "numeric",
                month: "short"
              }
            )}
            {time ? \` - \${time}\` : ""}
            {" - "}
            {session.total_duration_mins || 0}min
            {" - "}
            {session.station_count || 0} drills
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 7,
            alignItems: "center"
          }}
        >
          <Btn
            label="View"
            variant="ghost"
            onClick={() =>
              onOpenSession(session)
            }
          />

          <Btn
            label="Edit"
            variant="ghost"
            onClick={() =>
              onEditSession(session)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: P.soft
      }}
    >
      <TopBar
        title="Sessions"
        sub={
          loadingSessions
            ? "Loading sessions..."
            : \`\${sessions.length} saved session\${sessions.length === 1 ? "" : "s"}\`
        }
      >
        <Btn
          label="New Session"
          variant="primary"
          onClick={() =>
            onNav("coach-builder")
          }
        />
      </TopBar>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 20
        }}
      >
        <div
          style={{
            fontFamily: F.display,
            fontSize: 17,
            fontWeight: 800,
            color: P.ink,
            marginBottom: 12
          }}
        >
          Upcoming Sessions
        </div>

        {loadingSessions ? (
          <div
            style={{
              padding: 20,
              color: P.muted,
              fontFamily: F.body
            }}
          >
            Loading sessions...
          </div>
        ) : upcoming.length ? (
          upcoming.map(session => (
            <SessionRow
              key={session.id}
              session={session}
            />
          ))
        ) : (
          <div
            style={{
              padding: 18,
              marginBottom: 28,
              background: P.white,
              border: \`1px solid \${P.line}\`,
              borderRadius: 14,
              color: P.muted,
              fontFamily: F.body,
              fontSize: 12
            }}
          >
            No upcoming sessions.
          </div>
        )}

        {previous.length > 0 && (
          <>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 17,
                fontWeight: 800,
                color: P.ink,
                marginTop: 28,
                marginBottom: 12
              }}
            >
              Previous Sessions
            </div>

            {previous.map(session => (
              <SessionRow
                key={session.id}
                session={session}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

`
);

/* ============================================================
   4. RESTORE PUBLISHED PITCH PREFILL IN FULL BUILDER
   ============================================================ */

const facilityMarker = `  useEffect(() => {
    let cancelled = false;
    async function loadFacilities() {`;

if (
  text.includes(facilityMarker) &&
  !text.includes(
    "loadPublishedPitchForSelectedDay"
  )
) {

  const pitchEffect = `  useEffect(() => {
    let cancelled = false;

    async function loadPublishedPitchForSelectedDay() {
      if (!selectedTeam?.id || !day) return;

      const sessionDate =
        editingSession?.session_date ||
        selectedSessionDate();

      if (!sessionDate) return;

      const dayStart =
        \`\${sessionDate}T00:00:00\`;

      const dayEnd =
        \`\${sessionDate}T23:59:59\`;

      const { data: allocation, error } =
        await supabase
          .from("weekly_training_allocations")
          .select(
            "id,age_group_id,facility_id,starts_at,ends_at,status,facility:facilities(id,name,location)"
          )
          .eq(
            "age_group_id",
            selectedTeam.id
          )
          .eq("status", "published")
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd)
          .order(
            "starts_at",
            { ascending: true }
          )
          .limit(1)
          .maybeSingle();

      if (cancelled || error) {
        if (error) {
          console.error(
            "Pitch allocation lookup failed:",
            error
          );
        }

        return;
      }

      if (!allocation) return;

      const match =
        String(
          allocation.starts_at || ""
        ).match(/T(\\d{2}:\\d{2})/);

      if (match?.[1]) {
        setPlannedStartTime(match[1]);
      }

      const venue =
        allocation.facility?.name ||
        allocation.facility?.location ||
        "";

      if (venue) {
        setPlannedLocation(venue);
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

  text = text.replace(
    facilityMarker,
    pitchEffect + facilityMarker
  );

  console.log(
    "OK: published pitch prefill installed"
  );

} else {
  console.log(
    "OK: published pitch prefill already exists"
  );
}

/* ============================================================
   5. REMOVE OBSOLETE planned_location WRITES
   This DB column does not exist.
   ============================================================ */

text = text.replace(
  /,\s*planned_location:\s*plannedLocation\.trim\(\)\s*\|\|\s*null/g,
  ""
);

text = text.replace(
  /planned_location:\s*plannedLocation\.trim\(\)\s*\|\|\s*null,?/g,
  ""
);

text = text.replace(
  /editingSession\?\.planned_location\s*\|\|\s*null/g,
  "null"
);

console.log(
  "OK: obsolete planned_location writes removed"
);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("==============================");
console.log("COACH STABILISATION COMPLETE");
console.log("==============================");
