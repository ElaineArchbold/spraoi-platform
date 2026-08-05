import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Shield, BookOpen, Users, Dumbbell, Check, X, Plus, ChevronRight, Eye, EyeOff, Search, BarChart3, Megaphone, Settings, Palette, UserPlus, Trash2 } from "lucide-react";

/* ============================================================
   SPRAOI CLUB — Admin Console (Navy)
   ============================================================ */
const FONT = { heading: "'League Spartan', sans-serif", body: "Inter, sans-serif" };
const C = {
  base: "#1e3a5f", light: "#2c5282", dark: "#1a2e4a", tint: "#eef2f7",
  accent: "#f4c542", bg: "#f7f8fa", surface: "#ffffff",
  text: "#111827", textSecondary: "#4b5563", textMuted: "#9ca3af",
  border: "#e5e7eb", success: "#10b981", danger: "#ef4444", warning: "#f59e0b",
};

function Header({ club }) {
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.light}, ${C.dark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield size={18} color="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 17, color: C.text }}>Spraoi Club</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>{club?.name} Admin</div>
      </div>
      <img src="/spraoi-icon.png" alt="Spraoi" style={{ width: 28, height: 28, opacity: 0.7 }} />
    </div>
  );
}

function Card({ children, style }) {
  return (<div style={{ background: C.surface, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, ...style }}>{children}</div>);
}

function StatCard({ value, label, color }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT.heading, fontWeight: 900, fontSize: 26, color: color || C.base }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [club, setClub] = useState(null);
  const [activities, setActivities] = useState([]);
  const [clubLibrary, setClubLibrary] = useState([]);
  const [skills, setSkills] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachRole, setNewCoachRole] = useState("coach");
  const [newCoachGroup, setNewCoachGroup] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("");

  useEffect(() => { loadClub(); }, []);

  async function loadClub() {
    const { data } = await supabase.from("clubs").select("*").eq("slug", "fingallians").single();
    if (data) { setClub(data); loadAll(data.id); }
  }
  async function loadAll(clubId) {
    const [acts, lib, sk, co, ag, pl, pr] = await Promise.all([
      supabase.from("activities").select("*, skill:skills(name, category, sport)").or(`club_id.is.null,club_id.eq.${clubId}`).order("title"),
      supabase.from("club_library").select("*").eq("club_id", clubId),
      supabase.from("skills").select("*").order("sport, name"),
      supabase.from("coaches").select("*, age_group:age_groups(label)").eq("club_id", clubId),
      supabase.from("age_groups").select("*").eq("club_id", clubId).order("label"),
      supabase.from("weekly_plans").select("id, week_number, published, created_at").eq("club_id", clubId).order("created_at", { ascending: false }).limit(50),
      supabase.from("player_progress").select("id, xp_earned, completed_at").eq("club_id", clubId).limit(200),
    ]);
    setActivities(acts.data || []); setClubLibrary(lib.data || []); setSkills(sk.data || []);
    setCoaches(co.data || []); setAgeGroups(ag.data || []); setPlans(pl.data || []); setProgress(pr.data || []);
  }

  function isApproved(actId) { if (clubLibrary.length === 0) return true; const e = clubLibrary.find((x) => x.activity_id === actId); return e ? e.approved : false; }
  async function toggleApproval(actId) {
    const existing = clubLibrary.find((e) => e.activity_id === actId);
    if (existing) { await supabase.from("club_library").update({ approved: !existing.approved }).eq("id", existing.id); setClubLibrary((p) => p.map((e) => e.id === existing.id ? { ...e, approved: !e.approved } : e)); }
    else {
      if (clubLibrary.length === 0) { const rows = activities.filter((a) => !a.club_id).map((a) => ({ club_id: club.id, activity_id: a.id, approved: a.id !== actId })); const { data } = await supabase.from("club_library").insert(rows).select(); setClubLibrary(data || []); }
      else { const { data } = await supabase.from("club_library").insert({ club_id: club.id, activity_id: actId, approved: false }).select().single(); if (data) setClubLibrary((p) => [...p, data]); }
    }
  }

  async function addCoach() {
    if (!newCoachName.trim()) return;
    const { data } = await supabase.from("coaches").insert({ club_id: club.id, name: newCoachName.trim(), role: newCoachRole, age_group_id: newCoachGroup || null }).select("*, age_group:age_groups(label)").single();
    if (data) { setCoaches((p) => [...p, data]); setNewCoachName(""); }
  }
  async function removeCoach(id) { await supabase.from("coaches").delete().eq("id", id); setCoaches((p) => p.filter((c) => c.id !== id)); }
  async function addAgeGroup() {
    if (!newAgeGroup.trim()) return;
    const { data } = await supabase.from("age_groups").insert({ club_id: club.id, label: newAgeGroup.trim(), sport: "hurling" }).select().single();
    if (data) { setAgeGroups((p) => [...p, data]); setNewAgeGroup(""); }
  }
  async function removeAgeGroup(id) { await supabase.from("age_groups").delete().eq("id", id); setAgeGroups((p) => p.filter((a) => a.id !== id)); }
  async function postAnnouncement() {
    if (!newAnnouncement.trim()) return;
    setAnnouncements((p) => [{ id: Date.now(), text: newAnnouncement.trim(), time: new Date().toLocaleString() }, ...p]);
    setNewAnnouncement("");
  }

  const thisWeekPlans = plans.filter((p) => { const d = new Date(p.created_at); const now = new Date(); return (now - d) < 7 * 24 * 60 * 60 * 1000; });
  const thisWeekProgress = progress.filter((p) => { const d = new Date(p.completed_at); const now = new Date(); return (now - d) < 7 * 24 * 60 * 60 * 1000; });
  const totalXpThisWeek = thisWeekProgress.reduce((s, p) => s + (p.xp_earned || 0), 0);

  if (!club) { return (<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT.body, gap: 10 }}><img src="/spraoi-icon.png" alt="" style={{ width: 52, height: 52 }} /><span style={{ color: C.textMuted, fontSize: 13 }}>Loading Spraoi Club...</span></div>); }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "library", label: "Library", icon: Dumbbell },
    { key: "coaches", label: "Coaches", icon: Users },
    { key: "announce", label: "Announce", icon: Megaphone },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", minHeight: "100vh", background: C.bg, fontFamily: FONT.body }}>
      <Header club={club} />
      {/* Nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface, overflowX: "auto" }}>
        {navItems.map((tab) => (
          <button key={tab.key} onClick={() => setScreen(tab.key)} style={{ flex: 1, minWidth: 60, padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", borderBottom: screen === tab.key ? `2px solid ${C.base}` : "2px solid transparent", cursor: "pointer", color: screen === tab.key ? C.base : C.textMuted }}>
            <tab.icon size={16} />
            <span style={{ fontSize: 9, fontWeight: 700 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {screen === "dashboard" && (
        <div style={{ padding: "14px" }}>
          <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 14 }}>This Week</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <StatCard value={thisWeekPlans.length} label="Plans Created" color={C.base} />
            <StatCard value={thisWeekProgress.length} label="Tasks Done" color={C.success} />
            <StatCard value={totalXpThisWeek} label="XP Earned" color={C.warning} />
          </div>
          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>Club Overview</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: 10, background: C.tint, borderRadius: 8, textAlign: "center" }}><div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.base }}>{coaches.length}</div><div style={{ fontSize: 10, color: C.textMuted }}>Coaches</div></div>
              <div style={{ padding: 10, background: C.tint, borderRadius: 8, textAlign: "center" }}><div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.base }}>{ageGroups.length}</div><div style={{ fontSize: 10, color: C.textMuted }}>Age Groups</div></div>
              <div style={{ padding: 10, background: C.tint, borderRadius: 8, textAlign: "center" }}><div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.base }}>{activities.length}</div><div style={{ fontSize: 10, color: C.textMuted }}>Activities</div></div>
              <div style={{ padding: 10, background: C.tint, borderRadius: 8, textAlign: "center" }}><div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.base }}>{plans.length}</div><div style={{ fontSize: 10, color: C.textMuted }}>Total Plans</div></div>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>Coach Activity (this week)</div>
            {coaches.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>No coaches added yet.</div> :
              coaches.map((c) => {
                const coachPlans = thisWeekPlans.length; // simplified — would filter by coach in real version
                return (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.base, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{c.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{c.age_group?.label || "Unassigned"}</span>
                </div>);
              })}
          </Card>
        </div>
      )}

      {/* LIBRARY */}
      {screen === "library" && (
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.text }}>Library</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{clubLibrary.filter((e) => e.approved).length || activities.length} visible</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "9px 10px 9px 30px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
            </div>
            <select value={filterSport} onChange={(e) => setFilterSport(e.target.value)} style={{ padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }}>
              <option value="all">All</option><option value="hurling">Hurling</option><option value="football">Football</option><option value="athletic">Athletic</option>
            </select>
          </div>
          {activities.filter((a) => { if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false; if (filterSport !== "all" && a.skill?.sport !== filterSport) return false; return true; }).map((a) => {
            const approved = isApproved(a.id);
            return (
              <div key={a.id} style={{ background: C.surface, border: `1px solid ${approved ? C.border : C.danger + "44"}`, borderRadius: 10, padding: "10px 12px", marginBottom: 5, display: "flex", alignItems: "center", gap: 10, opacity: approved ? 1 : 0.55 }}>
                <button onClick={() => toggleApproval(a.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {approved ? <Eye size={18} color={C.success} /> : <EyeOff size={18} color={C.danger} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>{a.skill?.name} | {a.skill?.sport}</div>
                </div>
                <span style={{ fontSize: 10, color: C.textMuted }}>{a.duration_mins}m</span>
              </div>
            );
          })}
        </div>
      )}

      {/* COACHES */}
      {screen === "coaches" && (
        <div style={{ padding: "14px" }}>
          <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 14 }}>Coaches</div>
          {/* Add coach form */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Add Coach</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input placeholder="Name" value={newCoachName} onChange={(e) => setNewCoachName(e.target.value)} style={{ flex: 2, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <select value={newCoachRole} onChange={(e) => setNewCoachRole(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11 }}>
                <option value="head_coach">Head</option><option value="coach">Coach</option><option value="assistant">Assist</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={newCoachGroup} onChange={(e) => setNewCoachGroup(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11 }}>
                <option value="">Age group (optional)</option>
                {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.label}</option>)}
              </select>
              <button onClick={addCoach} style={{ background: C.base, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><UserPlus size={12} style={{ marginRight: 4 }} />Add</button>
            </div>
          </Card>
          {/* Coach list */}
          {coaches.map((c) => (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.light}, ${C.dark})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.heading, fontSize: 14, fontWeight: 800 }}>{c.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{c.role} {c.age_group ? `| ${c.age_group.label}` : ""}</div>
              </div>
              <button onClick={() => removeCoach(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.danger }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* ANNOUNCEMENTS */}
      {screen === "announce" && (
        <div style={{ padding: "14px" }}>
          <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 14 }}>Announcements</div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>New Announcement</div>
            <textarea placeholder="Message to all coaches and players..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} rows={3} style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: "vertical", fontFamily: FONT.body, marginBottom: 8 }} />
            <button onClick={postAnnouncement} disabled={!newAnnouncement.trim()} style={{ width: "100%", background: newAnnouncement.trim() ? C.base : C.border, color: "#fff", border: "none", borderRadius: 8, padding: 10, fontWeight: 700, fontSize: 13, cursor: newAnnouncement.trim() ? "pointer" : "not-allowed" }}>Post Announcement</button>
          </Card>
          {announcements.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.textMuted, fontSize: 12 }}>No announcements yet.</div>}
          {announcements.map((a) => (
            <div key={a.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{a.text}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS */}
      {screen === "settings" && (
        <div style={{ padding: "14px" }}>
          <div style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 14 }}>Settings</div>

          {/* Club branding */}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Palette size={16} color={C.base} />
              <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.text }}>Club Branding</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: C.tint, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
                {club.logo_url ? <img src={club.logo_url} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} /> : <Shield size={22} color={C.base} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{club.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Slug: {club.slug}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>To update your crest or club name, contact Spraoi Sports support.</div>
          </Card>

          {/* Age groups */}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.text }}>Age Groups</div>
              <span style={{ fontSize: 11, color: C.textMuted }}>{ageGroups.length} groups</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {ageGroups.map((ag) => (
                <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: 4, background: C.tint, border: `1px solid ${C.base}22`, borderRadius: 6, padding: "4px 10px" }}>
                  <span style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 13, color: C.base }}>{ag.label}</span>
                  <button onClick={() => removeAgeGroup(ag.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 12, fontWeight: 700, padding: 0, marginLeft: 4 }}>x</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="e.g. U15" value={newAgeGroup} onChange={(e) => setNewAgeGroup(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <button onClick={addAgeGroup} style={{ background: C.base, color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add</button>
            </div>
          </Card>

          {/* Modules */}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>Active Modules</div>
            {[
              { name: "Spraoi Coach", color: "#0d7377", active: true },
              { name: "Spraoi Journey", color: "#7c3aed", active: true },
              { name: "Spraoi Blitz", color: "#d4652a", active: true },
              { name: "Spraoi Challenge", color: "#c51417", active: false },
              { name: "Spraoi Connect", color: "#2563eb", active: false },
            ].map((m) => (
              <div key={m.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.active ? C.success : C.textMuted }}>{m.active ? "Active" : "Coming soon"}</span>
              </div>
            ))}
          </Card>

          {/* Spraoi branding */}
          <Card style={{ textAlign: "center" }}>
            <img src="/spraoi-logo.png" alt="Spraoi Sports" style={{ width: 100, height: "auto", marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: C.textMuted }}>Growing stronger together</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>Spraoi Club v1.0</div>
          </Card>
        </div>
      )}
    </div>
  );
}
