-- Spraoi Sports: shared active-team RBAC and parent invitation support
-- Safe to run more than once.

create extension if not exists pgcrypto;

alter table if exists public.coaches
  add column if not exists email text,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists coaches_club_email_unique
  on public.coaches (club_id, lower(email))
  where email is not null;

create table if not exists public.team_staff (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  age_group_id uuid not null references public.age_groups(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('club_admin','lead_coach','coach_mentor')),
  status text not null default 'active' check (status in ('active','inactive','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_staff_team_coach_unique
  on public.team_staff (age_group_id, coach_id);

create index if not exists team_staff_user_idx on public.team_staff (user_id);
create index if not exists team_staff_club_idx on public.team_staff (club_id);
create index if not exists team_staff_age_group_idx on public.team_staff (age_group_id);

create table if not exists public.academy_parent_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  age_group_id uuid not null references public.age_groups(id) on delete cascade,
  parent_name text not null,
  parent_email text not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'ready' check (status in ('ready','sent','accepted','disabled')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academy_parent_invitation_token_unique
  on public.academy_parent_invitations (token);

create unique index if not exists academy_parent_invitation_team_email_unique
  on public.academy_parent_invitations (age_group_id, lower(parent_email));

create table if not exists public.academy_parent_invitation_children (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.academy_parent_invitations(id) on delete cascade,
  player_id uuid,
  child_name text not null,
  created_at timestamptz not null default now()
);

-- PostgreSQL expression uniqueness must be an index, not a table UNIQUE constraint.
create unique index if not exists academy_invitation_child_name_unique
  on public.academy_parent_invitation_children (invitation_id, lower(child_name));

alter table public.team_staff enable row level security;
alter table public.academy_parent_invitations enable row level security;
alter table public.academy_parent_invitation_children enable row level security;

drop policy if exists "Authenticated users can read team staff" on public.team_staff;
create policy "Authenticated users can read team staff"
  on public.team_staff for select to authenticated using (true);

drop policy if exists "Authenticated users can manage team staff" on public.team_staff;
create policy "Authenticated users can manage team staff"
  on public.team_staff for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage academy invitations" on public.academy_parent_invitations;
create policy "Authenticated users can manage academy invitations"
  on public.academy_parent_invitations for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage invitation children" on public.academy_parent_invitation_children;
create policy "Authenticated users can manage invitation children"
  on public.academy_parent_invitation_children for all to authenticated using (true) with check (true);
