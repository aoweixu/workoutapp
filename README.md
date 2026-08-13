# Overload

Personal workout log. Offline-first PWA: sets are logged to IndexedDB on the phone instantly, then synced to Supabase (Postgres) in the background whenever there is signal. Seeded with the Push A / Legs / Pull A / Push B / Pull B rotation plus the Everyday accessories.

## How logging works

- Today tab suggests the next day in the rotation. Each exercise shows one plate button per set, pre-filled with the last workout's reps (falls back to the sheet target).
- Tap a plate to log that set. Tap a logged plate to adjust or delete it. "+" logs an extra set.
- Logging a set starts the rest timer (default 120s, per-exercise override in Plan). The gold ring drains around the plate you just racked.
- Isometric holds count seconds instead of reps and have a stopwatch in the edit sheet.
- Screen stays awake during the workout (toggle in Settings).

## Dev

```
npm install
npm run dev        # local dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons from scripts/make-icons.mjs
```

## Supabase setup (one time)

1. Create a free project at supabase.com.
2. SQL Editor: paste and run `supabase/migration.sql`. This creates the five tables, sync indexes, server-side `updated_at` stamping, and row-level security (each user sees only their rows).
3. Project Settings → API: copy the Project URL and the anon public key.
4. In the app: Sync tab → paste URL + anon key → Connect → create an account (email + password), confirm the email, sign in.

The anon key is public by design; RLS is what protects the data. Auth sessions persist on-device, so sign-in is once per device.

The deployed build has the project URL and anon key baked in from `.env` (gitignored) at build time, so a fresh device only needs sign-in. Values pasted in the Sync tab override the baked defaults.

## Sync design

- Every row has a client UUID, `updated_at`, soft-delete flag, and a local `dirty` flag.
- Push: upsert all dirty rows. Pull: everything with `updated_at` greater than the per-table cursor (server-stamped clocks, raw string cursors, so no timezone or precision drift).
- Set logs are append-only in practice, so conflicts are basically impossible; template edits resolve last-write-wins.
- A brand-new device that signs in before logging anything adopts the server plan instead of pushing duplicate seed rows. So on a new phone: install, connect, sign in, then train.
- Sync triggers: app open, back online, app foregrounded, and a few seconds after every local write. Status dot lives on the Sync tab icon.

## Deploy

`npm run deploy` builds with the Pages base path and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves at https://aoweixu.github.io/workoutapp/. Installed phones pick the update up on next launch.

Any static host works: `npm run build`, serve `dist/` (set `BASE_PATH` if not hosted at the domain root). For CI deploys on push, grant the token workflow scope (`gh auth refresh -s workflow`) and add a Pages Actions workflow.

## Install on the phone

Open the deployed URL in Chrome → menu → Add to Home screen. It runs standalone and works offline; updates arrive on next launch after a deploy.

## Backup

Settings → Export backup (JSON) dumps everything; Import restores it. This is independent of Supabase.
