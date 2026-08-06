/**
 * Spraoi Club — Club Administration Platform
 *
 * Module colour: Red (#d32f2f)
 * Desktop-first. No mascots.
 * Audience: Club officers — Chairperson, Secretary, Treasurer, Registrar.
 */

import { useState } from 'react'
import spraioIcon from './imports/spraoi-icon.png'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const R = {
  r50:  '#ffebee', r100: '#ffcdd2', r200: '#ef9a9a', r300: '#e57373',
  r400: '#ef5350', r500: '#f44336', r600: '#e53935', r700: '#d32f2f',
  r800: '#c62828', r900: '#b71c1c',
  // Status
  green:  '#43a047', greenBg: '#e8f5e9',
  yellow: '#f9a825', yellowBg: '#fffde7',
  blue:   '#1565c0', blueBg: '#e3f2fd',
  orange: '#e65100', orangeBg: '#fff3e0',
  // Neutrals
  navy: '#0b2545', ink: '#13243b', sub: '#4a5e78', muted: '#627187',
  line: '#dfe7ef', soft: '#f6f9fc', cream: '#fffaf2', white: '#ffffff',
  // Shadows
  cardSh: '0 2px 12px rgba(0,0,0,.06)',
  redSh:  '0 8px 24px rgba(211,47,47,.24)',
}

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body:    { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono:    { fontFamily: "'JetBrains Mono', monospace" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const TEAMS = [
  { id:1,  name:"U8 Girls Football",   grade:'U8',  gender:'Girls', sport:'Football', coach:'Aoife Mac Cárthaigh', players:14, maxPlayers:18, nextEvent:'Sat 9 Aug — Training',   status:'active'  },
  { id:2,  name:"U10 Girls Football",  grade:'U10', gender:'Girls', sport:'Football', coach:'Saoirse de Paor',     players:16, maxPlayers:20, nextEvent:'Sat 9 Aug — Training',   status:'active'  },
  { id:3,  name:"U12 Girls Football",  grade:'U12', gender:'Girls', sport:'Football', coach:'Coach Murphy',        players:15, maxPlayers:20, nextEvent:'Thu 7 Aug — Training',   status:'active'  },
  { id:4,  name:"U12 Boys Hurling",    grade:'U12', gender:'Boys',  sport:'Hurling',  coach:'Coach Murphy',        players:18, maxPlayers:20, nextEvent:'Thu 7 Aug — Training',   status:'active'  },
  { id:5,  name:"U14 Girls Football",  grade:'U14', gender:'Girls', sport:'Football', coach:'Éabha Ní Mhurchú',   players:17, maxPlayers:20, nextEvent:'Mon 4 Aug — Training',   status:'active'  },
  { id:6,  name:"U14 Boys Hurling",    grade:'U14', gender:'Boys',  sport:'Hurling',  coach:'Fionn Ó Duibhir',   players:16, maxPlayers:20, nextEvent:'Mon 4 Aug — Training',   status:'active'  },
  { id:7,  name:"U16 Girls Football",  grade:'U16', gender:'Girls', sport:'Football', coach:'Caoimhe Ní Fhaoláin',players:14, maxPlayers:20, nextEvent:'Tue 5 Aug — Training',   status:'active'  },
  { id:8,  name:"Senior Women",        grade:'Senior', gender:'Women', sport:'Football', coach:'Rónán Ó Briain', players:24, maxPlayers:30, nextEvent:'Fri 8 Aug — Match',       status:'active'  },
  { id:9,  name:"Senior Men",          grade:'Senior', gender:'Men',   sport:'Football', coach:'Tomás Mac Cárthaigh', players:28, maxPlayers:30, nextEvent:'Sun 10 Aug — Match', status:'warning' },
]

const MEMBERS = [
  { id:'SF001', name:'Niamh Ní Bhriain',      team:'U12 Girls Football',  status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2022', dob:'2014-03-12' },
  { id:'SF002', name:'Ciarán Ó Murchú',        team:'U12 Boys Hurling',   status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2023', dob:'2014-07-22' },
  { id:'SF003', name:'Aoife de Búrca',         team:'U12 Girls Football',  status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2021', dob:'2013-11-05' },
  { id:'SF004', name:'Seán Mac Gearailt',      team:'U12 Boys Hurling',   status:'active',  fees:'pending', reg:'medical',  joined:'Sep 2024', dob:'2014-01-18' },
  { id:'SF005', name:'Caoimhe Ní Fhaoláin',   team:'U16 Girls Football',  status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2019', dob:'2010-09-30' },
  { id:'SF006', name:'Pádraig Ó Ceallaigh',   team:'U12 Boys Hurling',   status:'active',  fees:'pending', reg:'payment',  joined:'Sep 2024', dob:'2014-05-14' },
  { id:'SF007', name:'Éabha Ní Mhurchú',      team:'Senior Women',       status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2018', dob:'2005-02-28' },
  { id:'SF008', name:'Rónán Ó Briain',         team:'Senior Men',         status:'active',  fees:'pending', reg:'payment',  joined:'Sep 2024', dob:'2004-08-11' },
  { id:'SF009', name:'Saoirse de Paor',        team:'U10 Girls Football',  status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2023', dob:'2016-04-03' },
  { id:'SF010', name:'Tomás Mac Cárthaigh',   team:'Senior Men',         status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2020', dob:'2003-12-22' },
  { id:'SF011', name:'Mairéad Ní Cheallaigh', team:'Senior Women',       status:'inactive',fees:'overdue', reg:'complete', joined:'Sep 2019', dob:'2003-06-07' },
  { id:'SF012', name:'Fionn Ó Duibhir',       team:'U14 Boys Hurling',   status:'active',  fees:'paid',    reg:'complete', joined:'Sep 2022', dob:'2012-01-25' },
]

const REGISTRATIONS = [
  { id:'R2026-001', name:'Ciarán Ó Murchú',      team:'U12 Boys Hurling',  submitted:'28 Jul', fee:'€65', stage:'complete' },
  { id:'R2026-002', name:'Pádraig Ó Ceallaigh',  team:'U12 Boys Hurling',  submitted:'1 Aug',  fee:'€65', stage:'payment'  },
  { id:'R2026-003', name:'Seán Mac Gearailt',    team:'U12 Boys Hurling',  submitted:'2 Aug',  fee:'€65', stage:'medical'  },
  { id:'R2026-004', name:'Úna Ní Dhálaigh',      team:'U12 Girls Football',submitted:'2 Aug',  fee:'€65', stage:'payment'  },
  { id:'R2026-005', name:'Darragh Ó Briain',     team:'Senior Men',         submitted:'3 Aug',  fee:'€80', stage:'submitted'},
  { id:'R2026-006', name:'Sinéad de Búrca',      team:'U10 Girls Football', submitted:'3 Aug',  fee:'€55', stage:'submitted'},
  { id:'R2026-007', name:'Liam Ó Murchadha',    team:'U14 Boys Hurling',   submitted:'3 Aug',  fee:'€70', stage:'submitted'},
]

const SPONSORS = [
  { name:"Ó Murchú Building Services", tier:'Gold',   amount:3000, expires:'Dec 2026', logo:'🏗️', status:'active'  },
  { name:"SuperValu Swords",            tier:'Gold',   amount:2500, expires:'Dec 2026', logo:'🛒', status:'active'  },
  { name:"Murphy's Garage",             tier:'Silver', amount:2000, expires:'Dec 2026', logo:'🚗', status:'active'  },
  { name:"Lawless & Son Solicitors",   tier:'Silver', amount:2000, expires:'Jun 2026', logo:'⚖️', status:'expired' },
  { name:"Swords Dental Clinic",       tier:'Silver', amount:1500, expires:'Dec 2026', logo:'🦷', status:'active'  },
  { name:"K&N Printing",               tier:'Bronze', amount:1500, expires:'Dec 2026', logo:'🖨️', status:'active'  },
]

const FINANCE_MONTHLY = [
  { month:'Feb', income:4200, expense:3800 },
  { month:'Mar', income:6800, expense:4200 },
  { month:'Apr', income:5400, expense:3600 },
  { month:'May', income:4800, expense:4400 },
  { month:'Jun', income:5900, expense:5100 },
  { month:'Jul', income:4800, expense:4200 },
  { month:'Aug', income:3200, expense:2800 },
]

const INCOME_CATS = [
  { label:'Membership fees', amount:18400, color: R.r600  },
  { label:'Lotto',           amount: 8200, color: R.blue  },
  { label:'Sponsorship',     amount: 6500, color: R.green },
  { label:'Grant',           amount: 5000, color: R.yellow},
  { label:'Gate receipts',   amount: 3200, color: R.orange},
  { label:'Shop',            amount: 1400, color: R.muted },
]

const EXPENSE_CATS = [
  { label:'Pitch maintenance', amount:6200, color: R.r700  },
  { label:'Equipment',         amount:4800, color: R.r500  },
  { label:'Events',            amount:3400, color: R.blue  },
  { label:'Utilities',         amount:2800, color: R.orange},
  { label:'Insurance',         amount:3200, color: R.green },
  { label:'Training',          amount:2400, color: R.yellow},
  { label:'Travel',            amount:2100, color: R.muted },
  { label:'Administration',    amount:1800, color: R.r300  },
]

const RECENT_ACTIVITY = [
  { icon:'👤', text:'New registration: Darragh Ó Briain (Senior Men)',         time:'2m ago',   type:'reg'     },
  { icon:'💰', text:'Payment received: Pádraig Ó Ceallaigh — €65',            time:'18m ago',  type:'payment' },
  { icon:'📋', text:'Medical form completed: Seán Mac Gearailt',               time:'1h ago',   type:'medical' },
  { icon:'📢', text:'Broadcast sent: "Training CANCELLED Saturday"',           time:'2h ago',   type:'comms'   },
  { icon:'💰', text:'Lotto proceeds lodged: €310',                              time:'Yesterday',type:'payment' },
  { icon:'👤', text:'New member application: Sinéad de Búrca (U10 Girls)',     time:'Yesterday',type:'reg'     },
  { icon:'📄', text:'Document uploaded: AGM Agenda — August 2026',             time:'Mon',      type:'doc'     },
  { icon:'🏟️', text:'Pitch booking confirmed: Thurs 7 Aug 16:00–18:30',        time:'Mon',      type:'facility'},
]

const UPCOMING_EVENTS = [
  { title:'U12 Training',           date:'Thu 7 Aug', time:'16:30', venue:'Pitch A', type:'training' },
  { title:'Parent Information Night',date:'Thu 7 Aug', time:'19:30', venue:'Clubhouse', type:'meeting' },
  { title:'Senior Women Match',     date:'Fri 8 Aug', time:'19:00', venue:'Away',     type:'match'    },
  { title:'Club AGM',               date:'Tue 12 Aug',time:'20:00', venue:'Clubhouse', type:'meeting' },
  { title:'Fingallians U12 Blitz',  date:'Sat 22 Aug',time:'09:15', venue:'Lawless Park',type:'blitz' },
]

const DOCUMENTS = [
  { icon:'📋', name:'Club Constitution 2024',         category:'Governance', date:'12 Jan 2024', size:'420 KB', type:'PDF'  },
  { icon:'📋', name:'AGM Minutes — August 2024',      category:'Governance', date:'15 Aug 2024', size:'180 KB', type:'PDF'  },
  { icon:'📋', name:'Child Safeguarding Policy',      category:'Governance', date:'1 Sep 2024',  size:'210 KB', type:'PDF'  },
  { icon:'📊', name:'Club Accounts 2024–25',          category:'Finance',    date:'30 Jun 2025', size:'128 KB', type:'XLSX' },
  { icon:'📊', name:'Budget Forecast 2025–26',        category:'Finance',    date:'2 Aug 2026',  size:'96 KB',  type:'XLSX' },
  { icon:'📋', name:'Code of Conduct — Players',      category:'Admin',      date:'1 Sep 2024',  size:'95 KB',  type:'PDF'  },
  { icon:'📋', name:'Medical Consent Form',           category:'Admin',      date:'1 Sep 2024',  size:'55 KB',  type:'PDF'  },
  { icon:'📷', name:'Photography Permission Form',    category:'Admin',      date:'1 Sep 2024',  size:'48 KB',  type:'PDF'  },
  { icon:'📄', name:'Blitz Pitch Map 2026',           category:'Events',     date:'1 Aug 2026',  size:'2.1 MB', type:'PDF'  },
  { icon:'📊', name:'Sponsorship Deck 2026',          category:'Sponsorship',date:'20 Jul 2026', size:'3.4 MB', type:'PPTX' },
]

// ─── Shared components ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color = R.r700, trend }: { label: string; value: string; sub?: string; icon: string; color?: string; trend?: string }) {
  return (
    <div style={{ background: R.white, borderRadius: 16, border: `1px solid ${R.line}`, borderTop: `4px solid ${color}`, padding: '20px 22px', boxShadow: R.cardSh, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ ...F.body, fontSize: 11, fontWeight: 700, color: R.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ ...F.display, fontSize: 28, fontWeight: 900, color: R.ink, letterSpacing: '-0.05em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ ...F.body, fontSize: 12, color: R.muted, marginTop: 6 }}>{sub}</div>}
      {trend && <div style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: trend.startsWith('+') ? R.green : R.r600, marginTop: 4 }}>{trend}</div>}
    </div>
  )
}

function Badge({ text, color = R.muted }: { text: string; color?: string }) {
  return (
    <span style={{ background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 999, padding: '2px 9px', ...F.body, fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{ label:string; color:string }> = {
    active:    { label:'Active',    color: R.green  },
    inactive:  { label:'Inactive',  color: R.muted  },
    pending:   { label:'Pending',   color: R.yellow },
    paid:      { label:'Paid',      color: R.green  },
    pending2:  { label:'Pending',   color: R.yellow },
    overdue:   { label:'Overdue',   color: R.r600   },
    complete:  { label:'Complete',  color: R.green  },
    payment:   { label:'Awaiting Payment', color: R.yellow },
    medical:   { label:'Medical Pending', color: R.orange },
    submitted: { label:'Submitted', color: R.blue   },
    expired:   { label:'Expired',   color: R.r600   },
    warning:   { label:'Attention', color: R.orange },
  }
  const e = map[status] ?? { label: status, color: R.muted }
  return <Badge text={e.label} color={e.color} />
}

function SectionHeader({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: R.ink }}>{title}</div>
      {action && actionLabel && (
        <button onClick={action} style={{ height: 40, padding: '0 18px', background: R.r700, border: 'none', borderRadius: 10, cursor: 'pointer', ...F.display, fontSize: 13, fontWeight: 800, color: R.white, boxShadow: R.redSh, display: 'flex', alignItems: 'center', gap: 6 }}>
          + {actionLabel}
        </button>
      )}
    </div>
  )
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols.map(() => '1fr').join(' '), padding: '10px 20px', background: R.soft, borderBottom: `1px solid ${R.line}`, gap: 8 }}>
      {cols.map(col => <div key={col} style={{ ...F.mono, fontSize: 10, fontWeight: 700, color: R.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col}</div>)}
    </div>
  )
}

// SVG mini bar chart
function BarChart({ data, height = 120, color = R.r700 }: { data: { label: string; income: number; expense: number }[]; height?: number; color?: string }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]))
  const barW = 14
  const gap = 6
  const groupW = barW * 2 + gap + 16
  const width = data.length * groupW + 40

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height + 30} viewBox={`0 0 ${width} ${height + 30}`}>
        {data.map((d, i) => {
          const x = 20 + i * groupW
          const incH = (d.income / maxVal) * height
          const expH = (d.expense / maxVal) * height
          return (
            <g key={d.month}>
              {/* income bar */}
              <rect x={x} y={height - incH} width={barW} height={incH} fill={color} rx={3} opacity=".85" />
              {/* expense bar */}
              <rect x={x + barW + gap} y={height - expH} width={barW} height={expH} fill={`${color}50`} rx={3} />
              <text x={x + barW + gap / 2} y={height + 20} textAnchor="middle" style={{ ...F.mono, fontSize: 9 }} fill={R.muted}>{d.month}</text>
            </g>
          )
        })}
        {/* Legend */}
        <rect x={20} y={height + 24} width={8} height={8} fill={color} rx={1} />
        <text x={32} y={height + 31} style={{ ...F.body, fontSize: 9 }} fill={R.muted}>Income</text>
        <rect x={75} y={height + 24} width={8} height={8} fill={`${color}50`} rx={1} />
        <text x={87} y={height + 31} style={{ ...F.body, fontSize: 9 }} fill={R.muted}>Expense</text>
      </svg>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP SCREENS
// ════════════════════════════════════════════════════════════════════════════

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const totalMembers = MEMBERS.length
  const activeMembers = MEMBERS.filter(m => m.status === 'active').length
  const pendingReg = REGISTRATIONS.filter(r => r.stage !== 'complete').length
  const totalIncome = INCOME_CATS.reduce((s, c) => s + c.amount, 0)
  const totalExpense = EXPENSE_CATS.reduce((s, c) => s + c.amount, 0)
  const balance = totalIncome - totalExpense

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard label="Total Members" value={`${totalMembers}`} sub={`${activeMembers} active`} icon="👥" color={R.r700} trend="+12 since Sep" />
        <StatCard label="Active Teams"  value={`${TEAMS.length}`} sub="9 grades across 2 sports" icon="🏆" color={R.blue} />
        <StatCard label="Revenue YTD"   value={`€${(totalIncome/1000).toFixed(1)}k`} sub={`€${(totalExpense/1000).toFixed(1)}k expenses`} icon="💰" color={R.green} trend={`+€${(balance/1000).toFixed(1)}k surplus`} />
        <StatCard label="Registrations Pending" value={`${pendingReg}`} sub="require action" icon="📋" color={R.orange} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Financial overview */}
          <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Financial Overview</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ ...F.mono, fontSize: 12, color: R.green, fontWeight: 700 }}>Income €{totalIncome.toLocaleString()}</span>
                <span style={{ ...F.mono, fontSize: 12, color: R.r700, fontWeight: 700 }}>Expense €{totalExpense.toLocaleString()}</span>
              </div>
            </div>
            <BarChart data={FINANCE_MONTHLY} height={110} color={R.r700} />
          </div>

          {/* Teams status */}
          <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${R.line}`, ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Team Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {TEAMS.map((team, i) => (
                <div key={team.id} style={{ padding: '14px 16px', borderRight: i % 3 !== 2 ? `1px solid ${R.line}` : 'none', borderBottom: Math.floor(i / 3) < 2 ? `1px solid ${R.line}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ ...F.display, fontSize: 12, fontWeight: 900, color: R.ink }}>{team.name}</span>
                    <StatusBadge status={team.status} />
                  </div>
                  <div style={{ ...F.body, fontSize: 11, color: R.muted, marginBottom: 6 }}>Coach: {team.coach.split(' ')[0]} {team.coach.split(' ').pop()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: R.line, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(team.players / team.maxPlayers) * 100}%`, height: '100%', background: team.status === 'warning' ? R.orange : R.r700, borderRadius: 3 }} />
                    </div>
                    <span style={{ ...F.mono, fontSize: 11, color: R.muted, fontWeight: 700 }}>{team.players}/{team.maxPlayers}</span>
                  </div>
                  <div style={{ ...F.body, fontSize: 10, color: R.muted, marginTop: 5 }}>{team.nextEvent}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upcoming events */}
          <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${R.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Upcoming Events</div>
              <span style={{ ...F.body, fontSize: 12, color: R.muted }}>{UPCOMING_EVENTS.length} events</span>
            </div>
            {UPCOMING_EVENTS.map((ev, i) => {
              const typeColors: Record<string,string> = { training:R.green, meeting:R.blue, match:R.r700, blitz:R.orange }
              const c = typeColors[ev.type] ?? R.muted
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'center' }}>
                  <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ ...F.display, fontSize: 10, fontWeight: 900, color: c, textTransform: 'uppercase' }}>{ev.date.split(' ')[0]}</div>
                    <div style={{ ...F.display, fontSize: 18, fontWeight: 900, color: R.ink, lineHeight: 1 }}>{ev.date.split(' ')[1]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: R.ink }}>{ev.title}</div>
                    <div style={{ ...F.body, fontSize: 11, color: R.muted }}>{ev.time} · {ev.venue}</div>
                  </div>
                  <Badge text={ev.type} color={c} />
                </div>
              )
            })}
          </div>

          {/* Recent activity */}
          <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${R.line}`, ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Recent Activity</div>
            {RECENT_ACTIVITY.slice(0,6).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, ...F.body, fontSize: 12, color: R.sub, lineHeight: 1.5 }}>{a.text}</div>
                <span style={{ ...F.mono, fontSize: 10, color: R.muted, flexShrink: 0 }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
        {[
          { icon:'👤', label:'Add Member',     color:R.r700   },
          { icon:'📋', label:'New Registration',color:R.orange },
          { icon:'💰', label:'Record Payment',  color:R.green  },
          { icon:'📢', label:'Send Broadcast',  color:R.blue   },
          { icon:'📄', label:'Upload Document', color:R.muted  },
          { icon:'📊', label:'Generate Report', color:R.r900  },
        ].map(qa => (
          <button key={qa.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 10px', borderRadius: 14, border: `1.5px solid ${R.line}`, background: R.white, cursor: 'pointer', boxShadow: R.cardSh, transition: 'all .15s' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${qa.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{qa.icon}</div>
            <span style={{ ...F.display, fontSize: 11, fontWeight: 800, color: R.sub, textAlign: 'center', lineHeight: 1.3 }}>{qa.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Members ──────────────────────────────────────────────────────────────────
function Members() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [feeFilter, setFeeFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])

  const filtered = MEMBERS.filter(m => {
    const matchSearch = search === '' || m.name.toLowerCase().includes(search.toLowerCase()) || m.team.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    const matchFee = feeFilter === 'all' || m.fees === feeFilter
    return matchSearch && matchStatus && matchFee
  })

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="Members" action={() => {}} actionLabel="Add Member" />
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label:`${MEMBERS.length} Total`,                                    color:R.navy   },
          { label:`${MEMBERS.filter(m=>m.status==='active').length} Active`,    color:R.green  },
          { label:`${MEMBERS.filter(m=>m.status==='inactive').length} Inactive`,color:R.muted  },
          { label:`${MEMBERS.filter(m=>m.fees==='overdue').length} Overdue Fees`,color:R.r600  },
          { label:`${MEMBERS.filter(m=>m.reg!=='complete').length} Reg Pending`, color:R.orange },
        ].map(s => <Badge key={s.label} text={s.label} color={s.color} />)}
      </div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, background: R.white, borderRadius: 10, border: `1px solid ${R.line}`, padding: '0 14px', height: 38, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: R.muted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members or teams…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', ...F.body, fontSize: 13, color: R.ink }} />
        </div>
        {[['all','All Status','status'],['active','Active','status'],['inactive','Inactive','status']].map(([val, label, key]) => (
          <button key={val+key} onClick={() => key === 'status' ? setStatusFilter(val) : setFeeFilter(val)}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1.5px solid ${(key==='status'?statusFilter:feeFilter)===val ? R.r700 : R.line}`, background: (key==='status'?statusFilter:feeFilter)===val ? `${R.r700}10` : R.white, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: (key==='status'?statusFilter:feeFilter)===val ? R.r700 : R.muted }}>
            {label}
          </button>
        ))}
        {[['all','All Fees'],['paid','Paid'],['pending','Pending'],['overdue','Overdue']].map(([val, label]) => (
          <button key={val} onClick={() => setFeeFilter(val)}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1.5px solid ${feeFilter===val ? R.r700 : R.line}`, background: feeFilter===val ? `${R.r700}10` : R.white, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: feeFilter===val ? R.r700 : R.muted }}>
            {label}
          </button>
        ))}
        {selected.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${R.line}`, background: R.white, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.sub }}>Export {selected.length} selected</button>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: R.r700, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.white }}>Email selected</button>
          </div>
        )}
      </div>
      {/* Table */}
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 36px 1fr 80px 180px 90px 90px 110px 80px', gap: 8, padding: '10px 20px', background: R.soft, ...F.mono, fontSize: 10, fontWeight: 700, color: R.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${R.line}` }}>
          <div />
          <div>#</div>
          <div>Member</div>
          <div>ID</div>
          <div>Team</div>
          <div>Status</div>
          <div>Fees</div>
          <div>Registration</div>
          <div>Actions</div>
        </div>
        {filtered.map((m, i) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '40px 36px 1fr 80px 180px 90px 90px 110px 80px', gap: 8, padding: '13px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'center', background: selected.includes(m.id) ? `${R.r700}04` : i % 2 === 0 ? R.white : `${R.soft}88` }}>
            <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} style={{ accentColor: R.r700, width: 16, height: 16 }} />
            <div style={{ ...F.mono, fontSize: 11, color: R.muted, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${R.r700}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 13, fontWeight: 900, color: R.r700, flexShrink: 0 }}>{m.name[0]}</div>
              <div>
                <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: R.ink }}>{m.name}</div>
                <div style={{ ...F.body, fontSize: 11, color: R.muted }}>Joined {m.joined}</div>
              </div>
            </div>
            <div style={{ ...F.mono, fontSize: 11, color: R.muted }}>{m.id}</div>
            <div style={{ ...F.body, fontSize: 12, color: R.sub }}>{m.team}</div>
            <StatusBadge status={m.status} />
            <StatusBadge status={m.fees === 'pending' ? 'pending' : m.fees} />
            <StatusBadge status={m.reg} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ height: 26, padding: '0 8px', border: `1px solid ${R.line}`, borderRadius: 6, background: R.white, cursor: 'pointer', ...F.body, fontSize: 11, color: R.sub }}>Edit</button>
              <button style={{ height: 26, padding: '0 8px', border: `1px solid ${R.line}`, borderRadius: 6, background: R.white, cursor: 'pointer', ...F.body, fontSize: 11, color: R.sub }}>⋯</button>
            </div>
          </div>
        ))}
        <div style={{ padding: '12px 20px', ...F.body, fontSize: 12, color: R.muted }}>
          Showing {filtered.length} of {MEMBERS.length} members
        </div>
      </div>
    </div>
  )
}

// ─── Registrations ────────────────────────────────────────────────────────────
function Registrations() {
  const stages = [
    { key:'submitted', label:'Submitted',        color:R.blue,   icon:'📩' },
    { key:'payment',   label:'Awaiting Payment',  color:R.yellow, icon:'💳' },
    { key:'medical',   label:'Medical Pending',   color:R.orange, icon:'🏥' },
    { key:'complete',  label:'Complete',          color:R.green,  icon:'✅' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Registrations" action={() => {}} actionLabel="New Registration" />
      {/* Pipeline kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stages.map(stage => {
          const items = REGISTRATIONS.filter(r => r.stage === stage.key)
          return (
            <div key={stage.key} style={{ background: R.soft, borderRadius: 16, border: `1px solid ${R.line}`, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', background: R.white, borderBottom: `2px solid ${stage.color}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{stage.icon}</span>
                <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: R.ink }}>{stage.label}</span>
                <div style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: `${stage.color}20`, border: `1px solid ${stage.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: stage.color }}>{items.length}</span>
                </div>
              </div>
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                {items.map(reg => (
                  <div key={reg.id} style={{ background: R.white, borderRadius: 12, border: `1px solid ${R.line}`, padding: '12px', boxShadow: R.cardSh }}>
                    <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: R.ink, marginBottom: 4 }}>{reg.name}</div>
                    <div style={{ ...F.body, fontSize: 11, color: R.muted, marginBottom: 6 }}>{reg.team}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ ...F.mono, fontSize: 11, color: R.sub }}>{reg.id}</span>
                      <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: stage.color }}>{reg.fee}</span>
                    </div>
                    <div style={{ ...F.body, fontSize: 10, color: R.muted, marginTop: 4 }}>Submitted {reg.submitted}</div>
                    {stage.key !== 'complete' && (
                      <button style={{ width: '100%', marginTop: 8, height: 28, border: 'none', borderRadius: 7, background: `${stage.color}15`, cursor: 'pointer', ...F.display, fontSize: 11, fontWeight: 800, color: stage.color }}>
                        {stage.key === 'submitted' ? 'Request Payment →' : stage.key === 'payment' ? 'Mark Paid →' : 'Mark Complete →'}
                      </button>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', ...F.body, fontSize: 12, color: R.line }}>No registrations</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary table */}
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${R.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>All Registrations 2025–26</div>
          <button style={{ height: 34, padding: '0 14px', background: R.soft, border: `1px solid ${R.line}`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.sub }}>Export CSV</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 180px 90px 120px 90px 110px', gap: 8, padding: '10px 20px', background: R.soft, ...F.mono, fontSize: 10, fontWeight: 700, color: R.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${R.line}` }}>
          <div>Ref</div><div>Name</div><div>Team</div><div>Fee</div><div>Submitted</div><div>Paid</div><div>Stage</div>
        </div>
        {REGISTRATIONS.map((r, i) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 180px 90px 120px 90px 110px', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'center', background: i % 2 === 0 ? R.white : `${R.soft}88` }}>
            <span style={{ ...F.mono, fontSize: 11, color: R.muted }}>{r.id}</span>
            <span style={{ ...F.display, fontSize: 13, fontWeight: 800, color: R.ink }}>{r.name}</span>
            <span style={{ ...F.body, fontSize: 12, color: R.sub }}>{r.team}</span>
            <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: R.green }}>{r.fee}</span>
            <span style={{ ...F.body, fontSize: 12, color: R.muted }}>{r.submitted}</span>
            <span style={{ ...F.mono, fontSize: 12, color: r.stage === 'complete' || r.stage === 'medical' ? R.green : R.orange }}>
              {r.stage === 'complete' || r.stage === 'medical' ? '✓ Paid' : '✗ Unpaid'}
            </span>
            <StatusBadge status={r.stage} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Finance ──────────────────────────────────────────────────────────────────
function Finance() {
  const totalIncome  = INCOME_CATS.reduce((s, c) => s + c.amount, 0)
  const totalExpense = EXPENSE_CATS.reduce((s, c) => s + c.amount, 0)
  const budget = 45000
  const balance = totalIncome - totalExpense

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Finance" action={() => {}} actionLabel="Record Transaction" />
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard label="Annual Budget"   value={`€${budget.toLocaleString()}`}       icon="📊" color={R.navy}   />
        <StatCard label="Income YTD"      value={`€${totalIncome.toLocaleString()}`}  icon="📈" color={R.green}  trend={`${Math.round((totalIncome/budget)*100)}% of budget`} />
        <StatCard label="Expenses YTD"    value={`€${totalExpense.toLocaleString()}`} icon="📉" color={R.r700}   trend={`${Math.round((totalExpense/budget)*100)}% of budget`} />
        <StatCard label="Balance"         value={`+€${balance.toLocaleString()}`}     icon="💰" color={R.green}  trend="Surplus" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Income breakdown */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Income by Category</div>
          {INCOME_CATS.map(cat => {
            const pct = Math.round((cat.amount / totalIncome) * 100)
            return (
              <div key={cat.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ ...F.body, fontSize: 13, color: R.ink }}>{cat.label}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: R.sub }}>€{cat.amount.toLocaleString()}</span>
                    <span style={{ ...F.mono, fontSize: 12, color: R.muted, width: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: R.line, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: 4, transition: 'width .4s' }} />
                </div>
              </div>
            )
          })}
        </div>
        {/* Expense breakdown */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Expenses by Category</div>
          {EXPENSE_CATS.map(cat => {
            const pct = Math.round((cat.amount / totalExpense) * 100)
            return (
              <div key={cat.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ ...F.body, fontSize: 13, color: R.ink }}>{cat.label}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: R.sub }}>€{cat.amount.toLocaleString()}</span>
                    <span style={{ ...F.mono, fontSize: 12, color: R.muted, width: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: R.line, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: 4, transition: 'width .4s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly chart */}
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
        <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Monthly Income vs Expenses (2026)</div>
        <BarChart data={FINANCE_MONTHLY} height={120} color={R.r700} />
      </div>

      {/* Recent transactions */}
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${R.line}`, ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Recent Transactions</div>
        {[
          { desc:'Lotto proceeds — Week 31', amount:310,    type:'income',  date:'Mon 3 Aug',  cat:'Lotto'           },
          { desc:'Pitch maintenance — Aug',  amount:-420,   type:'expense', date:'Mon 3 Aug',  cat:'Pitch maint.'    },
          { desc:'Registration — Ciarán Ó M.', amount:65,  type:'income',  date:'Sun 2 Aug',  cat:'Membership fees' },
          { desc:'Equipment — training bibs', amount:-180,  type:'expense', date:'Sat 1 Aug',  cat:'Equipment'       },
          { desc:'Registration — Niamh N.',   amount:65,   type:'income',  date:'Fri 1 Aug',  cat:'Membership fees' },
          { desc:'Utility bill — electricity', amount:-285, type:'expense', date:'Fri 1 Aug',  cat:'Utilities'       },
        ].map((tx, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: tx.type === 'income' ? R.greenBg : R.r50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {tx.type === 'income' ? '↑' : '↓'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: R.ink }}>{tx.desc}</div>
              <div style={{ ...F.body, fontSize: 11, color: R.muted }}>{tx.date} · {tx.cat}</div>
            </div>
            <span style={{ ...F.mono, fontSize: 14, fontWeight: 700, color: tx.type === 'income' ? R.green : R.r700 }}>
              {tx.type === 'income' ? '+' : ''}€{Math.abs(tx.amount).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sponsors ─────────────────────────────────────────────────────────────────
function Sponsors() {
  const tierColors: Record<string,string> = { Gold: '#fbc02d', Silver: '#90a4ae', Bronze: '#cd7f32' }
  const active = SPONSORS.filter(s => s.status === 'active')
  const totalValue = active.reduce((s, sp) => s + sp.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Sponsors" action={() => {}} actionLabel="Add Sponsor" />
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard label="Total Sponsors"  value={`${SPONSORS.length}`} sub={`${active.length} active`} icon="🤝" color={R.r700} />
        <StatCard label="Annual Value"    value={`€${totalValue.toLocaleString()}`}                    icon="💰" color={R.green} />
        <StatCard label="Gold Tier"       value={`${SPONSORS.filter(s=>s.tier==='Gold').length}`}      icon="🥇" color="#fbc02d" />
        <StatCard label="Renewals Due"    value={`${SPONSORS.filter(s=>s.status==='expired').length}`} icon="⚠️" color={R.orange} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {SPONSORS.map((sp, i) => {
          const c = tierColors[sp.tier] ?? R.muted
          return (
            <div key={i} style={{ background: R.white, borderRadius: 18, border: `1.5px solid ${sp.status === 'expired' ? R.r100 : R.line}`, padding: '20px', boxShadow: R.cardSh, borderTop: `4px solid ${sp.status === 'expired' ? R.r300 : c}`, opacity: sp.status === 'expired' ? 0.7 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{sp.logo}</span>
                <StatusBadge status={sp.status} />
              </div>
              <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 4 }}>{sp.name}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Badge text={sp.tier} color={c} />
                <Badge text={`Expires ${sp.expires}`} color={sp.status === 'expired' ? R.r600 : R.muted} />
              </div>
              <div style={{ ...F.display, fontSize: 22, fontWeight: 900, color: sp.status === 'expired' ? R.muted : R.green }}>€{sp.amount.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 600, color: R.muted }}>/year</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button style={{ flex: 1, height: 32, border: `1px solid ${R.line}`, borderRadius: 8, background: R.soft, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.sub }}>Edit</button>
                {sp.status === 'expired' && <button style={{ flex: 1, height: 32, border: 'none', borderRadius: 8, background: R.r700, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.white }}>Renew</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Teams ────────────────────────────────────────────────────────────────────
function Teams() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="Teams" action={() => {}} actionLabel="Add Team" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {TEAMS.map(team => (
          <div key={team.id} onClick={() => setSelected(selected === team.id ? null : team.id)}
            style={{ background: R.white, borderRadius: 18, border: `2px solid ${selected === team.id ? R.r700 : R.line}`, padding: '18px', boxShadow: selected === team.id ? R.redSh : R.cardSh, cursor: 'pointer', transition: 'all .15s', borderTop: `4px solid ${team.status === 'warning' ? R.orange : R.r700}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <StatusBadge status={team.status} />
              <Badge text={team.sport} color={team.sport === 'Hurling' ? R.orange : R.r700} />
            </div>
            <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: R.ink, marginBottom: 4 }}>{team.name}</div>
            <div style={{ ...F.body, fontSize: 12, color: R.muted, marginBottom: 12 }}>Coach: {team.coach}</div>
            {/* Squad fill */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ ...F.body, fontSize: 12, color: R.sub }}>Squad</span>
                <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: team.players >= team.maxPlayers ? R.green : R.muted }}>{team.players}/{team.maxPlayers}</span>
              </div>
              <div style={{ height: 6, background: R.line, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(team.players / team.maxPlayers) * 100}%`, height: '100%', background: team.status === 'warning' ? R.orange : R.r700, borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ ...F.body, fontSize: 11, color: R.muted }}>Next: {team.nextEvent}</div>
          </div>
        ))}
      </div>
      {/* Selected team detail */}
      {selected !== null && (() => {
        const team = TEAMS.find(t => t.id === selected)!
        return (
          <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '24px', boxShadow: R.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: R.ink, margin: '0 0 4px' }}>{team.name}</h2>
                <p style={{ ...F.body, fontSize: 14, color: R.muted, margin: 0 }}>Coach: {team.coach} · Grade: {team.grade} · Sport: {team.sport}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ height: 40, padding: '0 16px', border: `1px solid ${R.line}`, borderRadius: 10, background: R.white, cursor: 'pointer', ...F.body, fontSize: 13, fontWeight: 700, color: R.sub }}>View Squad</button>
                <button style={{ height: 40, padding: '0 16px', border: 'none', borderRadius: 10, background: R.r700, cursor: 'pointer', ...F.body, fontSize: 13, fontWeight: 700, color: R.white }}>Edit Team</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {[
                { label:'Players', value:`${team.players}/${team.maxPlayers}`, icon:'👥' },
                { label:'Upcoming events', value:'3', icon:'📅' },
                { label:'Season status', value:'Active', icon:'✅' },
                { label:'Next event', value:team.nextEvent, icon:'📍' },
              ].map(s => (
                <div key={s.label} style={{ background: R.soft, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>{s.value}</div>
                  <div style={{ ...F.body, fontSize: 11, color: R.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Documents ────────────────────────────────────────────────────────────────
function Documents() {
  const [catFilter, setCatFilter] = useState('All')
  const cats = ['All', ...new Set(DOCUMENTS.map(d => d.category))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="Documents" action={() => {}} actionLabel="Upload" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ height: 32, padding: '0 14px', border: `1.5px solid ${catFilter===c ? R.r700 : R.line}`, borderRadius: 999, background: catFilter===c ? `${R.r700}10` : R.white, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: catFilter===c ? R.r700 : R.muted }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 100px 80px 80px', gap: 8, padding: '10px 20px', background: R.soft, ...F.mono, fontSize: 10, fontWeight: 700, color: R.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${R.line}` }}>
          <div>Name</div><div>Category</div><div>Type</div><div>Date</div><div>Size</div><div>Actions</div>
        </div>
        {DOCUMENTS.filter(d => catFilter === 'All' || d.category === catFilter).map((doc, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 100px 80px 80px', gap: 8, padding: '13px 20px', borderBottom: `1px solid ${R.line}`, alignItems: 'center', background: i % 2 ? `${R.soft}88` : R.white }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>{doc.icon}</span>
              <span style={{ ...F.display, fontSize: 13, fontWeight: 700, color: R.ink }}>{doc.name}</span>
            </div>
            <Badge text={doc.category} color={R.navy} />
            <Badge text={doc.type} color={doc.type === 'PDF' ? R.r700 : doc.type === 'XLSX' ? R.green : R.blue} />
            <span style={{ ...F.body, fontSize: 12, color: R.muted }}>{doc.date}</span>
            <span style={{ ...F.mono, fontSize: 11, color: R.muted }}>{doc.size}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ height: 26, padding: '0 8px', border: `1px solid ${R.line}`, borderRadius: 6, background: R.white, cursor: 'pointer', ...F.body, fontSize: 11, color: R.sub }}>↓</button>
              <button style={{ height: 26, padding: '0 8px', border: `1px solid ${R.line}`, borderRadius: 6, background: R.white, cursor: 'pointer', ...F.body, fontSize: 11, color: R.sub }}>⋯</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Analytics" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Membership growth */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Membership Growth (2024–26)</div>
          <BarChart data={[{month:'2024',income:128,expense:0},{month:'2025',income:143,expense:0},{month:'2026',income:156,expense:0}].map(d => ({ ...d, label:d.month }))} height={100} color={R.r700} />
        </div>
        {/* Registration completion rate */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Registration Completion Rate</div>
          {[
            { label:'Submitted',       value: 7, total: 7 },
            { label:'Payment complete', value: 5, total: 7 },
            { label:'Medical complete', value: 4, total: 7 },
            { label:'Fully complete',  value: 1, total: 7 },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ ...F.body, fontSize: 13, color: R.ink }}>{s.label}</span>
                <span style={{ ...F.mono, fontSize: 12, color: R.r700, fontWeight: 700 }}>{s.value}/{s.total}</span>
              </div>
              <div style={{ height: 8, background: R.line, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(s.value/s.total)*100}%`, height: '100%', background: R.r700, borderRadius: 4, transition: 'width .4s' }} />
              </div>
            </div>
          ))}
        </div>
        {/* Team player distribution */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Players per Team</div>
          {TEAMS.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ ...F.body, fontSize: 12, color: R.sub, width: 160, flexShrink: 0 }}>{t.name}</span>
              <div style={{ flex: 1, height: 8, background: R.line, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(t.players/t.maxPlayers)*100}%`, height: '100%', background: t.status === 'warning' ? R.orange : R.r700, borderRadius: 4 }} />
              </div>
              <span style={{ ...F.mono, fontSize: 11, color: R.muted, width: 40, textAlign: 'right' }}>{t.players}</span>
            </div>
          ))}
        </div>
        {/* Finance summary */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, padding: '20px', boxShadow: R.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: R.ink, marginBottom: 16 }}>Key Metrics</div>
          {[
            { label:'Revenue per member', value:'€210', color:R.r700 },
            { label:'Cost per member',    value:'€185', color:R.r400 },
            { label:'Avg registration fee',value:'€66', color:R.green },
            { label:'Sponsorship per team', value:'€722',color:R.blue },
            { label:'Members renewing',    value:'92%',  color:R.green },
            { label:'Budget utilised',     value:`${Math.round((EXPENSE_CATS.reduce((s,c)=>s+c.amount,0)/45000)*100)}%`, color:R.orange },
          ].map((kpi, i) => (
            <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${R.line}` }}>
              <span style={{ ...F.body, fontSize: 13, color: R.ink }}>{kpi.label}</span>
              <span style={{ ...F.mono, fontSize: 14, fontWeight: 700, color: kpi.color }}>{kpi.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Reports" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { icon:'👥', title:'Member List',             desc:'Full member directory with contact details, team, status, and fee information.', format:'CSV / PDF', tags:['Members','Admin'] },
          { icon:'📋', title:'Registration Summary',    desc:'All registrations for the season with stage, payment status, and medical forms.', format:'CSV / PDF', tags:['Registrations'] },
          { icon:'💰', title:'Financial Report',        desc:'Income and expenditure breakdown by category with monthly totals.', format:'XLSX / PDF', tags:['Finance'] },
          { icon:'🤝', title:'Sponsor Report',          desc:'Active and expired sponsors with tier, value, and renewal dates.', format:'PDF', tags:['Sponsors'] },
          { icon:'🏆', title:'Team Rosters',            desc:'Player lists per team with jersey number, position, and contact details.', format:'PDF', tags:['Teams'] },
          { icon:'📊', title:'GAA Returns',             desc:'Official GAA returns for the County Board — registration numbers by grade.', format:'PDF', tags:['Governance'] },
          { icon:'🔒', title:'Insurance Report',        desc:'Registered members for insurance purposes, including date of birth and teams.', format:'PDF', tags:['Admin','Governance'] },
          { icon:'💳', title:'Fee Collection Report',  desc:'Outstanding fees, paid members, and overdue accounts summary.', format:'XLSX', tags:['Finance'] },
          { icon:'📈', title:'Season Analytics',        desc:'Year-on-year membership growth, registration trends, and financial comparison.', format:'PDF', tags:['Analytics'] },
        ].map(rep => (
          <div key={rep.title} style={{ background: R.white, borderRadius: 16, border: `1px solid ${R.line}`, padding: '18px', boxShadow: R.cardSh, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: R.r50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{rep.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: R.ink }}>{rep.title}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {rep.tags.map(t => <Badge key={t} text={t} color={R.navy} />)}
                </div>
              </div>
            </div>
            <p style={{ ...F.body, fontSize: 12, color: R.sub, margin: 0, lineHeight: 1.55, flex: 1 }}>{rep.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...F.mono, fontSize: 11, color: R.muted }}>{rep.format}</span>
              <button style={{ height: 32, padding: '0 14px', background: R.r700, border: 'none', borderRadius: 8, cursor: 'pointer', ...F.display, fontSize: 12, fontWeight: 800, color: R.white }}>Generate ↓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Facilities ───────────────────────────────────────────────────────────────
function Facilities() {
  const days = ['Mon 4','Tue 5','Wed 6','Thu 7','Fri 8','Sat 9','Sun 10']
  const bookings: Record<string, { label: string; color: string }[]> = {
    'Mon 4': [{ label:'U14 Hurling 16:00', color:R.orange }],
    'Tue 5': [{ label:'U16 Girls 16:30', color:R.blue }],
    'Wed 6': [],
    'Thu 7': [{ label:'U12 Boys 16:30', color:R.r700 }, { label:'U12 Girls 16:30', color:R.r400 }, { label:'Senior Men 19:30', color:R.navy }],
    'Fri 8': [{ label:'Senior Women Match 19:00', color:R.green }],
    'Sat 9': [{ label:'Training CANCELLED', color:R.muted }],
    'Sun 10':[ { label:'Senior Men Match 14:00', color:R.navy }],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Facilities" action={() => {}} actionLabel="Book Pitch" />
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard label="Pitches" value="2" sub="Lawless Memorial Park" icon="🏟️" color={R.green} />
        <StatCard label="Clubhouse" value="1" sub="Available for booking" icon="🏛️" color={R.blue} />
        <StatCard label="This Week" value="6" sub="sessions booked" icon="📅" color={R.r700} />
        <StatCard label="Available Hours" value="42h" sub="this week" icon="⏱️" color={R.muted} />
      </div>
      {/* Week calendar */}
      <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${R.line}`, ...F.display, fontSize: 15, fontWeight: 900, color: R.ink }}>Week View — 4–10 August 2026</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', minHeight: 200 }}>
          {days.map((day, i) => (
            <div key={day} style={{ borderRight: i < 6 ? `1px solid ${R.line}` : 'none', padding: '10px' }}>
              <div style={{ ...F.display, fontSize: 12, fontWeight: 900, color: day === 'Mon 4' ? R.r700 : R.muted, marginBottom: 8, textAlign: 'center' }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(bookings[day] ?? []).map((b, bi) => (
                  <div key={bi} style={{ background: `${b.color}18`, border: `1px solid ${b.color}40`, borderRadius: 7, padding: '5px 7px', borderLeft: `3px solid ${b.color}` }}>
                    <span style={{ ...F.body, fontSize: 10, fontWeight: 700, color: b.color }}>{b.label}</span>
                  </div>
                ))}
                {(bookings[day] ?? []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', ...F.body, fontSize: 11, color: R.line }}>Free</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE COMPANION (limited)
// ════════════════════════════════════════════════════════════════════════════
function MobileCompanion() {
  const totalIncome  = INCOME_CATS.reduce((s,c) => s + c.amount, 0)
  const totalExpense = EXPENSE_CATS.reduce((s,c) => s + c.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: R.soft }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${R.r900}, ${R.r700})`, padding: '48px 20px 20px' }}>
        <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.55)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>St. Finbarr&apos;s GAA</p>
        <h1 style={{ ...F.display, fontSize: 24, fontWeight: 900, color: R.white, margin: '4px 0', letterSpacing: '-0.04em' }}>Club Overview</h1>
        <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.6)', margin: 0 }}>Mon, 3 August 2026</p>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label:'Members', value:'156', icon:'👥', color:R.r700 },
            { label:'Teams',   value:'9',   icon:'🏆', color:R.blue },
            { label:'Revenue', value:`€${(totalIncome/1000).toFixed(1)}k`, icon:'💰', color:R.green },
            { label:'Pending', value:'6',   icon:'📋', color:R.orange },
          ].map(s => (
            <div key={s.label} style={{ background: R.white, borderRadius: 16, border: `1px solid ${R.line}`, padding: '16px', boxShadow: R.cardSh, borderTop: `3px solid ${s.color}` }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div style={{ ...F.display, fontSize: 22, fontWeight: 900, color: R.ink, marginTop: 6 }}>{s.value}</div>
              <div style={{ ...F.body, fontSize: 11, color: R.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Notice */}
        <div style={{ background: `${R.orange}15`, border: `2px solid ${R.orange}30`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: R.orange }}>6 registrations need attention</div>
          <p style={{ ...F.body, fontSize: 12, color: R.sub, margin: '4px 0 0' }}>2 awaiting payment · 1 medical pending · 3 just submitted</p>
        </div>

        {/* Recent activity */}
        <div style={{ background: R.white, borderRadius: 18, border: `1px solid ${R.line}`, overflow: 'hidden', boxShadow: R.cardSh }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${R.line}`, ...F.display, fontSize: 14, fontWeight: 900, color: R.ink }}>Recent Activity</div>
          {RECENT_ACTIVITY.slice(0,5).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${R.line}`, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <div style={{ flex: 1, ...F.body, fontSize: 12, color: R.sub, lineHeight: 1.4 }}>{a.text}</div>
              <span style={{ ...F.mono, fontSize: 10, color: R.muted, flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>

        <div style={{ background: `${R.r700}08`, border: `1px solid ${R.r100}`, borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ ...F.body, fontSize: 13, color: R.muted, margin: 0 }}>Full club management available on desktop.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { label: 'Overview',    items: [{ id:'dashboard', icon:'🏠', label:'Dashboard' }] },
  { label: 'Members',     items: [{ id:'members', icon:'👥', label:'Members' }, { id:'teams', icon:'🏆', label:'Teams' }, { id:'registrations', icon:'📋', label:'Registrations' }] },
  { label: 'Finance',     items: [{ id:'finance', icon:'💰', label:'Finance' }, { id:'sponsors', icon:'🤝', label:'Sponsors' }] },
  { label: 'Operations',  items: [{ id:'facilities', icon:'🏟️', label:'Facilities' }, { id:'documents', icon:'📁', label:'Documents' }] },
  { label: 'Insights',    items: [{ id:'analytics', icon:'📊', label:'Analytics' }, { id:'reports', icon:'📄', label:'Reports' }] },
]

function DesktopSidebar({ active, onNav, collapsed, setCollapsed }: { active: string; onNav: (s: string) => void; collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  return (
    <div style={{ width: collapsed ? 60 : 220, background: R.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 220ms cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '16px 14px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <img src={spraioIcon} alt="Spraoi Sports" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div style={{ ...F.display, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Spraoi Sports</div>
            <div style={{ ...F.body, fontSize: 10, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap', marginTop: 2 }}>St. Finbarr&apos;s GAA</div>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, overflow: 'hidden auto', padding: collapsed ? '8px 6px' : '8px 10px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            {!collapsed && <div style={{ ...F.body, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 12px 4px' }}>{group.label}</div>}
            {group.items.map(item => {
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => onNav(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '10px' : '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', background: isActive ? `${R.r700}35` : 'transparent', borderLeft: `3px solid ${isActive ? R.r400 : 'transparent'}`, transition: 'all .15s', marginBottom: 2 }}
                  title={collapsed ? item.label : undefined}>
                  <span style={{ fontSize: 17 }}>{item.icon}</span>
                  {!collapsed && <span style={{ ...F.display, fontSize: 13, fontWeight: isActive ? 800 : 500, color: isActive ? R.white : 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: collapsed ? '12px 6px' : '12px 10px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', width: '100%', background: 'rgba(255,255,255,.06)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span style={{ ...F.mono, fontSize: 14, color: 'rgba(255,255,255,.4)', transform: collapsed ? 'rotate(180deg)' : 'none', display: 'block' }}>◀</span>
          {!collapsed && <span style={{ ...F.body, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Collapse</span>}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function Club() {
  const [mode, setMode] = useState<'desktop'|'mobile'>('desktop')
  const [screen, setScreen] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  const screenLabel: Record<string,string> = {
    dashboard:'Dashboard', members:'Members', registrations:'Registrations',
    finance:'Finance', sponsors:'Sponsors', facilities:'Facilities',
    documents:'Documents', analytics:'Analytics', reports:'Reports', teams:'Teams',
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':     return <Dashboard />
      case 'members':       return <Members />
      case 'registrations': return <Registrations />
      case 'finance':       return <Finance />
      case 'sponsors':      return <Sponsors />
      case 'facilities':    return <Facilities />
      case 'documents':     return <Documents />
      case 'analytics':     return <Analytics />
      case 'reports':       return <Reports />
      case 'teams':         return <Teams />
      default:              return <Dashboard />
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...F.body }}>
      {/* Meta bar */}
      <div style={{ background: R.r900, borderBottom: '1px solid rgba(255,255,255,.1)', padding: '0 20px', height: 44, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <img src={spraioIcon} alt="Spraoi" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: R.white }}>Spraoi Club</span>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['desktop','mobile'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === m ? R.r700 : 'transparent', color: mode === m ? R.white : 'rgba(255,255,255,.5)', ...F.body, fontSize: 11, fontWeight: 700, transition: 'all .15s' }}>
              {m === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>
        {mode === 'desktop' && (
          <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'hidden' }}>
            {['dashboard','members','registrations','finance','sponsors','facilities','documents','analytics','reports','teams'].map(id => (
              <button key={id} onClick={() => setScreen(id)}
                style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: screen === id ? `${R.r400}60` : 'transparent', color: screen === id ? R.white : 'rgba(255,255,255,.4)', ...F.body, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize', transition: 'all .15s' }}>
                {screenLabel[id]}
              </button>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ ...F.body, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Mon 3 Aug 2026</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: R.r700, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 12, fontWeight: 900, color: R.white }}>A</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {mode === 'desktop' ? (
          <>
            <DesktopSidebar active={screen} onNav={setScreen} collapsed={collapsed} setCollapsed={setCollapsed} />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Topbar */}
              <div style={{ background: R.white, borderBottom: `1px solid ${R.line}`, padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: R.cardSh }}>
                <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                  <div style={{ ...F.display, fontSize: 17, fontWeight: 900, color: R.ink }}>{screenLabel[screen]}</div>
                  {screen === 'registrations' && <Badge text={`${REGISTRATIONS.filter(r=>r.stage!=='complete').length} pending`} color={R.orange} />}
                  {screen === 'members' && <Badge text={`${MEMBERS.length} members`} color={R.navy} />}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button style={{ height: 34, padding: '0 14px', background: R.soft, border: `1px solid ${R.line}`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.sub }}>🔍 Search</button>
                  <button style={{ height: 34, padding: '0 14px', background: R.soft, border: `1px solid ${R.line}`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: R.sub }}>🔔</button>
                </div>
              </div>
              {/* Content */}
              <div style={{ flex: 1, overflow: 'auto', background: R.soft, padding: '24px 28px' }}>
                {renderScreen()}
              </div>
            </div>
          </>
        ) : (
          /* Mobile companion */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${R.r900} 0%, ${R.r700} 50%, ${R.r400} 100%)`, padding: '20px' }}>
            <div style={{ width: 393, height: '100%', maxHeight: 852, borderRadius: 46, border: '8px solid #1a0000', background: R.white, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,.5)' }}>
              <div style={{ height: '100%', overflow: 'auto' }}>
                <MobileCompanion />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
