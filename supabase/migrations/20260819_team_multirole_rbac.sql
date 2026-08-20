-- Spraoi multi-role team RBAC foundation.
-- Backward compatible: legacy team_staff.role remains in place while apps migrate.

alter table if exists public.team_staff
  add column if not exists roles text[] not null default '{}'::text[];

alter table if exists public.team_staff
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb;

alter table if exists public.team_staff
  add column if not exists delegated_until timestamptz;

alter table if exists public.team_staff
  add column if not exists delegated_by uuid references auth.users(id) on delete set null;

-- Seed roles from the current scalar role so existing staff keep their access.
update public.team_staff
set roles = array[role]::text[]
where coalesce(array_length(roles, 1), 0) = 0
  and role is not null
  and role <> '';

-- Keep role values constrained to known team roles for new multi-role assignments.
-- We intentionally do not alter the legacy scalar role check here because older
-- installations may still contain coach_mentor or club-level values.

create index if not exists team_staff_roles_gin_idx
  on public.team_staff using gin (roles);

comment on column public.team_staff.roles is
  'Team-scoped role presets. Supports multiple roles such as lead_coach + team_admin.';

comment on column public.team_staff.permission_overrides is
  'Per-team explicit permission overrides. JSON object keyed by capability, boolean value.';

comment on column public.team_staff.delegated_until is
  'Optional end date for temporary/deputised team access.';

-- NOTE:
-- RLS must be upgraded to evaluate effective capabilities before this is treated
-- as production security. UI hiding alone is not an authorization boundary.
