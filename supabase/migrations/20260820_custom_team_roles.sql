-- Spraoi custom team role definitions.
-- Compatible with the current live user_roles schema (user_email, squad, squad_key, role).
-- RLS is intentionally permissive to authenticated users for this foundation step;
-- tighten to effective capability checks once person/team role assignment is in place.

create table if not exists public.team_role_definitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  role_key text not null,
  label text not null,
  description text,
  permissions text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (club_id, role_key)
);

create index if not exists team_role_definitions_club_idx
  on public.team_role_definitions (club_id, is_active);

alter table public.team_role_definitions enable row level security;

drop policy if exists "team role definitions readable by club users" on public.team_role_definitions;
drop policy if exists "team role definitions managed by club admins" on public.team_role_definitions;
drop policy if exists "team role definitions authenticated read" on public.team_role_definitions;
drop policy if exists "team role definitions authenticated insert" on public.team_role_definitions;
drop policy if exists "team role definitions authenticated update" on public.team_role_definitions;
drop policy if exists "team role definitions authenticated delete" on public.team_role_definitions;

create policy "team role definitions authenticated read"
on public.team_role_definitions
for select to authenticated
using (true);

create policy "team role definitions authenticated insert"
on public.team_role_definitions
for insert to authenticated
with check (true);

create policy "team role definitions authenticated update"
on public.team_role_definitions
for update to authenticated
using (true)
with check (true);

create policy "team role definitions authenticated delete"
on public.team_role_definitions
for delete to authenticated
using (true);

comment on table public.team_role_definitions is
  'Club-defined team role presets such as Lead Mentor or Communications Lead.';
