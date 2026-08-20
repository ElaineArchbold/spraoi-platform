# Spraoi Team Roles & Permissions Matrix

This overlay adds club-defined team role presets to the current consolidated Spraoi-PROD-v4 working tree.

## What changes
- Club > Roles & Permissions now shows the agreed team capability matrix.
- System presets remain: Lead Coach, Team Admin, Coach, Mentor.
- Super Admin can create additional club roles, e.g. Lead Mentor, Fixtures Coordinator, Communications Lead.
- Custom roles store a permission list in `team_role_definitions`.
- `teamRbac.js` can calculate effective permissions using static system presets plus custom presets.
- Parent remains a child/household relationship, not a team staff role.

## Database
Run `supabase/migrations/20260820_custom_team_roles.sql` in Supabase before testing Add Role.

## Next step
Add multi-role person/team assignment UI and explicit per-person/team permission overrides, then create the two test users.
