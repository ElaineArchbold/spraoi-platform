# Spraoi Platform — Production Monorepo

This is the single source folder for the Spraoi Sports product.

## Main folders

- `apps/admin` — unified Admin shell used for Coach, Academy Admin, Connect, Cup and Club
- `apps/coach`, `apps/academy`, `apps/connect`, `apps/cup`, `apps/club` — module source currently imported/built by `apps/admin`; do not delete yet
- `apps/academy-child` — Academy parent/child app
- `apps/website` — Spraoi Sports marketing website
- `packages/*` — shared packages/content
- `supabase` — database migrations
- `docs` — product/RBAC reference

## Local Admin test

```powershell
cd "$env:USERPROFILE\Downloads\Spraoi-Platform-PROD"
npm install
npm run dev:admin
```

## Production build check

```powershell
npm run build:admin
```

Expected Admin production output: `apps/admin/dist`.

## Vercel Admin project

Use the repository root as the Vercel project root so the Admin build can access all sibling module workspaces.

- Root Directory: repository root / blank
- Install Command: `npm install`
- Build Command: `npm run build:admin`
- Output Directory: `apps/admin/dist`

The current Admin production build creates:

- `/` Admin router
- `/club/`
- `/coach/`
- `/academy/`
- `/cup/`
- `/connect/`

## Git production push

Run `npm run build:admin` successfully before committing and pushing.

### Website dependency note

`apps/website` is intentionally kept outside the npm workspace because it is deployed independently and has its own lightweight `package.json`. This keeps the existing Admin lockfile stable while still keeping the entire product in one folder/repository.
