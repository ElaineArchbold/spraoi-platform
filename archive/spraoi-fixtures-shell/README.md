# Spraoi Fixtures - Event Shell

A white-label blitz/tournament day app for GAA clubs. Clone this, edit `eventConfig.js`, add your crests, and deploy.

## Quick Setup (20 minutes)

1. **Clone this repo**
2. **Edit `eventConfig.js`** - fill in your event name, date, clubs, colors, passwords
3. **Add crest images** to `public/crests/` (PNG, ~200x200px)
4. **Add your logo** as `public/logo.png`
5. **Create a Supabase project** (or use existing) and run the SQL below
6. **Set env vars** in `.env.local`:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
7. **Deploy to Vercel** - connect GitHub repo, add same env vars in Vercel settings

## Supabase Setup

Run this in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON kv_store FOR ALL USING (true) WITH CHECK (true);
```

## How It Works

- All event-specific config is in `eventConfig.js`
- Club crests go in `public/crests/`
- Data (fixtures, scores, orders) is stored in Supabase
- Referee access via secret URL: `yoursite.com/?ref=yourSecret`
- Admin access via the "Admin login" button on the Info page

## On Event Day

1. Admin generates the schedule (Admin > Fixtures > Generate)
2. Share referee link (Admin > Log tab > QR code)
3. Refs scan QR, enter PIN, pick their pitch, enter scores
4. Everyone else sees live scores on Fixtures/Standings tabs

## Customisation

- **Colors**: Edit `colors` in eventConfig.js
- **Match format**: Change `playersPerTeam`, `matchDurationMin`, `pitches`
- **Food ordering**: Set `foodEnabled: false` to disable
- **Motto**: Set `motto: []` to hide it

## Powered by Spraoi Sports
spraoisports.com
