/**
 * Spraoi Sports — Shared Navigation System
 *
 * Three layout modes derived from the website's existing top-nav pattern,
 * evolved into app-shell conventions used in Blitz + Shared Platform repos:
 *   Desktop  ≥1024px  → fixed left sidebar (expanded 240 / collapsed 68)
 *   Tablet   768–1023 → slide-in overlay drawer triggered from top bar
 *   Mobile   <768px   → fixed bottom tab bar (app convention from both repos)
 *
 * Colours: spraoi-sports website CSS variables (source of truth)
 * Icons:   lucide-react (used in both Blitz + Shared Platform)
 * Fonts:   Nunito display / Work Sans body
 */

import {
  useState, useEffect, useRef,
  createContext, useContext,
  type ReactNode,
} from 'react'
import {
  LayoutDashboard, Users, CalendarDays, Trophy,
  MapPin, BarChart3, Settings, HelpCircle,
  Bell, ChevronLeft, ChevronRight,
  Menu, X, LogOut, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavItemId =
  | 'dashboard' | 'players' | 'fixtures' | 'leagues'
  | 'venues' | 'reports' | 'settings' | 'help'

export type ProductId =
  | 'coach' | 'journey' | 'challenge' | 'blitz' | 'connect' | 'club'

export interface NavItem {
  id: NavItemId
  label: string
  icon: React.ElementType
  badge?: number
  group: 'core' | 'manage' | 'system'
}

// ─── Nav registry ─────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard, group: 'core' },
  { id: 'players',   label: 'Players',      icon: Users,           group: 'core', badge: 3 },
  { id: 'fixtures',  label: 'Fixtures',     icon: CalendarDays,    group: 'core' },
  { id: 'leagues',   label: 'Leagues',      icon: Trophy,          group: 'core' },
  { id: 'venues',    label: 'Venues',       icon: MapPin,          group: 'manage' },
  { id: 'reports',   label: 'Reports',      icon: BarChart3,       group: 'manage' },
  { id: 'settings',  label: 'Settings',     icon: Settings,        group: 'system' },
  { id: 'help',      label: 'Help',         icon: HelpCircle,      group: 'system' },
]

// Bottom nav shows only primary 5
const BOTTOM_ITEMS: NavItemId[] = ['dashboard', 'players', 'fixtures', 'leagues', 'settings']

const GROUP_LABELS: Record<string, string> = {
  core: 'Main',
  manage: 'Manage',
  system: 'System',
}

// ─── Product metadata (6-product family) ─────────────────────────────────────

export const PRODUCTS: Record<ProductId, { label: string; color: string; fg: string; description: string }> = {
  coach:     { label: 'Coach',     color: '#0d47a1', fg: '#fff', description: 'Training & development tools' },
  journey:   { label: 'Journey',   color: '#fb8c00', fg: '#fff', description: 'Player pathways & milestones' },
  challenge: { label: 'Challenge', color: '#8e24aa', fg: '#fff', description: 'Goals, badges & competitions' },
  blitz:     { label: 'Blitz',     color: '#e64a19', fg: '#fff', description: 'Match day scoring & results' },
  connect:   { label: 'Connect',   color: '#29b6f6', fg: '#13243b', description: 'Club messaging & comms' },
  club:      { label: 'Club',      color: '#43a047', fg: '#fff', description: 'Club admin & management' },
}

// ─── Nav Context ──────────────────────────────────────────────────────────────

interface NavCtx {
  active: NavItemId
  setActive: (id: NavItemId) => void
  collapsed: boolean
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void
  drawerOpen: boolean
  setDrawerOpen: (v: boolean) => void
}

const NavContext = createContext<NavCtx>({
  active: 'dashboard',
  setActive: () => {},
  collapsed: false,
  setCollapsed: () => {},
  drawerOpen: false,
  setDrawerOpen: () => {},
})

export const useNav = () => useContext(NavContext)

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SpraioLogo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {/* Logomark — green rounded square matching website's footer logo radius (14px) */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: 'var(--ss-green)',
          boxShadow: 'var(--shadow-green)',
        }}
      >
        {/* Simplified tree icon referencing favicon-tree.png from the website */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3L4 10h3v3L4 16h5v5h6v-5h5l-3-3v-3h3L12 3Z" fill="white" fillOpacity=".95" />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <p
            className="text-[15px] font-black leading-none truncate"
            style={{ fontFamily: 'var(--ss-font-display)', letterSpacing: '-0.03em', color: 'var(--foreground)' }}
          >
            Spraoi Sports
          </p>
          <p className="text-[10px] leading-none mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
            Growing stronger together
          </p>
        </div>
      )}
    </div>
  )
}

// ─── User avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 32, showStatus }: { name: string; size?: number; showStatus?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('')
  // Derive colour from name — cycles through brand palette
  const palette = [
    ['#e8f5e9', '#43a047'], // green
    ['#e3f2fd', '#0d47a1'], // blue
    ['#fff3e0', '#fb8c00'], // orange
    ['#f3e5f5', '#8e24aa'], // purple
    ['#e1f5fe', '#29b6f6'], // sky
    ['#fbe9e7', '#e64a19'], // coral
  ]
  const [bg, text] = palette[name.charCodeAt(0) % palette.length]
  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
        style={{ width: size, height: size, background: bg, color: text, fontSize: Math.round(size * 0.35), fontFamily: 'var(--ss-font-display)' }}
        role="img"
        aria-label={name}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className="absolute -bottom-px -right-px rounded-full border-2"
          style={{ width: 10, height: 10, background: 'var(--ss-green)', borderColor: 'var(--card)' }}
        />
      )}
    </div>
  )
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function SidebarItem({ item, rail }: { item: NavItem; rail: boolean }) {
  const { active, setActive, setDrawerOpen } = useNav()
  const isActive = active === item.id
  const Icon = item.icon

  function handleClick() {
    setActive(item.id)
    setDrawerOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      title={rail ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className="group relative flex items-center w-full transition-all focus-visible:outline-none"
      style={{
        height: 38,
        borderRadius: 'var(--ss-radius-md)',
        padding: rail ? '0' : '0 10px',
        justifyContent: rail ? 'center' : 'flex-start',
        gap: rail ? 0 : 10,
        background: isActive ? 'rgba(13,71,161,.08)' : 'transparent',
        color: isActive ? 'var(--ss-blue)' : 'var(--muted-foreground)',
        fontFamily: 'var(--ss-font-body)',
        fontWeight: isActive ? 600 : 500,
        fontSize: 14,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(13,49,87,.04)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Active left strip */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 3, height: 20, background: 'var(--ss-green)' }}
        />
      )}

      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />

      {!rail && (
        <span className="flex-1 text-left truncate">{item.label}</span>
      )}

      {/* Badge */}
      {!rail && item.badge !== undefined && (
        <span
          className="inline-flex items-center justify-center font-bold"
          style={{
            minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 'var(--ss-radius-pill)',
            background: 'var(--ss-green)',
            color: '#fff', fontSize: 10,
          }}
        >
          {item.badge}
        </span>
      )}

      {/* Tooltip in rail mode */}
      {rail && (
        <span
          className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100"
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--ss-radius-sm)',
            background: 'var(--ss-navy)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {item.label}
          {item.badge !== undefined && (
            <span
              className="ml-2 inline-flex items-center justify-center"
              style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 'var(--ss-radius-pill)', background: 'var(--ss-green)', color: '#fff', fontSize: 9, fontWeight: 700 }}
            >
              {item.badge}
            </span>
          )}
        </span>
      )}
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ asDrawer }: { asDrawer?: boolean }) {
  const { collapsed, setCollapsed, setDrawerOpen } = useNav()
  const rail = collapsed && !asDrawer
  const width = rail ? 68 : 240

  const groups = ['core', 'manage', 'system'] as const

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width, minWidth: width,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        transition: 'width var(--transition-slow), min-width var(--transition-slow)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          height: 62,
          padding: rail ? '0' : '0 14px',
          borderBottom: '1px solid var(--border)',
          justifyContent: rail ? 'center' : 'space-between',
        }}
      >
        <SpraioLogo compact={rail} />
        {!asDrawer && (
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden lg:flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{
              width: 28, height: 28,
              borderRadius: 'var(--ss-radius-sm)',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--border)',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        )}
        {asDrawer && (
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center transition-colors"
            style={{ width: 34, height: 34, borderRadius: 'var(--ss-radius-md)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
            aria-label="Close navigation"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ padding: rail ? '12px 8px' : '12px 10px' }}>
        {groups.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group)
          return (
            <div key={group} style={{ marginBottom: 18 }}>
              {!rail && (
                <p
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--muted-foreground)',
                    padding: '0 10px', marginBottom: 4, opacity: .6,
                    fontFamily: 'var(--ss-font-body)',
                  }}
                >
                  {GROUP_LABELS[group]}
                </p>
              )}
              {rail && group !== 'core' && (
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 10px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: rail ? 'center' : 'stretch' }}>
                {items.map(item => (
                  <SidebarItem key={item.id} item={item} rail={rail} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: rail ? '10px 8px' : '10px' }}>
        {rail ? (
          <button
            style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
            aria-label="Sinéad Murphy"
            title="Sinéad Murphy"
          >
            <UserAvatar name="Sinéad Murphy" size={36} showStatus />
          </button>
        ) : (
          <button
            className="flex items-center gap-2.5 w-full transition-colors group"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--ss-radius-md)',
              background: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <UserAvatar name="Sinéad Murphy" size={34} showStatus />
            <div className="flex-1 text-left min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--ss-font-display)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Sinéad Murphy
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.2, marginTop: 2 }}>
                Club Administrator
              </p>
            </div>
            <LogOut size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── Top bar (mobile + tablet) ────────────────────────────────────────────────

export function TopBar() {
  const { drawerOpen, setDrawerOpen } = useNav()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 lg:hidden"
      style={{
        height: 62,
        padding: '0 16px',
        background: 'rgba(255,250,242,.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Hamburger — tablet only (hidden on mobile where bottom nav is primary) */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="hidden md:flex items-center justify-center transition-colors flex-shrink-0"
        style={{
          width: 38, height: 38,
          borderRadius: 'var(--ss-radius-md)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
        aria-label="Toggle navigation"
        aria-expanded={drawerOpen}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {drawerOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      {/* Logo — centred on mobile, left on tablet */}
      <div className="flex-1 flex md:justify-start justify-center">
        <SpraioLogo />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="relative flex items-center justify-center transition-colors"
          style={{
            width: 38, height: 38,
            borderRadius: 'var(--ss-radius-md)',
            color: 'var(--muted-foreground)',
          }}
          aria-label="Notifications"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell size={18} />
          {/* Notification dot */}
          <span
            className="absolute"
            style={{ top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--ss-coral)', border: '2px solid var(--background)' }}
          />
        </button>
        <UserAvatar name="Sinéad Murphy" size={34} showStatus />
      </div>
    </header>
  )
}

// ─── Tablet overlay drawer ────────────────────────────────────────────────────

export function TabletDrawer() {
  const { drawerOpen, setDrawerOpen } = useNav()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!drawerOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [drawerOpen, setDrawerOpen])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className="fixed inset-0 z-40 hidden md:block lg:hidden"
        style={{
          background: 'rgba(11,37,69,.4)',
          backdropFilter: 'blur(2px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity var(--transition-slow)',
        }}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        ref={ref}
        className="fixed top-0 left-0 h-full z-50 hidden md:block lg:hidden"
        style={{
          width: 260,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-slow)',
          boxShadow: drawerOpen ? 'var(--shadow-xl)' : 'none',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <Sidebar asDrawer />
      </div>
    </>
  )
}

// ─── Bottom navigation (mobile) ───────────────────────────────────────────────

export function BottomNav() {
  const { active, setActive } = useNav()

  const items = BOTTOM_ITEMS
    .map(id => NAV_ITEMS.find(n => n.id === id)!)
    .filter(Boolean)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
      style={{
        background: 'rgba(255,250,242,.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 16px rgba(13,49,87,.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Primary navigation"
    >
      <div style={{ display: 'flex', height: 62 }}>
        {items.map(item => {
          const isActive = active === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="relative flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors"
              style={{ color: isActive ? 'var(--ss-navy)' : 'var(--muted-foreground)' }}
            >
              {/* Active pill background */}
              <span
                className="absolute"
                style={{
                  top: 10, left: '50%', transform: 'translateX(-50%)',
                  width: 44, height: 30,
                  borderRadius: 'var(--ss-radius-md)',
                  background: isActive ? 'rgba(13,71,161,.09)' : 'transparent',
                  transition: 'background var(--transition)',
                }}
              />
              <span className="relative z-10" style={{ color: isActive ? 'var(--ss-blue)' : 'inherit' }}>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span
                className="relative z-10"
                style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, fontFamily: 'var(--ss-font-body)', lineHeight: 1 }}
              >
                {item.label}
              </span>
              {/* Badge */}
              {item.badge !== undefined && (
                <span
                  className="absolute"
                  style={{
                    top: 8, left: 'calc(50% + 6px)',
                    minWidth: 14, height: 14, padding: '0 3px',
                    borderRadius: 'var(--ss-radius-pill)',
                    background: 'var(--ss-green)',
                    color: '#fff', fontSize: 8, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid var(--background)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<NavItemId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <NavContext.Provider value={{ active, setActive, collapsed, setCollapsed, drawerOpen, setDrawerOpen }}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>
        {/* Desktop sidebar — hidden on tablet/mobile */}
        <div className="hidden lg:flex flex-col flex-shrink-0 h-full">
          <Sidebar />
        </div>

        {/* Tablet drawer */}
        <TabletDrawer />

        {/* Mobile/tablet top bar */}
        <TopBar />

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto min-w-0"
          style={{
            paddingTop: 62,         /* TopBar height on mobile/tablet */
            paddingBottom: 62,      /* BottomNav height on mobile */
          }}
          id="main-content"
        >
          <style>{`@media(min-width:1024px){#main-content{padding-top:0;padding-bottom:0}}`}</style>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </NavContext.Provider>
  )
}

// ─── External link component (used in sidebar footer) ────────────────────────

export { ExternalLink }
