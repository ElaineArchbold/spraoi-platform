import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { CheckCircle, Circle, Trophy, Flame, Target, Zap, Home, Award, BookOpen, LogOut, Plus, ChevronDown, ChevronUp, User } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("A new Spraoi Academy version is available.");
  },
  onOfflineReady() {
    console.log("Spraoi Academy is ready for offline use.");
  },
});

/* ============================================================
   SPRAOI ACADEMY   Kid-facing missions & progress
   Green brand (matches spraoisports.com), sport-colored cards,
   missions language, streaks, XP, badges.
   ============================================================ */
const C = {
  // Spraoi Academy blue
  primary: "#0EA5E9",
  primaryBright: "#38BDF8",
  primaryDark: "#0369A1",
  // Sport colors
  hurling: "#c51417",
  hurlingBg: "#fef2f2",
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

const BRAND_LOGO = "/spraoi-academy-icon.png";
const APP_ICON = "/spraoi-academy-icon.png";

// Icon-only Academy sections. Mascots intentionally removed.
const SECTIONS = {
  missions: { icon: "/spraoi-academy-icon.png", color: C.primary, bg: "#e0f2fe", border: "#bae6fd" },
  skills: { icon: "/spraoi-academy-icon.png", color: C.primaryDark, bg: "#eff6ff", border: "#bfdbfe" },
  fitness: { icon: "/speed-mechanics-icon.png", color: C.athletic, bg: C.athleticBg, border: "#fde68a" },
  recovery: { icon: "/rest-and-recovery-icon.png", color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
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
function CoachExerciseManager({ coachTeams, coachSelectedTeam, coachPlan, coachExercises, coachEvents, onSelectTeam, onAddExercise, onRemoveExercise, onAddEvent, onRemoveEvent, ageGroups }) {
  const [tab, setTab] = useState("exercises");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newXp, setNewXp] = useState("5");
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtDate, setEvtDate] = useState("");
  const [evtTime, setEvtTime] = useState("");
  const [evtLocation, setEvtLocation] = useState("");
  const [evtRecurring, setEvtRecurring] = useState(false);
  const [previewDrills, setPreviewDrills] = useState([]);

  // Load preview drills when plan changes
  useEffect(() => {
    if (coachPlan) {
      supabase.from("sessions").select("id, session_activities(*, activity:activities(id, title, sport, category, duration_mins, skill:skills!activities_skill_id_fkey(name)))").eq("plan_id", coachPlan.id).then(({ data }) => {
        const drills = [];
        (data || []).forEach((s) => (s.session_activities || []).sort((a, b) => a.sort_order - b.sort_order).forEach((sa) => { if (sa.activity) drills.push(sa.activity); }));
        setPreviewDrills(drills);
      });
    } else { setPreviewDrills([]); }
  }, [coachPlan]);

  const presets = [
    { title: "3 x Laps of the pitch", desc: "Run 3 full laps at a steady pace", xp: 10 },
    { title: "5 x Sprints (20m)", desc: "Sprint 20 metres, walk back, repeat", xp: 8 },
    { title: "20 Star Jumps", desc: "Do 20 star jumps in a row", xp: 5 },
    { title: "10 Burpees", desc: "Complete 10 burpees with good form", xp: 8 },
    { title: "30s Wall Sit", desc: "Hold a wall sit for 30 seconds", xp: 5 },
    { title: "Shuttle Runs (5 x 10m)", desc: "Sprint to cone and back, 5 times", xp: 8 },
    { title: "20 High Knees", desc: "High knees on the spot, 20 each side", xp: 5 },
    { title: "Plank for 30s", desc: "Hold a plank position for 30 seconds", xp: 5 },
  ];

  function handleAdd() {
    if (!newTitle.trim()) return;
    onAddExercise(newTitle.trim(), newDesc.trim(), parseInt(newXp) || 5);
    setNewTitle(""); setNewDesc(""); setNewXp("5");
  }

  function addPreset(preset) {
    onAddExercise(preset.title, preset.desc, preset.xp);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase" }}>Coach Panel</div>
        <div style={{ fontSize: 10, color: C.textSecondary }}>Academy Admin</div>
      </div>

      {/* Team selector */}
      <div style={{ background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Select Team</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {coachTeams.map((team) => {
            const active = coachSelectedTeam?.id === team.id;
            return (
              <button key={team.id} onClick={() => onSelectTeam(team)} style={{ padding: "10px 12px", borderRadius: 12, border: `2px solid ${active ? C.primary : C.border}`, background: active ? C.primary : C.surface, color: active ? "#fff" : C.text, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                <div>{team.label}</div>
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{team.gender === "girls" ? "Girls" : "Boys"}</div>
              </button>
            );
          })}
        </div>
      </div>

      {!coachSelectedTeam && (
        <div style={{ background: C.surface, borderRadius: 14, padding: 24, textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.textSecondary }}>Select a team to manage their Academy content.</div>
        </div>
      )}

      {coachSelectedTeam && !coachPlan && (
        <div style={{ background: "#fff8e1", borderRadius: 14, padding: 16, border: `1px solid #ffe082` }}>
          <div style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>No plan found for {coachSelectedTeam.label}. Save a session in Coach app first.</div>
        </div>
      )}

      {coachSelectedTeam && coachPlan && (
        <>
          {/* Plan info */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.primary + "10", borderRadius: 10, marginBottom: 12, border: `1px solid ${C.primary}22` }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.primary }}>{coachSelectedTeam.label} {coachSelectedTeam.gender === "girls" ? "Girls" : "Boys"}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.primary }}>Week {coachPlan.week_number}</div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.surfaceAlt, borderRadius: 10, padding: 3 }}>
            {[{ id: "exercises", label: "Fitness" }, { id: "events", label: "Events" }, { id: "preview", label: "Preview" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", background: tab === t.id ? C.surface : "transparent", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: tab === t.id ? C.text : C.textSecondary, cursor: "pointer", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* EXERCISES TAB */}
          {tab === "exercises" && (<div>
              {coachExercises.map((ex) => (
                <div key={ex.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/speed-mechanics-icon.png" alt="" style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{ex.title}</div>
                    {ex.description && <div style={{ fontSize: 10, color: C.textSecondary }}>{ex.description}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>+{ex.xp_reward} XP</span>
                  <button onClick={() => onRemoveExercise(ex.id)} style={{ background: "none", border: "none", color: "#e64a19", cursor: "pointer", fontSize: 16, padding: "2px" }}> </button>
                </div>
              ))}

          {/* Quick presets */}
          <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Quick Add</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {presets.map((p) => (
                <button key={p.title} onClick={() => addPreset(p)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 10, fontWeight: 600, color: C.text, cursor: "pointer" }}>
                  + {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Custom add */}
          <div style={{ background: C.surface, borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Add Custom Exercise</div>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. 5 x Hill Sprints" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, marginBottom: 8, background: C.surfaceAlt }} />
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, marginBottom: 8, background: C.surfaceAlt }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: C.textSecondary }}>XP:</span>
                <input type="number" value={newXp} onChange={(e) => setNewXp(e.target.value)} style={{ width: 40, padding: "6px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, textAlign: "center" }} />
              </div>
              <button onClick={handleAdd} disabled={!newTitle.trim()} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: newTitle.trim() ? C.primary : C.border, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: newTitle.trim() ? "pointer" : "default" }}>
                Add Exercise
              </button>
            </div>
          </div>
          </div>)}

          {/* EVENTS TAB */}
          {tab === "events" && (<div>
            {(coachEvents || []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", marginBottom: 6 }}>Active Events</div>
                {(coachEvents || []).map((evt) => (
                  <div key={evt.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: C.primary + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>??</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{evt.title}</div>
                      <div style={{ fontSize: 10, color: C.textSecondary }}>{evt.event_date ? new Date(evt.event_date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }) : ""} {evt.event_time || ""} {evt.recurring ? "  Weekly" : ""}</div>
                    </div>
                    <button onClick={() => onRemoveEvent(evt.id)} style={{ background: "none", border: "none", color: "#e64a19", cursor: "pointer", fontSize: 16 }}> </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>New Event</div>
              <input type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="e.g. Friday Night Hurling" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 12, marginBottom: 6, background: C.surfaceAlt }} />
              <input type="text" value={evtDesc} onChange={(e) => setEvtDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, marginBottom: 6, background: C.surfaceAlt }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }} />
                <input type="text" value={evtTime} onChange={(e) => setEvtTime(e.target.value)} placeholder="7pm" style={{ width: 60, padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                <input type="text" value={evtLocation} onChange={(e) => setEvtLocation(e.target.value)} placeholder="Location" style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textSecondary, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={evtRecurring} onChange={(e) => setEvtRecurring(e.target.checked)} /> Weekly
                </label>
              </div>
              <button onClick={() => { if (!evtTitle.trim()) return; onAddEvent({ title: evtTitle.trim(), description: evtDesc || null, event_date: evtDate || null, event_time: evtTime || null, location: evtLocation || null, recurring: evtRecurring, xp_reward: 15 }); setEvtTitle(""); setEvtDesc(""); setEvtDate(""); setEvtTime(""); setEvtLocation(""); setEvtRecurring(false); }} disabled={!evtTitle.trim()} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: evtTitle.trim() ? C.primary : C.border, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, cursor: evtTitle.trim() ? "pointer" : "default" }}>
                Add Event
              </button>
            </div>
          </div>)}

          {/* PREVIEW TAB */}
          {tab === "preview" && (<div>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", marginBottom: 10 }}>What players will see this week</div>
            {previewDrills.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>Training Drills ({previewDrills.length})</div>
                {previewDrills.map((d, i) => (
                  <div key={d.id + "-" + i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.sport === "hurling" ? C.hurling : C.football }} />
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.text }}>{d.title}</div>
                    <span style={{ fontSize: 9, color: C.textSecondary }}>{d.duration_mins || "?"}min</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, textAlign: "center", marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.textSecondary }}>No training drills   save a session in Coach app</div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>Fitness ({coachExercises.length})</div>
              {coachExercises.length > 0 ? coachExercises.map((ex) => (
                <div key={ex.id} style={{ background: C.athleticBg, border: `1px solid ${C.athletic}22`, borderRadius: 10, padding: "8px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <Circle size={14} color={C.athletic} />
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.text }}>{ex.title}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.gold }}>+{ex.xp_reward}</span>
                </div>
              )) : <div style={{ fontSize: 11, color: C.textSecondary }}>None set</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>Events ({(coachEvents || []).length})</div>
              {(coachEvents || []).length > 0 ? (coachEvents || []).map((evt) => (
                <div key={evt.id} style={{ background: C.surface, border: `1.5px solid ${C.primary}33`, borderRadius: 10, padding: "8px 10px", marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{evt.title}</div>
                  <div style={{ fontSize: 9, color: C.textSecondary }}>{evt.event_date ? new Date(evt.event_date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }) : ""} {evt.event_time || ""}</div>
                </div>
              )) : <div style={{ fontSize: 11, color: C.textSecondary }}>No events</div>}
            </div>
          </div>)}
        </>
      )}
    </div>
  );
}


export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [club, setClub] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [homework, setHomework] = useState([]);
  const [bonusTasks, setBonusTasks] = useState([]);
  const [trainingDrills, setTrainingDrills] = useState([]); // drills from coach's sessions this week
  const [fitnessExercises, setFitnessExercises] = useState([]); // runs, star jumps etc set by coach
  const [weekSkills, setWeekSkills] = useState([]); // unique skills from this week's drills
  const [skillChallenges, setSkillChallenges] = useState([]); // challenges matching this week's skills
  const [progress, setProgress] = useState([]);
  const [badges, setBadges] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [screen, setScreen] = useState("home");
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
  const [allSkills, setAllSkills] = useState([]); // full skill library for Learn tab
  const [allChallenges, setAllChallenges] = useState([]); // all challenges
  const [learnFilter, setLearnFilter] = useState("all"); // all | hurling | football

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadParentData(s.user.id);
      else setInitialLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); if (s) loadParentData(s.user.id); });
    return () => subscription.unsubscribe();
  }, []);

  async function loadParentData(userId) {
    const { data: clubData } = await supabase.from("clubs").select("*").eq("slug", "fingallians").single();
    setClub(clubData);
    if (clubData) { const { data: ag } = await supabase.from("age_groups").select("*").eq("club_id", clubData.id).order("label"); setAgeGroups(ag || []); if (isAdminUrl) setCoachTeams(ag || []); }
    // Check if user is a coach/admin
    // user_roles has existed with different identity column names across platform builds.
    // Do not query a column that may not exist; load rows and match the available identity field.
    const { data: roleRows, error: roleErr } = await supabase.from("user_roles").select("*");
    if (roleErr) console.log("Role query error:", roleErr.message);
    const roleData = (roleRows || []).find((row) =>
      [row.user_id, row.auth_user_id, row.profile_id, row.id]
        .filter(Boolean)
        .some((value) => String(value) === String(userId))
    ) || null;
    if (roleData && (roleData.role === "super_admin" || roleData.role === "club_admin" || roleData.role === "coach" || roleData.role === "lead_coach" || roleData.role === "coach_mentor")) {
      setUserRole(roleData);
      // Load teams this coach is assigned to
      const { data: assignments } = await supabase.from("coach_assignments").select("age_group_id").eq("user_id", userId);
      if (assignments && assignments.length > 0) {
        const teamIds = assignments.map((a) => a.age_group_id);
        const { data: teams } = await supabase.from("age_groups").select("*").eq("club_id", clubData.id).in("id", teamIds).order("label");
        setCoachTeams(teams || []);
      } else if (roleData.role === "super_admin") {
        // Super admin sees all teams
        const { data: allTeams } = await supabase.from("age_groups").select("*").eq("club_id", clubData.id).order("label");
        setCoachTeams(allTeams || []);
      }
    }
    const { data: kids } = await supabase.from("journey_players").select("*").eq("parent_user_id", userId).order("name");
    setPlayers(kids || []);
    const { data: b } = await supabase.from("badges").select("*"); setBadges(b || []);
    // Load skill library + challenges for Learn tab
    const { data: sk } = await supabase.from("skills").select("*").order("sport, name"); setAllSkills(sk || []);
    const { data: ch } = await supabase.from("challenges").select("*").order("sport, title"); setAllChallenges(ch || []);
    if (kids && kids.length === 1) selectPlayer(kids[0]);
    else if (kids && kids.length > 0) selectPlayer(kids[0]);
    setInitialLoading(false);
  }

  async function selectPlayer(player) {
    setSelectedPlayer(player);
    setLoadingPlayers(false);
    try {
      const { data: prog } = await supabase.from("player_progress").select("*").eq("player_id", player.id);
      setProgress(prog || []);
      const { data: eb } = await supabase.from("player_badges").select("*").eq("player_id", player.id);
      setEarnedBadges(eb || []);
      if (player.age_group_id) {
        const { data: plans } = await supabase.from("weekly_plans").select("*").eq("age_group_id", player.age_group_id).eq("published", true).order("week_number", { ascending: false }).limit(1);
        const plan = plans && plans.length > 0 ? plans[0] : null;
        setWeeklyPlan(plan);
        if (plan) {
          // First preference: explicitly saved homework challenge IDs on the weekly plan.
          const hw = [];
          if (plan.hurling_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.hurling_challenge_id).single(); if (ch) hw.push({ ...ch, type: "hurling" }); }
          if (plan.football_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.football_challenge_id).single(); if (ch) hw.push({ ...ch, type: "football" }); }
          if (plan.athletic_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.athletic_challenge_id).single(); if (ch) hw.push({ ...ch, type: "athletic" }); }

          // Academy Admin saves the selected Coach-plan skill under the code keys
          // `football` and `hurling` in academy_video_overrides. Resolve those exact
          // skills here so the child app follows the Admin choice rather than a generic fallback.
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

          // If no challenge was explicitly saved, resolve the child challenge attached
          // to each selected Academy skill. This is the agreed:
          // Skill -> Coach Activity/Drill -> Child Challenge/Homework model.
          if (hw.length === 0 && selectedSkills.length) {
            const selectedIds = selectedSkills.map((skill) => skill.id);
            const { data: linkedChallenges } = await supabase.from("challenges").select("*").in("skill_id", selectedIds);
            selectedSkills.forEach((skill) => {
              const challenge = (linkedChallenges || []).find((item) => item.skill_id === skill.id);
              if (challenge) hw.push({ ...challenge, type: skill.academyType });
            });
          }
          setHomework(hw);

          const assignedSkillIds = [...new Set(hw.map((ch)=>ch.skill_id).filter(Boolean))];
          let assignedSkills = [];
          if (assignedSkillIds.length) {
            const { data: linkedSkills } = await supabase.from("skills").select("*").in("id", assignedSkillIds);
            assignedSkills = linkedSkills || [];
          }
          const { data: bonus } = await supabase.from("bonus_tasks").select("*").eq("plan_id", plan.id); setBonusTasks(bonus || []);
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
          // Load challenges that match these skills
          const skillIds = Object.keys(skillMap);
          let matchedChallenges = [];
          if (skillIds.length > 0) {
            const { data: ch } = await supabase.from("challenges").select("*").in("skill_id", skillIds);
            matchedChallenges = ch || [];
          }
          // Exact Academy selections win, followed by explicitly assigned challenge skills.
          // Coach-session skills are only the fallback when Academy has not selected a skill.
          const selectedSkillList = selectedSkills.map(({ academyType, ...skill }) => skill);
          setWeekSkills(selectedSkillList.length ? selectedSkillList : assignedSkills.length ? assignedSkills : Object.values(skillMap));
          setSkillChallenges(hw.length ? hw : matchedChallenges);
          // Only use a library fallback when there is genuinely no Academy selection and no Coach drill skill.
          if (selectedSkillList.length === 0 && assignedSkills.length === 0 && skillIds.length === 0) {
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
        } else { setHomework([]); setBonusTasks([]); setTrainingDrills([]); setFitnessExercises([]); }
        // Load opt-in events for this age group
        const { data: evts } = await supabase.from("journey_events").select("*").eq("age_group_id", player.age_group_id).order("event_date");
        setEvents(evts || []);
        // Load this player's signups
        const { data: signups } = await supabase.from("journey_event_signups").select("*").eq("player_id", player.id);
        setEventSignups(signups || []);
      }
    } catch (e) { console.error("selectPlayer:", e); }
  }

  async function signup() { setAuthLoading(true); setAuthError(""); const { error } = await supabase.auth.signUp({ email, password }); if (error) setAuthError(error.message); setAuthLoading(false); }
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
    if (existing) {
      setProgress((prev) => prev.filter((p) => p.id !== existing.id));
      await addXp(-(existing.xp_earned || 5));
      if (!existing.id.startsWith("local-")) supabase.from("player_progress").delete().eq("id", existing.id);
      return;
    }
    flashXp();
    const xp = exercise.xp_reward || 5;
    const { data } = await supabase.from("player_progress").insert({ player_id: selectedPlayer.id, club_id: selectedPlayer.club_id, age_group_id: selectedPlayer.age_group_id, exercise_id: exercise.id, plan_id: weeklyPlan?.id || null, xp_earned: xp }).select().single();
    if (data) { setProgress((prev) => [...prev, data]); await addXp(xp); }
    else { setProgress((prev) => [...prev, { id: "local-" + Date.now(), exercise_id: exercise.id, xp_earned: xp }]); await addXp(xp); }
  }

  async function signUpForEvent(event) {
    if (!selectedPlayer) return;
    if (eventSignups.find((s) => s.event_id === event.id)) return; // already signed up
    const { data } = await supabase.from("journey_event_signups").insert({ event_id: event.id, player_id: selectedPlayer.id }).select().single();
    if (data) { setEventSignups((prev) => [...prev, data]); await addXp(event.xp_reward || 15); flashXp(); }
  }

  async function cancelEventSignup(event) {
    if (!selectedPlayer) return;
    const signup = eventSignups.find((s) => s.event_id === event.id);
    if (!signup) return;
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
  const totalTasks = homework.length + bonusTasks.length;
  const doneTasks = homework.filter((h) => completedChallengeIds.has(h.id)).length + bonusTasks.filter((b) => completedBonusIds.has(b.id)).length;

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
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 25, color: C.primary, textTransform: "uppercase" }}>Academy</div>
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
            {authError && <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{authError}</div>}
            <button onClick={authMode === "login" ? login : signup} disabled={authLoading || !email || !password} style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, padding: 14, border: "none", fontSize: 15, fontWeight: 900, fontFamily: "'League Spartan', sans-serif", background: C.primary, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(26,92,45,0.25)" }}>{authLoading ? "..." : authMode === "login" ? "Log In" : "Create Account"}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- CHILD SELECTOR (first time) ---------- */
  if (!selectedPlayer && !isAdminUrl) {
    async function loadAvailable() {
      if (!club) return;
      const { data } = await supabase.from("journey_players").select("*, age_group:age_groups(label)").eq("club_id", club.id).order("name");
      const scoped = inviteTeamId ? (data || []).filter((p) => p.age_group_id === inviteTeamId) : (data || []);
      const mine = scoped.filter((p) => p.parent_user_id === session.user.id);
      const unclaimed = scoped.filter((p) => p.parent_user_id === "00000000-0000-0000-0000-000000000000");
      setAvailablePlayers([...mine, ...unclaimed]); setPlayers(mine);
      if (mine.length > 0) selectPlayer(mine[0]);
      setLoadingPlayers(false);
    }
    if (loadingPlayers && club) loadAvailable();
    const unclaimed = availablePlayers.filter((p) => p.parent_user_id === "00000000-0000-0000-0000-000000000000");

    return (
      <div style={{ minHeight: "100vh", background: C.background, fontFamily: "Inter, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>Find Your Child</div>
            <button onClick={logout} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", fontSize: 12 }}><LogOut size={14} /></button>
          </div>
          {unclaimed.length > 0 ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 12px" }}>Tap your child's name to link them to your account.</p>
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
  function MissionCard({ challenge, done, onComplete, sportColor, sportBg, sportLabel }) {
    // Category icon mapping
    const iconMap = { hurling: "/hurling-icon.png", camogie: "/hurling-icon.png", football: "/football-icon.png", athletic: "/speed-mechanics-icon.png" };
    const catIcon = iconMap[sportLabel] || "/football-icon.png";
    return (
      <div style={{ background: sportBg, border: `2px solid ${done ? C.success : sportColor}33`, borderRadius: 16, padding: 16, marginBottom: 12, position: "relative", overflow: "hidden" }}>
        {/* Category icon watermark */}
        <img src={catIcon} alt="" style={{ position: "absolute", right: 8, top: 8, width: 40, height: 40, objectFit: "contain", opacity: 0.2, pointerEvents: "none" }} />
        {/* Sport label */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img src={catIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: sportColor, textTransform: "uppercase" }}>{sportLabel}</span>
          </div>
          {done && <span style={{ background: C.success, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>DONE</span>}
          {!done && <span style={{ background: sportColor + "22", color: sportColor, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{Math.round((completedChallengeIds.has(challenge.id) ? 100 : 0))}%</span>}
        </div>
        {/* Content */}
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>{challenge.title}</div>
        {challenge.target && <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>{challenge.target}</div>}
        {challenge.description && <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5, marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>{challenge.description}</div>}
        {/* Progress bar */}
        <div style={{ height: 6, background: sportColor + "22", borderRadius: 3, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: done ? "100%" : "0%", background: sportColor, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
        {/* XP + action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 16 }}>?</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.gold }}>+10 XP</span>
          </div>
          {!done && (
            <button onClick={() => onComplete(challenge)} style={{ background: C.success, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 10px rgba(22,163,74,0.25)" }}>
              <CheckCircle size={16} /> Mark Complete
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderMissions() {
    // Swap hurling/camogie for girls based on age group sport
    const isGirlsGroup = selectedPlayer?.age_group_id && ageGroups.find((ag) => ag.id === selectedPlayer.age_group_id)?.gender === "girls";
    function displaySport(sport) {
      if (isGirlsGroup && sport === "hurling") return "camogie";
      return sport;
    }
    return (<>
      {/* Academy weekly intro */}
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 42, height: 42, objectFit: "contain" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.primary }}>This week in Academy</div>
          <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.45, marginTop: 3, fontStyle: "italic" }}>“{academyQuoteFor(selectedPlayer, weeklyPlan)}”</div>
        </div>
      </div>

      {/* This Week's Skills   from coach drills or library fallback */}
      {weekSkills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 10 }}>Your Coach-selected skills for this week.</div>
          {weekSkills.map((skill) => {
            const isHurling = skill.sport === "hurling" || skill.sport === "camogie";
            const sportColor = isHurling ? C.hurling : C.football;
            const sportBg = isHurling ? C.hurlingBg : C.footballBg;
            const catIcon = isHurling ? "/hurling-icon.png" : "/football-icon.png";
            const relatedChallenges = skillChallenges.filter((ch) => ch.skill_id === skill.id);
            const previousSkills = weekSkills.slice(0, weekSkills.indexOf(skill));
            const firstOfSport = !previousSkills.some((item) => (item.sport === "hurling" || item.sport === "camogie") === isHurling);
            return (
              <div key={skill.id}>
                {firstOfSport && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                    <img src={catIcon} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 15, color: sportColor, textTransform: "uppercase", flex: 1 }}>{isHurling ? (skill.sport === "camogie" ? "Camogie" : "Hurling") : "Football"}</div>
                  </div>
                )}
              <div style={{ background: sportBg, border: `2px solid ${sportColor}22`, borderRadius: 16, marginBottom: 12, overflow: "hidden", position: "relative" }}>
                {/* Header */}
                <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: sportColor + "18", border: `1.5px solid ${sportColor}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={catIcon} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>{skill.name}</div>
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
                    <button onClick={() => completeChallenge({ id: skill.id, type: isHurling ? "hurling" : "football" })} style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, border: "none", background: SECTIONS.skills.color, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 3px 8px ${SECTIONS.skills.color}33` }}>
                      <CheckCircle size={16} /> I Practised for 20 Minutes!
                    </button>
                  ) : (
                    <button onClick={() => completeChallenge({ id: skill.id, type: isHurling ? "hurling" : "football" })} style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, background: C.successBg, border: `1.5px solid ${C.success}44`, textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.success, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                      <CheckCircle size={16} /> Done! (tap to undo)
                    </button>
                  )}
                </div>
                {/* Challenges */}
                {relatedChallenges.length > 0 && (
                  <div style={{ padding: "0 14px 12px" }}>
                    {relatedChallenges.map((ch) => (
                      <div key={ch.id} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 10, marginTop: 6, border: `1px solid ${sportColor}11` }}>
                        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 2 }}>Try: {ch.title}</div>
                        {ch.description && <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.4 }}>{ch.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fitness Exercises   runs, star jumps etc */}
      {fitnessExercises.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <img src={SECTIONS.fitness.icon} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.fitness.color, textTransform: "uppercase", flex: 1 }}>Fitness</div>
            <img src="/speed-mechanics-icon.png" alt="" style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.5 }} />
          </div>
          {fitnessExercises.map((ex) => {
            const done = progress.find((p) => p.exercise_id === ex.id);
            return (
              <div key={ex.id} style={{ background: done ? C.successBg : C.athleticBg, border: `1.5px solid ${done ? C.success + "44" : C.athletic + "33"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => completeExercise(ex)} title={done ? "Mark as not done" : "Mark complete"} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {done ? <CheckCircle size={22} color={C.success} /> : <Circle size={22} color={C.athletic} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13, color: done ? C.textSecondary : C.text }}>{ex.title}</div>
                  {ex.description && <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>{ex.description}</div>}
                </div>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.gold }}>+{ex.xp_reward || 5} XP</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Football / Hurling homework */}
      {homework.map((ch) => {
        const done = completedChallengeIds.has(ch.id);
        const sport = displaySport(ch.type);
        const sportColor = sport === "camogie" ? C.hurling : ch.type === "hurling" ? C.hurling : ch.type === "football" ? C.football : C.athletic;
        const sportBg = sport === "camogie" ? C.hurlingBg : ch.type === "hurling" ? C.hurlingBg : ch.type === "football" ? C.footballBg : C.athleticBg;
        return <MissionCard key={ch.id} challenge={ch} done={done} onComplete={completeChallenge} sportColor={sportColor} sportBg={sportBg} sportLabel={sport} />;
      })}

      {/* Bonus challenge */}
      {bonusTasks.length > 0 && (
        <div style={{ background: "#fef9ef", border: `2px solid ${C.gold}44`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>??</span>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, color: "#92400e", textTransform: "uppercase" }}>Bonus Challenge</span>
          </div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 10px" }}>Can you complete all {homework.length} missions?</p>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.gold }}>+25 XP</div>
          {bonusTasks.map((t) => { const done = completedBonusIds.has(t.id); return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "8px 0", borderTop: `1px solid ${C.gold}22` }}>
              <button onClick={() => completeBonus(t)} title={done ? "Mark as not done" : "Mark complete"} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{done ? <CheckCircle size={22} color={C.gold} /> : <Circle size={22} color={C.gold + "66"} />}</button>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: done ? C.textSecondary : C.text }}>{t.title}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>+{t.xp_reward || 15}</span>
            </div>
          ); })}
        </div>
      )}

      {/* Rest & Recovery */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <img src={SECTIONS.recovery.icon} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.recovery.color, textTransform: "uppercase", flex: 1 }}>Rest & Recovery</div>
          <img src="/rest-and-recovery-icon.png" alt="" style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.6 }} />
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

      {/* Events   opt-in sessions */}
      {events.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <img src={SECTIONS.events.icon} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.events.color, textTransform: "uppercase", flex: 1 }}>Sessions & Events</div>
          </div>
          {events.map((evt) => {
            const isSignedUp = eventSignups.find((s) => s.event_id === evt.id);
            const signupCount = eventSignups.filter((s) => s.event_id === evt.id).length;
            const isFull = evt.max_spots && signupCount >= evt.max_spots;
            return (
              <div key={evt.id} style={{ background: isSignedUp ? "#e8f5e9" : C.surface, border: `2px solid ${isSignedUp ? C.success + "44" : C.primary + "33"}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 15, color: C.text }}>{evt.title}</div>
                    {evt.description && <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{evt.description}</div>}
                  </div>
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.gold }}>+{evt.xp_reward || 15} XP</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: C.textSecondary, marginBottom: 10 }}>
                  {evt.event_date && <span>?? {new Date(evt.event_date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}</span>}
                  {evt.event_time && <span>?? {evt.event_time}</span>}
                  {evt.location && <span>?? {evt.location}</span>}
                  {evt.recurring && <span style={{ background: C.primary + "15", color: C.primary, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Weekly</span>}
                </div>
                {isSignedUp ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={18} color={C.success} />
                      <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12, color: C.success }}>Signed Up!</span>
                    </div>
                    <button onClick={() => cancelEventSignup(evt)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 10, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => !isFull && signUpForEvent(evt)} disabled={isFull} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: isFull ? C.border : C.primary, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: isFull ? "default" : "pointer" }}>
                    {isFull ? "Full" : "I'm In!"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Streak */}
      <div style={{ background: "#fffbeb", border: `2px solid ${C.gold}33`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={20} color="#f97316" fill="#f97316" />
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, color: C.text, textTransform: "uppercase" }}>Keep your streak alive!</span>
        </div>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 22, color: "#f97316" }}>{selectedPlayer.streak_days || 0} <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>Days</span></div>
      </div>

      {/* Empty state */}
      {!weeklyPlan && homework.length === 0 && (
        <div style={{ background: C.surface, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${C.border}` }}>
          <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 10 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase" }}>Nothing Set Yet</div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: "6px 0 0" }}>Your coach hasn't set this week's missions. Check back soon!</p>
        </div>
      )}

      {/* All done */}
      {totalTasks > 0 && doneTasks === totalTasks && (
        <div style={{ background: C.primary, borderRadius: 16, padding: 20, textAlign: "center", color: "#fff", marginTop: 12, boxShadow: "0 8px 24px rgba(26,92,45,0.3)" }}>
          <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 62, height: 62, objectFit: "contain", marginBottom: 8 }} />
          <Trophy size={28} style={{ marginBottom: 6 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 18, textTransform: "uppercase" }}>All Done for This Week!</div>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.9 }}>Great work, {selectedPlayer.name}!</p>
        </div>
      )}
    </>);
  }

  function renderProgress() {
    const earnedIds = new Set(earnedBadges.map((eb) => eb.badge_id));
    return (<>
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
        {homework.map((ch) => { const done = completedChallengeIds.has(ch.id); const col = ch.type === "hurling" ? C.hurling : ch.type === "football" ? C.football : C.athletic; return (
          <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
            <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ch.type}</span><br /><span style={{ fontSize: 11, color: C.textSecondary }}>{ch.title}</span></div>
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
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 16, color: C.primary }}>SPRAOI ACADEMY</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff3e0", borderRadius: 20, padding: "5px 12px" }}>
            <Flame size={14} color="#f97316" fill="#f97316" />
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#f97316" }}>{selectedPlayer.streak_days || 0}</span>
            <span style={{ fontSize: 10, color: C.textSecondary }}>day streak</span>
          </div>
        </div>

        {/* Player card with toggle */}
        {selectedPlayer && <div style={{ background: C.primary, borderRadius: 16, padding: "14px 16px", color: "#fff", marginBottom: 14, boxShadow: "0 6px 18px rgba(26,92,45,0.25)" }}>
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
        {screen === "home" && selectedPlayer && renderMissions()}
        {screen === "progress" && selectedPlayer && renderProgress()}
        {screen === "learn" && (
          <div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase", marginBottom: 12 }}>Skills Library</div>
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
              const related = allChallenges.filter((c) => c.skill_id === skill.id);
              return (
                <div key={skill.id} style={{ background: sportBg, border: `1.5px solid ${sportColor}18`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={catIcon} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text }}>{skill.name}</div>
                      <div style={{ fontSize: 9, color: C.textSecondary, textTransform: "capitalize" }}>{skill.category?.replace(/_/g, " ") || skill.sport}</div>
                    </div>
                    {skill.video_url && <span style={{ fontSize: 10, background: "#ff000015", color: "#cc0000", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>? Video</span>}
                  </div>
                  {skill.video_url && (
                    <div style={{ padding: "0 14px 10px" }}>
                      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${sportColor}22`, background: "#000" }}>
                        <iframe src={skill.video_url.replace("watch?v=", "embed/").split("&")[0]} style={{ width: "100%", height: 160, border: "none", display: "block" }} allow="accelerometer; autoplay; encrypted-media; gyroscope" allowFullScreen title={skill.name} />
                      </div>
                    </div>
                  )}
                  {related.length > 0 && (
                    <div style={{ padding: "0 14px 10px" }}>
                      {related.map((ch) => (
                        <div key={ch.id} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8, marginBottom: 4, border: `1px solid ${sportColor}11` }}>
                          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.text }}>{ch.title}</div>
                          {ch.description && <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.4, marginTop: 2 }}>{ch.description}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Switch child</div>
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

            <button onClick={logout} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              <LogOut size={17} />
              Log out
            </button>
          </div>
        )}

        {/* Coach screen — admin only via ?admin=true */}
        {screen === "coach" && isAdminUrl && (
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

      {/* Bottom nav */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "center", alignItems: "center", padding: "8px 0 12px", zIndex: 900, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: "100%", maxWidth: 500 }}>
        {[{ key: "home", icon: Home, label: "Home", color: C.primary }, { key: "progress", icon: Award, label: "Me", color: C.gold }, { key: "learn", icon: BookOpen, label: "Learn", color: SECTIONS.skills.color }, { key: "profile", icon: User, label: "Profile", color: C.primary }].map((item) => {
          const active = screen === item.key;
          return (<button key={item.key} onClick={() => setScreen(item.key)} style={{ flex: 1, border: 0, background: active ? item.color : "transparent", color: active ? "#fff" : C.textSecondary, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 8px", borderRadius: 12, cursor: "pointer", gap: 2, boxShadow: active ? `0 3px 10px ${item.color}33` : "none", transition: "all .15s" }}><item.icon size={18} /><span style={{ fontSize: 9, fontWeight: active ? 800 : 500 }}>{item.label}</span></button>);
        })}
        </div>
      </div>
    </div>
  );
}
