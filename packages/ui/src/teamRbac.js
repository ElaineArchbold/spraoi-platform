// Spraoi team-scoped RBAC foundation.
// Roles are presets. Effective access is the union of assigned roles,
// followed by explicit per-person permission overrides for that team.

export const TEAM_ROLES = Object.freeze({
  LEAD_COACH: "lead_coach",
  TEAM_ADMIN: "team_admin",
  COACH: "coach",
  MENTOR: "mentor",
});

export const TEAM_PERMISSIONS = Object.freeze({
  SCHEDULE_VIEW: "schedule.view",
  PLAYERS_VIEW: "players.view",
  SESSIONS_CREATE: "sessions.create",
  SESSIONS_EDIT: "sessions.edit",
  ATTENDANCE_MARK: "attendance.mark",
  ATTENDANCE_VIEW_TOTALS: "attendance.view_totals",
  AVAILABILITY_VIEW_TEAM: "availability.view_team",
  AVAILABILITY_MANAGE_TEAM: "availability.manage_team",
  EVENTS_CREATE: "events.create",
  EVENTS_EDIT: "events.edit",
  MESSAGES_SEND: "messages.send",
  ANNOUNCEMENTS_SEND: "announcements.send",
  REMINDERS_SEND: "reminders.send",
  SUBGROUPS_MANAGE: "subgroups.manage",
  MEMBERS_MANAGE: "members.manage",
  COACH_CONTENT_MANAGE: "coach_content.manage",
  ACADEMY_PUBLISH: "academy.publish",
  TEAM_PERMISSIONS_MANAGE: "team_permissions.manage",
  CLUB_PITCH_ALLOCATIONS_VIEW: "club.pitch_allocations.view",
  CLUB_CONTACTS_VIEW: "club.contacts.view",
});

const P = TEAM_PERMISSIONS;

export const ROLE_PERMISSION_PRESETS = Object.freeze({
  [TEAM_ROLES.LEAD_COACH]: [
    P.SCHEDULE_VIEW,
    P.PLAYERS_VIEW,
    P.SESSIONS_CREATE,
    P.SESSIONS_EDIT,
    P.ATTENDANCE_MARK,
    P.ATTENDANCE_VIEW_TOTALS,
    P.AVAILABILITY_VIEW_TEAM,
    P.AVAILABILITY_MANAGE_TEAM,
    P.EVENTS_CREATE,
    P.EVENTS_EDIT,
    P.MESSAGES_SEND,
    P.ANNOUNCEMENTS_SEND,
    P.REMINDERS_SEND,
    P.SUBGROUPS_MANAGE,
    P.MEMBERS_MANAGE,
    P.COACH_CONTENT_MANAGE,
    P.ACADEMY_PUBLISH,
    P.TEAM_PERMISSIONS_MANAGE,
    P.CLUB_PITCH_ALLOCATIONS_VIEW,
    P.CLUB_CONTACTS_VIEW,
  ],
  [TEAM_ROLES.TEAM_ADMIN]: [
    P.SCHEDULE_VIEW,
    P.PLAYERS_VIEW,
    P.ATTENDANCE_MARK,
    P.ATTENDANCE_VIEW_TOTALS,
    P.AVAILABILITY_VIEW_TEAM,
    P.AVAILABILITY_MANAGE_TEAM,
    P.EVENTS_CREATE,
    P.EVENTS_EDIT,
    P.MESSAGES_SEND,
    P.ANNOUNCEMENTS_SEND,
    P.REMINDERS_SEND,
    P.SUBGROUPS_MANAGE,
    P.MEMBERS_MANAGE,
  ],
  [TEAM_ROLES.COACH]: [
    P.SCHEDULE_VIEW,
    P.PLAYERS_VIEW,
    P.SESSIONS_CREATE,
    P.SESSIONS_EDIT,
    P.COACH_CONTENT_MANAGE,
    P.MESSAGES_SEND,
  ],
  [TEAM_ROLES.MENTOR]: [
    P.SCHEDULE_VIEW,
  ],
});

export function normaliseTeamRoles(staff = {}) {
  const roles = Array.isArray(staff.roles) ? staff.roles.filter(Boolean) : [];
  if (roles.length) return [...new Set(roles)];
  return staff.role ? [staff.role] : [];
}

export function effectiveTeamPermissions(staff = {}) {
  const permissions = new Set();
  for (const role of normaliseTeamRoles(staff)) {
    for (const permission of ROLE_PERMISSION_PRESETS[role] || []) permissions.add(permission);
  }

  const overrides = staff.permission_overrides || {};
  for (const [permission, allowed] of Object.entries(overrides)) {
    if (allowed === true) permissions.add(permission);
    if (allowed === false) permissions.delete(permission);
  }
  return permissions;
}

export function hasTeamPermission(staff, permission) {
  return effectiveTeamPermissions(staff).has(permission);
}
