alter table public.availability_responses
  add column if not exists note text;

comment on column public.availability_responses.note is
  'Optional parent-provided reason or note for an availability response.';
