import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { openAdminModule } from "../../../packages/ui/src/platformNavigation.js";
import "../../../packages/ui/src/adminShell.css";

const ZERO = "00000000-0000-0000-0000-000000000000";
const C = {
  navy: "#10243e", ink: "#13243b", muted: "#627187", line: "#dfe7ef",
  soft: "#f7f9fc", white: "#fff", yellow: "#F97316", yellowSoft: "#fff1e6",
  green: "#2e7d32", red: "#c62828", amber: "#a16207", blue: "#1565c0",
};
const F = {
  display: "'Manrope', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};
const BASE = import.meta.env.BASE_URL || "/";

const MODULES = {
  coach: {
    label: "Coach",
    color: "#7C3AED",
    icon: `${BASE}spraoi-coach-icon.png`,
    screen: "coach-dashboard"
  },
  academy: {
    label: "Academy",
    color: "#2563EB",
    icon: `${BASE}spraoi-academy-icon.png`,
    screen: "academy-dashboard"
  },
  connect: {
    label: "Connect",
    color: "#F97316",
    icon: `${BASE}spraoi-connect-icon.png`,
    screen: "connect-dashboard"
  },
  cup: {
    label: "Cup",
    color: "#FEBA00",
    icon: `${BASE}spraoi-cup-icon.png`,
    screen: "cup-dashboard"
  },
  club: {
    label: "Club",
    color: "#DC2626",
    icon: `${BASE}spraoi-club-icon.png`,
    screen: "club-dashboard"
  },
};

const CONNECT_NAV = [
  ["dashboard", "home", "Dashboard"],
  ["events", "calendar", "Events"],
  ["messages", "message", "Messages"],
  ["groups", "group", "Groups"],
  ["responses", "response", "Responses"],
  ["more", "settings", "Settings"],
];
const CONNECT_MOBILE_NAV = [
  ["dashboard", "home", "Dashboard"],
  ["events", "calendar", "Events"],
  ["messages", "message", "Messages"],
  ["responses", "response", "Responses"],
  ["more", "more", "More"],
];
const fmt = (v) => v ? new Date(v).toLocaleString("en-IE", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "";
function teamDisplayName(team, fallback = "Team") {
  if (!team) return fallback;
  const base = String(team.label || team.name || fallback).trim();
  const gender = String(team.gender || "").toLowerCase();
  const suffix = gender === "girls" ? "Girls" : gender === "boys" ? "Boys" : "";
  return suffix && !new RegExp(`\\b${suffix}$`, "i").test(base) ? `${base} ${suffix}` : base;
}
const shortTeam = (t) => teamDisplayName(t);

function Icon({ name, size=22 }) {
  const connectSecondary = {
    home:"home", dashboard:"home", calendar:"events", events:"events", message:"messages", messages:"messages",
    announcement:"announcement", availability:"availability", groups:"groups", responses:"availability",
    reminder:"reminder", send:"send", scheduled:"scheduled", edit:"edit", settings:"settings"
  };
  const raw=String(name||"").toLowerCase();
  const match=Object.entries(connectSecondary).find(([k])=>raw.includes(k));
  if(match){ const ext=(match[1]==='home'||match[1]==='settings')?'svg':'png'; const src=`${BASE}icons/connect/${match[1]}.${ext}`; return <img src={src} alt="" aria-hidden="true" style={{width:size,height:size,objectFit:"contain"}}/>; }
  const p={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true};
  const m={
    home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></>,
    calendar:<><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/></>,
    message:<><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h6"/></>,
    group:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M14.5 14.5c3.4-.3 5.3 1.5 6 4.5"/></>,
    response:<><path d="M4 12l4 4L20 4"/><path d="M4 20h16"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.3a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1A1.7 1.7 0 0 0 15 4.7a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1A1.7 1.7 0 0 0 19.4 9 1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    plus:<><path d="M12 5v14M5 12h14"/></>,
    more:<><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  };
  return <svg {...p}>{m[name]||m.home}</svg>;
}
function Card({children,style={}}){return <div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:18,boxShadow:"0 8px 26px rgba(16,36,62,.06)",...style}}>{children}</div>}
function Pill({children,tone="default"}){const s=tone==="yes"?{bg:"#e8f5e9",fg:C.green}:tone==="no"?{bg:"#ffebee",fg:C.red}:tone==="maybe"?{bg:"#fff8e1",fg:C.amber}:tone==="warn"?{bg:"#fff8e1",fg:C.amber}:{bg:C.soft,fg:C.muted};return <span style={{padding:"5px 9px",borderRadius:999,background:s.bg,color:s.fg,fontSize:10,fontWeight:800}}>{children}</span>}
function Btn({children,onClick,disabled=false,ghost=false,danger=false,style={}}){
  const variant = ghost ? "ghost" : danger ? "danger" : "primary";
  const base = variant === "primary"
    ? { background:"#F97316", color:"#fff", border:"1px solid #F97316", boxShadow:"0 5px 14px rgba(16,36,62,.12)" }
    : variant === "danger"
      ? { background:"#DC2626", color:"#fff", border:"1px solid #DC2626", boxShadow:"0 5px 14px rgba(16,36,62,.12)" }
      : { background:"#fff", color:C.ink, border:`1px solid ${C.line}`, boxShadow:"0 2px 8px rgba(16,36,62,.05)" };
  return <button className="spraoi-action-button" data-variant={variant} onClick={onClick} disabled={disabled} style={{...base,cursor:disabled?"default":"pointer",opacity:disabled?.5:1,...style}}>{children}</button>
}
function Field({label,children}){return <label style={{display:"block",marginBottom:12}}><span style={{display:"block",fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",marginBottom:6}}>{label}</span>{children}</label>}
const inputStyle={width:"100%",boxSizing:"border-box",border:`1px solid ${C.line}`,borderRadius:11,padding:"11px 12px",fontFamily:F.body,fontSize:13,background:"#fff",color:C.ink};
function Modal({open,title,children,onClose,width=520}){if(!open)return null;return <div role="dialog" aria-modal="true" onClick={onClose} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(6,20,37,.62)",display:"grid",placeItems:"center",padding:18}}><div onClick={e=>e.stopPropagation()} style={{width:`min(${width}px,100%)`,maxHeight:"88vh",overflow:"auto",background:C.white,borderRadius:24,boxShadow:"0 28px 80px rgba(6,20,37,.30)"}}><div style={{position:"sticky",top:0,zIndex:2,padding:"17px 19px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:`linear-gradient(135deg,${C.yellowSoft},#fff)`,borderBottom:`1px solid ${C.line}`}}><div style={{fontFamily:F.display,fontSize:20,fontWeight:800,color:C.ink}}>{title}</div><button onClick={onClose} aria-label="Close" style={{width:34,height:34,borderRadius:10,border:`1px solid ${C.line}`,background:"#fff",fontSize:20,cursor:"pointer"}}>×</button></div><div style={{padding:19}}>{children}</div></div></div>}


function initialsFromName(value, fallback="U") {
  const cleaned=String(value||"").trim();
  if(!cleaned)return fallback;
  if(cleaned.includes("@")){
    const local=cleaned.split("@")[0].replace(/[._-]+/g," ").trim();
    const bits=local.split(/\s+/).filter(Boolean);
    return bits.length>1?(bits[0][0]+bits[bits.length-1][0]).toUpperCase():local.slice(0,2).toUpperCase();
  }
  const bits=cleaned.split(/\s+/).filter(Boolean);
  return bits.length>1?(bits[0][0]+bits[bits.length-1][0]).toUpperCase():cleaned.slice(0,2).toUpperCase();
}


function connectSidebarAsset(id) {
  const map = {
    dashboard: `${BASE}icons/connect/home.svg`,
    events: `${BASE}icons/connect/events-v2.svg`,
    messages: `${BASE}icons/connect/messages.svg`,
    groups: `${BASE}icons/connect/groups.svg`,
    responses: `${BASE}icons/connect/responses-v2.svg`,
    settings: `${BASE}icons/connect/settings.svg`,
    more: `${BASE}icons/connect/settings.svg`,
  };
  return map[id] || `${BASE}icons/global/chevron.png`;
}

function DesktopNav({nav,tab,setTab,club,selectedTeam,visibleTeams,setSelectedTeamId,canSendSelected,isAdmin,session,userInitials,onShowProfile}){
  const clubName = club?.name || "Club Spraoi";
  const initial = userInitials || "U";
  return <div className="connect-desktop-sidebar spraoi-desktop-shell-nav" style={{width:306,minHeight:"100vh",display:"flex",flexShrink:0,position:"sticky",top:0,alignSelf:"flex-start",height:"100vh",zIndex:30}}>
    <aside className="spraoi-global-rail" style={{width:78,background:"#10243e",display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 8px",gap:8,borderRight:"1px solid rgba(255,255,255,.08)"}}>
      <div title={clubName} style={{width:60,height:60,borderRadius:17,background:"#fff",display:"grid",placeItems:"center",overflow:"hidden",boxShadow:"0 5px 16px rgba(0,0,0,.20)",border:"1px solid rgba(255,255,255,.55)",marginBottom:5}}>
        <img src={club?.logo_url || `${BASE}spraoi-club-icon.png`} alt={`${clubName} crest`} style={{width:52,height:52,objectFit:"contain"}}/>
      </div>
      <div
        style={{
          width:"100%",
          marginBottom:5,
          display:"flex",
          justifyContent:"center"
        }}
      >
        <div className="spraoi-team-selector-label">Team</div>
        <select
          aria-label="Active team"
          title={selectedTeam ? shortTeam(selectedTeam) : "Select team"}
          value={selectedTeam?.id || ""}
          onChange={(e)=>setSelectedTeamId(e.target.value)}
          style={{
            width:62,
            height:34,
            borderRadius:10,
            border:"1px solid rgba(255,255,255,.28)",
            background:"#fff",
            color:"#10243e",
            fontFamily:F.body,
            fontSize:12,
            fontWeight:800,
            padding:"0 4px",
            cursor:"pointer"
          }}
        >
          {visibleTeams.map((team)=>(
            <option
              key={team.id}
              value={team.id}
              style={{color:"#10243e",background:"#fff"}}
            >
              {String(shortTeam(team) || "")
                .replace(/\s*Boys$/i, "B")
                .replace(/\s*Girls$/i, "G")
                .replace(/\s+/g, "")}
            </option>
          ))}
        </select>
      </div>

      <div style={{flex:1,width:"100%",display:"flex",flexDirection:"column",justifyContent:"center",gap:7}}>
        {Object.entries(MODULES).map(([key,module])=>{
          const active=key==="connect";
          return <button className="spraoi-module-switcher-button" data-active={active} key={key} title={module.label} onClick={()=>key==="connect"?setTab("dashboard"):openAdminModule(key,module.screen)} style={{width:"100%",minHeight:62,border:"none",borderRadius:14,cursor:"pointer",background:active?module.color:"transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,position:"relative",boxShadow:active?"0 8px 22px rgba(0,0,0,.24)":"none"}}>
            <span style={{width:46,height:46,borderRadius:14,background:"#fff",border:"1px solid rgba(15,23,42,.08)",display:"grid",placeItems:"center",boxShadow:active?"0 6px 16px rgba(0,0,0,.18)":"0 3px 10px rgba(0,0,0,.10)"}}><img src={module.icon} alt="" style={{width:40,height:40,objectFit:"contain"}}/></span>
            <span style={{fontFamily:F.body,fontSize:10,fontWeight:700,letterSpacing:"-.01em",color:active?"#fff":"rgba(255,255,255,.7)"}}>{module.label}</span>
          </button>
        })}
      </div>
      <img
        src={`${BASE}spraoi-logo-white.png`}
        alt="Spraoi Sports"
        style={{
          width:58,
          height:38,
          objectFit:"contain",
          marginBottom:4,
          opacity:.96
        }}
      />
      <button onClick={onShowProfile} title="Profile" style={{width:42,height:42,borderRadius:13,border:"1px solid rgba(255,255,255,.36)",background:"rgba(255,255,255,.12)",color:"#fff",cursor:"pointer",fontFamily:F.body,fontWeight:800}}>{initial}</button>
    </aside>

    <aside className="spraoi-module-sidebar" data-module="connect" style={{width:228,background:"linear-gradient(180deg, #F97316 0%, #d84f00 100%)",display:"flex",flexDirection:"column",minHeight:"100vh",color:"#fff"}}>
      <div className="spraoi-module-title-block" style={{height:118,minHeight:118,boxSizing:"border-box",padding:"18px 16px",borderBottom:"1px solid #FFE0C8"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:54,height:54,borderRadius:16,background:"#fff",display:"grid",placeItems:"center",border:"1px solid rgba(15,23,42,.10)",boxShadow:"0 7px 18px rgba(0,0,0,.16)",overflow:"hidden",flexShrink:0}}><img src={`${BASE}spraoi-logo.png`} alt="Spraoi Sports" style={{width:42,height:42,objectFit:"contain"}}/></div>
          <div style={{minWidth:0}}><div style={{fontFamily:F.display,fontSize:21,fontWeight:800,letterSpacing:"-.02em",color:"#fff",lineHeight:1.05}}>Connect</div><div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.86)",marginTop:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{clubName}</div></div>
        </div>
      </div>

      <nav style={{flex:1,padding:"9px 10px",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
        {nav.map(([id,icon,label])=>{const active=tab===id;return <button className="spraoi-module-nav-button" data-active={active} key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 11px",borderRadius:10,border:active?"1px solid rgba(255,255,255,.75)":"1px solid transparent",cursor:"pointer",width:"100%",background:active?"#fff":"transparent",textAlign:"left",boxShadow:active?"0 4px 12px rgba(16,36,62,.14)":"none"}}><span className="spraoi-secondary-nav-icon-wrap" style={{background:"transparent",border:0,boxShadow:"none",padding:0}}><img className="spraoi-secondary-nav-icon" src={connectSidebarAsset(id)} alt="" aria-hidden="true" style={{background:"transparent"}}/></span><span style={{fontFamily:F.body,fontSize:12,fontWeight:active?700:600,letterSpacing:"-.01em",color:active?"#b94700":"#fff"}}>{label}</span></button>})}
      </nav>
    </aside>
  </div>;
}

function ConnectTopBar({title,sub,children}){
  return <div className="connect-topbar" style={{height:118,minHeight:118,boxSizing:"border-box",padding:"20px 28px",background:"linear-gradient(135deg, #fffaf7 0%, #fff0e6 48%, #ffe0cc 100%)",borderBottom:"1px solid #F9731640",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
    <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
      <div className="connect-topbar-icon" style={{width:64,height:64,borderRadius:20,display:"grid",placeItems:"center",background:"#fff",border:"1px solid rgba(15,23,42,.08)",boxShadow:"0 10px 26px rgba(16,36,62,.12)",flexShrink:0}}><img src={`${BASE}spraoi-connect-icon.png`} alt="" style={{width:48,height:48,objectFit:"contain"}}/></div>
      <div style={{minWidth:0}}><div className="spraoi-page-header-title" style={{fontFamily:F.display,fontSize:21,fontWeight:700,color:C.ink,lineHeight:1.1,letterSpacing:"-.025em"}}>{title}</div>{sub&&<div className="spraoi-page-header-sub" style={{fontFamily:F.body,fontSize:12,color:C.muted,marginTop:6}}>{sub}</div>}</div>
    </div>
    {children&&<div style={{display:"flex",alignItems:"center",gap:8}}>{children}</div>}
  </div>;
}

function Login({onSignedIn}){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError("");const {error:err}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(err)setError(err.message);else onSignedIn?.();setBusy(false);}
  return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:22,background:C.soft,fontFamily:F.body}}><Card style={{padding:26,width:"min(420px,100%)"}}><div style={{textAlign:"center",marginBottom:20}}><img src={`${BASE}spraoi-connect-icon.png`} alt="" style={{width:78,height:78}}/><h1 style={{margin:"8px 0 4px",color:C.ink}}>Spraoi Connect</h1><p style={{margin:0,fontSize:12,lineHeight:1.5,color:C.muted}}>Staff communications for your assigned teams.</p></div><form onSubmit={submit}><Field label="Email"><input style={inputStyle} type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="Password"><input style={inputStyle} type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field>{error&&<div style={{padding:10,borderRadius:10,background:"#ffebee",color:C.red,fontSize:11,fontWeight:800,marginBottom:12}}>{error}</div>}<Btn disabled={busy} style={{width:"100%"}}>{busy?"Signing in…":"Sign in"}</Btn></form></Card></div>;
}

export default function App(){
  const [session,setSession]=useState(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState("dashboard");
  const [profileOpen,setProfileOpen]=useState(false);
  const [club,setClub]=useState(null); const [role,setRole]=useState("coach_mentor"); const [staff,setStaff]=useState([]); const [teams,setTeams]=useState([]); const [assignedTeamIds,setAssignedTeamIds]=useState([]); const [selectedTeamId,setSelectedTeamId]=useState(() =>
    localStorage.getItem("spraoi_active_team_id") ||
    localStorage.getItem("spraoi_team_id") ||
    ""
  );
  const [players,setPlayers]=useState([]); const [events,setEvents]=useState([]); const [responses,setResponses]=useState([]); const [groups,setGroups]=useState([]); const [groupMembers,setGroupMembers]=useState([]); const [messages,setMessages]=useState([]); const [delegates,setDelegates]=useState([]);
  const [composer,setComposer]=useState(null); const [groupModal,setGroupModal]=useState(false); const [permissionModal,setPermissionModal]=useState(false); const [status,setStatus]=useState("");
  const [newGroupName,setNewGroupName]=useState(""); const [newGroupDescription,setNewGroupDescription]=useState(""); const [newGroupPlayers,setNewGroupPlayers]=useState([]); const [mobileModulesOpen,setMobileModulesOpen]=useState(false);

  const isAdmin=["super_admin","admin","club_admin"].includes(String(role).toLowerCase());
  const myStaffRows=staff.filter(s=>String(s.user_id)===String(session?.user?.id));
  const userDisplayName=myStaffRows[0]?.coach?.name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||session?.user?.email||"User";
  const userInitials=initialsFromName(userDisplayName,"U");
  const leadTeamIds=myStaffRows.filter(s=>s.role==="lead_coach").map(s=>s.age_group_id);
  const delegatedTeamIds=delegates.filter(d=>d.active&&String(d.user_id)===String(session?.user?.id)).map(d=>d.age_group_id);
  const visibleTeams=isAdmin?teams:teams.filter(t=>assignedTeamIds.includes(t.id));
  
  useEffect(() => {
    if (!selectedTeamId) return;

    localStorage.setItem("spraoi_active_team_id", selectedTeamId);
    localStorage.setItem("spraoi_team_id", selectedTeamId);

    window.dispatchEvent(
      new CustomEvent("spraoi-team-change", {
        detail: { teamId: selectedTeamId }
      })
    );
  }, [selectedTeamId]);

  useEffect(() => {
    const syncTeam = (event) => {
      const incoming =
        event?.detail?.teamId ||
        localStorage.getItem("spraoi_active_team_id") ||
        "";

      if (!incoming) return;

      const allowed = visibleTeams.some(
        (team) => String(team.id) === String(incoming)
      );

      if (allowed && String(incoming) !== String(selectedTeamId)) {
        setSelectedTeamId(incoming);
      }
    };

    window.addEventListener("spraoi-team-change", syncTeam);
    window.addEventListener("storage", syncTeam);

    return () => {
      window.removeEventListener("spraoi-team-change", syncTeam);
      window.removeEventListener("storage", syncTeam);
    };
  }, [visibleTeams, selectedTeamId]);

const selectedTeam=visibleTeams.find(t=>t.id===selectedTeamId)||visibleTeams[0]||null;
  const teamPlayers=players.filter(p=>p.age_group_id===selectedTeam?.id);
  const teamEvents=events.filter(e=>e.age_group_id===selectedTeam?.id);
  const teamGroups=groups.filter(g=>g.age_group_id===selectedTeam?.id&&g.active!==false);
  const canSendSelected=isAdmin||leadTeamIds.includes(selectedTeam?.id)||delegatedTeamIds.includes(selectedTeam?.id);
  const canManageDelegates=isAdmin||leadTeamIds.includes(selectedTeam?.id);
  const noResponseCount=(event)=>teamPlayers.filter(p=>p.parent_user_id&&p.parent_user_id!==ZERO&&!responses.some(r=>r.event_id===event.id&&r.player_id===p.id)).length;

  useEffect(()=>{supabase.auth.getSession().then(({data:{session:s}})=>{setSession(s);if(s)loadAll(s);else setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)loadAll(s);else setLoading(false)});return()=>subscription.unsubscribe();},[]);

  async function resolveRole(user){
    const {data:rows}=await supabase.from("user_roles").select("*");
    const email=String(user.email||"").toLowerCase();
    const match=(rows||[]).find(r=>[r.user_id,r.auth_user_id,r.profile_id].filter(Boolean).some(v=>String(v)===String(user.id)))||(rows||[]).find(r=>String(r.user_email||r.email||"").toLowerCase()===email)||null;
    return match;
  }
  async function loadAll(s=session){
    if(!s?.user)return;setLoading(true);setStatus("");
    const user=s.user; const roleRow=await resolveRole(user); const accountRole=String(roleRow?.role||"coach_mentor").toLowerCase(); setRole(accountRole);
    let {data:staffRows,error:staffError}=await supabase
      .from("team_staff")
      .select("*,coach:coaches(id,name,email,user_id),team:age_groups(id,label,gender,club_id)")
      .eq("user_id",user.id)
      .eq("status","active");
    staffRows=staffRows||[];

    // Match the Club/Coach assignment logic: team_staff is authoritative.
    // If the staff row was created before first sign-in, link it by coach email.
    if((!staffRows.length||staffError)&&user.email){
      const {data:matchingCoach}=await supabase.from("coaches").select("id,club_id,name,email,user_id").ilike("email",user.email).maybeSingle();
      if(matchingCoach?.id){
        const {data:pendingRows}=await supabase
          .from("team_staff")
          .select("*,coach:coaches(id,name,email,user_id),team:age_groups(id,label,gender,club_id)")
          .eq("coach_id",matchingCoach.id)
          .eq("status","active");
        staffRows=pendingRows||[];
        if(staffRows.length){
          await supabase.from("coaches").update({user_id:user.id}).eq("id",matchingCoach.id);
          await supabase.from("team_staff").update({user_id:user.id}).in("id",staffRows.map(r=>r.id));
        }
      }
    }

    let assignedIds=[...new Set(staffRows.map(r=>r.age_group_id).filter(Boolean))];
    // Legacy fallback only when there are no team_staff rows.
    if(!staffRows.length){
      const {data:legacy}=await supabase.from("coach_assignments").select("age_group_id").eq("user_id",user.id);
      assignedIds=[...new Set((legacy||[]).map(r=>r.age_group_id).filter(Boolean))];
    }

    const mine=staffRows;
    let clubId=roleRow?.club_id||mine[0]?.team?.club_id||null;
    if(!clubId){const {data:fallback}=await supabase.from("clubs").select("*").eq("slug","fingallians").maybeSingle();clubId=fallback?.id||null;}
    if(!clubId){setLoading(false);setStatus("No club is linked to this account yet.");return;}
    const [{data:clubData},{data:teamData},{data:playerData},{data:eventData},{data:respData},{data:groupData},{data:memberData},{data:messageData},{data:delegateData}] = await Promise.all([
      supabase.from("clubs").select("*").eq("id",clubId).maybeSingle(),
      supabase.from("age_groups").select("*").eq("club_id",clubId).order("label"),
      supabase.from("journey_players").select("id,name,age_group_id,parent_user_id,club_id").eq("club_id",clubId).order("name"),
      supabase.from("club_events").select("*,facility:facilities(id,name,location)").eq("club_id",clubId).gte("starts_at",new Date(Date.now()-2*86400000).toISOString()).order("starts_at").limit(150),
      supabase.from("availability_responses").select("*").order("responded_at",{ascending:false}).limit(1000),
      supabase.from("connect_groups").select("*").eq("club_id",clubId).order("name"),
      supabase.from("connect_group_members").select("*").limit(5000),
      supabase.from("connect_messages").select("*").eq("club_id",clubId).order("created_at",{ascending:false}).limit(100),
      supabase.from("connect_sender_permissions").select("*").eq("club_id",clubId),
    ]);
    setClub(clubData||null); setStaff(staffRows); setTeams(teamData||[]); setPlayers(playerData||[]); setEvents(eventData||[]); setResponses(respData||[]); setGroups(groupData||[]); setGroupMembers(memberData||[]); setMessages(messageData||[]); setDelegates(delegateData||[]);
    setAssignedTeamIds(assignedIds);
    const adminAccount=["super_admin","admin","club_admin"].includes(accountRole);
    const allowed=adminAccount?(teamData||[]):(teamData||[]).filter(t=>assignedIds.includes(t.id));
    setSelectedTeamId(prev=>allowed.some(t=>t.id===prev)?prev:(allowed[0]?.id||"")); setLoading(false);
  }

  function audiencePlayers(draft){
    if(draft.audienceType==="club")return players;
    if(draft.audienceType==="selected")return players.filter(p=>draft.playerIds?.includes(p.id));
    if(draft.audienceType==="group"){const ids=groupMembers.filter(m=>m.group_id===draft.groupId).map(m=>m.player_id);return players.filter(p=>ids.includes(p.id));}
    if(draft.audienceType==="no_response"){const eventResponses=responses.filter(r=>r.event_id===draft.eventId);return teamPlayers.filter(p=>!eventResponses.some(r=>r.player_id===p.id));}
    return teamPlayers;
  }
  async function sendMessage(draft){
    if(!session?.user||!club?.id)return;
    if(draft.audienceType==="club"&&!isAdmin){setStatus("Only Club Admin or Super Admin can send clubwide messages.");return;}
    if(draft.audienceType!=="club"&&!canSendSelected){setStatus("Only the Lead Mentor or an authorised mentor can send for this team.");return;}
    const audience=audiencePlayers(draft).filter(p=>p.parent_user_id&&p.parent_user_id!==ZERO);
    if(!audience.length){setStatus("There are no linked parent accounts in this audience.");return;}
    const now=new Date().toISOString();
    const payload={club_id:club.id,age_group_id:draft.audienceType==="club"?null:selectedTeam?.id||null,group_id:draft.groupId||null,event_id:draft.eventId||null,sender_user_id:session.user.id,audience_type:draft.audienceType,message_type:draft.messageType||"announcement",title:draft.title.trim(),body:draft.body.trim(),sent_at:now};
    const messageQuery=draft.draftId
      ? supabase.from("connect_messages").update(payload).eq("id",draft.draftId).select("*").single()
      : supabase.from("connect_messages").insert(payload).select("*").single();
    const {data:msg,error}=await messageQuery; if(error){setStatus(error.message);return;}
    const unique=new Map(); audience.forEach(p=>unique.set(`${p.parent_user_id}:${p.id}`,p)); const rows=[...unique.values()];
    const notificationRows=rows.map(p=>({club_id:club.id,user_id:p.parent_user_id,age_group_id:p.age_group_id,event_id:draft.eventId||null,type:`connect_${draft.messageType||"announcement"}`,title:draft.title.trim(),message:draft.body.trim(),action_url:"/academy/?screen=updates",priority:draft.priority||"normal"}));
    const {data:created,error:notErr}=await supabase.from("notifications").insert(notificationRows).select("id,user_id"); if(notErr){setStatus(notErr.message);return;}
    const idsByUser={}; (created||[]).forEach(n=>{if(!idsByUser[n.user_id])idsByUser[n.user_id]=[];idsByUser[n.user_id].push(n.id)});
    const recipientRows=rows.map((p,i)=>({message_id:msg.id,parent_user_id:p.parent_user_id,player_id:p.id,notification_id:(idsByUser[p.parent_user_id]||[]).shift()||created?.[i]?.id||null,delivery_status:"sent"}));
    await supabase.from("connect_message_recipients").insert(recipientRows);
    setComposer(null); setStatus(`Sent to ${rows.length} child${rows.length===1?"":"ren"} / parent link${rows.length===1?"":"s"}.`); await loadAll();
  }
  function eventComposer(event,mode="event_invite"){
    const location=event.facility?.name||event.location||"Location TBC"; const when=fmt(event.starts_at); const title=event.event_type==="match"?(event.opponent?`${shortTeam(selectedTeam)} v ${event.opponent}`:`${shortTeam(selectedTeam)} match`):`${shortTeam(selectedTeam)} training`;
    const isTrainingAllocation=event.event_type==="training"&&event.source==="club_allocation";
    const body=mode==="reminder"
      ? `Reminder: please respond for ${event.title||title} · ${when} · ${location}.`
      : isTrainingAllocation
        ? `Training confirmed for ${shortTeam(selectedTeam)}\n${when}\n${location}${event.notes?`\n${event.notes}`:""}\n\nPlease confirm availability in Spraoi Academy.`
        : `${event.title||title}\n${when}\n${location}${event.notes?`\n${event.notes}`:""}\n\nPlease confirm availability in Spraoi Academy.`;
    setComposer({audienceType:mode==="reminder"?"no_response":"team",messageType:mode,title:mode==="reminder"?`Response reminder · ${title}`:isTrainingAllocation?`Training confirmed · ${shortTeam(selectedTeam)}`:title,body,eventId:event.id,groupId:"",playerIds:[],priority:event.status==="changed"?"important":"normal"});
  }
  function openSavedDraft(message){
    setComposer({
      draftId: message.id,
      audienceType: message.audience_type || "team",
      messageType: message.message_type || "announcement",
      title: message.title || "",
      body: message.body || "",
      eventId: message.event_id || null,
      groupId: message.group_id || "",
      playerIds: [],
      priority: "normal",
    });
  }
  async function createGroup(){if(!newGroupName.trim()||!selectedTeam?.id)return;const {data:g,error}=await supabase.from("connect_groups").insert({club_id:club.id,age_group_id:selectedTeam.id,name:newGroupName.trim(),description:newGroupDescription.trim()||null,created_by:session.user.id}).select("*").single();if(error){setStatus(error.message);return;}if(newGroupPlayers.length)await supabase.from("connect_group_members").insert(newGroupPlayers.map(player_id=>({group_id:g.id,player_id})));setNewGroupName("");setNewGroupDescription("");setNewGroupPlayers([]);setGroupModal(false);await loadAll();}
  async function toggleDelegate(staffRow){if(!canManageDelegates||!selectedTeam?.id||!staffRow.user_id)return;const existing=delegates.find(d=>d.age_group_id===selectedTeam.id&&String(d.user_id)===String(staffRow.user_id));if(existing){await supabase.from("connect_sender_permissions").update({active:!existing.active,granted_by:session.user.id,updated_at:new Date().toISOString()}).eq("id",existing.id);}else{await supabase.from("connect_sender_permissions").insert({club_id:club.id,age_group_id:selectedTeam.id,user_id:staffRow.user_id,granted_by:session.user.id,active:true});}await loadAll();}

  if(loading)return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:C.soft,fontFamily:F.body,color:C.navy}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{width:72,height:72,borderRadius:20,background:"#fff",display:"grid",placeItems:"center",border:`1px solid ${C.line}`,boxShadow:"0 8px 24px rgba(16,36,62,.08)"}}>
          <img src={`${BASE}spraoi-connect-icon.png`} alt="Spraoi Connect" style={{width:58,height:58,objectFit:"contain"}}/>
        </div>
        <div style={{fontFamily:F.display,fontSize:20,fontWeight:800,color:C.ink}}>Spraoi Connect</div>
        <div style={{fontSize:11,color:C.muted}}>Loading your team communications...</div>
      </div>
    </div>
  );
  if(!session)return <Login onSignedIn={()=>supabase.auth.getSession().then(({data:{session:s}})=>s&&loadAll(s))}/>;

  const nav=CONNECT_NAV;
  const mobileNav=CONNECT_MOBILE_NAV;
  const upcoming=teamEvents.filter(e=>e.status!=="cancelled"&&new Date(e.starts_at)>=new Date(Date.now()-86400000));
  const outstanding=upcoming.reduce((n,e)=>n+noResponseCount(e),0);
  const nextPublishedTraining=upcoming.find(e=>e.event_type==="training"&&e.source==="club_allocation")||upcoming.find(e=>e.event_type==="training")||null;

  return <div className="connect-shell" style={{minHeight:"100vh",background:C.soft,fontFamily:F.body,color:C.ink,display:"flex"}}>
    <DesktopNav nav={nav} tab={tab} setTab={setTab} club={club} selectedTeam={selectedTeam} visibleTeams={visibleTeams} setSelectedTeamId={setSelectedTeamId} canSendSelected={canSendSelected} isAdmin={isAdmin} session={session} userInitials={userInitials} onShowProfile={()=>setProfileOpen(true)}/>
    <div className="connect-content" style={{flex:1,minWidth:0,paddingBottom:86}}>
      <header className="connect-mobile-header spraoi-mobile-app-header" data-module="connect">
        <div className="spraoi-mobile-app-header-row">
          <button onClick={()=>setMobileModulesOpen(true)} aria-label="Open module switcher" title="Switch module" className="spraoi-mobile-club-button">
            <img src={club?.logo_url || `${BASE}spraoi-club-icon.png`} alt={`${club?.name||"Club"} crest`}/>
          </button>
          <div className="spraoi-mobile-module-name">Connect</div>
          <button type="button" onClick={()=>setProfileOpen(true)} aria-label="Profile" title={userDisplayName} className="spraoi-mobile-profile-button">
            {userInitials}
          </button>
        </div>
        <div className="spraoi-mobile-team-row">
          <select
            value={selectedTeam?.id||""}
            onChange={e=>setSelectedTeamId(e.target.value)}
            className="spraoi-mobile-team-select"
            aria-label="Current team"
          >
            {visibleTeams.map(t=><option key={t.id} value={t.id}>{shortTeam(t)}</option>)}
          </select>
        </div>
      </header>
      <ConnectTopBar title={nav.find(([id])=>id===tab)?.[2]||"Dashboard"} sub={selectedTeam?`${shortTeam(selectedTeam)} · ${club?.name||"Club Spraoi"}`:(club?.name||"Club Spraoi")}>
        {tab==="dashboard"&&canSendSelected&&<Btn onClick={()=>setComposer({audienceType:"team",messageType:"announcement",title:"",body:"",eventId:null,groupId:"",playerIds:[],priority:"normal"})}>New Message</Btn>}
      </ConnectTopBar>
      <main style={{maxWidth:1220,margin:"0 auto",padding:"22px 24px 40px"}}>
        
        {status&&<div style={{padding:"10px 12px",borderRadius:12,background:C.yellowSoft,border:`1px solid #ffc79f`,fontSize:11,fontWeight:800,marginBottom:12}}>{status}</div>}

      {tab==="dashboard"&&<>
        <div className="connect-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          {[[upcoming.length,"Upcoming events",`${BASE}icons/connect/events-v2.svg`,"Shared calendar"],[outstanding,"Responses due",`${BASE}icons/connect/responses-v2.svg`,"Awaiting parents"],[teamGroups.length,"Subgroups",`${BASE}icons/connect/groups.svg`,"Custom audiences"],[messages.filter(m=>m.age_group_id===selectedTeam?.id||!m.age_group_id).length,"Messages sent",`${BASE}icons/connect/messages.svg`,"Communication history"]].map(([value,label,icon,sub])=><div key={label} className="spraoi-admin-metric-card" style={{"--card-accent":"#F97316",background:C.white,borderRadius:16,padding:"16px 18px",border:`1px solid ${C.line}`,boxShadow:"0 5px 16px rgba(15,35,60,.055)"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}><span className="spraoi-admin-metric-label" style={{fontFamily:F.body,fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>{label}</span><span className="spraoi-card-icon-chip" style={{"--card-accent":"#F97316"}}><img className="spraoi-card-icon" src={icon} alt="" aria-hidden="true"/></span></div><div className="spraoi-admin-metric-value" style={{fontFamily:F.display,fontSize:28,fontWeight:750,color:C.ink,letterSpacing:"-.04em",lineHeight:1}}>{value}</div><div className="spraoi-admin-metric-copy" style={{fontFamily:F.body,fontSize:11,color:C.muted,marginTop:6}}>{sub}</div></div>)}
        </div>
        <div className="spraoi-dashboard-analytics connect-dashboard-analytics" style={{marginTop:14}}>
          <div className="spraoi-dashboard-section-head">
            <div><div className="spraoi-dashboard-section-title">Communication overview</div><div className="spraoi-dashboard-section-sub">Messages, events and parent response activity for this team.</div></div>
            <button className="spraoi-download-button connect-download" type="button" onClick={()=>{
              const rows=[["Metric","Value"],["Upcoming events",upcoming.length],["Responses due",outstanding],["Subgroups",teamGroups.length],["Messages sent",messages.filter(m=>m.age_group_id===selectedTeam?.id||!m.age_group_id).length]];
              const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
              const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`connect-dashboard-${shortTeam(selectedTeam||{}).replace(/\s+/g,"-").toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(url);
            }}>Download</button>
          </div>
          <div className="spraoi-dashboard-chart-grid connect-chart-grid">
            <div className="spraoi-chart-card"><div className="spraoi-chart-card-title">Response workload</div><div className="spraoi-bar-chart">
              <div className="spraoi-bar-row"><div className="spraoi-bar-label"><span>Outstanding responses</span><strong>{outstanding}</strong></div><div className="spraoi-bar-track"><div className="spraoi-bar-fill" style={{width:`${Math.min(100,outstanding*10)}%`,background:"#F97316"}}/></div></div>
              <div className="spraoi-bar-row"><div className="spraoi-bar-label"><span>Upcoming events</span><strong>{upcoming.length}</strong></div><div className="spraoi-bar-track"><div className="spraoi-bar-fill" style={{width:`${Math.min(100,upcoming.length*20)}%`,background:"#FB923C"}}/></div></div>
            </div></div>
            <div className="spraoi-chart-card"><div className="spraoi-chart-card-title">Communication activity</div><div className="spraoi-mini-kpis"><div><img src={`${BASE}icons/connect/messages.svg`} alt=""/><span>Messages sent</span><strong>{messages.filter(m=>m.age_group_id===selectedTeam?.id||!m.age_group_id).length}</strong></div><div><img src={`${BASE}icons/connect/groups.svg`} alt=""/><span>Subgroups</span><strong>{teamGroups.length}</strong></div><div><img src={`${BASE}icons/connect/events-v2.svg`} alt=""/><span>Upcoming events</span><strong>{upcoming.length}</strong></div></div></div>
          </div>
        </div>
        <div className="connect-dashboard-columns" style={{display:"grid",gridTemplateColumns:"minmax(0,1.55fr) minmax(280px,.75fr)",gap:14,marginTop:14}}>
          <Card style={{padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div><div style={{fontFamily:F.display,fontSize:16,fontWeight:750}}>Upcoming events</div><div style={{fontSize:10,color:C.muted}}>Send invitations or chase only missing responses.</div></div><Btn ghost onClick={()=>setTab("events")}>View all</Btn></div>{upcoming.slice(0,5).map(e=><div key={e.id} style={{padding:"12px 0",borderTop:`1px solid ${C.line}`,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><div style={{flex:1,minWidth:220}}><b style={{fontSize:12}}>{e.title}</b><div style={{fontSize:10,color:C.muted,marginTop:3}}>{fmt(e.starts_at)} · {e.facility?.name||e.location||"Location TBC"}</div></div><Pill tone={noResponseCount(e)?"warn":"yes"}>{noResponseCount(e)} no response</Pill>{canSendSelected&&<Btn ghost onClick={()=>eventComposer(e)}>Send</Btn>}</div>)}{!upcoming.length&&<div style={{fontSize:11,color:C.muted,padding:"12px 0"}}>No upcoming events for this team.</div>}</Card>
          <div style={{display:"grid",gap:14,alignContent:"start"}}>
            <Card style={{padding:18}}><div style={{fontSize:16,fontWeight:800,marginBottom:10}}>Quick actions</div><div style={{display:"grid",gap:8}}>{canSendSelected&&<Btn onClick={()=>setComposer({audienceType:"team",messageType:"announcement",title:"",body:"",eventId:null,groupId:"",playerIds:[],priority:"normal"})}>Send team message</Btn>}<Btn ghost onClick={()=>setTab("responses")}>Review responses</Btn>{canSendSelected&&<Btn ghost onClick={()=>setGroupModal(true)}>Create subgroup</Btn>}</div></Card>
            <Card style={{padding:18}}><div style={{fontFamily:F.display,fontSize:16,fontWeight:750}}>Sending access</div><div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginTop:6}}>{canSendSelected?"You can send messages for this team.":"You can view this team's Connect activity but cannot send messages."}</div>{canManageDelegates&&<Btn ghost style={{marginTop:11}} onClick={()=>setPermissionModal(true)}>Manage authorised senders</Btn>}</Card>
          </div>
        </div>
      </>}

      {tab==="events"&&<div>{upcoming.map(e=><Card key={e.id} style={{padding:16,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><div><div style={{fontWeight:800}}>{e.title}</div><div style={{fontSize:10,color:C.muted,marginTop:3}}>{fmt(e.starts_at)} · {e.facility?.name||e.location||"Location TBC"}</div></div><Pill>{e.event_type}</Pill></div><div style={{display:"flex",gap:7,marginTop:12,flexWrap:"wrap"}}><Pill tone="yes">{teamPlayers.filter(p=>responses.some(r=>r.event_id===e.id&&r.player_id===p.id&&r.response==="yes")).length} Yes</Pill><Pill tone="no">{teamPlayers.filter(p=>responses.some(r=>r.event_id===e.id&&r.player_id===p.id&&r.response==="no")).length} No</Pill><Pill tone="maybe">{teamPlayers.filter(p=>responses.some(r=>r.event_id===e.id&&r.player_id===p.id&&r.response==="maybe")).length} Maybe</Pill><Pill tone="warn">{noResponseCount(e)} No response</Pill></div>{canSendSelected&&<div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><Btn onClick={()=>eventComposer(e)}>Send / resend event</Btn>{noResponseCount(e)>0&&<Btn ghost onClick={()=>eventComposer(e,"reminder")}>Message no response only</Btn>}</div>}</Card>)}</div>}

      {tab==="messages"&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}><div><h2 style={{margin:0,fontSize:18}}>Messages</h2><div style={{fontSize:10,color:C.muted}}>Team, subgroup, selected parents or clubwide.</div></div>{canSendSelected&&<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{nextPublishedTraining&&<><Btn ghost onClick={()=>eventComposer(nextPublishedTraining)}>Training details</Btn><Btn ghost onClick={()=>eventComposer(nextPublishedTraining,"reminder")}>Training response reminder</Btn></>}<Btn onClick={()=>setComposer({audienceType:"team",messageType:"announcement",title:"",body:"",eventId:null,groupId:"",playerIds:[],priority:"normal"})}>New Message</Btn></div>}</div>{nextPublishedTraining&&<Card style={{padding:12,marginBottom:10,background:C.yellowSoft,borderColor:"#fed7aa"}}><div style={{fontSize:10,fontWeight:800,color:C.ink}}>Club training allocation available</div><div style={{fontSize:10,color:C.muted,marginTop:3}}>{fmt(nextPublishedTraining.starts_at)} · {nextPublishedTraining.facility?.name||nextPublishedTraining.location||"Location TBC"}. Use the training templates above to message parents without retyping the details.</div></Card>}{messages.filter(m=>isAdmin||m.age_group_id===selectedTeam?.id).map(m=><Card key={m.id} style={{padding:14,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div style={{minWidth:0,flex:1}}><b style={{fontSize:12}}>{m.title}</b>{m.message_type==="coach_session_draft"&&<div style={{fontSize:9,fontWeight:800,color:C.orange,marginTop:3,textTransform:"uppercase"}}>Auto-created from Coach session</div>}<div style={{fontSize:10,color:C.muted,marginTop:3,whiteSpace:"pre-line"}}>{m.body}</div></div><Pill>{m.audience_type}</Pill></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:8}}><div style={{fontSize:9,color:C.muted}}>{m.sent_at?`Sent ${fmt(m.sent_at)}`:"Draft — review before sending"}</div>{!m.sent_at&&canSendSelected&&<Btn ghost onClick={()=>openSavedDraft(m)}>Review draft</Btn>}</div></Card>)}</>}

      {tab==="groups"&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12}}><div><h2 style={{margin:0,fontSize:18}}>Groups & subgroups</h2><div style={{fontSize:10,color:C.muted}}>Internal staff groups; parents only see messages relevant to their child.</div></div>{canSendSelected&&<Btn onClick={()=>setGroupModal(true)}>Create subgroup</Btn>}</div>{teamGroups.map(g=>{const ids=groupMembers.filter(m=>m.group_id===g.id).map(m=>m.player_id);return <Card key={g.id} style={{padding:15,marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b>{g.name}</b><div style={{fontSize:10,color:C.muted,marginTop:3}}>{g.description||"Custom subgroup"} · {ids.length} player{ids.length===1?"":"s"}</div></div>{canSendSelected&&<Btn ghost onClick={()=>setComposer({audienceType:"group",messageType:"announcement",title:"",body:"",eventId:null,groupId:g.id,playerIds:[],priority:"normal"})}>Message</Btn>}</div></Card>})}{!teamGroups.length&&<Card style={{padding:18,fontSize:11,color:C.muted}}>No subgroups yet. Examples: Saturday squad, Féile panel, goalkeepers, bus group.</Card>}</>}

      {tab==="responses"&&<div>{upcoming.map(e=><Card key={e.id} style={{padding:15,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:9}}><div><b>{e.title}</b><div style={{fontSize:9,color:C.muted}}>{fmt(e.starts_at)}</div></div><Pill tone={noResponseCount(e)?"warn":"yes"}>{noResponseCount(e)} outstanding</Pill></div>{teamPlayers.map(p=>{const r=responses.find(x=>x.event_id===e.id&&x.player_id===p.id);return <div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderTop:`1px solid ${C.line}`,fontSize:11}}><span>{p.name}</span><Pill tone={r?.response||"warn"}>{r?.response?r.response.toUpperCase():"NO RESPONSE"}</Pill></div>})}</Card>)}</div>}

      {tab==="more"&&<><Card style={{padding:16,marginBottom:10}}><h2 style={{fontSize:17,margin:"0 0 5px"}}>Sending permissions</h2><div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Lead Mentors can send automatically. They can grant another assigned mentor permission for this team. Club Admin and Super Admin can send clubwide.</div>{canManageDelegates&&<Btn style={{marginTop:12}} onClick={()=>setPermissionModal(true)}>Manage authorised senders</Btn>}</Card><Card style={{padding:16}}><b>Account</b><div style={{fontSize:10,color:C.muted,marginTop:4}}>{session.user.email}</div><Btn ghost style={{marginTop:12}} onClick={()=>supabase.auth.signOut()}>Log out</Btn></Card></>}
      </main>
    </div>

    <div className="connect-mobile-nav spraoi-mobile-bottom-nav" style={{"--module-color":C.yellow}}>
      {mobileNav.map(([id,icon,label])=>{
        const active=tab===id;
        return (
          <button key={id} onClick={()=>setTab(id)} title={label} aria-label={label} className="spraoi-mobile-bottom-nav-button" data-active={active}>
            <span className="spraoi-mobile-bottom-nav-chip">
              <img src={connectSidebarAsset(id)} alt="" aria-hidden="true" className="spraoi-mobile-bottom-nav-icon"/>
            </span>
            <span className="spraoi-mobile-bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </div>

    <Modal open={!!composer} title="Send with Spraoi Connect" onClose={()=>setComposer(null)}>{composer&&<Composer draft={composer} setDraft={setComposer} teamPlayers={teamPlayers} groups={teamGroups} isAdmin={isAdmin} event={events.find(e=>e.id===composer.eventId)} onSend={()=>sendMessage(composer)}/>}</Modal>



    {profileOpen && (
      <div
        onClick={() => setProfileOpen(false)}
        style={{
          position:"fixed",
          inset:0,
          zIndex:99999,
          background:"rgba(0,0,0,0.5)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          padding:16
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background:C.white,
            borderRadius:16,
            width:"min(420px,100%)",
            boxShadow:"0 20px 50px rgba(16,36,62,.24)",
            overflow:"hidden"
          }}
        >
          <div
            style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              padding:"16px 20px",
              borderBottom:`1px solid ${C.line}`
            }}
          >
            <div
              style={{
                fontFamily:F.display,
                fontSize:17,
                fontWeight:800,
                color:C.ink
              }}
            >
              Profile
            </div>

            <button
              onClick={() => setProfileOpen(false)}
              aria-label="Close profile"
              style={{
                background:"none",
                border:"none",
                cursor:"pointer",
                fontSize:18,
                color:C.muted
              }}
            >
              X
            </button>
          </div>

          <div style={{padding:20}}>

            {/* User info */}
            <div
              style={{
                display:"flex",
                alignItems:"center",
                gap:12,
                marginBottom:20
              }}
            >
              <div
                style={{
                  width:48,
                  height:48,
                  borderRadius:"50%",
                  background:"#F9731620",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontFamily:F.display,
                  fontSize:18,
                  fontWeight:800,
                  color:"#c94f00"
                }}
              >
                {userInitials}
              </div>

              <div style={{minWidth:0}}>
                <div
                  style={{
                    fontFamily:F.body,
                    fontSize:14,
                    fontWeight:700,
                    color:C.ink,
                    overflow:"hidden",
                    textOverflow:"ellipsis"
                  }}
                >
                  {session?.user?.email || userDisplayName}
                </div>

                <div
                  style={{
                    fontFamily:F.body,
                    fontSize:11,
                    color:C.muted,
                    marginTop:2
                  }}
                >
                  {String(role || "coach_mentor").replaceAll("_"," ")}
                  {club?.name ? ` ? ${club.name}` : ""}
                </div>
              </div>
            </div>


            {/* My Teams */}
            <div style={{marginBottom:20}}>
              <div
                style={{
                  fontFamily:F.display,
                  fontSize:14,
                  fontWeight:800,
                  color:C.ink,
                  marginBottom:8
                }}
              >
                My Teams
              </div>

              <div
                style={{
                  display:"flex",
                  flexWrap:"wrap",
                  gap:6
                }}
              >
                {visibleTeams.map((team) => (
                  <div
                    key={team.id}
                    style={{
                      display:"flex",
                      alignItems:"center",
                      padding:"6px 10px",
                      borderRadius:8,
                      background:C.soft,
                      border:`1px solid ${C.line}`
                    }}
                  >
                    <span
                      style={{
                        fontFamily:F.body,
                        fontSize:11,
                        fontWeight:600,
                        color:C.ink
                      }}
                    >
                      {shortTeam(team)}
                    </span>
                  </div>
                ))}

                {visibleTeams.length === 0 && (
                  <div
                    style={{
                      fontFamily:F.body,
                      fontSize:11,
                      color:C.muted
                    }}
                  >
                    No teams assigned
                  </div>
                )}
              </div>
            </div>


            {/* Sign Out */}
            <button
              onClick={async () => {
                setProfileOpen(false);
                await supabase.auth.signOut();
              }}
              style={{
                width:"100%",
                padding:12,
                borderRadius:10,
                border:"1.5px solid rgba(211,47,47,.20)",
                background:"rgba(211,47,47,.04)",
                fontFamily:F.body,
                fontSize:12,
                fontWeight:700,
                color:"#DC2626",
                cursor:"pointer"
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )}


    {profileOpen && (
      <div
        onClick={() => setProfileOpen(false)}
        style={{
          position:"fixed",
          inset:0,
          zIndex:99999,
          background:"rgba(0,0,0,0.5)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          padding:16
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background:C.white,
            borderRadius:16,
            width:"min(420px,100%)",
            boxShadow:"0 20px 50px rgba(16,36,62,.24)",
            overflow:"hidden"
          }}
        >
          <div
            style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              padding:"16px 20px",
              borderBottom:`1px solid ${C.line}`
            }}
          >
            <div
              style={{
                fontFamily:F.display,
                fontSize:17,
                fontWeight:800,
                color:C.ink
              }}
            >
              Profile
            </div>

            <button
              onClick={() => setProfileOpen(false)}
              aria-label="Close profile"
              style={{
                background:"none",
                border:"none",
                cursor:"pointer",
                fontSize:18,
                color:C.muted
              }}
            >
              X
            </button>
          </div>

          <div style={{padding:20}}>

            {/* User info */}
            <div
              style={{
                display:"flex",
                alignItems:"center",
                gap:12,
                marginBottom:20
              }}
            >
              <div
                style={{
                  width:48,
                  height:48,
                  borderRadius:"50%",
                  background:"#F9731620",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontFamily:F.display,
                  fontSize:18,
                  fontWeight:800,
                  color:"#c94f00"
                }}
              >
                {userInitials}
              </div>

              <div style={{minWidth:0}}>
                <div
                  style={{
                    fontFamily:F.body,
                    fontSize:14,
                    fontWeight:700,
                    color:C.ink,
                    overflow:"hidden",
                    textOverflow:"ellipsis"
                  }}
                >
                  {session?.user?.email || userDisplayName}
                </div>

                <div
                  style={{
                    fontFamily:F.body,
                    fontSize:11,
                    color:C.muted,
                    marginTop:2
                  }}
                >
                  {String(role || "coach_mentor").replaceAll("_"," ")}
                  {club?.name ? ` ? ${club.name}` : ""}
                </div>
              </div>
            </div>


            {/* My Teams */}
            <div style={{marginBottom:20}}>
              <div
                style={{
                  fontFamily:F.display,
                  fontSize:14,
                  fontWeight:800,
                  color:C.ink,
                  marginBottom:8
                }}
              >
                My Teams
              </div>

              <div
                style={{
                  display:"flex",
                  flexWrap:"wrap",
                  gap:6
                }}
              >
                {visibleTeams.map((team) => (
                  <div
                    key={team.id}
                    style={{
                      display:"flex",
                      alignItems:"center",
                      padding:"6px 10px",
                      borderRadius:8,
                      background:C.soft,
                      border:`1px solid ${C.line}`
                    }}
                  >
                    <span
                      style={{
                        fontFamily:F.body,
                        fontSize:11,
                        fontWeight:600,
                        color:C.ink
                      }}
                    >
                      {shortTeam(team)}
                    </span>
                  </div>
                ))}

                {visibleTeams.length === 0 && (
                  <div
                    style={{
                      fontFamily:F.body,
                      fontSize:11,
                      color:C.muted
                    }}
                  >
                    No teams assigned
                  </div>
                )}
              </div>
            </div>


            {/* Sign Out */}
            <button
              onClick={async () => {
                setProfileOpen(false);
                await supabase.auth.signOut();
              }}
              style={{
                width:"100%",
                padding:12,
                borderRadius:10,
                border:"1.5px solid rgba(211,47,47,.20)",
                background:"rgba(211,47,47,.04)",
                fontFamily:F.body,
                fontSize:12,
                fontWeight:700,
                color:"#DC2626",
                cursor:"pointer"
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )}

    <Modal open={mobileModulesOpen} title="Switch module" onClose={()=>setMobileModulesOpen(false)} width={430}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        {Object.entries(MODULES).map(([key,module])=><button key={key} onClick={()=>{setMobileModulesOpen(false);if(key==="connect")setTab("dashboard");else openAdminModule(key,module.screen);}} style={{border:`1px solid ${C.line}`,borderRadius:16,padding:"14px 10px",background:key==="connect"?C.yellowSoft:"#fff",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}>
          <span style={{width:46,height:46,borderRadius:13,background:"#fff",border:`1px solid ${C.line}`,display:"grid",placeItems:"center",flexShrink:0}}><img src={module.icon} alt="" style={{width:40,height:40,objectFit:"contain"}}/></span>
          <span><span style={{display:"block",fontSize:13,fontWeight:800,color:C.ink}}>{module.label}</span><span style={{display:"block",fontSize:9,color:C.muted,marginTop:2}}>{key==="connect"?"Current module":"Open module"}</span></span>
        </button>)}
      </div>
    </Modal>
    <Modal open={groupModal} title="Create subgroup" onClose={()=>setGroupModal(false)}><Field label="Group name"><input style={inputStyle} value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="e.g. Saturday squad"/></Field><Field label="Description"><input style={inputStyle} value={newGroupDescription} onChange={e=>setNewGroupDescription(e.target.value)} placeholder="Optional"/></Field><div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",marginBottom:7}}>Players</div><div style={{maxHeight:260,overflow:"auto",border:`1px solid ${C.line}`,borderRadius:12,padding:8}}>{teamPlayers.map(p=><label key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 5px",fontSize:12}}><input type="checkbox" checked={newGroupPlayers.includes(p.id)} onChange={e=>setNewGroupPlayers(xs=>e.target.checked?[...xs,p.id]:xs.filter(id=>id!==p.id))}/>{p.name}</label>)}</div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}><Btn ghost onClick={()=>setGroupModal(false)}>Cancel</Btn><Btn disabled={!newGroupName.trim()} onClick={createGroup}>Create group</Btn></div></Modal>
    <Modal open={permissionModal} title="Authorised senders" onClose={()=>setPermissionModal(false)}>{staff.filter(s=>s.age_group_id===selectedTeam?.id&&s.user_id&&s.role!=="lead_coach").map(s=>{const grant=delegates.find(d=>d.age_group_id===selectedTeam?.id&&String(d.user_id)===String(s.user_id));return <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.line}`}}><div style={{flex:1}}><b style={{fontSize:12}}>{s.coach?.name||s.coach?.email||"Mentor"}</b><div style={{fontSize:9,color:C.muted}}>{s.role}</div></div><button onClick={()=>toggleDelegate(s)} style={{border:0,borderRadius:999,padding:"7px 10px",background:grant?.active?"#e8f5e9":C.soft,color:grant?.active?C.green:C.muted,fontWeight:800,cursor:"pointer"}}>{grant?.active?"Can send":"Allow sending"}</button></div>})}<div style={{fontSize:10,color:C.muted,marginTop:12}}>Lead Mentor access is automatic and cannot be removed here.</div></Modal>
    <style>{`
      @media(max-width:1050px){.connect-dashboard-columns{grid-template-columns:1fr!important}}
      @media(max-width:900px){
        .connect-desktop-sidebar{display:none!important}
        .connect-mobile-header{display:flex!important}
        .connect-mobile-nav{display:block!important}
        .connect-mobile-team-filter{display:flex!important}
        .connect-content{padding-bottom:86px!important}
        .connect-content main{padding:14px!important}
        .connect-topbar{display:none!important}
      }
      @media(max-width:720px){
        .connect-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
    `}</style>
  </div>;
}

function Composer({draft,setDraft,teamPlayers,groups,isAdmin,event,onSend}){
  const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
  const canSend=Boolean(draft.title?.trim()&&draft.body?.trim());
  return <div><Field label="Audience"><select style={inputStyle} value={draft.audienceType} onChange={e=>set("audienceType",e.target.value)}><option value="team">Whole team</option><option value="group">Subgroup</option><option value="selected">Selected children / parents</option>{event&&<option value="no_response">No response to this event</option>}{isAdmin&&<option value="club">Whole club</option>}</select></Field>{draft.audienceType==="group"&&<Field label="Subgroup"><select style={inputStyle} value={draft.groupId||""} onChange={e=>set("groupId",e.target.value)}><option value="">Choose group</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>}{draft.audienceType==="selected"&&<div style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",marginBottom:7}}>Recipients</div><div style={{maxHeight:180,overflow:"auto",border:`1px solid ${C.line}`,borderRadius:11,padding:7}}>{teamPlayers.map(p=><label key={p.id} style={{display:"flex",gap:8,padding:"6px 4px",fontSize:11}}><input type="checkbox" checked={draft.playerIds?.includes(p.id)} onChange={e=>set("playerIds",e.target.checked?[...(draft.playerIds||[]),p.id]:(draft.playerIds||[]).filter(id=>id!==p.id))}/>{p.name}</label>)}</div></div>}<Field label="Title"><input style={inputStyle} value={draft.title} onChange={e=>set("title",e.target.value)} placeholder="Message title"/></Field><Field label="Message"><textarea style={{...inputStyle,minHeight:150,resize:"vertical",lineHeight:1.5}} value={draft.body} onChange={e=>set("body",e.target.value)} placeholder="Write your message…"/></Field><label style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:C.muted,marginBottom:14}}><input type="checkbox" checked={draft.priority==="important"} onChange={e=>set("priority",e.target.checked?"important":"normal")}/> Important update (show prominently in Academy)</label><div style={{padding:10,borderRadius:11,background:C.soft,fontSize:10,color:C.muted,marginBottom:14}}>Parents receive this in Spraoi with the session attached. Use Whole team for normal training, or switch Audience to Subgroup for a selected squad. Availability is collected as Yes / Maybe / No against the linked session event.</div><div style={{display:"flex",justifyContent:"flex-end"}}><Btn disabled={!canSend} onClick={onSend}>Send message</Btn></div></div>;
}
