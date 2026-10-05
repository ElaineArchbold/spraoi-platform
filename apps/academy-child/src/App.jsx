import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LEGAL_POLICIES, LEGAL_POLICY_VERSION } from "../../../packages/ui/src/legalPolicies.js";
import { CheckCircle, Circle, Trophy, Flame, Target, Zap, Home, Award, BookOpen, LogOut, Plus, ChevronDown, ChevronUp, User, Bell, CalendarDays} from "lucide-react";
import ParentUpdates, { ImportantNotificationModal, useParentNotifications } from "./ParentUpdates";
import PushNotificationsCard from "./PushNotificationsCard";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("A new Spraoi version is available.");
  },
  onOfflineReady() {
    console.log("Spraoi is ready for offline use.");
  },
});

/* ============================================================
   SPRAOI   Player and parent experience
   Green brand (matches spraoisports.com), sport-colored cards,
   practice, streaks, XP, badges.
   ============================================================ */
const C = {
  // Spraoi Academy blue
  primary: "#0EA5E9",
  primaryBright: "#38BDF8",
  primaryDark: "#0369A1",
  // Sport colors
  hurling: "#16A34A",
  hurlingBg: "#F0FDF4",
  football: "#1d4ed8",
  footballBg: "#eff6ff",
  athletic: "#d97706",
  athleticBg: "#fffbeb",
  // UI
  gold: "#f4c542",
  background: "#f0f7fc",
  surface: "#ffffff",
  surfaceAlt: "#f5faff",
  text: "#1a2a3a",
  textSecondary: "#5a7a8f",
  border: "#d6e8f5",
  success: "#16a34a",
  successBg: "#f0fdf4",
};

const BRAND_LOGO = "/spraoi-logo.png";
const APP_ICON = "/spraoi-logo.png";

// Icon-only Academy sections. Mascots intentionally removed.
const SECTIONS = {
  weekly: { icon: "/spraoi-academy-icon.png", color: C.primary, bg: "#e0f2fe", border: "#bae6fd" },
  skills: { icon: "/spraoi-academy-icon.png", color: C.primaryDark, bg: "#eff6ff", border: "#bfdbfe" },
  fitness: { icon: "/speed-mechanics-icon.png", color: C.athletic, bg: C.athleticBg, border: "#fde68a" },
  recovery: { icon: "/rest-and-recovery-icon.png", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
  events: { icon: "/spraoi-academy-icon.png", color: C.primaryDark, bg: "#e0f2fe", border: "#bae6fd" },
};

const XP_PER_LEVEL = 100;
function getLevel(xp) { return Math.floor((xp || 0) / XP_PER_LEVEL) + 1; }
function xpInLevel(xp) { return (xp || 0) % XP_PER_LEVEL; }

/* Recovery stretches   weekly rotation */
const RECOVERY_STRETCHES = [
  { title: "Standing Quad Stretch", how: "Stand on one leg, hold your ankle behind you and gently pull your heel towards your bottom. Keep your knees together.", stretches: "Front of thighs" },
  { title: "Hamstring Stretch", how: "Sit with one leg straight and the other foot tucked in. Reach towards your toes while keeping your back straight.", stretches: "Back of thighs" },
  { title: "Calf Stretch", how: "Place your hands against a wall, step one foot back and press the heel into the ground while bending the front knee.", stretches: "Calves" },
  { title: "Butterfly Stretch", how: "Sit with the soles of your feet together and gently let your knees fall towards the floor. Sit up tall.", stretches: "Groin and inner thighs" },
  { title: "Figure 4 Glute Stretch", how: "Lie on your back, cross one ankle over the opposite knee and gently pull the supporting leg towards your chest.", stretches: "Glutes and hips" },
  { title: "Hip Flexor Lunge Stretch", how: "Step into a lunge with one knee on the ground. Keep your chest up and gently push your hips forward.", stretches: "Front of hips" },
  { title: "Child's Pose", how: "Kneel on the floor, sit back on your heels and stretch your arms out in front while lowering your chest.", stretches: "Back, shoulders and hips" },
  { title: "Shoulder & Chest Stretch", how: "Clasp your hands behind your back, straighten your arms and gently lift them while opening your chest.", stretches: "Chest and shoulders" },
];

const ACADEMY_QUOTES = {
  young: [
    "Small steps every day make a big difference.",
    "Be brave, be kind, and keep trying.",
    "A great teammate helps everyone enjoy the game.",
    "You do not have to be perfect — just keep practising.",
  ],
  older: [
    "Progress comes from showing up, practising and helping your teammates.",
    "Focus on what you can control: your effort, attitude and teamwork.",
    "Confidence grows when you practise the things that challenge you.",
    "The best teams improve together, not just individually.",
  ],
};

function mondayKeyForDate(value) {
  const d=value?new Date(`${String(value).slice(0,10)}T12:00:00`):new Date();
  if(Number.isNaN(d.getTime())) return null;
  const diff=d.getDay()===0?-6:1-d.getDay(); d.setDate(d.getDate()+diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function weekKeyFromOffset(offset=0){ const base=new Date(`${mondayKeyForDate(new Date().toISOString().slice(0,10))}T12:00:00`); base.setDate(base.getDate()+(offset*7)); return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`; }
function weekCommencingLabel(offset=0){ const d=new Date(`${weekKeyFromOffset(offset)}T12:00:00`); return `Week starting ${d.toLocaleDateString("en-IE",{day:"numeric",month:"short",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined})}`; }

function academyQuoteFor(player, weeklyPlan) {
  const label = String(player?.age_group?.label || player?.age_group_label || "");
  const match = label.match(/U(\d+)/i);
  const age = match ? Number(match[1]) : 10;
  const pool = age <= 9 ? ACADEMY_QUOTES.young : ACADEMY_QUOTES.older;
  const week = Number(weeklyPlan?.week_number || 1);
  return pool[(week - 1) % pool.length];
}

/* ============================================================
   COACH EXERCISE MANAGER   set fitness tasks for a team
   ============================================================ */
function CoachExerciseManager({
  coachTeams,
  coachSelectedTeam,
  onSelectTeam
}) {
  const [tab, setTab] = useState("home");
  const [sessions, setSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSessionActivities, setSelectedSessionActivities] = useState([]);

  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendancePlayers, setAttendancePlayers] = useState([]);
  const [attendanceStaff, setAttendanceStaff] = useState([]);
  const [attendanceResponses, setAttendanceResponses] = useState([]);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [attendanceSavingKey, setAttendanceSavingKey] = useState("");

  const [drills, setDrills] = useState([]);
  const [drillSearch, setDrillSearch] = useState("");
  const [drillSport, setDrillSport] = useState("all");
  const [selectedDrill, setSelectedDrill] = useState(null);

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingCoachData, setLoadingCoachData] = useState(false);
  const [attendanceDueEvents, setAttendanceDueEvents] = useState([]);
  const [canManageAttendance, setCanManageAttendance] = useState(false);

  const [strengthPlan, setStrengthPlan] = useState(null);
  const [strengthExercises, setStrengthExercises] = useState([]);
  const [strengthProgress, setStrengthProgress] = useState([]);
  const [strengthFeedback, setStrengthFeedback] = useState([]);
  const [strengthPlayerNames, setStrengthPlayerNames] = useState(new Map());
  const [strengthLoading, setStrengthLoading] = useState(false);
  const [strengthSaving, setStrengthSaving] = useState(false);
  const [canManageStrength, setCanManageStrength] = useState(false);
  const [strengthFeedbackDrafts, setStrengthFeedbackDrafts] = useState({});
  const [selectedStrengthPlayerId, setSelectedStrengthPlayerId] = useState("");
  const [strengthOverrides, setStrengthOverrides] = useState([]);
  const [strengthPlayerSquads, setStrengthPlayerSquads] = useState(new Map());
  const [strengthGroups, setStrengthGroups] = useState([]);
  const [strengthGroupMemberships, setStrengthGroupMemberships] = useState([]);
  const [strengthViewMode, setStrengthViewMode] = useState("groups");
  const [selectedStrengthGroupId, setSelectedStrengthGroupId] = useState("");
  const [newStrengthTitle, setNewStrengthTitle] = useState("");
  const [newStrengthDesc, setNewStrengthDesc] = useState("");
  const [newStrengthType, setNewStrengthType] = useState("exercise");
  const [newStrengthXp, setNewStrengthXp] = useState("10");

  useEffect(() => {
    if (!coachSelectedTeam?.id) return;

    loadMobileCoachData(coachSelectedTeam);
  }, [coachSelectedTeam?.id]);

  useEffect(() => {
    loadApprovedDrills();
  }, []);

  useEffect(() => {
    if (!coachSelectedTeam?.id) {
      setAttendanceDueEvents([]);
      setCanManageAttendance(false);
      return;
    }

    loadAttendanceReminderState(coachSelectedTeam);

    const interval = window.setInterval(() => {
      loadAttendanceReminderState(coachSelectedTeam);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [coachSelectedTeam?.id]);

  useEffect(() => {
    if (!coachSelectedTeam?.id) return;
    loadStrengthData(coachSelectedTeam);
  }, [coachSelectedTeam?.id]);

  async function loadMobileCoachData(team) {
    if (!team?.id) return;

    setLoadingCoachData(true);

    try {
      const { data: plans, error: plansError } = await supabase
        .from("weekly_plans")
        .select("id,week_number,starts_at")
        .eq("age_group_id", team.id);

      if (plansError) {
        console.error("Mobile Coach plans error:", plansError);
      }

      const planIds = (plans || [])
        .map((plan) => plan.id)
        .filter(Boolean);

      if (planIds.length > 0) {
        const { data: savedSessions, error: sessionsError } = await supabase
          .from("sessions")
          .select("*")
          .in("plan_id", planIds)
          .order("session_date", { ascending: false })
          .limit(30);

        if (sessionsError) {
          console.error("Mobile Coach sessions error:", sessionsError);
        }

        setSessions(savedSessions || []);
      } else {
        setSessions([]);
      }

      const { data: attendanceEvents, error: attendanceError } = await supabase
        .from("club_events")
        .select("*")
        .eq("age_group_id", team.id)
        .neq("status", "cancelled")
        .in("event_type", ["training", "match"])
        .order("starts_at", { ascending: true })
        .limit(100);

      if (attendanceError) {
        console.error("Mobile Coach attendance feed error:", attendanceError);
      }

      setAttendanceSessions(attendanceEvents || []);

      const nowIso = new Date().toISOString();

      const { data: events, error: eventsError } = await supabase
        .from("club_events")
        .select("*")
        .eq("age_group_id", team.id)
        .gte("starts_at", nowIso)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true })
        .limit(8);

      if (eventsError) {
        console.error("Mobile Coach events error:", eventsError);
      }

      setUpcomingEvents(events || []);

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id,name,football_panel,hurling_panel,age_group_id")
        .eq("age_group_id", team.id)
        .order("name");

      if (playersError) {
        console.error("Mobile Coach players error:", playersError);
      }

      setAttendancePlayers(players || []);

      const { data: staffRows, error: staffError } = await supabase
        .from("team_staff")
        .select("id,coach_id,user_id,role,roles,status")
        .eq("age_group_id", team.id)
        .eq("status", "active");

      if (staffError) {
        console.error("Mobile Coach staff roster error:", staffError);
      }

      const coachIds = [
        ...new Set(
          (staffRows || [])
            .map((row) => row.coach_id)
            .filter(Boolean)
        )
      ];

      let coachNameMap = new Map();

      if (coachIds.length > 0) {
        const { data: coachRows, error: coachError } = await supabase
          .from("coaches")
          .select("id,name")
          .in("id", coachIds);

        if (coachError) {
          console.error("Mobile Coach coach lookup error:", coachError);
        }

        coachNameMap = new Map(
          (coachRows || []).map((coach) => [
            String(coach.id),
            coach.name
          ])
        );
      }

      setAttendanceStaff(
        (staffRows || []).map((row) => ({
          ...row,
          name:
            coachNameMap.get(String(row.coach_id)) ||
            row.role ||
            "Coach"
        }))
      );
    } finally {
      setLoadingCoachData(false);
    }
  }

  async function loadAttendanceReminderState(team) {
    if (!team?.id) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setCanManageAttendance(false);
      setAttendanceDueEvents([]);
      return;
    }

    const { data: directStaff, error: directStaffError } =
      await supabase
        .from("team_staff")
        .select("id,attendance_manage")
        .eq("age_group_id", team.id)
        .eq("user_id", user.id)
        .eq("status", "active");

    if (directStaffError) {
      console.error(
        "Mobile Coach attendance permission lookup error:",
        directStaffError
      );
    }

    const { data: coachRows, error: coachRowsError } =
      await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .eq("club_id", team.club_id);

    if (coachRowsError) {
      console.error(
        "Mobile Coach coach permission lookup error:",
        coachRowsError
      );
    }

    const coachIds = (coachRows || [])
      .map((row) => row.id)
      .filter(Boolean);

    let coachStaff = [];

    if (coachIds.length > 0) {
      const { data, error } = await supabase
        .from("team_staff")
        .select("id,attendance_manage")
        .eq("age_group_id", team.id)
        .in("coach_id", coachIds)
        .eq("status", "active");

      if (error) {
        console.error(
          "Mobile Coach coach-staff permission lookup error:",
          error
        );
      } else {
        coachStaff = data || [];
      }
    }

    const permissionRows = [
      ...(directStaff || []),
      ...coachStaff
    ];

    const allowed = permissionRows.some(
      (row) => row.attendance_manage === true
    );

    setCanManageAttendance(allowed);

    if (!allowed) {
      setAttendanceDueEvents([]);
      return;
    }

    const now = new Date();
    const since = new Date(now.getTime() - 18 * 60 * 60 * 1000);

    const { data: dueCandidates, error: dueCandidatesError } =
      await supabase
        .from("club_events")
        .select("*")
        .eq("age_group_id", team.id)
        .neq("status", "cancelled")
        .gte("starts_at", since.toISOString())
        .lte("starts_at", now.toISOString())
        .order("starts_at", { ascending: false });

    if (dueCandidatesError) {
      console.error(
        "Mobile Coach attendance reminder events error:",
        dueCandidatesError
      );
      setAttendanceDueEvents([]);
      return;
    }

    const eventIds = (dueCandidates || [])
      .map((event) => String(event.id))
      .filter(Boolean);

    if (!eventIds.length) {
      setAttendanceDueEvents([]);
      return;
    }

    const { data: submittedSessions, error: submittedSessionsError } =
      await supabase
        .from("club_attendance_sessions")
        .select("id,source_reference,submitted_at")
        .eq("age_group_id", team.id)
        .eq("source", "club_event")
        .in("source_reference", eventIds);

    if (submittedSessionsError) {
      console.error(
        "Mobile Coach attendance reminder submission lookup error:",
        submittedSessionsError
      );
      setAttendanceDueEvents([]);
      return;
    }

    const sessionByEventId = new Map(
      (submittedSessions || []).map((row) => [
        String(row.source_reference),
        row
      ])
    );

    const due = (dueCandidates || [])
      .map((event) => {
        const sessionRow = sessionByEventId.get(String(event.id));

        return {
          ...event,
          attendance_session_id: sessionRow?.id || null,
          submitted_at: sessionRow?.submitted_at || null
        };
      })
      .filter((event) => !event.submitted_at);

    setAttendanceDueEvents(due);
  }

  async function loadStrengthData(team) {
    if (!team?.id) return;
    setStrengthLoading(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const [
        assignmentResult,
        groupResult,
        playerResult
      ] = await Promise.all([
        supabase
          .from("sc_assignments")
          .select("*")
          .eq("age_group_id", team.id)
          .in("status", ["active", "paused", "completed"])
          .order("starts_on", { ascending: false }),
        supabase
          .from("sc_groups")
          .select("*")
          .eq("age_group_id", team.id)
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("players")
          .select("id,name,squad_key")
          .eq("age_group_id", team.id)
          .order("name")
      ]);

      if (assignmentResult.error) {
        console.error(
          "Mobile Coach standalone S&C assignments error:",
          assignmentResult.error
        );
      }

      if (groupResult.error) {
        console.error(
          "Mobile Coach S&C groups error:",
          groupResult.error
        );
      }

      if (playerResult.error) {
        console.error(
          "Mobile Coach standalone S&C players error:",
          playerResult.error
        );
      }

      const assignmentRows = assignmentResult.data || [];
      const groupRows = groupResult.data || [];
      const canonicalPlayers = playerResult.data || [];

      let groupMembershipRows = [];

      if (groupRows.length) {
        const { data, error } = await supabase
          .from("sc_group_members")
          .select("*")
          .in("group_id", groupRows.map((group) => group.id))
          .eq("active", true);

        if (error) {
          console.error(
            "Mobile Coach S&C group memberships error:",
            error
          );
        }

        groupMembershipRows = data || [];
      }

      setStrengthGroups(groupRows);
      setStrengthGroupMemberships(groupMembershipRows);

      setSelectedStrengthGroupId((current) => {
        if (
          current &&
          groupRows.some(
            (group) => String(group.id) === String(current)
          )
        ) {
          return current;
        }

        return groupRows[0]?.id || "";
      });

      const activeAssignments = assignmentRows.filter(
        (assignment) =>
          String(assignment.starts_on || "") <= today &&
          (!assignment.ends_on ||
            String(assignment.ends_on) >= today) &&
          assignment.status === "active"
      );

      const programmeIds = [
        ...new Set(
          activeAssignments
            .map((assignment) => assignment.programme_id)
            .filter(Boolean)
        )
      ];

      let programmes = [];
      let weeks = [];
      let items = [];
      let exercises = [];
      let overrides = [];
      let progressRows = [];
      let feedbackRows = [];

      if (programmeIds.length) {
        const { data, error } = await supabase
          .from("sc_programmes")
          .select("*")
          .in("id", programmeIds);

        if (error) {
          console.error(
            "Mobile Coach standalone S&C programmes error:",
            error
          );
        }
        programmes = data || [];

        const { data: weekRows, error: weekError } = await supabase
          .from("sc_programme_weeks")
          .select("*")
          .in("programme_id", programmeIds)
          .order("week_number", { ascending: true });

        if (weekError) {
          console.error(
            "Mobile Coach standalone S&C weeks error:",
            weekError
          );
        }
        weeks = weekRows || [];

        const currentWeekIds = [];

        activeAssignments.forEach((assignment) => {
          const start = new Date(`${assignment.starts_on}T12:00:00`);
          const now = new Date(`${today}T12:00:00`);
          const elapsedDays = Math.max(
            0,
            Math.floor((now - start) / 86400000)
          );
          const weekNumber = Math.floor(elapsedDays / 7) + 1;

          const programme = programmes.find(
            (row) =>
              String(row.id) ===
              String(assignment.programme_id)
          );

          const boundedWeek = Math.min(
            Math.max(1, weekNumber),
            Number(programme?.duration_weeks || weekNumber || 1)
          );

          const week = weeks.find(
            (row) =>
              String(row.programme_id) ===
                String(assignment.programme_id) &&
              Number(row.week_number) === boundedWeek
          );

          if (week?.id) currentWeekIds.push(week.id);
        });

        if (currentWeekIds.length) {
          const { data: itemRows, error: itemError } =
            await supabase
              .from("sc_programme_items")
              .select("*")
              .in("programme_week_id", [
                ...new Set(currentWeekIds)
              ])
              .order("sort_order", { ascending: true });

          if (itemError) {
            console.error(
              "Mobile Coach standalone S&C items error:",
              itemError
            );
          }
          items = itemRows || [];

          const exerciseIds = [
            ...new Set(
              items
                .map((item) => item.exercise_id)
                .filter(Boolean)
            )
          ];

          if (exerciseIds.length) {
            const { data: exerciseRows, error: exerciseError } =
              await supabase
                .from("sc_exercises")
                .select("*")
                .in("id", exerciseIds);

            if (exerciseError) {
              console.error(
                "Mobile Coach standalone S&C exercises error:",
                exerciseError
              );
            }
            exercises = exerciseRows || [];
          }
        }

        const assignmentIds = activeAssignments
          .map((assignment) => assignment.id)
          .filter(Boolean);

        if (assignmentIds.length) {
          const [overrideResult, progressResult] =
            await Promise.all([
              supabase
                .from("sc_player_overrides")
                .select("*")
                .in("assignment_id", assignmentIds)
                .eq("active", true),
              supabase
                .from("sc_progress")
                .select("*")
                .in("assignment_id", assignmentIds)
                .order("updated_at", { ascending: false })
            ]);

          if (overrideResult.error) {
            console.error(
              "Mobile Coach standalone S&C overrides error:",
              overrideResult.error
            );
          }
          overrides = overrideResult.data || [];

          if (progressResult.error) {
            console.error(
              "Mobile Coach standalone S&C progress error:",
              progressResult.error
            );
          }
          progressRows = progressResult.data || [];

          const progressIds = progressRows
            .map((row) => row.id)
            .filter(Boolean);

          if (progressIds.length) {
            const { data: feedbackData, error: feedbackError } =
              await supabase
                .from("sc_feedback")
                .select("*")
                .in("progress_id", progressIds)
                .order("feedback_at", { ascending: false });

            if (feedbackError) {
              console.error(
                "Mobile Coach standalone S&C feedback error:",
                feedbackError
              );
            }
            feedbackRows = feedbackData || [];
          }
        }
      }

      const programmeMap = new Map(
        programmes.map((row) => [String(row.id), row])
      );
      const exerciseMap = new Map(
        exercises.map((row) => [String(row.id), row])
      );

      const flattened = [];

      activeAssignments.forEach((assignment) => {
        const start = new Date(`${assignment.starts_on}T12:00:00`);
        const now = new Date(`${today}T12:00:00`);
        const elapsedDays = Math.max(
          0,
          Math.floor((now - start) / 86400000)
        );
        const weekNumber = Math.floor(elapsedDays / 7) + 1;

        const programme =
          programmeMap.get(String(assignment.programme_id)) || null;

        const boundedWeek = Math.min(
          Math.max(1, weekNumber),
          Number(programme?.duration_weeks || weekNumber || 1)
        );

        const week =
          weeks.find(
            (row) =>
              String(row.programme_id) ===
                String(assignment.programme_id) &&
              Number(row.week_number) === boundedWeek
          ) || null;

        if (!week) return;

        items
          .filter(
            (item) =>
              String(item.programme_week_id) === String(week.id)
          )
          .forEach((item) => {
            const exercise =
              exerciseMap.get(String(item.exercise_id)) || {};

            flattened.push({
              ...item,
              id: item.id,
              plan_id: programme?.id || assignment.programme_id,
              assignment_id: assignment.id,
              programme_id: assignment.programme_id,
              programme_title:
                programme?.title || "S&C Programme",
              programme_duration_weeks:
                programme?.duration_weeks || null,
              week_number: week.week_number,
              week_title: week.title || null,
              week_focus: week.focus || null,
              starts_at: assignment.starts_on,
              scope: assignment.scope,
              group_id: assignment.group_id || null,
              subgroup_key: assignment.subgroup_key || null,
              assigned_player_id: assignment.player_id || null,
              title: exercise.title || "S&C Activity",
              description:
                item.player_instructions ||
                exercise.description ||
                "",
              activity_type:
                exercise.category || "strength",
              xp_reward: Number(item.xp_reward || 10),
              verification_type:
                item.verification_type ||
                exercise.default_verification_type ||
                "self"
            });
          });
      });

      const firstProgrammeItem = flattened[0] || null;

      setStrengthPlan(
        firstProgrammeItem
          ? {
              id: firstProgrammeItem.programme_id,
              title: firstProgrammeItem.programme_title,
              week_number: firstProgrammeItem.week_number,
              starts_at: firstProgrammeItem.starts_at,
              duration_weeks:
                firstProgrammeItem.programme_duration_weeks,
              standalone: true
            }
          : null
      );

      setStrengthExercises(flattened);
      setStrengthOverrides(overrides);

      setStrengthProgress(
        progressRows.map((row) => ({
          ...row,
          exercise_id: row.programme_item_id,
          completed_at: row.claimed_at || row.updated_at
        }))
      );

      const progressById = new Map(
        progressRows.map((row) => [String(row.id), row])
      );

      setStrengthFeedback(
        feedbackRows.map((row) => ({
          ...row,
          player_id:
            progressById.get(String(row.progress_id))?.player_id ||
            null
        }))
      );

      const nameMap = new Map();
      const squadMap = new Map();

      canonicalPlayers.forEach((player) => {
        nameMap.set(String(player.id), player.name);
        squadMap.set(
          String(player.id),
          player.squad_key || ""
        );
      });

      setStrengthPlayerNames(nameMap);
      setStrengthPlayerSquads(squadMap);

      if (!user?.id) {
        setCanManageStrength(false);
        return;
      }

      const { data: directStaff } = await supabase
        .from("team_staff")
        .select("coach_write")
        .eq("age_group_id", team.id)
        .eq("user_id", user.id)
        .eq("status", "active");

      const { data: coachRows } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .eq("club_id", team.club_id);

      const coachIds = (coachRows || [])
        .map((row) => row.id)
        .filter(Boolean);

      let coachStaff = [];

      if (coachIds.length) {
        const { data } = await supabase
          .from("team_staff")
          .select("coach_write")
          .eq("age_group_id", team.id)
          .in("coach_id", coachIds)
          .eq("status", "active");

        coachStaff = data || [];
      }

      setCanManageStrength(
        [...(directStaff || []), ...coachStaff].some(
          (row) => row.coach_write === true
        )
      );
    } finally {
      setStrengthLoading(false);
    }
  }

  async function addStrengthAssignment() {
    if (!canManageStrength || !coachSelectedTeam?.id || !strengthPlan?.id || !newStrengthTitle.trim()) return;
    setStrengthSaving(true);

    try {
      const currentCount = strengthExercises.filter(
        (item) => String(item.plan_id) === String(strengthPlan.id)
      ).length;

      const { error } = await supabase.from("journey_exercises").insert({
        plan_id: strengthPlan.id,
        age_group_id: coachSelectedTeam.id,
        club_id: coachSelectedTeam.club_id,
        title: newStrengthTitle.trim(),
        description: newStrengthDesc.trim() || null,
        xp_reward: Number(newStrengthXp) || 10,
        sort_order: currentCount,
        activity_type: newStrengthType,
        required: false,
        verification_type: "self"
      });

      if (error) {
        console.error("Mobile Coach S&C add assignment error:", error);
        window.alert("Could not add the S&C assignment.");
        return;
      }

      setNewStrengthTitle("");
      setNewStrengthDesc("");
      setNewStrengthType("exercise");
      setNewStrengthXp("10");
      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function markStrengthChecked(
    assignment,
    playerId,
    decision = "approved"
  ) {
    if (
      !canManageStrength ||
      !assignment?.assignment_id ||
      !assignment?.id ||
      !playerId
    ) {
      return;
    }

    setStrengthSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const now = new Date().toISOString();

      const { data: saved, error } = await supabase
        .from("sc_progress")
        .upsert(
          {
            assignment_id: assignment.assignment_id,
            programme_item_id: assignment.id,
            player_id: playerId,
            status:
              decision === "needs_work"
                ? "needs_work"
                : "approved",
            claimed_at: now,
            reviewed_by: user?.id || null,
            reviewed_at: now,
            updated_at: now
          },
          {
            onConflict:
              "assignment_id,programme_item_id,player_id"
          }
        )
        .select()
        .single();

      if (error) {
        console.error(
          "Mobile Coach standalone S&C pitch-side check error:",
          error
        );
        window.alert("Could not save the S&C check.");
        return;
      }

      if (decision === "needs_work" && saved?.id) {
        await supabase.from("sc_feedback").upsert(
          {
            progress_id: saved.id,
            decision: "needs_work",
            feedback:
              "Checked at training — keep working on this activity.",
            feedback_by: user?.id || null,
            feedback_at: now,
            updated_at: now
          },
          { onConflict: "progress_id" }
        );
      }

      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function markStrengthChecked(
    assignment,
    playerId,
    decision = "approved"
  ) {
    if (
      !canManageStrength ||
      !assignment?.assignment_id ||
      !assignment?.id ||
      !playerId
    ) {
      return;
    }

    setStrengthSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const now = new Date().toISOString();

      const { data: saved, error } = await supabase
        .from("sc_progress")
        .upsert(
          {
            assignment_id: assignment.assignment_id,
            programme_item_id: assignment.id,
            player_id: playerId,
            status:
              decision === "needs_work"
                ? "needs_work"
                : "approved",
            claimed_at: now,
            reviewed_by: user?.id || null,
            reviewed_at: now,
            updated_at: now
          },
          {
            onConflict:
              "assignment_id,programme_item_id,player_id"
          }
        )
        .select()
        .single();

      if (error) {
        console.error(
          "Mobile Coach standalone S&C pitch-side check error:",
          error
        );
        window.alert("Could not save the S&C check.");
        return;
      }

      if (decision === "needs_work" && saved?.id) {
        await supabase.from("sc_feedback").upsert(
          {
            progress_id: saved.id,
            decision: "needs_work",
            feedback:
              "Checked at training — keep working on this activity.",
            feedback_by: user?.id || null,
            feedback_at: now,
            updated_at: now
          },
          { onConflict: "progress_id" }
        );
      }

      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function markStrengthChecked(
    assignment,
    playerId,
    decision = "approved"
  ) {
    if (
      !canManageStrength ||
      !assignment?.assignment_id ||
      !assignment?.id ||
      !playerId
    ) {
      return;
    }

    setStrengthSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const now = new Date().toISOString();

      const { data: saved, error } = await supabase
        .from("sc_progress")
        .upsert(
          {
            assignment_id: assignment.assignment_id,
            programme_item_id: assignment.id,
            player_id: playerId,
            status:
              decision === "needs_work"
                ? "needs_work"
                : "approved",
            claimed_at: now,
            reviewed_by: user?.id || null,
            reviewed_at: now,
            updated_at: now
          },
          {
            onConflict:
              "assignment_id,programme_item_id,player_id"
          }
        )
        .select()
        .single();

      if (error) {
        console.error(
          "Mobile Coach standalone S&C pitch-side check error:",
          error
        );
        window.alert("Could not save the S&C check.");
        return;
      }

      if (decision === "needs_work" && saved?.id) {
        await supabase.from("sc_feedback").upsert(
          {
            progress_id: saved.id,
            decision: "needs_work",
            feedback:
              "Checked at training — keep working on this activity.",
            feedback_by: user?.id || null,
            feedback_at: now,
            updated_at: now
          },
          { onConflict: "progress_id" }
        );
      }

      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function markStrengthGroupChecked(
    assignment,
    playerIds
  ) {
    if (
      !canManageStrength ||
      !assignment?.assignment_id ||
      !assignment?.id ||
      !Array.isArray(playerIds) ||
      playerIds.length === 0
    ) {
      return;
    }

    setStrengthSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const now = new Date().toISOString();

      const rows = playerIds.map((playerId) => ({
        assignment_id: assignment.assignment_id,
        programme_item_id: assignment.id,
        player_id: playerId,
        status: "approved",
        claimed_at: now,
        reviewed_by: user?.id || null,
        reviewed_at: now,
        updated_at: now
      }));

      const { error } = await supabase
        .from("sc_progress")
        .upsert(rows, {
          onConflict:
            "assignment_id,programme_item_id,player_id"
        });

      if (error) {
        console.error(
          "Mobile Coach S&C group check error:",
          error
        );
        window.alert("Could not save the group S&C check.");
        return;
      }

      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function reviewStrengthProgress(progress, decision) {
    if (!canManageStrength || !progress?.id) return;
    setStrengthSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const feedback = String(
        strengthFeedbackDrafts[progress.id] || ""
      ).trim() || null;
      const now = new Date().toISOString();
      const nextStatus =
        decision === "approved" ? "approved" : "needs_work";

      const { error: progressError } = await supabase
        .from("sc_progress")
        .update({
          status: nextStatus,
          reviewed_by: user?.id || null,
          reviewed_at: now,
          updated_at: now
        })
        .eq("id", progress.id);

      if (progressError) {
        console.error(
          "Mobile Coach standalone S&C progress review error:",
          progressError
        );
        window.alert("Could not save the player review.");
        return;
      }

      const { error: feedbackError } = await supabase
        .from("sc_feedback")
        .upsert(
          {
            progress_id: progress.id,
            decision,
            feedback,
            feedback_by: user?.id || null,
            feedback_at: now,
            updated_at: now
          },
          { onConflict: "progress_id" }
        );

      if (feedbackError) {
        console.error(
          "Mobile Coach standalone S&C feedback save error:",
          feedbackError
        );
        window.alert(
          "Review saved, but the feedback note could not be saved."
        );
        return;
      }

      setStrengthFeedbackDrafts((current) => ({
        ...current,
        [progress.id]: ""
      }));

      await loadStrengthData(coachSelectedTeam);
    } finally {
      setStrengthSaving(false);
    }
  }

  async function loadApprovedDrills() {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .order("title");

    if (error) {
      console.error("Mobile Coach drill library error:", error);
      return;
    }

    setDrills(data || []);
  }

  async function openSession(savedSession) {
    setSelectedSession(savedSession);
    setSelectedSessionActivities([]);
    setSessionLoading(true);

    try {
      const { data: rows, error } = await supabase
        .from("session_activities")
        .select("*")
        .eq("session_id", savedSession.id)
        .order("station_number")
        .order("sort_order");

      if (error) {
        console.error("Mobile Coach session activities error:", error);
        return;
      }

      const activityIds = [
        ...new Set(
          (rows || [])
            .map((row) => row.activity_id)
            .filter(Boolean)
        )
      ];

      let activityMap = new Map();

      if (activityIds.length > 0) {
        const { data: activityRows, error: activityError } = await supabase
          .from("activities")
          .select("*")
          .in("id", activityIds);

        if (activityError) {
          console.error("Mobile Coach activity lookup error:", activityError);
        }

        activityMap = new Map(
          (activityRows || []).map((activity) => [
            String(activity.id),
            activity
          ])
        );
      }

      setSelectedSessionActivities(
        (rows || []).map((row) => ({
          ...row,
          activity: activityMap.get(String(row.activity_id)) || null
        }))
      );
    } finally {
      setSessionLoading(false);
    }
  }

  async function openAttendance(eventItem) {
    setAttendanceRecords([]);
    setAttendanceResponses([]);

    let attendanceSession = null;

    const { data: existingSession, error: existingSessionError } =
      await supabase
        .from("club_attendance_sessions")
        .select("*")
        .eq("source", "club_event")
        .eq("source_reference", eventItem.id)
        .maybeSingle();

    if (existingSessionError) {
      console.error(
        "Mobile Coach attendance session lookup error:",
        existingSessionError
      );
    }

    attendanceSession = existingSession || null;

    if (!attendanceSession) {
      const { data: authData } = await supabase.auth.getUser();

      const { data: createdSession, error: createError } = await supabase
        .from("club_attendance_sessions")
        .insert({
          club_id: eventItem.club_id,
          age_group_id: eventItem.age_group_id,
          session_date: String(eventItem.starts_at || "").slice(0, 10),
          title: eventItem.title || (
            eventItem.event_type === "match"
              ? "Match"
              : "Training"
          ),
          source: "club_event",
          source_reference: eventItem.id,
          created_by: authData?.user?.id || null
        })
        .select("*")
        .single();

      if (createError) {
        console.error(
          "Mobile Coach create attendance session error:",
          createError
        );
        return;
      }

      attendanceSession = createdSession;
    }

    const selected = {
      ...eventItem,
      attendance_session_id: attendanceSession.id,
      session_date: attendanceSession.session_date,
      submitted_at: attendanceSession.submitted_at || null,
      submitted_by: attendanceSession.submitted_by || null
    };

    setSelectedAttendance(selected);

    const { data: records, error: recordsError } = await supabase
      .from("team_attendance_records")
      .select("*")
      .eq("attendance_session_id", attendanceSession.id);

    if (recordsError) {
      console.error(
        "Mobile Coach attendance records error:",
        recordsError
      );
    }

    setAttendanceRecords(records || []);

    const { data: responses, error: responsesError } = await supabase
      .from("availability_responses")
      .select("*")
      .eq("event_id", eventItem.id);

    if (responsesError) {
      console.error(
        "Mobile Coach availability responses error:",
        responsesError
      );
    }

    setAttendanceResponses(responses || []);
  }

  async function markAttendance({
    playerId = null,
    teamStaffId = null,
    status
  }) {
    if (!selectedAttendance?.attendance_session_id) return;

    const key = playerId
      ? `player-${playerId}`
      : `staff-${teamStaffId}`;

    setAttendanceSavingKey(key);

    try {
      let query = supabase
        .from("team_attendance_records")
        .select("*")
        .eq(
          "attendance_session_id",
          selectedAttendance.attendance_session_id
        );

      if (playerId) {
        query = query.eq("player_id", playerId);
      } else {
        query = query.eq("team_staff_id", teamStaffId);
      }

      const { data: existing, error: lookupError } =
        await query.maybeSingle();

      if (lookupError) {
        console.error(
          "Mobile Coach attendance lookup error:",
          lookupError
        );
        return;
      }

      let saved = null;

      if (existing) {
        const { data, error } = await supabase
          .from("team_attendance_records")
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) {
          console.error(
            "Mobile Coach attendance update error:",
            error
          );
          return;
        }

        saved = data;
      } else {
        const payload = {
          attendance_session_id:
            selectedAttendance.attendance_session_id,
          status,
          source: "coach_mobile"
        };

        if (playerId) payload.player_id = playerId;
        if (teamStaffId) payload.team_staff_id = teamStaffId;

        const { data, error } = await supabase
          .from("team_attendance_records")
          .insert(payload)
          .select("*")
          .single();

        if (error) {
          console.error(
            "Mobile Coach attendance insert error:",
            error
          );
          return;
        }

        saved = data;
      }

      setAttendanceRecords((current) => {
        const filtered = current.filter(
          (record) => record.id !== saved.id
        );

        return [...filtered, saved];
      });
    } finally {
      setAttendanceSavingKey("");
    }
  }

  async function markAcceptedPresent() {
    const acceptedIds = attendancePlayers
      .filter((player) => {
        const response = attendanceResponseMap.get(String(player.id));

        return [
          "yes",
          "accepted",
          "available",
          "attending"
        ].includes(response);
      })
      .map((player) => player.id);

    for (const playerId of acceptedIds) {
      await markAttendance({
        playerId,
        status: "present"
      });
    }
  }

  async function markAllPresent() {
    for (const player of attendancePlayers) {
      await markAttendance({
        playerId: player.id,
        status: "present"
      });
    }

    for (const staff of attendanceStaff) {
      await markAttendance({
        teamStaffId: staff.id,
        status: "present"
      });
    }
  }

  async function submitAttendance() {
    if (!selectedAttendance?.attendance_session_id) return;

    const unmarkedPlayers = attendancePlayers.filter(
      (player) => !playerAttendanceStatusMap.has(String(player.id))
    );

    const unmarkedStaff = attendanceStaff.filter(
      (staff) => !staffAttendanceStatusMap.has(String(staff.id))
    );

    const unmarkedCount = unmarkedPlayers.length + unmarkedStaff.length;

    const message =
      unmarkedCount > 0
        ? `Submit attendance?\n\n${unmarkedCount} unmarked ${
            unmarkedCount === 1 ? "person will" : "people will"
          } be recorded as absent.`
        : "Submit attendance?";

    if (!window.confirm(message)) return;

    for (const player of unmarkedPlayers) {
      await markAttendance({
        playerId: player.id,
        status: "absent"
      });
    }

    for (const staff of unmarkedStaff) {
      await markAttendance({
        teamStaffId: staff.id,
        status: "absent"
      });
    }

    const { data: freshRecords, error: freshRecordsError } =
      await supabase
        .from("team_attendance_records")
        .select("*")
        .eq(
          "attendance_session_id",
          selectedAttendance.attendance_session_id
        );

    if (freshRecordsError) {
      console.error(
        "Mobile Coach attendance submit verification error:",
        freshRecordsError
      );
      window.alert("Attendance could not be submitted. Please try again.");
      return;
    }

    const recordedPlayerIds = new Set(
      (freshRecords || [])
        .filter((record) => record.player_id)
        .map((record) => String(record.player_id))
    );

    const recordedStaffIds = new Set(
      (freshRecords || [])
        .filter((record) => record.team_staff_id)
        .map((record) => String(record.team_staff_id))
    );

    const missingPlayers = attendancePlayers.filter(
      (player) => !recordedPlayerIds.has(String(player.id))
    );

    const missingStaff = attendanceStaff.filter(
      (staff) => !recordedStaffIds.has(String(staff.id))
    );

    if (missingPlayers.length || missingStaff.length) {
      window.alert(
        "Some attendance records did not save. Please check the list and try again."
      );
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const submittedAt = new Date().toISOString();

    const { error: submitError } = await supabase
      .from("club_attendance_sessions")
      .update({
        submitted_at: submittedAt,
        submitted_by: authData?.user?.id || null,
        updated_at: submittedAt
      })
      .eq("id", selectedAttendance.attendance_session_id);

    if (submitError) {
      console.error("Mobile Coach attendance submit error:", submitError);
      window.alert(
        "Attendance records were saved, but submission could not be completed. Please try again."
      );
      return;
    }

    setAttendanceRecords(freshRecords || []);
    setSelectedAttendance(null);

    if (coachSelectedTeam?.id) {
      await loadMobileCoachData(coachSelectedTeam);
      await loadAttendanceReminderState(coachSelectedTeam);
    }

    window.alert("Attendance submitted.");
  }
  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IE", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function formatDateTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const filteredDrills = drills.filter((drill) => {
    const search = drillSearch.trim().toLowerCase();

    const matchesSearch =
      !search ||
      String(drill.title || "").toLowerCase().includes(search) ||
      String(drill.category || "").toLowerCase().includes(search) ||
      String(drill.description || "").toLowerCase().includes(search);

    const matchesSport =
      drillSport === "all" ||
      String(drill.sport || "").toLowerCase() === drillSport;

    return matchesSearch && matchesSport;
  });

  const playerAttendanceStatusMap = new Map(
    (attendanceRecords || [])
      .filter((record) => record.player_id)
      .map((record) => [
        String(record.player_id),
        record.status
      ])
  );

  const staffAttendanceStatusMap = new Map(
    (attendanceRecords || [])
      .filter((record) => record.team_staff_id)
      .map((record) => [
        String(record.team_staff_id),
        record.status
      ])
  );

  const attendanceResponseMap = new Map(
    (attendanceResponses || []).map((response) => [
      String(response.player_id),
      String(response.response || "").toLowerCase()
    ])
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  const upcomingAttendance = (attendanceSessions || [])
    .filter((item) =>
      String(item.starts_at || "").slice(0, 10) >= todayKey
    )
    .sort((a, b) =>
      String(a.starts_at || "").localeCompare(
        String(b.starts_at || "")
      )
    );

  const pastAttendance = (attendanceSessions || [])
    .filter((item) =>
      String(item.starts_at || "").slice(0, 10) < todayKey
    )
    .sort((a, b) =>
      String(b.starts_at || "").localeCompare(
        String(a.starts_at || "")
      )
    );

  const nextEvent = upcomingEvents?.[0] || null;
  const nextSession =
    (sessions || [])
      .filter((item) => item.session_date)
      .sort((a, b) =>
        String(a.session_date).localeCompare(String(b.session_date))
      )
      .find((item) => {
        const today = new Date().toISOString().slice(0, 10);
        return item.session_date >= today;
      }) ||
    sessions?.[0] ||
    null;

  const cardStyle = {
    background: "#fff",
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 4px 14px rgba(15,23,42,.05)"
  };

  const navItems = [
    ["home", "Home"],
    ["strength", "S&C"],
    ["sessions", "Sessions"],
    ["attendance", "Attendance"],
    ["more", "More"]
  ];

  return (
    <div
      style={{
        paddingBottom:
          tab === "attendance" && selectedAttendance ? 154 : 82
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#4C1D95,#7C3AED)",
          color: "#fff",
          borderRadius: 20,
          padding: 18,
          marginBottom: 14
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            fontWeight: 900,
            opacity: .8
          }}
        >
          Coach
        </div>

        <div
          style={{
            fontFamily: "'League Spartan',sans-serif",
            fontSize: 25,
            fontWeight: 900,
            marginTop: 3
          }}
        >
          {coachSelectedTeam?.label || "Select a team"}
        </div>

        {coachSelectedTeam && (
          <div style={{ fontSize: 11, opacity: .82, marginTop: 3 }}>
            {coachSelectedTeam.gender === "girls" ? "Girls" : "Boys"}
          </div>
        )}
      </div>

      {coachTeams.length > 1 && (
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              color: C.textSecondary,
              marginBottom: 8
            }}
          >
            My teams
          </div>

          <select
            value={coachSelectedTeam?.id || ""}
            onChange={(event) => {
              const team = coachTeams.find(
                (item) => String(item.id) === String(event.target.value)
              );

              if (team) onSelectTeam(team);
            }}
            style={{
              width: "100%",
              padding: "11px 12px",
              borderRadius: 11,
              border: `1px solid ${C.border}`,
              background: "#fff",
              fontWeight: 700,
              color: C.text
            }}
          >
            {coachTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.label}
                {team.gender
                  ? ` ${team.gender === "girls" ? "Girls" : "Boys"}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {!coachSelectedTeam && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 800, color: C.text }}>
            No coaching team selected
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
            Your mobile Coach view only shows teams assigned to you.
          </div>
        </div>
      )}

      {coachSelectedTeam && (
        <>
          {tab === "home" && (
            <div>
              {loadingCoachData && (
                <div style={{ ...cardStyle, marginBottom: 12 }}>
                  Loading Coach data...
                </div>
              )}

              {canManageAttendance && attendanceDueEvents.length > 0 && (
                <button
                  onClick={async () => {
                    const dueEvent = attendanceDueEvents[0];
                    setTab("attendance");
                    await openAttendance(dueEvent);
                  }}
                  style={{
                    width: "100%",
                    border: "1px solid #F59E0B",
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 12,
                    background: "#FFFBEB",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: "#92400E",
                      textTransform: "uppercase",
                      letterSpacing: ".06em"
                    }}
                  >
                    Attendance due now
                  </div>

                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 17,
                      color: C.text,
                      marginTop: 4
                    }}
                  >
                    {attendanceDueEvents[0].title ||
                      (attendanceDueEvents[0].event_type === "match"
                        ? "Match"
                        : "Training")}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: C.textSecondary,
                      marginTop: 3
                    }}
                  >
                    {formatDateTime(attendanceDueEvents[0].starts_at)}
                    {" · Tap to mark attendance"}
                  </div>
                </button>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 14
                }}
              >
                <button
                  onClick={() => setTab("sessions")}
                  style={{
                    ...cardStyle,
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: 10, color: C.textSecondary }}>
                    NEXT SESSION
                  </div>
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 17,
                      color: C.text,
                      marginTop: 5
                    }}
                  >
                    {nextSession
                      ? formatDate(nextSession.session_date)
                      : "No saved session"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textSecondary,
                      marginTop: 4
                    }}
                  >
                    {nextSession?.sport || "Open sessions"}
                  </div>
                </button>

                <button
                  onClick={() => setTab("attendance")}
                  style={{
                    ...cardStyle,
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: 10, color: C.textSecondary }}>
                    ATTENDANCE
                  </div>
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 17,
                      color: C.text,
                      marginTop: 5
                    }}
                  >
                    {attendanceSessions.length}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textSecondary,
                      marginTop: 4
                    }}
                  >
                    Recent sessions
                  </div>
                </button>
              </div>

              {nextEvent && (
                <div style={{ ...cardStyle, marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: C.textSecondary,
                      textTransform: "uppercase"
                    }}
                  >
                    Next up
                  </div>

                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 19,
                      color: C.text,
                      marginTop: 5
                    }}
                  >
                    {nextEvent.title ||
                      nextEvent.opponent ||
                      nextEvent.event_type ||
                      "Team event"}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: C.textSecondary,
                      marginTop: 4
                    }}
                  >
                    {formatDateTime(nextEvent.starts_at)}
                    {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10
                }}
              >
                {[
                  ["sessions", "Sessions", "View saved plans"],
                  ["drills", "Drills", "Full drill library"],
                  ["attendance", "Attendance", "Training & matches"],
                  ["more", "Players", `${attendancePlayers.length} players`],
                  ["strength", "S&C", "Player plans & progress"],
                  ["more", "More", "Matches, tactics & platform"]
                ].map(([target, title, detail]) => (
                  <button
                    key={`${title}-${detail}`}
                    onClick={() => setTab(target)}
                    style={{
                      ...cardStyle,
                      minHeight: 105,
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'League Spartan',sans-serif",
                        fontWeight: 900,
                        fontSize: 16,
                        color: C.text
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.textSecondary,
                        marginTop: 6
                      }}
                    >
                      {detail}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "strength" && (
            <div>
              {(() => {
                const GROUP_STYLE = {
                  white: { bg: "#FFFFFF", border: "#94A3B8", text: "#0F172A" },
                  blue: { bg: "#2563EB", border: "#1D4ED8", text: "#FFFFFF" },
                  green: { bg: "#16A34A", border: "#15803D", text: "#FFFFFF" },
                  orange: { bg: "#EA580C", border: "#C2410C", text: "#FFFFFF" },
                  yellow: { bg: "#FACC15", border: "#EAB308", text: "#422006" }
                };

                const rosterByName = new Map();

                const addRosterPlayer = (
                  id,
                  name,
                  squadKey = ""
                ) => {
                  if (!id || !name) return;

                  const cleanName = String(name).trim();
                  const key = cleanName.toLowerCase();

                  if (!rosterByName.has(key)) {
                    rosterByName.set(key, {
                      id: String(id),
                      name: cleanName,
                      squadKey: squadKey || "",
                      ids: [String(id)]
                    });
                    return;
                  }

                  const existing = rosterByName.get(key);

                  if (!existing.ids.includes(String(id))) {
                    existing.ids.push(String(id));
                  }

                  if (!existing.squadKey && squadKey) {
                    existing.squadKey = squadKey;
                  }
                };

                (attendancePlayers || []).forEach((player) => {
                  addRosterPlayer(
                    player.id,
                    player.name ||
                      player.full_name ||
                      [player.first_name, player.last_name]
                        .filter(Boolean)
                        .join(" "),
                    player.squad_key || ""
                  );
                });

                Array.from(strengthPlayerNames.entries()).forEach(
                  ([id, name]) => {
                    addRosterPlayer(
                      id,
                      name,
                      strengthPlayerSquads.get(String(id)) || ""
                    );
                  }
                );

                const strengthRoster = Array.from(
                  rosterByName.values()
                ).sort((a, b) => a.name.localeCompare(b.name));

                const membershipByPlayer = new Map();

                (strengthGroupMemberships || []).forEach(
                  (membership) => {
                    membershipByPlayer.set(
                      String(membership.player_id),
                      String(membership.group_id)
                    );
                  }
                );

                const effectivePlayerId =
                  strengthRoster.some(
                    (player) =>
                      player.id === selectedStrengthPlayerId
                  )
                    ? selectedStrengthPlayerId
                    : strengthRoster[0]?.id || "";

                const selectedChild =
                  strengthRoster.find(
                    (player) =>
                      player.id === effectivePlayerId
                  ) || null;

                const selectedIds = selectedChild?.ids || [];

                const selectedChildGroupIds = new Set(
                  selectedIds
                    .map((id) =>
                      membershipByPlayer.get(String(id))
                    )
                    .filter(Boolean)
                );

                const assignmentMatchesPlayer = (assignment) => {
                  if (!selectedChild) return false;

                  if (assignment.scope === "team") return true;

                  if (assignment.scope === "player") {
                    return selectedIds.includes(
                      String(assignment.assigned_player_id || "")
                    );
                  }

                  if (assignment.scope === "subgroup") {
                    if (assignment.group_id) {
                      return selectedChildGroupIds.has(
                        String(assignment.group_id)
                      );
                    }

                    return (
                      selectedChild.squadKey &&
                      String(selectedChild.squadKey) ===
                        String(assignment.subgroup_key || "")
                    );
                  }

                  return false;
                };

                const applicableAssignments = (
                  strengthExercises || []
                ).filter(assignmentMatchesPlayer);

                const childProgress = (
                  strengthProgress || []
                ).filter((progress) =>
                  selectedIds.includes(
                    String(progress.player_id)
                  )
                );

                const childFeedback = (
                  strengthFeedback || []
                ).filter((feedback) =>
                  selectedIds.includes(
                    String(feedback.player_id)
                  )
                );

                const progressForPlayerItem = (
                  assignment,
                  playerId
                ) =>
                  (strengthProgress || []).find(
                    (progress) =>
                      String(progress.assignment_id) ===
                        String(assignment.assignment_id) &&
                      String(progress.programme_item_id) ===
                        String(assignment.id) &&
                      String(progress.player_id) ===
                        String(playerId)
                  ) || null;

                const progressForItem = (assignment) =>
                  childProgress.find(
                    (progress) =>
                      String(progress.assignment_id) ===
                        String(assignment.assignment_id) &&
                      String(progress.programme_item_id) ===
                        String(assignment.id)
                  ) || null;

                const overrideForPlayerItem = (
                  assignment,
                  playerIds
                ) =>
                  (strengthOverrides || []).find(
                    (override) =>
                      String(override.assignment_id) ===
                        String(assignment.assignment_id) &&
                      String(override.programme_item_id) ===
                        String(assignment.id) &&
                      playerIds.includes(
                        String(override.player_id)
                      )
                  ) || null;

                const overrideForItem = (assignment) =>
                  overrideForPlayerItem(
                    assignment,
                    selectedIds
                  );

                const targetLabel = (
                  assignment,
                  override = null
                ) => {
                  const sets =
                    override?.sets ?? assignment.sets ?? null;
                  const reps =
                    override?.reps ?? assignment.reps ?? null;
                  const duration =
                    override?.duration_seconds ??
                    assignment.duration_seconds ??
                    null;
                  const distance =
                    override?.distance_m ??
                    assignment.distance_m ??
                    null;
                  const custom =
                    override?.target_text ||
                    assignment.target_text ||
                    "";

                  if (custom) return custom;
                  if (sets && reps) return `${sets} × ${reps}`;
                  if (sets && distance) return `${sets} × ${distance}m`;
                  if (duration) {
                    if (duration >= 60) {
                      const minutes = Math.floor(duration / 60);
                      const seconds = duration % 60;
                      return seconds
                        ? `${minutes}m ${seconds}s`
                        : `${minutes} min`;
                    }
                    return `${duration} sec`;
                  }
                  if (distance) return `${distance}m`;
                  return "Complete as prescribed";
                };

                const selectedIndex = strengthRoster.findIndex(
                  (player) =>
                    player.id === effectivePlayerId
                );

                const effectiveGroupId =
                  strengthGroups.some(
                    (group) =>
                      String(group.id) ===
                      String(selectedStrengthGroupId)
                  )
                    ? selectedStrengthGroupId
                    : strengthGroups[0]?.id || "";

                const selectedGroup =
                  strengthGroups.find(
                    (group) =>
                      String(group.id) ===
                      String(effectiveGroupId)
                  ) || null;

                const selectedGroupStyle =
                  GROUP_STYLE[selectedGroup?.colour_key] ||
                  GROUP_STYLE.white;

                const groupMemberIds = (
                  strengthGroupMemberships || []
                )
                  .filter(
                    (membership) =>
                      String(membership.group_id) ===
                      String(effectiveGroupId) &&
                      membership.active !== false
                  )
                  .map((membership) =>
                    String(membership.player_id)
                  );

                const groupMembers = strengthRoster.filter(
                  (player) =>
                    player.ids.some((id) =>
                      groupMemberIds.includes(String(id))
                    )
                );

                const groupAssignments = (
                  strengthExercises || []
                ).filter((assignment) => {
                  if (assignment.scope === "team") return true;

                  if (
                    assignment.scope === "subgroup" &&
                    assignment.group_id
                  ) {
                    return (
                      String(assignment.group_id) ===
                      String(effectiveGroupId)
                    );
                  }

                  return false;
                });

                const groupProgressForItem = (assignment) =>
                  groupMembers.map((player) => ({
                    player,
                    progress: progressForPlayerItem(
                      assignment,
                      player.id
                    ),
                    override: overrideForPlayerItem(
                      assignment,
                      player.ids
                    )
                  }));

                const statusChip = (progress) => {
                  const status = progress?.status || "todo";

                  if (status === "approved") {
                    return {
                      label: "Complete",
                      bg: "#DCFCE7",
                      color: "#166534"
                    };
                  }

                  if (status === "pending") {
                    return {
                      label: "Waiting",
                      bg: "#EDE9FE",
                      color: "#6D28D9"
                    };
                  }

                  if (status === "needs_work") {
                    return {
                      label: "Needs work",
                      bg: "#FEF3C7",
                      color: "#92400E"
                    };
                  }

                  return {
                    label: "To do",
                    bg: C.surfaceAlt,
                    color: C.textSecondary
                  };
                };

                return (
                  <>
                    <div
                      style={{
                        fontFamily: "'League Spartan',sans-serif",
                        fontWeight: 900,
                        fontSize: 22,
                        color: C.text
                      }}
                    >
                      Strength & Conditioning
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: C.textSecondary,
                        margin: "3px 0 12px"
                      }}
                    >
                      Check S&C by training group or review one
                      player at a time.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 7,
                        marginBottom: 12
                      }}
                    >
                      {[
                        ["groups", "Training Groups"],
                        ["players", "Player View"]
                      ].map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setStrengthViewMode(mode)
                          }
                          style={{
                            border:
                              strengthViewMode === mode
                                ? "2px solid #7C3AED"
                                : `1px solid ${C.border}`,
                            borderRadius: 11,
                            padding: "10px 8px",
                            background:
                              strengthViewMode === mode
                                ? "#F5F3FF"
                                : "#fff",
                            color:
                              strengthViewMode === mode
                                ? "#6D28D9"
                                : C.text,
                            fontWeight: 900
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {strengthLoading && (
                      <div style={{ ...cardStyle, marginBottom: 10 }}>
                        Loading S&C...
                      </div>
                    )}

                    {strengthViewMode === "groups" ? (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(5,minmax(0,1fr))",
                            gap: 5,
                            marginBottom: 12
                          }}
                        >
                          {strengthGroups.map((group) => {
                            const style =
                              GROUP_STYLE[group.colour_key] ||
                              GROUP_STYLE.white;
                            const selected =
                              String(group.id) ===
                              String(effectiveGroupId);

                            return (
                              <button
                                key={group.id}
                                onClick={() =>
                                  setSelectedStrengthGroupId(
                                    group.id
                                  )
                                }
                                style={{
                                  minWidth: 0,
                                  border: selected
                                    ? `3px solid ${style.border}`
                                    : `1px solid ${style.border}`,
                                  borderRadius: 10,
                                  padding: "9px 3px",
                                  background: style.bg,
                                  color: style.text,
                                  fontSize: 8,
                                  fontWeight: 900,
                                  boxShadow: selected
                                    ? "0 3px 10px rgba(15,23,42,.16)"
                                    : "none"
                                }}
                              >
                                {group.name.replace(" Group", "")}
                              </button>
                            );
                          })}
                        </div>

                        {!selectedGroup ? (
                          <div style={cardStyle}>
                            No S&C groups are configured for this team.
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                ...cardStyle,
                                marginBottom: 12,
                                border: `2px solid ${selectedGroupStyle.border}`,
                                background:
                                  selectedGroup.colour_key === "white"
                                    ? "#F8FAFC"
                                    : selectedGroupStyle.bg,
                                color:
                                  selectedGroup.colour_key === "white"
                                    ? C.text
                                    : selectedGroupStyle.text
                              }}
                            >
                              <div
                                style={{
                                  fontFamily:
                                    "'League Spartan',sans-serif",
                                  fontWeight: 900,
                                  fontSize: 18
                                }}
                              >
                                {selectedGroup.name}
                              </div>

                              <div
                                style={{
                                  fontSize: 10,
                                  marginTop: 4,
                                  opacity: .88
                                }}
                              >
                                {groupMembers.length} player
                                {groupMembers.length === 1
                                  ? ""
                                  : "s"}
                                {selectedGroup.focus
                                  ? ` · ${selectedGroup.focus}`
                                  : ""}
                              </div>
                            </div>

                            {groupMembers.length === 0 ? (
                              <div
                                style={{
                                  ...cardStyle,
                                  marginBottom: 10,
                                  color: C.textSecondary
                                }}
                              >
                                No players are assigned to this S&C
                                group yet. Assign them in Coach
                                desktop → S&C or Players.
                              </div>
                            ) : groupAssignments.length === 0 ? (
                              <div
                                style={{
                                  ...cardStyle,
                                  marginBottom: 10,
                                  color: C.textSecondary
                                }}
                              >
                                No active S&C programme applies to
                                this group.
                              </div>
                            ) : (
                              groupAssignments.map((assignment) => {
                                const memberRows =
                                  groupProgressForItem(assignment);
                                const completeRows =
                                  memberRows.filter(
                                    ({ progress }) =>
                                      progress?.status === "approved"
                                  );
                                const incompletePlayerIds =
                                  memberRows
                                    .filter(
                                      ({ progress }) =>
                                        progress?.status !== "approved"
                                    )
                                    .map(({ player }) => player.id);

                                return (
                                  <div
                                    key={`${assignment.assignment_id}-${assignment.id}`}
                                    style={{
                                      ...cardStyle,
                                      marginBottom: 11,
                                      padding: "12px 13px"
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 8,
                                        fontWeight: 900,
                                        color: "#7C3AED",
                                        textTransform: "uppercase"
                                      }}
                                    >
                                      {assignment.programme_title} ·
                                      Week {assignment.week_number}
                                    </div>

                                    <div
                                      style={{
                                        fontFamily:
                                          "'League Spartan',sans-serif",
                                        fontWeight: 900,
                                        fontSize: 16,
                                        color: C.text,
                                        marginTop: 4
                                      }}
                                    >
                                      {assignment.title}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: C.textSecondary,
                                        marginTop: 3
                                      }}
                                    >
                                      {targetLabel(assignment)}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: C.textSecondary,
                                        marginTop: 7
                                      }}
                                    >
                                      {completeRows.length} /{" "}
                                      {groupMembers.length} checked
                                    </div>

                                    <div
                                      style={{
                                        height: 6,
                                        background: "#E2E8F0",
                                        borderRadius: 99,
                                        overflow: "hidden",
                                        marginTop: 5
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${
                                            groupMembers.length
                                              ? Math.round(
                                                  (completeRows.length /
                                                    groupMembers.length) *
                                                    100
                                                )
                                              : 0
                                          }%`,
                                          background: "#16A34A"
                                        }}
                                      />
                                    </div>

                                    <div
                                      style={{
                                        display: "grid",
                                        gap: 6,
                                        marginTop: 10
                                      }}
                                    >
                                      {memberRows.map(
                                        ({
                                          player,
                                          progress,
                                          override
                                        }) => {
                                          const chip =
                                            statusChip(progress);

                                          return (
                                            <div
                                              key={player.id}
                                              style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                  "1fr auto",
                                                gap: 8,
                                                alignItems: "center",
                                                padding: "8px 9px",
                                                borderRadius: 9,
                                                background: "#F8FAFC"
                                              }}
                                            >
                                              <div style={{ minWidth: 0 }}>
                                                <div
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 900,
                                                    color: C.text
                                                  }}
                                                >
                                                  {player.name}
                                                </div>

                                                {override && (
                                                  <div
                                                    style={{
                                                      fontSize: 8,
                                                      color: "#7C3AED",
                                                      marginTop: 2,
                                                      fontWeight: 800
                                                    }}
                                                  >
                                                    Personal target:{" "}
                                                    {targetLabel(
                                                      assignment,
                                                      override
                                                    )}
                                                  </div>
                                                )}
                                              </div>

                                              {progress?.status ===
                                              "approved" ? (
                                                <span
                                                  style={{
                                                    borderRadius: 999,
                                                    padding: "5px 7px",
                                                    background: chip.bg,
                                                    color: chip.color,
                                                    fontSize: 8,
                                                    fontWeight: 900
                                                  }}
                                                >
                                                  ✓ Checked
                                                </span>
                                              ) : (
                                                <button
                                                  onClick={() =>
                                                    markStrengthChecked(
                                                      assignment,
                                                      player.id,
                                                      "approved"
                                                    )
                                                  }
                                                  disabled={strengthSaving}
                                                  style={{
                                                    border: 0,
                                                    borderRadius: 8,
                                                    padding: "7px 8px",
                                                    background: "#7C3AED",
                                                    color: "#fff",
                                                    fontSize: 8,
                                                    fontWeight: 900
                                                  }}
                                                >
                                                  Check
                                                </button>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>

                                    {canManageStrength &&
                                      incompletePlayerIds.length > 0 && (
                                        <button
                                          onClick={() =>
                                            markStrengthGroupChecked(
                                              assignment,
                                              incompletePlayerIds
                                            )
                                          }
                                          disabled={strengthSaving}
                                          style={{
                                            width: "100%",
                                            border: 0,
                                            borderRadius: 10,
                                            padding: "10px",
                                            background:
                                              selectedGroupStyle.bg,
                                            color:
                                              selectedGroupStyle.text,
                                            boxShadow:
                                              selectedGroup.colour_key ===
                                              "white"
                                                ? `inset 0 0 0 2px ${selectedGroupStyle.border}`
                                                : "none",
                                            fontWeight: 900,
                                            marginTop: 10
                                          }}
                                        >
                                          Check All at Training
                                        </button>
                                      )}

                                    {completeRows.length ===
                                      groupMembers.length &&
                                      groupMembers.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 10,
                                            padding: "9px",
                                            borderRadius: 9,
                                            background: "#DCFCE7",
                                            color: "#166534",
                                            textAlign: "center",
                                            fontWeight: 900,
                                            fontSize: 10
                                          }}
                                        >
                                          ✓ Whole group checked
                                        </div>
                                      )}
                                  </div>
                                );
                              })
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            ...cardStyle,
                            marginBottom: 12,
                            border: "1px solid #DDD6FE"
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 900,
                              color: C.textSecondary,
                              textTransform: "uppercase",
                              marginBottom: 6
                            }}
                          >
                            Player
                          </div>

                          {strengthRoster.length === 0 ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textSecondary
                              }}
                            >
                              No players found for this team.
                            </div>
                          ) : (
                            <>
                              <select
                                value={effectivePlayerId}
                                onChange={(event) =>
                                  setSelectedStrengthPlayerId(
                                    event.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "11px 12px",
                                  borderRadius: 10,
                                  border: `1px solid ${C.border}`,
                                  background: "#fff",
                                  fontWeight: 800,
                                  color: C.text
                                }}
                              >
                                {strengthRoster.map((player) => (
                                  <option
                                    key={player.id}
                                    value={player.id}
                                  >
                                    {player.name}
                                  </option>
                                ))}
                              </select>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "1fr auto 1fr",
                                  gap: 8,
                                  alignItems: "center",
                                  marginTop: 9
                                }}
                              >
                                <button
                                  onClick={() => {
                                    const previous =
                                      strengthRoster[
                                        Math.max(
                                          0,
                                          selectedIndex - 1
                                        )
                                      ];
                                    if (previous) {
                                      setSelectedStrengthPlayerId(
                                        previous.id
                                      );
                                    }
                                  }}
                                  disabled={selectedIndex <= 0}
                                  style={{
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 10,
                                    padding: "9px 10px",
                                    background: "#fff",
                                    color: C.text,
                                    fontWeight: 900,
                                    opacity:
                                      selectedIndex <= 0 ? .4 : 1
                                  }}
                                >
                                  ← Previous
                                </button>

                                <div
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 900,
                                    color: C.textSecondary,
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {Math.max(1, selectedIndex + 1)} /{" "}
                                  {strengthRoster.length}
                                </div>

                                <button
                                  onClick={() => {
                                    const next =
                                      strengthRoster[
                                        Math.min(
                                          strengthRoster.length - 1,
                                          selectedIndex + 1
                                        )
                                      ];
                                    if (next) {
                                      setSelectedStrengthPlayerId(
                                        next.id
                                      );
                                    }
                                  }}
                                  disabled={
                                    selectedIndex >=
                                    strengthRoster.length - 1
                                  }
                                  style={{
                                    border: 0,
                                    borderRadius: 10,
                                    padding: "9px 10px",
                                    background: "#7C3AED",
                                    color: "#fff",
                                    fontWeight: 900,
                                    opacity:
                                      selectedIndex >=
                                      strengthRoster.length - 1
                                        ? .4
                                        : 1
                                  }}
                                >
                                  Next →
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div
                          style={{
                            ...cardStyle,
                            marginBottom: 12,
                            background: "#FAF5FF",
                            border: "1px solid #C4B5FD"
                          }}
                        >
                          <div
                            style={{
                              fontFamily:
                                "'League Spartan',sans-serif",
                              fontWeight: 900,
                              fontSize: 17,
                              color: C.text
                            }}
                          >
                            {selectedChild?.name || "Player plan"}
                          </div>

                          <div
                            style={{
                              fontSize: 10,
                              color: C.textSecondary,
                              marginTop: 4
                            }}
                          >
                            {selectedChildGroupIds.size
                              ? `${
                                  strengthGroups.find((group) =>
                                    selectedChildGroupIds.has(
                                      String(group.id)
                                    )
                                  )?.name || "S&C group"
                                }`
                              : "No S&C colour group assigned"}
                          </div>
                        </div>

                        {applicableAssignments.length === 0 ? (
                          <div
                            style={{
                              ...cardStyle,
                              marginBottom: 10,
                              color: C.textSecondary
                            }}
                          >
                            No active S&C programme is assigned to
                            this player.
                          </div>
                        ) : (
                          applicableAssignments.map(
                            (assignment) => {
                              const progress =
                                progressForItem(assignment);
                              const feedback = progress
                                ? strengthFeedback.find(
                                    (item) =>
                                      String(item.progress_id) ===
                                      String(progress.id)
                                  )
                                : null;
                              const override =
                                overrideForItem(assignment);
                              const chip =
                                statusChip(progress);

                              return (
                                <div
                                  key={`${assignment.assignment_id}-${assignment.id}`}
                                  style={{
                                    ...cardStyle,
                                    marginBottom: 9,
                                    padding: "12px 13px"
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 8,
                                      fontWeight: 900,
                                      color: "#7C3AED",
                                      textTransform: "uppercase"
                                    }}
                                  >
                                    {assignment.programme_title} ·
                                    Week {assignment.week_number}
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent:
                                        "space-between",
                                      gap: 10,
                                      alignItems: "flex-start",
                                      marginTop: 4
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{
                                          fontFamily:
                                            "'League Spartan',sans-serif",
                                          fontWeight: 900,
                                          fontSize: 15,
                                          color: C.text
                                        }}
                                      >
                                        {assignment.title}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 10,
                                          color:
                                            C.textSecondary,
                                          marginTop: 3
                                        }}
                                      >
                                        {targetLabel(
                                          assignment,
                                          override
                                        )}
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        borderRadius: 999,
                                        padding: "5px 7px",
                                        background: chip.bg,
                                        color: chip.color,
                                        fontSize: 8,
                                        fontWeight: 900
                                      }}
                                    >
                                      {chip.label}
                                    </span>
                                  </div>

                                  {override && (
                                    <div
                                      style={{
                                        fontSize: 9,
                                        color: "#7C3AED",
                                        fontWeight: 800,
                                        marginTop: 5
                                      }}
                                    >
                                      Individual target
                                    </div>
                                  )}

                                  {feedback?.feedback && (
                                    <div
                                      style={{
                                        background:
                                          C.surfaceAlt,
                                        borderRadius: 8,
                                        padding: "8px 9px",
                                        marginTop: 8,
                                        fontSize: 10,
                                        color: C.text
                                      }}
                                    >
                                      Coach feedback:{" "}
                                      {feedback.feedback}
                                    </div>
                                  )}

                                  {canManageStrength &&
                                    !progress && (
                                      <button
                                        onClick={() =>
                                          markStrengthChecked(
                                            assignment,
                                            effectivePlayerId,
                                            "approved"
                                          )
                                        }
                                        disabled={strengthSaving}
                                        style={{
                                          width: "100%",
                                          border: 0,
                                          borderRadius: 9,
                                          padding: "9px",
                                          background:
                                            "#7C3AED",
                                          color: "#fff",
                                          fontWeight: 900,
                                          marginTop: 9
                                        }}
                                      >
                                        Check at Training
                                      </button>
                                    )}

                                  {canManageStrength &&
                                    progress?.status === "pending" && (
                                      <>
                                        <textarea
                                          value={
                                            strengthFeedbackDrafts[
                                              progress.id
                                            ] || ""
                                          }
                                          onChange={(event) =>
                                            setStrengthFeedbackDrafts(
                                              (current) => ({
                                                ...current,
                                                [progress.id]:
                                                  event.target.value
                                              })
                                            )
                                          }
                                          placeholder="Optional feedback"
                                          rows={2}
                                          style={{
                                            width: "100%",
                                            boxSizing:
                                              "border-box",
                                            border: `1px solid ${C.border}`,
                                            borderRadius: 8,
                                            padding: "8px",
                                            marginTop: 8,
                                            resize: "vertical"
                                          }}
                                        />

                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "1fr 1fr",
                                            gap: 7,
                                            marginTop: 7
                                          }}
                                        >
                                          <button
                                            onClick={() =>
                                              reviewStrengthProgress(
                                                progress,
                                                "needs_work"
                                              )
                                            }
                                            disabled={
                                              strengthSaving
                                            }
                                            style={{
                                              border: 0,
                                              borderRadius: 9,
                                              padding: "8px",
                                              background:
                                                "#FEF3C7",
                                              color: "#92400E",
                                              fontWeight: 900
                                            }}
                                          >
                                            Needs More Work
                                          </button>

                                          <button
                                            onClick={() =>
                                              reviewStrengthProgress(
                                                progress,
                                                "approved"
                                              )
                                            }
                                            disabled={
                                              strengthSaving
                                            }
                                            style={{
                                              border: 0,
                                              borderRadius: 9,
                                              padding: "8px",
                                              background:
                                                "#DCFCE7",
                                              color: "#166534",
                                              fontWeight: 900
                                            }}
                                          >
                                            Approve & Complete
                                          </button>
                                        </div>
                                      </>
                                    )}
                                </div>
                              );
                            }
                          )
                        )}

                        {selectedChild &&
                          childFeedback.length > 0 && (
                            <>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 900,
                                  color: C.textSecondary,
                                  textTransform: "uppercase",
                                  margin: "17px 0 7px"
                                }}
                              >
                                Recent Coach Feedback
                              </div>

                              {childFeedback
                                .slice(0, 5)
                                .map((feedback) => (
                                  <div
                                    key={feedback.id}
                                    style={{
                                      ...cardStyle,
                                      marginBottom: 7,
                                      padding: "10px 12px"
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 900,
                                        color:
                                          feedback.decision ===
                                          "approved"
                                            ? "#166534"
                                            : "#92400E",
                                        textTransform:
                                          "uppercase"
                                      }}
                                    >
                                      {feedback.decision ===
                                      "approved"
                                        ? "Approved"
                                        : "Needs work"}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: C.text,
                                        marginTop: 4
                                      }}
                                    >
                                      {feedback.feedback ||
                                        "No written feedback"}
                                    </div>
                                  </div>
                                ))}
                            </>
                          )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {tab === "sessions" && (
            <div>
              {!selectedSession ? (
                <>
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 20,
                      color: C.text,
                      marginBottom: 10
                    }}
                  >
                    Saved Sessions
                  </div>

                  {sessions.length === 0 ? (
                    <div style={cardStyle}>
                      <div style={{ color: C.textSecondary, fontSize: 12 }}>
                        No saved sessions found for this team.
                      </div>
                    </div>
                  ) : (
                    sessions.map((savedSession) => (
                      <button
                        key={savedSession.id}
                        onClick={() => openSession(savedSession)}
                        style={{
                          ...cardStyle,
                          width: "100%",
                          display: "block",
                          marginBottom: 8,
                          textAlign: "left",
                          cursor: "pointer"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontFamily: "'League Spartan',sans-serif",
                                fontWeight: 900,
                                fontSize: 15,
                                color: C.text
                              }}
                            >
                              {savedSession.sport || "Training"} Session
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: C.textSecondary,
                                marginTop: 3
                              }}
                            >
                              {formatDate(savedSession.session_date)}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#7C3AED"
                            }}
                          >
                            {savedSession.total_duration_mins
                              ? `${savedSession.total_duration_mins} min`
                              : "View"}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      setSelectedSession(null);
                      setSelectedSessionActivities([]);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#7C3AED",
                      fontWeight: 800,
                      marginBottom: 10,
                      cursor: "pointer"
                    }}
                  >
                    ← Sessions
                  </button>

                  <div style={{ ...cardStyle, marginBottom: 12 }}>
                    <div
                      style={{
                        fontFamily: "'League Spartan',sans-serif",
                        fontWeight: 900,
                        fontSize: 20,
                        color: C.text
                      }}
                    >
                      {selectedSession.sport || "Training"} Session
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: C.textSecondary,
                        marginTop: 4
                      }}
                    >
                      {formatDate(selectedSession.session_date)}
                      {selectedSession.total_duration_mins
                        ? ` · ${selectedSession.total_duration_mins} min`
                        : ""}
                    </div>

                    {selectedSession.notes && (
                      <div
                        style={{
                          fontSize: 12,
                          color: C.text,
                          marginTop: 10,
                          lineHeight: 1.45
                        }}
                      >
                        {selectedSession.notes}
                      </div>
                    )}
                  </div>

                  {sessionLoading ? (
                    <div style={cardStyle}>Loading session...</div>
                  ) : selectedSessionActivities.length === 0 ? (
                    <div style={cardStyle}>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>
                        No drills saved in this session.
                      </div>
                    </div>
                  ) : (
                    selectedSessionActivities.map((row, index) => (
                      <div
                        key={row.id}
                        style={{
                          ...cardStyle,
                          marginBottom: 8
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 900,
                            color: "#7C3AED",
                            textTransform: "uppercase"
                          }}
                        >
                          {row.station_number
                            ? `Station ${row.station_number}`
                            : `Activity ${index + 1}`}
                        </div>

                        <div
                          style={{
                            fontFamily: "'League Spartan',sans-serif",
                            fontWeight: 900,
                            fontSize: 15,
                            color: C.text,
                            marginTop: 3
                          }}
                        >
                          {row.activity?.title || "Activity"}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            color: C.textSecondary,
                            marginTop: 4
                          }}
                        >
                          {row.duration_override_mins ||
                          row.activity?.duration_mins
                            ? `${row.duration_override_mins || row.activity?.duration_mins} min`
                            : ""}
                        </div>

                        {row.notes && (
                          <div
                            style={{
                              fontSize: 11,
                              color: C.text,
                              marginTop: 7
                            }}
                          >
                            {row.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "attendance" && (
            <div>
              {!selectedAttendance ? (
                <>
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 20,
                      color: C.text,
                      marginBottom: 10
                    }}
                  >
                    Attendance
                  </div>

                  {attendanceSessions.length === 0 ? (
                    <div style={cardStyle}>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.textSecondary
                        }}
                      >
                        No training sessions or matches found for this team.
                      </div>
                    </div>
                  ) : (
                    <>
                      {upcomingAttendance.length > 0 && (
                        <>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              color: C.textSecondary,
                              textTransform: "uppercase",
                              margin: "12px 0 7px"
                            }}
                          >
                            Upcoming
                          </div>

                          {upcomingAttendance.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => openAttendance(item)}
                              style={{
                                ...cardStyle,
                                width: "100%",
                                display: "block",
                                marginBottom: 8,
                                textAlign: "left",
                                cursor: "pointer"
                              }}
                            >
                              <div
                                style={{
                                  fontFamily:
                                    "'League Spartan',sans-serif",
                                  fontWeight: 900,
                                  fontSize: 15,
                                  color: C.text
                                }}
                              >
                                {item.title ||
                                  (item.event_type === "match"
                                    ? "Match"
                                    : "Training")}
                              </div>

                              <div
                                style={{
                                  fontSize: 10,
                                  color: C.textSecondary,
                                  marginTop: 3
                                }}
                              >
                                {formatDateTime(item.starts_at)}
                                {item.location
                                  ? ` · ${item.location}`
                                  : ""}
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {pastAttendance.length > 0 && (
                        <>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              color: C.textSecondary,
                              textTransform: "uppercase",
                              margin: "16px 0 7px"
                            }}
                          >
                            Past
                          </div>

                          {pastAttendance.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => openAttendance(item)}
                              style={{
                                ...cardStyle,
                                width: "100%",
                                display: "block",
                                marginBottom: 8,
                                textAlign: "left",
                                cursor: "pointer"
                              }}
                            >
                              <div
                                style={{
                                  fontFamily:
                                    "'League Spartan',sans-serif",
                                  fontWeight: 900,
                                  fontSize: 15,
                                  color: C.text
                                }}
                              >
                                {item.title ||
                                  (item.event_type === "match"
                                    ? "Match"
                                    : "Training")}
                              </div>

                              <div
                                style={{
                                  fontSize: 10,
                                  color: C.textSecondary,
                                  marginTop: 3
                                }}
                              >
                                {formatDateTime(item.starts_at)}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedAttendance(null);
                      setAttendanceRecords([]);
                      setAttendanceResponses([]);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#7C3AED",
                      fontWeight: 800,
                      marginBottom: 10,
                      cursor: "pointer"
                    }}
                  >
                    ← Attendance
                  </button>

                  <div
                    style={{
                      ...cardStyle,
                      marginBottom: 12
                    }}
                  >
                    <div
                      style={{
                        fontFamily:
                          "'League Spartan',sans-serif",
                        fontWeight: 900,
                        fontSize: 19,
                        color: C.text
                      }}
                    >
                      {selectedAttendance.title ||
                        (selectedAttendance.event_type === "match"
                          ? "Match"
                          : "Training")}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: C.textSecondary
                      }}
                    >
                      {formatDateTime(
                        selectedAttendance.starts_at
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap: "wrap",
                        marginTop: 12
                      }}
                    >
                      <button
                        onClick={markAcceptedPresent}
                        style={{
                          border: 0,
                          borderRadius: 10,
                          padding: "8px 10px",
                          background: "#DCFCE7",
                          color: "#166534",
                          fontWeight: 800,
                          fontSize: 10,
                          cursor: "pointer"
                        }}
                      >
                        Mark accepted present
                      </button>

                      <button
                        onClick={markAllPresent}
                        style={{
                          border: 0,
                          borderRadius: 10,
                          padding: "8px 10px",
                          background: C.surfaceAlt,
                          color: C.text,
                          fontWeight: 800,
                          fontSize: 10,
                          cursor: "pointer"
                        }}
                      >
                        Mark all present
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: C.textSecondary,
                      textTransform: "uppercase",
                      margin: "14px 0 7px"
                    }}
                  >
                    Players
                  </div>

                  {attendancePlayers.map((player) => {
                    const status =
                      playerAttendanceStatusMap.get(
                        String(player.id)
                      ) || "";

                    const response =
                      attendanceResponseMap.get(
                        String(player.id)
                      ) || "";

                    const accepted = [
                      "yes",
                      "accepted",
                      "available",
                      "attending"
                    ].includes(response);

                    const declined = [
                      "no",
                      "declined",
                      "unavailable"
                    ].includes(response);

                    const saving =
                      attendanceSavingKey ===
                      `player-${player.id}`;

                    return (
                      <div
                        key={player.id}
                        style={{
                          ...cardStyle,
                          padding: "11px 13px",
                          marginBottom: 7,
                          background: accepted
                            ? "#F0FDF4"
                            : declined
                            ? "#FFF7F7"
                            : "#fff"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 8,
                            alignItems: "center"
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              color: C.text,
                              fontSize: 13
                            }}
                          >
                            {player.name}
                          </div>

                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: accepted
                                ? "#15803D"
                                : declined
                                ? "#B91C1C"
                                : C.textSecondary
                            }}
                          >
                            {accepted
                              ? "Accepted"
                              : declined
                              ? "Declined"
                              : "No response"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "1fr 1fr 1fr",
                            gap: 6,
                            marginTop: 9
                          }}
                        >
                          {[
                            ["present", "Present"],
                            ["late", "Late"],
                            ["absent", "Absent"]
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              disabled={saving}
                              onClick={() =>
                                markAttendance({
                                  playerId: player.id,
                                  status: value
                                })
                              }
                              style={{
                                border:
                                  status === value
                                    ? "2px solid #7C3AED"
                                    : `1px solid ${C.border}`,
                                borderRadius: 9,
                                padding: "7px 4px",
                                background:
                                  status === value
                                    ? "#F3E8FF"
                                    : "#fff",
                                color:
                                  status === value
                                    ? "#6D28D9"
                                    : C.textSecondary,
                                fontSize: 9,
                                fontWeight: 800,
                                cursor: "pointer"
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: C.textSecondary,
                      textTransform: "uppercase",
                      margin: "18px 0 7px"
                    }}
                  >
                    Coaches & Mentors
                  </div>

                  {attendanceStaff.map((staff) => {
                    const status =
                      staffAttendanceStatusMap.get(
                        String(staff.id)
                      ) || "";

                    const saving =
                      attendanceSavingKey ===
                      `staff-${staff.id}`;

                    return (
                      <div
                        key={staff.id}
                        style={{
                          ...cardStyle,
                          padding: "11px 13px",
                          marginBottom: 7
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: C.text,
                            fontSize: 13
                          }}
                        >
                          {staff.name}
                        </div>

                        <div
                          style={{
                            fontSize: 9,
                            color: C.textSecondary,
                            marginTop: 2
                          }}
                        >
                          {String(
                            staff.role || "coach"
                          ).replaceAll("_", " ")}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "1fr 1fr 1fr",
                            gap: 6,
                            marginTop: 9
                          }}
                        >
                          {[
                            ["present", "Present"],
                            ["late", "Late"],
                            ["absent", "Absent"]
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              disabled={saving}
                              onClick={() =>
                                markAttendance({
                                  teamStaffId: staff.id,
                                  status: value
                                })
                              }
                              style={{
                                border:
                                  status === value
                                    ? "2px solid #7C3AED"
                                    : `1px solid ${C.border}`,
                                borderRadius: 9,
                                padding: "7px 4px",
                                background:
                                  status === value
                                    ? "#F3E8FF"
                                    : "#fff",
                                color:
                                  status === value
                                    ? "#6D28D9"
                                    : C.textSecondary,
                                fontSize: 9,
                                fontWeight: 800,
                                cursor: "pointer"
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
          {tab === "drills" && (
            <div>
              {selectedDrill ? (
                <>
                  <button
                    onClick={() => setSelectedDrill(null)}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#7C3AED",
                      fontWeight: 800,
                      marginBottom: 10,
                      cursor: "pointer"
                    }}
                  >
                    ← Drill Library
                  </button>

                  <div style={cardStyle}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        color: "#7C3AED",
                        textTransform: "uppercase"
                      }}
                    >
                      {selectedDrill.sport || "Drill"}
                    </div>

                    <div
                      style={{
                        fontFamily: "'League Spartan',sans-serif",
                        fontWeight: 900,
                        fontSize: 21,
                        color: C.text,
                        marginTop: 4
                      }}
                    >
                      {selectedDrill.title}
                    </div>

                    {selectedDrill.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: C.text,
                          lineHeight: 1.5,
                          marginTop: 12
                        }}
                      >
                        {selectedDrill.description}
                      </div>
                    )}

                    {selectedDrill.coaching_points && (
                      <div style={{ marginTop: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: C.textSecondary,
                            textTransform: "uppercase",
                            marginBottom: 5
                          }}
                        >
                          Coaching points
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.5
                          }}
                        >
                          {selectedDrill.coaching_points}
                        </div>
                      </div>
                    )}

                    {selectedDrill.setup && (
                      <div style={{ marginTop: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: C.textSecondary,
                            textTransform: "uppercase",
                            marginBottom: 5
                          }}
                        >
                          Setup
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.5
                          }}
                        >
                          {selectedDrill.setup}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 14
                      }}
                    >
                      {selectedDrill.duration_mins && (
                        <span
                          style={{
                            background: C.surfaceAlt,
                            borderRadius: 99,
                            padding: "5px 8px",
                            fontSize: 9,
                            fontWeight: 800
                          }}
                        >
                          {selectedDrill.duration_mins} min
                        </span>
                      )}

                      {selectedDrill.difficulty && (
                        <span
                          style={{
                            background: C.surfaceAlt,
                            borderRadius: 99,
                            padding: "5px 8px",
                            fontSize: 9,
                            fontWeight: 800
                          }}
                        >
                          {selectedDrill.difficulty}
                        </span>
                      )}

                      {selectedDrill.format && (
                        <span
                          style={{
                            background: C.surfaceAlt,
                            borderRadius: 99,
                            padding: "5px 8px",
                            fontSize: 9,
                            fontWeight: 800
                          }}
                        >
                          {selectedDrill.format}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 20,
                      color: C.text,
                      marginBottom: 10
                    }}
                  >
                    Drill Library
                  </div>

                  <input
                    value={drillSearch}
                    onChange={(event) =>
                      setDrillSearch(event.target.value)
                    }
                    placeholder="Search drills..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 12px",
                      borderRadius: 11,
                      border: `1px solid ${C.border}`,
                      marginBottom: 8
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      marginBottom: 12
                    }}
                  >
                    {[
                      ["all", "All"],
                      ["football", "Football"],
                      ["hurling", "Hurling"],
                      ["camogie", "Camogie"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setDrillSport(value)}
                        style={{
                          flex: 1,
                          border: `1px solid ${C.border}`,
                          borderRadius: 9,
                          padding: "7px 4px",
                          background:
                            drillSport === value
                              ? "#7C3AED"
                              : "#fff",
                          color:
                            drillSport === value
                              ? "#fff"
                              : C.text,
                          fontSize: 9,
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: C.textSecondary,
                      marginBottom: 8
                    }}
                  >
                    {filteredDrills.length} approved drills
                  </div>

                  {filteredDrills.map((drill) => (
                    <button
                      key={drill.id}
                      onClick={() => setSelectedDrill(drill)}
                      style={{
                        ...cardStyle,
                        width: "100%",
                        display: "block",
                        marginBottom: 7,
                        textAlign: "left",
                        cursor: "pointer"
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'League Spartan',sans-serif",
                          fontWeight: 900,
                          fontSize: 14,
                          color: C.text
                        }}
                      >
                        {drill.title}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: C.textSecondary,
                          marginTop: 3,
                          textTransform: "capitalize"
                        }}
                      >
                        {[drill.sport, drill.category, drill.difficulty]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "more" && (
            <div>
              <div
                style={{
                  fontFamily: "'League Spartan',sans-serif",
                  fontWeight: 900,
                  fontSize: 20,
                  color: C.text,
                  marginBottom: 10
                }}
              >
                More
              </div>

              {[
                ["Players", `${attendancePlayers.length} players`],
                ["Strength & Conditioning", "Assignments and player feedback"],
                ["Matches", "Fixtures, availability and match day"],
                ["Tactics", "Saved tactics boards"],
                ["Full Coach Platform", "Planning and administration"]
              ].map(([title, detail]) => (
                <div
                  key={title}
                  style={{
                    ...cardStyle,
                    marginBottom: 8
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'League Spartan',sans-serif",
                      fontWeight: 900,
                      fontSize: 15,
                      color: C.text
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: C.textSecondary,
                      marginTop: 4
                    }}
                  >
                    {detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "attendance" && selectedAttendance && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(62px + env(safe-area-inset-bottom))",
            width: "calc(100% - 28px)",
            maxWidth: 432,
            zIndex: 65
          }}
        >
          <button
            onClick={submitAttendance}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 14,
              padding: "13px 16px",
              background: "#7C3AED",
              color: "#fff",
              fontFamily: "'League Spartan',sans-serif",
              fontWeight: 900,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(124,58,237,.28)"
            }}
          >
            {selectedAttendance.submitted_at
              ? "Resubmit Attendance"
              : "Submit Attendance"}
          </button>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderTop: `1px solid ${C.border}`,
          padding: "7px 7px calc(7px + env(safe-area-inset-bottom))",
          display: "flex",
          gap: 3,
          zIndex: 60,
          boxShadow: "0 -8px 24px rgba(15,23,42,.08)"
        }}
      >
        {navItems.map(([key, label]) => {
          const active = tab === key;

          return (
            <button
              key={key}
              onClick={() => {
                setSelectedSession(null);
                setSelectedAttendance(null);
                setSelectedDrill(null);
                setTab(key);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                borderRadius: 10,
                background: active ? "#F3E8FF" : "transparent",
                color: active ? "#7C3AED" : C.textSecondary,
                padding: "8px 2px",
                fontSize: 9,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-block"
                }}
              >
                {label}
                {key === "attendance" &&
                  canManageAttendance &&
                  attendanceDueEvents.length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -7,
                        right: -10,
                        minWidth: 16,
                        height: 16,
                        padding: "0 4px",
                        borderRadius: 999,
                        background: "#DC2626",
                        color: "#fff",
                        fontSize: 9,
                        lineHeight: "16px",
                        textAlign: "center",
                        fontWeight: 900
                      }}
                    >
                      {attendanceDueEvents.length}
                    </span>
                  )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [parentGuardianConfirmed, setParentGuardianConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [legalPolicyKey, setLegalPolicyKey] = useState(null);
  const [signupMessage, setSignupMessage] = useState("");
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [club, setClub] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bonusTasks, setBonusTasks] = useState([]);
  const [trainingDrills, setTrainingDrills] = useState([]); // drills from coach's sessions this week
  const [fitnessExercises, setFitnessExercises] = useState([]); // runs, star jumps etc set by coach
  const [playerStrengthAssignments, setPlayerStrengthAssignments] = useState([]);
  const [playerStrengthProgress, setPlayerStrengthProgress] = useState([]);
  const [playerStrengthFeedback, setPlayerStrengthFeedback] = useState([]);
  const [playerStrengthProgramme, setPlayerStrengthProgramme] = useState(null);
  const [playerStrengthLoading, setPlayerStrengthLoading] = useState(false);
  const [playerStrengthSaving, setPlayerStrengthSaving] = useState(false);
  const [weekSkills, setWeekSkills] = useState([]); // unique skills from this week's drills
  const [progress, setProgress] = useState([]);
  const [badges, setBadges] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [screen, setScreen] = useState("home");
  const [activeContext, setActiveContext] = useState(() => {
    if (typeof window === "undefined") return "player";
    return localStorage.getItem("spraoi_active_context") || "player";
  });
  const [parentModeUnlocked, setParentModeUnlocked] = useState(false);
  const [parentPin, setParentPin] = useState("");
  const [showParentGate, setShowParentGate] = useState(false);
  const [parentGateTarget, setParentGateTarget] = useState("parent-home");
  const [parentPinError, setParentPinError] = useState("");
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [newParentPin, setNewParentPin] = useState("");
  const [confirmParentPinValue, setConfirmParentPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const parentNotifications = useParentNotifications(session?.user?.id);
  const [showXpPop, setShowXpPop] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [showChildSwitch, setShowChildSwitch] = useState(false);
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isAdminUrl = urlParams.get("admin") === "true";
  const inviteTeamId = urlParams.get("team") || "";
  const [userRole, setUserRole] = useState(isAdminUrl ? { role: "super_admin" } : null); // coach/admin role if any
  const [coachTeams, setCoachTeams] = useState([]); // teams this coach manages
  const [coachSelectedTeam, setCoachSelectedTeam] = useState(null);
  const [coachExercises, setCoachExercises] = useState([]);
  const [coachPlan, setCoachPlan] = useState(null);
  const [events, setEvents] = useState([]); // opt-in events (friday night hurling etc)
  const [eventSignups, setEventSignups] = useState([]); // current player's signups
  const [coachEvents, setCoachEvents] = useState([]); // events for coach management
  const coachRoleNames = [
    "super_admin",
    "club_admin",
    "team_admin",
    "lead_coach",
    "coach",
    "mentor",
    "coach_mentor"
  ];

  const normalizedUserRole =
    String(userRole?.role || "").toLowerCase();

  const hasCoachAccess =
    isAdminUrl ||
    coachTeams.length > 0 ||
    coachRoleNames.includes(normalizedUserRole);

  function switchAppContext(context) {
    const nextContext =
      context === "coach" ? "coach" : "player";

    setActiveContext(nextContext);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "spraoi_active_context",
        nextContext
      );
    }

    if (nextContext === "coach") {
      setScreen("coach");

      if (!coachSelectedTeam && coachTeams.length > 0) {
        loadCoachPlan(coachTeams[0]);
      }

      return;
    }

    setScreen("home");
  }
  const [allSkills, setAllSkills] = useState([]); // full skill library for Learn tab
  const [learnFilter, setLearnFilter] = useState("all"); // all | hurling | football

  useEffect(() => {
    if (
      activeContext === "coach" &&
      hasCoachAccess &&
      screen !== "coach"
    ) {
      setScreen("coach");

      if (!coachSelectedTeam && coachTeams.length > 0) {
        loadCoachPlan(coachTeams[0]);
      }
    }
  }, [
    activeContext,
    hasCoachAccess,
    coachTeams,
    coachSelectedTeam,
    screen
  ]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadParentData(s.user.id, s.user.email);
      else setInitialLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setInitialLoading(false);
        return;
      }

      if (s) {
        await loadParentData(s.user.id, s.user.email);

        try {
          const pendingRaw = localStorage.getItem("spraoi_pending_parent_consent");
          const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

          if (
            pending?.parentGuardianConfirmation &&
            (!pending.userId || String(pending.userId) === String(s.user.id))
          ) {
            const { data: clubRow } = await supabase
              .from("clubs")
              .select("id")
              .eq("slug", "fingallians")
              .maybeSingle();

            const { error: acceptanceError } = await recordParentPolicyAcceptances(
              s.user.id,
              clubRow?.id || null
            );

            if (acceptanceError) {
              console.error("Pending policy acceptance failed:", acceptanceError);
            } else {
              localStorage.removeItem("spraoi_pending_parent_consent");
            }
          }
        } catch (consentError) {
          console.error("Pending parent consent processing failed:", consentError);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadLinkedPlayers(userId, clubId = null) {
    if (!userId) return [];

    const { data: links, error: linkError } = await supabase
      .from("player_guardians")
      .select("player_id")
      .eq("guardian_user_id", userId);

    if (linkError) {
      console.error("player_guardians lookup failed:", linkError);
      return [];
    }

    const playerIds = [
      ...new Set(
        (links || [])
          .map((link) => link.player_id)
          .filter(Boolean)
      )
    ];

    if (!playerIds.length) {
      console.warn("No player_guardians links found for:", userId);
      return [];
    }

    let query = supabase
      .from("players")
      .select("*")
      .in("id", playerIds)
      .order("name");

    if (clubId) {
      query = query.eq("club_id", clubId);
    }

    const { data: linkedPlayers, error: playerError } = await query;

    if (playerError) {
      console.error("players lookup failed:", playerError);
      return [];
    }

    const playerRows = linkedPlayers || [];

    const ageGroupIds = [
      ...new Set(
        playerRows
          .map((player) => player.age_group_id)
          .filter(Boolean)
      )
    ];

    let ageGroupMap = {};

    if (ageGroupIds.length > 0) {
      const { data: ageGroupRows, error: ageGroupError } =
        await supabase
          .from("age_groups")
          .select("id,label,gender")
          .in("id", ageGroupIds);

      if (ageGroupError) {
        console.warn("age_groups lookup failed:", ageGroupError);
      } else {
        ageGroupMap = Object.fromEntries(
          (ageGroupRows || []).map((row) => [row.id, row])
        );
      }
    }

    return playerRows.map((player) => ({
      ...player,
      age_group: ageGroupMap[player.age_group_id] || null,
    }));
  }

  async function loadParentData(userId, userEmail = "") {
    const { data: clubData } = await supabase.from("clubs").select("*").eq("slug", "fingallians").single();
    setClub(clubData);
    if (clubData) { const { data: ag } = await supabase.from("age_groups").select("*").eq("club_id", clubData.id).order("label"); setAgeGroups(ag || []); if (isAdminUrl) setCoachTeams(ag || []); }
    // Resolve Coach access from the canonical platform model:
    // auth user -> coaches.user_id -> team_staff.
    //
    // user_roles is retained only for club/super-admin fallback.
    setUserRole(null);
    if (!isAdminUrl) {
      setCoachTeams([]);
    }

    const normalizedEmail =
      String(userEmail || "")
        .trim()
        .toLowerCase();

    let legacyAdminRole = null;

    if (normalizedEmail) {
      const {
        data: legacyRoleRows,
        error: legacyRoleError
      } = await supabase
        .from("user_roles")
        .select("*")
        .ilike("user_email", normalizedEmail);

      if (legacyRoleError) {
        console.log(
          "Legacy admin role lookup error:",
          legacyRoleError.message
        );
      }

      legacyAdminRole =
        (legacyRoleRows || []).find((row) =>
          ["super_admin", "club_admin"].includes(
            String(row.role || "").toLowerCase()
          )
        ) || null;
    }

    const {
      data: coachRows,
      error: coachLookupError
    } = await supabase
      .from("coaches")
      .select(
        "id,user_id,club_id,name,role,email,age_group_id"
      )
      .eq("user_id", userId)
      .eq("club_id", clubData.id);

    if (coachLookupError) {
      console.log(
        "Coach lookup error:",
        coachLookupError.message
      );
    }

    const coachIds = [
      ...new Set(
        (coachRows || [])
          .map((coach) => coach.id)
          .filter(Boolean)
      )
    ];

    const {
      data: staffByUser,
      error: staffUserError
    } = await supabase
      .from("team_staff")
      .select(
        "id,club_id,age_group_id,coach_id,user_id,role,roles,status,coach_write,attendance_manage"
      )
      .eq("club_id", clubData.id)
      .eq("user_id", userId)
      .eq("status", "active");

    if (staffUserError) {
      console.log(
        "Team staff user lookup error:",
        staffUserError.message
      );
    }

    let staffByCoach = [];

    if (coachIds.length > 0) {
      const {
        data,
        error
      } = await supabase
        .from("team_staff")
        .select(
          "id,club_id,age_group_id,coach_id,user_id,role,roles,status,coach_write,attendance_manage"
        )
        .eq("club_id", clubData.id)
        .in("coach_id", coachIds)
        .eq("status", "active");

      if (error) {
        console.log(
          "Team staff coach lookup error:",
          error.message
        );
      }

      staffByCoach = data || [];
    }

    const membershipMap = new Map();

    [
      ...(staffByUser || []),
      ...(staffByCoach || [])
    ].forEach((membership) => {
      if (membership?.id) {
        membershipMap.set(
          String(membership.id),
          membership
        );
      }
    });

    const memberships = [
      ...membershipMap.values()
    ];

    const membershipRoles = memberships.flatMap(
      (membership) => {
        const roles = Array.isArray(membership.roles)
          ? membership.roles
          : [];

        return [
          ...roles,
          membership.role
        ]
          .filter(Boolean)
          .map((role) =>
            String(role).toLowerCase()
          );
      }
    );

    const preferredRoleOrder = [
      "lead_coach",
      "team_admin",
      "coach",
      "mentor",
      "coach_mentor"
    ];

    const staffRole =
      preferredRoleOrder.find((role) =>
        membershipRoles.includes(role)
      ) ||
      membershipRoles[0] ||
      String(
        coachRows?.[0]?.role || ""
      ).toLowerCase() ||
      null;

    const resolvedRole =
      legacyAdminRole?.role ||
      staffRole ||
      null;

    if (resolvedRole) {
      setUserRole({
        ...(legacyAdminRole || {}),
        role: resolvedRole,
        memberships,
        coach_ids: coachIds
      });

      if (
        isAdminUrl &&
        ["super_admin", "club_admin"].includes(
          String(resolvedRole).toLowerCase()
        )
      ) {
        const { data: allTeams } =
          await supabase
            .from("age_groups")
            .select("*")
            .eq("club_id", clubData.id)
            .eq("active", true)
            .order("label");

        setCoachTeams(allTeams || []);
      } else {
        const membershipTeamIds =
          memberships
            .map(
              (membership) =>
                membership.age_group_id
            )
            .filter(Boolean);

        // Temporary fallback for older coach records that
        // have not yet been migrated to team_staff.
        const legacyCoachTeamIds =
          (coachRows || [])
            .map(
              (coach) =>
                coach.age_group_id
            )
            .filter(Boolean);

        const teamIds = [
          ...new Set([
            ...membershipTeamIds,
            ...legacyCoachTeamIds
          ])
        ];

        if (teamIds.length > 0) {
          const { data: teams } =
            await supabase
              .from("age_groups")
              .select("*")
              .eq("club_id", clubData.id)
              .in("id", teamIds)
              .order("label");

          setCoachTeams(teams || []);
        } else {
          setCoachTeams([]);
        }
      }
    }
    const kids = await loadLinkedPlayers(userId, clubData?.id || null);
    setPlayers(kids || []);
    if ((!kids || kids.length === 0) && resolvedRole) {
      setActiveContext("coach");
      setScreen("coach");

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "spraoi_active_context",
          "coach"
        );
      }
    }
    const { data: b } = await supabase.from("badges").select("*"); setBadges(b || []);
    // Load the skill library for the Learn tab. Weekly Academy content no longer uses the challenges table.
    const { data: sk } = await supabase.from("skills").select("*").order("sport, name"); setAllSkills(sk || []);
    if (kids && kids.length === 1) selectPlayer(kids[0]);
    else if (kids && kids.length > 0) selectPlayer(kids[0]);
    setInitialLoading(false);
  }

  async function selectPlayer(player, requestedWeekOffset = weekOffset) {
    setSelectedPlayer(player);
    setLoadingPlayers(false);
    try {
      const { data: prog } = await supabase.from("player_progress").select("*").eq("player_id", player.id);
      setProgress(prog || []);
      const { data: eb } = await supabase.from("player_badges").select("*").eq("player_id", player.id);
      setEarnedBadges(eb || []);
      if (player.age_group_id) {
        const weekStart = weekKeyFromOffset(Math.min(0, requestedWeekOffset));
        const endDate = new Date(`${weekStart}T12:00:00`); endDate.setDate(endDate.getDate()+7);
        const weekEnd = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,"0")}-${String(endDate.getDate()).padStart(2,"0")}`;
        const { data: plans } = await supabase.from("weekly_plans").select("*").eq("age_group_id", player.age_group_id).eq("published", true).gte("starts_at", weekStart).lt("starts_at", weekEnd).order("starts_at", { ascending: false }).limit(1);
        const plan = plans && plans.length > 0 ? plans[0] : null;
        setWeeklyPlan(plan);
        if (plan) {
          const { data: weekProg } = await supabase.from("player_progress").select("*").eq("player_id", player.id).eq("plan_id", plan.id);
          setProgress(weekProg || []);
          // Academy Admin can explicitly choose which Coach-session skill is featured for each code.
          // There is intentionally no Challenge/Homework lookup in the child weekly flow.
          const academySelections = plan.academy_video_overrides || {};
          const selectedSkillPairs = [
            ["football", academySelections.football],
            ["hurling", academySelections.hurling],
          ].filter(([, id]) => Boolean(id));
          let selectedSkills = [];
          if (selectedSkillPairs.length) {
            const selectedIds = [...new Set(selectedSkillPairs.map(([, id]) => id))];
            const { data: chosenSkills } = await supabase.from("skills").select("*").in("id", selectedIds);
            const byId = Object.fromEntries((chosenSkills || []).map((skill) => [skill.id, skill]));
            selectedSkills = selectedSkillPairs.map(([type, id]) => byId[id] ? { ...byId[id], academyType: type } : null).filter(Boolean);
          }
          // Load training drills from coach's sessions for this plan
          const { data: sessions } = await supabase.from("sessions").select("id, notes, session_date, session_activities(*, activity:activities(id, title, description, coaching_points, setup, equipment, sport, category, difficulty, duration_mins, skill_id, skill:skills!activities_skill_id_fkey(id, name, sport, category, video_url)))").eq("plan_id", plan.id);
          const drills = [];
          const skillMap = {};
          (sessions || []).forEach((s) => {
            (s.session_activities || []).sort((a, b) => a.sort_order - b.sort_order).forEach((sa) => {
              if (sa.activity) {
                drills.push({ ...sa.activity, sessionDate: s.session_date });
                if (sa.activity.skill) skillMap[sa.activity.skill.id] = sa.activity.skill;
              }
            });
          });
          setTrainingDrills(drills);
          const skillIds = Object.keys(skillMap);
          // Exact Academy selections win; otherwise use the skills attached to Coach-session drills.
          const selectedSkillList = selectedSkills.map(({ academyType, ...skill }) => skill);
          setWeekSkills(selectedSkillList.length ? selectedSkillList : Object.values(skillMap));
          // Only use a library fallback when there is genuinely no Academy selection and no Coach drill skill.
          if (selectedSkillList.length === 0 && skillIds.length === 0) {
            const { data: fallbackSkills } = await supabase.from("skills").select("*").not("video_url", "is", null).order("name");
            const fb = [];
            const hurling = (fallbackSkills || []).find((s) => s.sport === "hurling");
            const football = (fallbackSkills || []).find((s) => s.sport === "football");
            if (hurling) fb.push(hurling);
            if (football) fb.push(football);
            setWeekSkills(fb);
          }
          // Load fitness exercises for this plan
          const { data: exercises } = await supabase.from("journey_exercises").select("*").eq("plan_id", plan.id).order("sort_order");
          setFitnessExercises(exercises || []);
        } else { setProgress([]); setBonusTasks([]); setTrainingDrills([]); setWeekSkills([]); setFitnessExercises([]); }
        // Weekly Academy activities are sourced from journey_exercises for this plan.
        // Legacy journey_events are intentionally not shown in the weekly child Home flow.
        setEvents([]);
        setEventSignups([]);
      }
    } catch (e) { console.error("selectPlayer:", e); }
  }

  useEffect(() => {
    if (selectedPlayer?.id) selectPlayer(selectedPlayer, weekOffset);
  }, [weekOffset]);

  useEffect(() => {
    if (selectedPlayer?.id) {
      loadPlayerStrengthData(selectedPlayer);
    } else {
      setPlayerStrengthAssignments([]);
      setPlayerStrengthProgress([]);
      setPlayerStrengthFeedback([]);
      setPlayerStrengthProgramme(null);
    }
  }, [selectedPlayer?.id]);

  const legalPolicy = LEGAL_POLICIES.find((policy) => policy.key === legalPolicyKey) || null;

  async function recordParentPolicyAcceptances(userId, clubId = null) {
    if (!userId) return { error: new Error("No authenticated user available for policy acceptance.") };

    const requiredPolicies = ["terms", "parent_guardian", "privacy"]
      .map((key) => LEGAL_POLICIES.find((policy) => policy.key === key))
      .filter(Boolean);

    const rows = requiredPolicies.map((policy) => ({
      club_id: clubId || null,
      user_id: userId,
      child_id: null,
      policy_key: policy.key,
      policy_version: policy.version || LEGAL_POLICY_VERSION,
      actor_type: "parent_guardian",
      parent_guardian_confirmation: true,
    }));

    if (!rows.length) {
      return { error: new Error("Required legal policies could not be loaded.") };
    }

    const { error } = await supabase
      .from("spraoi_policy_acceptances")
      .insert(rows);

    return { error };
  }

  async function loadPlayerStrengthData(player) {
    if (!player?.id || !player?.age_group_id) {
      setPlayerStrengthAssignments([]);
      setPlayerStrengthProgress([]);
      setPlayerStrengthFeedback([]);
      setPlayerStrengthProgramme(null);
      return;
    }

    setPlayerStrengthLoading(true);

    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: assignmentRows, error: assignmentError } =
        await supabase
          .from("sc_assignments")
          .select("*")
          .eq("age_group_id", player.age_group_id)
          .eq("status", "active")
          .lte("starts_on", today)
          .or(`ends_on.is.null,ends_on.gte.${today}`)
          .order("starts_on", { ascending: false });

      if (assignmentError) {
        console.error(
          "Player standalone S&C assignments error:",
          assignmentError
        );
        setPlayerStrengthAssignments([]);
        setPlayerStrengthProgramme(null);
        return;
      }

      const { data: playerGroupMemberships, error: groupMembershipError } =
        await supabase
          .from("sc_group_members")
          .select("group_id")
          .eq("player_id", player.id)
          .eq("active", true);

      if (groupMembershipError) {
        console.error(
          "Player standalone S&C group membership error:",
          groupMembershipError
        );
      }

      const playerGroupIds = new Set(
        (playerGroupMemberships || []).map((row) =>
          String(row.group_id)
        )
      );

      const applicable = (assignmentRows || []).filter(
        (assignment) => {
          if (assignment.scope === "team") return true;

          if (assignment.scope === "player") {
            return (
              String(assignment.player_id || "") ===
              String(player.id)
            );
          }

          if (assignment.scope === "subgroup") {
            if (assignment.group_id) {
              return playerGroupIds.has(
                String(assignment.group_id)
              );
            }

            return (
              player.squad_key &&
              String(player.squad_key) ===
                String(assignment.subgroup_key || "")
            );
          }

          return false;
        }
      );

      if (!applicable.length) {
        setPlayerStrengthAssignments([]);
        setPlayerStrengthProgress([]);
        setPlayerStrengthFeedback([]);
        setPlayerStrengthProgramme(null);
        return;
      }

      const programmeIds = [
        ...new Set(
          applicable
            .map((assignment) => assignment.programme_id)
            .filter(Boolean)
        )
      ];

      const [
        programmeResult,
        weekResult,
        overrideResult,
        progressResult
      ] = await Promise.all([
        supabase
          .from("sc_programmes")
          .select("*")
          .in("id", programmeIds),
        supabase
          .from("sc_programme_weeks")
          .select("*")
          .in("programme_id", programmeIds)
          .order("week_number"),
        supabase
          .from("sc_player_overrides")
          .select("*")
          .eq("player_id", player.id)
          .eq("active", true),
        supabase
          .from("sc_progress")
          .select("*")
          .eq("player_id", player.id)
          .order("updated_at", { ascending: false })
      ]);

      if (programmeResult.error) {
        console.error(
          "Player standalone S&C programmes error:",
          programmeResult.error
        );
      }

      if (weekResult.error) {
        console.error(
          "Player standalone S&C weeks error:",
          weekResult.error
        );
      }

      const programmes = programmeResult.data || [];
      const weeks = weekResult.data || [];
      const overrides = overrideResult.data || [];
      const progressRows = progressResult.data || [];

      const currentWeekIds = [];
      const assignmentWeekMap = new Map();

      applicable.forEach((assignment) => {
        const programme = programmes.find(
          (row) =>
            String(row.id) ===
            String(assignment.programme_id)
        );

        const start = new Date(`${assignment.starts_on}T12:00:00`);
        const now = new Date(`${today}T12:00:00`);
        const elapsedDays = Math.max(
          0,
          Math.floor((now - start) / 86400000)
        );

        const rawWeek = Math.floor(elapsedDays / 7) + 1;
        const weekNumber = Math.min(
          Math.max(1, rawWeek),
          Number(programme?.duration_weeks || rawWeek || 1)
        );

        const week = weeks.find(
          (row) =>
            String(row.programme_id) ===
              String(assignment.programme_id) &&
            Number(row.week_number) === weekNumber
        );

        if (week?.id) {
          currentWeekIds.push(week.id);
          assignmentWeekMap.set(String(assignment.id), week);
        }
      });

      let items = [];
      let exercises = [];

      if (currentWeekIds.length) {
        const { data: itemRows, error: itemError } =
          await supabase
            .from("sc_programme_items")
            .select("*")
            .in("programme_week_id", [
              ...new Set(currentWeekIds)
            ])
            .order("sort_order");

        if (itemError) {
          console.error(
            "Player standalone S&C items error:",
            itemError
          );
        }

        items = itemRows || [];

        const exerciseIds = [
          ...new Set(
            items
              .map((item) => item.exercise_id)
              .filter(Boolean)
          )
        ];

        if (exerciseIds.length) {
          const { data: exerciseRows, error: exerciseError } =
            await supabase
              .from("sc_exercises")
              .select("*")
              .in("id", exerciseIds);

          if (exerciseError) {
            console.error(
              "Player standalone S&C exercises error:",
              exerciseError
            );
          }

          exercises = exerciseRows || [];
        }
      }

      const exerciseMap = new Map(
        exercises.map((row) => [String(row.id), row])
      );

      const overrideMap = new Map(
        overrides.map((row) => [
          `${row.assignment_id}:${row.programme_item_id}`,
          row
        ])
      );

      const flattened = [];

      applicable.forEach((assignment) => {
        const week = assignmentWeekMap.get(
          String(assignment.id)
        );

        if (!week) return;

        const programme = programmes.find(
          (row) =>
            String(row.id) ===
            String(assignment.programme_id)
        );

        items
          .filter(
            (item) =>
              String(item.programme_week_id) ===
              String(week.id)
          )
          .forEach((item) => {
            const exercise =
              exerciseMap.get(String(item.exercise_id)) || {};

            const override = overrideMap.get(
              `${assignment.id}:${item.id}`
            );

            flattened.push({
              ...item,
              assignment_id: assignment.id,
              programme_id: assignment.programme_id,
              programme_title:
                programme?.title || "My S&C Programme",
              programme_description:
                programme?.description || "",
              programme_duration_weeks:
                programme?.duration_weeks || 1,
              starts_on: assignment.starts_on,
              ends_on: assignment.ends_on,
              week_number: week.week_number,
              week_title: week.title || `Week ${week.week_number}`,
              week_focus: week.focus || "",
              title: exercise.title || "S&C Activity",
              description:
                item.player_instructions ||
                exercise.description ||
                "",
              category: exercise.category || "strength",
              verification_type:
                item.verification_type ||
                exercise.default_verification_type ||
                "self",
              equipment: exercise.equipment || "",
              sets: override?.sets ?? item.sets ?? null,
              reps: override?.reps ?? item.reps ?? null,
              duration_seconds:
                override?.duration_seconds ??
                item.duration_seconds ??
                null,
              distance_m:
                override?.distance_m ??
                item.distance_m ??
                null,
              target_text:
                override?.target_text ||
                item.target_text ||
                "",
              is_individual_target: Boolean(override),
              individual_note:
                override?.coach_note || ""
            });
          });
      });

      setPlayerStrengthAssignments(flattened);
      setPlayerStrengthProgress(progressRows);

      const progressIds = progressRows
        .map((row) => row.id)
        .filter(Boolean);

      if (progressIds.length) {
        const { data: feedbackRows, error: feedbackError } =
          await supabase
            .from("sc_feedback")
            .select("*")
            .in("progress_id", progressIds)
            .order("feedback_at", { ascending: false });

        if (feedbackError) {
          console.error(
            "Player standalone S&C feedback error:",
            feedbackError
          );
        }

        setPlayerStrengthFeedback(feedbackRows || []);
      } else {
        setPlayerStrengthFeedback([]);
      }

      const first = flattened[0];

      setPlayerStrengthProgramme(
        first
          ? {
              title: first.programme_title,
              description: first.programme_description,
              week_number: first.week_number,
              week_title: first.week_title,
              week_focus: first.week_focus,
              duration_weeks:
                first.programme_duration_weeks,
              starts_on: first.starts_on,
              ends_on: first.ends_on
            }
          : null
      );
    } finally {
      setPlayerStrengthLoading(false);
    }
  }

  async function completePlayerStrengthItem(item) {
    if (
      !selectedPlayer?.id ||
      !item?.assignment_id ||
      !item?.id
    ) {
      return;
    }

    setPlayerStrengthSaving(true);

    try {
      const existing = playerStrengthProgress.find(
        (row) =>
          String(row.assignment_id) ===
            String(item.assignment_id) &&
          String(row.programme_item_id) === String(item.id)
      );

      const nextStatus =
        item.verification_type === "coach"
          ? "pending"
          : "approved";

      const now = new Date().toISOString();

      const payload = {
        assignment_id: item.assignment_id,
        programme_item_id: item.id,
        player_id: selectedPlayer.id,
        status: nextStatus,
        claimed_at: now,
        reviewed_by: null,
        reviewed_at: null,
        updated_at: now
      };

      let result;

      if (existing?.id) {
        result = await supabase
          .from("sc_progress")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("sc_progress")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        console.error(
          "Player standalone S&C completion error:",
          result.error
        );
        window.alert("Could not save your S&C progress.");
        return;
      }

      await loadPlayerStrengthData(selectedPlayer);
    } finally {
      setPlayerStrengthSaving(false);
    }
  }

  function playerStrengthTarget(item) {
    if (!item) return "";

    if (item.target_text) return item.target_text;

    if (item.sets && item.reps) {
      return `${item.sets} × ${item.reps}`;
    }

    if (item.sets && item.distance_m) {
      return `${item.sets} × ${item.distance_m}m`;
    }

    if (item.duration_seconds) {
      const seconds = Number(item.duration_seconds);

      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;

        return remainder
          ? `${minutes}m ${remainder}s`
          : `${minutes} min`;
      }

      return `${seconds} sec`;
    }

    if (item.distance_m) {
      return `${item.distance_m}m`;
    }

    return "Complete as prescribed";
  }

  function renderPlayerStrength() {
    const progressFor = (item) =>
      playerStrengthProgress.find(
        (row) =>
          String(row.assignment_id) ===
            String(item.assignment_id) &&
          String(row.programme_item_id) === String(item.id)
      ) || null;

    const feedbackFor = (progress) =>
      progress
        ? playerStrengthFeedback.find(
            (row) =>
              String(row.progress_id) ===
              String(progress.id)
          ) || null
        : null;

    const completeCount = playerStrengthAssignments.filter(
      (item) => progressFor(item)?.status === "approved"
    ).length;

    const pendingCount = playerStrengthAssignments.filter(
      (item) => progressFor(item)?.status === "pending"
    ).length;

    const total = playerStrengthAssignments.length;
    const completionPct = total
      ? Math.round((completeCount / total) * 100)
      : 0;

    return (
      <div style={{ paddingBottom: 90 }}>
        <button
          onClick={() => setScreen("home")}
          style={{
            border: 0,
            background: "transparent",
            color: C.primary,
            fontWeight: 900,
            padding: "0 0 10px",
            cursor: "pointer"
          }}
        >
          ← Back to Home
        </button>

        <div
          style={{
            background:
              "linear-gradient(135deg,#4C1D95 0%,#7C3AED 55%,#A78BFA 100%)",
            borderRadius: 22,
            padding: 18,
            color: "#fff",
            marginBottom: 14,
            boxShadow: "0 10px 24px rgba(76,29,149,.22)"
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".12em",
              opacity: .8
            }}
          >
            My Programme
          </div>

          <div
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 24,
              fontWeight: 900,
              marginTop: 4
            }}
          >
            Strength & Conditioning
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              marginTop: 5,
              opacity: .9
            }}
          >
            {playerStrengthProgramme?.title ||
              "Your S&C programme"}
          </div>

          {playerStrengthProgramme && (
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "end"
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    opacity: .8
                  }}
                >
                  Week {playerStrengthProgramme.week_number} of{" "}
                  {playerStrengthProgramme.duration_weeks}
                </div>

                {playerStrengthProgramme.week_focus && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginTop: 2
                    }}
                  >
                    {playerStrengthProgramme.week_focus}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontFamily:
                    "'League Spartan', sans-serif",
                  fontSize: 24,
                  fontWeight: 900
                }}
              >
                {completionPct}%
              </div>
            </div>
          )}

          <div
            style={{
              height: 8,
              background: "rgba(255,255,255,.22)",
              borderRadius: 99,
              overflow: "hidden",
              marginTop: 9
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${completionPct}%`,
                background: "#fff",
                borderRadius: 99
              }}
            />
          </div>
        </div>

        {playerStrengthLoading ? (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 14,
              color: C.textSecondary
            }}
          >
            Loading your S&C programme...
          </div>
        ) : playerStrengthAssignments.length === 0 ? (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 16
            }}
          >
            <div
              style={{
                fontFamily:
                  "'League Spartan', sans-serif",
                fontSize: 17,
                fontWeight: 900,
                color: C.text
              }}
            >
              No active S&C programme
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.textSecondary,
                lineHeight: 1.5,
                marginTop: 4
              }}
            >
              When your coach assigns a programme, your current
              exercises and targets will appear here.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
                marginBottom: 14
              }}
            >
              {[
                ["THIS WEEK", total],
                ["DONE", completeCount],
                ["COACH CHECK", pendingCount]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: "10px 6px",
                    textAlign: "center"
                  }}
                >
                  <div
                    style={{
                      fontSize: 7,
                      fontWeight: 900,
                      color: C.textSecondary
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "'League Spartan', sans-serif",
                      fontSize: 21,
                      fontWeight: 900,
                      color: C.text,
                      marginTop: 2
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {playerStrengthAssignments.map((item) => {
              const progress = progressFor(item);
              const feedback = feedbackFor(progress);
              const status = progress?.status || "todo";

              const statusLabel =
                status === "approved"
                  ? "Complete"
                  : status === "pending"
                  ? "Waiting for coach"
                  : status === "needs_work"
                  ? "Needs work"
                  : "To do";

              const statusBg =
                status === "approved"
                  ? "#DCFCE7"
                  : status === "pending"
                  ? "#FEF3C7"
                  : status === "needs_work"
                  ? "#FFEDD5"
                  : "#EDE9FE";

              const statusColor =
                status === "approved"
                  ? "#166534"
                  : status === "pending"
                  ? "#92400E"
                  : status === "needs_work"
                  ? "#9A3412"
                  : "#6D28D9";

              return (
                <div
                  key={`${item.assignment_id}-${item.id}`}
                  style={{
                    background: C.surface,
                    border: `1.5px solid ${
                      status === "approved"
                        ? C.success + "44"
                        : "#7C3AED33"
                    }`,
                    borderRadius: 18,
                    padding: 14,
                    marginBottom: 11,
                    boxShadow:
                      "0 5px 16px rgba(15,23,42,.06)"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: "#7C3AED",
                          marginBottom: 3
                        }}
                      >
                        {item.category} · Week {item.week_number}
                      </div>

                      <div
                        style={{
                          fontFamily:
                            "'League Spartan', sans-serif",
                          fontSize: 17,
                          fontWeight: 900,
                          color: C.text
                        }}
                      >
                        {item.title}
                      </div>

                      {item.description && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.textSecondary,
                            lineHeight: 1.45,
                            marginTop: 4
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: 999,
                        padding: "5px 7px",
                        background: statusBg,
                        color: statusColor,
                        fontSize: 8,
                        fontWeight: 900,
                        textTransform: "uppercase"
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: 11,
                      padding: "10px 11px",
                      marginTop: 10
                    }}
                  >
                    <div
                      style={{
                        fontSize: 8,
                        fontWeight: 900,
                        color: C.textSecondary,
                        textTransform: "uppercase"
                      }}
                    >
                      Your target
                    </div>

                    <div
                      style={{
                        fontFamily:
                          "'League Spartan', sans-serif",
                        fontSize: 18,
                        fontWeight: 900,
                        color: C.text,
                        marginTop: 2
                      }}
                    >
                      {playerStrengthTarget(item)}
                    </div>

                    {item.is_individual_target && (
                      <div
                        style={{
                          fontSize: 9,
                          color: "#7C3AED",
                          fontWeight: 900,
                          marginTop: 3
                        }}
                      >
                        Personal target from your coach
                      </div>
                    )}

                    {item.individual_note && (
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textSecondary,
                          marginTop: 4
                        }}
                      >
                        {item.individual_note}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                      marginTop: 8
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: C.textSecondary
                      }}
                    >
                      {item.verification_type === "coach"
                        ? "Coach check"
                        : "Self check"}
                    </span>

                    {item.equipment && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: C.textSecondary
                        }}
                      >
                        · {item.equipment}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: C.gold
                      }}
                    >
                      · +{item.xp_reward || 10} XP
                    </span>
                  </div>

                  {feedback?.feedback && (
                    <div
                      style={{
                        background:
                          feedback.decision === "approved"
                            ? "#F0FDF4"
                            : "#FFF7ED",
                        borderRadius: 10,
                        padding: "9px 10px",
                        marginTop: 9,
                        fontSize: 10,
                        lineHeight: 1.45,
                        color: C.text
                      }}
                    >
                      <strong>Coach feedback:</strong>{" "}
                      {feedback.feedback}
                    </div>
                  )}

                  {status === "todo" ||
                  status === "needs_work" ? (
                    <button
                      onClick={() =>
                        completePlayerStrengthItem(item)
                      }
                      disabled={playerStrengthSaving}
                      style={{
                        width: "100%",
                        marginTop: 10,
                        padding: "11px 12px",
                        borderRadius: 11,
                        border: 0,
                        background: "#7C3AED",
                        color: "#fff",
                        fontFamily:
                          "'League Spartan', sans-serif",
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: "pointer"
                      }}
                    >
                      {status === "needs_work"
                        ? item.verification_type === "coach"
                          ? "I've worked on this · Send again"
                          : "I've worked on this · Complete"
                        : item.verification_type === "coach"
                        ? "I've done this · Send to coach"
                        : "I've done this"}
                    </button>
                  ) : status === "pending" ? (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#FFFBEB",
                        border: "1px solid #F59E0B44",
                        color: "#92400E",
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      ⏳ Your coach will check this
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: C.successBg,
                        color: C.success,
                        fontSize: 11,
                        fontWeight: 900,
                        textAlign: "center"
                      }}
                    >
                      ✓ Complete
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  async function signup() {
    if (!parentGuardianConfirmed || !termsAccepted || !privacyRead) {
      setAuthError("Please complete the parent / guardian confirmations before creating an account.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setSignupMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }

    // If Supabase returns an authenticated session immediately,
    // record acceptance now.
    if (data?.session?.user?.id) {
      const { error: acceptanceError } = await recordParentPolicyAcceptances(
        data.session.user.id,
        club?.id || null
      );

      if (acceptanceError) {
        console.error("Policy acceptance failed:", acceptanceError);
        setAuthError(
          "Your account was created, but we could not record the policy acceptance: " +
          acceptanceError.message
        );
        setAuthLoading(false);
        return;
      }
    } else if (data?.user?.id) {
      // Email confirmation may be enabled. Keep a small pending marker
      // so acceptance can be recorded after the parent authenticates.
      localStorage.setItem(
        "spraoi_pending_parent_consent",
        JSON.stringify({
          userId: data.user.id,
          policyVersion: LEGAL_POLICY_VERSION,
          parentGuardianConfirmation: true,
          createdAt: new Date().toISOString(),
        })
      );

      setSignupMessage("Account created. Please check your email to confirm your account, then log in.");
    }

    setAuthLoading(false);
  }
  async function sendPasswordReset() {
    const cleanEmail = String(email || "").trim();

    if (!cleanEmail) {
      setAuthError("Enter your parent email address first.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setResetSent(false);

    const redirectTo =
      `${window.location.origin}${window.location.pathname}`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo }
      );

    if (error) {
      setAuthError(error.message);
    } else {
      setResetSent(true);
    }

    setAuthLoading(false);
  }
  async function login() { setAuthLoading(true); setAuthError(""); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); setAuthLoading(false); }
  async function logout() { await supabase.auth.signOut(); setSession(null); setPlayers([]); setSelectedPlayer(null); }

  async function completeChallenge(challenge) {
    if (!selectedPlayer) return;
    const existing = progress.find((p) => p.challenge_id === challenge.id);
    if (existing) {
      // Toggle off
      setProgress((prev) => prev.filter((p) => p.id !== existing.id));
      await addXp(-(existing.xp_earned || 10));
      if (!existing.id.startsWith("local-")) supabase.from("player_progress").delete().eq("id", existing.id);
      return;
    }
    // Complete — show celebration immediately
    flashXp();
    const { data } = await supabase.from("player_progress").insert({ player_id: selectedPlayer.id, club_id: selectedPlayer.club_id, age_group_id: selectedPlayer.age_group_id, challenge_id: challenge.id, plan_id: weeklyPlan?.id || null, xp_earned: 10 }).select().single();
    if (data) { setProgress((prev) => [...prev, data]); await addXp(10); }
    else { setProgress((prev) => [...prev, { id: "local-" + Date.now(), challenge_id: challenge.id, xp_earned: 10 }]); await addXp(10); }
  }
  async function completeBonus(task) {
    if (!selectedPlayer || !weeklyPlan) return;
    const existing = progress.find((p) => p.bonus_task_id === task.id);
    if (existing && !task.repeatable) {
      setProgress((prev) => prev.filter((p) => p.id !== existing.id));
      await addXp(-(existing.xp_earned || task.xp_reward || 15));
      if (!String(existing.id).startsWith("local-")) {
        await supabase.from("player_progress").delete().eq("id", existing.id);
      }
      return;
    }
    const xp = task.xp_reward || 15;
    const { data } = await supabase.from("player_progress").insert({ player_id: selectedPlayer.id, club_id: selectedPlayer.club_id, age_group_id: selectedPlayer.age_group_id, bonus_task_id: task.id, plan_id: weeklyPlan.id, xp_earned: xp }).select().single();
    if (data) { setProgress((prev) => [...prev, data]); await addXp(xp); flashXp(); }
    else { setProgress((prev) => [...prev, { id: "local-" + Date.now(), bonus_task_id: task.id, xp_earned: xp }]); await addXp(xp); flashXp(); }
  }
  async function completeExercise(exercise) {
    if (!selectedPlayer) return;
    const existing = progress.find((p) => p.exercise_id === exercise.id);
    const needsCoach = (exercise.verification_type || "self") === "coach";
    if (existing) {
      // Pending claims can be undone. Approved coach claims and self-completed activities
      // can be removed, with XP reversed only when it was actually awarded.
      setProgress((prev) => prev.filter((p) => p.id !== existing.id));
      if ((existing.status || "approved") === "approved" && Number(existing.xp_earned || 0) > 0) {
        await addXp(-Number(existing.xp_earned || 0));
      }
      if (!String(existing.id).startsWith("local-")) await supabase.from("player_progress").delete().eq("id", existing.id);
      return;
    }
    const xp = Number(exercise.xp_reward || 5);
    const payload = {
      player_id: selectedPlayer.id,
      club_id: selectedPlayer.club_id,
      age_group_id: selectedPlayer.age_group_id,
      exercise_id: exercise.id,
      plan_id: weeklyPlan?.id || null,
      xp_earned: needsCoach ? 0 : xp,
      status: needsCoach ? "pending" : "approved",
      claimed_at: new Date().toISOString(),
      verified_at: needsCoach ? null : new Date().toISOString(),
    };
    const { data, error } = await supabase.from("player_progress").insert(payload).select().single();
    if (error) { console.error("activity completion failed", error); return; }
    if (data) {
      setProgress((prev) => [...prev, data]);
      if (!needsCoach) { await addXp(xp); flashXp(); }
    }
  }

  async function signUpForEvent(event) {
    if (!selectedPlayer) return;
    if (eventSignups.find((s) => s.event_id === event.id)) return;
    const needsCoach = (event.verification_type || "self") === "coach";
    const payload = {
      event_id: event.id,
      player_id: selectedPlayer.id,
      status: needsCoach ? "pending" : "approved",
      claimed_at: new Date().toISOString(),
      verified_at: needsCoach ? null : new Date().toISOString(),
    };
    const { data, error } = await supabase.from("journey_event_signups").insert(payload).select().single();
    if (error) { console.error("event signup failed", error); return; }
    if (data) {
      setEventSignups((prev) => [...prev, data]);
      if (!needsCoach) { await addXp(event.xp_reward || 15); flashXp(); }
    }
  }

  async function cancelEventSignup(event) {
    if (!selectedPlayer) return;
    const signup = eventSignups.find((s) => s.event_id === event.id);
    if (!signup || signup.status === "approved") return;
    await supabase.from("journey_event_signups").delete().eq("id", signup.id);
    setEventSignups((prev) => prev.filter((s) => s.id !== signup.id));
  }
  async function addXp(amount) {
    if (!selectedPlayer) return;
    const newTotal = Math.max(0, (selectedPlayer.xp_total || 0) + amount);
    await supabase.from("journey_players").update({ xp_total: newTotal, last_active: new Date().toISOString().split("T")[0] }).eq("id", selectedPlayer.id);
    setSelectedPlayer((p) => ({ ...p, xp_total: newTotal }));
  }
  function flashXp() { setShowXpPop(true); setTimeout(() => setShowXpPop(false), 1200); }

  // Coach functions   manage exercises for a team
  async function loadCoachPlan(team) {
    setCoachSelectedTeam(team);
    // Get latest plan for this team
    const { data: plans } = await supabase.from("weekly_plans").select("*").eq("age_group_id", team.id).order("week_number", { ascending: false }).limit(1);
    const plan = plans && plans.length > 0 ? plans[0] : null;
    setCoachPlan(plan);
    if (plan) {
      const { data: exercises } = await supabase.from("journey_exercises").select("*").eq("plan_id", plan.id).order("sort_order");
      setCoachExercises(exercises || []);
    } else { setCoachExercises([]); }
    // Load events for this team
    await loadCoachEvents(team);
  }

  async function addExercise(title, description, xpReward) {
    if (!coachPlan || !coachSelectedTeam || !club) return;
    const { data } = await supabase.from("journey_exercises").insert({
      plan_id: coachPlan.id, age_group_id: coachSelectedTeam.id, club_id: club.id,
      title, description: description || null, xp_reward: xpReward || 5,
      sort_order: coachExercises.length,
    }).select().single();
    if (data) setCoachExercises((prev) => [...prev, data]);
  }

  async function removeExercise(id) {
    await supabase.from("journey_exercises").delete().eq("id", id);
    setCoachExercises((prev) => prev.filter((e) => e.id !== id));
  }

  async function loadCoachEvents(team) {
    const { data } = await supabase.from("journey_events").select("*").eq("age_group_id", team.id).order("event_date");
    setCoachEvents(data || []);
  }

  async function addEvent(eventData) {
    if (!coachSelectedTeam || !club) return;
    const { data } = await supabase.from("journey_events").insert({
      club_id: club.id, age_group_id: coachSelectedTeam.id, created_by: session?.user?.id,
      ...eventData,
    }).select().single();
    if (data) setCoachEvents((prev) => [...prev, data]);
  }

  async function removeEvent(id) {
    await supabase.from("journey_events").delete().eq("id", id);
    setCoachEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const xpTotal = selectedPlayer?.xp_total || 0;
  const level = getLevel(xpTotal);
  const completedChallengeIds = new Set(progress.filter((p) => p.challenge_id).map((p) => p.challenge_id));
  const completedBonusIds = new Set(progress.filter((p) => p.bonus_task_id).map((p) => p.bonus_task_id));

  if (initialLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.background }}>
      <img
        src={BRAND_LOGO}
        alt="Spraoi Sports"
        onError={(event) => { event.currentTarget.src = APP_ICON; }}
        style={{ width: 170, maxWidth: "60vw", height: "auto", objectFit: "contain", opacity: 0.8 }}
      />
    </div>
  );

  if (recoveryMode && session) {
    return (
      <SpraoiPasswordRecovery
        accent={C.primary}
        lightBackground={true}
        logo={BRAND_LOGO}
        onDone={() => setRecoveryMode(false)}
      />
    );
  }
  /* ---------- AUTH ---------- */
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: C.background, fontFamily: "Inter, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 16px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={BRAND_LOGO}
              alt="Spraoi Sports"
              onError={(event) => { event.currentTarget.src = APP_ICON; }}
              style={{ width: 190, maxWidth: "75%", height: "auto", objectFit: "contain", marginBottom: 12 }}
            />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 25, color: C.primary, textTransform: "uppercase" }}>Spraoi</div>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "6px 0 0" }}>Play. Learn. Grow.</p>
          </div>
          {/* Auth card */}
          <div style={{ background: C.surface, borderRadius: 18, padding: 22, boxSizing: "border-box", width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", marginBottom: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
              {["login", "signup"].map((m) => (<button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }} style={{ flex: 1, padding: 10, border: "none", background: authMode === m ? C.primary : C.surface, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13, color: authMode === m ? "#fff" : C.textSecondary, cursor: "pointer", textTransform: "uppercase" }}>{m === "login" ? "Log In" : "Sign Up"}</button>))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 900, color: C.textSecondary, textTransform: "uppercase", letterSpacing: ".06em" }}>Parent Email</label>
            <input type="email" placeholder="parent@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", boxSizing: "border-box", display: "block", padding: 12, borderRadius: 12, border: `2px solid ${C.border}`, fontSize: 14, margin: "6px 0 12px", background: C.surfaceAlt }} />
            <label style={{ fontSize: 11, fontWeight: 900, color: C.textSecondary, textTransform: "uppercase", letterSpacing: ".06em" }}>Password</label>
            <div style={{ position: "relative", width: "100%", margin: "6px 0 14px" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  display: "block",
                  padding: "12px 64px 12px 12px",
                  borderRadius: 12,
                  border: `2px solid ${C.border}`,
                  fontSize: 14,
                  background: C.surfaceAlt,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: C.primary,
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: "6px 4px",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {authMode === "signup" && (
              <div style={{
                margin: "4px 0 14px",
                padding: 13,
                borderRadius: 13,
                background: "#f7faf8",
                border: `1px solid ${C.border}`,
                display: "grid",
                gap: 10
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 11.5, lineHeight: 1.45, color: C.text, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={parentGuardianConfirmed}
                    onChange={(e) => setParentGuardianConfirmed(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16 }}
                  />
                  <span>
                    I confirm that I am the parent or legal guardian of the child using Spraoi Academy.
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 11.5, lineHeight: 1.45, color: C.text, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16 }}
                  />
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLegalPolicyKey("terms"); }}
                      style={{ border: 0, padding: 0, background: "transparent", color: C.primary, font: "inherit", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Terms of Service
                    </button>
                    {" "}and{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLegalPolicyKey("parent_guardian"); }}
                      style={{ border: 0, padding: 0, background: "transparent", color: C.primary, font: "inherit", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Parent / Guardian Terms
                    </button>.
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 11.5, lineHeight: 1.45, color: C.text, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={privacyRead}
                    onChange={(e) => setPrivacyRead(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16 }}
                  />
                  <span>
                    I have read the{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLegalPolicyKey("privacy"); }}
                      style={{ border: 0, padding: 0, background: "transparent", color: C.primary, font: "inherit", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Privacy Policy
                    </button>.
                  </span>
                </label>

                <div style={{ fontSize: 9.5, color: C.textSecondary, lineHeight: 1.45 }}>
                  Spraoi Sports private beta · Policy version {LEGAL_POLICY_VERSION}
                </div>
              </div>
            )}

            {authMode === "login" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: -6,
                    marginBottom: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword((v) => !v);
                      setResetSent(false);
                      setAuthError("");
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.primary,
                      cursor: "pointer",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {showForgotPassword && (
                  <div
                    style={{
                      background: C.surfaceAlt,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 13,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: C.text,
                      }}
                    >
                      {resetSent
                        ? `We've sent a password reset link to ${email}.`
                        : "Enter your parent email above and we'll send you a secure password reset link."}
                    </div>

                    {!resetSent && (
                      <button
                        type="button"
                        onClick={sendPasswordReset}
                        disabled={authLoading || !email}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: 9,
                          padding: 10,
                          background: C.primary,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          marginTop: 10,
                          opacity:
                            authLoading || !email
                              ? 0.55
                              : 1,
                        }}
                      >
                        {authLoading
                          ? "Sending..."
                          : "Send reset link"}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {authError && <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{authError}</div>}

            {signupMessage && authMode === "signup" && (
              <div style={{
                color: "#16803c",
                background: "#edf8f0",
                border: "1px solid #b7dfc1",
                padding: 10,
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 10,
                textAlign: "center"
              }}>
                {signupMessage}
              </div>
            )}

            <button
              onClick={authMode === "login" ? login : signup}
              disabled={
                authLoading ||
                !email ||
                !password ||
                (authMode === "signup" && (!parentGuardianConfirmed || !termsAccepted || !privacyRead))
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                padding: 14,
                border: "none",
                fontSize: 15,
                fontWeight: 900,
                fontFamily: "'League Spartan', sans-serif",
                background: C.primary,
                color: "#fff",
                cursor: (
                  authLoading ||
                  !email ||
                  !password ||
                  (authMode === "signup" && (!parentGuardianConfirmed || !termsAccepted || !privacyRead))
                ) ? "not-allowed" : "pointer",
                opacity: (
                  authLoading ||
                  !email ||
                  !password ||
                  (authMode === "signup" && (!parentGuardianConfirmed || !termsAccepted || !privacyRead))
                ) ? 0.5 : 1,
                boxShadow: "0 4px 12px rgba(26,92,45,0.25)"
              }}
            >
              {authLoading ? "..." : authMode === "login" ? "Log In" : "Create Account"}
            </button>
          </div>
        </div>

        {legalPolicy && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={legalPolicy.title}
            onClick={() => setLegalPolicyKey(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(11,37,69,.58)",
              backdropFilter: "blur(5px)",
              display: "grid",
              placeItems: "center",
              padding: 16
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(680px, 100%)",
                maxHeight: "86vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 24px 70px rgba(0,0,0,.24)"
              }}
            >
              <div style={{
                padding: "18px 20px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14
              }}>
                <div>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 900, color: C.text }}>
                    {legalPolicy.title}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: C.textSecondary }}>
                    Version {legalPolicy.version} · Effective {legalPolicy.effectiveDate}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLegalPolicyKey(null)}
                  aria-label="Close"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.text,
                    cursor: "pointer",
                    fontSize: 19,
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 20, overflowY: "auto" }}>
                {(legalPolicy.sections || []).map((section) => (
                  <section key={section.heading} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontFamily: "'League Spartan', sans-serif",
                      fontSize: 15,
                      fontWeight: 900,
                      color: C.primary,
                      marginBottom: 7
                    }}>
                      {section.heading}
                    </div>

                    {(section.body || []).map((paragraph, index) => (
                      <p
                        key={index}
                        style={{
                          margin: index ? "8px 0 0" : 0,
                          fontSize: 11.5,
                          lineHeight: 1.65,
                          color: C.text
                        }}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))}
              </div>

              <div style={{
                padding: 14,
                borderTop: `1px solid ${C.border}`,
                background: "#fafcfb"
              }}>
                <button
                  type="button"
                  onClick={() => setLegalPolicyKey(null)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 11,
                    border: "none",
                    background: C.primary,
                    color: "#fff",
                    fontFamily: "'League Spartan', sans-serif",
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- CHILD SELECTOR (first time) ---------- */
  if (!selectedPlayer && !isAdminUrl && !hasCoachAccess) {
    async function loadAvailable() {
      if (!club) return;
      const linkedPlayers = await loadLinkedPlayers(
        session.user.id,
        club.id
      );

      const mine = inviteTeamId
        ? linkedPlayers.filter(
            (p) => String(p.age_group_id) === String(inviteTeamId)
          )
        : linkedPlayers;

      setAvailablePlayers(mine);
      setPlayers(mine);

      if (mine.length > 0) {
        selectPlayer(mine[0]);
      }

      setLoadingPlayers(false);
    }
    if (loadingPlayers && club) loadAvailable();
    const unclaimed = [];

    return (
      <div style={{ minHeight: "100vh", background: C.background, fontFamily: "Inter, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>Your Child</div>
            <button onClick={logout} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", fontSize: 12 }}><LogOut size={14} /></button>
          </div>
          {unclaimed.length > 0 ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 12px" }}>Choose the child linked to your Spraoi account.</p>
              {unclaimed.map((p) => (
                <button key={p.id} onClick={async () => { await supabase.from("journey_players").update({ parent_user_id: session.user.id }).eq("id", p.id); selectPlayer({ ...p, parent_user_id: session.user.id }); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16 }}>{p.name[0]}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</div><div style={{ fontSize: 11, color: C.textSecondary }}>{p.age_group?.label || ""}</div></div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>Select</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background: C.surface, borderRadius: 16, padding: 24, textAlign: "center", border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 13, color: C.textSecondary }}>No players found. Ask your coach to add your child to the squad.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- MAIN APP ---------- */
  // If admin URL with no player selected, default to coach screen
  if (!selectedPlayer && isAdminUrl) {
    if (screen !== "coach") setScreen("coach");
  }

  const openParentMode = async (target = "parent-home") => {
    setParentGateTarget(target);
    setParentPin("");
    setParentPinError("");

    const { data, error } = await supabase.rpc(
      "has_spraoi_parent_pin"
    );

    if (error) {
      setParentPinError(error.message);
      setShowParentGate(true);
      return;
    }

    if (!data) {
      setNewParentPin("");
      setConfirmParentPinValue("");
      setPinSetupOpen(true);
      return;
    }

    setShowParentGate(true);
  };

  const confirmParentMode = async (pinValue = parentPin) => {
    if (!/^\d{4}$/.test(pinValue)) return;

    setParentPinError("");

    const { data, error } = await supabase.rpc(
      "verify_spraoi_parent_pin",
      { check_pin: pinValue }
    );

    if (error) {
      setParentPinError(error.message);
      return;
    }

    if (!data) {
      setParentPinError("Incorrect PIN. Please try again.");
      return;
    }

    setParentModeUnlocked(true);
    setShowParentGate(false);
    setParentPin("");
    setScreen(parentGateTarget || "parent-home");
  };

  const saveParentPin = async () => {
    if (!/^\d{4}$/.test(newParentPin)) return;

    if (newParentPin !== confirmParentPinValue) {
      setParentPinError("The PINs do not match.");
      return;
    }

    setPinSaving(true);
    setParentPinError("");

    const { error } = await supabase.rpc(
      "set_spraoi_parent_pin",
      { new_pin: newParentPin }
    );

    setPinSaving(false);

    if (error) {
      setParentPinError(error.message);
      return;
    }

    setPinSetupOpen(false);
    setParentModeUnlocked(true);
    setNewParentPin("");
    setConfirmParentPinValue("");
    setScreen(parentGateTarget || "parent-home");
  };

  function renderCalendarPlaceholder() {
    return (
      <div style={{ paddingBottom: 20 }}>
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:18, padding:18, boxShadow:"0 5px 18px rgba(15,23,42,.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <img src="/icons/academy/weekly-content.svg" alt="" style={{ width:34, height:34 }} />
            <div>
              <div style={{ fontFamily:"'League Spartan',sans-serif", fontSize:20, fontWeight:900, color:C.text }}>Events</div>
              <div style={{ fontSize:12, color:C.textSecondary, marginTop:3 }}>Training, matches and club events for this child will appear here.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderParentHome() {
    return (
      <div style={{ paddingBottom:20 }}>
        <div style={{ background:"linear-gradient(135deg,#10243E,#1D4ED8)", color:"#fff", borderRadius:20, padding:18, marginBottom:14 }}>
          <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:".12em", fontWeight:900, opacity:.8 }}>Parent mode</div>
          <div style={{ fontFamily:"'League Spartan',sans-serif", fontSize:24, fontWeight:900, marginTop:4 }}>{selectedPlayer?.name || "Your child"}</div>
          <div style={{ fontSize:12, opacity:.82, marginTop:4 }}>Events, messages, skills and profile settings.</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            ["Events","/icons/academy/weekly-content.svg","calendar"],
            ["Messages & Updates","/icons/academy/parents.svg","updates"],
            ["Skills & Progress","/icons/academy/completion.svg","progress"],
            ["Profile","/icons/academy/child-profile.svg","profile"],
          ].map(([label,icon,target]) => (
            <button key={label} onClick={()=>setScreen(target)} style={{ minHeight:112, textAlign:"left", border:`1px solid ${C.border}`, borderRadius:16, background:"#fff", padding:14, cursor:"pointer" }}>
              <img src={icon} alt="" style={{ width:30, height:30, marginBottom:14 }} />
              <div style={{ fontFamily:"'League Spartan',sans-serif", fontWeight:900, fontSize:16, color:C.text }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderWeeklyPractice() {
    // Swap hurling/camogie for girls based on age group sport
    const isGirlsGroup = selectedPlayer?.age_group_id && ageGroups.find((ag) => ag.id === selectedPlayer.age_group_id)?.gender === "girls";
    function displaySport(sport) {
      if (isGirlsGroup && sport === "hurling") return "camogie";
      return sport;
    }
    const recoveryTaskId = `recovery-${weeklyPlan?.week_number || 1}`;
    const requiredSkillCount = weekSkills.length;
    const completedSkillCount = weekSkills.filter((skill) => completedChallengeIds.has(skill.id)).length;
    const requiredFitnessActivities = fitnessExercises.filter((ex) => ex.required !== false && (ex.activity_type || "exercise") !== "club");
    const requiredClubActivities = fitnessExercises.filter((ex) => ex.required === true && (ex.activity_type || "exercise") === "club");
    const requiredFitnessCount = requiredFitnessActivities.length + requiredClubActivities.length;
    const completedFitnessCount = [...requiredFitnessActivities, ...requiredClubActivities].filter((ex) => progress.some((p) => p.exercise_id === ex.id && (p.status || "approved") === "approved")).length;
    const requiredRecoveryCount = weeklyPlan || weekSkills.length || fitnessExercises.length ? 1 : 0;
    const completedRecoveryCount = requiredRecoveryCount && completedBonusIds.has(recoveryTaskId) ? 1 : 0;
    const requiredEvents = events.filter((evt) => evt.required);
    const requiredEventCount = requiredEvents.length;
    const completedRequiredEventCount = requiredEvents.filter((evt) => eventSignups.some((s) => s.event_id === evt.id && s.status === "approved")).length;
    const totalRequiredTasks = requiredSkillCount + requiredFitnessCount + requiredRecoveryCount + requiredEventCount;
    const completedRequiredTasks = completedSkillCount + completedFitnessCount + completedRecoveryCount + completedRequiredEventCount;
    const completionPct = totalRequiredTasks > 0 ? Math.round((completedRequiredTasks / totalRequiredTasks) * 100) : 0;
    const journeySteps = [
      ...weekSkills.map((skill) => ({
        id: `skill-${skill.id}`,
        label: skill.name,
        section: (skill.sport === "hurling" || skill.sport === "camogie") ? (isGirlsGroup ? "Camogie" : "Hurling") : "Football",
        icon: (skill.sport === "hurling" || skill.sport === "camogie") ? "/hurling-icon.png" : "/football-icon.png",
        color: (skill.sport === "hurling" || skill.sport === "camogie") ? C.hurling : C.football,
        done: completedChallengeIds.has(skill.id),
        pending: false,
      })),
      ...fitnessExercises.filter((ex) => (ex.activity_type || "exercise") !== "club" && (ex.activity_type || "exercise") !== "recovery").map((ex) => {
        const claim = progress.find((p) => p.exercise_id === ex.id);
        return { id:`activity-${ex.id}`, label:ex.title, section:"S&C", icon:"/speed-mechanics-icon.png", color:C.athletic, done:Boolean(claim) && (claim.status || "approved") === "approved", pending:claim?.status === "pending" };
      }),
      ...fitnessExercises.filter((ex) => (ex.activity_type || "exercise") === "club").map((ex) => {
        const claim = progress.find((p) => p.exercise_id === ex.id);
        return { id:`activity-${ex.id}`, label:ex.title, section:"Bonus", icon:"/hurling-icon.png", color:SECTIONS.events.color, done:claim?.status === "approved", pending:claim?.status === "pending" };
      }),
      ...(requiredRecoveryCount ? [{ id:"academy-recovery", label:"Rest & Recovery", section:"Recovery", icon:SECTIONS.recovery.icon, color:SECTIONS.recovery.color, done:Boolean(completedRecoveryCount), pending:false }] : []),
    ];
    const nextJourneyStep = journeySteps.find((step) => !step.done && !step.pending) || journeySteps.find((step) => step.pending) || null;
    const goToJourneyStep = (step) => {
      if (!step?.id) return;
      document.getElementById(step.id)?.scrollIntoView({ behavior:"smooth", block:"center" });
    };
    return (<>
      <div style={{ background:"linear-gradient(135deg,#2563EB,#7C3AED)", borderRadius:20, padding:18, marginBottom:14, color:"#fff", boxShadow:"0 10px 24px rgba(37,99,235,.22)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,.16)", display:"grid", placeItems:"center" }}>
            <img src="/icons/academy/challenge.svg" alt="" style={{ width:30, height:30 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:".12em", fontWeight:900, opacity:.82 }}>Today's mission</div>
            <div style={{ fontFamily:"'League Spartan',sans-serif", fontSize:22, fontWeight:900, marginTop:3 }}>{nextJourneyStep?.label || "You're all caught up!"}</div>
            <div style={{ fontSize:11, opacity:.84, marginTop:3 }}>{nextJourneyStep ? `${nextJourneyStep.section} · keep your streak going` : "Great work — check back for the next challenge."}</div>
          </div>
        </div>
        {nextJourneyStep && !nextJourneyStep.pending && (
          <button onClick={()=>goToJourneyStep(nextJourneyStep)} style={{ marginTop:14, width:"100%", height:42, border:0, borderRadius:12, background:"#fff", color:"#1D4ED8", fontWeight:900, cursor:"pointer" }}>Start mission</button>
        )}
      </div>

      {/* Academy weekly intro */}
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: "16px", marginBottom: 16, boxShadow: "0 5px 18px rgba(15,23,42,0.07)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:52,height:52,borderRadius:15,background:C.primary+"12",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <img src={APP_ICON} alt="Spraoi" style={{ width: 42, height: 42, objectFit: "contain" }} />
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:1.1,textTransform:"uppercase",color:C.textSecondary,marginBottom:2 }}>This week in Spraoi</div>
            <div style={{ fontFamily:"'League Spartan', sans-serif",fontWeight:900,fontSize:26,lineHeight:1.02,color:C.primary,letterSpacing:"-.02em" }}>{weekCommencingLabel(weekOffset)}</div>
            <div style={{ fontSize:11,color:C.textSecondary,lineHeight:1.45,marginTop:6,fontStyle:"italic" }}>“{academyQuoteFor(selectedPlayer, weeklyPlan)}”</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
          <button onClick={()=>setWeekOffset(v=>v-1)} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${C.border}`,background:"#fff",color:C.primary,fontWeight:800,cursor:"pointer"}}>← Previous week</button>
          <button disabled={weekOffset>=0} onClick={()=>setWeekOffset(v=>Math.min(0,v+1))} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${C.border}`,background:weekOffset>=0?C.surfaceAlt:"#fff",color:weekOffset>=0?C.textSecondary:C.primary,fontWeight:800,cursor:weekOffset>=0?"not-allowed":"pointer",opacity:weekOffset>=0?.55:1}}>Next week →</button>
        </div>
      </div>

      {/* Weekly journey — Duolingo-inspired progression without changing the underlying completion model */}
      {journeySteps.length > 0 && (
        <div style={{ background:"linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)", border:`1.5px solid ${C.primary}22`, borderRadius:22, padding:"16px 14px 18px", marginBottom:18, boxShadow:"0 8px 24px rgba(15,23,42,.07)" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10}}>
            <div>
              <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:".11em",color:C.textSecondary}}>Your weekly journey</div>
              <div style={{fontFamily:"'League Spartan', sans-serif",fontSize:19,fontWeight:900,color:C.text,marginTop:2}}>{completedRequiredTasks === totalRequiredTasks && totalRequiredTasks > 0 ? "Week complete!" : "Keep moving forward"}</div>
            </div>
            <div style={{width:54,height:54,borderRadius:"50%",background:C.primary+"12",border:`4px solid ${C.primary}22`,display:"grid",placeItems:"center",fontFamily:"'League Spartan', sans-serif",fontSize:14,fontWeight:900,color:C.primary}}>{completionPct}%</div>
          </div>
          <div style={{height:9,borderRadius:99,background:C.surfaceAlt,overflow:"hidden",marginBottom:15}}><div style={{height:"100%",width:`${completionPct}%`,background:C.primary,borderRadius:99,transition:"width .35s ease"}} /></div>
          <div style={{display:"grid",gap:2}}>
            {journeySteps.map((step,index)=>{
              const isNext = nextJourneyStep?.id === step.id;
              return <div key={`${step.id}-${index}`} style={{display:"grid",gridTemplateColumns:"54px 1fr",gap:10,position:"relative",minHeight:72}}>
                <div style={{position:"relative",display:"flex",justifyContent:"center"}}>
                  {index < journeySteps.length-1 && <div style={{position:"absolute",top:46,bottom:-18,width:5,borderRadius:99,background:step.done?C.success:C.border}} />}
                  <button onClick={()=>goToJourneyStep(step)} style={{width:48,height:48,borderRadius:"50%",border:`4px solid ${step.done?C.success:isNext?step.color:C.border}`,background:step.done?C.success:isNext?step.color:"#fff",display:"grid",placeItems:"center",cursor:"pointer",boxShadow:isNext?`0 5px 16px ${step.color}44`:"0 2px 8px rgba(15,23,42,.06)",zIndex:1,transform:isNext?"scale(1.06)":"none",transition:".2s"}}>
                    {step.done ? <CheckCircle size={23} color="#fff"/> : step.pending ? <span style={{fontSize:18}}>⏳</span> : <img src={step.icon} alt="" style={{width:25,height:25,objectFit:"contain",filter:isNext?"brightness(0) invert(1)":"none"}}/>}
                  </button>
                </div>
                <button onClick={()=>goToJourneyStep(step)} style={{alignSelf:"start",textAlign:"left",border:`1.5px solid ${step.done?C.success+"44":isNext?step.color+"55":C.border}`,background:step.done?C.successBg:isNext?step.color+"0D":"#fff",borderRadius:14,padding:"10px 12px",cursor:"pointer",boxShadow:isNext?"0 5px 16px rgba(15,23,42,.07)":"none"}}>
                  <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:".06em",color:step.done?C.success:step.color}}>{step.done?"Completed":step.pending?"Waiting for coach":isNext?"Up next":step.section}</div>
                  <div style={{fontFamily:"'League Spartan', sans-serif",fontSize:14,fontWeight:900,color:C.text,marginTop:2}}>{step.label}</div>
                  {!step.done && !step.pending && <div style={{fontSize:10,color:C.textSecondary,marginTop:2}}>{step.section} · Tap to continue</div>}
                </button>
              </div>;
            })}
          </div>
          {nextJourneyStep && !nextJourneyStep.pending && <button onClick={()=>goToJourneyStep(nextJourneyStep)} style={{width:"100%",marginTop:12,padding:"12px 14px",border:0,borderRadius:12,background:C.primary,color:"#fff",fontFamily:"'League Spartan', sans-serif",fontSize:14,fontWeight:900,cursor:"pointer",boxShadow:"0 5px 14px rgba(26,92,45,.2)"}}>Continue · {nextJourneyStep.label} →</button>}
        </div>
      )}

      {/* This Week's Skills   from coach drills or library fallback */}
      {weekSkills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 10 }}>Your Coach-selected skills for this week.</div>
          {weekSkills.map((skill) => {
            const isHurling = skill.sport === "hurling" || skill.sport === "camogie";
            const sportColor = isHurling ? C.hurling : C.football;
            const sportBg = isHurling ? C.hurlingBg : C.footballBg;
            const catIcon = isHurling ? "/hurling-icon.png" : "/football-icon.png";
            const previousSkills = weekSkills.slice(0, weekSkills.indexOf(skill));
            const firstOfSport = !previousSkills.some((item) => (item.sport === "hurling" || item.sport === "camogie") === isHurling);
            return (
              <div key={skill.id}>
              <div id={`skill-${skill.id}`} style={{ background: C.surface, border: `2px solid ${sportColor}33`, borderTop:`5px solid ${sportColor}`, borderRadius: 18, marginBottom: 14, overflow: "hidden", position: "relative", boxShadow:"0 5px 16px rgba(15,23,42,0.07)" }}>
                {/* Header */}
                <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: sportColor + "18", border: `1.5px solid ${sportColor}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={catIcon} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 13, color: sportColor, textTransform:"uppercase", letterSpacing:".04em", marginBottom:2 }}>{isHurling ? (skill.sport === "camogie" ? "Camogie" : "Hurling") : "Football"}</div>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>{skill.name}</div>
                    <div style={{ fontSize: 10, color: C.textSecondary, textTransform: "capitalize" }}>{skill.category?.replace(/_/g, " ") || skill.sport}</div>
                  </div>
                </div>
                {/* Video iframe or icon fallback */}
                {skill.video_url ? (
                  <div style={{ padding: "0 14px 8px" }}>
                    <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${sportColor}22`, background: "#000" }}>
                      <iframe src={skill.video_url.replace("watch?v=", "embed/").split("&")[0]} style={{ width: "100%", height: 180, border: "none", display: "block" }} allow="accelerometer; autoplay; encrypted-media; gyroscope" allowFullScreen title={skill.name} />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "0 14px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.7)", borderRadius: 12, border: `1px solid ${sportColor}11` }}>
                      <img src={catIcon} alt="" style={{ width: 42, height: 42, objectFit: "contain" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 3 }}>Practise: {skill.name}</div>
                        <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.4 }}>Ask a parent or friend to help you practise your {skill.name.toLowerCase()}. Try 10 repetitions and focus on good technique!</div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Practice instructions */}
                <div style={{ padding: "0 14px 12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: 10, padding: "10px 12px", border: `1px solid ${sportColor}11` }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 4 }}>How to practise ({skill.name})</div>
                    <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
                      {isHurling
                        ? `Grab your hurley and sliotar. Find a wall or open space. Practise your ${skill.name.toLowerCase()} for 20 minutes   start slow, get the technique right, then speed up. Focus on control and accuracy.`
                        : `Grab a football. Find a wall or a partner. Practise your ${skill.name.toLowerCase()} for 20 minutes   start with short distances and build up. Keep your eyes on the ball and use both hands.`
                      }
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary }}>20 min practice</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 11, color: C.gold }}>+10 XP</span>
                      </div>
                    </div>
                  </div>
                  {/* Mark complete button */}
                  {!progress.find((p) => p.challenge_id === skill.id) ? (
                    <button onClick={() => completeChallenge({ id: skill.id, type: isHurling ? "hurling" : "football" })} style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, border: "none", background: sportColor, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 3px 8px ${sportColor}33` }}>
                      <CheckCircle size={16} /> I Practised for 20 Minutes!
                    </button>
                  ) : (
                    <button onClick={() => completeChallenge({ id: skill.id, type: isHurling ? "hurling" : "football" })} style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, background: C.successBg, border: `1.5px solid ${C.success}44`, textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.success, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                      <CheckCircle size={16} /> Done! (tap to undo)
                    </button>
                  )}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone Strength & Conditioning programme */}
      <div
        style={{
          background:
            "linear-gradient(135deg,#FAF5FF 0%,#F5F3FF 100%)",
          border: "1.5px solid #7C3AED33",
          borderTop: "5px solid #7C3AED",
          borderRadius: 18,
          padding: 14,
          marginBottom: 16,
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems: "center"
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: "#EDE9FE",
              display: "grid",
              placeItems: "center",
              flexShrink: 0
            }}
          >
            <img
              src="/speed-mechanics-icon.png"
              alt=""
              style={{
                width: 29,
                height: 29,
                objectFit: "contain"
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily:
                  "'League Spartan', sans-serif",
                fontWeight: 900,
                fontSize: 17,
                color: "#6D28D9"
              }}
            >
              Strength & Conditioning
            </div>

            <div
              style={{
                fontSize: 10,
                color: C.textSecondary,
                marginTop: 2,
                lineHeight: 1.4
              }}
            >
              {playerStrengthProgramme
                ? `${playerStrengthProgramme.title} · Week ${playerStrengthProgramme.week_number}`
                : "Your own S&C programme, targets and coach feedback"}
            </div>
          </div>
        </div>

        {playerStrengthProgramme ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 7,
                marginTop: 11
              }}
            >
              {[
                [
                  "THIS WEEK",
                  playerStrengthAssignments.length
                ],
                [
                  "DONE",
                  playerStrengthAssignments.filter(
                    (item) =>
                      playerStrengthProgress.find(
                        (row) =>
                          String(row.assignment_id) ===
                            String(item.assignment_id) &&
                          String(row.programme_item_id) ===
                            String(item.id) &&
                          row.status === "approved"
                      )
                  ).length
                ],
                [
                  "COACH CHECK",
                  playerStrengthAssignments.filter(
                    (item) =>
                      playerStrengthProgress.find(
                        (row) =>
                          String(row.assignment_id) ===
                            String(item.assignment_id) &&
                          String(row.programme_item_id) ===
                            String(item.id) &&
                          row.status === "pending"
                      )
                  ).length
                ]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: "8px 5px",
                    textAlign: "center",
                    border: "1px solid #7C3AED18"
                  }}
                >
                  <div
                    style={{
                      fontSize: 7,
                      fontWeight: 900,
                      color: C.textSecondary
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "'League Spartan', sans-serif",
                      fontSize: 18,
                      fontWeight: 900,
                      color: C.text,
                      marginTop: 2
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {playerStrengthProgramme.week_focus && (
              <div
                style={{
                  fontSize: 10,
                  color: "#6D28D9",
                  fontWeight: 800,
                  marginTop: 9
                }}
              >
                This week: {playerStrengthProgramme.week_focus}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontSize: 10,
              color: C.textSecondary,
              marginTop: 9
            }}
          >
            {playerStrengthLoading
              ? "Loading your programme..."
              : "No active S&C programme has been assigned yet."}
          </div>
        )}

        <button
          onClick={() => setScreen("strength")}
          style={{
            width: "100%",
            marginTop: 11,
            padding: "11px 12px",
            border: 0,
            borderRadius: 11,
            background: "#7C3AED",
            color: "#fff",
            fontFamily:
              "'League Spartan', sans-serif",
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          Open My S&C →
        </button>
      </div>

      {/* Weekly club activities set in Academy Admin */}
      {fitnessExercises.filter((ex) => (ex.activity_type || "exercise") === "club").length > 0 && (
        <div style={{ background:C.surface, border:`1.5px solid ${SECTIONS.events.color}33`, borderTop:`5px solid ${SECTIONS.events.color}`, borderRadius:18, padding:14, marginBottom:16, boxShadow:"0 4px 14px rgba(15,23,42,0.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${SECTIONS.events.color}22` }}>
            <img src="/hurling-icon.png" alt="" style={{ width:32,height:32,objectFit:"contain" }} />
            <div style={{ fontFamily:"'League Spartan', sans-serif",fontWeight:800,fontSize:14,color:SECTIONS.events.color,textTransform:"uppercase",flex:1 }}>Club Activities</div>
          </div>
          {fitnessExercises.filter((ex) => (ex.activity_type || "exercise") === "club").map((ex) => {
            const claim = progress.find((p) => p.exercise_id === ex.id);
            const status = claim?.status || null;
            const needsCoach = (ex.verification_type || "self") === "coach";
            return <div id={`activity-${ex.id}`} key={ex.id} style={{ background:C.surface,border:`2px solid ${status === "approved" ? C.success+"55" : status === "pending" ? "#f59e0b55" : SECTIONS.events.color+"33"}`,borderRadius:14,padding:14,marginBottom:8 }}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontFamily:"'League Spartan', sans-serif",fontWeight:800,fontSize:16,color:C.text}}>{ex.title}</div>{ex.description&&<div style={{fontSize:11,color:C.textSecondary,marginTop:3}}>{ex.description}</div>}</div><span style={{fontFamily:"'League Spartan', sans-serif",fontWeight:800,fontSize:12,color:C.gold}}>+{ex.xp_reward||15} XP</span></div>
              <div style={{fontSize:10,color:needsCoach?"#b45309":SECTIONS.events.color,fontWeight:700,margin:"8px 0"}}>{needsCoach?"Coach verified":"Player verified"}{ex.required?" · Required":" · Optional"}</div>
              {status === "approved" ? <div style={{padding:"10px 12px",borderRadius:10,background:C.successBg,color:C.success,fontWeight:800,fontSize:12,display:"flex",alignItems:"center",gap:7}}><CheckCircle size={18}/> {needsCoach?"Coach verified":"Completed"} · +{ex.xp_reward||15} XP</div> : status === "pending" ? <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",borderRadius:10,background:"#fff7ed",border:"1px solid #fdba7444"}}><div style={{fontWeight:800,fontSize:12,color:"#b45309"}}>⏳ Awaiting coach approval</div><button onClick={()=>completeExercise(ex)} style={{background:"none",border:"1px solid #fdba74",borderRadius:8,padding:"5px 9px",fontSize:9,fontWeight:700,color:"#b45309",cursor:"pointer"}}>Undo</button></div> : <button onClick={()=>completeExercise(ex)} style={{width:"100%",padding:11,borderRadius:10,border:"none",background:SECTIONS.events.color,color:"#fff",fontFamily:"'League Spartan', sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>{needsCoach?"I Attended":"I Did It"}</button>}
            </div>;
          })}
        </div>
      )}

      {/* Rest & Recovery */}
      <div id="academy-recovery" style={{ background:C.surface, border:`1.5px solid ${SECTIONS.recovery.color}33`, borderTop:`5px solid ${SECTIONS.recovery.color}`, borderRadius:18, padding:14, marginBottom:16, boxShadow:"0 4px 14px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom:10, borderBottom:`1px solid ${SECTIONS.recovery.color}22` }}>
          <div style={{ width:42,height:42,borderRadius:12,background:SECTIONS.recovery.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><img src={SECTIONS.recovery.icon} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} /></div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.recovery.color, textTransform: "uppercase", flex: 1 }}>Rest & Recovery</div>
        </div>
        {(() => {
          const weekNum = weeklyPlan?.week_number || 1;
          const stretch = RECOVERY_STRETCHES[(weekNum - 1) % RECOVERY_STRETCHES.length];
          const recoveryDone = progress.find((p) => p.bonus_task_id === `recovery-${weekNum}`);
          return (
            <div style={{ background: SECTIONS.recovery.bg, border: `2px solid ${SECTIONS.recovery.border}`, borderRadius: 14, padding: 14, position: "relative", overflow: "hidden" }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.recovery.color, marginBottom: 6 }}>{stretch.title}</div>
              <div style={{ fontSize: 10, color: "#166534", fontWeight: 600, marginBottom: 4 }}>Stretches: {stretch.stretches}</div>
              <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
                {stretch.how}
              </div>
              <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 8 }}>Hold for 30 seconds each side. Repeat 3 times. Breathe slowly and relax.</div>
              {!recoveryDone ? (
                <button onClick={() => completeBonus({ id: `recovery-${weekNum}`, xp_reward: 5 })} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: SECTIONS.recovery.color, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 3px 8px ${SECTIONS.recovery.color}33` }}>
                  <CheckCircle size={14} /> I Did My Stretches! (+5 XP)
                </button>
              ) : (
                <button onClick={() => completeBonus({ id: `recovery-${weekNum}`, xp_reward: 5 })} style={{ width: "100%", padding: "10px", borderRadius: 10, background: C.successBg, border: `1.5px solid ${C.success}44`, textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.success, cursor: "pointer" }}><CheckCircle size={14} /> Done — tap to undo</button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Weekly completion summary */}
      {totalRequiredTasks > 0 && completedRequiredTasks < totalRequiredTasks && (
        <div style={{ background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"12px 14px",marginBottom:14,boxShadow:"0 4px 14px rgba(15,23,42,0.05)" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:7}}>
            <span style={{fontFamily:"'League Spartan', sans-serif",fontWeight:800,fontSize:12,color:C.text,textTransform:"uppercase"}}>This week</span>
            <span style={{fontFamily:"'League Spartan', sans-serif",fontWeight:900,fontSize:13,color:C.primary}}>{completedRequiredTasks}/{totalRequiredTasks} complete</span>
          </div>
          <div style={{height:7,borderRadius:99,background:C.surfaceAlt,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round((completedRequiredTasks/totalRequiredTasks)*100)}%`,background:C.primary,borderRadius:99,transition:"width .3s"}} /></div>
        </div>
      )}

      {/* Streak */}
      <div style={{ background: "#fffbeb", border: `2px solid ${C.gold}33`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={20} color="#f97316" fill="#f97316" />
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, color: C.text, textTransform: "uppercase" }}>Keep your streak alive!</span>
        </div>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 22, color: "#f97316" }}>{selectedPlayer.week_streak || selectedPlayer.streak_weeks || 0} <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>Weeks</span></div>
      </div>

      {/* Empty state */}
      {!weeklyPlan && weekSkills.length === 0 && fitnessExercises.length === 0 && events.length === 0 && (
        <div style={{ background: C.surface, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${C.border}` }}>
          <img src={APP_ICON} alt="Spraoi" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 10 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase" }}>Nothing Set Yet</div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: "6px 0 0" }}>Your coach hasn't set anything for this week yet. Check back soon!</p>
        </div>
      )}

      {/* All done */}
      {totalRequiredTasks > 0 && completedRequiredTasks === totalRequiredTasks && (
        <div style={{ background: C.primary, borderRadius: 16, padding: 20, textAlign: "center", color: "#fff", marginTop: 12, boxShadow: "0 8px 24px rgba(26,92,45,0.3)" }}>
          <img src={APP_ICON} alt="Spraoi" style={{ width: 62, height: 62, objectFit: "contain", marginBottom: 8 }} />
          <Trophy size={28} style={{ marginBottom: 6 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 18, textTransform: "uppercase" }}>Week Complete! 🎉</div>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.9 }}>Amazing work, {selectedPlayer.name}! You completed {completedRequiredTasks} activities this week.</p>
        </div>
      )}
    </>);
  }

  function renderProgress() {
    const earnedIds = new Set(earnedBadges.map((eb) => eb.badge_id));
    const approvedCoachItems = eventSignups.filter((s) => s.status === "approved");
    const weekStreak = selectedPlayer?.week_streak || selectedPlayer?.streak_weeks || 0;
    const currentSkillRows = weekSkills.map((skill) => ({
      ...skill,
      done: completedChallengeIds.has(skill.id),
      color: (skill.sport === "hurling" || skill.sport === "camogie") ? C.hurling : C.football,
    }));
    const recentWeekKeys = [...new Set(progress.map((p) => p.created_at).filter(Boolean).map((value) => mondayKeyForDate(value)).filter(Boolean))].sort().reverse().slice(0, 4);
    return (<>
      {/* Me hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, #2f7d4b)`, color: "#fff", borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: "0 8px 22px rgba(26,92,45,.22)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", opacity: .78 }}>My Spraoi</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 24, marginTop: 3 }}>Level {level}</div>
            <div style={{ fontSize: 11, opacity: .82 }}>{xpTotal} XP earned</div>
          </div>
          <div style={{ minWidth: 78, textAlign: "center", background: "rgba(255,255,255,.14)", borderRadius: 14, padding: "10px 12px" }}>
            <Flame size={22} color="#ffd166" fill="#ffd166" />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 22 }}>{weekStreak}</div>
            <div style={{ fontSize: 9, opacity: .82 }}>week streak</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, opacity: .8, marginBottom: 4 }}><span>Level {level}</span><span>{xpInLevel(xpTotal)}/{XP_PER_LEVEL} XP</span></div>
          <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(xpInLevel(xpTotal) / XP_PER_LEVEL) * 100}%`, background: C.gold, borderRadius: 99, transition: "width .35s" }} /></div>
        </div>
      </div>

      {/* Skill progress */}
      {currentSkillRows.length > 0 && <div style={{ background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, marginBottom: 14, boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>My Skills</div>
        {currentSkillRows.map((skill) => <div key={skill.id} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: skill.color }}>{skill.name || skill.title}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: skill.done ? C.success : C.textSecondary }}>{skill.done ? "Practised ✓" : "Working on it"}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map((dot) => <span key={dot} style={{ width: 10, height: 10, borderRadius: "50%", display: "inline-block", background: dot < (skill.done ? 2 : 1) ? skill.color : C.border }} />)}</div>
        </div>)}
      </div>}

      {/* Coach verified achievements */}
      {approvedCoachItems.length > 0 && <div style={{ background: "#f0fdf4", borderRadius: 16, padding: 16, border: `1.5px solid ${C.success}33`, marginBottom: 14 }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.success, textTransform: "uppercase", marginBottom: 8 }}>Coach Verified</div>
        {approvedCoachItems.slice(0,4).map((signup) => { const evt = events.find((e) => e.id === signup.event_id); return <div key={signup.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.success}18` }}><CheckCircle size={16} color={C.success}/><div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: C.text }}>{evt?.title || "Coach verified activity"}</div><span style={{ fontSize: 9, fontWeight: 800, color: C.success }}>VERIFIED</span></div>; })}
      </div>}

      {/* Recent weeks */}
      {recentWeekKeys.length > 0 && <div style={{ background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, textTransform: "uppercase", marginBottom: 9 }}>Recent Weeks</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{recentWeekKeys.map((key) => <div key={key} style={{ background: C.surfaceAlt, borderRadius: 10, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: C.text }}><CheckCircle size={13} color={C.success} style={{ verticalAlign: "middle", marginRight: 4 }}/>{new Date(`${key}T12:00:00`).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}</div>)}</div>
      </div>}

      {/* All Badges */}
      <div style={{ background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, marginBottom: 14, boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>Badges</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {badges.map((b) => {
            const earned = earnedIds.has(b.id) || (b.xp_threshold && xpTotal >= b.xp_threshold);
            return (
              <div key={b.id} style={{ textAlign: "center", background: earned ? C.successBg : C.surfaceAlt, borderRadius: 14, padding: "12px 6px", border: `1.5px solid ${earned ? C.success + "44" : C.border}`, opacity: earned ? 1 : 0.5 }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{b.emoji}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: earned ? C.text : C.textSecondary }}>{b.name}</div>
                <div style={{ fontSize: 8, color: C.textSecondary, marginTop: 2 }}>{b.description}</div>
                {earned && <div style={{ fontSize: 8, fontWeight: 700, color: C.success, marginTop: 3 }}>Earned!</div>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Progress to next badge */}
      {(() => { const next = badges.filter((b) => b.xp_threshold && xpTotal < b.xp_threshold).sort((a, b) => a.xp_threshold - b.xp_threshold)[0]; return next ? (
        <div style={{ background: "#fffbeb", borderRadius: 14, padding: 14, border: `1.5px solid ${C.gold}33`, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{next.emoji}</span>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, color: C.text }}>Next: {next.name}</div>
              <div style={{ fontSize: 10, color: C.textSecondary }}>{next.xp_threshold - xpTotal} XP to go</div>
            </div>
          </div>
          <div style={{ height: 8, background: C.gold + "22", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (xpTotal / next.xp_threshold) * 100)}%`, background: C.gold, borderRadius: 4 }} />
          </div>
        </div>
      ) : null; })()}
      {/* Week stats */}
      <div style={{ background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>This Week</div>
        {weekSkills.map((skill) => { const done = completedChallengeIds.has(skill.id); const isHurling = skill.sport === "hurling" || skill.sport === "camogie"; const col = isHurling ? C.hurling : C.football; return (
          <div key={skill.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
            <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{isHurling ? (skill.sport === "camogie" ? "Camogie" : "Hurling") : "Football"}</span><br /><span style={{ fontSize: 11, color: C.textSecondary }}>{skill.name}</span></div>
            {done ? <CheckCircle size={16} color={C.success} /> : <Circle size={16} color={C.border} />}
          </div>
        ); })}
      </div>
    </>);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.background, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(60vh) rotate(720deg); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 90px" }}>

        {/* XP pop + confetti celebration */}
        {showXpPop && (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", animation: "fadeIn .2s" }}>
          {/* Confetti particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", width: 8 + Math.random() * 8, height: 8 + Math.random() * 8, borderRadius: Math.random() > 0.5 ? "50%" : "2px", background: ["#F58220", "#E53935", "#7B3FA1", "#2E7D32", "#0277bd", "#f4c542", "#ff6b6b"][i % 7], top: `${10 + Math.random() * 30}%`, left: `${10 + Math.random() * 80}%`, animation: `confettiFall ${1 + Math.random()}s ease-out forwards`, animationDelay: `${Math.random() * 0.3}s`, opacity: 0.9 }} />
          ))}
          <div style={{ background: "#fff", borderRadius: 24, padding: "28px 40px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <Zap size={28} color={C.gold} fill={C.gold} />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 24, color: C.gold, marginTop: 6 }}>+XP!</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Great work! Keep going!</div>
          </div>
        </div>)}

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={APP_ICON} alt="Spraoi Sports" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 16, color: C.primary }}>SPRAOI</span>
          </div>
          {hasCoachAccess ? (
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:3,
              background:"#F1F5F9",
              borderRadius:20,
              padding:3,
              border:`1px solid ${C.border}`
            }}>
              {selectedPlayer && (
                <button
                  onClick={() => switchAppContext("player")}
                  style={{
                    border:0,
                    borderRadius:16,
                    padding:"6px 10px",
                    background:activeContext === "player" ? "#fff" : "transparent",
                    color:activeContext === "player" ? C.primary : C.textSecondary,
                    fontFamily:"'League Spartan', sans-serif",
                    fontWeight:800,
                    fontSize:10,
                    cursor:"pointer"
                  }}
                >
                  Player
                </button>
              )}

              <button
                onClick={() => switchAppContext("coach")}
                style={{
                  border:0,
                  borderRadius:16,
                  padding:"6px 10px",
                  background:activeContext === "coach" ? "#7C3AED" : "transparent",
                  color:activeContext === "coach" ? "#fff" : C.textSecondary,
                  fontFamily:"'League Spartan', sans-serif",
                  fontWeight:800,
                  fontSize:10,
                  cursor:"pointer"
                }}
              >
                Coach
              </button>
            </div>
          ) : (
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:6,
              background:"#fff3e0",
              borderRadius:20,
              padding:"5px 12px"
            }}>
              <Flame size={14} color="#f97316" fill="#f97316" />
              <span style={{
                fontFamily:"'League Spartan', sans-serif",
                fontWeight:800,
                fontSize:14,
                color:"#f97316"
              }}>
                {selectedPlayer?.week_streak || selectedPlayer?.streak_weeks || 0}
              </span>
              <span style={{ fontSize:10, color:C.textSecondary }}>
                week streak
              </span>
            </div>
          )}
        </div>

        {/* Player card with toggle */}
        {activeContext !== "coach" && selectedPlayer && <div style={{ background: C.primary, borderRadius: 16, padding: "14px 16px", color: "#fff", marginBottom: 14, boxShadow: "0 6px 18px rgba(26,92,45,0.25)" }}>
          <button onClick={() => players.length > 1 && setShowChildSwitch(!showChildSwitch)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "#fff", cursor: players.length > 1 ? "pointer" : "default", padding: 0, textAlign: "left" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{selectedPlayer.avatar_emoji || selectedPlayer.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17 }}>{selectedPlayer.name}</span>
                {players.length > 1 && (showChildSwitch ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Level {level}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 20, color: C.gold }}>{xpTotal}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>XP</div>
            </div>
          </button>
          {/* XP to next level */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.7, marginBottom: 3 }}><span>Level {level}</span><span>{xpInLevel(xpTotal)}/{XP_PER_LEVEL} to Level {level + 1}</span></div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(xpInLevel(xpTotal) / XP_PER_LEVEL) * 100}%`, background: C.gold, borderRadius: 3 }} /></div>
          </div>
          {/* Child switcher */}
          {showChildSwitch && players.length > 1 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              {players.filter((p) => p.id !== selectedPlayer.id).map((p) => (
                <button key={p.id} onClick={() => { selectPlayer(p); setShowChildSwitch(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px 10px", marginBottom: 4, cursor: "pointer", color: "#fff" }}>
                  <span>{p.avatar_emoji || p.name[0]}</span>
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>}

        {/* Content */}
        {screen === "home" && selectedPlayer && renderWeeklyPractice()}
        {screen === "strength" && selectedPlayer && renderPlayerStrength()}
        {screen === "calendar" && selectedPlayer && (
          <ParentUpdates
            userId={session?.user?.id}
            players={players}
            selectedPlayer={selectedPlayer}
            view="calendar"
          />
        )}
        {screen === "parent-home" && selectedPlayer && renderParentHome()}
        {screen === "progress" && selectedPlayer && renderProgress()}
        {screen === "learn" && (
          <div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>Skills</div>
            {/* Filter */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.surfaceAlt, borderRadius: 10, padding: 3 }}>
              {[{ id: "all", label: "All" }, { id: "hurling", label: "Hurling" }, { id: "football", label: "Football" }].map((f) => (
                <button key={f.id} onClick={() => setLearnFilter(f.id)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", background: learnFilter === f.id ? C.surface : "transparent", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: learnFilter === f.id ? C.text : C.textSecondary, cursor: "pointer", boxShadow: learnFilter === f.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Skills list */}
            {allSkills.filter((s) => s.video_url && (learnFilter === "all" || s.sport === learnFilter)).map((skill) => {
              const isHurling = skill.sport === "hurling";
              const sportColor = isHurling ? C.hurling : C.football;
              const sportBg = isHurling ? C.hurlingBg : C.footballBg;
              const catIcon = isHurling ? "/hurling-icon.png" : "/football-icon.png";
              return (
                <div key={skill.id} style={{ background: sportBg, border: `1.5px solid ${sportColor}18`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={catIcon} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text }}>{skill.name}</div>
                      <div style={{ fontSize: 9, color: C.textSecondary, textTransform: "capitalize" }}>{skill.category?.replace(/_/g, " ") || skill.sport}</div>
                    </div>
                    {skill.video_url && <span style={{ fontSize: 10, background: "#ff000015", color: "#cc0000", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Video</span>}
                  </div>
                  {skill.video_url && (
                    <div style={{ padding: "0 14px 10px" }}>
                      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${sportColor}22`, background: "#000" }}>
                        <iframe src={skill.video_url.replace("watch?v=", "embed/").split("&")[0]} style={{ width: "100%", height: 160, border: "none", display: "block" }} allow="accelerometer; autoplay; encrypted-media; gyroscope" allowFullScreen title={skill.name} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {screen === "updates" && (
          <ParentUpdates userId={session?.user?.id} players={players} selectedPlayer={selectedPlayer} />
        )}

        {/* Profile */}
        {screen === "profile" && (
          <div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>
              Profile
            </div>

            <div style={{ background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.05)", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 20 }}>
                  {(session?.user?.email || "P")[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 15, color: C.text }}>Parent account</div>
                  <div style={{ fontSize: 11, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {session?.user?.email || ""}
                  </div>
                </div>
              </div>
            </div>

            {selectedPlayer && (
              <div style={{ background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                  Current child
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.primary + "18", color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 900 }}>
                    {selectedPlayer.avatar_emoji || selectedPlayer.name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text }}>{selectedPlayer.name}</div>
                    <div style={{ fontSize: 10, color: C.textSecondary }}>Level {level} · {xpTotal} XP</div>
                  </div>
                </div>

                {players.length > 1 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Your children</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {players.map((player) => {
                        const active = player.id === selectedPlayer.id;
                        return (
                          <button key={player.id} onClick={() => selectPlayer(player)} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary + "10" : C.surfaceAlt, cursor: "pointer", textAlign: "left" }}>
                            <span style={{ width: 28, height: 28, borderRadius: "50%", background: active ? C.primary : C.border, color: active ? "#fff" : C.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                              {player.avatar_emoji || player.name?.[0]}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{player.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            
            <PushNotificationsCard userId={session?.user?.id} />

            <div style={{
              background:C.surface,
              borderRadius:16,
              padding:18,
              border:`1px solid ${C.border}`,
              boxShadow:"0 4px 14px rgba(0,0,0,0.05)",
              marginBottom:14
            }}>
              <div style={{
                fontFamily:"'League Spartan',sans-serif",
                fontWeight:800,
                fontSize:14,
                color:C.text
              }}>
                Parent PIN
              </div>

              <div style={{
                fontSize:11,
                color:C.textSecondary,
                lineHeight:1.5,
                marginTop:5,
                marginBottom:12
              }}>
                Your 4-digit PIN protects messages, events
                and parent-only controls.
              </div>

              <button
                type="button"
                onClick={()=>{
                  setParentGateTarget("profile");
                  setNewParentPin("");
                  setConfirmParentPinValue("");
                  setParentPinError("");
                  setPinSetupOpen(true);
                }}
                style={{
                  width:"100%",
                  boxSizing:"border-box",
                  padding:"11px 14px",
                  borderRadius:12,
                  border:`1px solid ${C.border}`,
                  background:"#fff",
                  color:C.text,
                  fontFamily:"'League Spartan',sans-serif",
                  fontWeight:800,
                  fontSize:12,
                  cursor:"pointer"
                }}
              >
                Change parent PIN
              </button>
            </div>

            <button onClick={logout} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              <LogOut size={17} />
              Log out
            </button>
          </div>
        )}

        {/* Coach screen — admin only via ?admin=true */}
        {screen === "coach" && hasCoachAccess && (
          <CoachExerciseManager
            coachTeams={coachTeams}
            coachSelectedTeam={coachSelectedTeam}
            coachPlan={coachPlan}
            coachExercises={coachExercises}
            coachEvents={coachEvents}
            onSelectTeam={loadCoachPlan}
            onAddExercise={addExercise}
            onRemoveExercise={removeExercise}
            onAddEvent={addEvent}
            onRemoveEvent={removeEvent}
            ageGroups={ageGroups}
          />
        )}
      </div>

      {pinSetupOpen && (
        <div style={{
          position:"fixed",
          inset:0,
          background:"rgba(15,23,42,.56)",
          zIndex:210,
          display:"grid",
          placeItems:"center",
          padding:20
        }}>
          <div style={{
            width:"100%",
            maxWidth:350,
            background:"#fff",
            borderRadius:20,
            padding:20,
            boxShadow:"0 24px 70px rgba(15,23,42,.28)"
          }}>
            <div style={{
              fontFamily:"'League Spartan',sans-serif",
              fontSize:22,
              fontWeight:900,
              color:C.text
            }}>
              Set parent PIN
            </div>

            <div style={{
              fontSize:12,
              color:C.textSecondary,
              lineHeight:1.5,
              marginTop:6
            }}>
              Choose a 4-digit PIN for parent-only areas
              of Spraoi.
            </div>

            <input
              value={newParentPin}
              onChange={e=>
                setNewParentPin(
                  e.target.value.replace(/\D/g,"").slice(0,4)
                )
              }
              inputMode="numeric"
              maxLength={4}
              autoFocus
              placeholder="••••"
              style={{
                width:"100%",
                boxSizing:"border-box",
                marginTop:16,
                height:52,
                border:`1.5px solid ${C.border}`,
                borderRadius:14,
                textAlign:"center",
                fontSize:26,
                letterSpacing:10,
                fontWeight:900
              }}
            />

            <input
              value={confirmParentPinValue}
              onChange={e=>
                setConfirmParentPinValue(
                  e.target.value.replace(/\D/g,"").slice(0,4)
                )
              }
              inputMode="numeric"
              maxLength={4}
              placeholder="Confirm PIN"
              style={{
                width:"100%",
                boxSizing:"border-box",
                marginTop:10,
                height:48,
                border:`1.5px solid ${C.border}`,
                borderRadius:14,
                textAlign:"center",
                fontSize:20,
                letterSpacing:7,
                fontWeight:900
              }}
            />

            {parentPinError &&
              <div style={{
                marginTop:10,
                padding:9,
                borderRadius:10,
                background:"#fef2f2",
                color:"#b91c1c",
                fontSize:10,
                fontWeight:700
              }}>
                {parentPinError}
              </div>
            }

            <div style={{
              display:"flex",
              gap:8,
              marginTop:12
            }}>
              <button
                type="button"
                onClick={()=>{
                  setPinSetupOpen(false);
                  setParentPinError("");
                }}
                style={{
                  flex:1,
                  height:42,
                  border:`1px solid ${C.border}`,
                  borderRadius:12,
                  background:"#fff",
                  fontWeight:800
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveParentPin}
                disabled={
                  pinSaving ||
                  newParentPin.length !== 4 ||
                  confirmParentPinValue.length !== 4
                }
                style={{
                  flex:1,
                  height:42,
                  border:0,
                  borderRadius:12,
                  background:
                    newParentPin.length === 4 &&
                    confirmParentPinValue.length === 4
                      ? "#2563EB"
                      : "#CBD5E1",
                  color:"#fff",
                  fontWeight:900
                }}
              >
                {pinSaving ? "Saving..." : "Save PIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showParentGate && (
        <div style={{
          position:"fixed",
          inset:0,
          background:"rgba(15,23,42,.56)",
          zIndex:200,
          display:"grid",
          placeItems:"center",
          padding:20
        }}>
          <div style={{
            width:"100%",
            maxWidth:340,
            background:"#fff",
            borderRadius:20,
            padding:20,
            boxShadow:"0 24px 70px rgba(15,23,42,.28)"
          }}>
            <div style={{
              fontFamily:"'League Spartan',sans-serif",
              fontSize:22,
              fontWeight:900,
              color:C.text
            }}>
              Parent mode
            </div>

            <div style={{
              fontSize:12,
              color:C.textSecondary,
              lineHeight:1.5,
              marginTop:6
            }}>
              Enter your 4-digit parent PIN.
            </div>

            <input
              value={parentPin}
              onChange={e=>{
                const nextPin =
                  e.target.value.replace(/\D/g,"").slice(0,4);

                setParentPin(nextPin);
                setParentPinError("");

                if (nextPin.length === 4) {
                  confirmParentMode(nextPin);
                }
              }}
              onKeyDown={e=>{
                if (e.key === "Enter" && parentPin.length === 4) {
                  confirmParentMode();
                }
              }}
              inputMode="numeric"
              maxLength={4}
              autoFocus
              placeholder="••••"
              style={{
                width:"100%",
                boxSizing:"border-box",
                marginTop:16,
                height:52,
                border:`1.5px solid ${C.border}`,
                borderRadius:14,
                textAlign:"center",
                fontSize:26,
                letterSpacing:10,
                fontWeight:900
              }}
            />

            {parentPinError &&
              <div style={{
                marginTop:10,
                padding:9,
                borderRadius:10,
                background:"#fef2f2",
                color:"#b91c1c",
                fontSize:10,
                fontWeight:700
              }}>
                {parentPinError}
              </div>
            }

            <div style={{
              display:"flex",
              gap:8,
              marginTop:12
            }}>
              <button
                type="button"
                onClick={()=>{
                  setShowParentGate(false);
                  setParentPinError("");
                }}
                style={{
                  flex:1,
                  height:42,
                  border:`1px solid ${C.border}`,
                  borderRadius:12,
                  background:"#fff",
                  fontWeight:800
                }}
              >
                Cancel
              </button>


            </div>
          </div>
        </div>
      )}

      <ImportantNotificationModal
        notification={parentNotifications.important}
        onClose={() => parentNotifications.important && parentNotifications.markModalShown(parentNotifications.important)}
        onView={() => {
          if (parentNotifications.important) {
            parentNotifications.markModalShown(
              parentNotifications.important
            );
          }

          if (parentModeUnlocked) {
            setScreen("updates");
          } else {
            openParentMode("updates");
          }
        }}
      />

      {/* Bottom nav */}
      {!isAdminUrl && activeContext !== "coach" && (
        <div style={{ position:"fixed", left:"50%", transform:"translateX(-50%)", bottom:0, width:"100%", maxWidth:460, background:"#fff", borderTop:`1px solid ${C.border}`, padding:"7px 8px calc(7px + env(safe-area-inset-bottom))", display:"flex", gap:4, zIndex:50, boxShadow:"0 -8px 24px rgba(15,23,42,.08)" }}>
          {[
            { key:"home", label:"Home", icon:Home },
            { key:"calendar", label:"Events", icon:CalendarDays },
            { key:"updates", label:"Messages", icon:Bell },
            { key:"learn", label:"Skills", icon:BookOpen },
            { key:"more", label:"Profile", icon:User },
          ].map((item) => {
            const target = item.key === "more" ? "profile" : item.key;
            const active = screen === target;
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => {
                if (
                  ["calendar","updates","more"].includes(item.key) &&
                  !parentModeUnlocked
                ) {
                  openParentMode(
                    item.key === "more"
                      ? "parent-home"
                      : item.key
                  );
                  return;
                }

                setScreen(target);
              }} style={{ flex:1, minWidth:0, border:0, borderRadius:12, background:active ? "#EEF5FF" : "transparent", color:active ? "#2563EB" : C.textSecondary, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"6px 2px", cursor:"pointer" }}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontSize:9, fontWeight:800 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
