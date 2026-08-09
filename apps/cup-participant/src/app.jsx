import React, { useEffect, useMemo, useState } from "react";
import { Home, CalendarDays, Trophy, Shield, Info, MapPin, Bell, Utensils, ChevronRight, Users, Clock3 } from "lucide-react";
import { supabase } from "./supabaseClient";

const THEME = {
  navy: "#10243E",
  navy2: "#0A1D35",
  teal: "#2E9D74",
  orange: "#E65100",
  gold: "#F4B400",
  cream: "#FFF8EE",
  white: "#FFFFFF",
  ink: "#13243B",
  muted: "#66758A",
  line: "#E1E8EF",
  soft: "#F5F8FB",
};

const EVENT = {
  name: "Summer Hurling Cup",
  host: "Club Spraoi",
  date: "Saturday 22 August 2026",
  venue: "Spraoi Grounds",
  registration: "9:15",
  firstThrowIn: "10:00",
  finish: "15:00",
};

const DEFAULT_CLUBS = [
  { id: "fing", name: "Fingallians GAA", town: "Swords", county: "Dublin" },
  { id: "finian", name: "St. Finian's GAA", town: "Swords", county: "Dublin" },
  { id: "rathvilly", name: "Rathvilly GAA", town: "Rathvilly", county: "Carlow" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth" },
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath" },
  { id: "brayemmets", name: "Bray Emmets GAA", town: "Bray", county: "Wicklow" },
];

function buildTeams(clubs) {
  return clubs.flatMap((c) => ["A", "B"].map((grade) => ({
    id: `${c.id}${grade}`,
    clubId: c.id,
    name: `${c.name} ${grade}`,
    grade,
  })));
}

const DEFAULT_TEAMS = buildTeams(DEFAULT_CLUBS);

async function loadShared(key, fallback) {
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).single();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch {
    return fallback;
  }
}

function scoreTotal(goals = 0, points = 0) { return Number(goals) * 3 + Number(points); }
function scoreLabel(goals = 0, points = 0) { return `${Number(goals)}-${String(Number(points)).padStart(2, "0")}`; }

function computeGroups(teams, matches) {
  const groupMatches = matches.filter((m) => !m.finalLabel && m.teamA && m.teamB);
  const parent = Object.fromEntries(teams.map((t) => [t.id, t.id]));
  const find = (id) => {
    let x = id;
    while (parent[x] && parent[x] !== x) x = parent[x];
    return x;
  };
  groupMatches.forEach((m) => {
    if (!parent[m.teamA] || !parent[m.teamB]) return;
    const a = find(m.teamA), b = find(m.teamB);
    if (a !== b) parent[a] = b;
  });
  const groups = {};
  teams.forEach((t) => {
    const root = find(t.id);
    groups[root] = groups[root] || [];
    groups[root].push(t);
  });
  return Object.values(groups).filter((g) => g.length > 1);
}

function computeStandings(teams, matches) {
  const table = Object.fromEntries(teams.map((t) => [t.id, { ...t, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }]));
  matches.filter((m) => m.status === "finished").forEach((m) => {
    const a = table[m.teamA], b = table[m.teamB];
    if (!a || !b) return;
    a.played++; b.played++;
    const sa = scoreTotal(m.goalsA, m.pointsA), sb = scoreTotal(m.goalsB, m.pointsB);
    if (sa > sb) { a.won++; a.points += 3; b.lost++; }
    else if (sb > sa) { b.won++; b.points += 3; a.lost++; }
    else { a.drawn++; b.drawn++; a.points++; b.points++; }
  });
  return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won || a.name.localeCompare(b.name));
}

function ShellCard({ children, style = {} }) {
  return <div style={{ background: THEME.white, border: `1px solid ${THEME.line}`, borderRadius: 22, boxShadow: "0 10px 28px rgba(16,36,62,.08)", ...style }}>{children}</div>;
}

function ClubMark({ name, size = 48 }) {
  const initials = name.replace(/GAA|CLG|Hurling Club/gi, "").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: size * .32, background: `linear-gradient(135deg, ${THEME.teal}, ${THEME.navy})`, color: "#fff", display: "grid", placeItems: "center", fontFamily: "Nunito", fontWeight: 900, fontSize: size * .34, boxShadow: "0 6px 16px rgba(16,36,62,.18)", flexShrink: 0 }}>{initials}</div>;
}

function BottomNav({ screen, setScreen }) {
  const items = [
    ["home", "Home", Home],
    ["fixtures", "Fixtures", CalendarDays],
    ["standings", "Standings", Trophy],
    ["team", "My Team", Shield],
    ["info", "Info", Info],
  ];
  return <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "min(100%, 540px)", background: "rgba(255,255,255,.96)", backdropFilter: "blur(14px)", borderTop: `1px solid ${THEME.line}`, display: "flex", padding: "8px 6px calc(8px + env(safe-area-inset-bottom, 0px))", zIndex: 40, boxShadow: "0 -10px 30px rgba(16,36,62,.08)" }}>
    {items.map(([key, label, Icon]) => {
      const active = screen === key;
      return <button key={key} onClick={() => setScreen(key)} style={{ flex: 1, border: 0, background: "transparent", display: "flex", flexDirection: "column", gap: 3, alignItems: "center", color: active ? THEME.orange : THEME.muted, fontFamily: "Work Sans", fontWeight: active ? 800 : 600, fontSize: 9, cursor: "pointer" }}>
        <span style={{ width: 34, height: 30, borderRadius: 11, display: "grid", placeItems: "center", background: active ? "#FFF1E8" : "transparent" }}><Icon size={18} strokeWidth={active ? 2.6 : 2} /></span>{label}
      </button>;
    })}
  </div>;
}

function BrandHeader({ club, onChangeClub }) {
  return <>
    <div style={{ background: `linear-gradient(145deg, ${THEME.navy} 0%, #173E63 58%, ${THEME.teal} 140%)`, color: "white", padding: "16px 18px 34px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 190, height: 190, borderRadius: "50%", right: -70, top: -80, background: "rgba(46,157,116,.18)" }} />
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", left: -55, bottom: -70, background: "rgba(230,81,0,.13)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 58, height: 66, borderRadius: 18, background: "rgba(255,255,255,.97)", display: "grid", placeItems: "center", boxShadow: "0 10px 28px rgba(0,0,0,.18)" }}><img src="/club-spraoi-crest.svg" alt="Club Spraoi" style={{ width: 49, height: 57, objectFit: "contain" }} /></div>
          <div><div style={{ fontFamily: "Nunito", fontWeight: 900, fontSize: 18 }}>{EVENT.host}</div><div style={{ fontFamily: "Work Sans", fontSize: 10, color: "rgba(255,255,255,.7)", marginTop: 2 }}>Powered by Spraoi Cup</div></div>
        </div>
        <button onClick={onChangeClub} style={{ border: "1px solid rgba(255,255,255,.24)", background: "rgba(255,255,255,.09)", color: "white", borderRadius: 999, padding: "7px 10px", fontFamily: "Work Sans", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>{club ? "Change club" : "Choose club"}</button>
      </div>
      <div style={{ position: "relative", marginTop: 26 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(244,180,0,.16)", color: "#FFE59A", border: "1px solid rgba(244,180,0,.35)", padding: "5px 9px", borderRadius: 999, fontFamily: "Work Sans", fontWeight: 800, fontSize: 9, letterSpacing: ".05em" }}><Trophy size={12} /> CLUB SPRAOI CUP</div>
        <div style={{ fontFamily: "Nunito", fontSize: 31, lineHeight: 1.02, fontWeight: 900, marginTop: 10, maxWidth: 330 }}>{EVENT.name}</div>
        <div style={{ fontFamily: "Work Sans", fontSize: 11, color: "rgba(255,255,255,.76)", marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}><span>{EVENT.date}</span><span>•</span><span>{EVENT.firstThrowIn} throw-in</span></div>
      </div>
    </div>
    <div style={{ height: 20, background: THEME.cream, borderRadius: "22px 22px 0 0", marginTop: -20, position: "relative", zIndex: 2 }} />
  </>;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [matches, setMatches] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [lunchWindows, setLunchWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [myClub, setMyClub] = useState(() => localStorage.getItem("spraoi_cup_following_club") || "");

  useEffect(() => {
    Promise.all([
      loadShared("teams", DEFAULT_TEAMS),
      loadShared("matches", []),
      loadShared("announcements", []),
      loadShared("sponsors", []),
      loadShared("lunchWindows", []),
    ]).then(([t, m, a, s, l]) => {
      setTeams(Array.isArray(t) && t.length ? t : DEFAULT_TEAMS);
      setMatches(Array.isArray(m) ? m : []);
      setAnnouncements(Array.isArray(a) ? a : []);
      setSponsors(Array.isArray(s) ? s : []);
      setLunchWindows(Array.isArray(l) ? l : []);
      setLoading(false);
    });
  }, []);

  const clubs = useMemo(() => {
    const by = {};
    teams.forEach((t) => { if (!by[t.clubId]) by[t.clubId] = { id: t.clubId, name: t.name.replace(/\s+[AB]$/, "") }; });
    return Object.values(by).length ? Object.values(by) : DEFAULT_CLUBS;
  }, [teams]);
  const club = clubs.find((c) => c.id === myClub) || null;
  const teamIds = teams.filter((t) => t.clubId === myClub).map((t) => t.id);
  const myMatches = matches.filter((m) => teamIds.includes(m.teamA) || teamIds.includes(m.teamB));
  const upcoming = matches.filter((m) => m.status !== "finished" && m.finalLabel !== "Presentations");
  const myUpcoming = myMatches.filter((m) => m.status !== "finished");
  const nextMatch = myUpcoming[0] || upcoming[0];
  const groups = computeGroups(teams, matches);
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id || "TBC" };
  const lunch = lunchWindows.find((w) => (w.clubs || []).includes(myClub));

  function chooseClub(id) {
    setMyClub(id);
    localStorage.setItem("spraoi_cup_following_club", id);
    setChooseOpen(false);
  }

  function HomeScreen() {
    return <div style={{ padding: "0 16px 110px", marginTop: -4 }}>
      {announcements[0] && <div style={{ background: "linear-gradient(135deg,#FFF4DE,#FFE7BD)", border: "1px solid #F5D49D", borderRadius: 18, padding: 13, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}><div style={{ width: 34, height: 34, borderRadius: 12, background: THEME.gold, display: "grid", placeItems: "center", color: THEME.navy }}><Bell size={17} /></div><div><div style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 900, color: THEME.ink }}>Latest update</div><div style={{ fontFamily: "Work Sans", fontSize: 10, lineHeight: 1.5, color: THEME.ink, marginTop: 3 }}>{announcements[0].text}</div></div></div>}

      <ShellCard style={{ padding: 16, marginBottom: 14, background: `linear-gradient(135deg,#fff,${THEME.cream})` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div><div style={{ fontFamily: "Work Sans", fontSize: 9, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Following</div><div style={{ fontFamily: "Nunito", fontSize: 18, color: THEME.ink, fontWeight: 900, marginTop: 3 }}>{club?.name || "Choose your club"}</div></div>
          {club ? <ClubMark name={club.name} size={50} /> : <button onClick={() => setChooseOpen(true)} style={{ border: 0, background: THEME.orange, color: "white", borderRadius: 12, padding: "9px 12px", fontFamily: "Work Sans", fontWeight: 800 }}>Choose</button>}
        </div>
        {club && nextMatch && <div style={{ marginTop: 14, borderRadius: 15, background: THEME.navy, color: "white", padding: 14 }}><div style={{ fontFamily: "Work Sans", color: "rgba(255,255,255,.66)", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>Next match</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}><div><div style={{ fontFamily: "Nunito", fontSize: 16, fontWeight: 900 }}>{nextMatch.time || "TBC"} · {nextMatch.pitch || "Pitch TBC"}</div><div style={{ fontFamily: "Work Sans", fontSize: 10, color: "rgba(255,255,255,.72)", marginTop: 3 }}>{teamById(nextMatch.teamA).name} v {teamById(nextMatch.teamB).name}</div></div><ChevronRight /></div></div>}
      </ShellCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <button onClick={() => setScreen("fixtures")} style={{ border: 0, background: "linear-gradient(135deg,#FFF1E8,#FFE0CF)", borderRadius: 20, padding: 15, textAlign: "left", cursor: "pointer" }}><CalendarDays color={THEME.orange} /><div style={{ fontFamily: "Nunito", fontSize: 14, fontWeight: 900, color: THEME.ink, marginTop: 10 }}>My fixtures</div><div style={{ fontFamily: "Work Sans", fontSize: 9, color: THEME.muted, marginTop: 3 }}>{club ? `${myMatches.length} matches` : "All fixtures"}</div></button>
        <button onClick={() => setScreen("standings")} style={{ border: 0, background: "linear-gradient(135deg,#EAF8F3,#D7F1E6)", borderRadius: 20, padding: 15, textAlign: "left", cursor: "pointer" }}><Trophy color={THEME.teal} /><div style={{ fontFamily: "Nunito", fontSize: 14, fontWeight: 900, color: THEME.ink, marginTop: 10 }}>Standings</div><div style={{ fontFamily: "Work Sans", fontSize: 9, color: THEME.muted, marginTop: 3 }}>Live group tables</div></button>
      </div>

      <ShellCard style={{ padding: 16, marginBottom: 14 }}><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink, fontSize: 16 }}>Today at a glance</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>{[[Clock3,"Registration",EVENT.registration],[Trophy,"Throw-in",EVENT.firstThrowIn],[MapPin,"Venue",EVENT.venue]].map(([Icon,label,value]) => <div key={label} style={{ background: THEME.soft, borderRadius: 14, padding: 11 }}><Icon size={16} color={THEME.orange}/><div style={{ fontFamily: "Work Sans", fontSize: 8, color: THEME.muted, fontWeight: 800, marginTop: 7, textTransform: "uppercase" }}>{label}</div><div style={{ fontFamily: "Nunito", fontSize: 11, color: THEME.ink, fontWeight: 900, marginTop: 3 }}>{value}</div></div>)}</div></ShellCard>

      {club && <ShellCard style={{ padding: 16 }}><div style={{ fontFamily: "Nunito", fontSize: 16, fontWeight: 900, color: THEME.ink }}>Your event day</div><div style={{ marginTop: 11, display: "grid", gap: 8 }}>{[[Utensils,"Lunch break",lunch ? `${lunch.from}–${lunch.to}` : "TBC"],[Users,"Teams",teams.filter((t)=>t.clubId===myClub).map((t)=>t.grade).join(" & ") || "A & B"],[Info,"Need help?","Open Info for venue & contacts"]].map(([Icon,label,value]) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${THEME.line}` }}><div style={{ width: 34, height: 34, borderRadius: 11, background: THEME.soft, display: "grid", placeItems: "center" }}><Icon size={16} color={THEME.teal}/></div><div><div style={{ fontFamily: "Work Sans", fontSize: 9, color: THEME.muted, fontWeight: 800 }}>{label}</div><div style={{ fontFamily: "Nunito", fontSize: 12, color: THEME.ink, fontWeight: 800, marginTop: 2 }}>{value}</div></div></div>)}</div></ShellCard>}
    </div>;
  }

  function FixturesScreen() {
    const list = club ? myMatches : matches;
    return <div style={{ padding: "0 16px 110px" }}><div style={{ fontFamily: "Nunito", fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 14 }}>{club ? "My fixtures" : "Fixtures"}</div><div style={{ display: "grid", gap: 10 }}>{list.length ? list.map((m,i) => <ShellCard key={m.id||i} style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><div><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{m.time || "TBC"} <span style={{ color: THEME.muted, fontWeight: 700, fontSize: 11 }}>· {m.pitch || "Pitch TBC"}</span></div><div style={{ fontFamily: "Work Sans", fontSize: 11, color: THEME.ink, fontWeight: 700, marginTop: 8 }}>{m.finalLabel === "Presentations" ? "Presentations" : `${teamById(m.teamA).name} v ${teamById(m.teamB).name}`}</div></div><span style={{ background: m.status === "live" ? "#FFF2C9" : m.status === "finished" ? "#E8F6EF" : THEME.soft, color: m.status === "live" ? "#8A6500" : m.status === "finished" ? "#157347" : THEME.muted, padding: "5px 8px", borderRadius: 999, fontFamily: "Work Sans", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>{m.status || "scheduled"}</span></div>{m.status === "finished" && <div style={{ marginTop: 10, fontFamily: "Nunito", fontWeight: 900, color: THEME.orange }}>{cupScore(m)}</div>}</ShellCard>) : <ShellCard style={{ padding: 20, color: THEME.muted, fontFamily: "Work Sans" }}>No fixtures published yet.</ShellCard>}</div></div>;
  }

  function cupScore(m) { return `${scoreLabel(m.goalsA,m.pointsA)}  –  ${scoreLabel(m.goalsB,m.pointsB)}`; }

  function StandingsScreen() {
    return <div style={{ padding: "0 16px 110px" }}><div style={{ fontFamily: "Nunito", fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 14 }}>Standings</div><div style={{ display: "grid", gap: 12 }}>{groups.length ? groups.map((group,gi) => { const rows=computeStandings(group,matches); return <ShellCard key={gi} style={{ overflow: "hidden" }}><div style={{ background: gi%2 ? "#EBF8F3" : "#FFF1E8", padding: 13, fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>Group {gi+1}</div>{rows.map((r,i)=><div key={r.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 34px 34px", gap: 8, padding: "10px 13px", borderTop: `1px solid ${THEME.line}`, fontFamily: "Work Sans", fontSize: 10, alignItems: "center" }}><strong style={{ color: i<2?THEME.orange:THEME.muted }}>{i+1}</strong><span style={{ color: THEME.ink, fontWeight: 700 }}>{r.name}</span><span style={{ color: THEME.muted }}>{r.played}</span><strong style={{ color: THEME.ink }}>{r.points}</strong></div>)}</ShellCard>; }) : <ShellCard style={{ padding: 20, color: THEME.muted, fontFamily: "Work Sans" }}>Standings will appear when results are entered.</ShellCard>}</div></div>;
  }

  function TeamScreen() {
    return <div style={{ padding: "0 16px 110px" }}><div style={{ fontFamily: "Nunito", fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 14 }}>My Team</div>{club ? <><ShellCard style={{ padding: 18, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><ClubMark name={club.name} size={58}/><div><div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, color: THEME.ink }}>{club.name}</div><div style={{ fontFamily: "Work Sans", fontSize: 10, color: THEME.muted, marginTop: 3 }}>Following for event updates</div></div></div></ShellCard><ShellCard style={{ padding: 16 }}><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>Schedule snapshot</div>{myMatches.slice(0,6).map((m,i)=><div key={m.id||i} style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10, padding: "10px 0", borderTop: `1px solid ${THEME.line}`, fontFamily: "Work Sans", fontSize: 10 }}><strong>{m.time}</strong><span>{teamById(m.teamA).name} v {teamById(m.teamB).name}</span></div>)}</ShellCard></> : <ShellCard style={{ padding: 20, textAlign: "center" }}><Shield size={34} color={THEME.orange}/><div style={{ fontFamily: "Nunito", fontSize: 17, fontWeight: 900, color: THEME.ink, marginTop: 10 }}>Choose your club</div><button onClick={()=>setChooseOpen(true)} style={{ marginTop: 12, border: 0, background: THEME.orange, color: "white", borderRadius: 12, padding: "10px 14px", fontFamily: "Work Sans", fontWeight: 800 }}>Choose club</button></ShellCard>}</div>;
  }

  function InfoScreen() {
    return <div style={{ padding: "0 16px 110px" }}><div style={{ fontFamily: "Nunito", fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 14 }}>Event info</div><ShellCard style={{ padding: 16, marginBottom: 12 }}><div style={{ display: "flex", gap: 10 }}><MapPin color={THEME.orange}/><div><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{EVENT.venue}</div><div style={{ fontFamily: "Work Sans", fontSize: 10, color: THEME.muted, marginTop: 3 }}>Parking, pitches and event-day directions can be published here.</div></div></div></ShellCard><ShellCard style={{ padding: 16, marginBottom: 12 }}><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>Sponsors</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>{(sponsors.length?sponsors.slice(0,6):[{name:"Local Sponsor"},{name:"Club Partner"},{name:"Event Partner"}]).map((s,i)=><div key={s.id||i} style={{ minHeight: 68, borderRadius: 14, background: THEME.soft, display: "grid", placeItems: "center", textAlign: "center", padding: 8, fontFamily: "Work Sans", fontSize: 9, fontWeight: 800, color: THEME.muted }}>{s.name}</div>)}</div></ShellCard></div>;
  }

  let body = <HomeScreen/>;
  if (screen === "fixtures") body = <FixturesScreen/>;
  else if (screen === "standings") body = <StandingsScreen/>;
  else if (screen === "team") body = <TeamScreen/>;
  else if (screen === "info") body = <InfoScreen/>;

  return <div style={{ minHeight: "100dvh", background: THEME.cream, fontFamily: "Work Sans", color: THEME.ink }}><div style={{ width: "min(100%, 540px)", minHeight: "100dvh", margin: "0 auto", background: THEME.cream, boxShadow: "0 0 50px rgba(16,36,62,.08)" }}><BrandHeader club={club} onChangeClub={()=>setChooseOpen(true)}/>{loading ? <div style={{ padding: 30, textAlign: "center", color: THEME.muted }}>Loading Cup…</div> : body}<BottomNav screen={screen} setScreen={setScreen}/></div>{chooseOpen && <div onClick={()=>setChooseOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(4,18,34,.62)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={(e)=>e.stopPropagation()} style={{ width: "min(100%,540px)", maxHeight: "80dvh", overflow: "auto", background: "white", borderRadius: "26px 26px 0 0", padding: 18 }}><div style={{ width: 42, height: 4, borderRadius: 4, background: THEME.line, margin: "0 auto 14px" }}/><div style={{ fontFamily: "Nunito", fontSize: 21, fontWeight: 900, color: THEME.ink }}>Choose your club</div><div style={{ fontFamily: "Work Sans", fontSize: 10, color: THEME.muted, marginTop: 4, marginBottom: 12 }}>We’ll highlight your fixtures, lunch break and event updates.</div><div style={{ display: "grid", gap: 8 }}>{clubs.map((c)=><button key={c.id} onClick={()=>chooseClub(c.id)} style={{ border: `1px solid ${THEME.line}`, background: myClub===c.id?"#EEF8F4":"white", borderRadius: 16, padding: 11, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" }}><ClubMark name={c.name} size={42}/><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{c.name}</div></button>)}</div></div></div>}</div>;
}
