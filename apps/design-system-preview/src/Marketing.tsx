/**
 * Spraoi Sports — Marketing Website
 *
 * Layout: preserved exactly from ElaineArchbold/spraoi-sports
 * What changed: every img_0474–img_0482.webp screenshot replaced with
 * premium React-drawn product mockups.
 *
 * New sections added (keeping same design language):
 * Journey (with mascot story), Coach, Connect, Club
 *
 * Tokens are the website's CSS variables — verbatim.
 */

import React, { useState, useEffect, useRef } from 'react'
import spraioLogo from './imports/spraoi-logo.png-1.png'
import spraioIcon from './imports/spraoi-icon.png'
import otisSrc from './imports/Otis.png'
import finnSrc from './imports/Finn.png'
import rorySrc from './imports/Rory.png'
import shellySrc from './imports/Shelly.png'
import bellaSrc from './imports/Bella.png'
import hazelSrc from './imports/Hazel.png'

// ─── Website tokens (verbatim from spraoi-sports style.css) ──────────────────
const C = {
  navy:   '#0b2545',
  blue:   '#0d47a1',
  blue2:  '#42a5f5',
  green:  '#43a047',
  orange: '#fb8c00',
  sky:    '#29b6f6',
  purple: '#8e24aa',
  yellow: '#fbc02d',
  coral:  '#e64a19',
  cream:  '#fffaf2',
  ink:    '#13243b',
  muted:  '#627187',
  line:   '#dfe7ef',
  soft:   '#f6f9fc',
  white:  '#ffffff',
}

const S = {
  main:   '0 24px 70px rgba(13,49,87,.16)',
  card:   '0 14px 35px rgba(15,45,79,.07)',
  device: '0 30px 65px rgba(11,37,69,.24)',
  green:  '0 12px 30px rgba(67,160,71,.25)',
  orange: '0 10px 25px rgba(251,140,0,.22)',
  purple: '0 10px 25px rgba(142,36,170,.22)',
  coral:  '0 10px 25px rgba(230,74,25,.22)',
  sky:    '0 10px 25px rgba(41,182,246,.22)',
}

// ─── Shared typography helpers ────────────────────────────────────────────────
const display = { fontFamily: "'Nunito', system-ui, sans-serif" } as const
const body    = { fontFamily: "'Work Sans', system-ui, sans-serif" } as const

// ─── Reveal animation hook ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(18px)', transition: 'opacity .65s ease, transform .65s ease' } }
}

// ─── Device Frames ────────────────────────────────────────────────────────────

interface PhoneProps {
  children: React.ReactNode
  size?: 'lg' | 'sm'
  color?: string   // bezel color
  style?: React.CSSProperties
}

function Phone({ children, size = 'lg', color = '#18181f', style }: PhoneProps) {
  const d = size === 'lg'
    ? { w: 285, h: 565, r: 39, b: 7, nw: '34%', nh: 22 }
    : { w: 222, h: 452, r: 32, b: 6, nw: '32%', nh: 18 }
  return (
    <div style={{
      width: d.w, height: d.h, flexShrink: 0, position: 'relative',
      borderRadius: d.r, border: `${d.b}px solid ${color}`,
      background: color, boxShadow: S.device, overflow: 'hidden', ...style,
    }}>
      {/* Dynamic island notch */}
      <div style={{
        position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
        width: d.nw, height: d.nh, background: color,
        borderRadius: '0 0 12px 12px', zIndex: 20,
      }} />
      {/* Side buttons */}
      <div style={{ position: 'absolute', top: 80, left: -d.b - 3, width: 3, height: 30, background: color, borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', top: 120, left: -d.b - 3, width: 3, height: 54, background: color, borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', top: 184, left: -d.b - 3, width: 3, height: 54, background: color, borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', top: 100, right: -d.b - 3, width: 3, height: 70, background: color, borderRadius: '0 2px 2px 0' }} />
      {/* Screen */}
      <div style={{ position: 'absolute', inset: 0, background: C.white, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

interface LaptopProps {
  children: React.ReactNode
  style?: React.CSSProperties
  screenHeight?: number
}

function Laptop({ children, style, screenHeight = 340 }: LaptopProps) {
  const sw = 560
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {/* Lid + screen */}
      <div style={{
        width: sw, background: '#1c1c22',
        borderRadius: '14px 14px 0 0',
        padding: '14px 14px 0',
        boxShadow: '0 -2px 0 #2a2a32 inset, 0 24px 60px rgba(11,37,69,.22)',
      }}>
        {/* Camera dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#333', margin: '0 auto 8px' }} />
        <div style={{
          height: screenHeight, background: C.white,
          borderRadius: '6px 6px 0 0', overflow: 'hidden',
        }}>
          {children}
        </div>
      </div>
      {/* Hinge */}
      <div style={{ width: sw, height: 4, background: '#141418', borderRadius: '0 0 2px 2px' }} />
      {/* Base */}
      <div style={{ width: sw + 32, height: 14, background: '#1c1c22', borderRadius: '0 0 10px 10px', marginTop: 0 }} />
      <div style={{ width: sw + 48, height: 7, background: '#141418', borderRadius: '0 0 6px 6px' }} />
    </div>
  )
}

// ─── Mascots — official Spraoi characters ─────────────────────────────────────
// Each mascot image is a design sheet: large standing pose on the LEFT (~27% of
// sheet width, ~68% of sheet height) + 5×2 action grid on the right.
// Use MascotCrop to extract one pose at a time — never render the full sheet.
//
// Sheet approximate proportions (all values 0–1):
//   Standing:       x:0.00  y:0.00  w:0.27  h:0.68
//   Run:            x:0.28  y:0.02  w:0.145 h:0.46
//   Run with ball:  x:0.425 y:0.02  w:0.145 h:0.46
//   Pass:           x:0.57  y:0.02  w:0.145 h:0.46
//   Solo run:       x:0.715 y:0.02  w:0.145 h:0.46
//   Kick:           x:0.86  y:0.02  w:0.145 h:0.46
//   Run hurley:     x:0.28  y:0.50  w:0.145 h:0.44
//   Strike:         x:0.57  y:0.50  w:0.145 h:0.44
//   Ready:          x:0.86  y:0.50  w:0.145 h:0.44

const SHEET_ASPECT = 600 / 430  // landscape ~1.4:1

type PoseRegion = { x: number; y: number; w: number; h: number }

const MASCOT_POSE = {
  standing:   { x: 0.00,  y: 0.00, w: 0.27,  h: 0.68 },
  run:        { x: 0.28,  y: 0.02, w: 0.145, h: 0.46 },
  runBall:    { x: 0.425, y: 0.02, w: 0.145, h: 0.46 },
  pass:       { x: 0.57,  y: 0.02, w: 0.145, h: 0.46 },
  soloRun:    { x: 0.715, y: 0.02, w: 0.145, h: 0.46 },
  kick:       { x: 0.86,  y: 0.02, w: 0.145, h: 0.46 },
  runHurley:  { x: 0.28,  y: 0.50, w: 0.145, h: 0.44 },
  strike:     { x: 0.57,  y: 0.50, w: 0.145, h: 0.44 },
  ready:      { x: 0.86,  y: 0.50, w: 0.145, h: 0.44 },
} satisfies Record<string, PoseRegion>

function MascotCrop({ src, alt, pose = MASCOT_POSE.standing, displayH = 120, style }: {
  src: string
  alt: string
  pose?: PoseRegion
  displayH?: number
  style?: React.CSSProperties
}) {
  const imgH = displayH / pose.h
  const imgW = imgH * SHEET_ASPECT
  return (
    <div style={{ width: imgW * pose.w, height: displayH, overflow: 'hidden', position: 'relative', flexShrink: 0, ...style }}>
      <img src={src} alt={alt} style={{ position: 'absolute', height: imgH, width: 'auto', top: -(imgH * pose.y), left: -(imgW * pose.x) }} />
    </div>
  )
}

// ─── SCREEN CONTENT COMPONENTS ────────────────────────────────────────────────

// ── Coach Dashboard (Laptop) ──────────────────────────────────────────────────
function CoachDashboard() {
  const blue = C.blue
  return (
    <div style={{ display: 'flex', height: '100%', ...body, fontSize: 9 }}>
      {/* Sidebar */}
      <div style={{ width: 130, background: C.navy, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <div style={{ padding: '0 12px 10px', borderBottom: `1px solid rgba(255,255,255,.1)`, marginBottom: 8 }}>
          <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.white, letterSpacing: '-0.02em' }}>Spraoi Coach</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>St. Finbarr's GAA</div>
        </div>
        {[['◎', 'Dashboard', true],['◈', 'Sessions', false],['◉', 'Players', false],['◐', 'Drills', false],['◑', 'Reports', false]].map(([ic, label, active]) => (
          <div key={label as string} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 12px', borderRadius: 6,
            background: active ? `${blue}40` : 'transparent',
            color: active ? C.white : 'rgba(255,255,255,.45)',
            fontSize: 9, fontWeight: active ? 700 : 400, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 10 }}>{ic as string}</span>{label as string}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '10px 12px', borderTop: `1px solid rgba(255,255,255,.1)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: C.white }}>CM</div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.white }}>Coach Murphy</div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,.4)' }}>Administrator</div>
            </div>
          </div>
        </div>
      </div>
      {/* Main */}
      <div style={{ flex: 1, background: C.soft, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>Today's Sessions</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 8, color: C.muted }}>Tue 5 Aug 2026</div>
            <div style={{ height: 20, padding: '0 8px', background: blue, color: C.white, borderRadius: 10, display: 'flex', alignItems: 'center', fontSize: 8, fontWeight: 700 }}>+ New Session</div>
          </div>
        </div>
        {/* Content */}
        <div style={{ padding: '12px 16px', flex: 1, overflow: 'hidden' }}>
          {/* Session cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { time: '16:00', title: 'Passing Drills', group: 'U12 A', count: 18, color: blue },
              { time: '17:30', title: 'Shooting Practice', group: 'U14 B', count: 14, color: C.green },
              { time: '19:00', title: 'Fitness Circuit', group: 'U16', count: 22, color: C.orange },
            ].map(s => (
              <div key={s.title} style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.line}`, borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: C.muted, marginBottom: 3 }}>{s.time}</div>
                <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{s.title}</div>
                <div style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{s.group}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ flex: 1, height: 3, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(s.count/22)*100}%`, height: '100%', background: s.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 7, color: C.muted, fontFamily: 'monospace' }}>{s.count}/22</span>
                </div>
              </div>
            ))}
          </div>
          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 8 }}>
            {/* Player list */}
            <div style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.line}` }}>
              <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Player Roster — U12 A</div>
              {[['Ciarán Ó Murchú','Present'],['Niamh Ní Bhriain','Present'],['Seán Mac Gearailt','Absent'],['Aoife de Búrca','Present']].map(([name, status]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${blue}22`, color: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800 }}>{name[0]}</div>
                    <span style={{ fontSize: 8, color: C.ink }}>{name}</span>
                  </div>
                  <span style={{ fontSize: 7, color: status === 'Present' ? C.green : C.coral, fontWeight: 700 }}>●</span>
                </div>
              ))}
            </div>
            {/* Drill library */}
            <div style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.line}` }}>
              <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Drill Library</div>
              {[['◈ Hand Pass','Beginner'],['◈ Solo Run','Intermediate'],['◈ Kick Pass','Advanced']].map(([drill, level]) => (
                <div key={drill} style={{ padding: '4px 6px', background: C.soft, borderRadius: 4, marginBottom: 4 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>{drill}</div>
                  <div style={{ fontSize: 7, color: C.muted }}>{level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Coach Mobile App ──────────────────────────────────────────────────────────
function CoachApp() {
  return (
    <div style={{ height: '100%', background: C.soft, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <div style={{ background: C.navy, padding: '22px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: C.white, fontWeight: 700 }}>9:41</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['▪▪▪','●●','🔋'].map(i => <span key={i} style={{ fontSize: 7, color: C.white }}>{i}</span>)}
        </div>
      </div>
      {/* Header */}
      <div style={{ background: C.navy, padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.5)' }}>Tue 5 Aug</div>
          <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Coach</div>
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: C.white }}>CM</div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Today's session */}
        <div style={{ background: C.white, borderRadius: 12, padding: '10px 12px', border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.blue}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Next Session</div>
              <div style={{ ...display, fontSize: 12, fontWeight: 900, color: C.ink, marginTop: 2, letterSpacing: '-0.03em' }}>Passing Drills</div>
              <div style={{ fontSize: 8, color: C.muted }}>U12 A · 16:00 · Pitch 2</div>
            </div>
            <div style={{ background: C.blue, color: C.white, borderRadius: 8, padding: '3px 8px', fontSize: 8, fontWeight: 800 }}>Today</div>
          </div>
          {/* Attendance mini */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 7, color: C.muted }}>Attendance confirmed</span>
              <span style={{ fontSize: 7, fontFamily: 'monospace', color: C.ink }}>18/22</span>
            </div>
            <div style={{ height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', background: C.green, borderRadius: 2 }} />
            </div>
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[['18', 'Players today',C.blue],['3', 'Sessions',C.green],['82%', 'Attendance',C.orange],['12', 'Drills used',C.purple]].map(([val,label,color]) => (
            <div key={label} style={{ background: C.white, borderRadius: 10, padding: '8px 10px', border: `1px solid ${C.line}` }}>
              <div style={{ ...display, fontSize: 14, fontWeight: 900, color: color as string }}>{val}</div>
              <div style={{ fontSize: 8, color: C.muted, marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Drill list */}
        <div style={{ background: C.white, borderRadius: 12, padding: '8px 12px', border: `1px solid ${C.line}` }}>
          <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Session Drills</div>
          {[['◈ Hand Pass','6 min','•••'],['◈ Solo Run','8 min','••'],['◈ Kick Pass','10 min','•••••']].map(([drill,time,diff]) => (
            <div key={drill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 8, color: C.ink, fontWeight: 600 }}>{drill}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 7, color: C.muted }}>{time}</span>
                <span style={{ fontSize: 7, color: C.blue }}>{diff}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom nav */}
      <div style={{ background: C.white, borderTop: `1px solid ${C.line}`, display: 'flex', padding: '8px 0 14px' }}>
        {([
          { ic: '◎', label: 'Home', active: false },
          { ic: '◈', label: 'Sessions', active: true },
          { ic: '◉', label: 'Players', active: false },
          { ic: '⚙', label: 'Settings', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, color: active ? C.blue : C.muted }}>{ic}</span>
            <span style={{ fontSize: 7, fontWeight: active ? 700 : 400, color: active ? C.blue : C.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Challenge Mobile App ──────────────────────────────────────────────────────
function ChallengeApp({ view = 'main' }: { view?: 'main' | 'skills' | 'leaderboard' }) {
  const purple = C.purple
  return (
    <div style={{ height: '100%', background: '#1a0a2e', ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <div style={{ padding: '22px 16px 6px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, color: C.white, fontWeight: 700 }}>9:41</span>
        <div style={{ display: 'flex', gap: 4 }}>{['▪▪▪','🔋'].map(i => <span key={i} style={{ fontSize: 7, color: C.white }}>{i}</span>)}</div>
      </div>
      {/* Header */}
      <div style={{ padding: '4px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Week 14</div>
            <div style={{ ...display, fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Challenge</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: 'rgba(251,192,45,.15)', border: `1px solid ${C.yellow}40`, borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10 }}>🔥</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: C.yellow }}>12</span>
            </div>
          </div>
        </div>
      </div>
      {/* XP bar */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,.5)' }}>Level 4 · Ciarán</span>
          <span style={{ fontSize: 8, color: C.yellow, fontWeight: 700 }}>760 / 1000 XP</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '76%', height: '100%', background: `linear-gradient(90deg, ${purple}, ${C.yellow})`, borderRadius: 3 }} />
        </div>
      </div>
      {/* Activities */}
      <div style={{ flex: 1, padding: '0 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: 'Run 3 km', sub: 'Completed · +80 XP', done: true, color: C.green },
          { label: '50 Keepy-uppies', sub: 'Completed · +60 XP', done: true, color: C.green },
          { label: '10 Push-ups', sub: 'In progress…', done: false, color: purple },
          { label: 'Kick 20 Frees', sub: 'Not started', done: false, color: C.muted },
        ].map(a => (
          <div key={a.label} style={{
            background: a.done ? 'rgba(67,160,71,.12)' : 'rgba(255,255,255,.06)',
            border: `1px solid ${a.done ? 'rgba(67,160,71,.3)' : 'rgba(255,255,255,.08)'}`,
            borderRadius: 10, padding: '8px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: a.done ? C.green : 'rgba(255,255,255,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: C.white, fontWeight: 800,
            }}>{a.done ? '✓' : '○'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.white }}>{a.label}</div>
              <div style={{ fontSize: 8, color: a.done ? 'rgba(67,160,71,.8)' : 'rgba(255,255,255,.4)', marginTop: 1 }}>{a.sub}</div>
            </div>
          </div>
        ))}
        {/* Mini leaderboard */}
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 5 }}>Leaderboard</div>
          {[['🥇','Ciarán','1,240 XP',true],['🥈','Niamh','1,180 XP',false],['🥉','Seán','890 XP',false]].map(([medal,name,xp,me]) => (
            <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', background: me ? 'rgba(142,36,170,.12)' : 'transparent', borderRadius: 6, paddingLeft: me ? 4 : 0 }}>
              <span style={{ fontSize: 10 }}>{medal as string}</span>
              <span style={{ flex: 1, fontSize: 8, fontWeight: me ? 800 : 400, color: me ? C.white : 'rgba(255,255,255,.6)' }}>{name as string}</span>
              <span style={{ fontSize: 8, color: C.yellow, fontWeight: 700 }}>{xp as string}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom nav */}
      <div style={{ background: 'rgba(255,255,255,.04)', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', padding: '8px 0 14px' }}>
        {([
          { ic: '◎', label: 'Home', active: false },
          { ic: '◈', label: 'Challenge', active: true },
          { ic: '⭐', label: 'Skills', active: false },
          { ic: '◉', label: 'Profile', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, color: active ? purple : 'rgba(255,255,255,.3)' }}>{ic}</span>
            <span style={{ fontSize: 7, color: active ? purple : 'rgba(255,255,255,.3)', fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Challenge Skills Library ──────────────────────────────────────────────────
function ChallengeSkillsApp() {
  const purple = C.purple
  return (
    <div style={{ height: '100%', background: '#1a0a2e', ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Level 4</div>
        <div style={{ ...display, fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Skills</div>
      </div>
      <div style={{ flex: 1, padding: '0 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { name: 'Kicking', icon: '⚽', pct: 80, earned: 4, total: 5 },
          { name: 'Hand Passing', icon: '🤾', pct: 60, earned: 3, total: 5 },
          { name: 'Goalkeeping', icon: '🥅', pct: 40, earned: 2, total: 5 },
          { name: 'Fitness', icon: '💪', pct: 100, earned: 5, total: 5 },
        ].map(s => (
          <div key={s.name} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.white }}>{s.name}</span>
                  <span style={{ fontSize: 8, color: C.yellow }}>{s.earned}/{s.total} badges</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.pct === 100 ? C.green : purple, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div style={{ background: 'rgba(251,192,45,.1)', border: `1px solid ${C.yellow}30`, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>🏆</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.yellow, marginTop: 4 }}>Fitness Champion</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>All 5 fitness badges earned!</div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,.04)', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', padding: '8px 0 14px' }}>
        {([
          { ic: '◎', label: 'Home', active: false },
          { ic: '◈', label: 'Challenge', active: false },
          { ic: '⭐', label: 'Skills', active: true },
          { ic: '◉', label: 'Profile', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, color: active ? purple : 'rgba(255,255,255,.3)' }}>{ic}</span>
            <span style={{ fontSize: 7, color: active ? purple : 'rgba(255,255,255,.3)', fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Blitz Dashboard (Laptop) ──────────────────────────────────────────────────
function BlitzDashboard() {
  const coral = C.coral
  return (
    <div style={{ display: 'flex', height: '100%', ...body, fontSize: 9 }}>
      {/* Sidebar */}
      <div style={{ width: 110, background: C.navy, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <div style={{ padding: '0 10px 10px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src={spraioIcon} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ ...display, fontSize: 9, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Spraoi Blitz</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>Fingallians Blitz</div>
          </div>
        </div>
        {([
          { ic: '◎', label: 'Overview', active: true },
          { ic: '◈', label: 'Fixtures', active: false },
          { ic: '◐', label: 'Standings', active: false },
          { ic: '◉', label: 'Teams', active: false },
          { ic: '◑', label: 'Results', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 5,
            background: active ? `${coral}30` : 'transparent',
            borderLeft: `2px solid ${active ? coral : 'transparent'}`,
            color: active ? C.white : 'rgba(255,255,255,.35)',
            fontSize: 8, fontWeight: active ? 700 : 400,
          }}>
            <span style={{ fontSize: 9 }}>{ic}</span>{label}
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex: 1, background: C.soft, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: coral, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.white }}>Live Match Dashboard</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,.2)', padding: '2px 8px', borderRadius: 6, fontSize: 8, color: C.white, fontWeight: 800 }}>🔴 LIVE</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.7)' }}>13:42 · Pitch 1 of 4</div>
          </div>
        </div>
        {/* Live score */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: '10px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>St. Finbarr's</div>
              <div style={{ fontSize: 8, color: C.muted }}>Cork</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ ...display, fontSize: 24, fontWeight: 900, color: coral }}>2-14</div>
              <div style={{ fontSize: 8, color: C.muted, fontWeight: 700 }}>vs</div>
              <div style={{ ...display, fontSize: 24, fontWeight: 900, color: C.navy }}>1-11</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>Douglas</div>
              <div style={{ fontSize: 8, color: C.muted }}>Cork</div>
            </div>
          </div>
        </div>
        {/* Content grid */}
        <div style={{ padding: '10px 14px', flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Fixtures */}
          <div style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
            <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, marginBottom: 6 }}>All Fixtures</div>
            {[['St. Finbarr\'s','Douglas','2-14','1-11','LIVE'],['Na Piarsaigh','Kilmallock','1-12','0-8','LIVE'],['Corofin','Mountbellew','0-0','0-0','14:30'],['Crossmaglen','Clann Éireann','0-0','0-0','15:15']].map(([h,a,hs,as_,t]) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ink }}>{h} <span style={{ color: C.muted, fontWeight: 400 }}>v</span> {a}</div>
                </div>
                <div style={{ fontSize: 7, fontFamily: 'monospace', color: C.ink, fontWeight: 700 }}>{hs}:{as_}</div>
                <div style={{ fontSize: 6.5, fontWeight: 800, color: t === 'LIVE' ? coral : C.muted, marginLeft: 4 }}>{t}</div>
              </div>
            ))}
          </div>
          {/* Standings */}
          <div style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
            <div style={{ ...display, fontSize: 9, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Group A Standings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 20px 20px 20px 28px', gap: 2, marginBottom: 4 }}>
              {['#','Team','P','W','L','Pts'].map(h => <span key={h} style={{ fontSize: 6.5, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>)}
            </div>
            {[["1","St. Finbarr's",6,5,1,"10",true],["2","Douglas",6,4,2,"8",false],["3","Na Piarsaigh",6,3,3,"6",false],["4","Kilmallock",6,1,5,"2",false]].map(([pos,name,p,w,l,pts,top]) => (
              <div key={name as string} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 20px 20px 20px 28px', gap: 2, padding: '2px 0', background: top ? `${coral}0c` : 'transparent', borderRadius: 3 }}>
                <span style={{ fontSize: 7, fontWeight: 800, color: top ? coral : C.muted }}>{pos}</span>
                <span style={{ fontSize: 7.5, fontWeight: top ? 800 : 500, color: C.ink }}>{name as string}</span>
                <span style={{ fontSize: 7, color: C.muted, textAlign: 'center' }}>{p}</span>
                <span style={{ fontSize: 7, color: C.ink, textAlign: 'center' }}>{w}</span>
                <span style={{ fontSize: 7, color: C.muted, textAlign: 'center' }}>{l}</span>
                <span style={{ fontSize: 7, fontWeight: 800, color: top ? coral : C.ink, textAlign: 'right' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Blitz Mobile App ──────────────────────────────────────────────────────────
function BlitzApp() {
  const coral = C.coral
  return (
    <div style={{ height: '100%', background: C.soft, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '22px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={spraioIcon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Spraoi Blitz</div>
          </div>
          <div style={{ background: coral, padding: '3px 8px', borderRadius: 8, fontSize: 8, fontWeight: 800, color: C.white }}>🔴 LIVE</div>
        </div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,.45)' }}>Fingallians U12 Blitz · Sat 9 Aug</div>
      </div>
      {/* Live score card */}
      <div style={{ margin: '12px 14px 10px', background: `linear-gradient(135deg, ${coral}, #bf360c)`, borderRadius: 16, padding: '14px' }}>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Pitch 1 · Group A · 28:14</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.2)', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...display, fontSize: 11, fontWeight: 900, color: C.white }}>SF</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.white }}>St. Finbarr's</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...display, fontSize: 24, fontWeight: 900, color: C.white, letterSpacing: '-0.04em' }}>2-14</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,.5)', margin: '2px 0' }}>vs</div>
            <div style={{ ...display, fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,.55)', letterSpacing: '-0.04em' }}>1-11</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.15)', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...display, fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,.7)' }}>DC</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Douglas</div>
          </div>
        </div>
      </div>
      {/* Timeline */}
      <div style={{ flex: 1, margin: '0 14px', background: C.white, borderRadius: 12, padding: '8px 10px', overflow: 'hidden', border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 6 }}>Match Timeline</div>
        {[["28'","⚽","Goal · Ciarán Ó M.",true],["22'",'◎',"Point · Niamh NB",true],["18'",'⚽',"Goal · Seán Mac G.",false],["12'",'◎',"Point · Ciarán ÓM",true],["5'",'◎',"Point · Aoife dB",true]].map(([t,ic,ev,home]) => (
          <div key={String(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: `1px solid ${C.line}` }}>
            <span style={{ ...body, fontSize: 7, fontFamily: 'monospace', color: C.muted, width: 20, flexShrink: 0 }}>{t}</span>
            <span style={{ fontSize: 11 }}>{ic}</span>
            <span style={{ flex: 1, fontSize: 8, color: home ? C.ink : C.muted, fontWeight: home ? 600 : 400 }}>{ev}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: home ? coral : C.line, flexShrink: 0 }} />
          </div>
        ))}
      </div>
      {/* Tab bar */}
      <div style={{ background: C.white, borderTop: `1px solid ${C.line}`, display: 'flex', padding: '8px 0 14px', marginTop: 10 }}>
        {([
          { ic: '◎', label: 'Home', active: false },
          { ic: '◈', label: 'Live', active: true },
          { ic: '◐', label: 'Schedule', active: false },
          { ic: '◉', label: 'Teams', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, color: active ? coral : C.muted }}>{ic}</span>
            <span style={{ fontSize: 7, color: active ? coral : C.muted, fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Journey Story Screens ─────────────────────────────────────────────────────

function JourneyCoachCreates() {
  return (
    <div style={{ height: '100%', background: C.white, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.orange, padding: '24px 16px 12px' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.6)' }}>Spraoi Coach</div>
        <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>New Challenge</div>
      </div>
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: C.soft, borderRadius: 10, padding: '8px 12px', border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 3 }}>Challenge Title</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.ink }}>Week 14 Fitness</div>
        </div>
        <div style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>Activities</div>
        {[['Run 3 km','Cardio','80 XP'],['50 Keepy-uppies','Skill','60 XP'],['10 Push-ups','Strength','40 XP']].map(([act,type,xp]) => (
          <div key={act} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.soft, borderRadius: 8, padding: '6px 10px', border: `1px solid ${C.line}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.ink }}>{act}</div>
              <div style={{ fontSize: 7, color: C.muted }}>{type}</div>
            </div>
            <div style={{ background: `${C.orange}22`, color: C.orange, borderRadius: 6, padding: '2px 6px', fontSize: 8, fontWeight: 800 }}>{xp}</div>
          </div>
        ))}
        <div style={{ background: C.orange, borderRadius: 10, padding: '10px', textAlign: 'center', marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.white }}>Publish to U12 A · 22 players</div>
        </div>
      </div>
    </div>
  )
}

function JourneyPlayerCompletes() {
  return (
    <div style={{ height: '100%', background: '#1a0a2e', ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 16px 10px' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Week 14</div>
        <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Challenge</div>
      </div>
      <div style={{ flex: 1, padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: 'Run 3 km', done: true, anim: true },
          { label: '50 Keepy-uppies', done: true, anim: false },
          { label: '10 Push-ups', done: false, anim: false },
        ].map(a => (
          <div key={a.label} style={{
            background: a.done ? 'rgba(67,160,71,.15)' : 'rgba(255,255,255,.06)',
            border: `1px solid ${a.done ? 'rgba(67,160,71,.4)' : 'rgba(255,255,255,.08)'}`,
            borderRadius: 10, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: a.done ? C.green : 'rgba(255,255,255,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>{a.done ? '✓' : '○'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.white }}>{a.label}</div>
              {a.done && <div style={{ fontSize: 8, color: 'rgba(67,160,71,.8)' }}>Completed ✓</div>}
            </div>
            {a.done && <div style={{ background: `${C.green}30`, color: C.green, borderRadius: 6, padding: '2px 8px', fontSize: 9, fontWeight: 800 }}>+80 XP</div>}
          </div>
        ))}
        {/* XP burst animation */}
        <div style={{ margin: '6px 0', background: `linear-gradient(135deg, ${C.orange}22, ${C.yellow}22)`, border: `1px solid ${C.yellow}30`, borderRadius: 12, padding: '10px', textAlign: 'center' }}>
          <div style={{ ...display, fontSize: 28, fontWeight: 900, color: C.yellow, letterSpacing: '-0.04em' }}>+80 XP</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.6)' }}>Run 3 km · Completed!</div>
        </div>
      </div>
    </div>
  )
}

function JourneyOtisCelebrates() {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(160deg, #0277bd 0%, #01579b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '28px 20px 20px', ...body, fontSize: 9, overflow: 'hidden', position: 'relative' }}>
      {/* Confetti dots */}
      {[['#fbc02d',12,8],['#43a047',80,14],['#e64a19',55,6],['#fbc02d',25,20],['#29b6f6',75,10],['#8e24aa',40,18],['#43a047',65,4]].map(([c,x,y],i) => (
        <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:6, height:6, borderRadius:'50%', background:String(c), opacity:.7 }} />
      ))}
      {/* Header */}
      <div style={{ ...display, fontSize:13, fontWeight:900, color:'#fff', letterSpacing:'-0.03em', marginBottom:4, textAlign:'center' }}>Activity Complete! 🎉</div>
      <div style={{ ...body, fontSize:9, color:'rgba(255,255,255,.65)', marginBottom:16 }}>Run 3 km · Confirmed by Coach</div>
      {/* Otis pops in — standing pose cropped from sheet */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <MascotCrop src={otisSrc} alt="Otis the Otter" pose={MASCOT_POSE.standing} displayH={130} style={{ filter:'drop-shadow(0 12px 24px rgba(0,0,0,.3))' }} />
        {/* Speech bubble */}
        <div style={{ position:'absolute', top:-12, right:-20, background:'#fff', borderRadius:12, padding:'6px 10px', boxShadow:'0 4px 16px rgba(0,0,0,.2)' }}>
          <span style={{ ...display, fontSize:11, fontWeight:900, color:'#fb8c00' }}>Well done! 🔥</span>
          <div style={{ position:'absolute', bottom:-6, left:16, width:10, height:10, background:'#fff', transform:'rotate(45deg)', borderRadius:1 }} />
        </div>
      </div>
      {/* XP badge */}
      <div style={{ background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)', borderRadius:14, padding:'10px 20px', textAlign:'center', marginBottom:10 }}>
        <div style={{ ...display, fontSize:28, fontWeight:900, color:'#fbc02d', letterSpacing:'-0.04em', lineHeight:1 }}>+80 XP</div>
        <div style={{ ...body, fontSize:9, color:'rgba(255,255,255,.7)', marginTop:3 }}>Ciarán · Level 7 · 🔥 Day 5</div>
      </div>
      {/* Progress bar */}
      <div style={{ width:'100%', background:'rgba(255,255,255,.15)', borderRadius:6, height:10, overflow:'hidden', marginBottom:6 }}>
        <div style={{ width:'68%', height:'100%', background:'linear-gradient(90deg,#fbc02d,#fb8c00)', borderRadius:6 }} />
      </div>
      <div style={{ ...body, fontSize:9, color:'rgba(255,255,255,.6)' }}>620 XP to Level 8</div>
    </div>
  )
}

function JourneyXPEarned() {
  return (
    <div style={{ height: '100%', background: '#f0f8ff', ...body, fontSize: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '24px 20px' }}>
      {/* Achievement burst */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#627187', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Achievement Unlocked!</div>
        <div style={{ ...display, fontSize: 56, fontWeight: 900, color: '#fbc02d', letterSpacing: '-0.06em', lineHeight: 1, textShadow: '0 4px 16px rgba(251,192,45,.35)' }}>+150</div>
        <div style={{ ...display, fontSize: 22, fontWeight: 900, color: '#f9a825' }}>XP</div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 4 }}>
          {['⭐','⭐','⭐'].map((s, i) => <span key={i} style={{ fontSize: 22 }}>{s}</span>)}
        </div>
      </div>
      {/* Progress card */}
      <div style={{ width: '100%', background: '#fff', borderRadius: 14, padding: '12px 14px', border: '1px solid #deeaf5', boxShadow: '0 4px 16px rgba(41,182,246,.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#1a2940' }}>Level 7 Progress</span>
          <span style={{ fontSize: 9, color: '#fbc02d', fontWeight: 800 }}>8,450 / 9,070 XP</span>
        </div>
        <div style={{ height: 10, background: '#deeaf5', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg,#29b6f6,#fbc02d)', borderRadius: 5 }} />
        </div>
        <div style={{ marginTop: 5, fontSize: 8, color: '#8fa3bc' }}>620 XP to Level 8</div>
      </div>
      {/* Next milestone */}
      <div style={{ background: '#fff9e6', border: '1px solid #fbc02d50', borderRadius: 12, padding: '8px 14px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: '#f9a825', fontWeight: 800 }}>🏆 Level 8 unlocks in 620 XP!</div>
      </div>
    </div>
  )
}

function JourneyParentNotified() {
  return (
    <div style={{ height: '100%', background: C.soft, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.navy, padding: '24px 16px 12px' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Spraoi Journey</div>
        <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Parent View</div>
      </div>
      {/* Push notification style */}
      <div style={{ margin: '14px', background: C.white, borderRadius: 16, padding: '12px 14px', border: `1px solid ${C.line}`, boxShadow: '0 8px 24px rgba(13,49,87,.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🚀</div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.ink }}>Spraoi Journey</div>
            <div style={{ fontSize: 7, color: C.muted }}>now</div>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.ink, marginBottom: 3 }}>Ciarán earned 150 XP! 🎉</div>
        <div style={{ fontSize: 8, color: C.muted, lineHeight: 1.4 }}>Ciarán completed Week 14 Challenge and is now Level 4. Great work!</div>
      </div>
      {/* Activity feed */}
      <div style={{ flex: 1, margin: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: C.ink, marginBottom: 2 }}>Ciarán's Activity</div>
        {[['✓ Run 3 km','+80 XP','2m ago',C.green],['✓ 50 Keepy-uppies','+60 XP','4m ago',C.green],['⭐ Level 4 reached','🎉','5m ago',C.orange]].map(([act,pts,time,color]) => (
          <div key={act} style={{ background: C.white, borderRadius: 10, padding: '7px 10px', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color as string, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>{act}</div>
            </div>
            <div style={{ fontSize: 8, fontWeight: 800, color: color as string }}>{pts}</div>
            <div style={{ fontSize: 7, color: C.muted }}>{time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function JourneyCoachProgress() {
  return (
    <div style={{ height: '100%', background: C.white, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.navy, padding: '24px 16px 12px' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>Spraoi Coach</div>
        <div style={{ ...display, fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Progress</div>
      </div>
      <div style={{ flex: 1, padding: '10px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Completion donut */}
        <div style={{ background: C.soft, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.line}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="20" fill="none" stroke={C.line} strokeWidth="7" />
            <circle cx="26" cy="26" r="20" fill="none" stroke={C.green} strokeWidth="7" strokeDasharray={`${2*Math.PI*20*0.82} ${2*Math.PI*20}`} strokeDashoffset={2*Math.PI*20*0.25} strokeLinecap="round" />
            <text x="26" y="30" textAnchor="middle" style={{ ...display, fontSize: 11, fontWeight: 900, fill: C.ink }}>82%</text>
          </svg>
          <div>
            <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>Challenge Completion</div>
            <div style={{ fontSize: 8, color: C.muted }}>U12 A · Week 14 · 18/22 players</div>
          </div>
        </div>
        {/* Player progress bars */}
        {[['Ciarán ÓM','100%',C.green],['Niamh NB','80%',C.orange],['Seán MG','60%',C.blue],['Aoife dB','100%',C.green],['Pádraig ÓC','20%',C.muted]].map(([name,pct,color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${color as string}20`, color: color as string, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, flexShrink: 0 }}>{(name as string)[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: C.ink }}>{name}</span>
                <span style={{ fontSize: 7, fontFamily: 'monospace', color: color as string, fontWeight: 700 }}>{pct}</span>
              </div>
              <div style={{ height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: pct as string, height: '100%', background: color as string, borderRadius: 2 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Connect Dashboard (Laptop) ─────────────────────────────────────────────────
function ConnectDashboard() {
  const sky = C.sky
  return (
    <div style={{ display: 'flex', height: '100%', ...body, fontSize: 9 }}>
      {/* Sidebar */}
      <div style={{ width: 120, background: C.navy, padding: '12px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '0 10px 10px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 6 }}>
          <div style={{ ...display, fontSize: 10, fontWeight: 900, color: C.white }}>Spraoi Connect</div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>St. Finbarr's GAA</div>
        </div>
        <div style={{ padding: '0 10px', marginBottom: 8 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: 4 }}>Channels</div>
          {([
            { ic: '📢', label: 'All Club', active: false, badge: 7 },
            { ic: '🏃', label: 'Training', active: true, badge: 2 },
            { ic: '🏆', label: 'Match', active: false, badge: 0 },
            { ic: '📋', label: 'Admin', active: false, badge: 3 },
          ] as const).map(({ ic, label, active, badge }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 5, background: active ? `${sky}30` : 'transparent', color: active ? C.white : 'rgba(255,255,255,.35)', fontSize: 8, marginBottom: 1 }}>
              <span>{ic}</span><span style={{ flex: 1, fontWeight: active ? 700 : 400 }}>{label}</span>
              {badge > 0 && <span style={{ background: sky, color: C.navy, borderRadius: 10, padding: '0 4px', fontSize: 7, fontWeight: 800 }}>{badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '0 10px', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 8 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: 4 }}>Members</div>
          {[['CM','Coach Murphy','online'],['SP','Seán P.','online'],['ÁD','Áine D.','away']].map(([initials,name,status]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px', borderRadius: 4 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${sky}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: sky }}>{initials}</div>
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 5, height: 5, borderRadius: '50%', background: status === 'online' ? C.green : C.orange, border: '1px solid #0b2545' }} />
              </div>
              <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,.5)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Main */}
      <div style={{ flex: 1, background: C.soft, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>Training Channel</div>
          <div style={{ height: 22, padding: '0 10px', background: sky, color: C.white, borderRadius: 11, display: 'flex', alignItems: 'center', fontSize: 8, fontWeight: 700 }}>+ Post Update</div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { title: '📢 Training Friday 8 Aug', body: 'Training at the usual time, 18:00, Pitch 3. Please confirm attendance by 17:00.', author: 'Coach Murphy', time: '2h ago', pinned: true },
            { title: '🔔 Reminder — Subs Due', body: 'Annual subscriptions for 2026/27 are due by 15 August. Contact the club treasurer.', author: 'Club Admin', time: '1d ago', pinned: false },
            { title: '🏆 Blitz Results — U12 A', body: 'St. Finbarr\'s U12 A won the Fingallians Blitz! Final score 2-14 : 1-11. Fantastic effort.', author: 'Coach Murphy', time: '2d ago', pinned: false },
          ].map(n => (
            <div key={n.title} style={{ background: C.white, borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.line}`, borderLeft: n.pinned ? `3px solid ${sky}` : `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.ink }}>{n.title}</div>
                {n.pinned && <div style={{ fontSize: 7, background: `${sky}20`, color: sky, borderRadius: 4, padding: '1px 5px', fontWeight: 800 }}>📌 Pinned</div>}
              </div>
              <div style={{ fontSize: 8, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>{n.body}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 7, color: C.muted }}>
                <span style={{ fontWeight: 700, color: sky }}>{n.author}</span>
                <span>{n.time}</span>
                <span>👍 4  💬 2</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Connect Mobile App ─────────────────────────────────────────────────────────
function ConnectApp() {
  const sky = C.sky
  return (
    <div style={{ height: '100%', background: C.soft, ...body, fontSize: 9, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.navy, padding: '22px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>St. Finbarr's GAA</div>
            <div style={{ ...display, fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Connect</div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔔</div>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: sky, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: C.navy }}>7</div>
          </div>
        </div>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {([
            { label: 'All', active: true },
            { label: 'Training', active: false },
            { label: 'Match', active: false },
            { label: 'Admin', active: false },
          ] as const).map(({ label, active }) => (
            <div key={label} style={{ height: 22, padding: '0 10px', borderRadius: 11, background: active ? sky : 'rgba(255,255,255,.1)', color: active ? C.navy : 'rgba(255,255,255,.5)', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{label}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {[
          { ic: '📢', title: 'Training Friday', sub: '18:00 · Pitch 3 · Confirm attendance', time: '2h ago', unread: true },
          { ic: '🔔', title: 'Subs Due — 15 Aug', sub: '2026/27 subscriptions reminder', time: '1d ago', unread: true },
          { ic: '🏆', title: 'Blitz Results', sub: 'U12 A — Champions! 2-14 : 1-11', time: '2d ago', unread: false },
          { ic: '📌', title: 'AGM Notice', sub: 'Annual General Meeting — 20 Aug', time: '3d ago', unread: false },
        ].map(n => (
          <div key={n.title} style={{
            background: C.white, borderRadius: 12, padding: '10px 12px', border: `1px solid ${C.line}`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
            borderLeft: n.unread ? `3px solid ${sky}` : `1px solid ${C.line}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.ic}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: n.unread ? 800 : 600, color: C.ink }}>{n.title}</div>
              <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{n.sub}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 7, color: C.muted }}>{n.time}</span>
              {n.unread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: sky }} />}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: C.white, borderTop: `1px solid ${C.line}`, display: 'flex', padding: '8px 0 14px' }}>
        {([
          { ic: '◎', label: 'Home', active: false },
          { ic: '◈', label: 'Feed', active: true },
          { ic: '◉', label: 'Members', active: false },
          { ic: '⚙', label: 'Settings', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 14, color: active ? sky : C.muted }}>{ic}</span>
            <span style={{ fontSize: 7, color: active ? sky : C.muted, fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Club Admin Dashboard (Laptop) ──────────────────────────────────────────────
function ClubDashboard() {
  const green = C.green
  return (
    <div style={{ display: 'flex', height: '100%', ...body, fontSize: 9 }}>
      {/* Sidebar */}
      <div style={{ width: 120, background: '#0a1a0a', padding: '12px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '0 10px 10px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 6 }}>
          <div style={{ ...display, fontSize: 10, fontWeight: 900, color: C.white }}>Spraoi Club</div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>St. Finbarr's GAA</div>
        </div>
        {([
          { ic: '◎', label: 'Overview', active: true },
          { ic: '◉', label: 'Members', active: false },
          { ic: '💰', label: 'Finance', active: false },
          { ic: '✓', label: 'Compliance', active: false },
          { ic: '📰', label: 'News', active: false },
          { ic: '⚙', label: 'Settings', active: false },
        ] as const).map(({ ic, label, active }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 5, background: active ? `${green}30` : 'transparent', color: active ? C.white : 'rgba(255,255,255,.35)', fontSize: 8, fontWeight: active ? 700 : 400, marginBottom: 1 }}>
            <span>{ic}</span>{label}
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex: 1, background: C.soft, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontSize: 11, fontWeight: 900, color: C.ink }}>Club Overview</div>
          <div style={{ fontSize: 8, color: C.muted }}>2025–26 Season · St. Finbarr's GAA</div>
        </div>
        <div style={{ padding: '10px 14px', flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: 8 }}>
          {/* Stat cards */}
          <div style={{ background: C.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.line}`, borderTop: `3px solid ${green}` }}>
            <div style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Members</div>
            <div style={{ ...display, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginTop: 4 }}>247</div>
            <div style={{ fontSize: 7, color: green, fontWeight: 700 }}>↑ 14 new this season</div>
          </div>
          <div style={{ background: C.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.line}`, borderTop: `3px solid ${C.blue}` }}>
            <div style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Fees Collected</div>
            <div style={{ ...display, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginTop: 4 }}>€8,420</div>
            <div style={{ fontSize: 7, color: C.muted, fontWeight: 700 }}>€1,240 outstanding</div>
          </div>
          {/* Compliance */}
          <div style={{ background: C.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.line}` }}>
            <div style={{ ...display, fontSize: 10, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Compliance</div>
            {[['Garda Vetting','94%',C.green],['Child Safeguarding','100%',C.green],['First Aid Certs','78%',C.orange],['Insurance','100%',C.green]].map(([item,pct,color]) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: C.ink }}>{item}</div>
                  <div style={{ height: 3, background: C.line, borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
                    <div style={{ width: pct as string, height: '100%', background: color as string, borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 8, fontWeight: 800, color: color as string }}>{pct}</span>
              </div>
            ))}
          </div>
          {/* Upcoming */}
          <div style={{ background: C.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.line}` }}>
            <div style={{ ...display, fontSize: 10, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Upcoming</div>
            {[['AGM','20 Aug 2026',C.blue],['County Board','12 Aug',C.muted],['Coaching Course','15–16 Aug',C.orange],['Fee Deadline','15 Aug',C.coral]].map(([ev,date,color]) => (
              <div key={ev} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color as string, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 8, fontWeight: 600, color: C.ink }}>{ev}</div>
                <div style={{ fontSize: 7, color: C.muted }}>{date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Site Nav ─────────────────────────────────────────────────────────────────

function SiteNav() {
  const [open, setOpen] = useState(false)
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,250,242,.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        {/* Logo */}
        <a href="#top" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={spraioLogo} alt="Spraoi Sports — Growing Stronger Together" style={{ height: 58, width: 'auto', objectFit: 'contain' }} />
        </a>
        {/* Desktop links */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[['#platform','Platform'],['#challenge','Challenge'],['#blitz','Blitz'],['#request-info','Contact']].map(([href,label]) => (
            <a key={href} href={href} style={{ ...body, fontSize: 15, fontWeight: 600, color: C.ink, textDecoration: 'none', opacity: .75 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '.75')}
            >{label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#request-info" style={{ height: 42, padding: '0 20px', background: C.green, color: C.white, borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: S.green, ...body }}>
            Request info
          </a>
          <button onClick={() => setOpen(v => !v)} className="show-mobile" style={{ display: 'none', background: 'none', border: `1px solid ${C.line}`, borderRadius: 10, width: 42, height: 42, cursor: 'pointer', fontSize: 18 }} aria-label="Menu">
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {open && (
        <div style={{ background: C.white, borderTop: `1px solid ${C.line}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['#platform','Platform'],['#challenge','Challenge'],['#blitz','Blitz'],['#request-info','Contact']].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} style={{ ...body, fontSize: 16, fontWeight: 600, color: C.ink, textDecoration: 'none', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>{label}</a>
          ))}
        </div>
      )}
    </nav>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const r = useReveal()
  return (
    <section id="top" style={{ background: `linear-gradient(140deg, ${C.white} 0%, #fffdf7 48%, #fff7e9 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: 'clamp(300px,.92fr,520px) 1fr', gap: 54, alignItems: 'center' }} className="hero-grid">
          {/* Copy */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', background: `${C.green}18`, border: `1px solid ${C.green}30`, borderRadius: 999, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
              <span style={{ ...body, fontSize: 12, fontWeight: 700, color: C.green }}>Built for grassroots clubs</span>
            </div>
            <h1 style={{ ...display, fontSize: 'clamp(2.8rem, 6.2vw, 5.8rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.055em', lineHeight: 1.0, marginBottom: 24 }}>
              One platform.<br />
              <span style={{ color: C.green }}>Every part</span><br />
              of club life.
            </h1>
            <p style={{ ...body, fontSize: 18, color: C.muted, lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
              Spraoi Sports is a growing family of customisable apps for fitness challenges, blitzes, player development, coaching and club communication.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <a href="#request-info" style={{ height: 52, padding: '0 28px', background: `linear-gradient(135deg, ${C.green}, #2f8f35)`, color: C.white, borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: S.green, ...body }}>
                Request early access
              </a>
              <a href="#platform" style={{ height: 52, padding: '0 24px', background: C.white, color: C.ink, borderRadius: 14, display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 700, textDecoration: 'none', border: `1.5px solid ${C.line}`, ...body }}>
                See all modules
              </a>
            </div>
            <p style={{ ...body, fontSize: 13, color: C.muted }}>
              Spraoi Challenge and Spraoi Blitz are being prepared for pilot clubs.
            </p>
          </div>
          {/* Device scene — Coach desktop + mobile */}
          <div style={{ position: 'relative', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Left small phone */}
            <div style={{ position: 'absolute', left: 0, bottom: 40, transform: 'rotate(-5deg)', zIndex: 1, filter: 'drop-shadow(0 20px 40px rgba(11,37,69,.15))' }}>
              <Phone size="sm" style={{ opacity: .92 }}>
                <CoachApp />
              </Phone>
            </div>
            {/* Center — laptop (hero feature) */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <Laptop screenHeight={280} style={{ transform: 'scale(0.88)', transformOrigin: 'center center' }}>
                <CoachDashboard />
              </Laptop>
            </div>
            {/* Right small phone */}
            <div style={{ position: 'absolute', right: 0, bottom: 60, transform: 'rotate(5deg)', zIndex: 1, filter: 'drop-shadow(0 20px 40px rgba(11,37,69,.15))' }}>
              <Phone size="sm" style={{ opacity: .92 }}>
                <JourneyCoachProgress />
              </Phone>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Platform Section (6 module cards — unchanged text) ───────────────────────

const MODULES = [
  { mascotSrc: rorySrc,  mascotName: 'Rory the Red Deer',  title: 'Challenge', desc: 'Fitness challenges, XP, streaks, skills and leaderboards that keep players active.', color: C.green, status: 'Pilot development' },
  { mascotSrc: finnSrc,  mascotName: 'Finn the Fox',        title: 'Blitz',     desc: 'Fixtures, live scores, standings, schedules and team information for match day.', color: C.coral, status: 'Pilot development' },
  { mascotSrc: otisSrc,  mascotName: 'Otis the Otter',      title: 'Journey',   desc: 'A child-friendly day-to-day space for progress, goals, achievements and participation.', color: C.sky, status: 'Coming soon' },
  { mascotSrc: shellySrc,mascotName: 'Shelly the Sheep',    title: 'Coach',     desc: 'Session plans, skills libraries, drills, attendance and practical coaching tools.', color: C.purple, status: 'Coming soon' },
  { mascotSrc: bellaSrc, mascotName: 'Bella the Sheepdog',  title: 'Connect',   desc: 'Notices, updates and communication for coaches, parents and volunteers.', color: C.blue, status: 'Coming soon' },
  { mascotSrc: hazelSrc, mascotName: 'Hazel the Squirrel',  title: 'Club',      desc: "Your club's custom-branded digital home for news, resources, sponsors and services.", color: C.coral, status: 'Coming soon' },
]

function PlatformSection() {
  const r = useReveal()
  return (
    <section id="platform" style={{ background: `linear-gradient(180deg, ${C.white} 0%, #fffdf8 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={r.style}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', color: C.blue, marginBottom: 12 }}>The Spraoi Platform</p>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 16, lineHeight: 1.05 }}>
              Six connected products,<br />each with its own purpose.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, maxWidth: 520, margin: '0 auto' }}>
              The blue trunk is Spraoi Sports. The coloured leaves represent the modules that grow from it.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {MODULES.map(m => (
              <div key={m.title} style={{
                background: C.white, border: `1px solid ${C.line}`,
                borderTop: `6px solid ${m.color}`,
                borderRadius: 24, minHeight: 255, padding: '28px 29px',
                boxShadow: S.card, position: 'relative', overflow: 'hidden',
              }}>
                {/* Accent orb */}
                <div style={{ position: 'absolute', bottom: -24, right: -24, width: 120, height: 120, borderRadius: '50%', background: m.color, opacity: .08 }} />
                <h3 style={{ ...display, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 10, letterSpacing: '-0.02em' }}>Spraoi {m.title}</h3>
                <p style={{ ...body, fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 20 }}>{m.desc}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', background: `${m.color}18`, border: `1px solid ${m.color}30`, borderRadius: 999 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: m.color }}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Journey Section (mascot story) ──────────────────────────────────────────

const JOURNEY_STEPS = [
  { who: 'coach',   icon: '📚', title: 'Coach creates training', desc: 'Coach Murphy builds a weekly challenge with activities, XP values and skill categories — published to 22 players in one tap.', screen: <JourneyCoachCreates />, mascot: null, side: 'right' },
  { who: 'player',  icon: '🏃', title: 'Player completes activity', desc: 'Ciarán opens Spraoi Journey, ticks off his 3 km run, and submits a quick completion note. The app records it instantly.', screen: <JourneyPlayerCompletes />, mascot: null, side: 'left' },
  { who: 'mascot',  icon: '🎉', title: 'Otis celebrates', desc: "The moment Ciarán confirms his run, Otis the Otter bursts onto the screen with a cheer — turning every completion into a moment worth remembering.", screen: <JourneyOtisCelebrates />, mascot: null, side: 'right' },
  { who: 'xp',      icon: '⭐', title: 'XP earned', desc: "+150 XP lands on Ciarán's profile. His progress bar surges forward. 240 more XP and he reaches Level 5 — motivation that actually works.", screen: <JourneyXPEarned />, mascot: null, side: 'left' },
  { who: 'parent',  icon: '🔔', title: 'Parent notified', desc: "Ciarán's mum receives a real-time notification — she knows exactly what her child achieved today, without needing to ask.", screen: <JourneyParentNotified />, mascot: null, side: 'right' },
  { who: 'coach',   icon: '📊', title: 'Coach sees progress', desc: "Coach Murphy opens the dashboard and sees 18 of 22 players completed this week's challenge. Three need encouragement. She knows exactly who.", screen: <JourneyCoachProgress />, mascot: null, side: 'left' },
]

function JourneySection() {
  const r = useReveal()
  return (
    <section id="journey" style={{ background: `linear-gradient(135deg, #fff9f0 0%, ${C.white} 60%, #fff5e6 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={r.style}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', color: C.orange, marginBottom: 12 }}>Spraoi Journey</p>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 16, lineHeight: 1.05 }}>
              Every action.<br />One connected loop.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              From the moment a coach creates a challenge to the second a parent is notified — Journey closes the loop between club, player and family.
            </p>
          </div>
          {/* Story steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {JOURNEY_STEPS.map((step, i) => (
              <div key={step.who + i} style={{ display: 'grid', gridTemplateColumns: step.side === 'right' ? '1fr 1fr' : '1fr 1fr', gap: 60, alignItems: 'center', padding: '48px 0', borderBottom: i < JOURNEY_STEPS.length - 1 ? `1px solid ${C.line}` : 'none' }} className="journey-step">
                {/* Copy side */}
                <div style={{ order: step.side === 'right' ? 0 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${C.orange}20`, border: `1px solid ${C.orange}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>{step.icon}</div>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.orange, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', ...display, fontSize: 11, fontWeight: 900 }}>{i + 1}</div>
                  </div>
                  <h3 style={{ ...display, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 14, lineHeight: 1.15 }}>{step.title}</h3>
                  <p style={{ ...body, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>{step.desc}</p>
                  {/* Connector arrow */}
                  {i < JOURNEY_STEPS.length - 1 && (
                    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 1, height: 28, background: `${C.orange}40` }} />
                      <span style={{ fontSize: 18, color: `${C.orange}80` }}>↓</span>
                    </div>
                  )}
                </div>
                {/* Visual side */}
                <div style={{ order: step.side === 'right' ? 1 : 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {step.mascot ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      {step.mascot}
                      <div style={{ background: `${C.orange}15`, border: `1px solid ${C.orange}30`, borderRadius: 20, padding: '12px 24px', textAlign: 'center' }}>
                        <p style={{ ...body, fontSize: 13, color: C.orange, fontWeight: 700 }}>🎉 Great work, Ciarán!</p>
                        <p style={{ ...body, fontSize: 12, color: C.muted, marginTop: 4 }}>Activity confirmed · +80 XP earned</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ filter: 'drop-shadow(0 20px 40px rgba(251,140,0,.15))' }}>
                      <Phone size="lg">
                        {step.screen}
                      </Phone>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Coach Section ────────────────────────────────────────────────────────────

function CoachSection() {
  const r = useReveal()
  return (
    <section id="coach" style={{ background: `linear-gradient(135deg, #f0f4ff 0%, ${C.white} 55%, #f0f7ff 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 60, alignItems: 'center' }} className="hero-grid">
          {/* Copy */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: 12, fontWeight: 900, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.13em' }}>Spraoi Coach</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', background: `${C.blue}15`, border: `1px solid ${C.blue}25`, borderRadius: 999 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.blue }}>Coming soon</span>
              </span>
            </div>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Plan. Deliver. Track.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
              Spraoi Coach gives every coach a structured, practical toolkit for planning sessions, tracking attendance, building drill libraries and monitoring player development.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {[
                ['Session plans', 'Build, save and reuse session templates with drill sequences and timings.'],
                ['Drill library', 'Browse and filter skills drills by sport, difficulty, age group and type.'],
                ['Attendance', 'Mark attendance in seconds and see trends across the full season.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.blue}20`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: C.blue }}>✓</span>
                  </div>
                  <div>
                    <strong style={{ ...body, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</strong>
                    <p style={{ ...body, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.blue, color: C.white, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: `0 10px 25px ${C.blue}40`, ...body }}>
              Request Coach access
            </a>
          </div>
          {/* Device gallery */}
          <div style={{ position: 'relative', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size="sm" style={{ position: 'absolute', left: 0, bottom: 60, transform: 'rotate(-6deg)', zIndex: 1 }}>
              <CoachApp />
            </Phone>
            <div style={{ position: 'relative', zIndex: 2, transform: 'scale(0.82)', transformOrigin: 'center center' }}>
              <Laptop screenHeight={320}>
                <CoachDashboard />
              </Laptop>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Challenge Section ────────────────────────────────────────────────────────

function ChallengeSection() {
  const r = useReveal()
  return (
    <section id="challenge" style={{ background: `linear-gradient(135deg, #f2fbf1 0%, #fffdf6 63%, #fbf7ee 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 60, alignItems: 'center' }} className="hero-grid">
          {/* Copy */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: 12, fontWeight: 900, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.13em' }}>Spraoi Challenge</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', background: `${C.purple}15`, border: `1px solid ${C.purple}25`, borderRadius: 999 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.purple }}>Pilot development</span>
              </span>
            </div>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Make fitness feel like a team adventure.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
              Run weekly challenges, track progress and keep children motivated through XP, streaks, leaderboards, achievements and skills videos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {[
                ['Weekly challenges', 'Running, football, hurling and skill-based activities.'],
                ['Player journeys', 'Progress, XP, goals, streaks and achievements.'],
                ['Coach oversight', 'Approvals, dashboards and activity history.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.purple}20`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: C.purple }}>✓</span>
                  </div>
                  <div>
                    <strong style={{ ...body, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</strong>
                    <p style={{ ...body, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.green, color: C.white, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: S.green, ...body }}>
              Request Challenge access
            </a>
          </div>
          {/* 3 devices */}
          <div style={{ position: 'relative', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size="sm" style={{ position: 'absolute', left: 0, bottom: 50, transform: 'rotate(-7deg)', zIndex: 1 }}>
              <ChallengeSkillsApp />
            </Phone>
            <Phone size="lg" style={{ position: 'relative', zIndex: 2 }}>
              <ChallengeApp />
            </Phone>
            <Phone size="sm" style={{ position: 'absolute', right: 0, bottom: 50, transform: 'rotate(7deg)', zIndex: 1 }}>
              <ChallengeApp view="leaderboard" />
            </Phone>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Blitz Section ────────────────────────────────────────────────────────────

function BlitzSection() {
  const r = useReveal()
  return (
    <section id="blitz" style={{ background: `linear-gradient(135deg, #fffaf2 0%, ${C.white} 55%, #fff0df 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '1.18fr .82fr', gap: 60, alignItems: 'center' }} className="hero-grid">
          {/* Devices — left (reversed layout) */}
          <div style={{ position: 'relative', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size="sm" style={{ position: 'absolute', left: 0, bottom: 60, transform: 'rotate(-5deg)', zIndex: 1 }}>
              <BlitzApp />
            </Phone>
            <div style={{ position: 'relative', zIndex: 2, transform: 'scale(0.82)', transformOrigin: 'center center' }}>
              <Laptop screenHeight={320}>
                <BlitzDashboard />
              </Laptop>
            </div>
          </div>
          {/* Copy */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: 12, fontWeight: 900, color: C.coral, textTransform: 'uppercase', letterSpacing: '0.13em' }}>Spraoi Blitz</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', background: `${C.coral}15`, border: `1px solid ${C.coral}25`, borderRadius: 999 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.coral }}>Pilot development</span>
              </span>
            </div>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Run a full tournament from one clear app.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
              Give organisers, mentors and families the information they need without fixture sheets, group chats or last-minute confusion.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {[
                ['Day planning', 'Timings, pitches, lunch breaks and event information.'],
                ['Live competition', 'Fixtures, scores, standings, finals and results.'],
                ['Team views', 'Each club sees its own fixtures, breaks and progress.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.coral}20`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: C.coral }}>✓</span>
                  </div>
                  <div>
                    <strong style={{ ...body, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</strong>
                    <p style={{ ...body, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.orange, color: C.white, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: S.orange, ...body }}>
              Request Blitz access
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Connect Section ──────────────────────────────────────────────────────────

function ConnectSection() {
  const r = useReveal()
  return (
    <section id="connect" style={{ background: `linear-gradient(135deg, #e8f8ff 0%, ${C.white} 55%, #e8f6ff 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 60, alignItems: 'center' }} className="hero-grid">
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: 12, fontWeight: 900, color: C.sky, textTransform: 'uppercase', letterSpacing: '0.13em' }}>Spraoi Connect</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', background: `${C.sky}15`, border: `1px solid ${C.sky}30`, borderRadius: 999 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.sky }}>Coming soon</span>
              </span>
            </div>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Keep your whole club in the loop.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
              Notices, updates and communication for coaches, parents and volunteers — all in one place, without WhatsApp chaos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {[
                ['Announcements', 'Training updates, fixture changes and club news delivered instantly.'],
                ['Channels', 'Separate feeds for training, matches, admin and general updates.'],
                ['Parent comms', 'Parents stay informed without being added to coach group chats.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.sky}25`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: C.sky }}>✓</span>
                  </div>
                  <div>
                    <strong style={{ ...body, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</strong>
                    <p style={{ ...body, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.sky, color: C.ink, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: S.sky, ...body }}>
              Request Connect access
            </a>
          </div>
          <div style={{ position: 'relative', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size="sm" style={{ position: 'absolute', right: 0, bottom: 60, transform: 'rotate(6deg)', zIndex: 1 }}>
              <ConnectApp />
            </Phone>
            <div style={{ position: 'relative', zIndex: 2, transform: 'scale(0.82)', transformOrigin: 'center center' }}>
              <Laptop screenHeight={320}>
                <ConnectDashboard />
              </Laptop>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Club Section ─────────────────────────────────────────────────────────────

function ClubSection() {
  const r = useReveal()
  return (
    <section id="club" style={{ background: `linear-gradient(135deg, #f0fff0 0%, ${C.white} 55%, #f0fff2 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '1.18fr .82fr', gap: 60, alignItems: 'center' }} className="hero-grid">
          {/* Device */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}>
              <Laptop screenHeight={340}>
                <ClubDashboard />
              </Laptop>
            </div>
          </div>
          {/* Copy */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: 12, fontWeight: 900, color: C.green, textTransform: 'uppercase', letterSpacing: '0.13em' }}>Spraoi Club</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', background: `${C.green}15`, border: `1px solid ${C.green}25`, borderRadius: 999 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.green }}>Coming soon</span>
              </span>
            </div>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Your club's digital home.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
              Members, fees, compliance, news and governance — managed in one clear admin dashboard, custom-branded to your club.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {[
                ['Member registry', 'Full member records, renewal tracking and eligibility status.'],
                ['Fee management', 'Collect, track and report on annual subscriptions and one-off payments.'],
                ['Compliance dashboard', 'Garda Vetting, safeguarding and insurance — monitored automatically.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.green}25`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: C.green }}>✓</span>
                  </div>
                  <div>
                    <strong style={{ ...body, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</strong>
                    <p style={{ ...body, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.green, color: C.white, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: S.green, ...body }}>
              Request Club access
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Customisation Section (unchanged text) ────────────────────────────────────

function CustomisationSection() {
  const r = useReveal()
  return (
    <section id="customisable" style={{ background: `linear-gradient(125deg, #153d2f 0%, #2f7339 38%, #7e4b21 72%, #7b284c 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '.85fr 1.15fr', gap: 70, alignItems: 'center' }} className="hero-grid">
          <div>
            <p style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'rgba(255,255,255,.55)', marginBottom: 12 }}>Your club. Your brand. Your app.</p>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.white, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Everything can be shaped around how your club works.
            </h2>
            <p style={{ ...body, fontSize: 16, color: 'rgba(255,255,255,.65)', lineHeight: 1.7, marginBottom: 32 }}>
              From the crest and colours to schedules, terminology, sponsors and visible sections, Spraoi products are designed to feel like your club's own digital experience.
            </p>
            <a href="#request-info" style={{ display: 'inline-flex', height: 48, padding: '0 24px', background: C.white, color: C.ink, borderRadius: 14, alignItems: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', ...body }}>
              Talk to us
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Club identity', 'Crest, colours, sponsors and event branding.'],
              ['Club language', 'Your wording, notices, labels and messages.'],
              ['Club setup', 'Teams, grades, rules, permissions and schedules.'],
              ['Club roadmap', 'Start with one module and add more over time.'],
            ].map(([title, desc]) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 20, padding: '24px 22px', backdropFilter: 'blur(8px)',
              }}>
                <h3 style={{ ...display, fontSize: 17, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h3>
                <p style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Roadmap Section (unchanged) ──────────────────────────────────────────────

function RoadmapSection() {
  const r = useReveal()
  return (
    <section id="roadmap" style={{ background: C.soft, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={r.style}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', color: C.blue, marginBottom: 12 }}>Product roadmap</p>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,4rem)', fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', marginBottom: 16, lineHeight: 1.05 }}>
              Launching carefully, module by module.
            </h2>
            <p style={{ ...body, fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto' }}>
              Challenge and Blitz are the current focus. Journey, Coach, Connect and Club remain disabled until they are ready.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {[
              { label: 'Now', title: 'Challenge + Blitz', desc: 'Both products are in active pilot development with selected clubs. Feedback shapes every release.', color: C.green, icon: '🟢' },
              { label: 'Next', title: 'Journey + Coach', desc: 'Journey and Coach will enter development once Challenge and Blitz have completed their pilots.', color: C.orange, icon: '🟡' },
              { label: 'Later', title: 'Connect + Club', desc: 'Connect and Club complete the platform. They will be scoped and built once earlier products are stable.', color: C.blue, icon: '🔵' },
            ].map(card => (
              <div key={card.label} style={{ background: C.white, border: `1px solid ${C.line}`, borderTop: `5px solid ${card.color}`, borderRadius: 24, padding: '32px 28px', boxShadow: S.card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{card.icon}</span>
                  <span style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: card.color }}>{card.label}</span>
                </div>
                <h3 style={{ ...display, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: '-0.03em', marginBottom: 12 }}>{card.title}</h3>
                <p style={{ ...body, fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Contact Section (unchanged structure) ────────────────────────────────────

function ContactSection() {
  const r = useReveal()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [formData, setFormData] = useState({ name: '', email: '', club: '', sport: '', interest: '', message: '', website: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.website) return // honeypot
    setStatus('sending')
    setTimeout(() => setStatus('sent'), 1400)
  }

  const field = (label: string, key: keyof typeof formData, type = 'text', required = true) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ ...body, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{label}</label>
      <input
        type={type} required={required}
        value={formData[key]}
        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
        style={{
          height: 46, padding: '0 16px',
          background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)',
          borderRadius: 13, color: C.white, ...body, fontSize: 14,
          outline: 'none', transition: 'border-color .15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,.5)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.2)')}
        placeholder={`Your ${label.toLowerCase()}`}
      />
    </div>
  )

  return (
    <section id="request-info" style={{ background: `linear-gradient(125deg, #183a2a 0%, #276b37 32%, #72512a 66%, #6b2b54 100%)`, padding: '96px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div ref={r.ref} style={{ ...r.style, display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 68, alignItems: 'start' }} className="hero-grid">
          {/* Copy */}
          <div>
            <p style={{ ...body, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'rgba(255,255,255,.55)', marginBottom: 12 }}>Request more information</p>
            <h2 style={{ ...display, fontSize: 'clamp(2.3rem,4.2vw,3.2rem)', fontWeight: 900, color: C.white, letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1.05 }}>
              Tell us what your club needs.
            </h2>
            <p style={{ ...body, fontSize: 15, color: 'rgba(255,255,255,.65)', lineHeight: 1.7, marginBottom: 32 }}>
              Use the form to ask about Spraoi Challenge, Spraoi Blitz, future modules, pilots or a customised club setup.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Custom branding', 'Pilot opportunities', 'Product updates'].map(pt => (
                <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: C.white }}>✓</span>
                  </div>
                  <span style={{ ...body, fontSize: 14, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Form */}
          <div style={{ background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 28, padding: '36px 32px', backdropFilter: 'blur(16px)' }}>
            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h3 style={{ ...display, fontSize: 24, fontWeight: 900, color: C.white, marginBottom: 10 }}>Message sent!</h3>
                <p style={{ ...body, fontSize: 14, color: 'rgba(255,255,255,.65)' }}>We'll be in touch shortly. Thank you for your interest in Spraoi Sports.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Honeypot */}
                <input type="text" name="website" value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {field('Your name', 'name')}
                  {field('Your email', 'email', 'email')}
                </div>
                {field('Club name', 'club')}
                {/* Sport select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ ...body, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Sport</label>
                  <div style={{ position: 'relative' }}>
                    <select value={formData.sport} onChange={e => setFormData(p => ({ ...p, sport: e.target.value }))}
                      style={{ width: '100%', height: 46, padding: '0 36px 0 16px', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 13, color: C.white, ...body, fontSize: 14, appearance: 'none', cursor: 'pointer', outline: 'none' }}>
                      {['Select sport…','GAA Football','GAA Hurling','GAA Camogie','GAA Handball','Soccer','Rugby','Other'].map(o => <option key={o} value={o} style={{ color: C.ink }}>{o}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.5)', pointerEvents: 'none', fontSize: 12 }}>▼</span>
                  </div>
                </div>
                {/* Interest select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ ...body, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Which product are you interested in?</label>
                  <div style={{ position: 'relative' }}>
                    <select value={formData.interest} onChange={e => setFormData(p => ({ ...p, interest: e.target.value }))}
                      style={{ width: '100%', height: 46, padding: '0 36px 0 16px', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 13, color: C.white, ...body, fontSize: 14, appearance: 'none', cursor: 'pointer', outline: 'none' }}>
                      {['Select product…','Spraoi Challenge','Spraoi Blitz','Spraoi Journey','Spraoi Coach','Spraoi Connect','Spraoi Club','All products'].map(o => <option key={o} value={o} style={{ color: C.ink }}>{o}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.5)', pointerEvents: 'none', fontSize: 12 }}>▼</span>
                  </div>
                </div>
                {/* Message */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ ...body, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Your message</label>
                  <textarea required rows={4} value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your club, what you need and any questions you have…"
                    style={{ padding: '12px 16px', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 13, color: C.white, ...body, fontSize: 14, resize: 'vertical', outline: 'none', minHeight: 110 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.2)')}
                  />
                </div>
                <button type="submit" disabled={status === 'sending'}
                  style={{ height: 52, background: `linear-gradient(135deg, ${C.green}, #2f8f35)`, color: C.white, border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: status === 'sending' ? 'wait' : 'pointer', boxShadow: S.green, ...body, transition: 'transform .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                >
                  {status === 'sending' ? 'Sending…' : 'Send information request'}
                </button>
                <p style={{ ...body, fontSize: 12, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>
                  Your email address is used only to reply to this request.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Product Suite — Faithful App Mockups ────────────────────────────────────

// Shared sidebar builder used by all desktop mockups
function AppSidebar({ accent, items, activeId, user }: {
  accent: string
  items: { id: string; icon: string; label: string; badge?: number }[]
  activeId: string
  user: { initials: string; name: string; role: string }
}) {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ width: 190, background: '#0b2545', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}>
      <div style={{ padding: '14px 12px 12px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <img src={spraioIcon} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
        <div>
          <div style={{ ...n, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Spraoi Sports</div>
          <div style={{ ...d, fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>St. Finbarr&apos;s GAA</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '6px 8px', overflow: 'hidden' }}>
        {items.map(item => {
          const active = item.id === activeId
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, background: active ? `${accent}25` : 'transparent', borderLeft: `2px solid ${active ? accent : 'transparent'}` }}>
              <span style={{ fontSize: 12, color: active ? accent : 'rgba(255,255,255,.35)', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ ...d, fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#fff' : 'rgba(255,255,255,.45)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              {item.badge ? <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: accent, color: '#fff', ...d, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.badge}</span> : null}
            </div>
          )
        })}
      </nav>
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ ...n, fontSize: 10, fontWeight: 900, color: '#fff' }}>{user.initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...d, fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ ...d, fontSize: 9, color: 'rgba(255,255,255,.35)' }}>{user.role}</div>
        </div>
      </div>
    </div>
  )
}

// ── Club App Mockup ───────────────────────────────────────────────────────────
function ClubAppMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  const red = '#d32f2f'
  const teams = [
    { name: 'U12 Girls Football', coach: 'Aoife Mac C.', players: 14, max: 18, color: '#43a047' },
    { name: 'U14 Boys Hurling',   coach: 'Fionn Ó D.',   players: 16, max: 20, color: '#43a047' },
    { name: 'Senior Women',       coach: 'Rónán Ó B.',   players: 24, max: 30, color: '#43a047' },
    { name: 'Senior Men',         coach: 'Tomás Mac C.', players: 28, max: 30, color: '#f9a825' },
    { name: 'U16 Girls Football', coach: 'Caoimhe Ní F.',players: 14, max: 20, color: '#43a047' },
    { name: 'U10 Mixed',          coach: 'Brigid Ní L.', players: 11, max: 16, color: '#43a047' },
  ]
  const events = [
    { date: '5 Aug', type: 'Training', label: 'U12 A — Pitch 2 · 16:30',    tc: '#43a047' },
    { date: '7 Aug', type: 'Training', label: 'Senior Men — Pitch 1 · 19:00', tc: '#43a047' },
    { date: '9 Aug', type: 'Match',    label: 'U14 vs Na Piarsaigh · 11:00',  tc: '#d32f2f' },
    { date: '12 Aug',type: 'Meeting',  label: 'Committee · Clubhouse 20:00',  tc: '#1565c0' },
    { date: '15 Aug',type: 'Match',    label: 'Senior Women vs Douglas',       tc: '#d32f2f' },
  ]
  const regs = [
    { name: 'Ciarán Ó Murchú',    stage: 'complete',  sc: '#43a047', bg: '#e8f5e9' },
    { name: 'Pádraig Ó Ceallaigh',stage: 'payment',   sc: '#e65100', bg: '#fff3e0' },
    { name: 'Seán Mac Gearailt',   stage: 'medical',   sc: '#d32f2f', bg: '#fce4ec' },
    { name: 'Úna Ní Dhálaigh',     stage: 'payment',   sc: '#e65100', bg: '#fff3e0' },
    { name: 'Darragh Ó Briain',    stage: 'submitted', sc: '#1565c0', bg: '#e3f2fd' },
    { name: 'Sorcha Ní Fhaoláin',  stage: 'complete',  sc: '#43a047', bg: '#e8f5e9' },
  ]
  const revenueMonths = [62, 78, 55, 90, 83, 95]
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f6f9fc', fontSize: 11, overflow: 'hidden' }}>
      <AppSidebar accent={red} activeId="dashboard"
        items={[{ id:'dashboard',icon:'🏠',label:'Dashboard'},{id:'members',icon:'👥',label:'Members'},{id:'teams',icon:'🏆',label:'Teams'},{id:'finance',icon:'💰',label:'Finance'},{id:'reg',icon:'📋',label:'Registrations',badge:6},{id:'docs',icon:'📁',label:'Documents'}]}
        user={{ initials:'SC', name:'Sinéad Cronin', role:'Club Secretary' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #dfe7ef', padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...n, fontSize: 16, fontWeight: 900, color: '#13243b', letterSpacing: '-0.03em' }}>Dashboard</div>
            <div style={{ ...d, fontSize: 9, color: '#627187' }}>Mon 4 Aug 2026 · St. Finbarr&apos;s GAA</div>
          </div>
          <div style={{ height: 28, padding: '0 12px', background: red, color: '#fff', borderRadius: 7, display: 'flex', alignItems: 'center', ...d, fontSize: 10, fontWeight: 700 }}>+ New Member</div>
        </div>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '12px 14px 0', flexShrink: 0 }}>
          {[
            { l:'Members',   v:'182', s:'168 active',     c: red       },
            { l:'Active Teams',v:'9', s:'2 sports',        c:'#1565c0'  },
            { l:'Revenue YTD',v:'€12.4k',s:'€3.1k exp.',  c:'#43a047'  },
            { l:'Pending Reg.',v:'6', s:'need action',     c:'#e65100'  },
          ].map(({ l, v, s, c }, i) => (
            <div key={l} style={{ background: '#fff', borderRadius: 10, border: '1px solid #dfe7ef', padding: '9px 10px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ ...d, fontSize: 8, color: '#627187', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 2 }}>{l}</div>
              <div style={{ ...n, fontSize: 18, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ ...d, fontSize: 8, color: '#627187', marginTop: 2 }}>{s}</div>
              {/* Mini bar chart only on Revenue card */}
              {i === 2 && (
                <svg width="54" height="20" style={{ position: 'absolute', bottom: 6, right: 6 }}>
                  {revenueMonths.map((h, j) => (
                    <rect key={j} x={j * 9} y={20 - (h * 20 / 100)} width={7} height={h * 20 / 100} rx={1} fill={j === revenueMonths.length - 1 ? '#43a047' : '#c8e6c9'} />
                  ))}
                </svg>
              )}
            </div>
          ))}
        </div>
        {/* 3-column lower grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px', gap: 10, padding: '10px 14px', flex: 1, overflow: 'hidden' }}>
          {/* Left: Team Status */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dfe7ef', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '9px 12px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 12, fontWeight: 900, color: '#13243b', flexShrink: 0 }}>Team Status</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {teams.map(({ name, coach, players, max, color }) => (
                <div key={name} style={{ padding: '7px 12px', borderBottom: '1px solid #f0f4f8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div>
                      <div style={{ ...d, fontWeight: 600, fontSize: 10, color: '#13243b' }}>{name}</div>
                      <div style={{ ...d, fontSize: 8, color: '#627187' }}>{coach}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ ...n, fontSize: 9, fontWeight: 700, color: '#627187' }}>{players}/{max}</span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    </div>
                  </div>
                  <div style={{ height: 3, background: '#f0f4f8', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(players / max * 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Middle: Upcoming Events */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dfe7ef', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '9px 12px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 12, fontWeight: 900, color: '#13243b', flexShrink: 0 }}>Upcoming Events</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {events.map(({ date, type, label, tc }) => (
                <div key={label} style={{ padding: '7px 10px', borderBottom: '1px solid #f0f4f8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ ...d, fontSize: 8, fontWeight: 800, color: red }}>{date}</span>
                    <span style={{ background: tc + '18', color: tc, borderRadius: 4, padding: '1px 5px', ...d, fontSize: 7, fontWeight: 800 }}>{type}</span>
                  </div>
                  <div style={{ ...d, fontSize: 9, color: '#13243b', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Right: Recent Registrations */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dfe7ef', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '9px 10px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 12, fontWeight: 900, color: '#13243b', flexShrink: 0 }}>Recent Reg.</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {regs.map(({ name, stage, sc, bg }) => (
                <div key={name} style={{ padding: '7px 10px', borderBottom: '1px solid #f0f4f8' }}>
                  <div style={{ ...d, fontSize: 9, fontWeight: 600, color: '#13243b', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                  <div style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 999, background: bg, color: sc, ...d, fontSize: 8, fontWeight: 700 }}>{stage}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Coach App Mockup ──────────────────────────────────────────────────────────
function CoachAppMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f6f9fc', fontSize: 11, overflow: 'hidden' }}>
      <AppSidebar accent="#8e24aa" activeId="dashboard"
        items={[{id:'dashboard',icon:'◈',label:'Dashboard'},{id:'sessions',icon:'◉',label:'Sessions'},{id:'attendance',icon:'✓',label:'Attendance'},{id:'players',icon:'◉',label:'Players'},{id:'ai',icon:'✦',label:'AI Coach',badge:1},{id:'reports',icon:'◐',label:'Reports'}]}
        user={{ initials:'CM', name:'Coach Murphy', role:'U12 Head Coach' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dfe7ef', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...n, fontSize: 18, fontWeight: 900, color: '#13243b', letterSpacing: '-0.03em' }}>Dashboard</div>
            <div style={{ ...d, fontSize: 10, color: '#627187' }}>Tue 5 Aug 2026 · St. Finbarr&apos;s GAA</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ height: 30, padding: '0 12px', background: '#8e24aa', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', ...d, fontSize: 11, fontWeight: 700 }}>+ New Session</div>
            <div style={{ height: 30, padding: '0 12px', background: '#f6f9fc', border: '1px solid #dfe7ef', color: '#13243b', borderRadius: 8, display: 'flex', alignItems: 'center', ...d, fontSize: 11, fontWeight: 600 }}>✓ Attendance</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
            {[['Squad Size','22','3 injured','#8e24aa'],['Avg Attendance','84%','↑ 6% vs last mo.','#43a047'],['Sessions (Aug)','6','12 drills run','#29b6f6'],['Journey Players','18','playing Challenge','#fb8c00']].map(([l,v,s,c]) => (
              <div key={String(l)} style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', padding: '10px 12px' }}>
                <div style={{ ...d, fontSize: 9, color: '#627187', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 3 }}>{l}</div>
                <div style={{ ...n, fontSize: 20, fontWeight: 900, color: String(c) }}>{v}</div>
                <div style={{ ...d, fontSize: 9, color: '#627187', marginTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#6a1b9a,#8e24aa)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...d, fontSize: 9, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Today · 16:30 · Pitch 2</div>
                    <div style={{ ...n, fontSize: 16, fontWeight: 900, color: '#fff' }}>Passing &amp; Movement</div>
                    <div style={{ ...d, fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>U12 A · 8 drills · 75 min</div>
                  </div>
                  <div style={{ height: 28, padding: '0 12px', background: '#fff', color: '#8e24aa', borderRadius: 7, display: 'flex', alignItems: 'center', ...d, fontSize: 11, fontWeight: 700 }}>▶ Start</div>
                </div>
                <div style={{ padding: '10px 0' }}>
                  {[['Ciarán Ó Murchú','Forward',88,7,true],['Niamh Ní Bhriain','Midfielder',92,12,true],['Aoife de Búrca','Goalkeeper',96,18,true],['Seán Mac Gearailt','Defender',74,3,false]].map(([nm,pos,avg,st,pr]) => (
                    <div key={String(nm)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderBottom: '1px solid #f0f4f8' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pr ? '#43a047' : '#ef5350', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ ...d, fontSize: 11, fontWeight: 600, color: '#13243b' }}>{nm}</div>
                        <div style={{ ...d, fontSize: 9, color: '#627187' }}>{pos}</div>
                      </div>
                      <div style={{ ...n, fontSize: 11, fontWeight: 800, color: '#8e24aa' }}>{avg}</div>
                      <div style={{ ...d, fontSize: 9, color: '#627187' }}>🔥{st}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 13, fontWeight: 900, color: '#13243b' }}>Upcoming</div>
              {[['Thu 7 Aug','Warm-up Drills','16:30'],['Sat 9 Aug','Match Prep','10:00'],['Mon 11 Aug','Ball Skills','17:00'],['Thu 14 Aug','Set Plays','16:30']].map(([dt,t,tm]) => (
                <div key={String(dt)} style={{ padding: '9px 12px', borderBottom: '1px solid #f0f4f8' }}>
                  <div style={{ ...n, fontSize: 10, fontWeight: 700, color: '#8e24aa' }}>{dt}</div>
                  <div style={{ ...d, fontSize: 11, fontWeight: 600, color: '#13243b' }}>{t}</div>
                  <div style={{ ...d, fontSize: 9, color: '#627187' }}>{tm}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Journey Mobile Mockup ─────────────────────────────────────────────────────
function JourneyMobileMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ width: 390, height: 844, background: '#e1f5fe', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Status bar */}
      <div style={{ background: '#0277bd', padding: '10px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={spraioIcon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <div style={{ ...n, fontSize: 16, fontWeight: 800, color: '#fff' }}>Spraoi Journey</div>
          </div>
          <div style={{ ...d, fontSize: 11, color: 'rgba(255,255,255,.7)' }}>🔔</div>
        </div>
        {/* Player card */}
        <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: '14px 16px', marginBottom: -1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#29b6f6,#0277bd)', border: '3px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...n, fontSize: 18, fontWeight: 900, color: '#fff' }}>Ci</span>
            </div>
            <div>
              <div style={{ ...n, fontSize: 15, fontWeight: 900, color: '#fff' }}>Ciarán Ó Murchú</div>
              <div style={{ ...d, fontSize: 11, color: 'rgba(255,255,255,.65)' }}>Level 7 · St. Finbarr&apos;s GAA</div>
            </div>
            <div style={{ marginLeft: 'auto', background: '#fbc02d', borderRadius: 10, padding: '4px 10px' }}>
              <span style={{ ...n, fontSize: 13, fontWeight: 900, color: '#fff' }}>⭐ 8,450 XP</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '62%', height: '100%', background: '#fbc02d', borderRadius: 4 }} />
            </div>
            <span style={{ ...d, fontSize: 10, color: 'rgba(255,255,255,.7)', whiteSpace: 'nowrap' }}>620 to Lv.8</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ ...d, fontSize: 11, color: 'rgba(255,255,255,.7)' }}>🔥 7 day streak</span>
            <span style={{ ...d, fontSize: 11, color: 'rgba(255,255,255,.7)' }}>🏅 12 badges</span>
          </div>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, background: '#f0f8ff', padding: '16px 16px', overflow: 'hidden' }}>
        <div style={{ ...n, fontSize: 14, fontWeight: 900, color: '#1a2940', marginBottom: 12 }}>Today&apos;s Missions</div>
        {[
          { icon:'🏃', label:'30 min Movement', xp:80, done:true, color:'#43a047' },
          { icon:'💧', label:'Hydration (5/8 glasses)', xp:40, done:false, color:'#29b6f6' },
          { icon:'🥗', label:'5 fruit & veg', xp:70, done:false, color:'#8bc34a' },
          { icon:'😴', label:'8 hrs sleep last night', xp:50, done:true, color:'#7c4dff' },
        ].map(({ icon, label, xp, done, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${done ? color+'40' : '#deeaf5'}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...d, fontSize: 12, fontWeight: 600, color: done ? '#8fa3bc' : '#1a2940', textDecoration: done ? 'line-through' : 'none' }}>{label}</div>
              <div style={{ ...d, fontSize: 10, color: '#8fa3bc', marginTop: 2 }}>+{xp} XP</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? color : '#deeaf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {done && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
            </div>
          </div>
        ))}
        {/* Otis celebration — running with ball pose */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#fff9e6,#fffbe8)', border: '1px solid #fbc02d40', borderRadius: 14, padding: '12px 14px', marginTop: 4, overflow: 'hidden' }}>
          <MascotCrop src={otisSrc} alt="Otis the Otter" pose={MASCOT_POSE.runBall} displayH={52} />
          <div>
            <div style={{ ...n, fontSize: 12, fontWeight: 900, color: '#f9a825' }}>Keep it up, Ciarán! 🎉</div>
            <div style={{ ...d, fontSize: 10, color: '#627187', marginTop: 2 }}>2 missions done today · +130 XP earned</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Challenge Mobile Mockup ───────────────────────────────────────────────────
function ChallengeMobileMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ width: 390, height: 844, background: '#e8f5e9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#388e3c', padding: '10px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={spraioIcon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span style={{ ...n, fontSize: 16, fontWeight: 800, color: '#fff' }}>Spraoi Challenge</span>
          </div>
          <span style={{ ...d, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>🔔</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['⭐ 8,450 XP','Level 7'],['🔥 7 day','Streak'],['🏅 12','Badges']].map(([v,l]) => (
            <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ ...n, fontSize: 13, fontWeight: 900, color: '#fff' }}>{v}</div>
              <div style={{ ...d, fontSize: 10, color: 'rgba(255,255,255,.65)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden' }}>
        {/* Active challenge */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12, border: '1px solid #c8e6c9' }}>
          <div style={{ background: 'linear-gradient(135deg,#2e7d32,#43a047)', padding: '14px 16px' }}>
            <div style={{ ...d, fontSize: 9, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Active Challenge</div>
            <div style={{ ...n, fontSize: 15, fontWeight: 900, color: '#fff' }}>7-Day Healthy Habits</div>
            <div style={{ ...d, fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>Day 5 of 7 · 400 XP reward</div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {[['💧','Hydration','5/7 days',71],['🏃','Movement','5/7 days',71],['🥗','Nutrition','4/7 days',57],['😴','Sleep','6/7 days',86]].map(([ic,nm,pr,pct]) => (
              <div key={String(nm)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ic}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ ...d, fontSize: 11, fontWeight: 600, color: '#13243b' }}>{nm}</span>
                    <span style={{ ...d, fontSize: 9, color: '#627187' }}>{pr}</span>
                  </div>
                  <div style={{ height: 5, background: '#e8f5e9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#43a047', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Leaderboard */}
        <div style={{ ...n, fontSize: 13, fontWeight: 900, color: '#13243b', marginBottom: 8 }}>Club Leaderboard</div>
        {[['🥇','Aoife de Búrca','2,100 XP','#fbc02d'],['🥈','Niamh Ní Bhriain','1,580 XP','#aaa'],['🥉','Caoimhe Ní Fhaoláin','1,870 XP','#cd7f32'],['4','Ciarán Ó Murchú','1,240 XP','#43a047']].map(([rank,nm,xp,c]) => (
          <div key={String(nm)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: nm==='Ciarán Ó Murchú' ? '#e8f5e9' : '#fff', borderRadius: 10, padding: '8px 12px', marginBottom: 6, border: `1px solid ${nm==='Ciarán Ó Murchú' ? '#a5d6a7' : '#dfe7ef'}` }}>
            <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{rank}</span>
            <div style={{ flex: 1, ...d, fontSize: 11, fontWeight: 600, color: '#13243b' }}>{nm}</div>
            <span style={{ ...n, fontSize: 11, fontWeight: 900, color: String(c) }}>{xp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Blitz App Mockup ──────────────────────────────────────────────────────────
function BlitzAppMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f6f9fc', fontSize: 11, overflow: 'hidden' }}>
      <AppSidebar accent="#e64a19" activeId="fixtures"
        items={[{id:'dashboard',icon:'◈',label:'Dashboard'},{id:'fixtures',icon:'📅',label:'Fixtures'},{id:'teams',icon:'🏆',label:'Teams'},{id:'scores',icon:'⚽',label:'Live Scores'},{id:'refs',icon:'🟡',label:'Referees'},{id:'settings',icon:'⚙️',label:'Settings'}]}
        user={{ initials:'BR', name:'Blitz Registrar', role:'Tournament Admin' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dfe7ef', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...n, fontSize: 18, fontWeight: 900, color: '#13243b', letterSpacing: '-0.03em' }}>Fixtures</div>
            <div style={{ ...d, fontSize: 10, color: '#627187' }}>Swords U12 Blitz · Sat 9 Aug 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ height: 30, padding: '0 12px', background: '#e64a19', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', ...d, fontSize: 11, fontWeight: 700 }}>+ Add Fixture</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
            {[['Teams','12','6 groups','#e64a19'],['Fixtures','24','8 completed','#43a047'],['Pitches','4','all in use','#29b6f6'],['Final','14:30','Pitch 1','#fbc02d']].map(([l,v,s,c]) => (
              <div key={String(l)} style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', padding: '10px 12px' }}>
                <div style={{ ...d, fontSize: 9, color: '#627187', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 3 }}>{l}</div>
                <div style={{ ...n, fontSize: 20, fontWeight: 900, color: String(c) }}>{v}</div>
                <div style={{ ...d, fontSize: 9, color: '#627187', marginTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 13, fontWeight: 900, color: '#13243b' }}>Today&apos;s Fixtures</div>
              {[['09:30','St. Finbarr\'s A','vs','Naomh Pádraig','Pitch 1','FT','3-2'],['10:00','Swords Celtic','vs','Oliver Plunkett','Pitch 2','FT','1-4'],['10:30','St. Finbarr\'s B','vs','Kilbarrack','Pitch 3','Live','1-1'],['11:00','Naomh Pádraig','vs','Swords Celtic','Pitch 1','Soon','—'],['11:30','Oliver Plunkett','vs','St. Finbarr\'s A','Pitch 2','Soon','—']].map(([time,h,vs,a,pitch,status,score]) => (
                <div key={String(time+h)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #f0f4f8' }}>
                  <span style={{ ...n, fontSize: 10, fontWeight: 700, color: '#e64a19', width: 36, flexShrink: 0 }}>{time}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...d, fontSize: 11, fontWeight: 600, color: '#13243b' }}>{h} <span style={{ color: '#aaa' }}>{vs}</span> {a}</div>
                    <div style={{ ...d, fontSize: 9, color: '#627187' }}>{pitch}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {status === 'Live' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43a047' }} />}
                    <span style={{ ...n, fontSize: 11, fontWeight: 700, color: status==='FT'?'#13243b':status==='Live'?'#43a047':'#aaa' }}>{status==='FT'||status==='Live'?score:status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dfe7ef', overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #dfe7ef', ...n, fontSize: 13, fontWeight: 900, color: '#13243b' }}>Standings</div>
              {[['St. Finbarr\'s A',3,3,0,0,'+7',9],['Oliver Plunkett',3,2,0,1,'+3',6],['Naomh Pádraig',3,1,1,1,'+1',4],['Swords Celtic',3,1,0,2,'-2',3]].map(([nm,p,w,d2,l,gd,pts]) => (
                <div key={String(nm)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderBottom: '1px solid #f0f4f8', fontSize: 10 }}>
                  <span style={{ ...d, color: '#13243b', fontWeight: nm==="St. Finbarr's A" ? 700 : 500, flex: 1 }}>{nm}</span>
                  <span style={{ ...n, color: '#627187', width: 12, textAlign: 'center' }}>{p}</span>
                  <span style={{ ...n, color: '#627187', width: 12, textAlign: 'center' }}>{w}</span>
                  <span style={{ ...n, color: '#627187', width: 12, textAlign: 'center' }}>{d2}</span>
                  <span style={{ ...n, fontWeight: 800, color: '#e64a19', width: 20, textAlign: 'right' }}>{pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Connect App Mockup ────────────────────────────────────────────────────────
function ConnectAppMockup() {
  const d = { fontFamily: "'Work Sans', system-ui, sans-serif" }
  const n = { fontFamily: "'Nunito', system-ui, sans-serif" }
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f6f9fc', fontSize: 11, overflow: 'hidden' }}>
      <AppSidebar accent="#fbc02d" activeId="announcements"
        items={[{id:'announcements',icon:'📢',label:'Announcements'},{id:'channels',icon:'💬',label:'Channels'},{id:'broadcast',icon:'📡',label:'Broadcast'},{id:'members',icon:'👥',label:'Members'},{id:'analytics',icon:'◐',label:'Analytics'},{id:'settings',icon:'⚙️',label:'Settings'}]}
        user={{ initials:'CA', name:'Club Admin', role:'Administrator' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dfe7ef', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...n, fontSize: 18, fontWeight: 900, color: '#13243b', letterSpacing: '-0.03em' }}>Announcements</div>
            <div style={{ ...d, fontSize: 10, color: '#627187' }}>Sent to all 156 members</div>
          </div>
          <div style={{ height: 30, padding: '0 14px', background: '#fbc02d', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', ...d, fontSize: 11, fontWeight: 700 }}>+ New Announcement</div>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Channel list */}
          <div style={{ width: 180, borderRight: '1px solid #dfe7ef', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #dfe7ef', ...d, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#627187' }}>Channels</div>
            {[['📢','All Members',156,2],['📋','Coaches',8,1],['👨‍👩‍👦','U12 Parents',32,0],['⚽','U12 Players',16,3],['🙋','Volunteers',24,0],['🏛️','Committee',12,0]].map(([ic,nm,ct,un]) => (
              <div key={String(nm)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid #f6f9fc', background: nm==='All Members' ? '#fffde7' : 'transparent', borderLeft: nm==='All Members' ? '2px solid #fbc02d' : '2px solid transparent' }}>
                <span style={{ fontSize: 14 }}>{ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...d, fontSize: 11, fontWeight: nm==='All Members' ? 700 : 500, color: '#13243b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm}</div>
                  <div style={{ ...d, fontSize: 9, color: '#627187' }}>{ct} members</div>
                </div>
                {Number(un) > 0 && <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fbc02d', color: '#fff', ...d, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{un}</div>}
              </div>
            ))}
          </div>
          {/* Announcements feed */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
            {[
              { urgent:true, title:'Training CANCELLED — Sat 9 Aug', body:"Due to waterlogged pitches, Saturday's training is cancelled. Next session Thu 7 Aug, 16:30.", author:'Club Admin', time:'2h ago', reacts:18 },
              { urgent:false, title:'U12 Blitz — Volunteers Needed!', body:'We need 4 volunteers for the Swords U12 Blitz on Sat 9 Aug. If you can help please let us know!', author:'Club Admin', time:'1d ago', reacts:6 },
              { urgent:false, title:'New Training Video Library Available', body:'Coach Murphy has uploaded 12 new drill videos to the Coach platform. All coaches now have access.', author:'Tech Team', time:'2d ago', reacts:11 },
            ].map(({ urgent, title, body: bdy, author, time, reacts }) => (
              <div key={title} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${urgent ? '#fbc02d60' : '#dfe7ef'}`, padding: '14px 16px', marginBottom: 10, borderLeft: urgent ? '4px solid #fbc02d' : '1px solid #dfe7ef' }}>
                {urgent && <div style={{ display: 'inline-block', background: '#fff9c4', border: '1px solid #fbc02d60', borderRadius: 6, padding: '2px 8px', ...d, fontSize: 9, fontWeight: 800, color: '#f57f17', marginBottom: 6 }}>📌 URGENT</div>}
                <div style={{ ...n, fontSize: 13, fontWeight: 900, color: '#13243b', marginBottom: 5 }}>{title}</div>
                <div style={{ ...d, fontSize: 11, color: '#627187', lineHeight: 1.5, marginBottom: 8 }}>{bdy}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ ...d, fontSize: 9, color: '#aaa' }}>{author} · {time}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ ...d, fontSize: 10, color: '#627187' }}>👍 {reacts}</span>
                    <span style={{ ...d, fontSize: 10, color: '#627187' }}>💬 View</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Suite card layout ─────────────────────────────────────────────────────────

interface SuiteProduct {
  key: string
  name: string
  tagline: string
  color: string
  shadow: string
  bg: string
  device: 'laptop' | 'phone'
  Mockup: () => React.JSX.Element
}

const SUITE_PRODUCTS: SuiteProduct[] = [
  { key:'club',     name:'Spraoi Club',      tagline:'Club admin & governance',       color:'#d32f2f', shadow:'0 10px 30px rgba(211,47,47,.22)',   bg:'#fff5f5', device:'laptop', Mockup: ClubAppMockup },
  { key:'coach',    name:'Spraoi Coach',     tagline:'Player development platform',   color:'#8e24aa', shadow:'0 10px 30px rgba(142,36,170,.22)',   bg:'#fdf5ff', device:'laptop', Mockup: CoachAppMockup },
  { key:'journey',  name:'Spraoi Journey',   tagline:'Gamified player world',         color:'#29b6f6', shadow:'0 10px 30px rgba(41,182,246,.22)',   bg:'#f0faff', device:'phone',  Mockup: JourneyMobileMockup },
  { key:'challenge',name:'Spraoi Challenge', tagline:'Healthy habits & streaks',      color:'#43a047', shadow:'0 10px 30px rgba(67,160,71,.22)',    bg:'#f3fff4', device:'phone',  Mockup: ChallengeMobileMockup },
  { key:'blitz',    name:'Spraoi Blitz',     tagline:'Tournament organiser',          color:'#e64a19', shadow:'0 10px 30px rgba(230,74,25,.22)',    bg:'#fff4ef', device:'laptop', Mockup: BlitzAppMockup },
  { key:'connect',  name:'Spraoi Connect',   tagline:'Club communications hub',       color:'#fbc02d', shadow:'0 10px 30px rgba(251,192,45,.22)',   bg:'#fffde7', device:'laptop', Mockup: ConnectAppMockup },
]

// Faithful scaled-down laptop frame
function FramedLaptop({ Mockup }: { Mockup: () => React.JSX.Element }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', background: '#191f2e', borderRadius: '10px 10px 0 0', padding: '10px 10px 0', boxShadow: '0 16px 48px rgba(0,0,0,.3)' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#333a4d', margin: '0 auto 7px' }} />
        <div style={{ borderRadius: '6px 6px 0 0', overflow: 'hidden', position: 'relative', aspectRatio: '16/10' }}>
          {/* Scale content from 880px down to card width */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <div style={{ transform: 'scale(0.36)', transformOrigin: 'top left', width: '278%', height: '278%', pointerEvents: 'none' }}>
              <Mockup />
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: '107%', height: 5, background: '#111825', borderRadius: '0 0 3px 3px' }} />
      <div style={{ width: '80%', height: 4, background: '#0e1320', borderRadius: '0 0 5px 5px' }} />
    </div>
  )
}

// Faithful scaled-down phone frame
function FramedPhone({ Mockup }: { Mockup: () => React.JSX.Element }) {
  return (
    <div style={{ width: 110, height: 200, background: '#191f2e', borderRadius: 20, border: '4px solid #191f2e', overflow: 'hidden', position: 'relative', margin: '0 auto', boxShadow: '0 16px 40px rgba(0,0,0,.3)' }}>
      <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)', width: 28, height: 6, background: '#191f2e', borderRadius: 4, zIndex: 10 }} />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ transform: 'scale(0.265)', transformOrigin: 'top left', width: '377%', height: '377%', pointerEvents: 'none' }}>
          <Mockup />
        </div>
      </div>
    </div>
  )
}

function ProductSuiteSection() {
  return (
    <section id="suite" style={{ background: C.soft, padding: '96px 0 80px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.line}`, borderRadius: 24, padding: '6px 16px', marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
            <span style={{ ...body, fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: '.06em', textTransform: 'uppercase' }}>The Full Platform</span>
          </div>
          <h2 style={{ ...display, fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: C.navy, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Six apps. One platform.
          </h2>
          <p style={{ ...body, fontSize: 18, color: C.muted, maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
            Every tool a GAA club needs — seamlessly connected and built for how grassroots sport actually works.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="suite-grid">
          {SUITE_PRODUCTS.map(({ key, name, tagline, color, shadow, bg, device, Mockup }) => (
            <a key={key} href={`#${key}`} style={{ textDecoration: 'none', display: 'block', borderRadius: 20, overflow: 'hidden', background: C.white, border: `1.5px solid ${C.line}`, boxShadow: S.card, transition: 'transform .2s ease, box-shadow .2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = shadow }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = S.card }}
            >
              <div style={{ background: bg, padding: device === 'phone' ? '20px 20px 0' : '18px 14px 0', minHeight: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                {device === 'laptop' ? <FramedLaptop Mockup={Mockup} /> : <FramedPhone Mockup={Mockup} />}
              </div>
              <div style={{ padding: '16px 20px 18px', borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ ...display, fontSize: 15, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>{name}</span>
                </div>
                <p style={{ ...body, fontSize: 12, color: C.muted, margin: 0 }}>{tagline}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: C.navy, padding: '52px 0 32px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 32, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L4 10h3v3L4 16h5v5h6v-5h5l-3-3v-3h3L12 3Z" fill="white" /></svg>
              </div>
              <span style={{ ...display, fontSize: 15, fontWeight: 900, color: C.white, letterSpacing: '-0.03em' }}>Spraoi Sports</span>
            </div>
            <p style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 220 }}>
              Growing stronger together. Customisable digital tools built for grassroots clubs.
            </p>
          </div>
          <div>
            <p style={{ ...body, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.35)', marginBottom: 14 }}>Products</p>
            {['Challenge','Blitz','Journey','Coach','Connect','Club'].map(p => (
              <a key={p} href={`#${p.toLowerCase()}`} style={{ display: 'block', ...body, fontSize: 14, color: 'rgba(255,255,255,.5)', textDecoration: 'none', marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}
              >Spraoi {p}</a>
            ))}
          </div>
          <div>
            <p style={{ ...body, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.35)', marginBottom: 14 }}>Company</p>
            {['About','Contact','Privacy Policy'].map(p => (
              <a key={p} href="#request-info" style={{ display: 'block', ...body, fontSize: 14, color: 'rgba(255,255,255,.5)', textDecoration: 'none', marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}
              >{p}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>© {new Date().getFullYear()} Spraoi Sports. All rights reserved.</p>
          <p style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>Growing stronger together.</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Responsive CSS ───────────────────────────────────────────────────────────

const responsiveCSS = `
  @media (max-width: 1050px) {
    .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
    .hero-grid > div:last-child { height: 480px !important; }
    .hero-grid > div:first-child { display: flex; flex-direction: column; align-items: center; }
    .journey-step { grid-template-columns: 1fr !important; }
    .journey-step > div { order: unset !important; }
  }
  @media (max-width: 900px) {
    .suite-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
  @media (max-width: 720px) {
    section { padding: 72px 0 !important; }
    .hide-mobile { display: none !important; }
    .show-mobile { display: flex !important; }
    .hero-grid > div:last-child { height: 400px !important; }
    .suite-grid { grid-template-columns: 1fr !important; }
  }
`

// ─── Marketing Page ───────────────────────────────────────────────────────────

export default function Marketing() {
  return (
    <>
      <style>{responsiveCSS}</style>
      <SiteNav />
      <HeroSection />
      <ProductSuiteSection />
      <PlatformSection />
      <JourneySection />
      <CoachSection />
      <ChallengeSection />
      <BlitzSection />
      <ConnectSection />
      <ClubSection />
      <CustomisationSection />
      <RoadmapSection />
      <ContactSection />
      <Footer />
    </>
  )
}
