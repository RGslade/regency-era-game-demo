# Supabase backend

This directory contains the database migration, seed data, local configuration, and Edge Functions used by the application.

## Local run

Install the Supabase CLI, then run:

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env
```

The database reset applies every file in `migrations/` in order and then loads `seed.sql`, as configured in `config.toml`.

Create the local function environment from the checked-in template:

```bash
cp supabase/.env.example supabase/.env
```

The app reads its public connection values from the project-level environment file:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-public-key>
```

## Schema

`migrations/20260525000000_initial_schema.sql` creates users, settings, story state, Crown wallets and ledger entries, purchase events, AI turn records, and outcome reports. It also adds indexes, update triggers, and row-level security.

`seed.sql` creates a local installation record with an initial Crown balance so the application has a usable starting state after `supabase db reset`.

## Functions

- `app-config` returns runtime configuration.
- `generate-story-turn` validates story requests, writes story state and AI turn records, and returns a valid scene.
- `crown-wallet` loads wallet state and records rewarded-ad grants.
- `report-ai-outcome` stores structured story feedback.
- `user-settings` saves and loads installation settings.
- `revenuecat-webhook` records purchase events and applies configured grants.

Server-side values belong in `supabase/.env` or the function environment. Do not place service keys in the mobile app environment.
