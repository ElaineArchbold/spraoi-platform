# Spraoi RBAC — Phase 21 foundation

## Rule
Use **multiple team roles as presets + team-scoped permission overrides**.

A user can simultaneously be:
- Parent of one or more children
- Lead Coach of one team
- Team Admin of another team
- Coach or Mentor elsewhere

## Standard team roles
- Lead Coach
- Team Admin
- Coach
- Mentor

Parent is a household/child relationship, not a team-staff role.
Club Admin / Super Admin remain club/account-level roles.

## Team Admin
Team Admin is the operational/logistics role. It defaults to strong Connect access
without automatically receiving Coach or Academy management.

Default Team Admin capabilities:
- schedule view
- player/member view
- mark/view attendance
- view/manage team availability
- create/edit events
- send messages, announcements and reminders
- manage sub-groups and team membership

No default access to:
- coaching plans/drill management
- Academy publishing
- coaching analytics
- team permission administration
- broad Club administration

## Lead Coach
Lead Coach gets full assigned-team Coach + Academy + Connect management,
plus:
- Team Permissions management
- Club Pitch Allocations (view-only)
- Key Club Contacts (view-only)

## Overrides
Role presets can be overridden per person and per team.
Example:
- Coach Sarah + `attendance.mark = true`
- Team Admin John + `members.manage = false`

## Data
`team_staff.role` remains for compatibility.
New fields:
- `roles text[]`
- `permission_overrides jsonb`
- `delegated_until`
- `delegated_by`

Do not remove the legacy role until all modules and RLS policies are migrated.
