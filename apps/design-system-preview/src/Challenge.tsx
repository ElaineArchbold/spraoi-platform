/**
 * Spraoi Challenge — Healthy Habits Module
 *
 * Module colour: Green (#43a047)
 * Purpose: Building healthy habits through daily, weekly & monthly challenges
 * Desktop: Coach progress dashboard
 * Mobile: Player experience
 * Mascots: Moderate — celebrations, achievements, empty states only
 */

import { useState } from 'react'
import spraioIcon from './imports/spraoi-icon.png'
import rorySrc from './imports/Rory.png'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  // Green ramp (module primary)
  g50:  '#e8f5e9', g100: '#c8e6c9', g200: '#a5d6a7', g300: '#81c784',
  g400: '#66bb6a', g500: '#4caf50', g600: '#43a047',
  g700: '#388e3c', g800: '#2e7d32', g900: '#1b5e20',
  // Habit category colours
  water:  '#29b6f6',
  move:   '#43a047',
  veg:    '#8bc34a',
  sleep:  '#7c4dff',
  screen: '#ff6d00',
  mind:   '#00bcd4',
  // XP gold
  gold: '#fbc02d', goldDk: '#f9a825',
  // Neutrals
  navy: '#0b2545', ink: '#13243b', sub: '#4a5e78', muted: '#627187',
  line: '#dfe7ef', soft: '#f6f9fc', cream: '#fffaf2', white: '#ffffff',
  // Shadows
  cardSh:  '0 4px 20px rgba(67,160,71,.10)',
  greenSh: '0 8px 28px rgba(67,160,71,.28)',
  goldSh:  '0 8px 24px rgba(251,192,45,.35)',
}

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body:    { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono:    { fontFamily: "'JetBrains Mono', monospace" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const ME = {
  name: 'Ciarán Ó Murchú', level: 7, xpTotal: 8450, xpWeek: 840,
  streak: 7, longestStreak: 14, club: "St. Finbarr's",
}

const DAILY_HABITS = [
  { id: 'water',  icon: '💧', name: 'Hydration',    desc: 'Drink 8 glasses of water',       xp: 60, max: 8, done: 5, color: G.water  },
  { id: 'move',   icon: '🏃', name: 'Movement',     desc: '30 mins of active movement',      xp: 80, max: 1, done: 1, color: G.move   },
  { id: 'veg',    icon: '🥗', name: 'Nutrition',    desc: '5 fruit & veg portions today',    xp: 70, max: 5, done: 3, color: G.veg    },
  { id: 'sleep',  icon: '😴', name: 'Sleep',        desc: '8 hours quality sleep',           xp: 50, max: 1, done: 1, color: G.sleep  },
  { id: 'screen', icon: '📵', name: 'Screen-free',  desc: '1 hour no screens before bed',   xp: 40, max: 1, done: 0, color: G.screen },
]

const WEEKLY_CHALLENGES = [
  { icon: '💧', name: '7-Day Hydration Streak',    desc: 'Hit your hydration goal every day this week', xp: 400, progress: 5, max: 7, color: G.water  },
  { icon: '🏃', name: 'Log 5 Training Sessions',  desc: 'Attend and log 5 sessions this week',          xp: 350, progress: 3, max: 5, color: G.move   },
  { icon: '🎯', name: 'Complete 10 Daily Habits',  desc: 'Finish any 10 daily challenges this week',     xp: 500, progress: 7, max: 10, color: G.g600  },
  { icon: '😴', name: 'Sleep Well Every Night',    desc: 'Log 8 hours sleep each night',                 xp: 300, progress: 4, max: 7, color: G.sleep  },
]

const MONTHLY = {
  name: 'August Health Kickstart',
  desc: 'Complete all 5 daily challenges for 20 days in August',
  xp: 2000, daysTarget: 20, daysDone: 3, color: G.g600,
  icon: '🏆',
}

const BADGES = [
  { emoji: '🔥', name: '7-Day Streak',   rarity: 'uncommon', earned: true  },
  { emoji: '💧', name: 'Hydration Hero', rarity: 'common',   earned: true  },
  { emoji: '🏃', name: 'Move Master',    rarity: 'uncommon', earned: true  },
  { emoji: '🥗', name: 'Veggie Champ',   rarity: 'common',   earned: true  },
  { emoji: '🌙', name: 'Sleep Champion', rarity: 'uncommon', earned: false },
  { emoji: '⚡', name: 'XP Milestone',   rarity: 'rare',     earned: false },
  { emoji: '👑', name: 'Perfect Week',   rarity: 'epic',     earned: false },
  { emoji: '🌟', name: 'Month Champion', rarity: 'legendary',earned: false },
]

const PLAYERS = [
  { name: 'Éabha Ní Mhurchú',     xpWeek:1100, streak:21, completion:97, trend:'+12%' },
  { name: 'Niamh Ní Bhriain',      xpWeek: 980, streak:12, completion:87, trend:'+8%'  },
  { name: 'Fionn Ó Duibhir',       xpWeek: 870, streak:11, completion:80, trend:'+5%'  },
  { name: 'Ciarán Ó Murchú',       xpWeek: 840, streak: 7, completion:77, trend:'+3%', isMe:true },
  { name: 'Saoirse de Paor',       xpWeek: 760, streak: 9, completion:83, trend:'+6%'  },
  { name: 'Aoife de Búrca',        xpWeek: 720, streak:18, completion:93, trend:'+14%' },
  { name: 'Tomás Mac Cárthaigh',   xpWeek: 540, streak: 6, completion:70, trend:'-2%'  },
  { name: 'Pádraig Ó Ceallaigh',   xpWeek: 450, streak: 5, completion:60, trend:'+1%'  },
  { name: 'Mairéad Ní Cheallaigh', xpWeek: 380, streak: 4, completion:53, trend:'-4%'  },
  { name: 'Seán Mac Gearailt',     xpWeek: 620, streak: 3, completion:63, trend:'+2%'  },
  { name: 'Caoimhe Ní Fhaoláin',   xpWeek: 590, streak:14, completion:90, trend:'+10%' },
  { name: 'Rónán Ó Briain',        xpWeek: 320, streak: 2, completion:43, trend:'-8%'  },
]

// ─── Shared components ────────────────────────────────────────────────────────
function ProgressRing({ value, max, color, size = 80, stroke = 9 }: { value: number; max: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(value / max, 1))
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

function HBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, background: G.line, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg,${color},${color}cc)`, borderRadius: height / 2, boxShadow: `0 2px 6px ${color}50`, transition: 'width .5s ease' }} />
    </div>
  )
}

function StreakPill({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ff6d0018', border: '1px solid #ff6d0030', borderRadius: 999, padding: '4px 10px' }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: '#e64a19' }}>{count} day streak</span>
    </div>
  )
}

function XPBadge({ xp, color = G.goldDk }: { xp: number; color?: string }) {
  return (
    <div style={{ background: `${G.gold}20`, border: `1px solid ${G.gold}50`, borderRadius: 8, padding: '3px 9px' }}>
      <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color }}>{xp > 0 ? '+' : ''}{xp} XP</span>
    </div>
  )
}

function CompletionDot({ filled, color = G.g600 }: { filled: boolean; color?: string }) {
  return (
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: filled ? color : G.line, transition: 'background .2s' }} />
  )
}

// August 2026 habit calendar — Aug 1 = Saturday (idx 6)
function HabitCalendar() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const today = 3 // Aug 3
  const startDay = 6 // Saturday

  // Completed days (Aug 1-3, Aug 3 partial)
  const completedDays: Record<number, number> = { 1: 5, 2: 4, 3: 3 }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ ...F.mono, fontSize: 10, color: G.muted, textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const done = completedDays[d] ?? 0
          const isToday = d === today
          const isFuture = d > today
          const fullDay = done === 5
          return (
            <div key={d} style={{
              aspect: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              borderRadius: 8, border: isToday ? `2px solid ${G.g600}` : '1px solid transparent',
              background: fullDay ? G.g600 : done > 0 ? `${G.g600}30` : isFuture ? G.soft : G.line,
              padding: '4px 0',
            }}>
              <span style={{ ...F.mono, fontSize: 10, fontWeight: 700, color: fullDay ? G.white : isFuture ? G.line : G.sub }}>{d}</span>
              {!isFuture && <div style={{ display: 'flex', gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i < done ? (fullDay ? G.white : G.g600) : 'rgba(0,0,0,.1)' }} />
                ))}
              </div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Challenge mascot — moderate presence ─────────────────────────────────────
// Rory the Red Deer — Challenge module mascot. Green jersey. Fast · Balanced · Strong.
// Moderate use: profile encouragement, coach tips. Not in regular screens.
function ChallengeMascot({ pose = 'cheer', size = 120, message }: { pose?: 'wave'|'cheer'|'celebrate'|'sleep'; size?: number; message?: string }) {
  const poseEmoji: Record<string, string> = { wave: '👋', cheer: '⭐', celebrate: '🎉', sleep: '💤' }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      {message && (
        <div style={{ background: G.white, border: `2px solid ${G.g200}`, borderRadius: '16px 16px 16px 4px', padding: '8px 14px', maxWidth: 220, marginLeft: 20, boxShadow: G.cardSh }}>
          <p style={{ ...F.display, fontSize: 13, fontWeight: 700, color: G.ink, margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
      )}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={rorySrc}
          alt={`Rory the Red Deer — ${pose}`}
          style={{ height: size, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        {size >= 60 && (
          <div style={{ position: 'absolute', top: -4, right: -8, fontSize: size >= 100 ? 20 : 12, lineHeight: 1 }}>
            {poseEmoji[pose]}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS
// ════════════════════════════════════════════════════════════════════════════

function MobileStatusBar() {
  return (
    <div style={{ padding: '26px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ ...F.mono, fontSize: 12, color: G.white, fontWeight: 700 }}>9:41</span>
      <div style={{ display: 'flex', gap: 5 }}>
        <span style={{ fontSize: 10, color: G.white }}>▪▪▪ 🔋</span>
      </div>
    </div>
  )
}

// ─── Today — Daily Habits ─────────────────────────────────────────────────────
function TodayScreen() {
  const [habits, setHabits] = useState(DAILY_HABITS)
  const totalXP = habits.reduce((s, h) => s + (h.done >= h.max ? h.xp : 0), 0)
  const maxXP = habits.reduce((s, h) => s + h.xp, 0)

  function increment(id: string) {
    setHabits(hs => hs.map(h => h.id === id && h.done < h.max ? { ...h, done: h.done + 1 } : h))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Green header */}
      <div style={{ background: `linear-gradient(160deg, ${G.g900} 0%, ${G.g700} 55%, ${G.g500} 100%)`, paddingBottom: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        <div style={{ position: 'absolute', bottom: -10, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <MobileStatusBar />
        <div style={{ padding: '10px 20px 0' }}>
          <p style={{ ...F.body, fontSize: 12, color: 'rgba(255,255,255,.65)', margin: '0 0 2px' }}>Monday 3 August</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ ...F.display, fontSize: 24, fontWeight: 900, color: G.white, margin: '0 0 8px', letterSpacing: '-0.04em' }}>Today&apos;s Habits</h1>
              <StreakPill count={ME.streak} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...F.mono, fontSize: 22, fontWeight: 700, color: G.gold }}>{totalXP}</div>
              <div style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>of {maxXP} XP</div>
            </div>
          </div>
          {/* Daily XP bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(totalXP / maxXP) * 100}%`, height: '100%', background: `linear-gradient(90deg,${G.gold},#ffeb3b)`, borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Habit rings overview */}
      <div style={{ margin: '-14px 16px 0', background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '16px', boxShadow: G.cardSh, display: 'flex', justifyContent: 'space-around', zIndex: 1, position: 'relative' }}>
        {habits.map(h => {
          const complete = h.done >= h.max
          return (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                <ProgressRing value={h.done} max={h.max} color={h.color} size={52} stroke={6} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {complete ? '✅' : h.icon}
                </div>
              </div>
              <span style={{ ...F.mono, fontSize: 10, fontWeight: 700, color: complete ? h.color : G.muted }}>{h.done}/{h.max}</span>
            </div>
          )
        })}
      </div>

      {/* Challenge cards */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {habits.map(h => {
          const complete = h.done >= h.max
          return (
            <div key={h.id} style={{
              background: G.white, borderRadius: 18, border: `1.5px solid ${complete ? h.color + '50' : G.line}`,
              borderLeft: `5px solid ${h.color}`, padding: '14px 16px',
              boxShadow: complete ? `0 4px 16px ${h.color}20` : G.cardSh,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${h.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {complete ? '✅' : h.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: complete ? G.muted : G.ink }}>{h.name}</div>
                    <XPBadge xp={complete ? h.xp : 0} color={complete ? G.goldDk : G.muted} />
                  </div>
                  <p style={{ ...F.body, fontSize: 12, color: G.muted, margin: '3px 0 8px' }}>{h.desc}</p>
                  {!complete && (
                    <>
                      <HBar value={h.done} max={h.max} color={h.color} height={6} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ ...F.mono, fontSize: 11, color: G.muted }}>{h.done} / {h.max}</span>
                        <button onClick={() => increment(h.id)} style={{
                          height: 28, padding: '0 14px', background: h.color, border: 'none', borderRadius: 8, cursor: 'pointer',
                          ...F.display, fontSize: 12, fontWeight: 800, color: G.white,
                          boxShadow: `0 4px 12px ${h.color}40`,
                        }}>+ Log one</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Weekly + Monthly Challenges ──────────────────────────────────────────────
function WeekScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${G.g900}, ${G.g600})`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0' }}>
          <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Week 1 of August</p>
          <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: G.white, letterSpacing: '-0.04em', margin: '2px 0 4px' }}>Weekly Challenges</h2>
          <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.65)', margin: 0 }}>5 days remaining this week</p>
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, background: G.soft }}>
        {/* Weekly challenges */}
        <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>Weekly Challenges</div>
        {WEEKLY_CHALLENGES.map((w, i) => {
          const pct = (w.progress / w.max) * 100
          return (
            <div key={i} style={{ background: G.white, borderRadius: 18, border: `1.5px solid ${G.line}`, borderLeft: `5px solid ${w.color}`, padding: '16px', boxShadow: G.cardSh }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${w.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{w.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: G.ink }}>{w.name}</div>
                    <div style={{ background: `${G.gold}20`, border: `1px solid ${G.gold}50`, borderRadius: 8, padding: '3px 8px', flexShrink: 0, marginLeft: 8 }}>
                      <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: G.goldDk }}>+{w.xp} XP</span>
                    </div>
                  </div>
                  <p style={{ ...F.body, fontSize: 12, color: G.muted, margin: '3px 0 10px' }}>{w.desc}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ ...F.mono, fontSize: 11, color: w.color, fontWeight: 700 }}>{w.progress}/{w.max}</span>
                    <span style={{ ...F.mono, fontSize: 11, color: G.muted }}>{Math.round(pct)}%</span>
                  </div>
                  <HBar value={w.progress} max={w.max} color={w.color} height={7} />
                </div>
              </div>
            </div>
          )
        })}
        {/* Monthly challenge */}
        <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginTop: 4 }}>Monthly Challenge</div>
        <div style={{ background: `linear-gradient(135deg, ${G.g800}, ${G.g600})`, borderRadius: 20, padding: '20px', color: G.white, boxShadow: G.greenSh, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{MONTHLY.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.white }}>{MONTHLY.name}</div>
              <p style={{ ...F.body, fontSize: 12, color: 'rgba(255,255,255,.7)', margin: '4px 0 12px' }}>{MONTHLY.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...F.display, fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,.8)' }}>{MONTHLY.daysDone}/{MONTHLY.daysTarget} days</span>
                <div style={{ background: `${G.gold}40`, border: `1px solid ${G.gold}60`, borderRadius: 8, padding: '3px 8px' }}>
                  <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: G.gold }}>+{MONTHLY.xp} XP</span>
                </div>
              </div>
              <HBar value={MONTHLY.daysDone} max={MONTHLY.daysTarget} color={G.gold} height={7} />
              <p style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.5)', margin: '6px 0 0' }}>{MONTHLY.daysTarget - MONTHLY.daysDone} days to go — you&apos;ve got this!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardScreen() {
  const [tab, setTab] = useState<'personal'|'club'>('personal')
  const sorted = [...PLAYERS].sort((a, b) => b.xpWeek - a.xpWeek)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${G.g900}, ${G.g600})`, padding: '28px 20px 16px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0' }}>
          <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: G.white, letterSpacing: '-0.04em', margin: '0 0 12px' }}>Rankings</h2>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: 4 }}>
            {(['personal', 'club'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 30, border: 'none', borderRadius: 7, cursor: 'pointer', background: tab === t ? G.white : 'transparent', color: tab === t ? G.g700 : 'rgba(255,255,255,.55)', ...F.display, fontSize: 12, fontWeight: 800, transition: 'all .15s' }}>
                {t === 'personal' ? 'Team XP' : 'Club Rankings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, background: G.soft }}>
        {tab === 'personal' && sorted.map((p, i) => (
          <div key={p.name} style={{
            background: p.isMe ? `${G.g600}15` : G.white,
            border: `2px solid ${p.isMe ? G.g600 : G.line}`,
            borderRadius: 16, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 32, textAlign: 'center', ...F.display, fontSize: 18, fontWeight: 900, color: i === 0 ? G.gold : i === 1 ? G.muted : i === 2 ? '#cd7f32' : G.muted }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${G.g600}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 15, fontWeight: 900, color: G.g700, flexShrink: 0 }}>
              {p.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: G.ink }}>{p.name}</span>
                {p.isMe && <span style={{ ...F.body, fontSize: 9, fontWeight: 700, color: G.g700, background: `${G.g600}20`, borderRadius: 999, padding: '1px 5px' }}>YOU</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <span style={{ ...F.mono, fontSize: 10, color: G.goldDk, fontWeight: 700 }}>{p.xpWeek.toLocaleString()} XP/wk</span>
                <span style={{ ...F.body, fontSize: 10, color: '#e64a19' }}>🔥 {p.streak}d</span>
                <span style={{ ...F.mono, fontSize: 10, color: p.completion >= 80 ? G.g600 : G.muted }}>{p.completion}%</span>
              </div>
            </div>
            <span style={{ ...F.mono, fontSize: 11, color: p.trend.startsWith('+') ? G.g600 : '#e64a19', fontWeight: 700 }}>{p.trend}</span>
          </div>
        ))}
        {tab === 'club' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name:"St. Finbarr's",   rank:1, avgXP:920, members:24, color:'#1D4E89' },
              { name:"Naomh Eoin",       rank:2, avgXP:880, members:18, color:'#2E7D32' },
              { name:"Fingallians",      rank:3, avgXP:840, members:32, color:'#B3202E' },
              { name:"Ratoath",          rank:4, avgXP:780, members:21, color:'#1C5FA8' },
              { name:"Navan O'Mahony's", rank:5, avgXP:710, members:19, color:'#8C1A2B' },
            ].map((club, i) => (
              <div key={club.name} style={{ background: G.white, borderRadius: 16, border: `1.5px solid ${G.line}`, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', borderLeft: `5px solid ${club.color}`, boxShadow: G.cardSh }}>
                <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: i < 3 ? G.gold : G.muted, width: 28 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${club.rank}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>{club.name}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                    <span style={{ ...F.mono, fontSize: 11, color: G.goldDk, fontWeight: 700 }}>avg {club.avgXP} XP</span>
                    <span style={{ ...F.body, fontSize: 11, color: G.muted }}>{club.members} players</span>
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

// ─── Progress — habit calendar + stats ───────────────────────────────────────
function ProgressScreen() {
  const categories = [
    { label: 'Hydration',   icon: '💧', color: G.water,  pct: 63 },
    { label: 'Movement',    icon: '🏃', color: G.move,   pct: 100 },
    { label: 'Nutrition',   icon: '🥗', color: G.veg,    pct: 60 },
    { label: 'Sleep',       icon: '😴', color: G.sleep,  pct: 100 },
    { label: 'Screen-free', icon: '📵', color: G.screen, pct: 0  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${G.g900}, ${G.g600})`, padding: '28px 20px 20px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ ...F.display, fontSize: 22, fontWeight: 900, color: G.white, letterSpacing: '-0.04em', margin: '0 0 6px' }}>My Progress</h2>
            <StreakPill count={ME.streak} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...F.display, fontSize: 28, fontWeight: 900, color: G.gold, letterSpacing: '-0.06em' }}>{ME.xpTotal.toLocaleString()}</div>
            <div style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Total XP</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, background: G.soft }}>
        {/* Habit calendar */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '18px', boxShadow: G.cardSh }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink }}>August 2026</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.g600 }} />
                <span style={{ ...F.body, fontSize: 10, color: G.muted }}>All done</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: `${G.g600}30` }} />
                <span style={{ ...F.body, fontSize: 10, color: G.muted }}>Partial</span>
              </div>
            </div>
          </div>
          <HabitCalendar />
        </div>

        {/* Category breakdown */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '18px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink, marginBottom: 14 }}>Today&apos;s Completion</div>
          {categories.map(cat => (
            <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 18, width: 24 }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ ...F.body, fontSize: 12, fontWeight: 600, color: G.ink }}>{cat.label}</span>
                  <span style={{ ...F.mono, fontSize: 11, fontWeight: 700, color: cat.color }}>{cat.pct}%</span>
                </div>
                <HBar value={cat.pct} max={100} color={cat.color} height={6} />
              </div>
            </div>
          ))}
        </div>

        {/* Streak stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Current Streak', value: `${ME.streak} days`, icon: '🔥', color: '#ff6d00' },
            { label: 'Longest Ever', value: `${ME.longestStreak} days`, icon: '🏆', color: G.gold },
            { label: 'This Week XP', value: ME.xpWeek.toLocaleString(), icon: '⚡', color: G.g600 },
            { label: 'Total XP', value: ME.xpTotal.toLocaleString(), icon: '🌟', color: G.g600 },
          ].map(s => (
            <div key={s.label} style={{ background: G.white, borderRadius: 16, border: `1px solid ${G.line}`, padding: '14px', boxShadow: G.cardSh, borderTop: `3px solid ${s.color}` }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ ...F.display, fontSize: 18, fontWeight: 900, color: G.ink, marginTop: 6 }}>{s.value}</div>
              <div style={{ ...F.body, fontSize: 11, color: G.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Profile — badges + achievements ─────────────────────────────────────────
function ProfileScreen() {
  const earned = BADGES.filter(b => b.earned)
  const rarityColor: Record<string, string> = { common: G.muted, uncommon: G.g600, rare: '#29b6f6', epic: '#7c4dff', legendary: G.gold }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: `linear-gradient(160deg, ${G.g900}, ${G.g600})`, padding: '28px 20px 24px' }}>
        <MobileStatusBar />
        <div style={{ padding: '8px 0 0', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,.15)', border: '3px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 26, fontWeight: 900, color: G.white, flexShrink: 0 }}>
            {ME.name[0]}
          </div>
          <div>
            <h2 style={{ ...F.display, fontSize: 20, fontWeight: 900, color: G.white, margin: 0, letterSpacing: '-0.04em' }}>{ME.name}</h2>
            <p style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.65)', margin: '3px 0 6px' }}>{ME.club} · Level {ME.level}</p>
            <StreakPill count={ME.streak} />
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, background: G.soft }}>
        {/* Mascot encouragement — moderate, appears in profile */}
        {earned.length >= 4 && (
          <div style={{ background: G.white, borderRadius: 20, border: `2px solid ${G.g200}`, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: G.cardSh }}>
            <ChallengeMascot pose="cheer" size={72} />
            <div>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>Keep it up! 🌟</div>
              <p style={{ ...F.body, fontSize: 12, color: G.sub, margin: '4px 0 0', lineHeight: 1.5 }}>You&apos;ve earned {earned.length} badges and a {ME.streak}-day streak. Your {ME.club} teammates are proud!</p>
            </div>
          </div>
        )}

        {/* Badges */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '18px', boxShadow: G.cardSh }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink }}>My Badges</div>
            <span style={{ ...F.mono, fontSize: 12, color: G.g600, fontWeight: 700 }}>{earned.length}/{BADGES.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BADGES.map(b => {
              const c = rarityColor[b.rarity]
              return (
                <div key={b.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 72, padding: '12px 8px', borderRadius: 14, background: b.earned ? G.white : G.soft, border: `2px solid ${b.earned ? c : G.line}`, boxShadow: b.earned ? `0 4px 12px ${c}25` : 'none', opacity: b.earned ? 1 : 0.45 }}>
                  <span style={{ fontSize: 26, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.emoji}</span>
                  <span style={{ ...F.display, fontSize: 9, fontWeight: 800, color: b.earned ? G.ink : G.muted, textAlign: 'center', lineHeight: 1.2 }}>{b.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent achievements */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '18px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink, marginBottom: 14 }}>Achievements</div>
          {[
            { icon:'🔥', label:'7-Day Streak — achieved today!', xp:200, color:G.g600 },
            { icon:'💧', label:'Hydration Hero — 14 days hydration', xp:150, color:G.water },
            { icon:'🏃', label:'Movement Master — 20 sessions logged', xp:300, color:G.move },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${G.line}`, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1, ...F.body, fontSize: 13, color: G.ink }}>{a.label}</div>
              <XPBadge xp={a.xp} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
const MOBILE_TABS = [
  { id: 'today',    icon: '⚡', label: 'Today'    },
  { id: 'week',     icon: '📅', label: 'Challenges'},
  { id: 'rankings', icon: '🏆', label: 'Rankings'  },
  { id: 'progress', icon: '📊', label: 'Progress'  },
  { id: 'profile',  icon: '👤', label: 'Profile'   },
]

function MobileBottomNav({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  return (
    <div style={{ background: G.white, borderTop: `2px solid ${G.line}`, display: 'flex', padding: '6px 0 16px', flexShrink: 0 }}>
      {MOBILE_TABS.map(item => {
        const isActive = active === item.id
        return (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: isActive ? `linear-gradient(135deg,${G.g600},${G.g400})` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: isActive ? G.greenSh : 'none', transition: 'all .2s' }}>{item.icon}</div>
            <span style={{ ...F.display, fontSize: 10, fontWeight: isActive ? 900 : 600, color: isActive ? G.g600 : G.muted }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DESKTOP — COACH DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

function CoachSidebar({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  const items = [
    { id: 'overview',    icon: '📊', label: 'Team Overview'     },
    { id: 'leaderboard', icon: '🏆', label: 'Leaderboard'       },
    { id: 'manage',      icon: '⚙️', label: 'Manage Challenges' },
    { id: 'stats',       icon: '📈', label: 'Statistics'        },
    { id: 'players',     icon: '👥', label: 'Player Details'    },
  ]

  return (
    <div style={{ width: 230, background: `linear-gradient(180deg, ${G.g900} 0%, ${G.g800} 100%)`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={spraioIcon} alt="Spraoi Sports" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ ...F.display, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Spraoi Sports</div>
            <div style={{ ...F.body, fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2, whiteSpace: 'nowrap' }}>Coach Dashboard</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', background: isActive ? `${G.g600}30` : 'transparent', borderLeft: `3px solid ${isActive ? G.g400 : 'transparent'}`, transition: 'all .15s' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ ...F.display, fontSize: 13, fontWeight: isActive ? 800 : 500, color: isActive ? G.white : 'rgba(255,255,255,.5)' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      {/* Coach badge */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: G.g600, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 15, fontWeight: 900, color: G.white }}>C</div>
          <div>
            <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: G.white }}>Coach Murphy</div>
            <div style={{ ...F.body, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{ME.club}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamOverview() {
  const avgCompletion = Math.round(PLAYERS.reduce((s, p) => s + p.completion, 0) / PLAYERS.length)
  const totalXPWeek = PLAYERS.reduce((s, p) => s + p.xpWeek, 0)
  const topStreak = Math.max(...PLAYERS.map(p => p.streak))

  const habitStats = [
    { icon: '💧', label: 'Hydration',    color: G.water,  pct: 74 },
    { icon: '🏃', label: 'Movement',     color: G.move,   pct: 88 },
    { icon: '🥗', label: 'Nutrition',    color: G.veg,    pct: 67 },
    { icon: '😴', label: 'Sleep',        color: G.sleep,  pct: 71 },
    { icon: '📵', label: 'Screen-free',  color: G.screen, pct: 55 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Active Players', value: `${PLAYERS.length}`, icon: '👥', color: G.g600 },
          { label: 'Avg Completion', value: `${avgCompletion}%`, icon: '✅', color: G.move },
          { label: 'Top Streak',     value: `${topStreak} days`, icon: '🔥', color: G.screen },
          { label: 'XP This Week',   value: totalXPWeek.toLocaleString(), icon: '⚡', color: G.gold },
        ].map(s => (
          <div key={s.label} style={{ background: G.white, borderRadius: 18, border: `1px solid ${G.line}`, borderTop: `4px solid ${s.color}`, padding: '18px 20px', boxShadow: G.cardSh }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...F.body, fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ ...F.display, fontSize: 26, fontWeight: 900, color: G.ink, letterSpacing: '-0.05em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Player table */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, overflow: 'hidden', boxShadow: G.cardSh }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${G.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink }}>Player Progress</div>
            <span style={{ ...F.body, fontSize: 12, color: G.muted }}>{PLAYERS.length} players</span>
          </div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 70px', gap: 8, padding: '10px 20px', background: G.soft, ...F.mono, fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div>#</div><div>Player</div><div style={{ textAlign:'right' }}>XP/Wk</div><div style={{ textAlign:'right' }}>Streak</div><div style={{ textAlign:'right' }}>Done</div><div style={{ textAlign:'right' }}>Trend</div>
          </div>
          {[...PLAYERS].sort((a, b) => b.xpWeek - a.xpWeek).map((p, i) => (
            <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 70px', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${G.line}`, alignItems: 'center', background: p.isMe ? `${G.g600}08` : 'transparent' }}>
              <span style={{ ...F.mono, fontSize: 12, color: i < 3 ? G.gold : G.muted, fontWeight: 700 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${G.g600}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 12, fontWeight: 900, color: G.g700, flexShrink: 0 }}>{p.name[0]}</div>
                <div>
                  <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: G.ink }}>{p.name}</div>
                  <div style={{ width: 60, marginTop: 3 }}><HBar value={p.completion} max={100} color={G.g600} height={4} /></div>
                </div>
              </div>
              <span style={{ ...F.mono, fontSize: 12, color: G.goldDk, fontWeight: 700, textAlign: 'right' }}>{p.xpWeek.toLocaleString()}</span>
              <span style={{ ...F.body, fontSize: 13, color: '#e64a19', textAlign: 'right' }}>🔥 {p.streak}d</span>
              <span style={{ ...F.mono, fontSize: 12, color: p.completion >= 80 ? G.g600 : p.completion >= 60 ? G.goldDk : G.muted, fontWeight: 700, textAlign: 'right' }}>{p.completion}%</span>
              <span style={{ ...F.mono, fontSize: 12, color: p.trend.startsWith('+') ? G.g600 : '#e64a19', fontWeight: 700, textAlign: 'right' }}>{p.trend}</span>
            </div>
          ))}
        </div>

        {/* Habit breakdown + mascot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
            <div style={{ ...F.display, fontSize: 15, fontWeight: 900, color: G.ink, marginBottom: 16 }}>Team Habit Completion</div>
            {habitStats.map(h => (
              <div key={h.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 16 }}>{h.icon}</span>
                    <span style={{ ...F.body, fontSize: 13, fontWeight: 600, color: G.ink }}>{h.label}</span>
                  </div>
                  <span style={{ ...F.mono, fontSize: 12, fontWeight: 700, color: h.color }}>{h.pct}%</span>
                </div>
                <HBar value={h.pct} max={100} color={h.color} height={8} />
              </div>
            ))}
          </div>

          {/* Mascot — appears here as coach encouragement (moderate use) */}
          <div style={{ background: `${G.g600}12`, border: `2px solid ${G.g200}`, borderRadius: 20, padding: '16px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <ChallengeMascot pose="wave" size={80} />
            <div>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.g700 }}>Great team effort! 💪</div>
              <p style={{ ...F.body, fontSize: 12, color: G.sub, margin: '6px 0 0', lineHeight: 1.5 }}>
                Movement is your strongest habit at 88%. Screen-free time needs attention — consider a team challenge to boost it!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManageChallenges() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: G.ink }}>Manage Challenges</div>
          <p style={{ ...F.body, fontSize: 13, color: G.muted, margin: '4px 0 0' }}>Active daily, weekly, and monthly challenges for your team</p>
        </div>
        <button style={{ height: 44, padding: '0 20px', background: G.g600, border: 'none', borderRadius: 12, cursor: 'pointer', ...F.display, fontSize: 14, fontWeight: 800, color: G.white, boxShadow: G.greenSh, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>+</span> Add Challenge
        </button>
      </div>
      {/* Active challenges */}
      <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, overflow: 'hidden', boxShadow: G.cardSh }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${G.line}`, ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>Active Challenges</div>
        {DAILY_HABITS.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${G.line}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${h.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{h.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>{h.name}</div>
              <div style={{ ...F.body, fontSize: 12, color: G.muted }}>{h.desc} · Daily</div>
            </div>
            <XPBadge xp={h.xp} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ height: 30, padding: '0 12px', background: `${G.g600}15`, border: `1px solid ${G.g600}30`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: G.g700 }}>Edit</button>
              <button style={{ height: 30, padding: '0 12px', background: 'transparent', border: `1px solid ${G.line}`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: G.muted }}>Pause</button>
            </div>
          </div>
        ))}
        {WEEKLY_CHALLENGES.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${G.line}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${w.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{w.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>{w.name}</div>
              <div style={{ ...F.body, fontSize: 12, color: G.muted }}>{w.desc} · Weekly</div>
            </div>
            <XPBadge xp={w.xp} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ height: 30, padding: '0 12px', background: `${G.g600}15`, border: `1px solid ${G.g600}30`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: G.g700 }}>Edit</button>
              <button style={{ height: 30, padding: '0 12px', background: 'transparent', border: `1px solid ${G.line}`, borderRadius: 8, cursor: 'pointer', ...F.body, fontSize: 12, fontWeight: 700, color: G.muted }}>Pause</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Statistics() {
  const weeks = ['Jul W3','Jul W4','Aug W1']
  const teamData = [680, 760, 820]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: G.ink }}>Statistics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Weekly XP trend */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginBottom: 20 }}>Weekly Team XP</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 120 }}>
            {weeks.map((w, i) => (
              <div key={w} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ ...F.mono, fontSize: 11, color: G.g600, fontWeight: 700 }}>{teamData[i].toLocaleString()}</span>
                <div style={{ width: '80%', borderRadius: '6px 6px 0 0', background: i === weeks.length - 1 ? G.g600 : `${G.g600}50`, height: `${(teamData[i] / 820) * 100}px`, transition: 'height .4s' }} />
                <span style={{ ...F.mono, fontSize: 10, color: G.muted }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Completion rate by day */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginBottom: 20 }}>Daily Completion Rate (Aug)</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
            {[76, 82, 74, 0, 0, 0].map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '80%', borderRadius: '4px 4px 0 0', background: v > 0 ? `${G.g600}${Math.round(v / 100 * 255).toString(16).padStart(2,'0')}` : G.line, height: `${v > 0 ? v : 10}px` }} />
                <span style={{ ...F.mono, fontSize: 10, color: G.muted }}>Aug {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Habit breakdown */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginBottom: 16 }}>Habit Completion Rates</div>
          {[
            { icon:'💧', label:'Hydration',   color:G.water,  pct:74 },
            { icon:'🏃', label:'Movement',    color:G.move,   pct:88 },
            { icon:'🥗', label:'Nutrition',   color:G.veg,    pct:67 },
            { icon:'😴', label:'Sleep',       color:G.sleep,  pct:71 },
            { icon:'📵', label:'Screen-free', color:G.screen, pct:55 },
          ].map(h => (
            <div key={h.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ ...F.body, fontSize: 12, color: G.ink }}>{h.icon} {h.label}</span>
                <span style={{ ...F.mono, fontSize: 11, color: h.color, fontWeight: 700 }}>{h.pct}%</span>
              </div>
              <HBar value={h.pct} max={100} color={h.color} height={8} />
            </div>
          ))}
        </div>
        {/* Player engagement */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginBottom: 16 }}>Player Engagement</div>
          {[
            { label: 'Daily active players', value: '10 / 12', color: G.g600 },
            { label: 'Avg completion this week', value: '77%', color: G.g600 },
            { label: 'Players on 7+ day streak', value: '5', color: G.screen },
            { label: 'Monthly challenge on track', value: '8 / 12', color: G.gold },
            { label: 'Total XP earned (Aug)', value: '6,240', color: G.goldDk },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${G.line}` }}>
              <span style={{ ...F.body, fontSize: 13, color: G.ink }}>{s.label}</span>
              <span style={{ ...F.mono, fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DesktopLeaderboard() {
  const sorted = [...PLAYERS].sort((a, b) => b.xpWeek - a.xpWeek)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...F.display, fontSize: 20, fontWeight: 900, color: G.ink }}>Leaderboard — This Week</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, overflow: 'hidden', boxShadow: G.cardSh }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 90px 80px', gap: 8, padding: '12px 20px', background: G.soft, ...F.mono, fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div>#</div><div>Player</div><div style={{ textAlign:'right' }}>XP</div><div style={{ textAlign:'right' }}>Streak</div><div style={{ textAlign:'right' }}>Completion</div><div style={{ textAlign:'right' }}>Trend</div>
          </div>
          {sorted.map((p, i) => (
            <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 90px 80px', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${G.line}`, alignItems: 'center', background: p.isMe ? `${G.g600}06` : 'transparent' }}>
              <span style={{ ...F.display, fontSize: 18, fontWeight: 900, color: i < 3 ? G.gold : G.muted }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${G.g600}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 14, fontWeight: 900, color: G.g700 }}>{p.name[0]}</div>
                <div style={{ ...F.display, fontSize: 14, fontWeight: 800, color: G.ink }}>
                  {p.name}
                  {p.isMe && <span style={{ marginLeft: 6, ...F.body, fontSize: 10, fontWeight: 700, color: G.g700, background: `${G.g600}20`, borderRadius: 999, padding: '1px 6px', verticalAlign: 'middle' }}>YOU</span>}
                </div>
              </div>
              <span style={{ ...F.mono, fontSize: 13, color: G.goldDk, fontWeight: 700, textAlign: 'right' }}>{p.xpWeek.toLocaleString()}</span>
              <span style={{ ...F.body, fontSize: 13, color: '#e64a19', textAlign: 'right' }}>🔥 {p.streak}</span>
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <div style={{ width: 50 }}><HBar value={p.completion} max={100} color={p.completion >= 80 ? G.g600 : G.goldDk} height={5} /></div>
                <span style={{ ...F.mono, fontSize: 12, color: p.completion >= 80 ? G.g600 : G.muted, fontWeight: 700 }}>{p.completion}%</span>
              </div>
              <span style={{ ...F.mono, fontSize: 12, color: p.trend.startsWith('+') ? G.g600 : '#e64a19', fontWeight: 700, textAlign: 'right' }}>{p.trend}</span>
            </div>
          ))}
        </div>
        {/* Club rankings */}
        <div style={{ background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, padding: '20px', boxShadow: G.cardSh }}>
          <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink, marginBottom: 16 }}>Club Rankings</div>
          {[
            { name:"St. Finbarr's",   avgXP: 920, members: 24, color:'#1D4E89' },
            { name:"Naomh Eoin",       avgXP: 880, members: 18, color:'#2E7D32' },
            { name:"Fingallians",      avgXP: 840, members: 32, color:'#B3202E' },
            { name:"Ratoath",          avgXP: 780, members: 21, color:'#1C5FA8' },
          ].map((club, i) => (
            <div key={club.name} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${G.line}`, alignItems: 'center' }}>
              <span style={{ ...F.display, fontSize: 20, color: i < 3 ? G.gold : G.muted, width: 28 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <div style={{ flex: 1 }}>
                <div style={{ ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>{club.name}</div>
                <div style={{ ...F.body, fontSize: 12, color: G.muted }}>{club.members} players</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...F.mono, fontSize: 13, fontWeight: 700, color: G.goldDk }}>{club.avgXP}</div>
                <div style={{ ...F.body, fontSize: 10, color: G.muted }}>avg XP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayerDetails() {
  const [selected, setSelected] = useState(0)
  const sorted = [...PLAYERS].sort((a, b) => b.xpWeek - a.xpWeek)
  const player = sorted[selected]

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Player list */}
      <div style={{ width: 260, background: G.white, borderRadius: 20, border: `1px solid ${G.line}`, overflow: 'hidden', boxShadow: G.cardSh, flexShrink: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${G.line}`, ...F.display, fontSize: 14, fontWeight: 900, color: G.ink }}>All Players</div>
        {sorted.map((p, i) => (
          <button key={p.name} onClick={() => setSelected(i)}
            style={{ width: '100%', display: 'flex', gap: 10, padding: '12px 20px', borderBottom: `1px solid ${G.line}`, border: 'none', cursor: 'pointer', background: selected === i ? `${G.g600}12` : 'transparent', borderLeft: `4px solid ${selected === i ? G.g600 : 'transparent'}`, alignItems: 'center', textAlign: 'left' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${G.g600}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 13, fontWeight: 900, color: G.g700 }}>{p.name[0]}</div>
            <div>
              <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: G.ink }}>{p.name}</div>
              <div style={{ ...F.mono, fontSize: 10, color: G.muted }}>{p.xpWeek.toLocaleString()} XP · 🔥{p.streak}d</div>
            </div>
          </button>
        ))}
      </div>
      {/* Player detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: `linear-gradient(135deg, ${G.g800}, ${G.g600})`, borderRadius: 20, padding: '24px', color: G.white, boxShadow: G.greenSh, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F.display, fontSize: 26, fontWeight: 900, color: G.white }}>{player.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...F.display, fontSize: 22, fontWeight: 900, color: G.white }}>{player.name}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <span style={{ ...F.mono, fontSize: 13, color: G.gold, fontWeight: 700 }}>{player.xpWeek.toLocaleString()} XP this week</span>
              <span style={{ ...F.body, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>🔥 {player.streak}-day streak</span>
              <span style={{ ...F.mono, fontSize: 13, color: player.completion >= 80 ? '#a5d6a7' : 'rgba(255,255,255,.5)', fontWeight: 700 }}>{player.completion}% completion</span>
            </div>
          </div>
          <span style={{ ...F.mono, fontSize: 20, color: player.trend.startsWith('+') ? G.gold : '#ffcdd2', fontWeight: 700 }}>{player.trend}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {DAILY_HABITS.map(h => {
            const pct = h.id === 'move' ? 100 : h.id === 'sleep' ? 100 : Math.round((h.done / h.max) * 100)
            return (
              <div key={h.id} style={{ background: G.white, borderRadius: 16, border: `1.5px solid ${G.line}`, padding: '16px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: G.cardSh }}>
                <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <ProgressRing value={pct} max={100} color={h.color} size={56} stroke={7} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{h.icon}</div>
                </div>
                <div>
                  <div style={{ ...F.display, fontSize: 13, fontWeight: 900, color: G.ink }}>{h.name}</div>
                  <div style={{ ...F.mono, fontSize: 13, fontWeight: 700, color: h.color }}>{pct}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function Challenge() {
  const [mode, setMode] = useState<'mobile'|'desktop'>('mobile')
  const [mScreen, setMScreen] = useState('today')
  const [dScreen, setDScreen] = useState('overview')

  const renderMobile = () => {
    switch (mScreen) {
      case 'today':    return <TodayScreen />
      case 'week':     return <WeekScreen />
      case 'rankings': return <LeaderboardScreen />
      case 'progress': return <ProgressScreen />
      case 'profile':  return <ProfileScreen />
      default:         return <TodayScreen />
    }
  }

  const renderDesktop = () => {
    switch (dScreen) {
      case 'overview':    return <TeamOverview />
      case 'leaderboard': return <DesktopLeaderboard />
      case 'manage':      return <ManageChallenges />
      case 'stats':       return <Statistics />
      case 'players':     return <PlayerDetails />
      default:            return <TeamOverview />
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...F.body }}>
      {/* Meta bar */}
      <div style={{ background: G.g900, borderBottom: '1px solid rgba(255,255,255,.08)', padding: '0 20px', height: 44, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <img src={spraioIcon} alt="Spraoi" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ ...F.display, fontSize: 13, fontWeight: 900, color: G.white }}>Spraoi Challenge</span>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['mobile','desktop'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === m ? G.white : 'transparent', color: mode === m ? G.g800 : 'rgba(255,255,255,.5)', ...F.body, fontSize: 11, fontWeight: 700, transition: 'all .15s' }}>
              {m === 'mobile' ? '📱 Player' : '🖥 Coach'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(mode === 'mobile'
            ? [['today','Today'],['week','Challenges'],['rankings','Rankings'],['progress','Progress'],['profile','Profile']]
            : [['overview','Overview'],['leaderboard','Leaderboard'],['manage','Manage'],['stats','Statistics'],['players','Players']]
          ).map(([id, label]) => (
            <button key={id} onClick={() => mode === 'mobile' ? setMScreen(id) : setDScreen(id)}
              style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: (mode === 'mobile' ? mScreen : dScreen) === id ? `${G.g400}70` : 'transparent', color: (mode === 'mobile' ? mScreen : dScreen) === id ? G.white : 'rgba(255,255,255,.45)', ...F.body, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {mode === 'mobile' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${G.g900} 0%, ${G.g700} 50%, ${G.g500} 100%)`, padding: '20px' }}>
            {/* Floating greenery */}
            <div style={{ position: 'absolute', top: '12%', left: '8%', fontSize: 28, opacity:.25 }}>🌿</div>
            <div style={{ position: 'absolute', top: '22%', right: '10%', fontSize: 22, opacity:.2 }}>🍀</div>
            <div style={{ position: 'absolute', bottom: '18%', left: '6%', fontSize: 24, opacity:.18 }}>🌱</div>
            <div style={{ position: 'absolute', bottom: '28%', right: '7%', fontSize: 18, opacity:.2 }}>⭐</div>
            <div style={{
              width: 393, height: '100%', maxHeight: 852,
              borderRadius: 46, border: '8px solid #0a1a0e',
              background: G.white, overflow: 'hidden', position: 'relative',
              boxShadow: '0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, overflow: 'auto' }}>{renderMobile()}</div>
              <MobileBottomNav active={mScreen} onNav={setMScreen} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <CoachSidebar active={dScreen} onNav={setDScreen} />
            <div style={{ flex: 1, overflow: 'auto', background: G.soft }}>
              {/* Desktop topbar */}
              <div style={{ background: G.white, borderBottom: `1px solid ${G.line}`, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: G.cardSh }}>
                <div style={{ ...F.display, fontSize: 16, fontWeight: 900, color: G.ink }}>
                  {dScreen === 'overview' && 'Team Overview'}
                  {dScreen === 'leaderboard' && 'Leaderboard'}
                  {dScreen === 'manage' && 'Manage Challenges'}
                  {dScreen === 'stats' && 'Statistics'}
                  {dScreen === 'players' && 'Player Details'}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ ...F.body, fontSize: 12, color: G.muted }}>Monday, 3 August 2026</span>
                  <div style={{ height: 32, width: 1, background: G.line }} />
                  <StreakPill count={0} />
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
