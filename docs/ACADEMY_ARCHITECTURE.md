# Spraoi Academy Architecture

## Two experiences

### Academy Admin
Lives in the shared admin platform (`apps/coach` for now). Coaches and authorised club admins can:
- review skills selected in Coach weekly plans;
- choose or amend linked child practice;
- set XP, instructions, visibility and due dates;
- publish the Academy week;
- manage players and parent access;
- preview the child experience;
- view engagement and completion.

### Academy Child/Parent App
Lives in `apps/academy-child`. Parents receive a team or club link, sign in, and select one of their linked children. The app then loads that child's published Academy content, progress, XP, badges and streaks.

Parents do **not** edit the coaching or Academy weekly plan. They can support completion, switch between linked children, and—if enabled later—submit completion evidence or a note. Only authorised admins publish or edit weekly content.

## Data flow
Coach weekly plan → primary skill IDs → Academy draft → admin review/publish → child app → per-child progress.
