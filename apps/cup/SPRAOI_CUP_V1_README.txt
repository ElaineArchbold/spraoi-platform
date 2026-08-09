SPRAOI CUP V1

This is a drop-in replacement for apps/cup.

What changed in this first migration package:
- Existing Fingallians Blitz participant/event-day experience is preserved.
- Existing fixture, scoring, standings, referee, food, announcement and sponsor functionality remains in App.jsx.
- New src/cupEngine.js contains the reusable tournament engine ready for the next refactor.
- New cup-schema-v2.sql creates the relational Cup event model without deleting the legacy kv_store.
- Browser title/favicon are changed to Spraoi Cup / the Cup icon.

Install:
1. Rename your current apps/cup to cup-BACKUP.
2. Extract this folder and rename it to cup under apps/.
3. Copy your existing apps/cup/.env.local into the new cup folder if you use one.
4. From the platform root run npm install if needed.
5. From apps/cup run npm run dev.

Do NOT delete kv_store yet. The existing participant app still uses it.
Do NOT run cup-schema-v2.sql unless you want to create the new organiser/event tables now; it is additive and safe to keep alongside the old model.
