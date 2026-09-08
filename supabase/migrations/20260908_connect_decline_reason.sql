alter table public.connect_event_recipients
  add column if not exists require_decline_reason boolean not null default false;

comment on column public.connect_event_recipients.require_decline_reason is
  'When true, a parent must provide a reason when declining availability for this event invite.';
