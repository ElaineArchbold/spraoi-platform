import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LEGAL_POLICIES, LEGAL_POLICY_VERSION } from "../../../packages/ui/src/legalPolicies.js";
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
   SPRAOI ACADEMY   Kid-facing weekly practice & progress
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

const BRAND_LOGO = "/spraoi-academy-icon.png";
const APP_ICON = "/spraoi-academy-icon.png";

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
  const [evtVerification, setEvtVerification] = useState("coach");
  const [evtRequired, setEvtRequired] = useState(false);
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
                      <div style={{ fontSize: 10, color: C.textSecondary }}>{evt.event_date ? new Date(evt.event_date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }) : ""} {evt.event_time || ""} {evt.recurring ? " · Weekly" : ""} · {(evt.verification_type || "self") === "coach" ? "Coach verified" : "Player verified"}{evt.required ? " · Required" : ""}</div>
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
              <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:10, marginBottom:8 }}>
                <div style={{fontSize:10,fontWeight:800,color:C.textSecondary,textTransform:"uppercase",marginBottom:6}}>Completion verification</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                  {[{id:"self",label:"Player verified"},{id:"coach",label:"Coach verified"}].map(opt=><button key={opt.id} onClick={()=>setEvtVerification(opt.id)} style={{padding:"8px",borderRadius:8,border:`1.5px solid ${evtVerification===opt.id?C.primary:C.border}`,background:evtVerification===opt.id?C.primary+"12":C.surface,color:evtVerification===opt.id?C.primary:C.textSecondary,fontSize:10,fontWeight:800,cursor:"pointer"}}>{opt.label}</button>)}
                </div>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:C.textSecondary,cursor:"pointer"}}><input type="checkbox" checked={evtRequired} onChange={(e)=>setEvtRequired(e.target.checked)} /> Required for weekly completion</label>
              </div>
              <button onClick={() => { if (!evtTitle.trim()) return; onAddEvent({ title: evtTitle.trim(), description: evtDesc || null, event_date: evtDate || null, event_time: evtTime || null, location: evtLocation || null, recurring: evtRecurring, xp_reward: 15, verification_type: evtVerification, required: evtRequired }); setEvtTitle(""); setEvtDesc(""); setEvtDate(""); setEvtTime(""); setEvtLocation(""); setEvtRecurring(false); setEvtVerification("coach"); setEvtRequired(false); }} disabled={!evtTitle.trim()} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: evtTitle.trim() ? C.primary : C.border, color: "#fff", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, cursor: evtTitle.trim() ? "pointer" : "default" }}>
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



function SpraoiPasswordRecovery({
  accent = "#0277bd",
  lightBackground = false,
  logo = "/spraoi-logo-white.png",
  onDone,
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  async function saveRecoveryPassword() {
    setRecoveryError("");

    if (newPassword.length < 8) {
      setRecoveryError("Your password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError("The passwords do not match.");
      return;
    }

    setSavingRecovery(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setRecoveryError(error.message);
      setSavingRecovery(false);
      return;
    }

    await supabase.auth.signOut();

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    if (onDone) onDone();

    alert(
      "Password updated successfully. Please sign in with your new password."
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: lightBackground ? "#f0f7fc" : "#0b2545",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Inter, Segoe UI, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src={logo}
            alt="Spraoi Sports"
            style={{
              width: 170,
              maxWidth: "70%",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 28,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          }}
        >
          <div
            style={{
              fontSize: 21,
              fontWeight: 900,
              color: "#13243b",
              marginBottom: 6,
            }}
          >
            Choose a new password
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: "#627187",
              marginBottom: 20,
            }}
          >
            Enter a new password for your Spraoi Sports account.
          </div>

          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 800,
              color: "#627187",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            New password
          </label>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              type={showRecoveryPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 62px 12px 13px",
                borderRadius: 10,
                border: "1.5px solid #dfe7ef",
                background: "#f6f9fc",
                fontSize: 13,
              }}
            />

            <button
              type="button"
              onClick={() => setShowRecoveryPassword((v) => !v)}
              aria-label={
                showRecoveryPassword
                  ? "Hide password"
                  : "Show password"
              }
              aria-pressed={showRecoveryPassword}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "#627187",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showRecoveryPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 800,
              color: "#627187",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Confirm new password
          </label>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              type={showRecoveryPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              onKeyDown={(e) =>
                e.key === "Enter" && saveRecoveryPassword()
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 62px 12px 13px",
                borderRadius: 10,
                border: "1.5px solid #dfe7ef",
                background: "#f6f9fc",
                fontSize: 13,
              }}
            />

            <button
              type="button"
              onClick={() => setShowRecoveryPassword((v) => !v)}
              aria-label={
                showRecoveryPassword
                  ? "Hide password"
                  : "Show password"
              }
              aria-pressed={showRecoveryPassword}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "#627187",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showRecoveryPassword ? "Hide" : "Show"}
            </button>
          </div>

          {recoveryError && (
            <div
              style={{
                color: "#c62828",
                fontSize: 12,
                fontWeight: 700,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {recoveryError}
            </div>
          )}

          <button
            type="button"
            onClick={saveRecoveryPassword}
            disabled={
              savingRecovery ||
              !newPassword ||
              !confirmPassword
            }
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 11,
              background: accent,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              opacity:
                savingRecovery ||
                !newPassword ||
                !confirmPassword
                  ? 0.55
                  : 1,
            }}
          >
            {savingRecovery ? "Updating..." : "Update password"}
          </button>
        </div>
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
  const [weekSkills, setWeekSkills] = useState([]); // unique skills from this week's drills
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
  const [learnFilter, setLearnFilter] = useState("all"); // all | hurling | football

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadParentData(s.user.id);
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
        await loadParentData(s.user.id);

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
        return { id:`activity-${ex.id}`, label:ex.title, section:"Fitness", icon:"/speed-mechanics-icon.png", color:C.athletic, done:Boolean(claim) && (claim.status || "approved") === "approved", pending:claim?.status === "pending" };
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
      {/* Academy weekly intro */}
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: "16px", marginBottom: 16, boxShadow: "0 5px 18px rgba(15,23,42,0.07)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:52,height:52,borderRadius:15,background:C.primary+"12",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 42, height: 42, objectFit: "contain" }} />
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:1.1,textTransform:"uppercase",color:C.textSecondary,marginBottom:2 }}>This week in Academy</div>
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

      {/* Fitness Exercises   runs, star jumps etc */}
      {fitnessExercises.filter((ex) => (ex.activity_type || "exercise") !== "club" && (ex.activity_type || "exercise") !== "recovery").length > 0 && (
        <div style={{ background:C.surface, border:`1.5px solid ${SECTIONS.fitness.color}33`, borderTop:`5px solid ${SECTIONS.fitness.color}`, borderRadius:18, padding:14, marginBottom:16, boxShadow:"0 4px 14px rgba(15,23,42,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom:10, borderBottom:`1px solid ${SECTIONS.fitness.color}22` }}>
            <img src={SECTIONS.fitness.icon} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: SECTIONS.fitness.color, textTransform: "uppercase", flex: 1 }}>Fitness</div>
            <img src="/speed-mechanics-icon.png" alt="" style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.5 }} />
          </div>
          {fitnessExercises.filter((ex) => (ex.activity_type || "exercise") !== "club" && (ex.activity_type || "exercise") !== "recovery").map((ex) => {
            const done = progress.find((p) => p.exercise_id === ex.id && (p.status || "approved") === "approved");
            return (
              <div id={`activity-${ex.id}`} key={ex.id} style={{ background: done ? C.successBg : C.athleticBg, border: `1.5px solid ${done ? C.success + "44" : C.athletic + "33"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
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
          <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 10 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase" }}>Nothing Set Yet</div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: "6px 0 0" }}>Your coach hasn't set anything for this week yet. Check back soon!</p>
        </div>
      )}

      {/* All done */}
      {totalRequiredTasks > 0 && completedRequiredTasks === totalRequiredTasks && (
        <div style={{ background: C.primary, borderRadius: 16, padding: 20, textAlign: "center", color: "#fff", marginTop: 12, boxShadow: "0 8px 24px rgba(26,92,45,0.3)" }}>
          <img src={APP_ICON} alt="Spraoi Academy" style={{ width: 62, height: 62, objectFit: "contain", marginBottom: 8 }} />
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
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", opacity: .78 }}>My Academy</div>
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
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 16, color: C.primary }}>SPRAOI ACADEMY</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff3e0", borderRadius: 20, padding: "5px 12px" }}>
            <Flame size={14} color="#f97316" fill="#f97316" />
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#f97316" }}>{selectedPlayer.week_streak || selectedPlayer.streak_weeks || 0}</span>
            <span style={{ fontSize: 10, color: C.textSecondary }}>week streak</span>
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
        {screen === "home" && selectedPlayer && renderWeeklyPractice()}
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
