alter table public.club_events
  drop constraint if exists club_events_event_type_check;

alter table public.club_events
  add constraint club_events_event_type_check
  check (event_type = any (array[
    'training'::text,
    'match'::text,
    'event'::text
  ]));

alter table public.club_events
  add column if not exists event_category text,
  add column if not exists home_away text,
  add column if not exists meet_at timestamptz,
  add column if not exists attendance_required boolean not null default true,
  add column if not exists require_decline_reason boolean not null default false,
  add column if not exists subgroup_keys text[] not null default '{}';

alter table public.club_events
  drop constraint if exists club_events_home_away_check;

alter table public.club_events
  add constraint club_events_home_away_check
  check (
    home_away is null
    or home_away = any (array[
      'home'::text,
      'away'::text,
      'neutral'::text
    ])
  );

alter table public.connect_event_recipients
  add column if not exists require_decline_reason boolean not null default false;

alter table public.connect_event_recipients
  drop constraint if exists connect_event_recipients_player_id_fkey;

alter table public.availability_responses
  drop constraint if exists availability_responses_player_id_fkey;
