# Spraoi Platform Monorepo

A clean, non-destructive monorepo created from the uploaded Spraoi Sports workspace. Source applications were preserved, while `node_modules`, build outputs and local environment files were removed.

## Applications
- `apps/coach` — existing Spraoi Playbook/Coach app
- `apps/journey` — existing child/parent Journey app
- `apps/blitz` — existing fixtures/blitz app
- `apps/challenge` — selected current Challenge app (`spraoi-fit-real`)
- `apps/club` — existing Club app
- `apps/website` — current static website source
- `apps/connect` — placeholder because no standalone Connect app was present
- `apps/design-system-preview` — Figma Make design-system project

## Shared packages
- `packages/ui` — shared UI starter
- `packages/design-tokens` — module colours and core tokens
- `packages/shared-types` — cross-module TypeScript contracts
- `packages/database` — shared Supabase migration/type home
- `packages/coaching-library` — existing coaching library

## First run on Windows
1. Extract this ZIP to a short path, e.g. `C:\Projects\SpraoiPlatform`.
2. Open that folder in VS Code.
3. Copy `.env.example` to the required app-level `.env.local` files and restore your own Supabase values from your backup. Secrets were intentionally excluded.
4. In the root terminal run `npm install`.
5. Run a single app first, e.g. `npm run dev:coach`.
6. After that works, run `npm run dev` to start all runnable apps.

## Important
This first monorepo version organises the existing code without rewriting imports or database logic. Move shared components gradually so the working apps are not broken all at once.
