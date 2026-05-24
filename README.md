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

## Developer Notes

The main entry point is [App.js](./App.js), with screens in [src/screens](./src/screens) and service boundaries in [src/services](./src/services). Game constants and narrative domain data live under [src/constants](./src/constants), [src/types](./src/types), and [src/data](./src/data).

For reviews, the most relevant files are:

- [src/screens/GameScreen.js](./src/screens/GameScreen.js): core game loop and scene progression
- [src/services/aiStoryService.js](./src/services/aiStoryService.js): backend story orchestration and fallback generation
- [src/services/appConfig.js](./src/services/appConfig.js): public-safe configuration loading
- [src/services/crowns.js](./src/services/crowns.js): currency and subscription wallet logic
