/**
 * Spraoi Journey — Children's Gamified Sports World
 *
 * Module colour: Light Blue (#29b6f6)
 * Mascots: CENTRAL characters — guide, celebrate, teach, cheer everywhere.
 * Design inspiration: Nintendo · Pokémon · Disney · Duolingo
 * Primary: Mobile (child). Desktop: Companion (parent).
 *
 * Screens: Home · Avatar · Adventure Map · Daily Missions · XP · Achievements ·
 *          Badges · Learning Path · Coach Messages · Videos · Season Progress ·
 *          Friends · Rewards · Level Up
 */

import { useState, useEffect, useRef } from 'react'
import spraioIcon from './imports/spraoi-icon.png'
import otisSrc from './imports/Otis.png'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const J = {
  // Sky Blue ramp
  sky50:  '#e1f5fe',
  sky100: '#b3e5fc',
  sky200: '#81d4fa',
  sky300: '#4fc3f7',
  sky400: '#29b6f6',   // primary
  sky500: '#03a9f4',
  sky600: '#039be5',
  sky700: '#0288d1',
  sky800: '#0277bd',
  sky900: '#01579b',
  // XP / Achievement gold
  gold:   '#fbc02d',
  goldDk: '#f9a825',
  star:   '#ffeb3b',
  // Fun accents
  green:  '#43a047',
  coral:  '#f4511e',
  purple: '#7c4dff',
  mint:   '#00bfa5',
  // Neutrals — soft and warm
  ink:    '#1a2940',
  sub:    '#4a5e78',
  muted:  '#8fa3bc',
  line:   '#deeaf5',
  soft:   '#f0f8ff',
  white:  '#ffffff',
  // Shadows
  cardSh: '0 4px 20px rgba(41,182,246,.12)',
  blueSh: '0 8px 28px rgba(2,136,209,.28)',
  goldSh: '0 8px 24px rgba(251,192,45,.35)',
}

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body:    { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono:    { fontFamily: "'JetBrains Mono', monospace" },
}

// ─── Player Data ──────────────────────────────────────────────────────────────
const PLAYER = {
  name: 'Ciarán',
  level: 7,
  levelName: 'Blue Hawk',
  xp: 1240,
  xpToNext: 1500,
  totalXP: 8450,
  streak: 7,
  club: 'St. Finbarr\'s',
  avatar: { jersey: J.sky400, boots: '#f4511e', hair: '#3e2723' },
}

const MISSIONS = [
  { id:1, icon:'🏃', title:'Complete today\'s training', desc:'Attend and complete the full session', xp:100, progress:0, max:1, done:false, type:'training' },
  { id:2, icon:'🎯', title:'Score 10 kick points', desc:'Practice kicking at the posts', xp:80, progress:6, max:10, done:false, type:'skill' },
  { id:3, icon:'📺', title:'Watch hand-passing video', desc:'Master the basics', xp:40, progress:1, max:1, done:true, type:'video' },
  { id:4, icon:'🧠', title:'Answer 5 GAA quiz questions', desc:'Test your knowledge', xp:60, progress:3, max:5, done:false, type:'quiz' },
  { id:5, icon:'🤝', title:'Cheer on a teammate', desc:'Leave encouragement on a friend\'s post', xp:30, progress:0, max:1, done:false, type:'social' },
]

const BADGES = [
  { id:1,  emoji:'⚽', name:'First Touch',      desc:'Attended your first training session',    earned:true,  rarity:'common'    },
  { id:2,  emoji:'🔥', name:'Hot Streak',       desc:'7 days active in a row',                 earned:true,  rarity:'uncommon'  },
  { id:3,  emoji:'🎯', name:'Dead Eye',          desc:'50 kick points scored in practice',      earned:true,  rarity:'uncommon'  },
  { id:4,  emoji:'🏆', name:'Blitz Hero',        desc:'Played in a Fingallians Blitz',          earned:true,  rarity:'rare'      },
  { id:5,  emoji:'⭐', name:'100 Club',          desc:'Attended 100 training sessions',         earned:false, rarity:'rare'      },
  { id:6,  emoji:'👑', name:'Team Captain',      desc:'Named captain for a match',              earned:false, rarity:'epic'      },
  { id:7,  emoji:'🦅', name:'Blue Hawk',         desc:'Reached Level 7',                        earned:true,  rarity:'uncommon'  },
  { id:8,  emoji:'🌟', name:'All-Star',          desc:'Selected for county training',           earned:false, rarity:'legendary' },
  { id:9,  emoji:'🎽', name:'Jersey Earned',     desc:'Received your first club jersey',        earned:true,  rarity:'common'    },
  { id:10, emoji:'💪', name:'Strength & Spirit', desc:'Completed the full fitness challenge',   earned:true,  rarity:'uncommon'  },
  { id:11, emoji:'🏃', name:'Solo Star',         desc:'1000 solo runs logged',                  earned:false, rarity:'rare'      },
  { id:12, emoji:'🎮', name:'Challenger',        desc:'Completed 10 weekly challenges',         earned:true,  rarity:'uncommon'  },
]

const FRIENDS = [
  { name:'Niamh Ní Bhriain',     level:9,  xpWeek:980, streak:12, badge:'⭐' },
  { name:'Ciarán Ó Murchú',      level:7,  xpWeek:840, streak:7,  badge:'🦅', isMe:true },
  { name:'Aoife de Búrca',        level:8,  xpWeek:720, streak:18, badge:'🏆' },
  { name:'Seán Mac Gearailt',    level:5,  xpWeek:620, streak:3,  badge:'🎯' },
  { name:'Caoimhe Ní Fhaoláin',  level:8,  xpWeek:590, streak:14, badge:'🔥' },
  { name:'Pádraig Ó Ceall.',     level:6,  xpWeek:450, streak:5,  badge:'🎽' },
]

const MAP_STAGES = [
  { id:1,  name:'The Beginning',   icon:'🏠', done:true,   x:160, y:440 },
  { id:2,  name:'First Kick',      icon:'⚽', done:true,   x:260, y:370 },
  { id:3,  name:'Passing Pro',     icon:'🤝', done:true,   x:120, y:300 },
  { id:4,  name:'Solo Star',       icon:'🏃', done:true,   x:240, y:230 },
  { id:5,  name:'Match Day',       icon:'🏟️', done:true,   x:100, y:165 },
  { id:6,  name:'Team Captain',    icon:'🎽', done:true,   x:250, y:105 },
  { id:7,  name:'Blitz Hero',      icon:'🏆', done:false,  x:140, y:48,  current:true  },
  { id:8,  name:'Challenge Week',  icon:'⚡', done:false,  x:260, y:-20, locked:true  },
  { id:9,  name:'County Camp',     icon:'🌟', done:false,  x:120, y:-85, locked:true  },
  { id:10, name:'All-Star',        icon:'👑', done:false,  x:200, y:-150,locked:true  },
]

const COACH_MESSAGES = [
  { from:'Coach Murphy', time:'Today 16:20', msg:'Great effort at training today Ciarán! Your hand-passing is really improving. Keep up the 7-day streak — you\'re flying! 🔥', read:false },
  { from:'Coach Murphy', time:'Mon 3 Aug',   msg:'Well done on the Blitz Hero badge — you were brilliant at the tournament. Proud of you!', read:true },
  { from:'Coach Murphy', time:'Thu 30 Jul',  msg:'Remember we have training Saturday at 10:00. Please confirm if you can make it.', read:true },
]

const LEVEL_NAMES: Record<number,string> = {
  1:'Beginner', 2:'Rising Star', 3:'Young Hawk', 4:'Skilled Hawk',
  5:'Team Player', 6:'Match Ready', 7:'Blue Hawk', 8:'Eagle Eye',
  9:'Club Champion', 10:'County Star', 15:'All-Star', 20:'Legend',
}

// ─── Mascot SVG — the central Journey character ────────────────────────────
type MascotPose = 'wave'|'cheer'|'celebrate'|'think'|'run'|'teach'|'sleep'|'excited'

// Otis the Otter — Journey module mascot. Blue jersey. Energetic · Playful · Determined.
// Central character throughout the children's experience.
function JourneyMascot({
  pose = 'wave', size = 180,
  style,
  message,
}: {
  pose?: MascotPose
  size?: number
  style?: React.CSSProperties
  message?: string
}) {
  // Map pose to a fun emoji accent shown alongside Otis
  const poseEmoji: Record<MascotPose, string> = {
    wave: '👋', cheer: '⭐', celebrate: '🎉', think: '💭',
    run: '💨', teach: '📋', sleep: '💤', excited: '✨',
  }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, ...style }}>
      {message && (
        <div style={{
          background: J.white, border: `2px solid ${J.sky200}`, borderRadius: '16px 16px 16px 4px',
          padding: '8px 14px', maxWidth: 220, marginLeft: 20,
          boxShadow: J.cardSh,
        }}>
          <p style={{ ...F.display, fontSize: 13, fontWeight: 700, color: J.ink, margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
      )}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={otisSrc}
          alt={`Otis the Otter — ${pose}`}
          style={{ height: size, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        {size >= 80 && (
          <div style={{ position: 'absolute', top: -4, right: -8, fontSize: size >= 120 ? 22 : 14, lineHeight: 1 }}>
            {poseEmoji[pose]}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function XPBar({ current, max, color = J.sky400, height = 12 }: { current: number; max: number; color?: string; height?: number }) {
  const pct = Math.min((current / max) * 100, 100)
  return (
    <div style={{ width: '100%', height, background: J.line, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: height / 2,
        transition: 'width .6s cubic-bezier(.4,0,.2,1)',
        boxShadow: `0 2px 8px ${color}60`,
      }} />
    </div>
  )
}

function StarBurst({ count = 3, size = 18 }: { count?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: size, opacity: i < count ? 1 : 0.25 }}>⭐</span>
      ))}
    </div>
  )
}

function BadgeChip({ emoji, name, rarity, earned }: { emoji: string; name: string; rarity: string; earned: boolean }) {
  const rarityColors: Record<string, string> = {
    common: J.muted, uncommon: J.green, rare: J.sky400, epic: J.purple, legendary: J.gold,
  }
  const c = rarityColors[rarity] ?? J.muted
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '14px 10px', borderRadius: 16, width: 80,
      background: earned ? J.white : J.soft,
      border: `2px solid ${earned ? c : J.line}`,
      opacity: earned ? 1 : 0.45,
      boxShadow: earned ? `0 4px 16px ${c}25` : 'none',
      position: 'relative',
    }}>
      <span style={{ fontSize: 28, filter: earned ? 'none' : 'grayscale(1)' }}>{emoji}</span>
      <span style={{ ...F.display, fontSize: 10, fontWeight: 800, color: earned ? J.ink : J.muted, textAlign: 'center', lineHeight: 1.2 }}>{name}</span>
      <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: earned ? c : 'transparent' }} />
    </div>
  )
}

function StreakBadge({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${J.coral}18`, border: `1px solid ${J.coral}30`, borderRadius: 999, padding: '4px 10px' }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: J.coral }}>{count} day streak</span>
    </div>
  )
}

function LevelBadge({ level, name }: { level: number; name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${J.sky700}, ${J.sky400})`, borderRadius: 14, padding: '8px 16px', boxShadow: J.blueSh }}>
      <span style={{ ...F.display, fontSize: 20, fontWeight: 900, color: J.white }}>Lv{level}</span>
      <div>
        <div style={{ ...F.display, fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Level {level}</div>
        <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.white }}>{name}</div>
      </div>
    </div>
  )
}

function MobileStatusBar() {
  return (
    <div style={{ padding: '26px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ ...F.mono, fontSize: 12, color: J.white, fontWeight: 700 }}>9:41</span>
      <div style={{ display: 'flex', gap: 5 }}>
        <span style={{ fontSize: 10, color: J.white }}>▪▪▪</span>
        <span style={{ fontSize: 10, color: J.white }}>🔋</span>
      </div>
    </div>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
const MOBILE_NAV = [
  { id: 'home',     icon: '🏠', label: 'Home'    },
  { id: 'map',      icon: '🗺️', label: 'Map'     },
  { id: 'missions', icon: '⚡', label: 'Missions' },
  { id: 'badges',   icon: '🏆', label: 'Badges'  },
  { id: 'friends',  icon: '👥', label: 'Friends' },
]

function BottomNav({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  return (
    <div style={{
      background: J.white, borderTop: `2px solid ${J.line}`,
      display: 'flex', padding: '6px 0 16px', flexShrink: 0,
    }}>
      {MOBILE_NAV.map(item => {
        const isActive = active === item.id
        return (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: isActive ? `linear-gradient(135deg, ${J.sky400}, ${J.sky600})` : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: isActive ? J.blueSh : 'none',
              transition: 'all .2s',
            }}>{item.icon}</div>
            <span style={{ ...F.display, fontSize: 10, fontWeight: isActive ? 900 : 600, color: isActive ? J.sky600 : J.muted }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS
// ════════════════════════════════════════════════════════════════════════════

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ onNav }: { onNav: (s: string) => void }) {
  const xpPct = Math.round((PLAYER.xp / PLAYER.xpToNext) * 100)
  const todayDone = MISSIONS.filter(m => m.done).length
  const todayXP = MISSIONS.filter(m => m.done).reduce((a, m) => a + m.xp, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Sky header */}
      <div style={{
        background: `linear-gradient(160deg, ${J.sky700} 0%, ${J.sky400} 60%, ${J.sky200} 100%)`,
        paddingBottom: 32, position: 'relative', overflow: 'hidden',
      }}>
        <MobileStatusBar />
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: 10, left: -30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ padding: '8px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.75)', margin: 0 }}>Good afternoon 👋</p>
            <h1 style={{ ...F.display, fontSize: 26, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '2px 0 8px' }}>
              Hey, {PLAYER.name}!
            </h1>
            <StreakBadge count={PLAYER.streak} />
          </div>
          <LevelBadge level={PLAYER.level} name={PLAYER.levelName} />
        </div>
        {/* XP bar */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ ...F.display, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>XP to Level {PLAYER.level + 1}</span>
            <span style={{ ...F.mono, fontSize: 12, color: J.gold, fontWeight: 700 }}>{PLAYER.xp.toLocaleString()} / {PLAYER.xpToNext.toLocaleString()}</span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,.2)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${xpPct}%`, height: '100%', background: `linear-gradient(90deg, ${J.gold}, ${J.star})`, borderRadius: 5, transition: 'width .8s ease' }} />
          </div>
          <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{PLAYER.xpToNext - PLAYER.xp} XP to next level</p>
        </div>
      </div>

      {/* Mascot greeting */}
      <div style={{ margin: '-16px 16px 0', background: J.white, borderRadius: 20, border: `2px solid ${J.sky200}`, padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-end', boxShadow: J.cardSh, zIndex: 1, position: 'relative' }}>
        <JourneyMascot pose="excited" size={80} />
        <div style={{ flex: 1 }}>
          <p style={{ ...F.display, fontSize: 14, fontWeight: 800, color: J.ink, lineHeight: 1.5, margin: 0 }}>
            You&apos;re on fire today! 🔥<br />Complete your missions to reach Level {PLAYER.level + 1}!
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ background: `${J.sky400}18`, border: `1px solid ${J.sky400}30`, borderRadius: 999, padding: '3px 10px', ...F.body, fontSize: 11, fontWeight: 700, color: J.sky600 }}>
              {todayDone}/{MISSIONS.length} done today
            </span>
            <span style={{ background: `${J.gold}18`, border: `1px solid ${J.gold}50`, borderRadius: 999, padding: '3px 10px', ...F.body, fontSize: 11, fontWeight: 700, color: J.goldDk }}>
              +{todayXP} XP today
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Today's missions preview */}
        <div style={{ background: J.white, borderRadius: 20, border: `1.5px solid ${J.line}`, overflow: 'hidden', boxShadow: J.cardSh }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${J.line}` }}>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: J.ink }}>Today&apos;s Missions</div>
            <button onClick={() => onNav('missions')} style={{ ...F.display, fontSize: 12, fontWeight: 800, color: J.sky600, background: 'none', border: 'none', cursor: 'pointer' }}>See all →</button>
          </div>
          {MISSIONS.slice(0, 3).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${J.line}`, opacity: m.done ? 0.6 : 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: m.done ? `${J.green}20` : J.soft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{m.done ? '✅' : m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: J.ink }}>{m.title}</div>
                {!m.done && (
                  <div style={{ marginTop: 4 }}>
                    <XPBar current={m.progress} max={m.max} color={J.sky400} height={5} />
                  </div>
                )}
              </div>
              <div style={{ background: `${J.gold}20`, border: `1px solid ${J.gold}50`, borderRadius: 8, padding: '3px 8px' }}>
                <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: J.goldDk }}>+{m.xp}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🗺️', label: 'Adventure Map', color: J.sky400, screen: 'map' },
            { icon: '🏆', label: 'My Badges', color: J.gold, screen: 'badges' },
            { icon: '👥', label: 'Friends', color: J.mint, screen: 'friends' },
            { icon: '🎓', label: 'Skills Videos', color: J.purple, screen: 'videos' },
          ].map(q => (
            <button key={q.label} onClick={() => onNav(q.screen)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', borderRadius: 16, border: `1.5px solid ${J.line}`, background: J.white, cursor: 'pointer', boxShadow: J.cardSh }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${q.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{q.icon}</div>
              <span style={{ ...F.display, fontSize: 12, fontWeight: 800, color: J.ink }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Coach message teaser */}
        {COACH_MESSAGES[0] && (
          <div style={{ background: `linear-gradient(135deg, ${J.sky800}, ${J.sky600})`, borderRadius: 20, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📬</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...F.display, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.65)', marginBottom: 3 }}>{COACH_MESSAGES[0].from}</div>
              <div style={{ ...F.body, fontSize: 13, color: J.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {COACH_MESSAGES[0].msg}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Adventure Map ────────────────────────────────────────────────────────────
function MapScreen() {
  const [selectedStage, setSelectedStage] = useState<typeof MAP_STAGES[0] | null>(null)

  const pathD = `
    M 160 440
    C 160 420 260 405 260 380
    C 260 355 120 335 120 310
    C 120 285 240 268 240 245
    C 240 222 100 205 100 180
    C 100 155 250 138 250 118
    C 250 98 140 80 140 60
    C 140 40 260 22 260 5
  `

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: J.soft }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${J.sky700}, ${J.sky500})`, padding: '28px 20px 16px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0' }}>
          <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Your Journey</p>
          <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '2px 0' }}>Adventure Map</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 999, padding: '3px 12px', ...F.body, fontSize: 12, color: J.white }}>
              Stage 7 of 10
            </span>
            <span style={{ background: `${J.gold}30`, borderRadius: 999, padding: '3px 12px', ...F.mono, fontSize: 12, color: J.gold, fontWeight: 700 }}>
              {PLAYER.xp.toLocaleString()} XP total
            </span>
          </div>
        </div>
      </div>

      {/* Map canvas */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* Zone backgrounds */}
        <div style={{ position: 'relative', width: '100%', height: 520, background: 'linear-gradient(to top, #e8f5e9 0%, #e1f5fe 45%, #ede7f6 75%, #fff8e1 100%)' }}>
          {/* Zone labels */}
          {[
            { label: 'Beginners Field',  y: 430, color: '#43a04740' },
            { label: 'Training Ground',  y: 290, color: '#29b6f640' },
            { label: 'Match Arena',      y: 150, color: '#7c4dff40' },
          ].map(z => (
            <div key={z.label} style={{ position: 'absolute', left: 0, right: 0, top: z.y, background: z.color, height: 120, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
              <span style={{ ...F.display, fontSize: 11, fontWeight: 800, color: J.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{z.label}</span>
            </div>
          ))}

          {/* Path SVG */}
          <svg width="100%" height="520" viewBox="0 0 380 480" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
            {/* Path glow */}
            <path d={pathD.replace(/\n\s+/g, ' ')} fill="none" stroke={J.sky200} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
            {/* Completed path */}
            <path d={`M 160 440 C 160 420 260 405 260 380 C 260 355 120 335 120 310 C 120 285 240 268 240 245 C 240 222 100 205 100 180 C 100 155 250 138 250 118 C 250 98 140 80 140 60`}
              fill="none" stroke={J.sky400} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="none" />
            {/* Locked path */}
            <path d="M 140 60 C 140 40 260 22 260 5"
              fill="none" stroke={J.line} strokeWidth="8" strokeLinecap="round" strokeDasharray="12 8" />

            {/* Stars / collectibles */}
            {[[200, 350], [170, 280], [200, 210], [175, 140]].map(([x, y], i) => (
              <text key={i} x={x} y={y} textAnchor="middle" style={{ fontSize: 14 }}>⭐</text>
            ))}

            {/* Stage nodes */}
            {MAP_STAGES.map((stage, i) => {
              const nx = (stage.x / 380) * 380
              const ny = (stage.y + 30) + 20 // offset into viewport
              const isSelected = selectedStage?.id === stage.id

              return (
                <g key={stage.id} onClick={() => setSelectedStage(stage)} style={{ cursor: 'pointer' }}>
                  {/* Pulse ring for current */}
                  {stage.current && (
                    <>
                      <circle cx={nx} cy={ny} r="28" fill={`${J.sky400}30`} />
                      <circle cx={nx} cy={ny} r="22" fill={`${J.sky400}50`} />
                    </>
                  )}
                  {isSelected && <circle cx={nx} cy={ny} r="26" fill={`${J.gold}40`} />}
                  <circle cx={nx} cy={ny} r="20"
                    fill={stage.locked ? J.line : stage.done ? J.sky500 : J.sky400}
                    stroke={stage.current ? J.gold : stage.locked ? J.muted : J.white}
                    strokeWidth={stage.current ? 3 : 2}
                  />
                  <text x={nx} y={ny + 5} textAnchor="middle" style={{ fontSize: 14, userSelect: 'none' }}>
                    {stage.locked ? '🔒' : stage.done && !stage.current ? '✅' : stage.icon}
                  </text>
                  <text x={nx} y={ny + 32} textAnchor="middle" style={{
                    fontSize: 10, fontFamily: "'Nunito',sans-serif", fontWeight: 800,
                    fill: stage.locked ? J.muted : J.ink,
                  }}>{stage.name}</text>
                </g>
              )
            })}

            {/* Player mascot marker */}
            <g transform="translate(116, 44)">
              <circle cx="24" cy="24" r="24" fill={J.white} stroke={J.gold} strokeWidth="3" />
              <text x="24" y="29" textAnchor="middle" style={{ fontSize: 22 }}>🦅</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Stage detail card */}
      {selectedStage && (
        <div style={{ position: 'absolute', bottom: 70, left: 16, right: 16, background: J.white, borderRadius: 20, border: `2px solid ${selectedStage.locked ? J.line : J.sky400}`, padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: selectedStage.locked ? J.soft : `${J.sky400}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                {selectedStage.locked ? '🔒' : selectedStage.icon}
              </div>
              <div>
                <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: J.ink }}>Stage {selectedStage.id}: {selectedStage.name}</div>
                <div style={{ ...F.body, fontSize: 12, color: J.muted, marginTop: 3 }}>
                  {selectedStage.locked ? 'Complete earlier stages to unlock' : selectedStage.current ? '🟡 You\'re here! Keep going!' : '✅ Completed'}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedStage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: J.muted, padding: 0 }}>✕</button>
          </div>
          {selectedStage.current && (
            <div style={{ marginTop: 12, background: `${J.sky400}10`, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <JourneyMascot pose="cheer" size={48} />
              <p style={{ ...F.display, fontSize: 13, fontWeight: 800, color: J.sky700, margin: 0 }}>Complete your missions to advance to Stage {selectedStage.id + 1}!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Daily Missions ───────────────────────────────────────────────────────────
function MissionsScreen() {
  const [missions, setMissions] = useState(MISSIONS)
  const totalXP = missions.filter(m => m.done).reduce((a, m) => a + m.xp, 0)
  const maxXP = missions.reduce((a, m) => a + m.xp, 0)
  const allDone = missions.every(m => m.done)

  function markDone(id: number) {
    setMissions(ms => ms.map(m => m.id === id ? { ...m, done: true, progress: m.max } : m))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: J.soft }}>
      <div style={{ background: `linear-gradient(160deg, ${J.sky700}, ${J.sky500})`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Tuesday 5 Aug</p>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '2px 0 10px' }}>Daily Missions</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...F.display, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>
                {missions.filter(m => m.done).length}/{missions.length} complete
              </span>
              <span style={{ ...F.mono, fontSize: 12, color: J.gold, fontWeight: 700 }}>+{totalXP} / +{maxXP} XP</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(totalXP / maxXP) * 100}%`, height: '100%', background: `linear-gradient(90deg,${J.gold},${J.star})`, borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>
          <JourneyMascot pose={allDone ? 'celebrate' : 'cheer'} size={80} />
        </div>
      </div>

      {/* All done celebration */}
      {allDone && (
        <div style={{ margin: '16px 16px 0', background: `linear-gradient(135deg, ${J.gold}20, ${J.sky400}15)`, border: `2px solid ${J.gold}60`, borderRadius: 20, padding: '16px', textAlign: 'center' }}>
          <div style={{ ...F.display, fontSize: 18, fontWeight: 900, color: J.ink }}>🎉 All missions complete!</div>
          <div style={{ ...F.body, fontSize: 13, color: J.sub, marginTop: 4 }}>You&apos;ve earned {maxXP} XP today. Brilliant work!</div>
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {missions.map(m => (
          <div key={m.id} style={{
            background: J.white, borderRadius: 18, border: `1.5px solid ${m.done ? J.green + '50' : J.line}`,
            padding: '14px 16px', boxShadow: J.cardSh,
            borderLeft: `5px solid ${m.done ? J.green : J.sky400}`,
            opacity: m.done ? 0.85 : 1,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: m.done ? `${J.green}20` : `${J.sky400}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>{m.done ? '✅' : m.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: m.done ? J.muted : J.ink }}>{m.title}</div>
                  <div style={{ background: m.done ? `${J.green}20` : `${J.gold}25`, border: `1px solid ${m.done ? J.green + '50' : J.gold + '60'}`, borderRadius: 8, padding: '3px 8px', flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ ...F.mono, fontSize: 12, fontWeight: 800, color: m.done ? J.green : J.goldDk }}>+{m.xp} XP</span>
                  </div>
                </div>
                <p style={{ ...F.body, fontSize: 12, color: J.muted, margin: '3px 0 8px' }}>{m.desc}</p>
                {!m.done && m.max > 1 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ ...F.mono, fontSize: 11, color: J.muted }}>{m.progress}/{m.max}</span>
                    </div>
                    <XPBar current={m.progress} max={m.max} color={J.sky400} height={6} />
                  </div>
                )}
                {!m.done && m.max === 1 && (
                  <button onClick={() => markDone(m.id)}
                    style={{ height: 32, padding: '0 16px', background: J.sky400, border: 'none', borderRadius: 10, cursor: 'pointer', ...F.display, fontSize: 12, fontWeight: 800, color: J.white, boxShadow: J.blueSh }}>
                    Mark complete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Bonus mission teaser */}
        <div style={{ background: `linear-gradient(135deg, ${J.purple}18, ${J.sky400}10)`, border: `2px dashed ${J.purple}40`, borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 28 }}>🌟</span>
          <div>
            <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.purple }}>Bonus Mission unlocks at 18:00</div>
            <div style={{ ...F.body, fontSize: 12, color: J.muted }}>Complete today&apos;s missions first to unlock a surprise!</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Badges / Achievements ────────────────────────────────────────────────────
function BadgesScreen() {
  const earned = BADGES.filter(b => b.earned)
  const locked = BADGES.filter(b => !b.earned)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: J.soft }}>
      <div style={{ background: `linear-gradient(160deg, ${J.sky700}, ${J.sky500})`, padding: '28px 20px 16px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Your Collection</p>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '2px 0 6px' }}>Badges & Achievements</h2>
            <StarBurst count={earned.length > 4 ? 5 : earned.length > 2 ? 4 : earned.length} size={16} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...F.display, fontSize: 32, fontWeight: 900, color: J.gold, letterSpacing: '-0.05em' }}>{earned.length}</div>
            <div style={{ ...F.body, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>of {BADGES.length} badges</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Recent unlock */}
        <div style={{ background: `linear-gradient(135deg, ${J.gold}20, ${J.sky400}15)`, border: `2px solid ${J.gold}50`, borderRadius: 20, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <JourneyMascot pose="celebrate" size={64} />
          <div>
            <div style={{ ...F.body, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: J.goldDk, marginBottom: 3 }}>Latest Badge</div>
            <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: J.ink }}>🦅 Blue Hawk</div>
            <div style={{ ...F.body, fontSize: 12, color: J.muted }}>Reached Level 7</div>
          </div>
        </div>
        {/* Earned */}
        <div>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.ink, marginBottom: 10 }}>Earned ({earned.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {earned.map(b => <BadgeChip key={b.id} {...b} />)}
          </div>
        </div>
        {/* Locked */}
        <div>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.muted, marginBottom: 10 }}>Coming soon ({locked.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {locked.map(b => <BadgeChip key={b.id} {...b} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Friends / Leaderboard ────────────────────────────────────────────────────
function FriendsScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: J.soft }}>
      <div style={{ background: `linear-gradient(160deg, ${J.sky700}, ${J.sky500})`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>This Week</p>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '2px 0' }}>Squad Leaderboard</h2>
          </div>
          <JourneyMascot pose="cheer" size={72} />
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {FRIENDS.sort((a, b) => b.xpWeek - a.xpWeek).map((f, i) => (
          <div key={f.name} style={{
            background: f.isMe ? `linear-gradient(135deg, ${J.sky400}20, ${J.sky200}10)` : J.white,
            border: `2px solid ${f.isMe ? J.sky400 : J.line}`,
            borderRadius: 18, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: f.isMe ? J.cardSh : 'none',
          }}>
            <div style={{ width: 36, textAlign: 'center', ...F.display, fontSize: 22, fontWeight: 900, color: i === 0 ? J.gold : i === 1 ? J.muted : i === 2 ? '#cd7f32' : J.muted }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${J.sky400}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 16, fontWeight: 900, color: J.sky600, flexShrink: 0 }}>
              {f.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.ink }}>{f.name}</span>
                {f.isMe && <span style={{ ...F.body, fontSize: 10, fontWeight: 700, color: J.sky600, background: `${J.sky400}20`, borderRadius: 999, padding: '1px 6px' }}>YOU</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                <span style={{ ...F.mono, fontSize: 11, color: J.goldDk, fontWeight: 700 }}>+{f.xpWeek} XP this week</span>
                <span style={{ ...F.body, fontSize: 11, color: J.coral }}>🔥 {f.streak}d</span>
              </div>
            </div>
            <div>
              <div style={{ ...F.body, fontSize: 10, color: J.muted, textAlign: 'right' }}>Lv{f.level}</div>
              <span style={{ fontSize: 20 }}>{f.badge}</span>
            </div>
          </div>
        ))}
        {/* Mascot encouragement */}
        <div style={{ background: J.white, borderRadius: 18, border: `1.5px solid ${J.line}`, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
          <JourneyMascot pose="teach" size={64} />
          <p style={{ ...F.display, fontSize: 13, fontWeight: 800, color: J.ink, lineHeight: 1.5, margin: 0 }}>
            You&apos;re 2nd this week! Complete your daily missions to overtake Niamh! 💪
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Level Up Celebration (modal-style screen) ────────────────────────────────
function LevelUpScreen({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${J.sky800}, ${J.sky500})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 50 }}>
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + (i * 7.5) % 82}%`,
            top: `${5 + (i * 8.3) % 40}%`,
            fontSize: [14, 18, 22, 26][i % 4],
            opacity: 0.6,
            animation: 'none',
          }}>
            {['⭐', '✨', '🌟', '💫'][i % 4]}
          </div>
        ))}
      </div>
      <JourneyMascot pose="celebrate" size={160} />
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <div style={{ ...F.display, fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.75)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Level Up!</div>
        <div style={{ ...F.display, fontSize: 54, fontWeight: 900, color: J.gold, letterSpacing: '-0.06em', lineHeight: 1 }}>Level 8</div>
        <div style={{ ...F.display, fontSize: 26, fontWeight: 900, color: J.white, marginTop: 6 }}>Eagle Eye 🦅</div>
        <p style={{ ...F.body, fontSize: 15, color: 'rgba(255,255,255,.8)', lineHeight: 1.6, marginTop: 12 }}>
          Amazing work, {PLAYER.name}!<br />You&apos;ve earned a new title.
        </p>
        {/* New badge */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '20px 0' }}>
          {['🦅', '⭐', '🏆'].map((e, i) => (
            <div key={i} style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{e}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button style={{ height: 52, padding: '0 32px', background: J.gold, border: 'none', borderRadius: 16, cursor: 'pointer', ...F.display, fontSize: 15, fontWeight: 900, color: J.ink, boxShadow: J.goldSh }}>
            Share achievement!
          </button>
          <button onClick={onClose} style={{ height: 52, padding: '0 24px', background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.25)', borderRadius: 16, cursor: 'pointer', ...F.display, fontSize: 15, fontWeight: 900, color: J.white }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Videos Screen ────────────────────────────────────────────────────────────
function VideosScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: J.soft }}>
      <div style={{ background: `linear-gradient(160deg, ${J.sky700}, ${J.sky500})`, padding: '28px 20px 16px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.white, letterSpacing: '-0.04em', margin: '0 0 4px' }}>Skills Videos</h2>
            <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.7)', margin: 0 }}>Learn from the best coaches</p>
          </div>
          <JourneyMascot pose="teach" size={72} />
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {[
          { icon: '🎯', title: 'Hand Passing Basics', level: 'Beginner', duration: '4:30', xp: 40, watched: true, color: J.green },
          { icon: '⚽', title: 'Kicking Technique', level: 'Beginner', duration: '6:00', xp: 50, watched: false, color: J.sky400 },
          { icon: '🏃', title: 'Solo Running Drills', level: 'Intermediate', duration: '8:15', xp: 60, watched: false, color: J.purple },
          { icon: '🛡️', title: 'Defensive Positioning', level: 'Intermediate', duration: '7:00', xp: 70, watched: false, color: J.coral },
          { icon: '🎽', title: 'Teamwork & Communication', level: 'Advanced', duration: '10:00', xp: 90, watched: false, color: J.gold },
        ].map(v => (
          <div key={v.title} style={{ background: J.white, borderRadius: 16, border: `1.5px solid ${J.line}`, display: 'flex', gap: 14, padding: '14px', alignItems: 'center', boxShadow: J.cardSh }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${v.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, position: 'relative' }}>
              {v.icon}
              {!v.watched && <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: J.white }}>▶</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.ink }}>{v.title}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ ...F.body, fontSize: 11, color: J.muted }}>{v.duration}</span>
                <span style={{ ...F.body, fontSize: 11, background: `${v.color}15`, color: v.color, borderRadius: 999, padding: '1px 7px', fontWeight: 700 }}>{v.level}</span>
                {v.watched && <span style={{ fontSize: 11, color: J.green }}>✅ Done</span>}
              </div>
            </div>
            <div style={{ background: `${J.gold}20`, borderRadius: 8, padding: '4px 8px', flexShrink: 0 }}>
              <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: J.goldDk }}>+{v.xp} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP — PARENT COMPANION VIEW
// ════════════════════════════════════════════════════════════════════════════
function DesktopParentView() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'progress', label: 'Learning Path', icon: '🗺️' },
    { id: 'messages', label: 'Coach Messages', icon: '💬' },
    { id: 'season', label: 'Season', icon: '📅' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...F.body }}>
      {/* Parent topbar */}
      <div style={{ background: J.white, borderBottom: `1px solid ${J.line}`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: J.cardSh }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${J.sky700},${J.sky400})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚀</div>
          <div>
            <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: J.ink }}>{PLAYER.name}&apos;s Journey</div>
            <div style={{ ...F.body, fontSize: 12, color: J.muted }}>{PLAYER.club} · Parent View</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <LevelBadge level={PLAYER.level} name={PLAYER.levelName} />
          <StreakBadge count={PLAYER.streak} />
        </div>
      </div>
      {/* Tabs */}
      <div style={{ background: J.white, borderBottom: `1px solid ${J.line}`, padding: '0 32px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ height: 46, padding: '0 18px', border: 'none', borderBottom: `3px solid ${activeTab === tab.id ? J.sky400 : 'transparent'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, ...F.display, fontSize: 14, fontWeight: 800, color: activeTab === tab.id ? J.sky600 : J.muted, transition: 'all .15s' }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', background: J.soft, padding: '28px 32px' }}>
        {activeTab === 'overview' && <ParentOverview />}
        {activeTab === 'progress' && <ParentProgress />}
        {activeTab === 'messages' && <ParentMessages />}
        {activeTab === 'season' && <ParentSeason />}
      </div>
    </div>
  )
}

function ParentOverview() {
  const xpPct = Math.round((PLAYER.xp / PLAYER.xpToNext) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Total XP', value: PLAYER.totalXP.toLocaleString(), icon: '⚡', color: J.gold },
          { label: 'Current Level', value: `${PLAYER.level} — ${PLAYER.levelName}`, icon: '🦅', color: J.sky400 },
          { label: 'Day Streak', value: `${PLAYER.streak} days`, icon: '🔥', color: J.coral },
          { label: 'Badges Earned', value: `${BADGES.filter(b=>b.earned).length} / ${BADGES.length}`, icon: '🏆', color: J.purple },
        ].map(s => (
          <div key={s.label} style={{ background: J.white, borderRadius: 18, border: `1px solid ${J.line}`, borderTop: `4px solid ${s.color}`, padding: '18px 20px', boxShadow: J.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...F.body, fontSize: 12, fontWeight: 700, color: J.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.ink, letterSpacing: '-0.04em' }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* XP progress */}
      <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '24px', boxShadow: J.cardSh, display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: J.ink }}>Progress to Level {PLAYER.level + 1}</div>
            <span style={{ ...F.mono, fontSize: 14, fontWeight: 700, color: J.goldDk }}>{PLAYER.xp.toLocaleString()} / {PLAYER.xpToNext.toLocaleString()} XP</span>
          </div>
          <XPBar current={PLAYER.xp} max={PLAYER.xpToNext} color={J.sky400} height={16} />
          <p style={{ ...F.body, fontSize: 13, color: J.muted, marginTop: 8 }}>{PLAYER.xpToNext - PLAYER.xp} XP remaining to reach <strong>{LEVEL_NAMES[PLAYER.level + 1]}</strong></p>
        </div>
        <JourneyMascot pose="cheer" size={100} />
      </div>
      {/* Activity this week */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Today's missions */}
        <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '20px', boxShadow: J.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: J.ink, marginBottom: 14 }}>Today&apos;s Missions</div>
          {MISSIONS.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${J.line}` }}>
              <span style={{ fontSize: 16 }}>{m.done ? '✅' : m.icon}</span>
              <div style={{ flex: 1, ...F.body, fontSize: 13, color: m.done ? J.muted : J.ink }}>{m.title}</div>
              <div style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: m.done ? J.green : J.muted }}>+{m.xp} XP</div>
            </div>
          ))}
        </div>
        {/* Badge collection */}
        <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '20px', boxShadow: J.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: J.ink, marginBottom: 14 }}>Recent Badges</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BADGES.filter(b => b.earned).map(b => <BadgeChip key={b.id} {...b} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ParentProgress() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Learning path */}
        <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '24px', boxShadow: J.cardSh }}>
          <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: J.ink, marginBottom: 20 }}>Learning Path Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MAP_STAGES.map((stage, i) => (
              <div key={stage.id} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: stage.locked ? J.line : stage.current ? `${J.sky400}20` : `${J.green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: stage.current ? `2px solid ${J.sky400}` : '2px solid transparent' }}>
                  {stage.locked ? '🔒' : stage.done && !stage.current ? '✅' : stage.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: stage.locked ? J.muted : J.ink }}>
                    Stage {stage.id}: {stage.name}
                    {stage.current && <span style={{ marginLeft: 8, ...F.body, fontSize: 11, background: `${J.sky400}20`, color: J.sky600, borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>CURRENT</span>}
                  </div>
                </div>
                <div style={{ ...F.mono, fontSize: 11, color: stage.locked ? J.line : stage.done ? J.green : J.sky400, fontWeight: 700 }}>
                  {stage.locked ? 'Locked' : stage.done && !stage.current ? '✓ Done' : stage.current ? 'In progress' : 'Done'}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Skills breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '20px', boxShadow: J.cardSh }}>
            <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.ink, marginBottom: 14 }}>Skill Ratings</div>
            {[['Kicking', 78, J.coral], ['Hand Passing', 92, J.green], ['Catching', 84, J.sky400], ['Tackling', 65, J.purple], ['Teamwork', 88, J.gold]].map(([sk, val, col]) => (
              <div key={sk as string} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ ...F.body, fontSize: 12, fontWeight: 600, color: J.ink }}>{sk}</span>
                  <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: col as string }}>{val}</span>
                </div>
                <XPBar current={val as number} max={100} color={col as string} height={6} />
              </div>
            ))}
          </div>
          <div style={{ background: `${J.sky400}15`, border: `2px solid ${J.sky400}30`, borderRadius: 20, padding: '16px' }}>
            <JourneyMascot pose="wave" size={70} style={{ margin: '0 auto' }} />
            <p style={{ ...F.display, fontSize: 13, fontWeight: 800, color: J.sky700, textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>
              {PLAYER.name} is performing brilliantly in hand-passing. Keep encouraging practice at home!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ParentMessages() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...F.display, fontSize: 18, fontWeight: 900, color: J.ink }}>Messages from Coach</div>
      {COACH_MESSAGES.map((msg, i) => (
        <div key={i} style={{ background: J.white, borderRadius: 20, border: `1.5px solid ${msg.read ? J.line : J.sky400}`, padding: '20px 24px', boxShadow: J.cardSh, borderLeft: `5px solid ${msg.read ? J.line : J.sky400}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${J.sky400}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 14, fontWeight: 900, color: J.sky600 }}>CM</div>
              <div>
                <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: J.ink }}>{msg.from}</div>
                <div style={{ ...F.body, fontSize: 11, color: J.muted }}>{msg.time}</div>
              </div>
            </div>
            {!msg.read && <span style={{ background: `${J.sky400}20`, border: `1px solid ${J.sky400}40`, borderRadius: 999, padding: '3px 10px', ...F.body, fontSize: 11, fontWeight: 700, color: J.sky600 }}>New</span>}
          </div>
          <p style={{ ...F.body, fontSize: 14, color: J.ink, lineHeight: 1.65, margin: 0 }}>{msg.msg}</p>
        </div>
      ))}
    </div>
  )
}

function ParentSeason() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...F.display, fontSize: 18, fontWeight: 900, color: J.ink }}>Season Progress 2025–26</div>
      {/* Season timeline */}
      <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '24px', boxShadow: J.cardSh }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {[['Sep','Pre-Season',65,J.green],['Oct','In-Season',72,J.sky400],['Nov','In-Season',81,J.sky400],['Dec','In-Season',70,J.sky400],['Jan','In-Season',88,J.sky400],['Feb','In-Season',84,J.sky400],['Mar','In-Season',90,J.sky400],['Apr','Post-Season',75,J.purple],['Aug','Now',82,J.coral]].map(([m,phase,pct,c],i) => (
            <div key={m as string} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ ...F.mono, fontSize: 11, color: J.muted }}>{pct}%</div>
              <div style={{ width: '70%', borderRadius: 4, background: `linear-gradient(to top, ${c as string}, ${c as string}cc)`, height: `${(pct as number) / 100 * 70}px`, minHeight: 4, transition: 'height .4s' }} />
              <div style={{ ...F.mono, fontSize: 10, color: J.muted }}>{m}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, ...F.body, fontSize: 12, color: J.muted }}>
          <span>● Attendance %</span>
          <span style={{ color: J.goldDk }}>Season avg: 79%</span>
        </div>
      </div>
      {/* Upcoming events */}
      <div style={{ background: J.white, borderRadius: 20, border: `1px solid ${J.line}`, padding: '20px 24px', boxShadow: J.cardSh }}>
        <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: J.ink, marginBottom: 14 }}>Upcoming Events</div>
        {[['Tue 5 Aug', '16:30', 'Training — Passing & Movement', J.sky400],['Sat 9 Aug', '10:00', 'Match Practice', J.green],['Sat 22 Aug', '10:00', 'Fingallians U12 Blitz 🏆', J.coral]].map(([date, time, event, c]) => (
          <div key={event} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: `1px solid ${J.line}`, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c as string}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ ...F.display, fontSize: 11, fontWeight: 900, color: c as string }}>{(date as string).split(' ')[0]}</div>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: c as string }}>{(date as string).split(' ')[1]}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 800, color: J.ink }}>{event}</div>
              <div style={{ ...F.body, fontSize: 12, color: J.muted }}>{date} · {time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
function DesktopSidebar({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'map', icon: '🗺️', label: 'Adventure Map' },
    { id: 'missions', icon: '⚡', label: 'Daily Missions' },
    { id: 'badges', icon: '🏆', label: 'Badges' },
    { id: 'friends', icon: '👥', label: 'Friends' },
    { id: 'videos', icon: '📺', label: 'Videos' },
    { id: 'parent', icon: '👨‍👩‍👦', label: 'Parent View' },
  ]
  return (
    <div style={{ width: 220, background: `linear-gradient(180deg, ${J.sky900} 0%, ${J.sky800} 100%)`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '24px 16px 20px', borderBottom: `1px solid rgba(255,255,255,.08)`, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={spraioIcon} alt="Spraoi Sports" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ ...F.display, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Spraoi Sports</div>
            <div style={{ ...F.body, fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Lv{PLAYER.level} · {PLAYER.levelName}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', background: isActive ? `${J.sky400}30` : 'transparent', borderLeft: `3px solid ${isActive ? J.sky300 : 'transparent'}`, transition: 'all .15s' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ ...F.display, fontSize: 13, fontWeight: isActive ? 800 : 500, color: isActive ? J.white : 'rgba(255,255,255,.5)' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      {/* Player card */}
      <div style={{ padding: '14px 16px', borderTop: `1px solid rgba(255,255,255,.08)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: J.sky400, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 16, fontWeight: 900, color: J.white }}>
            {PLAYER.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: J.white }}>{PLAYER.name}</div>
            <div style={{ ...F.mono, fontSize: 10, color: J.gold }}>{PLAYER.xp.toLocaleString()} XP</div>
          </div>
          <StreakBadge count={PLAYER.streak} />
        </div>
        <div style={{ marginTop: 10 }}>
          <XPBar current={PLAYER.xp} max={PLAYER.xpToNext} color={J.gold} height={5} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════

const MOBILE_SCREEN_MAP: Record<string, string> = {
  home: 'home', map: 'map', missions: 'missions', badges: 'badges', friends: 'friends', videos: 'videos',
}

export default function Journey() {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile')
  const [screen, setScreen] = useState('home')
  const [showLevelUp, setShowLevelUp] = useState(false)
  const bottomNavId = MOBILE_SCREEN_MAP[screen] ?? 'home'

  function navigate(s: string) {
    if (s === 'levelup') { setShowLevelUp(true); return }
    setScreen(s)
  }

  const renderMobileScreen = () => {
    switch (screen) {
      case 'home':     return <HomeScreen onNav={navigate} />
      case 'map':      return <MapScreen />
      case 'missions': return <MissionsScreen />
      case 'badges':   return <BadgesScreen />
      case 'friends':  return <FriendsScreen />
      case 'videos':   return <VideosScreen />
      default:         return <HomeScreen onNav={navigate} />
    }
  }

  const renderDesktopScreen = () => {
    if (screen === 'parent') return <DesktopParentView />
    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DesktopSidebar active={screen} onNav={navigate} />
        {/* Desktop mirror of mobile screen with more space */}
        <div style={{ flex: 1, overflow: 'auto', background: J.soft, padding: '32px' }}>
          {screen === 'home' && <ParentOverview />}
          {screen === 'map' && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 360px', background: J.white, borderRadius: 24, overflow: 'hidden', boxShadow: J.cardSh, height: 560 }}>
                <MapScreen />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...F.display, fontSize: 22, fontWeight: 900, color: J.ink, marginBottom: 16 }}>Stage Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MAP_STAGES.map(s => (
                    <div key={s.id} style={{ background: J.white, borderRadius: 14, border: `1.5px solid ${s.current ? J.sky400 : s.locked ? J.line : J.green + '40'}`, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: J.cardSh }}>
                      <span style={{ fontSize: 22 }}>{s.locked ? '🔒' : s.done && !s.current ? '✅' : s.icon}</span>
                      <div style={{ flex: 1, ...F.display, fontSize: 13, fontWeight: 800, color: s.locked ? J.muted : J.ink }}>Stage {s.id}: {s.name}</div>
                      {s.current && <span style={{ background: `${J.sky400}20`, color: J.sky600, borderRadius: 999, padding: '3px 10px', ...F.body, fontSize: 11, fontWeight: 700 }}>HERE</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {screen === 'missions' && (
            <div style={{ maxWidth: 600 }}>
              <ParentMessages />
            </div>
          )}
          {screen === 'badges' && <ParentProgress />}
          {screen === 'friends' && <ParentSeason />}
          {screen === 'videos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { icon:'🎯', title:'Hand Passing Basics', level:'Beginner', duration:'4:30', xp:40, watched:true, color:J.green },
                { icon:'⚽', title:'Kicking Technique', level:'Beginner', duration:'6:00', xp:50, watched:false, color:J.sky400 },
                { icon:'🏃', title:'Solo Running Drills', level:'Intermediate', duration:'8:15', xp:60, watched:false, color:J.purple },
                { icon:'🛡️', title:'Defensive Positioning', level:'Intermediate', duration:'7:00', xp:70, watched:false, color:J.coral },
                { icon:'🎽', title:'Teamwork', level:'Advanced', duration:'10:00', xp:90, watched:false, color:J.gold },
              ].map(v=>(
                <div key={v.title} style={{ background:J.white, borderRadius:20, border:`1.5px solid ${J.line}`, overflow:'hidden', boxShadow:J.cardSh }}>
                  <div style={{ height:100, background:`${v.color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>{v.icon}</div>
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ ...F.display, fontSize:14, fontWeight:900, color:J.ink, marginBottom:6 }}>{v.title}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ ...F.body, fontSize:11, color:J.muted }}>{v.duration}</span>
                      <span style={{ background:`${v.color}15`, color:v.color, borderRadius:999, padding:'1px 7px', ...F.body, fontSize:11, fontWeight:700 }}>{v.level}</span>
                      <span style={{ ...F.mono, fontSize:11, color:J.goldDk, fontWeight:700 }}>+{v.xp} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...F.body }}>
      {/* Meta demo bar */}
      <div style={{ background: J.sky900, borderBottom: `1px solid rgba(255,255,255,.08)`, padding: '0 20px', height: 44, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <img src={spraioIcon} alt="Spraoi" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: J.white }}>Spraoi Journey</span>
        </div>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['mobile', 'desktop'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === m ? J.white : 'transparent', color: mode === m ? J.sky900 : 'rgba(255,255,255,.5)', ...F.body, fontSize: 11, fontWeight: 700, transition: 'all .15s' }}>
              {m === 'mobile' ? '📱 Child' : '🖥 Parent'}
            </button>
          ))}
        </div>
        {/* Screen picker */}
        <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'auto' }}>
          {(mode === 'mobile'
            ? [['home','Home'],['map','Adventure Map'],['missions','Missions'],['badges','Badges'],['friends','Friends'],['videos','Videos'],['levelup','🎉 Level Up!']]
            : [['home','Overview'],['map','Map'],['badges','Progress'],['videos','Videos'],['parent','Parent Dashboard']]
          ).map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)}
              style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: screen === id ? `${J.sky400}80` : 'transparent', color: screen === id ? J.white : 'rgba(255,255,255,.45)', ...F.body, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {mode === 'mobile' ? (
          /* Device frame */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${J.sky900} 0%, ${J.sky700} 50%, ${J.sky500} 100%)`, padding: '20px', position: 'relative' }}>
            {/* Floating decorations */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', fontSize: 32, opacity: .3 }}>⭐</div>
            <div style={{ position: 'absolute', top: '20%', right: '12%', fontSize: 24, opacity: .25 }}>✨</div>
            <div style={{ position: 'absolute', bottom: '15%', left: '8%', fontSize: 28, opacity: .2 }}>🌟</div>
            <div style={{ position: 'absolute', bottom: '25%', right: '8%', fontSize: 20, opacity: .2 }}>💫</div>
            <div style={{
              width: 393, height: '100%', maxHeight: 852,
              borderRadius: 46, border: '8px solid #0a1a2e',
              background: J.white, overflow: 'hidden', position: 'relative',
              boxShadow: '0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {renderMobileScreen()}
                {/* Level Up overlay */}
                {showLevelUp && (
                  <LevelUpScreen onClose={() => { setShowLevelUp(false); setScreen('home') }} />
                )}
              </div>
              <BottomNav active={bottomNavId} onNav={navigate} />
            </div>
          </div>
        ) : (
          /* Desktop mode */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {screen === 'parent' ? (
              <DesktopParentView />
            ) : (
              <>
                <DesktopSidebar active={screen} onNav={navigate} />
                <div style={{ flex: 1, overflow: 'auto', background: J.soft, padding: '32px' }}>
                  {screen === 'home' && <ParentOverview />}
                  {screen === 'map' && (
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                      <div style={{ flex: '0 0 360px', background: J.white, borderRadius: 24, overflow: 'hidden', boxShadow: J.cardSh, height: 540 }}>
                        <MapScreen />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: J.ink, marginBottom: 14 }}>Journey Progress</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {MAP_STAGES.map(s => (
                            <div key={s.id} style={{ background: J.white, borderRadius: 14, border: `1.5px solid ${s.current ? J.sky400 : s.locked ? J.line : J.green + '50'}`, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: J.cardSh }}>
                              <span style={{ fontSize: 22 }}>{s.locked ? '🔒' : s.done && !s.current ? '✅' : s.icon}</span>
                              <div style={{ flex: 1, ...F.display, fontSize: 13, fontWeight: 800, color: s.locked ? J.muted : J.ink }}>Stage {s.id}: {s.name}</div>
                              {s.current && <span style={{ background: `${J.sky400}20`, color: J.sky600, borderRadius: 999, padding: '3px 10px', ...F.body, fontSize: 11, fontWeight: 700 }}>CURRENT</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {screen === 'badges' && <ParentProgress />}
                  {screen === 'videos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                      {[
                        { icon:'🎯', title:'Hand Passing Basics', level:'Beginner', duration:'4:30', xp:40, color:J.green },
                        { icon:'⚽', title:'Kicking Technique', level:'Beginner', duration:'6:00', xp:50, color:J.sky400 },
                        { icon:'🏃', title:'Solo Running Drills', level:'Intermediate', duration:'8:15', xp:60, color:J.purple },
                        { icon:'🛡️', title:'Defensive Positioning', level:'Intermediate', duration:'7:00', xp:70, color:J.coral },
                        { icon:'🎽', title:'Teamwork & Communication', level:'Advanced', duration:'10:00', xp:90, color:J.gold },
                      ].map(v=>(
                        <div key={v.title} style={{ background:J.white, borderRadius:20, border:`1.5px solid ${J.line}`, overflow:'hidden', boxShadow:J.cardSh }}>
                          <div style={{ height:100, background:`${v.color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>{v.icon}</div>
                          <div style={{ padding:'14px 16px' }}>
                            <div style={{ ...F.display, fontSize:14, fontWeight:900, color:J.ink, marginBottom:6 }}>{v.title}</div>
                            <div style={{ display:'flex', gap:8 }}>
                              <span style={{ ...F.body, fontSize:11, color:J.muted }}>{v.duration}</span>
                              <span style={{ background:`${v.color}15`, color:v.color, borderRadius:999, padding:'1px 7px', ...F.body, fontSize:11, fontWeight:700 }}>{v.level}</span>
                              <span style={{ ...F.mono, fontSize:11, color:J.goldDk, fontWeight:700 }}>+{v.xp} XP</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
