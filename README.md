# Regency Era Game

Regency Era Game is a mobile interactive-fiction adventure set in early nineteenth-century Britain. Each playthrough combines branching story turns, recurring characters, relationship changes, social choices, and a Crown-based game economy.

## Features

- Branching Regency story scenes with local story content and optional AI-generated turns.
- Deterministic local story fallback when the backend is unavailable.
- Persistent story progress, relationships, settings, scene memory, and generated characters.
- Themed locations including a modest home, market square, estates, gardens, libraries, and the royal court.
- Animated manuscript presentation with typewriter narration, choice history, sound cues, and haptic feedback.
- Relationship ledger with score-based labels and contextual interactions.
- Crown balance, rewarded-ad rewards, subscriptions, and Crown top-ups.
- Local Supabase database schema and Edge Functions for story generation, wallet state, settings, and outcome reports.

## Technology

- Expo SDK 53
- React Native 0.79 and React 19
- JavaScript with TypeScript checking
- Expo Audio and Hermes
- AsyncStorage for local persistence
- Supabase migrations and Edge Functions
- Google Mobile Ads and RevenueCat integrations

## Project layout

```text
App.js                         application lifecycle and screen routing
app/index.js                   Expo entry point
app.json                       application metadata and native plugins
eas.json                       local/cloud build profiles
android/                       checked-in Android project
assets/                        icon, sounds, and fonts
src/components/                reusable presentation components
src/constants/                 colours and game rules
src/data/                      story scenes
src/screens/                   game, relationships, settings, and Crowns screens
src/services/                  storage, story, wallet, configuration, and logging
src/styles/                    shared React Native styles
src/types/                     characters, settings, scenarios, and domain data
supabase/migrations/           database schema SQL
supabase/seed.sql              local seed data
supabase/functions/            backend function source
```

## Run locally

Install Node.js and npm, then install the dependencies:

```bash
npm install
npm start
```

For a local Android phone or emulator with the checked-in native project:

```bash
npm run android
```

For a physical phone, keep the phone and development computer on the same network and use the connection mode shown by Expo. Android Studio and Java 17 or newer are required for native Android builds. Local development uses the package and application identifiers in `app.json`; no account-specific build configuration is needed.

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
```

## Local Supabase backend

The complete database setup is under `supabase/`:

- `supabase/migrations/20260525000000_initial_schema.sql` creates the application tables, indexes, triggers, and row-level security configuration.
- `supabase/seed.sql` creates the initial local installation and starting Crown balance.
- `supabase/config.toml` configures the local API and database ports and loads the seed file during reset.

With the Supabase CLI installed:

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env
```

Copy `supabase/.env.example` to `supabase/.env` and provide the server-side values needed by the functions. The local CLI prints the API URL and public key. Put those values in the app environment file:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-public-key>
```

The app can start without a Supabase connection. In that mode, story generation uses local content and local wallet/settings persistence. When the local backend is running, the app can use the checked-in Edge Function contracts.

## Backend functions

- `app-config` loads runtime configuration.
- `generate-story-turn` validates story input, creates a story turn, and records its result.
- `crown-wallet` loads wallet state and records rewarded-ad grants.
- `report-ai-outcome` stores structured story feedback.
- `user-settings` saves and loads settings for an installation.
- `revenuecat-webhook` records purchase events and applies configured grants.

Keep server-side keys in the Supabase environment, never in the mobile JavaScript bundle. The checked-in environment examples contain placeholders only.

## Development notes

The root `App.js` provides shared navigation, settings, wallet state, ad state, and notifications through `AppContext`. Screens own their presentation and interaction state. Story and backend logic stays in `src/services/`, while static story/domain data remains in `src/data/` and `src/types/`.

When changing native dependencies or `app.json`, review the generated Android project and reinstall the development build on the phone. JavaScript checks alone do not validate native runtime behavior.
