# Spraoi Sports Complete Football Library

This package contains all **418** activity pages from the supplied complete football planner scrape.

It is split into 5 Kiro-friendly batches and follows the same JSON library structure as the previous Spraoi Sports hurling library.

## Upload to Kiro

Upload this whole folder or ZIP. Tell Kiro:

> Use `Spraoi_Sports_Football_Library_COMPLETE` as the source of truth for football activities. Read `MASTER_INDEX.json`, then load all `Batch_*/libraries/activities_batch_*.json` and matching source registers.

## Important accuracy note

Titles, source descriptions, organisation instructions, STEP variations, equipment and URLs were extracted from the supplied pages. The GAA pages often do not state exact duration, player range, area dimensions or age bands. Those schema fields contain reviewable defaults rather than source claims.
