# PROD v4 — Coach session → Connect parent draft

## Behaviour
- Saving a Coach Session Builder session automatically creates or refreshes an unsent Connect message draft.
- The draft is linked to the session's `club_events` record when a scheduled event exists.
- If Club has published a training allocation, the draft uses the confirmed allocation start/end time and facility.
- If no Club allocation exists yet, Coach can still plan the session and Connect receives a draft with the planned time/location or TBC values.
- Existing unsent auto-drafts are updated instead of duplicated when the session is edited.
- Sent messages are never silently overwritten.

## Parent draft content
The generated draft contains:
- team
- date
- start/end time
- location
- Yes / Maybe / No availability request
- reminder that the audience defaults to the whole team and can be changed to a Connect subgroup
- basic training gear/water reminder

## Connect review/send flow
- Auto-generated drafts are labelled `Auto-created from Coach session` in Connect → Messages.
- A `Review draft` action opens the existing Connect composer.
- Sender can change audience to Whole team, Subgroup, Selected children/parents, No response (when linked to an event), or Whole club where permitted.
- Sending an auto-draft updates that draft to sent instead of creating a second message.
- Existing no-response reminder tooling remains available for the linked training event.

## Safety/product rule
Coach session notes are not copied automatically into parent messages because coaching notes may be internal. The Connect sender can add parent-facing instructions during review.
