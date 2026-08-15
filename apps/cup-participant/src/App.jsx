import React, { useEffect, useMemo, useState } from "react";
import { Home, CalendarDays, Trophy, Shield, Info, MapPin, Bell, Utensils, ChevronRight, Users, Clock3, Sparkles, CircleDot, Medal } from "lucide-react";
import { supabase } from "./supabaseClient";
import { CLUB_SPRAOI, CLUB_SPRAOI_THEME, getClubBrand } from "./clubBrand";

const THEME = CLUB_SPRAOI_THEME;

const CUP_UI = {
  primary: "#F05A0A",
  primaryBright: "#FB8C00",
  primaryDark: "#C2410C",
  background: "#FFF7F0",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF9F5",
  text: "#17212B",
  textSecondary: "#667085",
  bodyText: "#1F2937",
  border: "#F1D8C8",
  gold: "#F4C542",
  success: "#16A34A",
};


const EVENT = {
  name: "Summer Hurling Cup",
  host: CLUB_SPRAOI.name,
  date: "Saturday 22 August 2026",
  venue: "Spraoi Grounds",
  registration: "9:15",
  firstThrowIn: "10:00",
  finish: "15:00",
};

const DEFAULT_CLUBS = [
  { id: "fing", name: "Fingallians GAA", town: "Swords", county: "Dublin", logo_url: null, primary_color: "#C62828", secondary_color: "#FFFFFF", accent_color: "#C62828" },
  { id: "finian", name: "St. Finian's GAA", town: "Swords", county: "Dublin", logo_url: null, primary_color: "#1F5A3B", secondary_color: "#FFFFFF", accent_color: "#1F5A3B" },
  { id: "rathvilly", name: "Rathvilly GAA", town: "Rathvilly", county: "Carlow", logo_url: null, primary_color: "#14532D", secondary_color: "#FFFFFF", accent_color: "#FACC15" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth", logo_url: null, primary_color: "#1D4ED8", secondary_color: "#FFFFFF", accent_color: "#FACC15" },
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim", logo_url: null, primary_color: "#111827", secondary_color: "#FFFFFF", accent_color: "#F59E0B" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath", logo_url: null, primary_color: "#1D4ED8", secondary_color: "#FFFFFF", accent_color: "#FACC15" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath", logo_url: null, primary_color: "#FACC15", secondary_color: "#1F2937", accent_color: "#1F2937" },
  { id: "brayemmets", name: "Bray Emmets GAA", town: "Bray", county: "Wicklow", logo_url: null, primary_color: "#2563EB", secondary_color: "#FFFFFF", accent_color: "#16A34A" },
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

async function saveShared(key, value) {
  const { error } = await supabase.from("kv_store").upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
  return value;
}
const eventKey = (eventId, section) => `cup:event:${eventId}:${section}`;

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
  return <div style={{
    background: CUP_UI.surface,
    border: `1px solid ${CUP_UI.border}`,
    borderRadius: 16,
    boxShadow: "0 4px 14px rgba(15,23,42,.055)",
    ...style
  }}>{children}</div>;
}

function ClubMark({ club, size = 48 }) {
  const brand = getClubBrand(club);
  const initials = brand.name.replace(/GAA|CLG|Hurling Club/gi, "").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  if (brand.logoUrl) {
    return <div style={{ width: size, height: size, borderRadius: size * .28, background: brand.secondary, border: `1px solid ${THEME.line}`, display: "grid", placeItems: "center", overflow: "hidden", boxShadow: "0 6px 16px rgba(16,36,62,.16)", flexShrink: 0 }}>
      <img src={brand.logoUrl} alt={brand.name} style={{ width: "86%", height: "86%", objectFit: "contain" }} />
    </div>;
  }

  return <div style={{ width: size, height: size, borderRadius: size * .32, background: `linear-gradient(135deg, ${brand.accent}, ${brand.primary})`, color: "#fff", display: "grid", placeItems: "center", fontFamily: "Nunito", fontWeight: 900, fontSize: size * .34, boxShadow: "0 6px 16px rgba(16,36,62,.18)", flexShrink: 0 }}>{initials}</div>;
}

function BottomNav({ screen, setScreen }) {
  const items = [
    ["home", "Home", Home],
    ["fixtures", "Fixtures", CalendarDays],
    ["standings", "Standings", Trophy],
    ["team", "My Team", Shield],
    ["info", "Info", Info],
  ];

  return (
    <div style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      background: "#fff",
      borderTop: `1px solid ${CUP_UI.border}`,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "8px 0 calc(12px + env(safe-area-inset-bottom, 0px))",
      zIndex: 900,
      boxShadow: "0 -4px 20px rgba(0,0,0,.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: "100%", maxWidth: 560, padding: "0 8px", boxSizing: "border-box" }}>
        {items.map(([key, label, Icon]) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              style={{
                flex: 1,
                border: 0,
                background: active ? CUP_UI.primary : "transparent",
                color: active ? "#fff" : CUP_UI.textSecondary,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px 5px",
                borderRadius: 12,
                cursor: "pointer",
                gap: 2,
                boxShadow: active ? "0 3px 10px rgba(240,90,10,.22)" : "none",
                transition: "all .15s",
                fontFamily: "Inter",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.6 : 2} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrandHeader({ club, event, onChangeClub, liveCount = 0 }) {
  return (
    <>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0 10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/spraoi-cup-icon.png" alt="Spraoi Cup" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span style={{
            fontFamily: "'League Spartan', Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 16,
            color: CUP_UI.primary,
            textTransform: "uppercase",
          }}>
            SPRAOI CUP
          </span>
        </div>

        {liveCount > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#FFF3E8",
            borderRadius: 20,
            padding: "5px 10px",
            color: CUP_UI.primaryDark,
          }}>
            <CircleDot size={12} />
            <span style={{ fontSize: 10, fontWeight: 900 }}>{liveCount} LIVE</span>
          </div>
        )}
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${CUP_UI.primary}, ${CUP_UI.primaryBright})`,
        borderRadius: 16,
        padding: "14px 16px",
        color: "#fff",
        marginBottom: 14,
        boxShadow: "0 6px 18px rgba(240,90,10,.24)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: "rgba(255,255,255,.96)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            {club
              ? <ClubMark club={club} size={42} />
              : <img src="/spraoi-cup-icon.png" alt="" style={{ width: 38, height: 38, objectFit: "contain" }} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'League Spartan', Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 19,
              lineHeight: 1.08,
              overflowWrap: "anywhere",
            }}>
              {event?.name || EVENT.name}
            </div>
            <div style={{ fontSize: 10.5, opacity: .86, marginTop: 4 }}>
              {event?.date || EVENT.date}
              {(event?.venue || EVENT.venue) ? ` · ${event?.venue || EVENT.venue}` : ""}
            </div>
          </div>

          <button
            onClick={onChangeClub}
            style={{
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(255,255,255,.12)",
              color: "#fff",
              borderRadius: 10,
              padding: "7px 9px",
              fontFamily: "Inter",
              fontSize: 9,
              fontWeight: 800,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {club ? "Change" : "Choose club"}
          </button>
        </div>

        <div style={{
          marginTop: 11,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,.20)",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 9, opacity: .72, textTransform: "uppercase", fontWeight: 800 }}>Following</div>
            <div style={{ fontFamily: "'League Spartan', Nunito, sans-serif", fontWeight: 800, fontSize: 13, marginTop: 1 }}>
              {club?.name || "Choose your club"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, opacity: .72, textTransform: "uppercase", fontWeight: 800 }}>First throw-in</div>
            <div style={{ fontFamily: "'League Spartan', Nunito, sans-serif", fontWeight: 900, fontSize: 14, marginTop: 1 }}>
              {event?.firstThrowIn || EVENT.firstThrowIn}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [welcomeExpanded, setWelcomeExpanded] = useState(false);
  const params = new URLSearchParams(location.search);
  const requestedEventId = params.get("event") || "";
  const previewMode = params.get("preview") === "1";
  const refId = params.get("ref") || "";
  const [eventId, setEventId] = useState(requestedEventId);
  const [event, setEvent] = useState(EVENT);
  const [eventInfo, setEventInfo] = useState({});
  const [foodMenu, setFoodMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refAccess, setRefAccess] = useState(null);
  const [screen, setScreen] = useState("home");
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [matches, setMatches] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [lunchWindows, setLunchWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [announcementToast, setAnnouncementToast] = useState(null);
  const [myClub, setMyClub] = useState(() => localStorage.getItem("spraoi_cup_following_club") || "");
  // Keep food-order form state at App level so parent data refreshes do not wipe what the user typed.
  const [foodTeamId,setFoodTeamId]=useState("");
  const [foodCode,setFoodCode]=useState("");
  const [foodContact,setFoodContact]=useState("");
  const [foodMobile,setFoodMobile]=useState("");
  const [foodQty,setFoodQty]=useState({});
  const [foodMsg,setFoodMsg]=useState("");
  const [foodReviewOpen,setFoodReviewOpen]=useState(false);
  const [foodReviewedTeam,setFoodReviewedTeam]=useState("");
  const [foodToast,setFoodToast]=useState("");

  useEffect(() => {
    let cancelled = false;

    const loadEventData = async () => {
      setLoading(true);

      const es = await loadShared("cup:events", []);
      const allEvents = Array.isArray(es) ? es : [];

      let resolvedId = requestedEventId;
      if (!resolvedId || !allEvents.some((e) => e.id === resolvedId)) {
        const live = allEvents.find((e) => e.status === "live");
        const published = allEvents.find((e) => e.status === "published");
        const previewDraft = previewMode ? allEvents.find((e) => e.status === "draft") : null;
        resolvedId = live?.id || published?.id || previewDraft?.id || allEvents[0]?.id || "";
      }

      if (cancelled) return;
      setEventId(resolvedId);

      if (!resolvedId) {
        setEvent(EVENT);
        setEventInfo({});
        setFoodMenu([]);
        setMatches([]);
        setAnnouncements([]);
        setSponsors([]);
        setLunchWindows([]);
        setLoading(false);
        return;
      }

      const prefix = `cup:event:${resolvedId}:`;
      const [c,t,m,a,sp,inf,fm,ord,ra,l] = await Promise.all([
        loadShared(prefix + "clubs", DEFAULT_CLUBS),
        loadShared(prefix + "teams", DEFAULT_TEAMS),
        loadShared(prefix + "matches", []),
        loadShared(prefix + "announcements", []),
        loadShared(prefix + "sponsors", []),
        loadShared(prefix + "eventInfo", {}),
        loadShared(prefix + "foodMenu", []),
        loadShared(prefix + "orders", []),
        loadShared(prefix + "refereeAccess", []),
        loadShared(prefix + "lunchWindows", []),
      ]);

      if (cancelled) return;

      const ev = allEvents.find((e) => e.id === resolvedId);
      if (ev) setEvent({ ...EVENT, ...ev });

      setClubs(Array.isArray(c) && c.length ? c : DEFAULT_CLUBS);
      setTeams(Array.isArray(t) && t.length ? t : DEFAULT_TEAMS);
      setMatches(Array.isArray(m) ? m : []);
      setAnnouncements(Array.isArray(a) ? a : []);
      setSponsors(Array.isArray(sp) ? sp : []);
      setEventInfo(inf || {});
      setFoodMenu(Array.isArray(fm) ? fm : []);
      setOrders(Array.isArray(ord) ? ord : []);
      setRefAccess((ra || []).find((r) => r.id === refId) || null);
      setLunchWindows(Array.isArray(l) ? l : []);
      setLoading(false);

      if (!requestedEventId && resolvedId) {
        const next = new URLSearchParams(location.search);
        next.set("event", resolvedId);
        history.replaceState(null, "", `${location.pathname}?${next.toString()}`);
      }
    };

    loadEventData().catch((error) => {
      console.error("Cup participant event load failed", error);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [requestedEventId, refId, previewMode]);

  useEffect(() => {
    if (!eventId) return;
    const prefix = `cup:event:${eventId}:`;
    const refresh = async () => {
      const [m,a,sp,inf,fm,ord,l] = await Promise.all([
        loadShared(prefix+"matches", []),
        loadShared(prefix+"announcements", []),
        loadShared(prefix+"sponsors", []),
        loadShared(prefix+"eventInfo", {}),
        loadShared(prefix+"foodMenu", []),
        loadShared(prefix+"orders", []),
        loadShared(prefix+"lunchWindows", []),
      ]);
      setMatches(Array.isArray(m)?m:[]);
      setAnnouncements(Array.isArray(a)?a:[]);
      setSponsors(Array.isArray(sp)?sp:[]);
      setEventInfo(inf||{});
      setFoodMenu(Array.isArray(fm)?fm:[]);
      setOrders(Array.isArray(ord)?ord:[]);
      setLunchWindows(Array.isArray(l)?l:[]);
      setClock(Date.now());
    };
    const timer=setInterval(refresh,15000);
    return ()=>clearInterval(timer);
  }, [eventId]);

  const club = clubs.find((c) => c.id === myClub) || null;
  const teamIds = teams.filter((t) => t.clubId === myClub).map((t) => t.id);
  const myMatches = matches.filter((m) => teamIds.includes(m.teamA) || teamIds.includes(m.teamB));
  const upcoming = matches.filter((m) => m.status !== "finished" && m.finalLabel !== "Presentations");
  const myUpcoming = myMatches.filter((m) => m.status !== "finished");
  const nextMatch = myUpcoming[0] || upcoming[0];
  const groups = computeGroups(teams, matches);
  const teamById = (id) => {
    const team = teams.find((t) => t.id === id);
    if (!team) return { name: id || "TBC", club: null };
    return { ...team, club: clubs.find((c) => c.id === team.clubId) || null };
  };
  const lunch = lunchWindows.find((w) => (w.clubs || w.clubIds || []).includes(myClub));
  const now = new Date(clock);
  const activeAnnouncements = announcements.filter((a) => {
    if (a.active === false || a.status === "draft") return false;
    const publish = a.publishAt || a.startsAt;
    const expiry = a.expiresAt || a.endsAt;
    const start = publish ? new Date(publish) : null;
    const end = expiry ? new Date(expiry) : null;
    if (a.status === "scheduled" && start && start > now) return false;
    return (!start || start <= now) && (!end || end >= now);
  }).sort((a,b)=>new Date(b.publishAt||b.createdAt||0)-new Date(a.publishAt||a.createdAt||0));
  const activeSponsors = sponsors.filter((s)=>s.active!==false).sort((a,b)=>(a.sort_order||999)-(b.sort_order||999));
  const mainSponsors = activeSponsors.filter((s)=>s.label==="Main Sponsor");

  useEffect(() => {
    const newest=activeAnnouncements[0];
    if(!newest)return;
    const seenKey=`cup_seen_announcement_${eventId}`;
    let seen="";
    try{seen=localStorage.getItem(seenKey)||""}catch{}
    if(seen!==newest.id){
      setAnnouncementToast(newest);
      try{localStorage.setItem(seenKey,newest.id)}catch{}
      const timer=setTimeout(()=>setAnnouncementToast(null),5000);
      return ()=>clearTimeout(timer);
    }
  }, [activeAnnouncements[0]?.id, eventId]);

  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedCount = matches.filter((m) => m.status === "finished").length;

  function chooseClub(id) {
    setMyClub(id);
    localStorage.setItem("spraoi_cup_following_club", id);
    setChooseOpen(false);
  }

  function HomeScreen() {
    return <div style={{ padding: "0 0 26px", marginTop: -4 }}>
      
      {activeAnnouncements[0] && <div style={{ background: "linear-gradient(135deg,#FFF4DE,#FFE7BD)", border: "1px solid #F5D49D", borderRadius: 18, padding: 13, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}><div style={{ width: 34, height: 34, borderRadius: 12, background: THEME.gold, display: "grid", placeItems: "center", color: THEME.navy, fontSize:18 }}>{activeAnnouncements[0].emoji || <Bell size={17} />}</div><div><div style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 900, color: THEME.ink }}>{activeAnnouncements[0].title || "Latest update"}</div><div style={{ fontFamily: "Inter", fontSize: 10, lineHeight: 1.5, color: THEME.ink, marginTop: 3 }} dangerouslySetInnerHTML={{__html:activeAnnouncements[0].html||activeAnnouncements[0].text||""}} /></div></div>}

      {eventInfo.welcomeMessage && <ShellCard style={{padding:14,marginBottom:14,borderTop:`4px solid ${CUP_UI.primary}`}}><div style={{fontFamily:"Nunito",fontSize:16,fontWeight:900,color:THEME.ink}}>Welcome</div><div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.55,color:CUP_UI.bodyText,marginTop:5,maxHeight:welcomeExpanded?"none":62,overflow:"hidden",position:"relative"}}>{eventInfo.welcomeMessage}</div>{String(eventInfo.welcomeMessage||"").length>170&&<button onClick={()=>setWelcomeExpanded(v=>!v)} style={{border:0,background:"transparent",padding:"7px 0 0",color:THEME.orange,fontFamily:"Inter",fontSize:9,fontWeight:900,cursor:"pointer"}}>{welcomeExpanded?"Show less":"Read more"}</button>}</ShellCard>}
      <ShellCard style={{ padding: 15, marginBottom: 14, background: CUP_UI.surface }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div><div style={{ fontFamily: "Inter", fontSize: 9, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Following</div><div style={{ fontFamily: "Nunito", fontSize: 18, color: THEME.ink, fontWeight: 900, marginTop: 3 }}>{club?.name || "Choose your club"}</div></div>
          {club ? <ClubMark club={club} size={50} /> : <button onClick={() => setChooseOpen(true)} style={{ border: 0, background: THEME.orange, color: "white", borderRadius: 12, padding: "9px 12px", fontFamily: "Inter", fontWeight: 800 }}>Choose</button>}
        </div>
        {club && nextMatch && <div style={{ marginTop: 12, borderRadius: 14, background: "#FFF3E8", border: `1.5px solid ${CUP_UI.primary}22`, color: CUP_UI.text, padding: 13 }}><div style={{ fontFamily: "Inter", color: CUP_UI.primaryDark, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>Next match</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}><div><div style={{ fontFamily: "Nunito", fontSize: 16, fontWeight: 900 }}>{nextMatch.time || "TBC"} · {nextMatch.pitch || "Pitch TBC"}</div><div style={{ fontFamily: "Inter", fontSize: 10, color: CUP_UI.textSecondary, marginTop: 3 }}>{teamById(nextMatch.teamA).name} v {teamById(nextMatch.teamB).name}</div></div><ChevronRight /></div></div>}
      </ShellCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setScreen("fixtures")} style={{ border: `1px solid ${CUP_UI.border}`, background: "#fff", borderRadius: 14, padding: 12, textAlign: "left", cursor: "pointer" }}>
          <CalendarDays size={20} color={CUP_UI.primary}/>
          <div style={{ fontFamily: "'League Spartan', Nunito, sans-serif", fontSize: 12, fontWeight: 800, color: CUP_UI.text, marginTop: 8 }}>Fixtures</div>
          <div style={{ fontSize: 8.5, color: CUP_UI.textSecondary, marginTop: 2 }}>{club ? `${myMatches.length} matches` : "All matches"}</div>
        </button>
        <button onClick={() => setScreen("standings")} style={{ border: `1px solid ${CUP_UI.border}`, background: "#fff", borderRadius: 14, padding: 12, textAlign: "left", cursor: "pointer" }}>
          <Trophy size={20} color="#D6A700"/>
          <div style={{ fontFamily: "'League Spartan', Nunito, sans-serif", fontSize: 12, fontWeight: 800, color: CUP_UI.text, marginTop: 8 }}>Standings</div>
          <div style={{ fontSize: 8.5, color: CUP_UI.textSecondary, marginTop: 2 }}>Live tables</div>
        </button>
        <button onClick={() => setScreen("food")} style={{ border: `1px solid ${CUP_UI.border}`, background: "#fff", borderRadius: 14, padding: 12, textAlign: "left", cursor: "pointer" }}>
          <Utensils size={20} color="#16A34A"/>
          <div style={{ fontFamily: "'League Spartan', Nunito, sans-serif", fontSize: 12, fontWeight: 800, color: CUP_UI.text, marginTop: 8 }}>Food</div>
          <div style={{ fontSize: 8.5, color: CUP_UI.textSecondary, marginTop: 2 }}>{foodMenu.length ? "Orders & lunch" : "Event food"}</div>
        </button>
      </div>

      {liveMatches.length > 0 && <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
          <div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink, fontSize: 16 }}>Live now</div>
          <span style={{ background: "#FFF2C9", color: "#8A6500", padding: "5px 9px", borderRadius: 999, fontFamily: "Inter", fontSize: 8, fontWeight: 900 }}>{liveMatches.length} LIVE</span>
        </div>
        <div style={{ display: "grid", gap: 9 }}>{liveMatches.slice(0,2).map((m,i)=><ShellCard key={m.id||i} style={{ padding: 13, border: "1px solid #F3CA63", boxShadow: "0 12px 30px rgba(244,180,0,.14)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{m.time || "TBC"} <span style={{ color: THEME.muted, fontSize: 10 }}>· {m.pitch || "Pitch TBC"}</span></div><div style={{ fontFamily: "Inter", fontSize: 10, color: THEME.ink, fontWeight: 700, marginTop: 6 }}>{teamById(m.teamA).name} v {teamById(m.teamB).name}</div></div><CircleDot size={17} color={THEME.gold}/></div></ShellCard>)}</div>
      </div>}

      <ShellCard style={{ padding: 16, marginBottom: 14 }}><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink, fontSize: 16 }}>Today at a glance</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>{[[Clock3,"Registration",event.registration||EVENT.registration],[Trophy,"Throw-in",event.firstThrowIn||EVENT.firstThrowIn],[MapPin,"Venue",event.venue||EVENT.venue]].map(([Icon,label,value]) => <div key={label} style={{ background: THEME.soft, borderRadius: 14, padding: 11 }}><Icon size={16} color={THEME.orange}/><div style={{ fontFamily: "Inter", fontSize: 8, color: THEME.muted, fontWeight: 800, marginTop: 7, textTransform: "uppercase" }}>{label}</div><div style={{ fontFamily: "Nunito", fontSize: 11, color: THEME.ink, fontWeight: 900, marginTop: 3 }}>{value}</div></div>)}</div></ShellCard>

      {club && <ShellCard style={{ padding: 16, marginBottom:14 }}><div style={{ fontFamily: "Nunito", fontSize: 16, fontWeight: 900, color: THEME.ink }}>Your event day</div><div style={{ marginTop: 11, display: "grid", gap: 8 }}>{[
        [Utensils,"Lunch break",lunch ? `${lunch.from}–${lunch.to}` : "Lunch time will appear here once the schedule is generated"],
        [Users,"Your teams",teams.filter((t)=>t.clubId===myClub).map((t)=>t.grade||t.name).filter(Boolean).join(" & ") || "No teams added yet"],
        [CalendarDays,"Next match",nextMatch ? `${nextMatch.time||"TBC"} · ${nextMatch.pitch||"Pitch TBC"}` : "No upcoming match"],
        [Info,"Need help?","Open Info for parking, facilities & contacts"]
      ].map(([Icon,label,value]) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${THEME.line}` }}><div style={{ width: 34, height: 34, borderRadius: 11, background: THEME.soft, display: "grid", placeItems: "center" }}><Icon size={16} color={THEME.teal}/></div><div><div style={{ fontFamily: "Inter", fontSize: 9, color: THEME.muted, fontWeight: 800 }}>{label}</div><div style={{ fontFamily: "Nunito", fontSize: 12, color: THEME.ink, fontWeight: 800, marginTop: 2 }}>{value}</div></div></div>)}</div></ShellCard>}
      {(eventInfo.parking||eventInfo.facilities) && <ShellCard style={{padding:15,marginBottom:14}}><div style={{fontFamily:"Nunito",fontSize:16,fontWeight:900,color:THEME.ink}}>Before you arrive</div>{eventInfo.parking&&<div style={{marginTop:9}}><div style={{fontFamily:"Inter",fontSize:9,fontWeight:900,color:THEME.orange}}>PARKING</div><div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.5,color:CUP_UI.bodyText,marginTop:3}}>{eventInfo.parking}</div></div>}{eventInfo.facilities&&<button onClick={()=>setScreen("info")} style={{marginTop:10,border:0,background:"transparent",padding:0,color:THEME.orange,fontWeight:900,fontSize:10}}>View facilities & full event info →</button>}</ShellCard>}
      {activeSponsors.length>0 && <ShellCard style={{padding:15,marginBottom:14}}><div style={{fontFamily:"Nunito",fontSize:16,fontWeight:900,color:THEME.ink,textAlign:"center"}}>Thanks to our event supporters</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>{activeSponsors.slice(0,6).map(sp=><div key={sp.id} style={{height:72,borderRadius:13,background:THEME.soft,display:"grid",placeItems:"center",padding:8}}>{sp.logo_url?<img src={sp.logo_url} alt={sp.name} style={{maxWidth:"90%",maxHeight:48,objectFit:"contain"}}/>:<span style={{fontSize:8,fontWeight:800,textAlign:"center"}}>{sp.name}</span>}</div>)}</div></ShellCard>}
      {mainSponsors.length>0 && (
        <ShellCard style={{padding:12,marginTop:14,textAlign:"center"}}>
          <div style={{fontSize:8,fontWeight:900,color:CUP_UI.textSecondary,textTransform:"uppercase",letterSpacing:".08em"}}>Proudly supported by</div>
          <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginTop:8}}>
            {mainSponsors.map(sp=><div key={sp.id} style={{width:130,height:48,display:"grid",placeItems:"center"}}>{sp.logo_url?<img src={sp.logo_url} alt={sp.name} style={{maxWidth:"90%",maxHeight:42,objectFit:"contain"}}/>:<b style={{fontSize:9}}>{sp.name}</b>}</div>)}
          </div>
        </ShellCard>
      )}
    </div>;
  }

  function FixturesScreen() {
    const list = club ? myMatches : matches;
    return <div style={{ padding: "0 0 26px" }}><div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, textTransform: "uppercase", color: THEME.ink, marginBottom: 14 }}>{club ? "My fixtures" : "Fixtures"}</div><div style={{ display: "grid", gap: 10 }}>{list.length ? list.map((m,i) => <ShellCard key={m.id||i} style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><div><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{m.time || "TBC"} <span style={{ color: THEME.muted, fontWeight: 700, fontSize: 11 }}>· {m.pitch || "Pitch TBC"}</span></div><div style={{ fontFamily: "Inter", fontSize: 11, color: THEME.ink, fontWeight: 700, marginTop: 8 }}>{m.finalLabel === "Presentations" ? "Presentations" : `${teamById(m.teamA).name} v ${teamById(m.teamB).name}`}</div></div><span style={{ background: m.status === "live" ? "#FFF2C9" : m.status === "finished" ? "#E8F6EF" : THEME.soft, color: m.status === "live" ? "#8A6500" : m.status === "finished" ? "#157347" : THEME.muted, padding: "5px 8px", borderRadius: 999, fontFamily: "Inter", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>{m.status || "scheduled"}</span></div>{m.status === "finished" && <div style={{ marginTop: 10, fontFamily: "Nunito", fontWeight: 900, color: THEME.orange }}>{cupScore(m)}</div>}</ShellCard>) : <ShellCard style={{ padding: 20, color: THEME.muted, fontFamily: "Inter" }}>No fixtures published yet.</ShellCard>}</div></div>;
  }

  function cupScore(m) { return `${scoreLabel(m.goalsA,m.pointsA)}  –  ${scoreLabel(m.goalsB,m.pointsB)}`; }

  function StandingsScreen() {
    return <div style={{ padding: "0 0 26px" }}><div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, textTransform: "uppercase", color: THEME.ink, marginBottom: 14 }}>Standings</div><div style={{ display: "grid", gap: 12 }}>{groups.length ? groups.map((group,gi) => { const rows=computeStandings(group,matches); return <ShellCard key={gi} style={{ overflow: "hidden" }}><div style={{ background: gi%2 ? "#EBF8F3" : "#FFF1E8", padding: 13, fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>Group {gi+1}</div>{rows.map((r,i)=><div key={r.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 34px 34px", gap: 8, padding: "10px 13px", borderTop: `1px solid ${THEME.line}`, fontFamily: "Inter", fontSize: 10, alignItems: "center" }}><strong style={{ color: i<2?THEME.orange:THEME.muted }}>{i+1}</strong><span style={{ color: THEME.ink, fontWeight: 700 }}>{r.name}</span><span style={{ color: THEME.muted }}>{r.played}</span><strong style={{ color: THEME.ink }}>{r.points}</strong></div>)}</ShellCard>; }) : <ShellCard style={{ padding: 20, color: THEME.muted, fontFamily: "Inter" }}>Standings will appear when results are entered.</ShellCard>}</div></div>;
  }

  function TeamScreen() {
    return <div style={{ padding: "0 0 26px" }}><div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, textTransform: "uppercase", color: THEME.ink, marginBottom: 14 }}>My Team</div>{club ? <><ShellCard style={{ padding: 18, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><ClubMark club={club} size={58} /><div><div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, color: THEME.ink }}>{club.name}</div><div style={{ fontFamily: "Inter", fontSize: 10, color: THEME.muted, marginTop: 3 }}>Following for event updates</div></div></div></ShellCard><ShellCard style={{ padding: 16 }}><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>Schedule snapshot</div>{myMatches.slice(0,6).map((m,i)=><div key={m.id||i} style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10, padding: "10px 0", borderTop: `1px solid ${THEME.line}`, fontFamily: "Inter", fontSize: 10 }}><strong>{m.time}</strong><span>{teamById(m.teamA).name} v {teamById(m.teamB).name}</span></div>)}</ShellCard></> : <ShellCard style={{ padding: 20, textAlign: "center" }}><Shield size={34} color={THEME.orange}/><div style={{ fontFamily: "Nunito", fontSize: 17, fontWeight: 900, color: THEME.ink, marginTop: 10 }}>Choose your club</div><button onClick={()=>setChooseOpen(true)} style={{ marginTop: 12, border: 0, background: THEME.orange, color: "white", borderRadius: 12, padding: "10px 14px", fontFamily: "Inter", fontWeight: 800 }}>Choose club</button></ShellCard>}</div>;
  }

  function InfoScreen() {
    const myLunch=lunch
      ? `${lunch.from}–${lunch.to}`
      : (lunchWindows.length
          ? lunchWindows.map((w,i)=>`Lunch ${i+1}: ${w.from}–${w.to}`).join(" · ")
          : "");

    const sections=[
      ["Welcome",eventInfo.welcomeMessage,{image_url:eventInfo.welcomeMessageImage,link_url:eventInfo.welcomeMessageLink}],
      ["Arrival & Registration",eventInfo.arrivalRegistration,{image_url:eventInfo.arrivalRegistrationImage,link_url:eventInfo.arrivalRegistrationLink}],
      ["Facilities",eventInfo.facilities,{image_url:eventInfo.facilitiesImage,link_url:eventInfo.facilitiesLink}],
      ["Parking & Directions",eventInfo.parking,{image_url:eventInfo.parkingImage,link_url:eventInfo.parkingLink}],
      ["Pitch / Venue Information",eventInfo.venueInfo,{image_url:eventInfo.venueInfoImage,link_url:eventInfo.venueInfoLink}],
      ["Food & Drink",eventInfo.foodAndDrink,{image_url:eventInfo.foodAndDrinkImage,link_url:eventInfo.foodAndDrinkLink}],
      ["Your Lunch Time",myLunch],
      ["Health & Safety / Medical",eventInfo.healthAndSafety,{image_url:eventInfo.healthAndSafetyImage,link_url:eventInfo.healthAndSafetyLink}],
      ["Playing Rules",eventInfo.playingRules,{image_url:eventInfo.playingRulesImage,link_url:eventInfo.playingRulesLink}],
      ["Contacts / Communications",eventInfo.contacts,{image_url:eventInfo.contactsImage,link_url:eventInfo.contactsLink}],
      ["Other Information",eventInfo.other,{image_url:eventInfo.otherImage,link_url:eventInfo.otherLink}],
      ...(Array.isArray(eventInfo.customSections)
        ? eventInfo.customSections
            .filter((section)=>String(section?.heading||"").trim() && (String(section?.content||"").trim() || section?.image_url || section?.link_url))
            .map((section)=>[section.heading,section.content,section])
        : [])
    ].filter(([,text,meta])=>String(text||"").trim() || meta?.image_url || meta?.link_url);

    return <div style={{ padding: "0 0 26px" }}>
      <div style={{ fontFamily: "Nunito", fontSize: 18, fontWeight: 900, textTransform: "uppercase", color: THEME.ink, marginBottom: 14 }}>Event info</div>
      {sections.map(([label,text,meta])=><ShellCard key={label} style={{padding:16,marginBottom:12,borderLeft:`4px solid ${THEME.orange}`}}><div style={{fontFamily:"Nunito",fontWeight:900,color:THEME.ink}}>{label}</div>{meta?.image_url&&<img src={meta.image_url} alt={label} style={{width:"100%",maxHeight:240,objectFit:"cover",borderRadius:12,marginTop:10}}/>}<div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.55,color:CUP_UI.bodyText,marginTop:5,whiteSpace:"pre-wrap"}}>{text}</div>{meta?.link_url&&<a href={meta.link_url} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:9,color:THEME.orange,fontFamily:"Inter",fontSize:10,fontWeight:900}}>{meta.link_label||"Open link"} ↗</a>}</ShellCard>)}
      {activeAnnouncements.length>0&&<ShellCard style={{padding:16,marginBottom:12}}><div style={{fontFamily:"Nunito",fontWeight:900,color:THEME.ink}}>Latest announcements</div>{activeAnnouncements.map(a=><div key={a.id} style={{padding:"10px 0",borderTop:`1px solid ${THEME.line}`}}><div style={{fontFamily:"Nunito",fontSize:12,fontWeight:900}}>{a.emoji||"📣"} {a.title||"Update"}</div><div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.5,color:CUP_UI.bodyText,marginTop:4}} dangerouslySetInnerHTML={{__html:a.html||a.text||""}}/></div>)}</ShellCard>}
      {activeSponsors.length>0&&<ShellCard style={{padding:16}}><div style={{fontFamily:"Nunito",fontWeight:900,color:THEME.ink}}>Sponsors & Event Partners</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginTop:12}}>{activeSponsors.map((sp,i)=><div key={sp.id||i} style={{minHeight:100,borderRadius:14,background:THEME.soft,display:"grid",placeItems:"center",padding:10,textAlign:"center"}}>{sp.logo_url?<div><img src={sp.logo_url} alt={sp.name} style={{maxWidth:"92%",maxHeight:58,objectFit:"contain"}}/><div style={{fontSize:8,fontWeight:800,color:THEME.muted,marginTop:4}}>{sp.label||""}</div></div>:<span style={{fontSize:9,fontWeight:800,color:THEME.muted}}>{sp.name}</span>}</div>)}</div></ShellCard>}
    </div>;
  }

  function FoodScreen(){
    const clubTeams=teams.filter(t=>t.clubId===myClub);
    const teamId=foodTeamId || clubTeams[0]?.id || "";
    const setTeamId=setFoodTeamId, code=foodCode, setCode=setFoodCode, contact=foodContact, setContact=setFoodContact, mobile=foodMobile, setMobile=setFoodMobile, qty=foodQty, setQty=setFoodQty, msg=foodMsg, setMsg=setFoodMsg, reviewOpen=foodReviewOpen, setReviewOpen=setFoodReviewOpen, reviewedTeam=foodReviewedTeam, setReviewedTeam=setFoodReviewedTeam, toast=foodToast, setToast=setFoodToast;
    const team=teams.find(t=>t.id===teamId);
    const teamLunch=lunchWindows.find(w=>(w.clubIds||w.clubs||[]).includes(team?.clubId));
    const existing=orders.find(o=>o.teamId===teamId)||null;
    const total=foodMenu.reduce((n,f)=>n+(qty[f.id]||0)*(f.price==null?0:+f.price||0),0);

    useEffect(()=>{
      if(teamId&&existing&&reviewedTeam!==teamId){setReviewOpen(true);setReviewedTeam(teamId)}
    },[teamId,existing?.id]);

    async function submit(){
      setMsg("");
      if(!team){setMsg("Choose a team.");return}
      if(String(code)!==String(team.foodCode||"")){setMsg("Incorrect team order code.");return}
      if(contact.trim().split(/\s+/).length<2){setMsg("Please enter your full name.");return}
      if(!mobile.trim()){setMsg("Please enter a mobile number.");return}
      const added=foodMenu.map(f=>({foodId:f.id,name:f.name,qty:qty[f.id]||0,price:f.price==null?null:+f.price||0})).filter(x=>x.qty>0);
      if(!added.length){setMsg("Add at least one food item.");return}
      let next;
      if(existing){
        const byId={};
        for(const item of (existing.items||[]))byId[item.foodId]={...item};
        for(const item of added){
          if(byId[item.foodId])byId[item.foodId]={...byId[item.foodId],qty:(byId[item.foodId].qty||0)+item.qty,price:item.price,name:item.name};
          else byId[item.foodId]=item;
        }
        const items=Object.values(byId);
        const newTotal=items.reduce((n,x)=>n+(x.qty||0)*(x.price==null?0:+x.price||0),0);
        next=orders.map(o=>o.id===existing.id?{...o,contactName:contact.trim(),mobile:mobile.trim(),items,total:newTotal,updatedAt:new Date().toISOString()}:o);
      }else{
        const order={id:`order-${Date.now()}`,teamId,contactName:contact.trim(),mobile:mobile.trim(),items:added,total,createdAt:new Date().toISOString()};
        next=[...orders,order];
      }
      await saveShared(eventKey(eventId,"orders"),next);
      setOrders(next);
      setQty({});
      setToast(`Order saved${teamLunch?` · collection ${teamLunch.from}–${teamLunch.to}`:""}`);
      setTimeout(()=>setToast(""),4500);
    }

    if(!foodMenu.length)return <div style={{padding:"0 0 26px"}}>
      <div style={{fontFamily:"Nunito",fontSize:18,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Food & drink</div>
      <ShellCard style={{padding:18,borderLeft:`4px solid ${THEME.orange}`}}>
        <div style={{fontFamily:"Nunito",fontSize:15,fontWeight:900,color:THEME.ink}}>Food orders are not enabled yet</div>
        <div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.55,color:CUP_UI.bodyText,marginTop:6}}>
          {eventInfo.foodAndDrink || "Food, refreshments and pre-order information will appear here when the event organiser adds it."}
        </div>
      </ShellCard>
    </div>;
    return <div style={{padding:"0 0 26px"}}>
      <div style={{fontFamily:"Nunito",fontSize:18,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Food orders</div>
      {teamLunch&&<ShellCard style={{padding:15,marginBottom:10,background:"linear-gradient(135deg,#FFF4DE,#FFFFFF)",border:`1px solid #F5D49D`}}><div style={{fontFamily:"Nunito",fontSize:15,fontWeight:900,color:THEME.ink}}>🍔 Your lunch: {teamLunch.from}–{teamLunch.to}</div><div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.5,color:CUP_UI.bodyText,marginTop:4}}>Everything pre-ordered for your team will be ready for the lead mentor to collect at your allocated lunch time.</div></ShellCard>}
      <ShellCard style={{padding:14,marginBottom:10}}>
        <select value={teamId} onChange={e=>{setTeamId(e.target.value);setReviewedTeam("")}} style={{width:"100%",padding:9,borderRadius:10,border:`1px solid ${THEME.line}`}}><option value="">Choose team</option>{clubTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Team order code" style={{width:"100%",padding:9,borderRadius:10,border:`1px solid ${THEME.line}`,marginTop:8,boxSizing:"border-box"}}/>
        <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Full name" style={{width:"100%",padding:9,borderRadius:10,border:`1px solid ${THEME.line}`,marginTop:8,boxSizing:"border-box"}}/>
        <input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="Mobile number" inputMode="tel" style={{width:"100%",padding:9,borderRadius:10,border:`1px solid ${THEME.line}`,marginTop:8,boxSizing:"border-box"}}/>
      </ShellCard>
      {existing&&<div style={{fontFamily:"Inter",fontSize:9,color:THEME.orange,fontWeight:800,margin:"2px 2px 10px"}}>This team already has an order. Enter only the additional quantities needed; they will be added to the existing total.</div>}
      {foodMenu.filter(f=>f.active!==false).map(f=><ShellCard key={f.id} style={{padding:12,marginBottom:8,display:"grid",gridTemplateColumns:"1fr 70px",gap:8,alignItems:"center"}}><div><b>{f.name}</b><div style={{fontSize:9,color:THEME.muted}}>{f.price===null||f.price===undefined||f.price===""?"Price not listed":Number(f.price)===0?"Free":`€${Number(f.price).toFixed(2)}`}</div></div><input type="number" min="0" value={qty[f.id]||0} onChange={e=>setQty({...qty,[f.id]:+e.target.value})} style={{padding:8,borderRadius:9,border:`1px solid ${THEME.line}`,width:"100%",boxSizing:"border-box"}}/></ShellCard>)}
      <button onClick={submit} style={{width:"100%",border:0,background:THEME.orange,color:"white",borderRadius:12,padding:11,fontWeight:900}}>Submit order{total>0?` · €${total.toFixed(2)}`:""}</button>
      {msg&&<div style={{fontSize:10,fontWeight:800,marginTop:8,color:"#b91c1c"}}>{msg}</div>}
      {reviewOpen&&existing&&<div onClick={()=>setReviewOpen(false)} style={{position:"fixed",inset:0,background:"rgba(4,18,34,.65)",zIndex:120,display:"grid",placeItems:"center",padding:18}}><ShellCard style={{width:"min(100%,430px)",padding:18}}><div onClick={e=>e.stopPropagation()}><div style={{fontFamily:"Nunito",fontSize:20,fontWeight:900}}>You already have an order</div><div style={{fontFamily:"Inter",fontSize:10,color:THEME.muted,marginTop:4}}>{team?.name} · {existing.contactName}{existing.mobile?` · ${existing.mobile}`:""}</div><div style={{marginTop:12}}>{(existing.items||[]).map(x=><div key={x.foodId} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"7px 0",borderTop:`1px solid ${THEME.line}`}}><span>{x.name}</span><b>{x.qty}</b></div>)}</div>{Number(existing.total||0)>0&&<div style={{textAlign:"right",fontFamily:"Nunito",fontWeight:900,marginTop:8}}>Current total €{Number(existing.total).toFixed(2)}</div>}<div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.5,color:CUP_UI.bodyText,marginTop:10}}>Enter only what you want to add. The quantities you submit next will be added to this existing order.</div><button onClick={()=>setReviewOpen(false)} style={{width:"100%",border:0,background:THEME.orange,color:"white",borderRadius:11,padding:10,fontWeight:900,marginTop:12}}>Add more</button></div></ShellCard></div>}
      {toast&&<div style={{position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:88,zIndex:150,width:"min(calc(100% - 28px),500px)",background:"#143D32",color:"white",borderRadius:14,padding:"12px 14px",boxShadow:"0 12px 30px rgba(0,0,0,.22)",fontFamily:"Inter",fontSize:10,fontWeight:800}}>✓ {toast}</div>}
    </div>;
  }

  function RefereeScreen(){const [accessCode,setAccessCode]=useState("");const [fullName,setFullName]=useState("");const key=refAccess?`cup_ref_${eventId}_${refAccess.id}_${refAccess.version||1}`:"";const [verified,setVerified]=useState(()=>{try{return JSON.parse(localStorage.getItem(key)||"null")?.name||""}catch{return""}});const [err,setErr]=useState("");async function score(m,patch){const next=matches.map(x=>x.id===m.id?{...x,...patch,lastEditedBy:verified,lastEditedAt:new Date().toISOString()}:x);setMatches(next);await saveShared(eventKey(eventId,"matches"),next)}if(!refAccess||!refAccess.active)return <div style={{padding:20}}>This referee link is no longer active.</div>;if(!verified)return <div style={{padding:20}}><ShellCard style={{padding:18}}><div style={{fontFamily:"Nunito",fontSize:22,fontWeight:900}}>Referee Access</div><input value={accessCode} onChange={e=>setAccessCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code" style={{width:"100%",padding:10,marginTop:12,boxSizing:"border-box"}}/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" style={{width:"100%",padding:10,marginTop:8,boxSizing:"border-box"}}/><button onClick={()=>{if(accessCode!==String(refAccess.code))return setErr("Incorrect code.");if(fullName.trim().split(/\s+/).length<2)return setErr("Enter your full name.");localStorage.setItem(key,JSON.stringify({name:fullName.trim()}));setVerified(fullName.trim())}} style={{width:"100%",padding:10,marginTop:10,border:0,borderRadius:10,background:THEME.orange,color:"white",fontWeight:900}}>Open matches</button>{err&&<div style={{fontSize:10,color:"#b91c1c",marginTop:8}}>{err}</div>}</ShellCard></div>;const allowed=matches.filter(m=>!refAccess.pitches?.length||refAccess.pitches.includes(m.pitchId));return <div style={{padding:"0 0 26px"}}><div style={{fontFamily:"Nunito",fontSize:22,fontWeight:900,marginBottom:12}}>{verified} · Referee</div>{allowed.map(m=><ShellCard key={m.id} style={{padding:13,marginBottom:9}}><b>{m.time} · {m.pitch}</b>{[["A",m.teamA,"goalsA","pointsA"],["B",m.teamB,"goalsB","pointsB"]].map(([k,id,g,p])=><div key={k} style={{display:"grid",gridTemplateColumns:"1fr 55px 55px",gap:7,marginTop:8,alignItems:"center"}}><span style={{fontSize:10,fontWeight:800}}>{teamById(id).name}</span><input type="number" min="0" value={m[g]||0} onChange={e=>score(m,{[g]:+e.target.value})}/><input type="number" min="0" value={m[p]||0} onChange={e=>score(m,{[p]:+e.target.value})}/></div>)}<select value={m.status||"scheduled"} onChange={e=>score(m,{status:e.target.value})} style={{marginTop:8}}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="finished">Finished</option></select></ShellCard>)}</div>}

  let body = <HomeScreen/>;
  if (screen === "fixtures") body = <FixturesScreen/>;
  else if (screen === "standings") body = <StandingsScreen/>;
  else if (screen === "team") body = <TeamScreen/>;
  else if (screen === "info") body = <InfoScreen/>;
  else if (screen === "food") body = <FoodScreen/>;
  if (refId) body = <RefereeScreen/>;

  const preview=params.get("preview")==="1";
  if(!refId && event?.status==="draft" && !preview && !loading){
    return <div style={{minHeight:"100dvh",background:"#E9EDF1",display:"grid",placeItems:"center",padding:18,fontFamily:"Inter"}}><ShellCard style={{width:"min(100%,430px)",padding:22,textAlign:"center"}}><div style={{fontFamily:"Nunito",fontSize:22,fontWeight:900}}>This event is still in draft</div><div style={{fontSize:10,color:THEME.muted,lineHeight:1.55,marginTop:7}}>The organiser has not published the participant app yet.</div></ShellCard></div>;
  }

  const appStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=League+Spartan:wght@600;700;800;900&display=swap');
      * { box-sizing: border-box; }
      button, input, select, textarea { font-family: Inter, sans-serif; }
      button { touch-action: manipulation; }
      @media (max-width: 420px) {
        input, select, textarea { font-size: 16px !important; }
      }
    `}</style>
  );

  return <div style={{ minHeight: "100dvh", background: CUP_UI.background, fontFamily: "Inter, sans-serif", color: CUP_UI.text }}>{appStyles}<div style={{ maxWidth: 600, minHeight: "100dvh", margin: "0 auto", padding: "0 20px 90px", boxSizing: "border-box" }}><BrandHeader club={club} event={event} onChangeClub={()=>setChooseOpen(true)} liveCount={liveMatches.length}/>{loading ? <div style={{ padding: 36, textAlign: "center", color: THEME.muted }}><img src="/spraoi-cup-icon.png" alt="Spraoi Cup" style={{width:64,height:64,objectFit:"contain",display:"block",margin:"0 auto 10px"}}/><div style={{fontFamily:"Nunito",fontWeight:900,color:THEME.ink}}>Loading Spraoi Cup…</div></div> : body}{!refId && <BottomNav screen={screen} setScreen={setScreen}/>}</div>{announcementToast&&<div style={{position:"fixed",left:"50%",transform:"translateX(-50%)",top:18,zIndex:180,width:"min(calc(100% - 28px),500px)",background:"#10243E",color:"white",borderRadius:16,padding:14,boxShadow:"0 16px 38px rgba(0,0,0,.25)"}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{fontSize:22}}>{announcementToast.emoji||"📣"}</div><div style={{flex:1}}><div style={{fontFamily:"Nunito",fontSize:14,fontWeight:900}}>{announcementToast.title||"Update"}</div><div style={{fontFamily:"Inter",fontSize:10,lineHeight:1.45,opacity:.85,marginTop:3}} dangerouslySetInnerHTML={{__html:announcementToast.html||announcementToast.text||""}}/></div><button onClick={()=>setAnnouncementToast(null)} style={{border:0,background:"transparent",color:"white",fontSize:18,cursor:"pointer"}}>×</button></div></div>}{chooseOpen && <div onClick={()=>setChooseOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(4,18,34,.62)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={(e)=>e.stopPropagation()} style={{ width: "min(100%,540px)", maxHeight: "80dvh", overflow: "auto", background: "white", borderRadius: "26px 26px 0 0", padding: 18 }}><div style={{ width: 42, height: 4, borderRadius: 4, background: THEME.line, margin: "0 auto 14px" }}/><div style={{ fontFamily: "Nunito", fontSize: 21, fontWeight: 900, color: THEME.ink }}>Choose your club</div><div style={{ fontFamily: "Inter", fontSize: 10, color: THEME.muted, marginTop: 4, marginBottom: 12 }}>We’ll highlight your fixtures, lunch break and event updates.</div><div style={{ display: "grid", gap: 8 }}>{clubs.map((c)=><button key={c.id} onClick={()=>chooseClub(c.id)} style={{ border: `1px solid ${THEME.line}`, background: myClub===c.id?"#FFF3E8":"white", borderRadius: 16, padding: 11, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" }}><ClubMark club={c} size={42} /><div style={{ fontFamily: "Nunito", fontWeight: 900, color: THEME.ink }}>{c.name}</div></button>)}</div></div></div>}</div>;
}
