# Spraoi Sports Kiro Library v1

This pack gives Kiro one consistent, versioned library and card-generation system.

## Included

- **39** controlled skill records
- **182** coach activity records from the uploaded GAA mirror
- **39** child challenge records
- **182** generated coach-card HTML files
- **39** U7–U12 child-card HTML files using the approved animal theme
- **39** U13+ child-card HTML files using a mature no-cartoon treatment
- Approved Spraoi full logo and icon
- Brand tokens, generator configuration and reusable templates
- Source URLs and source diagram references for every activity

## Important diagram rule

The original diagrams are source references only. Kiro should create a new Spraoi diagram using:
1. `source_diagram_asset`
2. `diagram_description`
3. simple neutral boy/girl figures
4. the approved Spraoi diagram colours and arrow conventions

The new diagram must match the source organisation and movement, without copying source branding.

## Content status

All records are structured and importable, but remain `draft_review_required`.
Source pages frequently do not state exact age bands, duration, player range, coaching points or safety notes.
Those operational values have been inferred conservatively and must be coach-reviewed before publication.

## Main files

- `library/activities.json`
- `library/skills.json`
- `library/challenges.json`
- `config/brand_tokens.json`
- `config/card_generator_config.json`
- `templates/coach_card.html`
- `templates/child_card_u12.html`
- `templates/child_card_u13_plus.html`
