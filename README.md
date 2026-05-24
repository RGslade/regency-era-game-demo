# Regency Era Game

Regency Era Game is an Expo/React Native text adventure set in early nineteenth-century Britain. Players manage reputation, court favour, family duty, scandal, relationships, and a Crown economy while moving through branching narrative scenes.

This repository is prepared as a public-facing demo for developers and employers. It keeps private service credentials out of source control and uses local fallback story generation when backend services are not configured.

## What It Shows

- React Native and Expo mobile app structure
- Branching game-state management with persisted saves
- AI-assisted story turn integration through Supabase Edge Functions
- Local fallback narrative generation for demos without backend access
- Ad, subscription, and soft-currency flows isolated behind config
- Defensive logging, validation, and recovery paths for external services

## Tech Stack

- Expo SDK 53
- React 19
- React Native 0.79
- AsyncStorage
- Expo Audio
- React Native Google Mobile Ads (Google Admob)
- RevenueCat Purchases
- Supabase Edge Functions, optional

## Quick Start

```bash
npm install
npm start
```

To run on Android:

```bash
npm run android
```

To lint:

```bash
npm run lint
```

## Environment Variables

No keys or secrets are committed to this repository. Create a local `.env` file if you want to connect real services:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=
EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID=
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID=
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID=
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID=
EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID=
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID=
```

Production ad unit IDs, RevenueCat keys, OpenAI settings, and backend service credentials should be supplied by your own backend or CI/CD environment. The checked-in app metadata uses Google sample ad application IDs for demo safety.

## Backend Notes

The app can call Supabase Edge Functions for:

- `app-config`
- `generate-story-turn`
- `crown-wallet`
- `report-ai-outcome`
- `user-settings`

If Supabase is not configured, story generation falls back to local deterministic content so the app remains usable during review.

## Public Repo Hygiene

- `.env`, keystores, Google service files, and ADI registration files are ignored.
- The original EAS project owner and project ID have been removed.
- Live ad application IDs have been replaced with Google sample IDs.
- The app slug, display name, scheme, package name, and native labels use `Regency Era Game`.

## Developer Notes

The main entry point is [App.js](./App.js), with screens in [src/screens](./src/screens) and service boundaries in [src/services](./src/services). Game constants and narrative domain data live under [src/constants](./src/constants), [src/types](./src/types), and [src/data](./src/data).

For employer review, the most relevant files are:

- [src/screens/GameScreen.js](./src/screens/GameScreen.js): core game loop and scene progression
- [src/services/aiStoryService.js](./src/services/aiStoryService.js): backend story orchestration and fallback generation
- [src/services/appConfig.js](./src/services/appConfig.js): public-safe configuration loading
- [src/services/crowns.js](./src/services/crowns.js): currency and subscription wallet logic
