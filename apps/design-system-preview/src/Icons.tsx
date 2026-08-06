// Spraoi Sports — Custom Icon Library
// 24×24 viewBox · stroke-based · round caps & joins · configurable size/color/weight

import React from "react"

export type IconProps = {
  size?: number
  color?: string
  strokeWidth?: number
  style?: React.CSSProperties
  className?: string
}

function Ico({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.75,
  style,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

export function IconHome(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M3 10L12 3l9 7v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" />
      <path d="M9 21V12h6v9" />
    </Ico>
  )
}

export function IconDashboard(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Ico>
  )
}

export function IconMenu(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Ico>
  )
}

export function IconX(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Ico>
  )
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M15 18l-6-6 6-6" />
    </Ico>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M9 18l6-6-6-6" />
    </Ico>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M6 9l6 6 6-6" />
    </Ico>
  )
}

export function IconChevronUp(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M18 15l-6-6-6 6" />
    </Ico>
  )
}

export function IconArrowLeft(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Ico>
  )
}

export function IconArrowRight(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Ico>
  )
}

export function IconSettings(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Ico>
  )
}

export function IconUser(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
    </Ico>
  )
}

export function IconUsers(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20a7 7 0 0114 0" />
      <circle cx="17" cy="8" r="3.5" />
      <path d="M17 12.5a7 7 0 014 6.5" />
    </Ico>
  )
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

export function IconPlus(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M12 5v14M5 12h14" />
    </Ico>
  )
}

export function IconMinus(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M5 12h14" />
    </Ico>
  )
}

export function IconEdit(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Ico>
  )
}

export function IconTrash(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Ico>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </Ico>
  )
}

export function IconFilter(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </Ico>
  )
}

export function IconDownload(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </Ico>
  )
}

export function IconUpload(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </Ico>
  )
}

export function IconShare(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.4 13.4l7.2 4.2M15.6 6.4L8.4 10.6" />
    </Ico>
  )
}

export function IconCopy(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </Ico>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M20 6L9 17l-5-5" />
    </Ico>
  )
}

export function IconMoreHorizontal(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Ico>
  )
}

export function IconBell(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </Ico>
  )
}

export function IconStar(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Ico>
  )
}

export function IconStarFilled(p: IconProps) {
  return (
    <Ico {...p} strokeWidth={0}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="currentColor"
      />
    </Ico>
  )
}

// ─── DATA & CONTENT ──────────────────────────────────────────────────────────

export function IconCalendar(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M16 2v4M8 2v4" />
    </Ico>
  )
}

export function IconClock(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2.5" />
    </Ico>
  )
}

export function IconFile(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </Ico>
  )
}

export function IconFolder(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </Ico>
  )
}

export function IconBarChart(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M18 20V10M12 20V4M6 20v-7" />
      <path d="M3 20h18" />
    </Ico>
  )
}

export function IconLineChart(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M3 17l5-6 5 3.5 6-8.5" />
      <path d="M3 20h18" />
      <path d="M3 4v16" />
    </Ico>
  )
}

export function IconTrendUp(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </Ico>
  )
}

export function IconTrophy(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M6 3h12v6a6 6 0 01-12 0V3z" />
      <path d="M6 6H3v3a3 3 0 003 3M18 6h3v3a3 3 0 01-3 3" />
      <path d="M12 15v4M9 19h6" />
    </Ico>
  )
}

export function IconMedal(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 8.5l3.5-6 3.5 6" />
      <path d="M8.5 8.5H6l1.5 3" />
      <path d="M15.5 8.5H18l-1.5 3" />
      <path d="M10 15h4M12 13v4" />
    </Ico>
  )
}

export function IconShield(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Ico>
  )
}

export function IconLock(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </Ico>
  )
}

export function IconReport(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
      <path d="M8 9h2" />
    </Ico>
  )
}

// ─── COMMUNICATION ───────────────────────────────────────────────────────────

export function IconMessageSquare(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </Ico>
  )
}

export function IconMail(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </Ico>
  )
}

export function IconPhone(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </Ico>
  )
}

export function IconMegaphone(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M19 4L8 9H4a2 2 0 00-2 2v2a2 2 0 002 2h4l11 5V4z" />
      <path d="M8 9v6" />
      <path d="M12 18.5c0 1.5-1 3-2.5 3" />
    </Ico>
  )
}

export function IconAlertCircle(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </Ico>
  )
}

export function IconCheckCircle(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </Ico>
  )
}

export function IconInfo(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </Ico>
  )
}

// ─── SPORTS / GAA ─────────────────────────────────────────────────────────────

export function IconBall(p: IconProps) {
  // GAA football — sphere with panel seams
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3.5 8.5l3.5 2M17 13.5l3.5 2M3.5 15.5l3.5-2M17 10.5l3.5-2" />
      <path d="M7 10.5l5 3 5-3M7 13.5l5-3 5 3" />
    </Ico>
  )
}

export function IconSliotar(p: IconProps) {
  // Hurling ball — smaller ridged seams
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 6.5C9 10 9 14 5.5 17.5M18.5 6.5C15 10 15 14 18.5 17.5" />
      <path d="M12 3c-2.5 3-2.5 15 0 18M12 3c2.5 3 2.5 15 0 18" />
    </Ico>
  )
}

export function IconHurley(p: IconProps) {
  // Hurling stick (camán) — angled handle + curved boss
  return (
    <Ico {...p}>
      <path d="M18 4L8 16" />
      <path d="M8 16c-1 0-4.5 1-5 4.5" />
      <path d="M3 20.5c.5-3.5 4-4.5 5-4.5l2.5-3" />
    </Ico>
  )
}

export function IconWhistle(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="9.5" cy="12" r="5.5" />
      <path d="M15 12h6M19 9.5l2 2.5-2 2.5" />
      <path d="M9.5 6.5V4M9.5 17.5V20" />
    </Ico>
  )
}

export function IconPitch(p: IconProps) {
  // GAA pitch top-down view
  return (
    <Ico {...p}>
      <rect x="2" y="5" width="20" height="14" rx="1.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v14M2 12h20" />
      <path d="M2 9h4M2 15h4M18 9h4M18 15h4" />
    </Ico>
  )
}

export function IconStopwatch(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M12 5V3M10 3h4" />
      <path d="M5.45 5.11L4 6.56M18.55 5.11L20 6.56" />
    </Ico>
  )
}

export function IconJersey(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M7.5 3L3 7.5l3 2.5V21h12V10l3-2.5L16.5 3" />
      <path d="M7.5 3C7.5 5.5 9.5 7 12 7s4.5-1.5 4.5-4" />
    </Ico>
  )
}

export function IconClipboard(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="8" y="2" width="8" height="4" rx="1.5" />
      <path d="M16 3h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h2" />
      <path d="M12 11h4M12 15h4M8 11h.01M8 15h.01" />
    </Ico>
  )
}

export function IconFlag(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M4 21V4" />
      <path d="M4 4l16 6-16 6" />
    </Ico>
  )
}

export function IconMapPin(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </Ico>
  )
}

// ─── FINANCE & ADMIN ─────────────────────────────────────────────────────────

export function IconEuro(p: IconProps) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9a5 5 0 100 6" />
      <path d="M7 11h6M7 13h6" />
    </Ico>
  )
}

export function IconCreditCard(p: IconProps) {
  return (
    <Ico {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M7 15h4" />
    </Ico>
  )
}

export function IconBuilding(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4" />
      <path d="M13 12h2v3h-2zM13 18h2v3h-2z" />
    </Ico>
  )
}

export function IconHandshake(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M2 12l5 7h3l4-4h4l4-5" />
      <path d="M22 12l-5-7h-3l-4 4H6l-4 5" />
      <path d="M11 15l3-3" />
    </Ico>
  )
}

export function IconExternalLink(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </Ico>
  )
}

export function IconTag(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </Ico>
  )
}

export function IconLink(p: IconProps) {
  return (
    <Ico {...p}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </Ico>
  )
}

// ─── MODULE ICONS ────────────────────────────────────────────────────────────

export function IconModuleClub(p: IconProps) {
  // Shield with a cross — administration & club management
  return (
    <Ico {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 9v6M9 12h6" />
    </Ico>
  )
}

export function IconModuleCoach(p: IconProps) {
  // Tactics board / clipboard with X and O plays
  return (
    <Ico {...p}>
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 6.5L9 8.5M9 6.5L7 8.5" />
      <circle cx="13.5" cy="7.5" r="1.5" />
      <path d="M8 17v4M16 17v4M5 21h14" />
    </Ico>
  )
}

export function IconModuleJourney(p: IconProps) {
  // Rocket — personal development
  return (
    <Ico {...p}>
      <path d="M12 2c0 0 5 3 5 9s-5 9-5 9-5-3-5-9 5-9 5-9z" />
      <path d="M9 11H6L4 15l2 2 4-2" />
      <path d="M15 11h3l2 4-2 2-4-2" />
      <circle cx="12" cy="11" r="2" />
      <path d="M9 18l3 4 3-4" />
    </Ico>
  )
}

export function IconModuleChallenge(p: IconProps) {
  // Flame — healthy habits & challenges
  return (
    <Ico {...p}>
      <path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5S14 5 14 5s-1.5 2-2.5 3.5C9.5 10.5 8 12 8 15a7 7 0 004 6.3" />
      <path d="M12 22a4 4 0 004-4c0-1.5-.8-2.8-2-3.5" />
      <path d="M12 22c-1.7 0-3-1.5-3-3.5 0-1 .5-2 1.5-2.5" />
    </Ico>
  )
}

export function IconModuleBlitz(p: IconProps) {
  // Lightning bolt — tournament & competitions
  return (
    <Ico {...p}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Ico>
  )
}

export function IconModuleConnect(p: IconProps) {
  // Overlapping speech bubbles — parent/community connection
  return (
    <Ico {...p}>
      <path d="M21 15a2 2 0 01-2 2h-9l-4 4V9a2 2 0 012-2h11a2 2 0 012 2v6z" />
      <path d="M7 9V6a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2h-1" />
    </Ico>
  )
}

// ─── ICON SHOWCASE ───────────────────────────────────────────────────────────
// Export all icons grouped for the showcase component

export const ICON_GROUPS: {
  label: string
  color: string
  icons: { name: string; component: (p: IconProps) => React.JSX.Element }[]
}[] = [
  {
    label: "Navigation",
    color: "#0b2545",
    icons: [
      { name: "Home", component: IconHome },
      { name: "Dashboard", component: IconDashboard },
      { name: "Menu", component: IconMenu },
      { name: "X / Close", component: IconX },
      { name: "Chevron Left", component: IconChevronLeft },
      { name: "Chevron Right", component: IconChevronRight },
      { name: "Chevron Down", component: IconChevronDown },
      { name: "Chevron Up", component: IconChevronUp },
      { name: "Arrow Left", component: IconArrowLeft },
      { name: "Arrow Right", component: IconArrowRight },
      { name: "Settings", component: IconSettings },
      { name: "User", component: IconUser },
      { name: "Users", component: IconUsers },
    ],
  },
  {
    label: "Actions",
    color: "#1565c0",
    icons: [
      { name: "Plus", component: IconPlus },
      { name: "Minus", component: IconMinus },
      { name: "Edit", component: IconEdit },
      { name: "Trash", component: IconTrash },
      { name: "Search", component: IconSearch },
      { name: "Filter", component: IconFilter },
      { name: "Download", component: IconDownload },
      { name: "Upload", component: IconUpload },
      { name: "Share", component: IconShare },
      { name: "Copy", component: IconCopy },
      { name: "Check", component: IconCheck },
      { name: "More", component: IconMoreHorizontal },
      { name: "Bell", component: IconBell },
      { name: "Star", component: IconStar },
      { name: "Star Filled", component: IconStarFilled },
    ],
  },
  {
    label: "Data & Content",
    color: "#6a1b9a",
    icons: [
      { name: "Calendar", component: IconCalendar },
      { name: "Clock", component: IconClock },
      { name: "File", component: IconFile },
      { name: "Folder", component: IconFolder },
      { name: "Bar Chart", component: IconBarChart },
      { name: "Line Chart", component: IconLineChart },
      { name: "Trend Up", component: IconTrendUp },
      { name: "Trophy", component: IconTrophy },
      { name: "Medal", component: IconMedal },
      { name: "Shield", component: IconShield },
      { name: "Lock", component: IconLock },
      { name: "Report", component: IconReport },
    ],
  },
  {
    label: "Communication",
    color: "#00838f",
    icons: [
      { name: "Message", component: IconMessageSquare },
      { name: "Mail", component: IconMail },
      { name: "Phone", component: IconPhone },
      { name: "Megaphone", component: IconMegaphone },
      { name: "Alert", component: IconAlertCircle },
      { name: "Check Circle", component: IconCheckCircle },
      { name: "Info", component: IconInfo },
    ],
  },
  {
    label: "Sports / GAA",
    color: "#2e7d32",
    icons: [
      { name: "Football", component: IconBall },
      { name: "Sliotar", component: IconSliotar },
      { name: "Hurley", component: IconHurley },
      { name: "Whistle", component: IconWhistle },
      { name: "Pitch", component: IconPitch },
      { name: "Stopwatch", component: IconStopwatch },
      { name: "Jersey", component: IconJersey },
      { name: "Clipboard", component: IconClipboard },
      { name: "Flag", component: IconFlag },
      { name: "Map Pin", component: IconMapPin },
    ],
  },
  {
    label: "Finance & Admin",
    color: "#e65100",
    icons: [
      { name: "Euro", component: IconEuro },
      { name: "Credit Card", component: IconCreditCard },
      { name: "Building", component: IconBuilding },
      { name: "Handshake", component: IconHandshake },
      { name: "External Link", component: IconExternalLink },
      { name: "Tag", component: IconTag },
      { name: "Link", component: IconLink },
    ],
  },
  {
    label: "Modules",
    color: "#d32f2f",
    icons: [
      { name: "Club", component: IconModuleClub },
      { name: "Coach", component: IconModuleCoach },
      { name: "Journey", component: IconModuleJourney },
      { name: "Challenge", component: IconModuleChallenge },
      { name: "Blitz", component: IconModuleBlitz },
      { name: "Connect", component: IconModuleConnect },
    ],
  },
]
