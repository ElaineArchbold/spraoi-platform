# Spraoi Platform v2 Starter

This folder preserves the current working admin app while adding the target modular structure for Coach, Academy, Cup, Plus, Connect and Club.

## Apps
- `apps/coach`: shared admin platform containing all admin modules for now.
- `apps/academy-child`: separate child/parent-facing Academy application.
- `apps/cup`, `apps/plus`, `apps/connect`, `apps/club`, `apps/website`: existing product applications, renamed where applicable.

## Start
1. Copy your `.env.local` files from the backup.
2. Run `npm install` at the root.
3. Run `npm run dev:admin`.
4. In another terminal, run `npm run dev:academy-child -- -- --port 5174` or run the app directly from its folder.

Read `docs/ACADEMY_ARCHITECTURE.md` before building the parent/child workflow.
