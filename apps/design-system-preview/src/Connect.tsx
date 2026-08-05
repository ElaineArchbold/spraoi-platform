/**
 * Spraoi Connect — Club Communication Hub
 *
 * Module colour: Yellow (#fbc02d)
 * Think: ClubZap + WhatsApp + Email, combined.
 * Desktop: Club Management (broadcast, analytics, manage)
 * Mobile: Parents · Coaches · Players
 * No mascots except onboarding.
 */

import { useState } from 'react'
import spraioIcon from './imports/spraoi-icon.png'
import bellaSrc from './imports/Bella.png'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const Y = {
  // Yellow ramp
  y50:  '#fffde7', y100: '#fff9c4', y200: '#fff59d', y300: '#fff176',
  y400: '#ffee58', y500: '#ffeb3b', y600: '#fdd835', y700: '#fbc02d',
  y800: '#f9a825', y900: '#f57f17', amber: '#ff8f00',
  // Status colours
  green:  '#43a047', red:   '#e53935', blue:  '#1e88e5',
  orange: '#fb8c00', teal:  '#00897b',
  // Neutrals
  navy:   '#0b2545', ink:   '#13243b', sub:   '#4a5e78', muted:  '#627187',
  line:   '#dfe7ef', soft:  '#f6f9fc', cream: '#fffaf2', white:  '#ffffff',
  // Shadows
  cardSh:   '0 4px 20px rgba(251,192,45,.10)',
  yellowSh: '0 8px 28px rgba(251,192,45,.30)',
  navySh:   '0 8px 28px rgba(11,37,69,.20)',
}

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body:    { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono:    { fontFamily: "'JetBrains Mono', monospace" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'all',        name: 'All Members',    icon: '📢', count: 156, unread: 2 },
  { id: 'coaches',    name: 'Coaches',        icon: '📋', count: 8,   unread: 1 },
  { id: 'u12-parents',name: 'U12 Parents',   icon: '👨‍👩‍👦', count: 32,  unread: 0 },
  { id: 'u12-players',name: 'U12 Players',   icon: '⚽', count: 16,  unread: 3 },
  { id: 'volunteers', name: 'Volunteers',     icon: '🙋', count: 24,  unread: 0 },
  { id: 'u14-parents',name: 'U14 Parents',   icon: '👨‍👩‍👦', count: 28,  unread: 1 },
  { id: 'committee',  name: 'Committee',      icon: '🏛️', count: 12,  unread: 0 },
]

const NEWS = [
  {
    id: 1, urgent: true, read: true,
    title: 'Training CANCELLED — Saturday 9 Aug',
    body: "Due to waterlogged pitches at Lawless Memorial Park, this Saturday's training is cancelled. Next session is Thursday 7 Aug at 16:30. We'll have extra drills to make up for it!",
    author: 'Club Admin', authorRole: 'Administrator', time: '2h ago',
    channel: 'All Members', reactions: { thumbsUp: 18, heart: 4 }, comments: 6,
  },
  {
    id: 2, urgent: false, read: false,
    title: 'U12 Blitz — Volunteers Needed!',
    body: "We need 8 volunteers for the big day on 22 August at Lawless Memorial Park. Roles include registration desk, food court, car park management, and first aid support. Every pair of hands helps!",
    author: 'Club Secretary', authorRole: 'Secretary', time: 'Yesterday',
    channel: 'All Members', reactions: { thumbsUp: 31, heart: 12 }, comments: 14,
  },
  {
    id: 3, urgent: false, read: true,
    title: 'Club AGM — Tuesday 12 August, 20:00',
    body: "The Annual General Meeting will be held in the clubhouse on Tuesday 12 August at 20:00. All members welcome. Agenda and minutes from last year available in Documents.",
    author: 'Club Chairperson', authorRole: 'Chairperson', time: 'Mon 3 Aug',
    channel: 'All Members', reactions: { thumbsUp: 9, heart: 2 }, comments: 3,
  },
  {
    id: 4, urgent: false, read: true,
    title: 'New Membership Cards Available',
    body: "2025–26 membership cards are now available for collection at the clubhouse. Opening hours: Mon/Wed/Fri 18:00–20:00, Saturday 09:00–13:00.",
    author: 'Club Registrar', authorRole: 'Registrar', time: 'Fri 1 Aug',
    channel: 'All Members', reactions: { thumbsUp: 14, heart: 5 }, comments: 2,
  },
]

const THREADS = [
  { id: 1, name: 'U12 Parents',      icon: '👨‍👩‍👦', lastMsg: "Don't forget boot bag and water bottle for Thursday!", time: '4m',  unread: 3, type: 'group',   muted: false },
  { id: 2, name: 'Coach Murphy',     icon: '📋', lastMsg: 'Training at 16:30 tomorrow — focus on hand passing.',   time: '38m', unread: 0, type: 'direct',  muted: false },
  { id: 3, name: '#all-members',     icon: '📢', lastMsg: 'Training CANCELLED — see pinned post.',                  time: '2h',  unread: 1, type: 'channel', muted: false },
  { id: 4, name: 'Club Secretary',   icon: '🏛️', lastMsg: 'Can you confirm Ciarán is registered for the Blitz?',   time: '5h',  unread: 0, type: 'direct',  muted: false },
  { id: 5, name: 'U12 Coaches',      icon: '📋', lastMsg: 'Drill plan for Thursday attached.',                      time: 'Mon', unread: 0, type: 'group',   muted: false },
  { id: 6, name: 'Blitz Planning',   icon: '🏆', lastMsg: 'Pitch assignments confirmed — see document.',            time: 'Sat', unread: 0, type: 'group',   muted: true  },
]

const CHAT_MSGS = [
  { id: 1, from: 'Eithne Ní Bhriain', fromMe: false, time: '15:42', text: "Afternoon all! Quick reminder — training is at 16:30 Thursday, not 17:00 as on the old schedule. Lawless Park as usual." },
  { id: 2, from: 'Seán de Paor',      fromMe: false, time: '15:44', text: "Thanks for the heads up! Will Ciarán need his gum shield for Thursday?" },
  { id: 3, from: 'Me',                fromMe: true,  time: '15:46', text: "Yes please — they're doing full contact drills this week 🏒" },
  { id: 4, from: 'Aoife Mac Cárthaigh', fromMe: false, time: '15:50', text: "Don't forget boot bag and water bottle! Last week half the team forgot 😄" },
  { id: 5, from: 'Coach Murphy',      fromMe: false, time: '16:01', text: "Great turnout last week everyone. Thursday we focus on hand passing and solo runs. See you there! 🏆" },
]

const EVENTS = [
  { id: 1, title: 'Training Session',        date: 'Thu 7 Aug',  time: '16:30', venue: 'Lawless Memorial Park', type: 'training', rsvp: 'yes',  going: 14, notGoing: 2, maybe: 1  },
  { id: 2, title: 'Parent Information Night',date: 'Thu 7 Aug',  time: '19:30', venue: 'Clubhouse',             type: 'meeting',  rsvp: null,  going: 18, notGoing: 4, maybe: 6  },
  { id: 3, title: 'Training Session',        date: 'Sat 9 Aug',  time: '10:00', venue: 'Lawless Memorial Park', type: 'training', rsvp: null,  going: 11, notGoing: 5, maybe: 3, cancelled: true },
  { id: 4, title: 'Club AGM',                date: 'Tue 12 Aug', time: '20:00', venue: 'Clubhouse',             type: 'meeting',  rsvp: null,  going: 28, notGoing: 0, maybe: 14 },
  { id: 5, title: 'Fingallians U12 Blitz',   date: 'Sat 22 Aug', time: '09:15', venue: 'Lawless Memorial Park', type: 'blitz',    rsvp: null,  going: 15, notGoing: 1, maybe: 0  },
]

const POLLS = [
  {
    id: 1, title: 'Training availability — Thursday 14 Aug',
    desc: 'Please confirm your availability for next Thursday.',
    expires: 'Wed 6 Aug 23:59', votes: 18, total: 24, closed: false,
    options: [
      { label: 'Yes, I can make it', votes: 12, color: Y.green },
      { label: 'No, I cannot attend', votes: 3,  color: Y.red  },
      { label: 'Maybe / Not sure',   votes: 3,  color: Y.muted },
    ],
    myVote: 'Yes, I can make it',
  },
  {
    id: 2, title: 'Preferred match day warm-up time',
    desc: 'Help us plan the schedule for home matches.',
    expires: 'Mon 4 Aug', votes: 21, total: 24, closed: true,
    options: [
      { label: '45 mins before', votes: 14, color: Y.green },
      { label: '30 mins before', votes: 5,  color: Y.blue  },
      { label: '20 mins before', votes: 2,  color: Y.muted },
    ],
    myVote: '45 mins before',
  },
]

const VOLUNTEERS = [
  { role: 'Registration Desk',      slots: 2, filled: 2, names: ['Eithne Ní Bhriain', 'Pádraig Ó Ceallaigh'] },
  { role: 'Food Court Helper',      slots: 3, filled: 3, names: ['Aoife Mac Cárthaigh', 'Seán de Paor', 'Rónán Ó Briain'] },
  { role: 'Car Park Management',    slots: 2, filled: 1, names: ['Tomás Mac Cárthaigh'] },
  { role: 'First Aid Support',      slots: 1, filled: 1, names: ['Dr. Mairéad Ní Cheallaigh'] },
  { role: 'Pitch Side Marshal',     slots: 4, filled: 2, names: ['Caoimhe Ní Fhaoláin', 'Fionn Ó Duibhir'] },
  { role: 'Photography & Media',    slots: 1, filled: 0, names: [] },
  { role: 'Results / Scoreboard',   slots: 2, filled: 0, names: [] },
  { role: 'Refreshments Run',       slots: 2, filled: 1, names: ['Saoirse de Paor'] },
]

const DOCUMENTS = [
  { icon: '📋', name: 'Club Constitution 2024',            type: 'PDF',  size: '420 KB', date: '12 Jan 2024', category: 'Governance'   },
  { icon: '📋', name: 'AGM Minutes — August 2024',         type: 'PDF',  size: '180 KB', date: '15 Aug 2024', category: 'Governance'   },
  { icon: '📋', name: 'Code of Conduct — Players',         type: 'PDF',  size: '95 KB',  date: '1 Sep 2024',  category: 'Governance'   },
  { icon: '📊', name: 'U12 Training Plan — Aug 2026',      type: 'XLSX', size: '64 KB',  date: '2 Aug 2026',  category: 'Training'     },
  { icon: '📄', name: 'Blitz Pitch Map 2026',              type: 'PDF',  size: '2.1 MB', date: '1 Aug 2026',  category: 'Events'       },
  { icon: '📋', name: 'Medical Consent Form',              type: 'PDF',  size: '55 KB',  date: '1 Sep 2024',  category: 'Admin'        },
  { icon: '📷', name: 'Photography Permission — 2024/25',  type: 'PDF',  size: '48 KB',  date: '1 Sep 2024',  category: 'Admin'        },
  { icon: '📊', name: 'Club Accounts 2024–25',             type: 'XLSX', size: '128 KB', date: '30 Jun 2025', category: 'Finance'      },
]

// ─── Shared Micro Components ──────────────────────────────────────────────────

function Badge({ text, color = Y.y700 }: { text: string; color?: string }) {
  return (
    <span style={{ background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 999, padding: '2px 8px', ...F.body, fontSize: 11, fontWeight: 700, color }}>
      {text}
    </span>
  )
}

function UnreadDot({ count }: { count: number }) {
  if (!count) return null
  return (
    <div style={{ minWidth: 18, height: 18, borderRadius: 999, background: Y.y700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
      <span style={{ ...F.mono, fontSize: 10, fontWeight: 700, color: Y.navy }}>{count > 9 ? '9+' : count}</span>
    </div>
  )
}

function Avatar({ name, size = 36, color = Y.y700 }: { name: string; size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: size * 0.42, fontWeight: 900, color, flexShrink: 0 }}>
      {name[0]}
    </div>
  )
}

function EventTypePill({ type, cancelled }: { type: string; cancelled?: boolean }) {
  if (cancelled) return <Badge text="CANCELLED" color={Y.red} />
  const map: Record<string, { label: string; color: string }> = {
    training: { label: 'Training', color: Y.green },
    meeting:  { label: 'Meeting',  color: Y.blue  },
    blitz:    { label: 'Blitz',    color: Y.orange },
    match:    { label: 'Match',    color: Y.teal   },
  }
  const e = map[type] ?? { label: type, color: Y.muted }
  return <Badge text={e.label} color={e.color} />
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS
// ════════════════════════════════════════════════════════════════════════════

type Persona = 'parent' | 'coach' | 'player'

function MobileStatusBar() {
  return (
    <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ ...F.mono, fontSize: 12, color: Y.white, fontWeight: 700 }}>9:41</span>
      <span style={{ fontSize: 10, color: Y.white }}>▪▪▪ 🔋</span>
    </div>
  )
}

// ─── News Feed ────────────────────────────────────────────────────────────────
function NewsScreen({ persona }: { persona: Persona }) {
  const [reactions, setReactions] = useState<Record<number, boolean>>({})
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${Y.navy} 0%, #1a3a6e 60%, #1d4e8f 100%)`, paddingBottom: 24 }}>
        <MobileStatusBar />
        <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.55)', margin: 0 }}>Mon, 3 August 2026</p>
            <h1 style={{ ...F.display, fontSize: 24, fontWeight: 900, color: Y.white, margin: '2px 0', letterSpacing: '-0.04em' }}>Club News</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {persona === 'coach' && (
              <button style={{ height: 36, padding: '0 14px', background: Y.y700, border: 'none', borderRadius: 10, cursor: 'pointer', ...F.display, fontSize: 12, fontWeight: 800, color: Y.navy, boxShadow: Y.yellowSh }}>
                + Post
              </button>
            )}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: Y.soft, overflow: 'auto' }}>
        {/* Emergency / urgent alert banner */}
        {NEWS.filter(n => n.urgent).map(n => (
          <div key={n.id} style={{ margin: '14px 14px 0', background: `${Y.red}12`, border: `2px solid ${Y.red}40`, borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ ...F.display, fontSize: 11, fontWeight: 900, color: Y.red, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alert</span>
                <span style={{ ...F.body, fontSize: 11, color: Y.muted }}>{n.time}</span>
              </div>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: Y.ink }}>{n.title}</div>
              <p style={{ ...F.body, fontSize: 12, color: Y.sub, margin: '4px 0 0', lineHeight: 1.5 }}>{n.body}</p>
            </div>
          </div>
        ))}

        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NEWS.filter(n => !n.urgent).map(n => (
            <div key={n.id} style={{ background: Y.white, borderRadius: 18, border: `1.5px solid ${n.read ? Y.line : Y.y700 + '40'}`, padding: '14px 16px', boxShadow: Y.cardSh, borderLeft: `4px solid ${n.read ? Y.line : Y.y700}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <Badge text={n.channel} color={Y.navy} />
                    <span style={{ ...F.body, fontSize: 11, color: Y.muted }}>{n.time}</span>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: Y.y700, flexShrink: 0 }} />}
                  </div>
                  <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: Y.ink, lineHeight: 1.3 }}>{n.title}</div>
                </div>
              </div>
              <p style={{ ...F.body, fontSize: 13, color: Y.sub, margin: '0 0 12px', lineHeight: 1.6 }}>{n.body}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setReactions(r => ({ ...r, [n.id]: !r[n.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: reactions[n.id] ? `${Y.y700}20` : 'transparent', border: `1px solid ${reactions[n.id] ? Y.y700 : Y.line}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14 }}>👍</span>
                    <span style={{ ...F.mono, fontSize: 12, color: reactions[n.id] ? Y.y800 : Y.muted, fontWeight: 700 }}>{n.reactions.thumbsUp + (reactions[n.id] ? 1 : 0)}</span>
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${Y.line}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14 }}>💬</span>
                    <span style={{ ...F.mono, fontSize: 12, color: Y.muted, fontWeight: 700 }}>{n.comments}</span>
                  </button>
                </div>
                <div style={{ ...F.body, fontSize: 11, color: Y.muted }}>by {n.author}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function MessagesScreen() {
  const [openThread, setOpenThread] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  if (openThread !== null) {
    const thread = THREADS.find(t => t.id === openThread)!
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Chat header */}
        <div style={{ background: Y.white, borderBottom: `1px solid ${Y.line}`, padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setOpenThread(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: Y.muted }}>←</button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${Y.y700}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{thread.icon}</div>
          <div>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: Y.ink }}>{thread.name}</div>
            <div style={{ ...F.body, fontSize: 11, color: Y.muted }}>{thread.type === 'group' ? '32 members' : 'Online'}</div>
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: Y.soft }}>
          {/* Date header */}
          <div style={{ textAlign: 'center', ...F.body, fontSize: 11, color: Y.muted, padding: '4px 0' }}>Today</div>
          {CHAT_MSGS.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: msg.fromMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              {!msg.fromMe && <Avatar name={msg.from} size={28} color={Y.navy} />}
              <div style={{ maxWidth: '72%' }}>
                {!msg.fromMe && <div style={{ ...F.body, fontSize: 11, color: Y.muted, marginBottom: 3, paddingLeft: 4 }}>{msg.from}</div>}
                <div style={{
                  background: msg.fromMe ? Y.y700 : Y.white,
                  color: msg.fromMe ? Y.navy : Y.ink,
                  borderRadius: msg.fromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  border: msg.fromMe ? 'none' : `1px solid ${Y.line}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,.06)',
                }}>
                  <p style={{ ...F.body, fontSize: 14, margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                </div>
                <div style={{ ...F.mono, fontSize: 10, color: Y.muted, marginTop: 3, textAlign: msg.fromMe ? 'right' : 'left', padding: '0 4px' }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Compose bar */}
        <div style={{ background: Y.white, borderTop: `1px solid ${Y.line}`, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ flex: 1, background: Y.soft, borderRadius: 20, border: `1px solid ${Y.line}`, padding: '10px 16px' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message..." style={{ width: '100%', background: 'none', border: 'none', outline: 'none', ...F.body, fontSize: 14, color: Y.ink }} />
          </div>
          <button style={{ width: 42, height: 42, borderRadius: '50%', background: Y.y700, border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: Y.yellowSh, flexShrink: 0 }}>➤</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${Y.navy}, #1a3a6e)`, padding: '28px 20px 16px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: Y.white, margin: 0, letterSpacing: '-0.04em' }}>Messages</h2>
          <button style={{ width: 36, height: 36, borderRadius: 10, background: Y.y700, border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: Y.yellowSh }}>✏️</button>
        </div>
        {/* Search bar */}
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>🔍</span>
          <span style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Search messages…</span>
        </div>
      </div>
      <div style={{ flex: 1, background: Y.white }}>
        {THREADS.map(thread => (
          <button key={thread.id} onClick={() => setOpenThread(thread.id)}
            style={{ width: '100%', display: 'flex', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${Y.line}`, background: 'none', border: 'none', borderBottom: `1px solid ${Y.line}`, cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${Y.y700}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, position: 'relative' }}>
              {thread.icon}
              {thread.unread > 0 && (
                <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: Y.y700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...F.mono, fontSize: 9, fontWeight: 700, color: Y.navy }}>{thread.unread}</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ ...F.display, fontSize: 15, fontWeight: thread.unread ? 900 : 700, color: Y.ink }}>{thread.name}</span>
                <span style={{ ...F.mono, fontSize: 11, color: Y.muted, flexShrink: 0, marginLeft: 8 }}>{thread.time}</span>
              </div>
              <p style={{ ...F.body, fontSize: 13, color: thread.unread ? Y.ink : Y.muted, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: thread.unread ? 600 : 400 }}>
                {thread.muted ? '🔇 ' : ''}{thread.lastMsg}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Events ───────────────────────────────────────────────────────────────────
function EventsScreen({ persona }: { persona: Persona }) {
  const [rsvps, setRsvps] = useState<Record<number, string>>({ 1: 'yes' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${Y.navy}, #1a3a6e)`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: Y.white, margin: 0, letterSpacing: '-0.04em' }}>Events</h2>
            <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.55)', margin: '4px 0 0' }}>August 2026</p>
          </div>
          {(persona === 'coach') && (
            <button style={{ height: 36, padding: '0 14px', background: Y.y700, border: 'none', borderRadius: 10, cursor: 'pointer', ...F.display, fontSize: 12, fontWeight: 800, color: Y.navy, boxShadow: Y.yellowSh }}>
              + Event
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, background: Y.soft, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EVENTS.map(ev => {
          const myRsvp = rsvps[ev.id]
          return (
            <div key={ev.id} style={{ background: Y.white, borderRadius: 18, border: `1.5px solid ${ev.cancelled ? Y.red + '40' : Y.line}`, padding: '16px', boxShadow: Y.cardSh, opacity: ev.cancelled ? 0.75 : 1 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Date block */}
                <div style={{ width: 48, height: 52, borderRadius: 12, background: ev.cancelled ? `${Y.red}15` : `${Y.y700}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${ev.cancelled ? Y.red + '30' : Y.y700 + '30'}` }}>
                  <div style={{ ...F.display, fontSize: 11, fontWeight: 900, color: ev.cancelled ? Y.red : Y.y800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ev.date.split(' ')[0]}</div>
                  <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: ev.cancelled ? Y.red : Y.navy, lineHeight: 1 }}>{ev.date.split(' ')[1]}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                    <EventTypePill type={ev.type} cancelled={ev.cancelled} />
                    <span style={{ ...F.mono, fontSize: 11, color: Y.muted }}>{ev.time}</span>
                  </div>
                  <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: ev.cancelled ? Y.red : Y.ink }}>{ev.title}</div>
                  <div style={{ ...F.body, fontSize: 12, color: Y.muted, marginTop: 3 }}>📍 {ev.venue}</div>
                  {/* RSVP counts */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <span style={{ ...F.body, fontSize: 11, color: Y.green }}>✓ {ev.going}</span>
                    <span style={{ ...F.body, fontSize: 11, color: Y.red }}>✗ {ev.notGoing}</span>
                    <span style={{ ...F.body, fontSize: 11, color: Y.muted }}>? {ev.maybe}</span>
                  </div>
                </div>
              </div>
              {/* RSVP buttons */}
              {!ev.cancelled && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${Y.line}` }}>
                  {[{ key:'yes', label:'Going ✓', color:Y.green }, { key:'no', label:'Not going', color:Y.red }, { key:'maybe', label:'Maybe', color:Y.muted }].map(b => (
                    <button key={b.key} onClick={() => setRsvps(r => ({ ...r, [ev.id]: b.key }))}
                      style={{ flex: 1, height: 32, border: `1.5px solid ${myRsvp === b.key ? b.color : Y.line}`, borderRadius: 9, cursor: 'pointer', background: myRsvp === b.key ? `${b.color}15` : 'transparent', ...F.display, fontSize: 11, fontWeight: 800, color: myRsvp === b.key ? b.color : Y.muted, transition: 'all .15s' }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Polls ────────────────────────────────────────────────────────────────────
function PollsScreen() {
  const [votes, setVotes] = useState<Record<number, string>>({ 1: 'Yes, I can make it', 2: '45 mins before' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${Y.navy}, #1a3a6e)`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: Y.white, margin: '10px 0 0', letterSpacing: '-0.04em' }}>Polls</h2>
      </div>
      <div style={{ flex: 1, background: Y.soft, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {POLLS.map(poll => {
          const myVote = votes[poll.id]
          const maxVotes = Math.max(...poll.options.map(o => o.votes))
          return (
            <div key={poll.id} style={{ background: Y.white, borderRadius: 20, border: `1.5px solid ${poll.closed ? Y.line : Y.y700 + '40'}`, padding: '18px', boxShadow: Y.cardSh }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 10 }}>
                <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: Y.ink }}>{poll.title}</div>
                {poll.closed
                  ? <Badge text="Closed" color={Y.muted} />
                  : <Badge text="Open" color={Y.green} />
                }
              </div>
              <p style={{ ...F.body, fontSize: 12, color: Y.muted, margin: '0 0 14px' }}>{poll.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {poll.options.map(opt => {
                  const pct = Math.round((opt.votes / poll.votes) * 100)
                  const selected = myVote === opt.label
                  return (
                    <button key={opt.label}
                      onClick={() => !poll.closed && setVotes(v => ({ ...v, [poll.id]: opt.label }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `2px solid ${selected ? opt.color : Y.line}`, background: selected ? `${opt.color}10` : Y.soft, cursor: poll.closed ? 'default' : 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `${opt.color}15`, transition: 'width .5s', borderRadius: 10 }} />
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ ...F.display, fontSize: 13, fontWeight: 800, color: selected ? opt.color : Y.ink }}>{opt.label}</span>
                        <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: opt.color }}>{pct}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Y.line}` }}>
                <span style={{ ...F.body, fontSize: 11, color: Y.muted }}>{poll.votes} of {poll.total} voted</span>
                <span style={{ ...F.body, fontSize: 11, color: Y.muted }}>Expires: {poll.expires}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
const MOBILE_TABS = [
  { id: 'news',     icon: '📰', label: 'News'    },
  { id: 'messages', icon: '💬', label: 'Messages'},
  { id: 'events',   icon: '📅', label: 'Events'  },
  { id: 'polls',    icon: '📊', label: 'Polls'   },
]

function MobileBottomNav({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  const totalUnread = THREADS.reduce((s, t) => s + t.unread, 0)
  return (
    <div style={{ background: Y.white, borderTop: `2px solid ${Y.line}`, display: 'flex', padding: '6px 0 16px', flexShrink: 0 }}>
      {MOBILE_TABS.map(item => {
        const isActive = active === item.id
        const hasUnread = item.id === 'messages' && totalUnread > 0
        return (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: isActive ? Y.y700 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: isActive ? Y.yellowSh : 'none', transition: 'all .2s', position: 'relative' }}>
              {item.icon}
              {hasUnread && !isActive && (
                <div style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: Y.red, border: '2px solid white' }} />
              )}
            </div>
            <span style={{ ...F.display, fontSize: 10, fontWeight: isActive ? 900 : 600, color: isActive ? Y.y800 : Y.muted }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP — CLUB MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

function DesktopSidebar({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  const items = [
    { id: 'compose',    icon: '✏️', label: 'Compose'          },
    { id: 'news',       icon: '📰', label: 'News & Broadcasts' },
    { id: 'messages',   icon: '💬', label: 'Messages'          },
    { id: 'events',     icon: '📅', label: 'Events'            },
    { id: 'volunteers', icon: '🙋', label: 'Volunteers'        },
    { id: 'documents',  icon: '📁', label: 'Documents'         },
    { id: 'analytics',  icon: '📊', label: 'Analytics'         },
    { id: 'emergency',  icon: '🚨', label: 'Emergency Alert'   },
  ]

  return (
    <div style={{ width: 232, background: Y.navy, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Club branding */}
      <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={spraioIcon} alt="Spraoi Sports" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ ...F.display, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Spraoi Sports</div>
            <div style={{ ...F.body, fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2, whiteSpace: 'nowrap' }}>St. Finbarr&apos;s GAA</div>
          </div>
        </div>
      </div>
      {/* Channels section */}
      <div style={{ padding: '4px 10px 6px', ...F.body, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Channels</div>
      <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {CHANNELS.map(ch => (
          <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer' }}>
            <span style={{ fontSize: 14 }}>{ch.icon}</span>
            <span style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.6)', flex: 1 }}>{ch.name}</span>
            {ch.unread > 0 && <UnreadDot count={ch.unread} />}
          </div>
        ))}
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 16px 12px' }} />
      {/* Tools */}
      <div style={{ padding: '0 10px 4px', ...F.body, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tools</div>
      <nav style={{ flex: 1, padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const isActive = active === item.id
          const isEmergency = item.id === 'emergency'
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: isActive ? (isEmergency ? `${Y.red}30` : `${Y.y700}20`) : 'transparent', borderLeft: `3px solid ${isActive ? (isEmergency ? Y.red : Y.y700) : 'transparent'}`, transition: 'all .15s' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ ...F.display, fontSize: 13, fontWeight: isActive ? 800 : 500, color: isActive ? (isEmergency ? Y.red : Y.y400) : 'rgba(255,255,255,.5)' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      {/* Admin */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar name="Club Admin" size={34} color={Y.y700} />
          <div>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: Y.white }}>Club Admin</div>
            <div style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Administrator</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Compose ──────────────────────────────────────────────────────────────────
function ComposeScreen() {
  const [targetGroup, setTargetGroup] = useState('All Members')
  const [msgType, setMsgType] = useState('news')
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div>
        <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: Y.ink }}>Compose & Send</div>
        <p style={{ ...F.body, fontSize: 13, color: Y.muted, margin: '4px 0 0' }}>Create a news post, message broadcast, or event announcement</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Main compose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type selector */}
          <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '16px', boxShadow: Y.cardSh }}>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 10 }}>Post type</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['news','📰','News Post'],['message','💬','Message'],['event','📅','Event'],['poll','📊','Poll']].map(([id, icon, label]) => (
                <button key={id} onClick={() => setMsgType(id)}
                  style={{ flex: 1, padding: '10px 0', border: `2px solid ${msgType === id ? Y.y700 : Y.line}`, borderRadius: 12, background: msgType === id ? `${Y.y700}10` : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ ...F.display, fontSize: 11, fontWeight: 800, color: msgType === id ? Y.y800 : Y.muted }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Message body */}
          <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '16px', boxShadow: Y.cardSh }}>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 10 }}>Message</div>
            <input placeholder="Title (e.g. Training Update — Thursday 7 Aug)"
              style={{ width: '100%', height: 44, borderRadius: 10, border: `1px solid ${Y.line}`, padding: '0 14px', ...F.display, fontSize: 14, fontWeight: 700, color: Y.ink, background: Y.soft, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
            <textarea placeholder="Write your message here… Be clear and concise. Members appreciate brevity." rows={5}
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${Y.line}`, padding: '12px 14px', ...F.body, fontSize: 14, color: Y.ink, background: Y.soft, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
            {/* Formatting toolbar */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['B', 'I', 'U', '🔗', '📎', '📷'].map(btn => (
                <button key={btn} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${Y.line}`, background: Y.soft, cursor: 'pointer', ...F.display, fontSize: 12, fontWeight: 900, color: Y.sub }}>
                  {btn}
                </button>
              ))}
            </div>
          </div>
          {/* Send button */}
          <button style={{ height: 52, background: `linear-gradient(135deg, ${Y.y700}, ${Y.y600})`, border: 'none', borderRadius: 14, cursor: 'pointer', ...F.display, fontSize: 16, fontWeight: 900, color: Y.navy, boxShadow: Y.yellowSh, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span>Send to {targetGroup}</span>
            <span>→</span>
          </button>
        </div>
        {/* Settings panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Target audience */}
          <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '16px', boxShadow: Y.cardSh }}>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 12 }}>Send to</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHANNELS.map(ch => (
                <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: `1.5px solid ${targetGroup === ch.name ? Y.y700 : Y.line}`, cursor: 'pointer', background: targetGroup === ch.name ? `${Y.y700}10` : 'transparent' }}>
                  <input type="radio" name="target" checked={targetGroup === ch.name} onChange={() => setTargetGroup(ch.name)} style={{ accentColor: Y.y700 }} />
                  <span style={{ fontSize: 16 }}>{ch.icon}</span>
                  <span style={{ ...F.body, fontSize: 13, fontWeight: 600, color: Y.ink, flex: 1 }}>{ch.name}</span>
                  <span style={{ ...F.mono, fontSize: 11, color: Y.muted }}>{ch.count}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Delivery channels */}
          <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '16px', boxShadow: Y.cardSh }}>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 12 }}>Deliver via</div>
            {[['push', '🔔', 'Push Notification', pushEnabled, setPushEnabled], ['email', '📧', 'Email', emailEnabled, setEmailEnabled], ['sms', '📱', 'SMS', smsEnabled, setSmsEnabled]].map(([id, icon, label, enabled, setEnabled]) => (
              <label key={id as string} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${Y.line}`, cursor: 'pointer' }}>
                <span style={{ fontSize: 18 }}>{icon as string}</span>
                <span style={{ ...F.body, fontSize: 13, fontWeight: 600, color: Y.ink, flex: 1 }}>{label as string}</span>
                <div onClick={() => (setEnabled as (v: boolean) => void)(!enabled as boolean)}
                  style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? Y.y700 : Y.line, position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: Y.white, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Volunteer Management ─────────────────────────────────────────────────────
function VolunteersScreen() {
  const filled = VOLUNTEERS.reduce((s, v) => s + v.filled, 0)
  const total  = VOLUNTEERS.reduce((s, v) => s + v.slots, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: Y.ink }}>Volunteer Management</div>
          <p style={{ ...F.body, fontSize: 13, color: Y.muted, margin: '4px 0 0' }}>Fingallians U12 Blitz — Saturday 22 August 2026</p>
        </div>
        <button style={{ height: 44, padding: '0 20px', background: Y.y700, border: 'none', borderRadius: 12, cursor: 'pointer', ...F.display, fontSize: 14, fontWeight: 800, color: Y.navy, boxShadow: Y.yellowSh }}>
          📢 Send Volunteer Appeal
        </button>
      </div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[
          { label:'Roles Filled',    value:`${filled} / ${total}`, icon:'✅', color:Y.green  },
          { label:'Roles Open',      value:`${total - filled}`,    icon:'⏳', color:Y.orange },
          { label:'Total Volunteers',value:`${filled}`,             icon:'🙋', color:Y.y700  },
        ].map(s => (
          <div key={s.label} style={{ background: Y.white, borderRadius: 18, border: `1px solid ${Y.line}`, borderTop: `4px solid ${s.color}`, padding: '18px 20px', boxShadow: Y.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...F.body, fontSize: 11, fontWeight: 700, color: Y.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ ...F.display, fontSize: 26, fontWeight: 900, color: Y.ink, marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Overall progress */}
      <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '18px 20px', boxShadow: Y.cardSh }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...F.display, fontSize: 14, fontWeight: 900, color: Y.ink }}>Overall recruitment</span>
          <span style={{ ...F.mono, fontSize: 13, fontWeight: 700, color: Y.y800 }}>{filled}/{total}</span>
        </div>
        <div style={{ height: 10, background: Y.line, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${(filled / total) * 100}%`, height: '100%', background: `linear-gradient(90deg,${Y.y700},${Y.y500})`, borderRadius: 5, boxShadow: Y.yellowSh, transition: 'width .5s' }} />
        </div>
      </div>
      {/* Role table */}
      <div style={{ background: Y.white, borderRadius: 20, border: `1px solid ${Y.line}`, overflow: 'hidden', boxShadow: Y.cardSh }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 1fr', gap: 8, padding: '12px 20px', background: Y.soft, ...F.mono, fontSize: 11, fontWeight: 700, color: Y.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div>Role</div><div style={{ textAlign:'center' }}>Slots</div><div style={{ textAlign:'center' }}>Filled</div><div>Volunteers</div>
        </div>
        {VOLUNTEERS.map((v, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 1fr', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${Y.line}`, alignItems: 'center', background: v.filled < v.slots ? `${Y.orange}05` : 'transparent' }}>
            <div style={{ ...F.display, fontSize: 14, fontWeight: 800, color: Y.ink }}>{v.role}</div>
            <div style={{ textAlign: 'center', ...F.mono, fontSize: 13, color: Y.muted, fontWeight: 700 }}>{v.slots}</div>
            <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
              <Badge text={`${v.filled}/${v.slots}`} color={v.filled >= v.slots ? Y.green : v.filled > 0 ? Y.orange : Y.red} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {v.names.map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, background: Y.soft, border: `1px solid ${Y.line}`, borderRadius: 999, padding: '3px 10px' }}>
                  <span style={{ ...F.body, fontSize: 12, color: Y.ink }}>{n}</span>
                </div>
              ))}
              {v.filled < v.slots && (
                <div style={{ background: `${Y.orange}15`, border: `1px dashed ${Y.orange}60`, borderRadius: 999, padding: '3px 12px', ...F.body, fontSize: 12, color: Y.orange }}>
                  +{v.slots - v.filled} needed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Documents ────────────────────────────────────────────────────────────────
function DocumentsScreen() {
  const categories = [...new Set(DOCUMENTS.map(d => d.category))]
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.category === activeCategory)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: Y.ink }}>Document Library</div>
        <button style={{ height: 40, padding: '0 18px', background: Y.y700, border: 'none', borderRadius: 10, cursor: 'pointer', ...F.display, fontSize: 13, fontWeight: 800, color: Y.navy, boxShadow: Y.yellowSh }}>
          ↑ Upload
        </button>
      </div>
      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['All', ...categories].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ height: 32, padding: '0 14px', border: `1.5px solid ${activeCategory === cat ? Y.y700 : Y.line}`, borderRadius: 999, background: activeCategory === cat ? `${Y.y700}15` : Y.white, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: activeCategory === cat ? Y.y800 : Y.muted, transition: 'all .15s' }}>
            {cat}
          </button>
        ))}
      </div>
      {/* Document table */}
      <div style={{ background: Y.white, borderRadius: 20, border: `1px solid ${Y.line}`, overflow: 'hidden', boxShadow: Y.cardSh }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 100px', gap: 8, padding: '12px 20px', background: Y.soft, ...F.mono, fontSize: 11, fontWeight: 700, color: Y.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div>Name</div><div>Type</div><div>Size</div><div>Date</div><div>Category</div>
        </div>
        {filtered.map((doc, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 100px', gap: 8, padding: '13px 20px', borderBottom: `1px solid ${Y.line}`, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{doc.icon}</span>
              <span style={{ ...F.display, fontSize: 14, fontWeight: 700, color: Y.ink }}>{doc.name}</span>
            </div>
            <Badge text={doc.type} color={doc.type === 'PDF' ? Y.red : Y.blue} />
            <span style={{ ...F.mono, fontSize: 12, color: Y.muted }}>{doc.size}</span>
            <span style={{ ...F.body, fontSize: 12, color: Y.muted }}>{doc.date}</span>
            <Badge text={doc.category} color={Y.navy} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Emergency Alert ──────────────────────────────────────────────────────────
function EmergencyScreen() {
  const [sent, setSent] = useState(false)
  const [target, setTarget] = useState('All Members')
  const [msg, setMsg] = useState('')

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center', gap: 20 }}>
        <span style={{ fontSize: 64 }}>✅</span>
        <div style={{ ...F.display, fontSize: 24, fontWeight: 900, color: Y.ink }}>Alert Sent</div>
        <p style={{ ...F.body, fontSize: 16, color: Y.sub, maxWidth: 400, lineHeight: 1.6 }}>Your emergency alert has been sent to all {CHANNELS.find(c => c.name === target)?.count ?? 156} members via push notification, email, and SMS.</p>
        <button onClick={() => { setSent(false); setMsg('') }} style={{ height: 48, padding: '0 28px', background: Y.y700, border: 'none', borderRadius: 12, cursor: 'pointer', ...F.display, fontSize: 15, fontWeight: 800, color: Y.navy, boxShadow: Y.yellowSh }}>
          Send another alert
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ background: `${Y.red}10`, border: `2px solid ${Y.red}30`, borderRadius: 20, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 28 }}>🚨</span>
        <div>
          <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: Y.red }}>Emergency Broadcast</div>
          <p style={{ ...F.body, fontSize: 13, color: Y.sub, margin: '4px 0 0', lineHeight: 1.5 }}>
            Use this tool only for urgent situations — training cancellations, safety concerns, venue changes at short notice. Messages are delivered immediately via all channels.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Target */}
        <div style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, padding: '18px 20px', boxShadow: Y.cardSh }}>
          <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 12 }}>Send to</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CHANNELS.map(ch => (
              <button key={ch.id} onClick={() => setTarget(ch.name)}
                style={{ height: 36, padding: '0 14px', border: `2px solid ${target === ch.name ? Y.red : Y.line}`, borderRadius: 10, background: target === ch.name ? `${Y.red}10` : Y.soft, cursor: 'pointer', ...F.body, fontSize: 13, fontWeight: 700, color: target === ch.name ? Y.red : Y.muted }}>
                {ch.icon} {ch.name} ({ch.count})
              </button>
            ))}
          </div>
        </div>
        {/* Message */}
        <div style={{ background: Y.white, borderRadius: 16, border: `2px solid ${Y.red}20`, padding: '18px 20px', boxShadow: Y.cardSh }}>
          <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.ink, marginBottom: 10 }}>Alert message</div>
          <textarea value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="e.g. Training CANCELLED — waterlogged pitch. All sessions postponed until Thursday. Sorry for the short notice." rows={4}
            style={{ width: '100%', borderRadius: 12, border: `1.5px solid ${Y.line}`, padding: '12px 14px', ...F.body, fontSize: 14, color: Y.ink, background: Y.soft, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
          <p style={{ ...F.body, fontSize: 11, color: Y.muted, marginTop: 8 }}>Keep alerts short and actionable. Members receive this via push, email, and SMS.</p>
        </div>
        {/* Delivery note */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[['🔔','Push','Immediate'],['📧','Email','Immediate'],['📱','SMS','Immediate']].map(([icon, ch, timing]) => (
            <div key={ch} style={{ flex: 1, background: Y.white, borderRadius: 12, border: `1px solid ${Y.line}`, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: Y.cardSh }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ ...F.display, fontSize: 12, fontWeight: 900, color: Y.ink }}>{ch}</span>
              <Badge text={timing as string} color={Y.red} />
            </div>
          ))}
        </div>
        {/* Send button */}
        <button onClick={() => msg.trim() && setSent(true)}
          style={{ height: 56, background: msg.trim() ? `linear-gradient(135deg,${Y.red},#c62828)` : Y.line, border: 'none', borderRadius: 16, cursor: msg.trim() ? 'pointer' : 'not-allowed', ...F.display, fontSize: 16, fontWeight: 900, color: Y.white, boxShadow: msg.trim() ? '0 8px 24px rgba(229,57,53,.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          🚨 Send Emergency Alert to {target}
        </button>
      </div>
    </div>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function AnalyticsScreen() {
  const msgs = [
    { title: 'Training CANCELLED — Saturday', sent: 'Mon 3 Aug', channel: 'All Members', opens: 142, total: 156, clicks: 0 },
    { title: 'U12 Blitz — Volunteers Needed!', sent: 'Sun 2 Aug', channel: 'All Members', opens: 118, total: 156, clicks: 31 },
    { title: 'Club AGM — 12 August', sent: 'Mon 3 Aug', channel: 'All Members', opens: 99, total: 156, clicks: 8 },
    { title: 'Training drill plan — Thursday', sent: 'Mon 3 Aug', channel: 'Coaches', opens: 7, total: 8, clicks: 5 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: Y.ink }}>Analytics</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label:'Messages Sent', value:'24',  icon:'📤', color:Y.y700 },
          { label:'Avg Open Rate', value:'78%', icon:'📭', color:Y.green },
          { label:'Events Created', value:'6',  icon:'📅', color:Y.blue  },
          { label:'Poll Responses', value:'89%',icon:'📊', color:Y.orange},
        ].map(s => (
          <div key={s.label} style={{ background: Y.white, borderRadius: 16, border: `1px solid ${Y.line}`, borderTop: `4px solid ${s.color}`, padding: '18px', boxShadow: Y.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...F.body, fontSize: 10, fontWeight: 700, color: Y.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ ...F.display, fontSize: 26, fontWeight: 900, color: Y.ink, marginTop: 10 }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Recent messages performance */}
      <div style={{ background: Y.white, borderRadius: 20, border: `1px solid ${Y.line}`, overflow: 'hidden', boxShadow: Y.cardSh }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${Y.line}`, ...F.display, fontSize: 15, fontWeight: 900, color: Y.ink }}>Recent Broadcasts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px', gap: 8, padding: '12px 20px', background: Y.soft, ...F.mono, fontSize: 11, fontWeight: 700, color: Y.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div>Message</div><div>Channel</div><div style={{ textAlign:'right' }}>Opens</div><div style={{ textAlign:'right' }}>Open %</div><div style={{ textAlign:'right' }}>Clicks</div>
        </div>
        {msgs.map((m, i) => {
          const pct = Math.round((m.opens / m.total) * 100)
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px', gap: 8, padding: '13px 20px', borderBottom: `1px solid ${Y.line}`, alignItems: 'center' }}>
              <div>
                <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: Y.ink }}>{m.title}</div>
                <div style={{ ...F.body, fontSize: 11, color: Y.muted }}>{m.sent}</div>
              </div>
              <Badge text={m.channel} color={Y.navy} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...F.mono, fontSize: 12, color: Y.ink, fontWeight: 700 }}>{m.opens}</div>
                <div style={{ width: 60, marginLeft: 'auto', marginTop: 4 }}>
                  <div style={{ height: 4, background: Y.line, borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? Y.green : Y.y700, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
              <span style={{ ...F.mono, fontSize: 13, fontWeight: 700, color: pct >= 75 ? Y.green : Y.y800, textAlign: 'right' }}>{pct}%</span>
              <span style={{ ...F.mono, fontSize: 12, color: Y.muted, textAlign: 'right' }}>{m.clicks}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Desktop messages (Slack-style simple view) ───────────────────────────────
function DesktopMessages() {
  const [activeChannel, setActiveChannel] = useState(1)
  const thread = THREADS[activeChannel]

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', borderRadius: 20, overflow: 'hidden', border: `1px solid ${Y.line}`, background: Y.white, boxShadow: Y.cardSh }}>
      {/* Thread list */}
      <div style={{ width: 260, borderRight: `1px solid ${Y.line}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${Y.line}` }}>
          <div style={{ background: Y.soft, borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: Y.muted }}>🔍</span>
            <span style={{ ...F.body, fontSize: 13, color: Y.muted }}>Search…</span>
          </div>
        </div>
        {THREADS.map((t, i) => (
          <button key={t.id} onClick={() => setActiveChannel(i)}
            style={{ display: 'flex', gap: 10, padding: '12px 16px', border: 'none', borderBottom: `1px solid ${Y.line}`, background: activeChannel === i ? `${Y.y700}10` : 'transparent', cursor: 'pointer', textAlign: 'left', alignItems: 'center', borderLeft: `3px solid ${activeChannel === i ? Y.y700 : 'transparent'}` }}>
            <div style={{ fontSize: 22 }}>{t.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ ...F.display, fontSize: 13, fontWeight: t.unread ? 900 : 700, color: Y.ink }}>{t.name}</span>
                <span style={{ ...F.mono, fontSize: 10, color: Y.muted }}>{t.time}</span>
              </div>
              <p style={{ ...F.body, fontSize: 11, color: Y.muted, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.lastMsg}</p>
            </div>
            {t.unread > 0 && <UnreadDot count={t.unread} />}
          </button>
        ))}
      </div>
      {/* Chat view */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${Y.line}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{thread.icon}</span>
          <div>
            <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: Y.ink }}>{thread.name}</div>
            <div style={{ ...F.body, fontSize: 12, color: Y.muted }}>32 members</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: Y.soft }}>
          <div style={{ textAlign: 'center', ...F.body, fontSize: 11, color: Y.muted }}>Today, 3 August 2026</div>
          {CHAT_MSGS.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={msg.from} size={32} color={msg.fromMe ? Y.y700 : Y.navy} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: msg.fromMe ? Y.y800 : Y.ink }}>{msg.fromMe ? 'You' : msg.from}</span>
                  <span style={{ ...F.mono, fontSize: 10, color: Y.muted }}>{msg.time}</span>
                </div>
                <div style={{ background: Y.white, borderRadius: '4px 16px 16px 16px', padding: '10px 14px', border: `1px solid ${Y.line}`, display: 'inline-block', maxWidth: '80%' }}>
                  <p style={{ ...F.body, fontSize: 14, color: Y.ink, margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${Y.line}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: Y.soft, borderRadius: 12, border: `1px solid ${Y.line}`, padding: '10px 16px', ...F.body, fontSize: 14, color: Y.muted }}>
            Message {thread.name}…
          </div>
          <button style={{ width: 40, height: 40, borderRadius: 10, background: Y.y700, border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: Y.yellowSh }}>➤</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function Connect() {
  const [mode, setMode] = useState<'mobile'|'desktop'>('mobile')
  const [persona, setPersona] = useState<Persona>('parent')
  const [mScreen, setMScreen] = useState('news')
  const [dScreen, setDScreen] = useState('compose')

  const renderMobile = () => {
    switch (mScreen) {
      case 'news':     return <NewsScreen persona={persona} />
      case 'messages': return <MessagesScreen />
      case 'events':   return <EventsScreen persona={persona} />
      case 'polls':    return <PollsScreen />
      default:         return <NewsScreen persona={persona} />
    }
  }

  const renderDesktop = () => {
    switch (dScreen) {
      case 'compose':    return <ComposeScreen />
      case 'news':       return <AnalyticsScreen />
      case 'messages':   return <DesktopMessages />
      case 'events':     return <EventsScreen persona="coach" />
      case 'volunteers': return <VolunteersScreen />
      case 'documents':  return <DocumentsScreen />
      case 'analytics':  return <AnalyticsScreen />
      case 'emergency':  return <EmergencyScreen />
      default:           return <ComposeScreen />
    }
  }

  const totalUnread = THREADS.reduce((s, t) => s + t.unread, 0) + NEWS.filter(n => !n.read).length

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...F.body }}>
      {/* Meta bar */}
      <div style={{ background: Y.navy, borderBottom: '1px solid rgba(255,255,255,.08)', padding: '0 20px', height: 44, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <img src={spraioIcon} alt="Spraoi" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: Y.white }}>Spraoi Connect</span>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['mobile','desktop'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === m ? Y.y700 : 'transparent', color: mode === m ? Y.navy : 'rgba(255,255,255,.5)', ...F.body, fontSize: 11, fontWeight: 700, transition: 'all .15s' }}>
              {m === 'mobile' ? '📱 Mobile' : '🖥 Club Mgmt'}
            </button>
          ))}
        </div>
        {mode === 'mobile' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['parent','coach','player'] as const).map(p => (
              <button key={p} onClick={() => setPersona(p)} style={{ height: 26, padding: '0 12px', borderRadius: 5, border: 'none', cursor: 'pointer', background: persona === p ? 'rgba(255,255,255,.15)' : 'transparent', color: persona === p ? Y.white : 'rgba(255,255,255,.4)', ...F.body, fontSize: 11, fontWeight: 700, transition: 'all .15s', textTransform: 'capitalize' }}>
                {p}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {(mode === 'mobile'
            ? [['news','News'],['messages','Messages'],['events','Events'],['polls','Polls']]
            : [['compose','Compose'],['messages','Messages'],['events','Events'],['volunteers','Volunteers'],['documents','Documents'],['analytics','Analytics'],['emergency','🚨 Alert']]
          ).map(([id, label]) => (
            <button key={id} onClick={() => mode === 'mobile' ? setMScreen(id) : setDScreen(id)}
              style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: (mode === 'mobile' ? mScreen : dScreen) === id ? (id === 'emergency' ? `${Y.red}60` : `${Y.y700}50`) : 'transparent', color: (mode === 'mobile' ? mScreen : dScreen) === id ? Y.white : 'rgba(255,255,255,.45)', ...F.body, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
        {/* Unread indicator */}
        {totalUnread > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: Y.y700 }} />
            <span style={{ ...F.mono, fontSize: 11, color: Y.y400, fontWeight: 700 }}>{totalUnread} unread</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {mode === 'mobile' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${Y.navy} 0%, #1e3a7e 50%, #1a5276 100%)`, padding: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10%', left: '8%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(251,192,45,.05)' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 90, height: 90, borderRadius: '50%', background: 'rgba(251,192,45,.04)' }} />
            <div style={{
              width: 393, height: '100%', maxHeight: 852,
              borderRadius: 46, border: '8px solid #050d1a',
              background: Y.white, overflow: 'hidden', position: 'relative',
              boxShadow: '0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, overflow: 'auto' }}>{renderMobile()}</div>
              <MobileBottomNav active={mScreen} onNav={setMScreen} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <DesktopSidebar active={dScreen} onNav={setDScreen} />
            <div style={{ flex: 1, overflow: 'auto', background: Y.soft }}>
              {/* Topbar */}
              <div style={{ background: Y.white, borderBottom: `1px solid ${Y.line}`, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: Y.cardSh }}>
                <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: Y.ink }}>
                  {{ compose:'Compose & Send', news:'Analytics', messages:'Messages', events:'Events', volunteers:'Volunteers', documents:'Document Library', analytics:'Analytics', emergency:'Emergency Broadcast' }[dScreen]}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ ...F.body, fontSize: 12, color: Y.muted }}>Mon 3 August 2026</span>
                  <div style={{ height: 20, width: 1, background: Y.line }} />
                  <span style={{ ...F.mono, fontSize: 12, color: Y.y700, fontWeight: 700 }}>{totalUnread} unread</span>
                </div>
              </div>
              <div style={{ padding: '28px 32px' }}>{renderDesktop()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
