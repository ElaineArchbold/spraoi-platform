# Fingallians Hurling Blitz App

Mobile-first companion app for the Fingallians U12 Hurling Invitational (22 August 2026).

Sections: Today, Teams, Fixtures, Standings, Food ordering (club mentors), Event info, and a
password-gated Organiser dashboard.

## Stack

- **React + Vite** — front end
- **Turso** (libSQL / SQLite at the edge) — shared data store, reached through a Vercel serverless
  function so the database credentials never reach the browser
- **Vercel** — hosting for both the static site and the `/api/kv` function

## Local development

```bash
npm install
vercel dev
```

`vercel dev` runs the Vite front end and the `/api/kv` function together on one local port. Plain
`npm run dev` will run the front end alone, but food orders / fixtures / standings won't save
because the API route won't be running.

Environment variables needed (see `.env.example`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
For `vercel dev` these can live in a `.env.local` file in the project root, or be pulled from your
Vercel project with `vercel env pull .env.local`.

## Data model

Everything (teams, fixtures, food orders, announcements, sponsors) is stored as JSON blobs in a
single `kv_store` table (`schema.sql`), keyed by name — the same shape the original prototype used.
It's deliberately simple for a one-day event; if this gets reused for other tournaments it'd be
worth splitting into proper relational tables.

## Admin dashboard

Passcode is hardcoded in `src/App.jsx` (`ADMIN_CODE`). Fine for a single low-stakes event day —
swap it out (or add real auth) before reusing this for anything more sensitive.

## Deploying changes

```bash
git add .
git commit -m "your change"
git push
```

Vercel redeploys automatically on push once the GitHub repo is connected.
