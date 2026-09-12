# Backend setup

## Database

From the repository root:

```bash
supabase start
supabase db reset
```

The reset applies the migration in `supabase/migrations/` and then loads `supabase/seed.sql`. This creates the tables used by installation records, story state, settings, Crown wallets, ledger entries, AI turns, purchase events, and outcome reports.

## Edge Functions

Run the local functions with:

```bash
supabase functions serve --env-file supabase/.env
```

The application uses these function routes:

- `app-config`
- `generate-story-turn`
- `crown-wallet`
- `report-ai-outcome`
- `user-settings`
- `revenuecat-webhook`

## Environment boundaries

Project-level app variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-public-key>
```

Function variables belong in `supabase/.env` or the hosted function environment. Keep model-provider keys, service-role keys, webhook secrets, and other privileged values out of the app environment.

## Local behavior

The app can launch without a backend connection. With no configured story service, it uses local story generation and local persistence. When the local functions are running, the app uses the same request and response contracts as the hosted backend.
