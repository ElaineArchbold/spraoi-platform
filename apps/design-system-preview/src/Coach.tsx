/**
 * Spraoi Coach — Full Product UI
 *
 * Module colour: Purple (#8e24aa)
 * Audience: Volunteer / Assistant / Club Coaches
 * Priority: Speed on the sideline.
 *
 * Mascots: onboarding · success · achievements · empty states ONLY.
 * Everything else: professional.
 *
 * Screens:
 *   Desktop — Dashboard · Planner · Attendance · AI Coach ·
 *             Player Profile · Session Builder · Reports
 *   Mobile  — Today · Pitch Mode · Timer · Messages · Notes · Availability
 *   Showcase — Component Library · Navigation
 */

import { useState, useEffect, useRef } from 'react'
import spraioIcon from './imports/spraoi-icon.png'
import shellySrc from './imports/Shelly.png'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const P = {
  // Purple ramp
  p900:  '#4a0072',
  p800:  '#6a1b9a',
  p700:  '#7b1fa2',
  p600:  '#8e24aa',   // primary
  p500:  '#9c27b0',
  p400:  '#ab47bc',
  p300:  '#ce93d8',
  p200:  '#e1bee7',
  p100:  '#f3e5f5',
  p50:   '#faf5fc',
  // Neutrals (Spraoi source of truth)
  navy:  '#0b2545',
  ink:   '#13243b',
  muted: '#627187',
  line:  '#dfe7ef',
  soft:  '#f6f9fc',
  cream: '#fffaf2',
  white: '#ffffff',
  // Semantic
  green:  '#43a047',
  orange: '#fb8c00',
  coral:  '#e64a19',
  sky:    '#29b6f6',
  yellow: '#fbc02d',
  // AI dark
  aiDark: '#0e0518',
  aiBg:   '#160c25',
  aiCard: '#1e1232',
  aiLine: 'rgba(255,255,255,.08)',
}

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body:    { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono:    { fontFamily: "'JetBrains Mono', monospace" },
}

const Sh = {
  card:   '0 2px 12px rgba(142,36,170,.06), 0 1px 3px rgba(13,49,87,.05)',
  lift:   '0 8px 24px rgba(142,36,170,.12), 0 2px 6px rgba(13,49,87,.06)',
  purple: '0 10px 28px rgba(142,36,170,.28)',
  green:  '0 8px 20px rgba(67,160,71,.24)',
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const PLAYERS = [
  { id:1,  name:'Ciarán Ó Murchú',     pos:'Forward',   number:14, age:12, avg:88, streak:7,  present:true,  avail:true,  xp:1240 },
  { id:2,  name:'Niamh Ní Bhriain',    pos:'Midfielder', number:8,  age:12, avg:92, streak:12, present:true,  avail:true,  xp:1580 },
  { id:3,  name:'Seán Mac Gearailt',   pos:'Defender',   number:5,  age:11, avg:74, streak:3,  present:false, avail:false, xp:890  },
  { id:4,  name:'Aoife de Búrca',      pos:'Goalkeeper', number:1,  age:13, avg:96, streak:18, present:true,  avail:true,  xp:2100 },
  { id:5,  name:'Pádraig Ó Ceall.',    pos:'Forward',   number:11, age:12, avg:81, streak:5,  present:true,  avail:true,  xp:1020 },
  { id:6,  name:'Siobhán Ní Dheas.',   pos:'Forward',   number:15, age:12, avg:78, streak:2,  present:true,  avail:null,  xp:760  },
  { id:7,  name:'Tomás Ó Briain',      pos:'Midfielder', number:6,  age:11, avg:85, streak:9,  present:false, avail:true,  xp:1340 },
  { id:8,  name:'Caoimhe Ní Fhaoláin', pos:'Defender',   number:4,  age:13, avg:90, streak:14, present:true,  avail:true,  xp:1870 },
  { id:9,  name:'Éamonn Mac Cárthaigh',pos:'Midfielder', number:7,  age:12, avg:82, streak:6,  present:true,  avail:true,  xp:1110 },
  { id:10, name:'Róisín Ní Mháille',   pos:'Forward',   number:13, age:12, avg:79, streak:4,  present:true,  avail:true,  xp:980  },
  { id:11, name:'Fionn Ó Treasaigh',   pos:'Defender',   number:3,  age:12, avg:71, streak:1,  present:false, avail:false, xp:540  },
  { id:12, name:'Deirdre Ní Cheallaigh',pos:'Midfielder',number:9, age:13, avg:88, streak:8,  present:true,  avail:true,  xp:1420 },
]

const DRILLS = [
  { id:1, name:'Catch & Kick',       cat:'Kicking',    time:8,  level:'Beginner',     desc:'Basic drop kick and catch pairs.' },
  { id:2, name:'Hand Pass Relay',    cat:'Passing',    time:6,  level:'Beginner',     desc:'Two rows, alternate hand pass down line.' },
  { id:3, name:'Solo & Kick',        cat:'Solo',       time:10, level:'Intermediate', desc:'Solo 30m, place kick to partner.' },
  { id:4, name:'2v1 Attack',         cat:'Game Skills',time:12, level:'Intermediate', desc:'Overload drill — exploit space.' },
  { id:5, name:'45m Free Kick',      cat:'Kicking',    time:8,  level:'Advanced',     desc:'Dead ball from 45m range.' },
  { id:6, name:'Diamond Warm-up',    cat:'Warm-up',    time:5,  level:'Beginner',     desc:'4 cones, jog/sprint variations.' },
  { id:7, name:'Dynamic Stretch',    cat:'Warm-up',    time:5,  level:'Beginner',     desc:'Leg swings, hip circles, shuffles.' },
  { id:8, name:'3v3 Small Sided',    cat:'Game',       time:15, level:'Advanced',     desc:'Conditioned game — kick only.' },
]

// ─── Micro components ─────────────────────────────────────────────────────────

function Avatar({ name, size=28, color=P.p600 }: { name:string; size?:number; color?:string }) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('')
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:`${color}22`, color, display:'flex', alignItems:'center',
      justifyContent:'center', ...F.display, fontSize:size*0.35, fontWeight:800,
    }}>{initials}</div>
  )
}

function Badge({ label, color=P.p600, bg, style }: { label:string; color?:string; bg?:string; style?: React.CSSProperties }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', height:20, padding:'0 8px',
      background: bg ?? `${color}18`, border:`1px solid ${color}30`,
      borderRadius:999, ...F.body, fontSize:11, fontWeight:700, color, ...style,
    }}>{label}</span>
  )
}

function PresenceDot({ present }: { present: boolean | null }) {
  const c = present === true ? P.green : present === false ? P.coral : P.orange
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} />
}

function StatCard({ label, value, sub, color=P.p600, icon }: { label:string; value:string; sub?:string; color?:string; icon?:string }) {
  return (
    <div style={{ background:P.white, borderRadius:16, padding:'18px 20px', border:`1px solid ${P.line}`, borderTop:`3px solid ${color}`, boxShadow:Sh.card }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ ...F.body, fontSize:12, fontWeight:700, color:P.muted, textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
        {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      </div>
      <div style={{ ...F.display, fontSize:32, fontWeight:900, color:P.ink, letterSpacing:'-0.05em', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ ...F.body, fontSize:12, color:P.muted, marginTop:6 }}>{sub}</div>}
    </div>
  )
}

function Btn({ label, variant='primary', size='md', icon, onClick, style }: { label:string; variant?:'primary'|'secondary'|'ghost'|'danger'; size?:'sm'|'md'|'lg'; icon?:string; onClick?:()=>void; style?: React.CSSProperties }) {
  const h = size==='sm'?32:size==='lg'?52:42
  const px = size==='sm'?12:size==='lg'?28:20
  const fs = size==='sm'?12:size==='lg'?15:13
  const styles: Record<string,React.CSSProperties> = {
    primary:   { background:P.p600, color:P.white, border:'none', boxShadow:Sh.purple },
    secondary: { background:P.p50, color:P.p600, border:`1.5px solid ${P.p200}` },
    ghost:     { background:'transparent', color:P.ink, border:`1.5px solid ${P.line}` },
    danger:    { background:`${P.coral}15`, color:P.coral, border:`1.5px solid ${P.coral}30` },
  }
  return (
    <button onClick={onClick} style={{
      height:h, padding:`0 ${px}px`, borderRadius:14, cursor:'pointer',
      display:'inline-flex', alignItems:'center', gap:6,
      ...F.body, fontSize:fs, fontWeight:800,
      transition:'transform .12s, box-shadow .12s', ...styles[variant], ...style,
    }}
      onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)' }}
      onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='none' }}
    >
      {icon && <span style={{ fontSize:fs+2 }}>{icon}</span>}
      {label}
    </button>
  )
}

// ─── Mascot (allowed states only) ─────────────────────────────────────────────
// Shelly the Sheep — Coach mascot. Purple jersey. Kind · Focused · Resilient.
// Use ONLY in: onboarding · success · achievements · empty states.
function CoachMascot({ size=120 }: { size?:number }) {
  return (
    <img
      src={shellySrc}
      alt="Shelly the Sheep mascot"
      style={{ width: size * 2.2, height: 'auto', objectFit: 'contain', maxWidth: '100%' }}
    />
  )
}

// ─── Progress ring ─────────────────────────────────────────────────────────────
function Ring({ pct, size=64, stroke=6, color=P.p600, label }: { pct:number; size?:number; stroke?:number; color?:string; label?:string }) {
  const r = (size-stroke*2)/2
  const circ = 2*Math.PI*r
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P.line} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ*pct/100} ${circ}`} strokeLinecap="round" />
      </svg>
      {label && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', ...F.display, fontSize:size*0.22, fontWeight:900, color:P.ink }}>{label}</div>
      )}
    </div>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
const DESKTOP_NAV = [
  { id:'dashboard',    icon:'◎', label:'Dashboard',      badge:0 },
  { id:'planner',      icon:'📅', label:'Planner',        badge:0 },
  { id:'sessions',     icon:'◈', label:'Session Builder', badge:0 },
  { id:'attendance',   icon:'✓', label:'Attendance',      badge:3 },
  { id:'players',      icon:'◉', label:'Players',         badge:0 },
  { id:'ai',           icon:'✦', label:'AI Coach',        badge:1 },
  { id:'reports',      icon:'◐', label:'Reports',         badge:0 },
]

function Sidebar({ active, onNav, collapsed, onToggle }: {
  active:string; onNav:(s:string)=>void; collapsed:boolean; onToggle:()=>void
}) {
  const w = collapsed ? 68 : 240
  return (
    <div style={{
      width:w, minHeight:'100vh', background:P.navy, display:'flex', flexDirection:'column',
      transition:'width 220ms cubic-bezier(.4,0,.2,1)', overflow:'hidden', flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '16px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid rgba(255,255,255,.06)`, marginBottom:8 }}>
        <img src={spraioIcon} alt="Spraoi Sports" style={{ width:40, height:40, objectFit:'contain', flexShrink:0 }} />
        {!collapsed && (
          <div>
            <div style={{ ...F.display, fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.1, whiteSpace:'nowrap' }}>Spraoi Sports</div>
            <div style={{ ...F.body, fontSize:10, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap', marginTop:2 }}>St. Finbarr&apos;s GAA · Coach</div>
          </div>
        )}
      </div>
      {/* Nav items */}
      <nav style={{ flex:1, padding:'4px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {!collapsed && <div style={{ ...F.body, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,.25)', padding:'8px 8px 4px' }}>Menu</div>}
        {DESKTOP_NAV.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onNav(item.id)} title={collapsed ? item.label : undefined}
              style={{
                display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius:10, border:'none', cursor:'pointer', width:'100%',
                background: isActive ? `${P.p600}30` : 'transparent',
                borderLeft: isActive && !collapsed ? `3px solid ${P.p400}` : '3px solid transparent',
                transition:'background .15s',
              }}>
              <span style={{ fontSize:16, flexShrink:0, color: isActive ? P.p300 : 'rgba(255,255,255,.4)' }}>{item.icon}</span>
              {!collapsed && <>
                <span style={{ ...F.body, fontSize:13, fontWeight: isActive ? 700 : 500, color: isActive ? P.white : 'rgba(255,255,255,.5)', flex:1, textAlign:'left', whiteSpace:'nowrap' }}>{item.label}</span>
                {item.badge > 0 && <span style={{ minWidth:18, height:18, borderRadius:9, background:P.p600, color:P.white, ...F.body, fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{item.badge}</span>}
              </>}
            </button>
          )
        })}
      </nav>
      {/* Footer */}
      <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop:`1px solid rgba(255,255,255,.06)` }}>
        {!collapsed ? (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:P.p600, display:'flex', alignItems:'center', justifyContent:'center', ...F.display, fontSize:13, fontWeight:900, color:P.white, flexShrink:0 }}>CM</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ ...F.body, fontSize:12, fontWeight:700, color:P.white, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Coach Murphy</div>
              <div style={{ ...F.body, fontSize:11, color:'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>Administrator</div>
            </div>
            <button onClick={onToggle} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:14, padding:4 }}>◀</button>
          </div>
        ) : (
          <button onClick={onToggle} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:18, padding:'4px 0', display:'flex', justifyContent:'center' }}>▶</button>
        )}
      </div>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ title, sub, actions }: { title:string; sub?:string; actions?: React.ReactNode }) {
  return (
    <div style={{ background:P.white, borderBottom:`1px solid ${P.line}`, padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div>
        <h1 style={{ ...F.display, fontSize:20, fontWeight:900, color:P.ink, letterSpacing:'-0.03em', margin:0 }}>{title}</h1>
        {sub && <p style={{ ...F.body, fontSize:12, color:P.muted, margin:0 }}>{sub}</p>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>{actions}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP SCREENS
// ════════════════════════════════════════════════════════════════════════════

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardScreen({ onNav }: { onNav:(s:string)=>void }) {
  const presentCount = PLAYERS.filter(p=>p.present).length
  const pct = Math.round((presentCount/PLAYERS.length)*100)

  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Dashboard" sub="Tuesday 5 Aug 2026 · St. Finbarr's GAA"
        actions={<>
          <Btn label="New Session" icon="+" variant="primary" size="sm" onClick={()=>onNav('sessions')} />
          <Btn label="Take Attendance" icon="✓" variant="secondary" size="sm" onClick={()=>onNav('attendance')} />
        </>}
      />
      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          <StatCard label="Squad size"     value="22"    sub="3 injured · 1 suspended"  color={P.p600} icon="◉" />
          <StatCard label="Avg attendance" value="84%"   sub="↑ 6% vs last month"       color={P.green} icon="✓" />
          <StatCard label="Sessions (Aug)" value="6"     sub="12 drills run"             color={P.sky} icon="◈" />
          <StatCard label="Journey players" value="18"   sub="playing Challenge"         color={P.orange} icon="🚀" />
        </div>
        {/* Main grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Today's session */}
            <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, overflow:'hidden', boxShadow:Sh.card }}>
              <div style={{ background:`linear-gradient(135deg, ${P.p800}, ${P.p600})`, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ ...F.body, fontSize:11, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Today · 16:30 · Pitch 2</div>
                  <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Passing & Movement</div>
                  <div style={{ ...F.body, fontSize:13, color:'rgba(255,255,255,.7)', marginTop:4 }}>U12 A · 8 drills · 75 min</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Btn label="Edit" variant="ghost" size="sm" style={{ background:'rgba(255,255,255,.15)', color:P.white, border:'none' }} />
                  <Btn label="Start" icon="▶" size="sm" style={{ background:P.white, color:P.p600 }} />
                </div>
              </div>
              <div style={{ padding:'16px 24px', display:'flex', gap:24, borderBottom:`1px solid ${P.line}` }}>
                {[['Warm-up','10 min',P.orange],['Main Work','50 min',P.p600],['Cool-down','15 min',P.green]].map(([phase,dur,c]) => (
                  <div key={phase} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:c as string }} />
                    <div>
                      <div style={{ ...F.body, fontSize:12, fontWeight:700, color:P.ink }}>{phase}</div>
                      <div style={{ ...F.mono, fontSize:11, color:P.muted }}>{dur}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                  <Ring pct={pct} size={48} stroke={5} color={P.p600} label={`${pct}%`} />
                  <div>
                    <div style={{ ...F.body, fontSize:12, fontWeight:700, color:P.ink }}>{presentCount}/{PLAYERS.length} confirmed</div>
                    <div style={{ ...F.body, fontSize:11, color:P.muted }}>4 awaiting reply</div>
                  </div>
                </div>
              </div>
              {/* Drill list */}
              <div style={{ padding:'0 24px' }}>
                {[['Diamond Warm-up',10,'Warm-up'],['Hand Pass Relay',6,'Passing'],['Solo & Kick',10,'Solo'],['2v1 Attack',12,'Game Skills'],['3v3 Small Sided',15,'Game']].map(([name,dur,cat],i) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i<4 ? `1px solid ${P.line}` : 'none' }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:P.p50, ...F.display, fontSize:11, fontWeight:900, color:P.p600, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</div>
                    <div style={{ flex:1, ...F.body, fontSize:13, fontWeight:600, color:P.ink }}>{name}</div>
                    <Badge label={cat as string} color={P.p600} />
                    <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{dur}min</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Activity feed */}
            <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
              <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Recent Activity</div>
              {[
                { who:'Niamh Ní Bhriain',   what:'completed Week 14 Challenge · +80 XP', time:'2m ago',  color:P.green  },
                { who:'Aoife de Búrca',      what:'missed training on Sun 3 Aug',          time:'1d ago',  color:P.coral  },
                { who:'AI Coach',            what:'suggested a new kicking drill for U12',  time:'3h ago',  color:P.p600   },
                { who:'Ciarán Ó Murchú',    what:'reached Level 5 on Spraoi Journey',      time:'4h ago',  color:P.orange },
                { who:'Fionn Ó Treasaigh',   what:'marked unavailable for next session',    time:'6h ago',  color:P.muted  },
              ].map(ev => (
                <div key={ev.who} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'8px 0', borderBottom:`1px solid ${P.line}` }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:ev.color, marginTop:6, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <span style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink }}>{ev.who} </span>
                    <span style={{ ...F.body, fontSize:13, color:P.muted }}>{ev.what}</span>
                  </div>
                  <span style={{ ...F.mono, fontSize:11, color:P.muted, flexShrink:0 }}>{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Upcoming */}
            <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px', boxShadow:Sh.card }}>
              <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:14 }}>Upcoming Sessions</div>
              {[['Thu 7 Aug','Kicking Accuracy','U12 A','17:00'],['Sat 9 Aug','Match Practice','U12 A','10:00'],['Tue 12 Aug','Defensive Shape','U12 A','16:30']].map(([date,title,team,time]) => (
                <div key={date} style={{ padding:'10px 0', borderBottom:`1px solid ${P.line}`, display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:P.p50, border:`1.5px solid ${P.p200}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ ...F.mono, fontSize:9, fontWeight:700, color:P.p600 }}>{date.split(' ')[1]}</span>
                    <span style={{ ...F.display, fontSize:13, fontWeight:900, color:P.p600 }}>{date.split(' ')[0]}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
                    <div style={{ ...F.body, fontSize:11, color:P.muted }}>{team} · {time}</div>
                  </div>
                </div>
              ))}
              <Btn label="View all" variant="ghost" size="sm" style={{ marginTop:12, width:'100%', justifyContent:'center' }} onClick={()=>onNav('planner')} />
            </div>
            {/* AI tip */}
            <div style={{ background:`linear-gradient(135deg, ${P.aiBg}, ${P.aiCard})`, borderRadius:20, border:`1px solid rgba(174,123,214,.2)`, padding:'20px' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:10, background:`${P.p600}40`, border:`1px solid ${P.p400}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✦</div>
                <div>
                  <div style={{ ...F.body, fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:P.p300, marginBottom:4 }}>AI Coach Tip</div>
                  <p style={{ ...F.body, fontSize:13, color:'rgba(255,255,255,.8)', lineHeight:1.65, margin:0 }}>
                    3 of your U12 players have missed hand-passing practice 3 weeks in a row. Consider adding a short 5-minute hand-pass drill to the warmup next session.
                  </p>
                  <button onClick={()=>onNav('ai')} style={{ ...F.body, marginTop:10, fontSize:12, fontWeight:700, color:P.p300, background:'none', border:'none', cursor:'pointer', padding:0 }}>Open AI Coach →</button>
                </div>
              </div>
            </div>
            {/* Quick availability */}
            <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px', boxShadow:Sh.card }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink }}>Availability</div>
                <Badge label="Thu 7 Aug" color={P.p600} />
              </div>
              {PLAYERS.slice(0,6).map(pl => (
                <div key={pl.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${P.line}` }}>
                  <Avatar name={pl.name} size={24} />
                  <span style={{ ...F.body, fontSize:12, flex:1, color:P.ink, fontWeight:600 }}>{pl.name.split(' ')[0]}</span>
                  <PresenceDot present={pl.avail} />
                  <span style={{ ...F.body, fontSize:11, color: pl.avail===true?P.green:pl.avail===false?P.coral:P.orange }}>
                    {pl.avail===true?'Avail':pl.avail===false?'Out':'TBC'}
                  </span>
                </div>
              ))}
              <Btn label="Request all" variant="secondary" size="sm" style={{ marginTop:12, width:'100%', justifyContent:'center' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Session Builder ──────────────────────────────────────────────────────────
function SessionBuilderScreen() {
  const [session, setSession] = useState([
    { ...DRILLS[5], phase:'warmup'   },
    { ...DRILLS[6], phase:'warmup'   },
    { ...DRILLS[1], phase:'main'     },
    { ...DRILLS[2], phase:'main'     },
    { ...DRILLS[3], phase:'main'     },
    { ...DRILLS[7], phase:'main'     },
  ])
  const [library, setLibrary] = useState(DRILLS.filter(d=> !session.find(s=>s.id===d.id)))
  const [search, setSearch] = useState('')

  const total = session.reduce((a,d)=>a+d.time,0)

  function addDrill(drill: typeof DRILLS[0]) {
    setSession(s=>[...s, { ...drill, phase:'main' }])
    setLibrary(l=>l.filter(d=>d.id!==drill.id))
  }
  function removeDrill(i: number) {
    const d = session[i]
    setLibrary(l=>[...l, DRILLS.find(dr=>dr.id===d.id)!])
    setSession(s=>s.filter((_,j)=>j!==i))
  }

  const warmup = session.filter(d=>d.phase==='warmup')
  const main   = session.filter(d=>d.phase==='main')
  const cool   = session.filter(d=>d.phase==='cooldown')

  const phaseColor: Record<string,string> = { warmup:P.orange, main:P.p600, cooldown:P.green }

  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:P.soft }}>
      <TopBar title="Session Builder" sub="Passing & Movement · U12 A · Tue 5 Aug"
        actions={<>
          <Btn label="Save template" variant="secondary" size="sm" icon="💾" />
          <Btn label="Save session" variant="primary" size="sm" icon="✓" />
        </>}
      />
      <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 320px', gap:0 }}>
        {/* Builder canvas */}
        <div style={{ overflow:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Session meta */}
          <div style={{ background:P.white, borderRadius:16, border:`1px solid ${P.line}`, padding:'16px 20px', display:'flex', gap:24, alignItems:'center', boxShadow:Sh.card }}>
            {[['Total time',`${total} min`],['Drills',`${session.length}`],['Phase breakdown','10 · 42 · 0 min']].map(([l,v])=>(
              <div key={l}>
                <div style={{ ...F.body, fontSize:11, color:P.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</div>
                <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.ink, letterSpacing:'-0.04em' }}>{v}</div>
              </div>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              {[['Warm-up',10,P.orange],['Main',42,P.p600],['Cool-down',0,P.green]].map(([phase,min,c])=>(
                <div key={phase} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c as string }} />
                  <span style={{ ...F.body, fontSize:11, color:P.muted }}>{phase} {min}m</span>
                </div>
              ))}
            </div>
          </div>
          {/* Phase blocks */}
          {[{phase:'warmup',label:'Warm-up',drills:warmup},{phase:'main',label:'Main Work',drills:main},{phase:'cooldown',label:'Cool-down',drills:cool}].map(group=>(
            <div key={group.phase}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:12, height:12, borderRadius:'50%', background:phaseColor[group.phase] }} />
                <span style={{ ...F.display, fontSize:13, fontWeight:900, color:P.ink }}>{group.label}</span>
                <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{group.drills.reduce((a,d)=>a+d.time,0)} min</span>
              </div>
              {group.drills.length === 0 ? (
                <div style={{ border:`2px dashed ${P.line}`, borderRadius:12, padding:'20px', textAlign:'center', ...F.body, fontSize:13, color:P.muted }}>Drop drills here</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {group.drills.map((d,i) => {
                    const globalIdx = session.findIndex(s=>s===d)
                    return (
                      <div key={d.id} style={{ background:P.white, borderRadius:12, border:`1px solid ${P.line}`, borderLeft:`4px solid ${phaseColor[group.phase]}`, padding:'12px 16px', display:'flex', gap:12, alignItems:'center', boxShadow:Sh.card }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:P.p50, ...F.display, fontSize:12, fontWeight:900, color:P.p600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ ...F.body, fontSize:14, fontWeight:700, color:P.ink }}>{d.name}</div>
                          <div style={{ ...F.body, fontSize:12, color:P.muted }}>{d.desc}</div>
                        </div>
                        <Badge label={d.cat} color={P.p600} />
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ ...F.mono, fontSize:12, fontWeight:700, color:P.ink }}>{d.time}m</span>
                        </div>
                        <button onClick={()=>removeDrill(globalIdx)} style={{ width:24, height:24, borderRadius:6, background:`${P.coral}15`, border:'none', cursor:'pointer', color:P.coral, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Drill library */}
        <div style={{ background:P.white, borderRight:'none', borderLeft:`1px solid ${P.line}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'20px 20px 12px', borderBottom:`1px solid ${P.line}` }}>
            <div style={{ ...F.display, fontSize:14, fontWeight:900, color:P.ink, marginBottom:10 }}>Drill Library</div>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:P.muted }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search drills…"
                style={{ width:'100%', height:36, paddingLeft:32, paddingRight:12, border:`1px solid ${P.line}`, borderRadius:10, ...F.body, fontSize:13, color:P.ink, outline:'none', background:P.soft }} />
            </div>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
            {library.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())).map(drill => (
              <div key={drill.id} style={{ background:P.soft, borderRadius:12, border:`1px solid ${P.line}`, padding:'10px 12px', cursor:'pointer' }}
                onClick={()=>addDrill(drill)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <span style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink }}>{drill.name}</span>
                  <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{drill.time}m</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Badge label={drill.cat} color={P.p600} />
                  <Badge label={drill.level} color={drill.level==='Beginner'?P.green:drill.level==='Advanced'?P.coral:P.orange} />
                </div>
                <div style={{ ...F.body, fontSize:11, color:P.muted, marginTop:4 }}>{drill.desc}</div>
              </div>
            ))}
            {library.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <CoachMascot size={80} />
                <p style={{ ...F.body, fontSize:13, color:P.muted, marginTop:8 }}>All drills added to session!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Screen ────────────────────────────────────────────────────────
function AttendanceScreen() {
  const [attendance, setAttendance] = useState<Record<number, boolean|null>>(
    Object.fromEntries(PLAYERS.map(p=>[p.id, p.present]))
  )
  const toggle = (id:number) => setAttendance(a=>({...a, [id]: a[id]===true ? false : a[id]===false ? null : true }))
  const present = Object.values(attendance).filter(v=>v===true).length
  const absent  = Object.values(attendance).filter(v=>v===false).length
  const pct = Math.round((present/PLAYERS.length)*100)

  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Attendance" sub="Passing & Movement · Tue 5 Aug 2026 · 16:30"
        actions={<>
          <Btn label="Export PDF" variant="ghost" size="sm" icon="↓" />
          <Btn label="Save" variant="primary" size="sm" icon="✓" />
        </>}
      />
      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard label="Present"  value={String(present)} sub={`${pct}% attendance`}       color={P.green} />
          <StatCard label="Absent"   value={String(absent)}  sub="marked absent"               color={P.coral} />
          <StatCard label="Unknown"  value={String(PLAYERS.length-present-absent)} sub="not yet marked" color={P.orange} />
          <StatCard label="Squad"    value={String(PLAYERS.length)} sub="total registered"    color={P.p600} />
        </div>
        {/* Roster */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, overflow:'hidden', boxShadow:Sh.card }}>
          <div style={{ padding:'16px 24px', borderBottom:`1px solid ${P.line}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, flex:1 }}>U12 A Squad</div>
            <Ring pct={pct} size={52} stroke={5} color={P.p600} label={`${pct}%`} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
            {PLAYERS.map((player, i) => {
              const status = attendance[player.id]
              const bg = status===true ? `${P.green}08` : status===false ? `${P.coral}08` : P.white
              const borderC = status===true ? `${P.green}20` : status===false ? `${P.coral}20` : P.line
              return (
                <div key={player.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                  borderBottom:`1px solid ${P.line}`, borderRight: i%2===0 ? `1px solid ${P.line}` : 'none',
                  background:bg, cursor:'pointer', transition:'background .12s',
                  borderLeft:`4px solid ${status===true?P.green:status===false?P.coral:'transparent'}`,
                }} onClick={()=>toggle(player.id)}>
                  <Avatar name={player.name} size={34} color={status===true?P.green:status===false?P.coral:P.p600} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{player.name}</div>
                    <div style={{ ...F.body, fontSize:11, color:P.muted }}>{player.pos} · #{player.number}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {(['present','absent','unknown'] as const).map(s=>{
                      const state = s==='present'?true:s==='absent'?false:null
                      const isActive = attendance[player.id] === state
                      const c = s==='present'?P.green:s==='absent'?P.coral:P.orange
                      return (
                        <button key={s} onClick={e=>{e.stopPropagation();setAttendance(a=>({...a,[player.id]:state}))}}
                          style={{ width:28, height:28, borderRadius:7, border:`1.5px solid ${isActive?c:P.line}`, background:isActive?`${c}20`:'transparent', cursor:'pointer', fontSize:13, color:isActive?c:P.muted }}>
                          {s==='present'?'✓':s==='absent'?'✕':'?'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* History chart */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Attendance History — Aug 2026</div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:80 }}>
            {[['29 Jul',72],['31 Jul',86],['2 Aug',91],['5 Aug',pct],['7 Aug',null],['9 Aug',null],['12 Aug',null]].map(([date,val])=>(
              <div key={date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', borderRadius:4, background: val ? P.p600 : P.line, height: val ? `${(val as number)/100*60}px` : 4, opacity: val ? 1 : 0.5, transition:'height .3s' }} />
                <span style={{ ...F.mono, fontSize:9, color:P.muted }}>{date}</span>
                {val && <span style={{ ...F.mono, fontSize:10, fontWeight:700, color:P.p600 }}>{val}%</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI Coach ─────────────────────────────────────────────────────────────────
function AICoachScreen() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role:'ai', text:'Hi Coach Murphy 👋 I\'ve analysed your last 6 sessions and your U12 squad\'s Challenge data. Ready to help you plan, adapt, or analyse anything.' },
    { role:'user', text:'Which players need the most attention this week?' },
    { role:'ai', text:'Based on attendance and Challenge XP data:\n\n**Fionn Ó Treasaigh** — missed 3 of last 4 sessions. Challenge streak dropped to 1. Worth checking in.\n\n**Seán Mac Gearailt** — present but engagement low. Only 2 drills completed in the last session.\n\n**Siobhán Ní Dheasúin** — not confirmed for Thursday. May need a nudge on availability.' },
    { role:'user', text:'Suggest a drill to improve hand passing for the whole squad.' },
    { role:'ai', text:'**Drill: Hand Pass Gate Game** (8 min · Beginner → Intermediate)\n\nSet up 6 small gates (cones 1m apart) across the pitch. Teams of 3 pass through gates in sequence. Award 1 point per gate passed through cleanly.\n\nWhy: Forces accuracy under pressure. Works for all levels simultaneously — stronger players can add solo runs between gates.\n\n*Want me to add this to Thursday\'s session plan?*' },
  ])

  const suggestions = ['Add to Thursday plan','How did last week\'s session go?','Who\'s improving fastest?']

  function send(text=input) {
    if (!text.trim()) return
    setMessages(m=>[...m, { role:'user', text }, { role:'ai', text:'Analysing squad data… I\'ll have a recommendation ready shortly. This is a prototype — full AI responses come in the live product.' }])
    setInput('')
  }

  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:P.aiDark }}>
      {/* Header */}
      <div style={{ background:P.aiBg, borderBottom:`1px solid ${P.aiLine}`, padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${P.p600}40`, border:`1px solid ${P.p400}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✦</div>
          <div>
            <div style={{ ...F.display, fontSize:16, fontWeight:900, color:P.white }}>AI Coach</div>
            <div style={{ ...F.body, fontSize:11, color:P.p300 }}>● Active · Analysing U12 A data</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn label="Session plan" variant="ghost" size="sm" style={{ background:P.aiCard, color:P.white, border:`1px solid ${P.aiLine}` }} />
          <Btn label="Clear chat" variant="ghost" size="sm" style={{ background:'transparent', color:'rgba(255,255,255,.4)', border:`1px solid ${P.aiLine}` }} />
        </div>
      </div>
      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>
        {messages.map((msg,i) => (
          <div key={i} style={{ display:'flex', justifyContent: msg.role==='user' ? 'flex-end' : 'flex-start', gap:10 }}>
            {msg.role==='ai' && <div style={{ width:28, height:28, borderRadius:8, background:`${P.p600}30`, border:`1px solid ${P.p400}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:4 }}>✦</div>}
            <div style={{
              maxWidth:'72%', padding:'12px 16px', borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role==='user' ? P.p600 : P.aiCard,
              border:`1px solid ${msg.role==='user' ? 'transparent' : 'rgba(255,255,255,.06)'}`,
            }}>
              {msg.text.split('\n').map((line,j)=>{
                const bold = line.replace(/\*\*(.+?)\*\*/g, '$1')
                return <p key={j} style={{ ...F.body, fontSize:14, color: msg.role==='user' ? P.white : 'rgba(255,255,255,.85)', lineHeight:1.65, margin:'2px 0', fontWeight: line.startsWith('**') ? 700 : 400 }}>{bold}</p>
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Suggestions */}
      <div style={{ padding:'0 28px 12px', display:'flex', gap:8, flexWrap:'wrap' }}>
        {suggestions.map(s=>(
          <button key={s} onClick={()=>send(s)} style={{ height:32, padding:'0 14px', background:P.aiCard, border:`1px solid rgba(255,255,255,.1)`, borderRadius:999, ...F.body, fontSize:12, color:'rgba(255,255,255,.65)', cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      {/* Input */}
      <div style={{ padding:'0 28px 24px' }}>
        <div style={{ display:'flex', gap:10, background:P.aiCard, border:`1px solid rgba(255,255,255,.1)`, borderRadius:16, padding:'10px 12px' }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Ask about sessions, players, drills, tactics…"
            style={{ flex:1, background:'none', border:'none', outline:'none', ...F.body, fontSize:14, color:P.white }} />
          <button onClick={()=>send()} style={{ width:38, height:38, borderRadius:10, background:P.p600, border:'none', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:P.white, flexShrink:0 }}>↑</button>
        </div>
      </div>
    </div>
  )
}

// ─── Player Profile ───────────────────────────────────────────────────────────
function PlayerProfileScreen({ onNav }: { onNav:(s:string)=>void }) {
  const player = PLAYERS[1] // Niamh — star player

  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Player Profile" sub={player.name}
        actions={<>
          <Btn label="Message" variant="ghost" size="sm" icon="💬" />
          <Btn label="Edit" variant="secondary" size="sm" icon="✎" />
        </>}
      />
      <div style={{ padding:'24px 28px', display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
        {/* Left — card */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, overflow:'hidden', boxShadow:Sh.card }}>
            <div style={{ background:`linear-gradient(135deg, ${P.p800}, ${P.p600})`, height:80, position:'relative' }}>
              <div style={{ position:'absolute', bottom:-28, left:24 }}>
                <Avatar name={player.name} size={56} color={P.p300} />
              </div>
            </div>
            <div style={{ padding:'36px 24px 20px' }}>
              <div style={{ ...F.display, fontSize:20, fontWeight:900, color:P.ink, letterSpacing:'-0.03em' }}>{player.name}</div>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                <Badge label={player.pos} color={P.p600} />
                <Badge label={`#${player.number}`} color={P.muted} bg={P.soft} />
                <Badge label={`Age ${player.age}`} color={P.muted} bg={P.soft} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:20 }}>
                {[['Avg attendance',`${player.avg}%`],['Streak',`${player.streak} sessions`],['Journey XP',`${player.xp.toLocaleString()} XP`],['Level','Level 5']].map(([l,v])=>(
                  <div key={l} style={{ background:P.soft, borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ ...F.body, fontSize:11, color:P.muted, fontWeight:600 }}>{l}</div>
                    <div style={{ ...F.display, fontSize:16, fontWeight:900, color:P.ink, letterSpacing:'-0.02em' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Skills */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px', boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:14, fontWeight:900, color:P.ink, marginBottom:14 }}>Skill Ratings</div>
            {[['Kicking',88],['Hand Passing',95],['Catching',91],['Tackling',74],['Positioning',90]].map(([skill,val])=>(
              <div key={skill} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ ...F.body, fontSize:12, color:P.ink, fontWeight:600 }}>{skill}</span>
                  <span style={{ ...F.mono, fontSize:11, color:P.p600, fontWeight:700 }}>{val}</span>
                </div>
                <div style={{ height:5, background:P.line, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${val}%`, height:'100%', background:`linear-gradient(90deg,${P.p400},${P.p600})`, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Attendance chart */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Attendance — Last 12 Sessions</div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {[true,true,false,true,true,true,null,true,true,true,false,true].map((v,i)=>(
                <div key={i} style={{ flex:1, height:40, borderRadius:8, background: v===true?`${P.green}30`:v===false?`${P.coral}20`:P.line, border:`2px solid ${v===true?P.green:v===false?P.coral:P.line}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                  {v===true?'✓':v===false?'✕':'?'}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10, ...F.body, fontSize:12, color:P.muted }}>
              <span>✓ Present</span><span>✕ Absent</span><span>? Unknown</span>
            </div>
          </div>
          {/* Journey achievements */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink }}>Journey Achievements</div>
              <Badge label="Level 5 · 1,580 XP" color={P.orange} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[['🏆','Fitness Champion','All 5 fitness badges'],['⭐','12-week streak','Never missed'],['🥇','Top scorer','Week 14'],['🎽','100 Sessions','Training milestone']].map(([ic,title,sub])=>(
                <div key={title} style={{ background:P.soft, borderRadius:12, padding:'12px', textAlign:'center', border:`1px solid ${P.line}` }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{ic}</div>
                  <div style={{ ...F.display, fontSize:11, fontWeight:800, color:P.ink, lineHeight:1.3 }}>{title}</div>
                  <div style={{ ...F.body, fontSize:10, color:P.muted, marginTop:3 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:14 }}>Coaching Notes</div>
            {[
              { date:'2 Aug', text:'Excellent movement in the 3v3 game. Decision-making in tight spaces is notably improved.' },
              { date:'29 Jul', text:'Ask Niamh to mentor Siobhán on hand passing — natural leader.' },
              { date:'22 Jul', text:'Showed strong leadership qualities during the warm-up drill leadership exercise.' },
            ].map(n=>(
              <div key={n.date} style={{ padding:'10px 0', borderBottom:`1px solid ${P.line}`, display:'flex', gap:12 }}>
                <span style={{ ...F.mono, fontSize:11, color:P.muted, flexShrink:0, marginTop:2 }}>{n.date}</span>
                <span style={{ ...F.body, fontSize:13, color:P.ink, lineHeight:1.6 }}>{n.text}</span>
              </div>
            ))}
            <button style={{ ...F.body, fontSize:13, fontWeight:700, color:P.p600, background:'none', border:'none', cursor:'pointer', padding:'10px 0' }}>+ Add note</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsScreen() {
  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Reports" sub="U12 A · Season 2025–26"
        actions={<>
          <Btn label="Export CSV" variant="ghost" size="sm" icon="↓" />
          <Btn label="Export PDF" variant="primary" size="sm" icon="📄" />
        </>}
      />
      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard label="Season sessions"    value="34"  sub="Aug '25 – May '26" color={P.p600} />
          <StatCard label="Avg attendance"     value="82%" sub="↑ 4% vs last season" color={P.green} />
          <StatCard label="Drills run"         value="142" sub="22 unique drills" color={P.sky} />
          <StatCard label="Challenge completions" value="94%" sub="18 active players" color={P.orange} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>
          {/* Monthly attendance */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:20 }}>Monthly Attendance</div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', height:120 }}>
              {[['Sep',88],['Oct',82],['Nov',79],['Dec',70],['Jan',76],['Feb',84],['Mar',88],['Apr',91],['May',85],['Aug',82]].map(([m,v])=>(
                <div key={m} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:'100%', borderRadius:4, background:`linear-gradient(to top,${P.p600},${P.p400})`, height:`${(v as number)/100*100}px`, transition:'height .4s' }} />
                  <span style={{ ...F.mono, fontSize:9, color:P.muted }}>{m}</span>
                  <span style={{ ...F.mono, fontSize:9, fontWeight:700, color:P.p600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Top performers */}
          <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Top Performers</div>
            {PLAYERS.sort((a,b)=>b.avg-a.avg).slice(0,6).map((pl,i)=>(
              <div key={pl.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${P.line}` }}>
                <span style={{ ...F.mono, fontSize:11, fontWeight:700, color: i<3?P.p600:P.muted, width:16 }}>#{i+1}</span>
                <Avatar name={pl.name} size={28} />
                <div style={{ flex:1 }}>
                  <div style={{ ...F.body, fontSize:12, fontWeight:700, color:P.ink }}>{pl.name}</div>
                  <div style={{ height:4, background:P.line, borderRadius:2, marginTop:3, overflow:'hidden' }}>
                    <div style={{ width:`${pl.avg}%`, height:'100%', background:i<3?P.p600:P.line.replace('#dfe7ef','#b0bec5'), borderRadius:2 }} />
                  </div>
                </div>
                <span style={{ ...F.mono, fontSize:12, fontWeight:800, color:P.ink }}>{pl.avg}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* Drill usage */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'20px 24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Drill Usage — All Time</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['Hand Pass Relay',28,'Passing'],['Solo & Kick',24,'Solo'],['Diamond Warm-up',22,'Warm-up'],['3v3 Small Sided',18,'Game'],['Catch & Kick',16,'Kicking'],['2v1 Attack',14,'Game Skills']].map(([name,count,cat])=>(
              <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:`1px solid ${P.line}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ ...F.body, fontSize:13, fontWeight:600, color:P.ink }}>{name}</div>
                  <div style={{ height:4, background:P.line, borderRadius:2, marginTop:4, overflow:'hidden' }}>
                    <div style={{ width:`${(count as number)/28*100}%`, height:'100%', background:P.p600, borderRadius:2 }} />
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ ...F.mono, fontSize:13, fontWeight:800, color:P.ink }}>{count}×</div>
                  <Badge label={cat as string} color={P.p600} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Planner ──────────────────────────────────────────────────────────────────
function PlannerScreen() {
  const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May']
  const [activeMonth, setActiveMonth] = useState('Aug')

  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Season Planner" sub="2025–26 · U12 A"
        actions={<>
          <Btn label="+ Add session" variant="primary" size="sm" />
          <Btn label="Team settings" variant="ghost" size="sm" icon="⚙" />
        </>}
      />
      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Month strip */}
        <div style={{ display:'flex', gap:8, background:P.white, borderRadius:16, border:`1px solid ${P.line}`, padding:8, boxShadow:Sh.card }}>
          {months.map(m=>(
            <button key={m} onClick={()=>setActiveMonth(m)} style={{
              flex:1, height:38, borderRadius:10, border:'none', cursor:'pointer',
              background: activeMonth===m ? P.p600 : 'transparent',
              color: activeMonth===m ? P.white : P.muted,
              ...F.body, fontSize:12, fontWeight: activeMonth===m ? 800 : 500,
              transition:'background .15s',
            }}>{m}</button>
          ))}
        </div>
        {/* Phase cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {[
            { phase:'Pre-Season',  color:P.orange, months:'Aug–Sep', goal:'Fitness base + skill refresh', sessions:8  },
            { phase:'In-Season',   color:P.p600,   months:'Oct–Mar', goal:'Match-focused sessions',        sessions:22 },
            { phase:'Post-Season', color:P.green,  months:'Apr–May', goal:'Review + next year planning',   sessions:4  },
          ].map(ph=>(
            <div key={ph.phase} style={{ background:P.white, borderRadius:16, border:`1px solid ${P.line}`, padding:'18px 20px', borderTop:`3px solid ${ph.color}`, boxShadow:Sh.card }}>
              <div style={{ ...F.display, fontSize:16, fontWeight:900, color:P.ink, marginBottom:4 }}>{ph.phase}</div>
              <div style={{ ...F.body, fontSize:12, color:P.muted, marginBottom:12 }}>{ph.months}</div>
              <div style={{ ...F.body, fontSize:13, color:P.ink, marginBottom:12 }}>{ph.goal}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Badge label={`${ph.sessions} sessions`} color={ph.color} />
                <Btn label="View" variant="ghost" size="sm" />
              </div>
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, overflow:'hidden', boxShadow:Sh.card }}>
          <div style={{ padding:'16px 24px', borderBottom:`1px solid ${P.line}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink }}>August 2026</div>
            <div style={{ display:'flex', gap:6 }}>
              {['◀','▶'].map(c=><button key={c} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${P.line}`, background:'transparent', cursor:'pointer', ...F.body, fontSize:14, color:P.muted }}>{c}</button>)}
            </div>
          </div>
          <div style={{ padding:'16px 24px' }}>
            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
                <div key={d} style={{ ...F.body, fontSize:11, fontWeight:700, color:P.muted, textAlign:'center', textTransform:'uppercase', letterSpacing:'0.08em' }}>{d}</div>
              ))}
            </div>
            {/* Days */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {/* Week 1 offset */}
              {[null,null,null,null,1,2,3].map((d,i)=>(
                <div key={i} style={{ height:56, borderRadius:10, background:!d?'transparent':P.soft, display:'flex', flexDirection:'column', padding:'6px 8px', border: d?`1px solid ${P.line}`:'none' }}>
                  {d && <span style={{ ...F.mono, fontSize:12, fontWeight:700, color:P.muted }}>{d}</span>}
                </div>
              ))}
              {[4,5,6,7,8,9,10].map(d=>{
                const sessions = d===5?['16:30 Passing & Movement']:d===7?['17:00 Kicking Accuracy']:d===9?['10:00 Match Practice']:[]
                return (
                  <div key={d} style={{ height:56, borderRadius:10, background: sessions.length?`${P.p50}`:P.soft, border:`1px solid ${sessions.length?P.p200:P.line}`, padding:'4px 6px' }}>
                    <span style={{ ...F.mono, fontSize:11, fontWeight:700, color: sessions.length?P.p600:P.muted }}>{d}</span>
                    {sessions.map(s=>(
                      <div key={s} style={{ background:P.p600, borderRadius:4, padding:'1px 5px', marginTop:2 }}>
                        <span style={{ ...F.body, fontSize:8, fontWeight:700, color:P.white, display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS
// ════════════════════════════════════════════════════════════════════════════

const MOBILE_SCREENS_DEF = [
  { id:'m-today',        label:'Today',       icon:'◎' },
  { id:'m-pitch',        label:'Pitch',        icon:'✓' },
  { id:'m-timer',        label:'Timer',        icon:'◷' },
  { id:'m-messages',     label:'Messages',     icon:'💬' },
  { id:'m-notes',        label:'Notes',        icon:'📝' },
  { id:'m-availability', label:'Availability', icon:'◐' },
]

function MobileShell({ active, onNav, children }: { active:string; onNav:(s:string)=>void; children:React.ReactNode }) {
  const bottom5 = MOBILE_SCREENS_DEF.slice(0,5)
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:P.soft, ...F.body, fontSize:14, overflow:'hidden' }}>
      <div style={{ flex:1, overflow:'auto' }}>{children}</div>
      <div style={{ background:P.white, borderTop:`1px solid ${P.line}`, display:'flex', padding:'6px 0 16px', flexShrink:0 }}>
        {bottom5.map(item=>{
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={()=>onNav(item.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
              <div style={{ width:36, height:36, borderRadius:12, background:isActive?P.p50:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, transition:'background .15s' }}>
                <span style={{ color: isActive?P.p600:P.muted }}>{item.icon}</span>
              </div>
              <span style={{ ...F.body, fontSize:10, fontWeight: isActive?800:500, color: isActive?P.p600:P.muted }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mobile Today ─────────────────────────────────────────────────────────────
function MobileToday({ onNav }: { onNav:(s:string)=>void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
      {/* Status bar */}
      <div style={{ background:P.navy, padding:'28px 18px 0', display:'flex', justifyContent:'space-between' }}>
        <span style={{ ...F.mono, fontSize:12, color:P.white, fontWeight:700 }}>9:41</span>
        <div style={{ display:'flex', gap:6 }}>{['▪▪▪','🔋'].map(i=><span key={i} style={{ fontSize:10, color:P.white }}>{i}</span>)}</div>
      </div>
      {/* Header */}
      <div style={{ background:P.navy, padding:'8px 18px 18px' }}>
        <div style={{ ...F.body, fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:2 }}>Good morning</div>
        <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Coach Murphy</div>
      </div>
      <div style={{ padding:'16px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Today card */}
        <div style={{ background:`linear-gradient(135deg,${P.p800},${P.p600})`, borderRadius:20, padding:'18px', boxShadow:Sh.purple }}>
          <div style={{ ...F.body, fontSize:11, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Today · Tue 5 Aug</div>
          <div style={{ ...F.display, fontSize:20, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Passing & Movement</div>
          <div style={{ ...F.body, fontSize:13, color:'rgba(255,255,255,.7)', marginTop:4 }}>U12 A · 16:30 · Pitch 2 · 75 min</div>
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={()=>onNav('m-pitch')} style={{ flex:1, height:44, background:P.white, borderRadius:12, border:'none', cursor:'pointer', ...F.body, fontSize:13, fontWeight:800, color:P.p600 }}>Take Attendance</button>
            <button onClick={()=>onNav('m-timer')} style={{ flex:1, height:44, background:'rgba(255,255,255,.15)', borderRadius:12, border:'none', cursor:'pointer', ...F.body, fontSize:13, fontWeight:800, color:P.white }}>▶ Start Timer</button>
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ background:P.white, borderRadius:16, padding:'14px 16px', border:`1px solid ${P.line}`, boxShadow:Sh.card }}>
            <div style={{ ...F.display, fontSize:28, fontWeight:900, color:P.p600, letterSpacing:'-0.05em' }}>18</div>
            <div style={{ ...F.body, fontSize:12, color:P.muted }}>Players confirmed</div>
          </div>
          <div style={{ background:P.white, borderRadius:16, padding:'14px 16px', border:`1px solid ${P.line}`, boxShadow:Sh.card }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Ring pct={82} size={40} stroke={4} color={P.p600} label="82%" />
              <div>
                <div style={{ ...F.body, fontSize:11, color:P.muted, lineHeight:1.3 }}>Attendance<br/>this month</div>
              </div>
            </div>
          </div>
        </div>
        {/* Session drills */}
        <div style={{ background:P.white, borderRadius:16, border:`1px solid ${P.line}`, overflow:'hidden', boxShadow:Sh.card }}>
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${P.line}`, ...F.display, fontSize:14, fontWeight:900, color:P.ink }}>Today's Drills</div>
          {[['Diamond Warm-up',10,'Warm-up'],['Hand Pass Relay',6,'Passing'],['Solo & Kick',10,'Solo'],['2v1 Attack',12,'Game Skills'],['3v3 Small Sided',15,'Game']].map(([name,dur,cat],i)=>(
            <div key={name as string} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i<4?`1px solid ${P.line}`:'none' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:P.p50, ...F.display, fontSize:10, fontWeight:900, color:P.p600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
              <span style={{ ...F.body, fontSize:13, fontWeight:600, color:P.ink, flex:1 }}>{name}</span>
              <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{dur}m</span>
            </div>
          ))}
        </div>
        {/* Notes widget */}
        <div style={{ background:P.white, borderRadius:16, border:`1px solid ${P.line}`, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:Sh.card, cursor:'pointer' }} onClick={()=>onNav('m-notes')}>
          <div style={{ width:36, height:36, borderRadius:10, background:P.p50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📝</div>
          <div style={{ flex:1 }}>
            <div style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink }}>Quick Notes</div>
            <div style={{ ...F.body, fontSize:11, color:P.muted }}>Last note: 2 Aug</div>
          </div>
          <span style={{ color:P.muted, fontSize:16 }}>›</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Pitch Mode (Sideline Attendance) ──────────────────────────────────
function MobilePitchMode() {
  const [attendance, setAttendance] = useState<Record<number,boolean|null>>(
    Object.fromEntries(PLAYERS.map(p=>[p.id, null]))
  )
  const present = Object.values(attendance).filter(v=>v===true).length
  const absent  = Object.values(attendance).filter(v=>v===false).length

  const toggle = (id:number) => setAttendance(a=>({...a,[id]: a[id]===null?true:a[id]===true?false:null}))

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:'#0a0a0f' }}>
      {/* Header */}
      <div style={{ background:'#0e0e14', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'28px 18px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ ...F.body, fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Pitch Mode · Tue 5 Aug</div>
            <div style={{ ...F.display, fontSize:20, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Attendance</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ ...F.display, fontSize:28, fontWeight:900, color:P.p300, letterSpacing:'-0.05em' }}>{present}<span style={{ color:'rgba(255,255,255,.3)', fontSize:18 }}>/{PLAYERS.length}</span></div>
            <div style={{ ...F.body, fontSize:11, color:'rgba(255,255,255,.4)' }}>present</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop:12, height:4, background:'rgba(255,255,255,.08)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${(present/PLAYERS.length)*100}%`, height:'100%', background:P.p400, borderRadius:2, transition:'width .2s' }} />
        </div>
        <div style={{ display:'flex', gap:16, marginTop:8 }}>
          <span style={{ ...F.body, fontSize:12, color:P.green }}>✓ {present} present</span>
          <span style={{ ...F.body, fontSize:12, color:P.coral }}>✕ {absent} absent</span>
          <span style={{ ...F.body, fontSize:12, color:'rgba(255,255,255,.35)' }}>? {PLAYERS.length-present-absent} unknown</span>
        </div>
      </div>
      {/* Player grid — big tap targets */}
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {PLAYERS.map(pl=>{
          const s = attendance[pl.id]
          const bg = s===true?`${P.green}25`:s===false?`${P.coral}18`:'rgba(255,255,255,.04)'
          const border = s===true?`${P.green}50`:s===false?`${P.coral}40`:'rgba(255,255,255,.08)'
          return (
            <button key={pl.id} onClick={()=>toggle(pl.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, background:bg, border:`1.5px solid ${border}`, cursor:'pointer', textAlign:'left', transition:'all .12s' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', ...F.display, fontSize:14, fontWeight:900, color: s===true?P.green:s===false?P.coral:'rgba(255,255,255,.5)', flexShrink:0 }}>
                {s===true?'✓':s===false?'✕':pl.name[0]}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ ...F.body, fontSize:12, fontWeight:700, color: s===true?P.white:s===false?'rgba(255,255,255,.4)':'rgba(255,255,255,.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pl.name.split(' ')[0]}</div>
                <div style={{ ...F.body, fontSize:10, color:'rgba(255,255,255,.3)' }}>#{pl.number} · {pl.pos}</div>
              </div>
            </button>
          )
        })}
      </div>
      {/* Save bar */}
      <div style={{ padding:'12px 16px 0', background:'#0e0e14', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <button style={{ width:'100%', height:52, background:P.p600, borderRadius:14, border:'none', cursor:'pointer', ...F.body, fontSize:15, fontWeight:800, color:P.white, boxShadow:Sh.purple }}>
          Save Attendance
        </button>
      </div>
    </div>
  )
}

// ─── Mobile Session Timer ─────────────────────────────────────────────────────
function MobileTimer() {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState(0)
  const phases = [{ label:'Warm-up', dur:600, color:P.orange }, { label:'Main Work', dur:3000, color:P.p600 }, { label:'Cool-down', dur:900, color:P.green }]
  const cur = phases[phase]

  useEffect(()=>{
    if (!running) return
    const t = setInterval(()=>setSeconds(s=>{ if (s>=cur.dur) { setPhase(p=>Math.min(p+1,phases.length-1)); return 0 } return s+1 }), 1000)
    return ()=>clearInterval(t)
  }, [running, phase])

  const pct = (seconds/cur.dur)*100
  const fmt = (s:number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const remaining = cur.dur - seconds

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:P.aiDark, alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      {/* Phase pills */}
      <div style={{ display:'flex', gap:8, marginBottom:40 }}>
        {phases.map((ph,i)=>(
          <button key={ph.label} onClick={()=>{setPhase(i);setSeconds(0)}} style={{ height:28, padding:'0 12px', borderRadius:999, border:'none', cursor:'pointer', background: phase===i?ph.color:`rgba(255,255,255,.06)`, color: phase===i?P.white:'rgba(255,255,255,.4)', ...F.body, fontSize:11, fontWeight:700, transition:'all .15s' }}>{ph.label}</button>
        ))}
      </div>
      {/* Big ring timer */}
      <div style={{ position:'relative', width:240, height:240, marginBottom:36 }}>
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="12" />
          <circle cx="120" cy="120" r="104" fill="none" stroke={cur.color} strokeWidth="12"
            strokeDasharray={`${2*Math.PI*104*pct/100} ${2*Math.PI*104}`} strokeLinecap="round" style={{ transition:'stroke-dasharray .5s' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ ...F.mono, fontSize:52, fontWeight:700, color:P.white, letterSpacing:'-0.04em', lineHeight:1 }}>{fmt(seconds)}</div>
          <div style={{ ...F.body, fontSize:13, color:'rgba(255,255,255,.5)', marginTop:4 }}>{fmt(remaining)} left</div>
          <div style={{ ...F.body, fontSize:12, fontWeight:700, color:cur.color, marginTop:8 }}>{cur.label}</div>
        </div>
      </div>
      {/* Controls */}
      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
        <button onClick={()=>{setSeconds(0)}} style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,.06)', border:'none', cursor:'pointer', fontSize:18, color:'rgba(255,255,255,.6)' }}>↺</button>
        <button onClick={()=>setRunning(r=>!r)} style={{ width:80, height:80, borderRadius:24, background:cur.color, border:'none', cursor:'pointer', fontSize:30, color:P.white, boxShadow:Sh.purple, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {running?'⏸':'▶'}
        </button>
        <button onClick={()=>{setPhase(p=>Math.min(p+1,phases.length-1));setSeconds(0)}} style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,.06)', border:'none', cursor:'pointer', fontSize:18, color:'rgba(255,255,255,.6)' }}>⏭</button>
      </div>
      {/* Session info */}
      <div style={{ marginTop:36, background:'rgba(255,255,255,.04)', borderRadius:16, padding:'14px 20px', width:'100%', border:'1px solid rgba(255,255,255,.06)', textAlign:'center' }}>
        <div style={{ ...F.body, fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:4 }}>Passing & Movement · U12 A</div>
        <div style={{ ...F.display, fontSize:14, fontWeight:800, color:'rgba(255,255,255,.7)' }}>5 drills remaining · 53 min total</div>
      </div>
    </div>
  )
}

// ─── Mobile Messages ──────────────────────────────────────────────────────────
function MobileMessages() {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
      <div style={{ background:P.navy, padding:'28px 18px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Messages</div>
        <span style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:P.white }}>✎</span>
      </div>
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:2 }}>
        {[
          { name:'Club Secretary',    preview:'AGM notice for all coaches — please confirm attendance',  time:'10:22', unread:2, avatar:'CS' },
          { name:'St. Finbarr\'s GAA', preview:'Training confirmed for Thursday 7 Aug at 17:00',           time:'09:15', unread:0, avatar:'SF' },
          { name:'Niamh Ní Bhriain', preview:'Coach, I might be 10 mins late Thursday — lifts',          time:'Tue',   unread:1, avatar:'NB' },
          { name:'Ciarán O\'M parent', preview:'He\'ll miss training Sat — family trip',                  time:'Mon',   unread:0, avatar:'CM' },
          { name:'Fitness Committee', preview:'New warm-up protocol attached for review',                   time:'Sat',   unread:0, avatar:'FC' },
        ].map(msg=>(
          <div key={msg.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 4px', borderBottom:`1px solid ${P.line}`, cursor:'pointer' }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`${P.p600}20`, display:'flex', alignItems:'center', justifyContent:'center', ...F.display, fontSize:15, fontWeight:900, color:P.p600, flexShrink:0 }}>{msg.avatar}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ ...F.body, fontSize:14, fontWeight: msg.unread>0?800:600, color:P.ink }}>{msg.name}</span>
                <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{msg.time}</span>
              </div>
              <div style={{ ...F.body, fontSize:13, color:P.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{msg.preview}</div>
            </div>
            {msg.unread > 0 && <div style={{ width:20, height:20, borderRadius:10, background:P.p600, ...F.body, fontSize:11, fontWeight:800, color:P.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{msg.unread}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile Quick Notes ───────────────────────────────────────────────────────
function MobileNotes() {
  const [notes, setNotes] = useState([
    { id:1, text:'Niamh — great movement, consider captain for next blitz', date:'2 Aug', pinned:true },
    { id:2, text:'Check if Seán needs support — quieter than usual today', date:'29 Jul', pinned:false },
    { id:3, text:'Request extra cones from the groundsman for Thu session', date:'27 Jul', pinned:false },
  ])
  const [newNote, setNewNote] = useState('')

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
      <div style={{ background:P.navy, padding:'28px 18px 14px' }}>
        <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Quick Notes</div>
        <div style={{ ...F.body, fontSize:12, color:'rgba(255,255,255,.4)', marginTop:2 }}>3 notes</div>
      </div>
      <div style={{ padding:'14px 14px', background:P.white, borderBottom:`1px solid ${P.line}` }}>
        <div style={{ display:'flex', gap:10 }}>
          <input value={newNote} onChange={e=>setNewNote(e.target.value)}
            placeholder="Jot a note…"
            style={{ flex:1, height:44, padding:'0 14px', borderRadius:12, border:`1.5px solid ${P.line}`, background:P.soft, ...F.body, fontSize:14, color:P.ink, outline:'none' }} />
          <button onClick={()=>{ if(!newNote.trim())return; setNotes(n=>[{ id:Date.now(), text:newNote, date:'5 Aug', pinned:false },...n]); setNewNote('') }}
            style={{ width:44, height:44, borderRadius:12, background:P.p600, border:'none', cursor:'pointer', color:P.white, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
        </div>
      </div>
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        {notes.map(note=>(
          <div key={note.id} style={{ background:P.white, borderRadius:16, border:`1px solid ${P.line}`, padding:'14px 16px', boxShadow:Sh.card, borderLeft:`4px solid ${note.pinned?P.p600:P.line}` }}>
            <div style={{ ...F.body, fontSize:14, color:P.ink, lineHeight:1.6, marginBottom:8 }}>{note.text}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ ...F.mono, fontSize:11, color:P.muted }}>{note.date}</span>
              {note.pinned && <Badge label="Pinned" color={P.p600} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile Availability ──────────────────────────────────────────────────────
function MobileAvailability() {
  const [availability, setAvailability] = useState<Record<number, boolean|null>>(
    Object.fromEntries(PLAYERS.map(p=>[p.id, p.avail]))
  )

  const confirmed  = Object.values(availability).filter(v=>v===true).length
  const unavailable = Object.values(availability).filter(v=>v===false).length

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
      <div style={{ background:P.navy, padding:'28px 18px 14px' }}>
        <div style={{ ...F.body, fontSize:12, color:'rgba(255,255,255,.4)' }}>Session · Thu 7 Aug · 17:00</div>
        <div style={{ ...F.display, fontSize:22, fontWeight:900, color:P.white, letterSpacing:'-0.03em' }}>Availability</div>
        <div style={{ display:'flex', gap:16, marginTop:8 }}>
          <span style={{ ...F.body, fontSize:13, color:P.green, fontWeight:700 }}>✓ {confirmed}</span>
          <span style={{ ...F.body, fontSize:13, color:P.coral, fontWeight:700 }}>✕ {unavailable}</span>
          <span style={{ ...F.body, fontSize:13, color:'rgba(255,255,255,.4)' }}>? {PLAYERS.length-confirmed-unavailable}</span>
        </div>
      </div>
      {/* Send reminder */}
      <div style={{ padding:'12px 14px', background:P.white, borderBottom:`1px solid ${P.line}`, display:'flex', gap:10 }}>
        <Btn label="Send reminder to all" variant="secondary" size="sm" style={{ flex:1, justifyContent:'center' }} />
        <Btn label="Request availability" variant="primary" size="sm" style={{ flex:1, justifyContent:'center' }} />
      </div>
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
        {PLAYERS.map(pl=>{
          const s = availability[pl.id]
          return (
            <div key={pl.id} style={{ background:P.white, borderRadius:14, border:`1px solid ${P.line}`, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:Sh.card }}>
              <Avatar name={pl.name} size={34} />
              <div style={{ flex:1 }}>
                <div style={{ ...F.body, fontSize:13, fontWeight:700, color:P.ink }}>{pl.name}</div>
                <div style={{ ...F.body, fontSize:11, color:P.muted }}>{pl.pos} · #{pl.number}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {([true, false, null] as const).map(val=>(
                  <button key={String(val)} onClick={()=>setAvailability(a=>({...a,[pl.id]:val}))}
                    style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${s===val?(val===true?P.green:val===false?P.coral:P.orange):P.line}`, background: s===val?(val===true?`${P.green}20`:val===false?`${P.coral}15`:`${P.orange}15`):'transparent', cursor:'pointer', fontSize:16, color: s===val?(val===true?P.green:val===false?P.coral:P.orange):P.muted }}>
                    {val===true?'✓':val===false?'✕':'?'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Component Library ────────────────────────────────────────────────────────
function ComponentLibraryScreen() {
  return (
    <div style={{ flex:1, overflow:'auto', background:P.soft }}>
      <TopBar title="Component Library" sub="Spraoi Coach · Purple · Design system" />
      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 }}>
        {/* Mascots */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:4 }}>Mascots</div>
          <div style={{ ...F.body, fontSize:12, color:P.muted, marginBottom:20 }}>Only in: onboarding · success · achievements · empty states</div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:280 }}>
              <img src={shellySrc} alt="Shelly the Sheep — pose reference sheet" style={{ width:'100%', maxWidth:480, height:'auto', borderRadius:14, border:`1px solid ${P.line}` }} />
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                {['Standing','Running','Passing','Solo Run','Kicking','Hurley','Carrying','Scooping'].map(p=>(
                  <span key={p} style={{ background:P.p50, border:`1px solid ${P.p200}`, borderRadius:6, padding:'3px 9px', ...F.mono, fontSize:10, color:P.p600 }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:180 }}>
              <div style={{ background:P.p50, borderRadius:14, border:`1px solid ${P.p200}`, padding:'16px', display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ ...F.display, fontSize:13, fontWeight:900, color:P.p700 }}>Shelly the Sheep</div>
                <div style={{ ...F.body, fontSize:12, color:P.muted }}>Coach module mascot</div>
                <div style={{ ...F.body, fontSize:12, color:P.sub, marginTop:6 }}>Kind · Focused · Resilient</div>
              </div>
              <div style={{ background:P.p50, borderRadius:14, border:`2px dashed ${P.p200}`, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ ...F.display, fontSize:12, fontWeight:800, color:P.muted }}>Allowed in</div>
                <div style={{ ...F.body, fontSize:11, color:P.sub }}>Onboarding · Success<br/>Achievements · Empty states</div>
                <div style={{ ...F.display, fontSize:12, fontWeight:800, color:P.p600, marginTop:6 }}>Not in regular screens</div>
              </div>
            </div>
          </div>
        </div>
        {/* Buttons */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:20 }}>Buttons</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <Btn label="Primary" variant="primary" size="lg" />
            <Btn label="Primary" variant="primary" size="md" />
            <Btn label="Primary" variant="primary" size="sm" />
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <Btn label="Secondary" variant="secondary" size="lg" />
            <Btn label="Secondary" variant="secondary" size="md" />
            <Btn label="Secondary" variant="secondary" size="sm" />
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <Btn label="Ghost" variant="ghost" size="lg" />
            <Btn label="Danger" variant="danger" size="md" />
            <Btn label="With icon" variant="primary" size="md" icon="+" />
            <Btn label="Take Attendance" variant="primary" size="md" icon="✓" />
          </div>
        </div>
        {/* Badges */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Badges & Labels</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Badge label="In Season" color={P.p600} />
            <Badge label="Pilot" color={P.green} />
            <Badge label="Coming Soon" color={P.orange} />
            <Badge label="Absent" color={P.coral} />
            <Badge label="Beginner" color={P.green} />
            <Badge label="Intermediate" color={P.orange} />
            <Badge label="Advanced" color={P.coral} />
            <Badge label="AI Suggestion" color={P.p600} />
          </div>
        </div>
        {/* Colors */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Coach Purple Ramp</div>
          <div style={{ display:'flex', gap:6 }}>
            {[['p900',P.p900],['p800',P.p800],['p700',P.p700],['p600',P.p600,'primary'],['p500',P.p500],['p400',P.p400],['p300',P.p300],['p200',P.p200],['p100',P.p100],['p50',P.p50]].map(([name,color,note])=>(
              <div key={name} style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ height:48, borderRadius:10, background:color as string, border:`1px solid rgba(0,0,0,.06)` }} />
                <div style={{ ...F.mono, fontSize:9, color:P.muted, textAlign:'center' }}>{name}</div>
                {note && <div style={{ ...F.body, fontSize:9, color:P.p600, textAlign:'center', fontWeight:700 }}>primary</div>}
              </div>
            ))}
          </div>
        </div>
        {/* Stat cards */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Stat Cards</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            <StatCard label="Attendance" value="84%" sub="↑ 6% vs last month" color={P.p600} icon="◉" />
            <StatCard label="Present" value="18" sub="of 22 squad" color={P.green} />
            <StatCard label="Absent" value="3" sub="marked absent" color={P.coral} />
            <StatCard label="Sessions" value="34" sub="this season" color={P.orange} icon="◈" />
          </div>
        </div>
        {/* Rings */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:16 }}>Progress Rings</div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'center' }}>
            {[[82,P.p600,'82%',64],[65,P.green,'65%',52],[44,P.coral,'44%',40],[95,P.orange,'95%',36]].map(([pct,c,l,s])=>(
              <div key={l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <Ring pct={pct as number} color={c as string} label={l as string} size={s as number} stroke={6} />
                <span style={{ ...F.mono, fontSize:10, color:P.muted }}>{s}px</span>
              </div>
            ))}
          </div>
        </div>
        {/* Typography */}
        <div style={{ background:P.white, borderRadius:20, border:`1px solid ${P.line}`, padding:'24px', boxShadow:Sh.card }}>
          <div style={{ ...F.display, fontSize:15, fontWeight:900, color:P.ink, marginBottom:20 }}>Typography</div>
          {([
            { label:'Display H1', style:{ ...F.display, fontSize:40, fontWeight:900, color:P.ink, letterSpacing:'-0.05em' } as React.CSSProperties, text:'Spraoi Coach' },
            { label:'Display H2', style:{ ...F.display, fontSize:28, fontWeight:900, color:P.ink, letterSpacing:'-0.04em' } as React.CSSProperties, text:'Session Builder' },
            { label:'Display H3', style:{ ...F.display, fontSize:20, fontWeight:900, color:P.ink, letterSpacing:'-0.03em' } as React.CSSProperties, text:'Passing & Movement' },
            { label:'Body / 15', style:{ ...F.body, fontSize:15, color:P.ink, lineHeight:1.65 } as React.CSSProperties, text:"Volunteer coaches need tools that are fast, simple, and built for real conditions." },
            { label:'Body / 13', style:{ ...F.body, fontSize:13, color:P.muted, lineHeight:1.65 } as React.CSSProperties, text:"Tuesday 5 August 2026 · U12 A · St. Finbarr's GAA · 22 players" },
            { label:'Mono / 12', style:{ ...F.mono, fontSize:12, color:P.p600 } as React.CSSProperties, text:'09:41 · 16:30 · 84% · +80 XP' },
          ]).map(({ label, style, text })=>(
            <div key={label} style={{ padding:'14px 0', borderBottom:`1px solid ${P.line}` }}>
              <div style={{ ...F.mono, fontSize:10, color:P.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</div>
              <div style={style}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════

const DESKTOP_SCREENS = ['dashboard','planner','sessions','attendance','players','ai','reports','components']
const MOBILE_SCREENS  = ['m-today','m-pitch','m-timer','m-messages','m-notes','m-availability']

export default function Coach() {
  const [mode, setMode]         = useState<'desktop'|'mobile'>('desktop')
  const [screen, setScreen]     = useState('dashboard')
  const [mScreen, setMScreen]   = useState('m-today')
  const [collapsed, setCollapsed] = useState(false)

  function handleNav(s: string) {
    if (MOBILE_SCREENS.includes(s)) { setMScreen(s); setMode('mobile') }
    else if (DESKTOP_SCREENS.includes(s)) { setScreen(s); setMode('desktop') }
  }

  const renderDesktopScreen = () => {
    switch (screen) {
      case 'dashboard':  return <DashboardScreen onNav={handleNav} />
      case 'planner':    return <PlannerScreen />
      case 'sessions':   return <SessionBuilderScreen />
      case 'attendance': return <AttendanceScreen />
      case 'players':    return <PlayerProfileScreen onNav={handleNav} />
      case 'ai':         return <AICoachScreen />
      case 'reports':    return <ReportsScreen />
      case 'components': return <ComponentLibraryScreen />
      default:           return <DashboardScreen onNav={handleNav} />
    }
  }

  const renderMobileScreen = () => {
    switch (mScreen) {
      case 'm-today':        return <MobileToday onNav={setMScreen} />
      case 'm-pitch':        return <MobilePitchMode />
      case 'm-timer':        return <MobileTimer />
      case 'm-messages':     return <MobileMessages />
      case 'm-notes':        return <MobileNotes />
      case 'm-availability': return <MobileAvailability />
      default:               return <MobileToday onNav={setMScreen} />
    }
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', ...F.body }}>
      {/* Meta bar — demo nav */}
      <div style={{ background:P.p900, borderBottom:`1px solid rgba(255,255,255,.08)`, padding:'0 20px', height:44, display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
        <div style={{ ...F.display, fontSize:13, fontWeight:900, color:P.white, letterSpacing:'-0.02em', marginRight:8 }}>Spraoi Coach</div>
        {/* Mode toggle */}
        <div style={{ display:'flex', background:'rgba(255,255,255,.08)', borderRadius:8, padding:3, gap:2 }}>
          {(['desktop','mobile'] as const).map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ height:28, padding:'0 14px', borderRadius:6, border:'none', cursor:'pointer', background: mode===m?P.white:'transparent', color: mode===m?P.p900:'rgba(255,255,255,.5)', ...F.body, fontSize:11, fontWeight:700, transition:'all .15s' }}>
              {m==='desktop'?'🖥 Desktop':'📱 Mobile'}
            </button>
          ))}
        </div>
        {/* Screen picker */}
        <div style={{ display:'flex', gap:4, flex:1, overflow:'auto' }}>
          {(mode==='desktop'
            ? [['dashboard','Dashboard'],['planner','Planner'],['sessions','Session Builder'],['attendance','Attendance'],['players','Player Profile'],['ai','AI Coach'],['reports','Reports'],['components','Components']]
            : [['m-today','Today'],['m-pitch','Pitch Mode'],['m-timer','Timer'],['m-messages','Messages'],['m-notes','Notes'],['m-availability','Availability']]
          ).map(([id,label])=>(
            <button key={id} onClick={()=>mode==='desktop'?setScreen(id):setMScreen(id)}
              style={{ height:28, padding:'0 10px', borderRadius:6, border:'none', cursor:'pointer', background: (mode==='desktop'?screen:mScreen)===id?`${P.p600}80`:'transparent', color: (mode==='desktop'?screen:mScreen)===id?P.white:'rgba(255,255,255,.45)', ...F.body, fontSize:11, fontWeight:600, whiteSpace:'nowrap', transition:'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Main viewport */}
      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>
        {mode === 'desktop' ? (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            <Sidebar active={screen} onNav={setScreen} collapsed={collapsed} onToggle={()=>setCollapsed(c=>!c)} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {renderDesktopScreen()}
            </div>
          </div>
        ) : (
          /* Mobile device frame */
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg, ${P.p900}, ${P.aiBg})`, padding:'24px' }}>
            <div style={{
              width:393, height:'100%', maxHeight:852, borderRadius:44, border:'8px solid #1a1a1f',
              background:P.white, overflow:'hidden', position:'relative',
              boxShadow:'0 40px 80px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06)',
              display:'flex', flexDirection:'column',
            }}>
              <MobileShell active={mScreen} onNav={setMScreen}>
                {renderMobileScreen()}
              </MobileShell>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
