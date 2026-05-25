# Supabase Backend

This directory contains the database migration, seed file, and sample Edge Functions needed to demo the app against any Supabase project.

Install the Supabase CLI before running the commands below.

## Local Run

```bash
cp supabase/.env.example supabase/.env
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env
```

Use the local API URL and anon key printed by `supabase start` in the app `.env`.

## Hosted Project

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set --env-file supabase/.env
npm run supabase:deploy:functions
```

Set these mobile app environment variables after deployment:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

## Functions

- `app-config`: returns public runtime config for model name, RevenueCat SDK keys, and AdMob unit IDs.
- `generate-story-turn`: spends one Crown, calls OpenAI when `OPENAI_API_KEY` is set, saves turn/story audit rows, and returns a valid scene.
- `crown-wallet`: fetches the wallet and grants rewarded-ad Crowns.
- `report-ai-outcome`: stores structured AI quality reports.
- `user-settings`: saves and loads anonymous-user settings.
- `revenuecat-webhook`: records RevenueCat events and applies subscription/top-up Crown grants.

The functions are configured with `verify_jwt = false` in `config.toml` so Expo can call them with either the newer publishable key or the JWT-style anon key. Privileged database writes still happen only server-side through `SUPABASE_SERVICE_ROLE_KEY`.

## Required Secrets

Minimum:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_IOS_API_KEY=
REVENUECAT_ANDROID_API_KEY=
ADMOB_IOS_BANNER_UNIT_ID=
ADMOB_ANDROID_BANNER_UNIT_ID=
ADMOB_IOS_INTERSTITIAL_UNIT_ID=
ADMOB_ANDROID_INTERSTITIAL_UNIT_ID=
ADMOB_IOS_REWARDED_UNIT_ID=
ADMOB_ANDROID_REWARDED_UNIT_ID=
```

Without `OPENAI_API_KEY`, `generate-story-turn` returns a deterministic backend fallback scene so the Supabase integration can still be shown in a demo.
