import { useState } from 'react'
import Marketing from './Marketing'
import Journey from './Journey'
import Club from './Club'
import Coach from './Coach'
import Challenge from './Challenge'
import Connect from './Connect'

type View = 'marketing' | 'journey' | 'club' | 'coach' | 'challenge' | 'connect'

const NAV_ITEMS: { id: View; label: string; color: string; emoji: string }[] = [
  { id: 'marketing', label: 'Marketing', color: '#0b2545', emoji: '🌐' },
  { id: 'journey',   label: 'Journey',   color: '#0277bd', emoji: '🗺️' },
  { id: 'club',      label: 'Club',      color: '#d32f2f', emoji: '🏟️' },
  { id: 'coach',     label: 'Coach',     color: '#8e24aa', emoji: '📋' },
  { id: 'challenge', label: 'Challenge', color: '#43a047', emoji: '🏆' },
  { id: 'connect',   label: 'Connect',   color: '#fbc02d', emoji: '💬' },
]

export default function App() {
  const [view, setView] = useState<View>('marketing')

  const active = NAV_ITEMS.find(n => n.id === view)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', fontFamily: 'Nunito, sans-serif' }}>
      {/* Dev switcher bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        background: '#0b2545',
        borderBottom: '2px solid #1a3a60',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        <span style={{ color: '#7a9fc0', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', marginRight: 8, textTransform: 'uppercase' }}>
          Spraoi Apps
        </span>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              borderRadius: 6,
              border: view === item.id ? `1.5px solid ${item.color}` : '1.5px solid transparent',
              background: view === item.id ? item.color : 'rgba(255,255,255,0.06)',
              color: view === item.id ? '#fff' : '#9bb8d4',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            <span style={{ fontSize: 13 }}>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* App content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {view === 'marketing'  && <Marketing />}
        {view === 'journey'    && <Journey />}
        {view === 'club'       && <Club />}
        {view === 'coach'      && <Coach />}
        {view === 'challenge'  && <Challenge />}
        {view === 'connect'    && <Connect />}
      </div>
    </div>
  )
}
