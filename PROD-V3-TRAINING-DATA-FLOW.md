# PROD v3 — Training allocation data flow

## Club → Coach
- Coach Session Builder now loads active Club facilities into the planned-location field.
- Selected week/day is resolved consistently using the Session Builder week selector.
- Published `weekly_training_allocations` for the selected team/date automatically populate the confirmed time and facility.
- When a published allocation differs from a coach draft, the Session Builder surfaces that the Club allocation differs and applies the confirmed details.
- Saved sessions attach the Club event and confirmed allocation time/location.

## Club → Connect
- Club publishing already creates/updates a `club_events` training event with `source = club_allocation`.
- Connect now treats that event as the parent-communication source of truth.
- Messages includes a `Training details` template and a `Training response reminder` template for the next published training event.
- Templates are pre-filled from the current event date/time/facility, so changed Club allocations flow through without retyping.

No database schema change is required for this pass.
