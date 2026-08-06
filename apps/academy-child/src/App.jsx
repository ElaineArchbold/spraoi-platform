import { useState, useEffect, useRef } from "react";
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

const BRAND_LOGO = "/spraoi-logo.png";
const APP_ICON = "/spraoi-academy-icon.png";

const XP_PER_LEVEL = 100;
function getLevel(xp) { return Math.floor((xp || 0) / XP_PER_LEVEL) + 1; }
function xpInLevel(xp) { return (xp || 0) % XP_PER_LEVEL; }
function normaliseWords(value = "") { return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2); }
function bestSkillForActivity(activity, skills = []) {
  const words = new Set(normaliseWords([activity.title, activity.description, activity.coaching_points, activity.category, activity.skill?.name].join(" ")));
  return skills.map((skill) => {
    let score = activity.skill_id === skill.id ? 100 : 0;
    const sport = String(activity.sport || activity.skill?.sport || "").toLowerCase();
    if (sport && (sport === skill.sport || (sport === "camogie" && skill.sport === "hurling"))) score += 25;
    normaliseWords([skill.name, skill.category, skill.description].join(" ")).forEach((word) => { if (words.has(word)) score += 7; });
    const concepts = [["lift","jab","roll","scoop"],["strike","shoot","accuracy"],["kick","shoot"],["pass","handpass"],["catch","receive"],["carry","solo","run"]];
    concepts.forEach((terms) => { if (terms.some((term) => [...words].some((word) => word.includes(term))) && terms.some((term) => normaliseWords(skill.name + " " + skill.category).some((word) => word.includes(term)))) score += 14; });
    return { skill, score };
  }).sort((a,b) => b.score-a.score)[0]?.skill || null;
}

/* Mascot system   each mascot demonstrates different skills */
const MASCOTS = [
  { name: "Bella", img: "/mascots/bella/bella-standing.png", sport: "football", tagline: "Together we play. Together we win!", color: "#005BBB" },
  { name: "Finn", img: "/mascots/finn/finn-standing.png", sport: "hurling", tagline: "Together we play. Learn. Grow.", color: "#F58220" },
  { name: "Hazel", img: "/mascots/hazel/hazel-running.png", sport: "athletic", tagline: "Be brave. Be fast. Be you!", color: "#E53935" },
  { name: "Otis", img: "/mascots/otis/otis-standing.png", sport: "hurling", tagline: "Play hard. Have fun. Never give up!", color: "#1E63B6" },
  { name: "Rory", img: "/mascots/rory/rory-standing.png", sport: "hurling", tagline: "Strong together. Better every day.", color: "#4CAF50" },
  { name: "Shelly", img: "/mascots/shelly/shelly-standing.png", sport: "football", tagline: "Kind heart. Strong mind. Together we grow.", color: "#7B3FA1" },
];
const RORY_POSES = {
  standing: "/mascots/rory/rory-standing.png",
  running: "/mascots/rory/rory-running.png",
  runningWithBall: "/mascots/rory/rory-running-with-ball.png",
  runningWithHurley: "/mascots/rory/rory-running-with-hurley.png",
  kicking: "/mascots/rory/rory-kicking.png",
  passing: "/mascots/rory/rory-passing.png",
  lift: "/mascots/rory/rory-lift.png",
};
const OTIS_POSES = {
  standing: "/mascots/otis/otis-standing.png",
  running: "/mascots/otis/otis-running.png",
  runningWithBall: "/mascots/otis/otis-running-with-ball.png",
  runningWithHurley: "/mascots/otis/otis-running-with-hurley.png",
  kicking: "/mascots/otis/otis-kicking.png",
  passing: "/mascots/otis/otis-passing.png",
  lift: "/mascots/otis/otis-lift.png",
  ready: "/mascots/otis/otis-ready-position.png",
};
const FINN_POSES = {
  standing: "/mascots/finn/finn-standing.png",
  running: "/mascots/finn/finn-running.png",
  runningWithBall: "/mascots/finn/finn-running-with-ball.png",
  kicking: "/mascots/finn/finn-kicking.png",
  lift: "/mascots/finn/finn-lift.png",
  striking: "/mascots/finn/finn-striking.png",
  ready: "/mascots/finn/finn-ready-position.png",
  carrying: "/mascots/finn/finn-carrying-the-sliotar.png",
};
const HAZEL_POSES = {
  running: "/mascots/hazel/hazel-running.png",
  runningWithBall: "/mascots/hazel/hazel-running-with-ball.png",
  runningWithHurley: "/mascots/hazel/hazel-running-with-hurl.png",
  kicking: "/mascots/hazel/hazel-kicking.png",
  lift: "/mascots/hazel/hazel-lift.png",
  striking: "/mascots/hazel/hazel-striking.png",
  carrying: "/mascots/hazel/hazel-carrying-the-sliotar.png",
};
const SHELLY_POSES = {
  standing: "/mascots/shelly/shelly-standing.png",
  running: "/mascots/shelly/shelly-running.png",
  runningWithBall: "/mascots/shelly/shelly-running-with-the-ball.png",
  kicking: "/mascots/shelly/shelly-kicking.png",
  passing: "/mascots/shelly/shelly-passing.png",
  lift: "/mascots/shelly/shelly-lift.png",
  striking: "/mascots/shelly/shelly-striking.png",
  ready: "/mascots/shelly/shelly-ready-position.png",
  carrying: "/mascots/shelly/shelly-carrying-the-sliotar.png",
};
const BELLA_POSES = {
  standing: "/mascots/bella/bella-standing.png",
  running: "/mascots/bella/bella-running.png",
  runningWithBall: "/mascots/bella/bella-running-with-ball.png",
  runningWithHurley: "/mascots/bella/bella-running-with-hurley.png",
  kicking: "/mascots/bella/bella-kicking.png",
  passing: "/mascots/bella/bella-passing.png",
  lift: "/mascots/bella/bella-lift.png",
  striking: "/mascots/bella/bella-striking.png",
  ready: "/mascots/bella/bella-ready-positon.png",
};

/* Section colour system   split-complementary from sky blue */
const SECTIONS = {
  skills: { color: "#F58220", bg: "#fff8f0", border: "#F5822033", mascot: "finn", label: "Skills" },
  fitness: { color: "#E53935", bg: "#fef2f2", border: "#E5393533", mascot: "hazel", label: "Fitness" },
  recovery: { color: "#7B3FA1", bg: "#f5f0fa", border: "#7B3FA133", mascot: "shelly", label: "Recovery" },
  events: { color: "#2E7D32", bg: "#f0f9f1", border: "#2E7D3233", mascot: "rory", label: "Events" },
  missions: { color: "#0277bd", bg: "#f0f7fc", border: "#0277bd33", mascot: "otis", label: "Missions" },
};
function getMascotImg(name, pose) {
  const poses = { finn: FINN_POSES, hazel: HAZEL_POSES, shelly: SHELLY_POSES, rory: RORY_POSES, otis: OTIS_POSES, bella: BELLA_POSES };
  return poses[name]?.[pose] || poses[name]?.standing || RORY_POSES.standing;
}
function getMascotForSport(sport) {
  const matches = MASCOTS.filter((m) => m.sport === sport);
  return matches[Math.floor(Math.random() * matches.length)] || MASCOTS[0];
}
function getRandomMascot() { return MASCOTS[Math.floor(Math.random() * MASCOTS.length)]; }

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
  const isAdminUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "true";
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
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteToken] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("invite") || localStorage.getItem("spraoi_academy_invite") || "";
    if (token) localStorage.setItem("spraoi_academy_invite", token);
    return token;
  });
  const dailyMascotRef = useRef(MASCOTS[Math.floor(Math.random() * MASCOTS.length)]); // picked once per session

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadParentData(s.user.id);
      else setInitialLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); if (s) loadParentData(s.user.id); });
    return () => subscription.unsubscribe();
  }, []);

  async function acceptPendingInvitation() {
    const token = inviteToken || localStorage.getItem("spraoi_academy_invite");
    if (!token) return;
    const { data, error } = await supabase.rpc("accept_academy_invitation", { p_token: token });
    if (error) { setInviteMessage(error.message); return; }
    localStorage.removeItem("spraoi_academy_invite");
    setInviteMessage(data?.children_linked ? `${data.children_linked} child profile${data.children_linked===1?"":"s"} linked to your account.` : "Invitation accepted. Your club may still need to finish linking the child profile.");
    const url = new URL(window.location.href); url.searchParams.delete("invite"); window.history.replaceState({}, "", url.toString());
  }

  async function loadParentData(userId) {
    await acceptPendingInvitation();
    const { data: clubData } = await supabase.from("clubs").select("*").eq("slug", "fingallians").single();
    setClub(clubData);
    if (clubData) { const { data: ag } = await supabase.from("age_groups").select("*").eq("club_id", clubData.id).order("label"); setAgeGroups(ag || []); if (isAdminUrl) setCoachTeams(ag || []); }
    // Check if user is a coach/admin
    const { data: roleData, error: roleErr } = await supabase.from("user_roles").select("*").eq("user_id", userId).limit(1).single();
    if (roleErr) console.log("Role query error:", roleErr.message);
    if (roleData && (roleData.role === "super_admin" || roleData.role === "club_admin" || roleData.role === "coach")) {
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
        const now = new Date();
        const day = now.getDay();
        const fromMonday = day === 0 ? 6 : day - 1;
        const weekStart = new Date(now); weekStart.setHours(0,0,0,0); weekStart.setDate(now.getDate() - fromMonday);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
        const { data: plans } = await supabase.from("weekly_plans").select("*").eq("age_group_id", player.age_group_id).eq("published", true).gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()).order("starts_at", { ascending: false }).limit(1);
        const plan = plans && plans.length > 0 ? plans[0] : null;
        setWeeklyPlan(plan);
        if (plan) {
          const hw = [];
          if (plan.hurling_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.hurling_challenge_id).single(); if (ch) hw.push({ ...ch, type: "hurling" }); }
          if (plan.football_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.football_challenge_id).single(); if (ch) hw.push({ ...ch, type: "football" }); }
          if (plan.athletic_challenge_id) { const { data: ch } = await supabase.from("challenges").select("*").eq("id", plan.athletic_challenge_id).single(); if (ch) hw.push({ ...ch, type: "athletic" }); }
          setHomework(hw);
          const { data: bonus } = await supabase.from("bonus_tasks").select("*").eq("plan_id", plan.id); setBonusTasks(bonus || []);
          // Load training drills from coach's sessions for this plan
          const { data: sessions } = await supabase.from("sessions").select("id, notes, session_date, session_activities(*, activity:activities(id, title, description, coaching_points, setup, equipment, sport, category, difficulty, duration_mins, skill_id, skill:skills!activities_skill_id_fkey(id, name, sport, category, video_url)))").eq("plan_id", plan.id);
          const drills = [];
          const skillMap = {};
          const { data: librarySkills } = await supabase.from("skills").select("*").not("video_url", "is", null).order("sport, name");
          const availableSkills = librarySkills || [];
          const overrides = plan.academy_video_overrides || {};
          (sessions || []).forEach((s) => {
            (s.session_activities || []).sort((a, b) => a.sort_order - b.sort_order).forEach((sa) => {
              if (sa.activity) {
                const overrideId = overrides[sa.activity.id];
                const matchedSkill = availableSkills.find((skill) => skill.id === overrideId) || (sa.activity.skill?.video_url ? sa.activity.skill : bestSkillForActivity(sa.activity, availableSkills));
                drills.push({ ...sa.activity, sessionDate: s.session_date, academySkill: matchedSkill });
                if (matchedSkill) skillMap[matchedSkill.id] = matchedSkill;
              }
            });
          });
          setTrainingDrills(drills);
          const skillIds = Object.keys(skillMap);
          let matchedChallenges = [];
          if (skillIds.length > 0) {
            const { data: ch } = await supabase.from("challenges").select("*").in("skill_id", skillIds);
            matchedChallenges = ch || [];
          }
          setWeekSkills(Object.values(skillMap));
          setSkillChallenges(matchedChallenges);
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
    if (progress.find((p) => p.bonus_task_id === task.id) && !task.repeatable) return;
    const xp = task.xp_reward || 15;
    const { data } = await supabase.from("player_progress").insert({ player_id: selectedPlayer.id, club_id: selectedPlayer.club_id, age_group_id: selectedPlayer.age_group_id, bonus_task_id: task.id, plan_id: weeklyPlan.id, xp_earned: xp }).select().single();
    if (data) { setProgress((prev) => [...prev, data]); await addXp(xp); flashXp(); }
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
      const mine = (data || []).filter((p) => p.parent_user_id === session.user.id);
      const unclaimed = (data || []).filter((p) => p.parent_user_id === "00000000-0000-0000-0000-000000000000");
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
    const mascot = getMascotForSport(sportLabel);
    // Category icon mapping
    const iconMap = { hurling: "/hurling-icon.png", camogie: "/hurling-icon.png", football: "/football-icon.png", athletic: "/speed-mechanics-icon.png" };
    const catIcon = iconMap[sportLabel] || "/football-icon.png";
    return (
      <div style={{ background: sportBg, border: `2px solid ${done ? C.success : sportColor}33`, borderRadius: 16, padding: 16, marginBottom: 12, position: "relative", overflow: "hidden" }}>
        {/* Category icon watermark */}
        <img src={catIcon} alt="" style={{ position: "absolute", right: 8, top: 8, width: 40, height: 40, objectFit: "contain", opacity: 0.2, pointerEvents: "none" }} />
        {/* Mascot watermark */}
        <img src={mascot.img} alt={mascot.name} style={{ position: "absolute", right: -10, bottom: -10, width: 80, height: 80, objectFit: "contain", opacity: 0.15, pointerEvents: "none" }} />
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
    const tipMascot = dailyMascotRef.current;
    const isGirlsGroup = selectedPlayer?.age_group_id && ageGroups.find((ag) => ag.id === selectedPlayer.age_group_id)?.gender === "girls";
    const displaySport = (sport) => isGirlsGroup && sport === "hurling" ? "camogie" : sport;
    const lower = (value) => String(value || "").toLowerCase();
    const kindOf = (item) => {
      const raw = `${item.type || ""} ${item.category || ""} ${item.title || ""} ${item.description || ""}`.toLowerCase();
      if (raw.includes("step")) return "steps";
      if (raw.includes("run") || raw.includes("lap") || raw.includes("jog")) return "runs";
      if (raw.includes("bonus") || raw.includes("event") || raw.includes("friday night") || raw.includes("match") || raw.includes("camp")) return "bonus";
      return "exercises";
    };
    const groups = {
      steps: fitnessExercises.filter((x) => kindOf(x) === "steps"),
      exercises: fitnessExercises.filter((x) => kindOf(x) === "exercises"),
      runs: fitnessExercises.filter((x) => kindOf(x) === "runs"),
      bonus: [...bonusTasks, ...events.map((event) => ({ ...event, title: event.title, description: event.description, xp_reward: event.xp_reward || 15, _event: true }))],
    };
    const footballSkills = weekSkills.filter((s) => lower(s.sport).includes("football"));
    const hurlingSkills = weekSkills.filter((s) => lower(s.sport).includes("hurl") || lower(s.sport).includes("camogie"));
    const completedCount = progress.length;
    const weekXp = progress.reduce((sum, item) => sum + Number(item.xp_earned || 0), 0);

    const SectionCard = ({ title, subtitle, color, bg, mascot, icon, children, empty }) => (
      <section style={{ background: bg, border: `2px solid ${color}28`, borderRadius: 22, marginBottom: 16, overflow: "hidden", boxShadow: `0 8px 22px ${color}12` }}>
        <div style={{ padding: "15px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: `1px solid ${color}22`, background: "rgba(255,255,255,.48)" }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: "#fff", border: `1px solid ${color}25`, display: "grid", placeItems: "center", fontSize: 21, boxShadow: "0 5px 12px rgba(15,23,42,.08)" }}>{icon}</div>
          <div style={{ flex: 1 }}><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 17, color }}>{title}</div><div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>{subtitle}</div></div>
          <img src={mascot} alt="" style={{ width: 54, height: 54, objectFit: "contain" }} />
        </div>
        <div style={{ padding: 13 }}>{children || <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.65)", fontSize: 11, color: C.textSecondary }}>{empty}</div>}</div>
      </section>
    );

    const TaskRow = ({ item, color, type }) => {
      const done = type === "bonus" ? completedBonusIds.has(item.id) : progress.some((p) => p.exercise_id === item.id);
      const xp = item.xp_reward || item.xp || 5;
      const click = () => type === "bonus" ? completeBonus(item) : completeExercise(item);
      return <button onClick={click} key={item.id} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, border: 0, borderBottom: "1px solid rgba(15,23,42,.06)", background: "rgba(255,255,255,.78)", padding: "12px", textAlign: "left", cursor: "pointer" }}>
        {done ? <CheckCircle size={23} color={C.success} /> : <Circle size={23} color={color} />}
        <div style={{ flex: 1 }}><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13, color: done ? C.textSecondary : C.text, textDecoration: done ? "line-through" : "none" }}>{item.title}</div>{(item.target || item.description) && <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 3 }}>{item.target || item.description}</div>}</div>
        <span style={{ borderRadius: 999, background: "#fff7d6", color: "#9a6700", padding: "5px 8px", fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 10 }}>+{xp} XP</span>
      </button>;
    };

    const SkillRow = ({ skill, color, sport }) => {
      const done = progress.some((p) => p.challenge_id === skill.id);
      const isHurling = sport !== "football";
      const pose = isHurling ? getMascotImg("finn", "striking") : getMascotImg("bella", "kicking");
      return <div key={skill.id} style={{ background: "rgba(255,255,255,.82)", borderRadius: 16, overflow: "hidden", marginBottom: 10, border: `1px solid ${color}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}><img src={pose} alt="" style={{ width: 48, height: 48, objectFit: "contain" }}/><div style={{ flex: 1 }}><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 14, color: C.text }}>{skill.name}</div><div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>Watch, practise, then mark it complete</div></div><span style={{ borderRadius: 999, background: "#fff7d6", color: "#9a6700", padding: "5px 8px", fontSize: 10, fontWeight: 900 }}>+10 XP</span></div>
        {skill.video_url ? <div style={{ margin: "0 12px 10px", borderRadius: 13, overflow: "hidden", background: "#000" }}><iframe title={skill.name} src={skill.video_url.replace("watch?v=", "embed/").split("&")[0]} style={{ width: "100%", height: 180, border: 0, display: "block" }} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div style={{ margin: "0 12px 10px", borderRadius: 12, background: "#fff7ed", color: "#9a3412", padding: 10, fontSize: 10 }}>Your coach has chosen this skill, but a video has not been linked yet.</div>}
        <div style={{ padding: "0 12px 12px" }}><button onClick={() => completeChallenge({ id: skill.id, type: sport })} style={{ width: "100%", padding: 11, borderRadius: 11, border: 0, background: done ? C.successBg : color, color: done ? C.success : "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 900, cursor: "pointer" }}>{done ? "✓ Practised — tap to undo" : "I practised this skill"}</button></div>
      </div>;
    };

    return <>
      <div style={{ background: "linear-gradient(135deg,#0ea5e9,#2563eb)", borderRadius: 24, padding: "18px 17px", color: "#fff", marginBottom: 16, position: "relative", overflow: "hidden", boxShadow: "0 14px 30px rgba(14,165,233,.22)" }}>
        <img src={tipMascot.img} alt={tipMascot.name} style={{ position: "absolute", right: 8, bottom: -8, width: 108, height: 108, objectFit: "contain" }}/>
        <div style={{ maxWidth: "70%" }}><div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", opacity: .8 }}>Club Spraoi Academy</div><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 25, lineHeight: 1.05, marginTop: 5 }}>Your weekly adventure</div><div style={{ fontSize: 11, lineHeight: 1.5, opacity: .85, marginTop: 7 }}>{tipMascot.tagline}</div></div>
        <div style={{ display: "flex", gap: 7, marginTop: 14, position: "relative" }}><span style={{ background: "rgba(255,255,255,.18)", padding: "7px 9px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>⭐ {xpTotal} XP</span><span style={{ background: "rgba(255,255,255,.18)", padding: "7px 9px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>🔥 Level {getLevel(xpTotal)}</span><span style={{ background: "rgba(255,255,255,.18)", padding: "7px 9px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>🏅 {earnedBadges.length} badges</span></div>
      </div>

      <SectionCard title="Step Goals" subtitle="Build healthy movement habits across the week" color="#0f9f6e" bg="#ecfdf5" mascot={getMascotImg("otis", "running")} icon="👟" empty="No step goal has been set this week.">{groups.steps.length ? <div style={{ borderRadius: 14, overflow: "hidden" }}>{groups.steps.map((x) => <TaskRow key={x.id} item={x} color="#0f9f6e" type="exercise" />)}</div> : null}</SectionCard>
      <SectionCard title="Exercises" subtitle="Strength, balance and movement challenges" color="#7c3aed" bg="#f5f3ff" mascot={getMascotImg("shelly", "ready")} icon="💪" empty="No exercises have been added this week.">{groups.exercises.length ? <div style={{ borderRadius: 14, overflow: "hidden" }}>{groups.exercises.map((x) => <TaskRow key={x.id} item={x} color="#7c3aed" type="exercise" />)}</div> : null}</SectionCard>
      <SectionCard title="Run Challenge" subtitle="All runs stay together, one after another" color="#e65100" bg="#fff7ed" mascot={getMascotImg("hazel", "running")} icon="🏃" empty="No run challenge has been added this week.">{groups.runs.length ? <div style={{ borderRadius: 14, overflow: "hidden" }}>{groups.runs.map((x) => <TaskRow key={x.id} item={x} color="#e65100" type="exercise" />)}</div> : null}</SectionCard>
      <SectionCard title="Football Skills" subtitle="Videos and practice chosen from this week’s Coach plan" color={C.football} bg={C.footballBg} mascot={getMascotImg("bella", "kicking")} icon="⚽" empty="No football skill has been selected this week.">{footballSkills.length ? footballSkills.map((s) => <SkillRow key={s.id} skill={s} color={C.football} sport="football" />) : null}</SectionCard>
      <SectionCard title={isGirlsGroup ? "Camogie Skills" : "Hurling Skills"} subtitle="Videos and practice chosen from this week’s Coach plan" color={C.hurling} bg={C.hurlingBg} mascot={getMascotImg("finn", "striking")} icon="🏑" empty={`No ${isGirlsGroup ? "camogie" : "hurling"} skill has been selected this week.`}>{hurlingSkills.length ? hurlingSkills.map((s) => <SkillRow key={s.id} skill={s} color={C.hurling} sport={displaySport("hurling")} />) : null}</SectionCard>
      <SectionCard title="Bonus" subtitle="Club events and extra ways to earn XP" color="#d97706" bg="#fffbeb" mascot={getMascotImg("rory", "standing")} icon="✨" empty="No bonus activity has been added this week.">{groups.bonus.length ? <div style={{ borderRadius: 14, overflow: "hidden" }}>{groups.bonus.map((x) => <TaskRow key={x.id} item={x} color="#d97706" type="bonus" />)}</div> : null}</SectionCard>

      {(() => { const weekNum=weeklyPlan?.week_number||1; const stretch=RECOVERY_STRETCHES[(weekNum-1)%RECOVERY_STRETCHES.length]; const recoveryDone=progress.find((p)=>p.bonus_task_id===`recovery-${weekNum}`); return <SectionCard title="Rest & Recovery" subtitle="Slow down, stretch and help your body recover" color="#0f766e" bg="#f0fdfa" mascot={getMascotImg("shelly", "standing")} icon="🌙"><div style={{ background: "rgba(255,255,255,.82)", borderRadius: 15, padding: 14 }}><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 15, color: "#0f766e" }}>{stretch.title}</div><div style={{ fontSize: 10, color: C.textSecondary, marginTop: 4 }}>{stretch.stretches}</div><div style={{ fontSize: 11, color: C.text, lineHeight: 1.55, marginTop: 9 }}>{stretch.how}</div><button onClick={()=>!recoveryDone&&completeBonus({id:`recovery-${weekNum}`,xp_reward:5})} style={{ width:"100%",marginTop:11,padding:11,borderRadius:11,border:0,background:recoveryDone?C.successBg:"#0f766e",color:recoveryDone?C.success:"#fff",fontFamily:"'League Spartan', sans-serif",fontWeight:900,cursor:"pointer" }}>{recoveryDone?"✓ Recovery complete":"I did my recovery · +5 XP"}</button></div></SectionCard>; })()}

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}><Trophy size={28} color={C.gold}/><div style={{ flex:1 }}><div style={{ fontFamily:"'League Spartan', sans-serif",fontWeight:900,fontSize:14,color:C.text }}>{completedCount} activities completed</div><div style={{ fontSize:10,color:C.textSecondary,marginTop:2 }}>{weekXp} XP earned from this week’s missions</div></div><div style={{ width:48,height:48,borderRadius:16,background:"#fff7d6",display:"grid",placeItems:"center",fontSize:24 }}>🏅</div></div>
    </>;
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
                    <div style={{ width: 54, height: 54, borderRadius: 16, background: "#fff", border: `1px solid ${sportColor}22`, display: "grid", placeItems: "center", overflow: "hidden" }}><img src={isHurling ? getMascotImg("finn", skill.name?.toLowerCase().includes("lift") ? "lift" : "striking") : getMascotImg("bella", skill.name?.toLowerCase().includes("pass") ? "passing" : "kicking")} alt="" style={{ width: 50, height: 50, objectFit: "contain" }} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.text }}>{skill.name}</div>
                      <div style={{ fontSize: 9, color: C.textSecondary, textTransform: "capitalize" }}>{skill.category?.replace(/_/g, " ") || skill.sport}</div>
                    </div>
                    {skill.video_url && <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "3px 7px", borderRadius: 999, fontWeight: 800 }}>▶ Video</span>}
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
        {[{ key: "home", icon: Target, label: "Missions", color: SECTIONS.missions.color }, { key: "progress", icon: Award, label: "Me", color: C.gold }, { key: "learn", icon: BookOpen, label: "Learn", color: SECTIONS.skills.color }, { key: "profile", icon: User, label: "Profile", color: C.primary }].map((item) => {
          const active = screen === item.key;
          return (<button key={item.key} onClick={() => setScreen(item.key)} style={{ flex: 1, border: 0, background: active ? item.color : "transparent", color: active ? "#fff" : C.textSecondary, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 8px", borderRadius: 12, cursor: "pointer", gap: 2, boxShadow: active ? `0 3px 10px ${item.color}33` : "none", transition: "all .15s" }}><item.icon size={18} /><span style={{ fontSize: 9, fontWeight: active ? 800 : 500 }}>{item.label}</span></button>);
        })}
        </div>
      </div>
    </div>
  );
}
