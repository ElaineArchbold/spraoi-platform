create table if not exists public.availability_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.club_events(id) on delete cascade,
  player_id uuid not null references public.journey_players(id) on delete cascade,
  parent_user_id uuid not null,
  response text not null check (response in ('yes','no','maybe')),
  note text,
  responded_at timestamptz not null default now(),
  unique (event_id, player_id, parent_user_id)
);

alter table public.availability_responses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='availability_responses'
      and policyname='availability_responses_authenticated'
  ) then
    create policy availability_responses_authenticated
      on public.availability_responses
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
