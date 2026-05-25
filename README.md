# Regency Era Game

Regency Era Game is an Expo and React Native mobile text adventure set in early nineteenth-century Britain. Players move through AI-assisted branching story turns, manage relationships with recurring characters, spend and earn an in-game Crown currency, and adjust reading/audio preferences for a lightweight narrative game experience.

This repository is a public demo intended for employers and technical reviewers. It shows the mobile client architecture, local persistence, monetization boundaries, AI story orchestration contract, and safe fallback behaviour without exposing private production infrastructure. Production-only secrets, Supabase service-role credentials, OpenAI keys, RevenueCat production keys, and private Edge Function implementations are intentionally excluded.

## Project Purpose

The app is designed for players who enjoy interactive fiction, Regency romance, and short-session mobile storytelling. Its real-world purpose is to make a replayable narrative game where each turn can respond to the player's prior choices while still preserving continuity, character relationships, and commercial constraints such as currency balance and rewarded adverts.

The problem it solves is twofold: it gives players a more dynamic story than a fully static choose-your-own-adventure tree, and it demonstrates how a mobile game can integrate AI-generated content without placing sensitive model keys in the client. When the backend is unavailable, the demo remains reviewable through a local story fallback.

## Key Features

- **Branching Regency story loop**: The main game screen presents story text, choice buttons, animated message reveal, scene history, and game-over flows. This is the core player experience and keeps the game playable in short sessions.
- **AI-assisted story turns with local fallback**: Story turns are requested through a Supabase Edge Function contract when configured. If Supabase credentials are missing or unavailable, `buildLocalAiFallbackScene` generates a deterministic local demo scene so reviewers can run the app without private keys.
- **Relationship system**: The app tracks per-character relationship scores, relationship labels, scene participants, and a separate relationship interaction screen. This makes choices feel consequential and gives players a reason to revisit characters.
- **Crown economy**: Story choices spend Crowns. The wallet separates free, rewarded-ad, subscription, and top-up balances, which keeps commercial flows explicit and easier to audit.
- **Rewarded adverts and banner/interstitial placements**: Google AdMob integration is wired through `react-native-google-mobile-ads`. The public demo uses Google test app IDs in `app.json`, and development builds fall back to the library's built-in `TestIds` constants for banner, interstitial, and rewarded ad units.
- **Subscriptions and purchases**: RevenueCat integration is present for subscriptions, ad removal, purchase restore, and one-time Crown top-ups. Production API keys and store setup are not included in this public demo.
- **Local persistence**: AsyncStorage stores game state, wallet state, anonymous user ID, settings, ads-removed status, currency symbol, and bounded AI outcome reports. This lets the game resume across app launches without requiring authentication.
- **Settings and theming**: Players can toggle sound, store a notification preference, adjust text size, and select a font style. Scene and location themes are driven from local setting metadata.
- **Audio and haptics**: Expo Audio plays UI cues for choices, new games, scene transitions, endings, and purchases. React Native vibration adds lightweight tactile feedback.
- **AI outcome reporting hooks**: Players can report poor AI output from the menu. Reports are stored locally and submitted to the backend when the optional report Edge Function is configured.
- **Defensive logging and validation**: Service modules normalize errors, validate AI scene payloads, sanitize player-name references, and log structured request/response summaries without dumping unbounded game state.

## Technology Stack

- **React Native 0.79 and React 19**: Core mobile UI framework. The project uses functional components, hooks, React Native views, modals, animation APIs, SafeAreaView, ScrollView, TouchableOpacity, and platform-specific runtime checks.
- **Expo SDK 53**: Provides the app runtime, Metro/dev tooling, splash/icon configuration, Hermes JavaScript engine, asset bundling, and EAS build integration. `expo-dev-client` is included for native-development workflows.
- **JavaScript with TypeScript tooling**: The source is currently JavaScript (`.js`) with a TypeScript config and React type packages present for tooling compatibility. This is not a fully TypeScript-typed codebase yet.
- **Expo Audio**: Used for local sound effects in the story loop and Crown shop.
- **AsyncStorage**: Core persistence layer for saves, app settings, wallet state, anonymous identity, and local report queues.
- **Supabase configuration and Edge Function client contract**: `supabase/config.toml` is present for local Supabase setup. The client calls optional Edge Functions named `app-config`, `generate-story-turn`, `crown-wallet`, `report-ai-outcome`, and `user-settings`. The actual private function implementations are not part of this public demo.
- **OpenAI/API integration**: The client does not call OpenAI directly. In production, OpenAI calls belong behind Supabase Edge Functions so model keys remain server-side. The public demo contains the request/validation/fallback client layer only.
- **RevenueCat Purchases**: Integrated through `react-native-purchases` for subscriptions, purchase restoration, entitlements, and Crown top-up products. It is optional for local review and requires private keys/store products to be fully functional.
- **Google AdMob**: Integrated through `react-native-google-mobile-ads` for banner, interstitial, and rewarded ads. Test app IDs are configured in `app.json`; development ad-unit fallbacks use `TestIds.BANNER`, `TestIds.INTERSTITIAL`, and `TestIds.REWARDED`. Environment variables can override those values when needed.
- **Expo Router, TanStack Query, Skia, sensors, and Expo Notifications**: These are not currently installed or used. The app stores a notification preference, but no notification scheduling implementation is present in this public demo.
- **Native Android project**: The `android/` directory is checked in, so Android native builds can be run through Expo prebuild/run workflows and EAS.

## Architecture

```text
.
+-- App.js                    # Root app shell, navigation state, ads, purchases, wallet sync
+-- app/index.js              # Lint path placeholder for Expo
+-- app.json                  # Expo app metadata, plugins, test AdMob app IDs
+-- eas.json                  # EAS development, preview, and production build profiles
+-- android/                  # Generated/native Android project
+-- assets/                   # App icon and WAV sound effects
+-- src/
|   +-- components/           # Reusable UI such as MessageBubble
|   +-- constants/            # Shared colours and game/economy constants
|   +-- data/                 # Local scene data and archived scenes
|   +-- screens/              # Game, settings, relationships, and Crown shop screens
|   +-- services/             # Storage, config, AI/backend, wallet, logging, bridge services
|   +-- styles/               # Central React Native StyleSheet definitions
|   +-- types/                # Domain data: characters, names, places, settings, scenarios
+-- supabase/config.toml       # Local Supabase CLI configuration
```

The app separates screen rendering from service concerns. Screens own user interactions and presentation state; services own persistence, backend calls, wallet rules, configuration, logging, and AI story validation. Constants and domain data are kept outside components so story content, economy values, colours, and setting metadata can evolve without scattering changes through UI code.

State management is intentionally lightweight:

- **Server state** is fetched imperatively through service modules because the current app has a small number of backend touchpoints and does not include TanStack Query.
- **Local UI state** uses React `useState`, `useMemo`, `useCallback`, and `useEffect` inside screens.
- **Persisted state** uses AsyncStorage wrappers in `src/services/storage.js`.
- **Authentication state** is represented by a generated anonymous user ID. Supabase Auth UI is not implemented in this public demo.
- **Purchase state** is derived from RevenueCat customer info, then applied to local wallet/ad-removal state.
- **Game state** lives in `GameScreen` and is persisted after hydration. Story state includes history, relationships, hidden stats, scene characters, generated major characters, memory summaries, and last AI source.

This structure keeps the demo easy to review: game rules are testable in service modules, external integrations are isolated, and UI screens remain focused on mobile interaction flows.

## Backend and API Design

The public client is prepared to use the following Supabase Edge Function endpoints when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are provided:

- `app-config`: returns public-safe runtime configuration such as model name, RevenueCat public SDK keys, and ad-unit IDs.
- `generate-story-turn`: accepts sanitized game state and the selected choice, then returns a validated story scene.
- `crown-wallet`: syncs wallet balances and records rewarded-ad Crown grants.
- `report-ai-outcome`: accepts structured player reports about poor AI output.
- `user-settings`: saves and loads player settings for the anonymous user ID.

AI integration is deliberately backend-mediated. The client builds a compact story payload, removes player-name references from NPC lists, submits the request to the story function, validates the returned scene, corrects impossible location drift, and falls back locally if the backend is not configured. In production, the Edge Function would call OpenAI or another model provider using server-side secrets and would enforce wallet spend rules before returning content.

Private Edge Function source, service-role keys, production app configuration, and model provider secrets are removed from this repository. Without those services, the demo runs in fallback mode: local story generation, local wallet persistence, local settings persistence, and safe test ad configuration.

## Security

- Secrets are excluded from Git through `.gitignore`; real `.env` and `.env.*` files should remain local.
- Public runtime values use `EXPO_PUBLIC_` environment variables because Expo embeds them in the client bundle. Only public or test values should use this prefix.
- Sensitive API keys, OpenAI keys, Supabase service-role credentials, purchase webhooks, and privileged wallet mutations belong on server-side Supabase Edge Functions.
- The client sends only the Supabase anon key to Edge Functions. If JWT verification is enabled, the function must accept a JWT-style anon key; otherwise functions using publishable keys should be deployed with the appropriate public verification settings.
- Production Supabase tables should use Row Level Security and policies that limit each anonymous/authenticated user to their own settings, reports, and wallet rows. This repository includes the client contract and Supabase CLI config, not production database policies.
- The public demo is safe to run without private credentials. Missing backend configuration triggers local fallback behaviour rather than exposing or requiring secrets.

## Running Locally

Prerequisites:

- Node `^22.18.0` and npm `^11.12.1` are declared in `package.json`.
- EAS build profiles currently pin Node `20.19.4` for selected cloud build profiles. For local development, use the package engine versions when possible.
- Android Studio/Xcode are required for native device or simulator builds.

Setup:

```bash
git clone <repository-url>
cd regency-era-game
npm install
cp .env.example .env
npm start
```

Useful commands:

```bash
npm start
npm run android
npm run ios
npm run lint
npm run build:android
```

The app can run without private keys. If Supabase is not configured, story turns use the local fallback scene generator and wallet/settings remain local. RevenueCat purchases require valid SDK keys and store product configuration. AdMob can be reviewed safely because development builds use the built-in Google Mobile Ads test IDs from `react-native-google-mobile-ads`.

### `.env.example`

The repository includes `.env.example`. Values are intentionally blank. In development, blank AdMob env vars are safe because `src/services/appConfig.js` falls back to the built-in `TestIds` constants from `react-native-google-mobile-ads`.

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID=
EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID=
EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID=
```

Optional services for local review:

- **Supabase**: optional unless testing real Edge Function integration.
- **OpenAI/model provider**: production-only and should be called by Edge Functions, not the app.
- **RevenueCat**: optional unless testing purchase products and entitlements.
- **AdMob**: optional; test IDs are sufficient for demo review.

## Testing and Quality

Current quality checks:

- `npm run lint` runs Expo's ESLint configuration.
- Manual integration testing should cover new game start, saved-game hydration, choice selection, relationship interactions, Crown spend/earn flows, settings persistence, ad loading fallback, and RevenueCat unavailable states.
- Backend integration testing should cover each optional Edge Function with missing credentials, invalid payloads, wallet exhaustion, invalid AI scenes, and successful story generation.

No automated unit, component, or E2E test suite is currently included in this public demo.

### Planned testing improvements

- Add Jest tests for wallet accounting, scene validation, storage wrappers, app config validation, and story fallback generation.
- Add React Native Testing Library coverage for GameScreen, SettingsScreen, RelationshipsScreen, MessageBubble, and RemoveAdvertsScreen.
- Add E2E smoke tests for launching the app, starting a story, making a choice, earning local fallback Crowns, and persisting settings.
- Add CI checks for linting, tests, dependency audit, and production build configuration validation.

## Build and Release

Expo/EAS configuration is present in `eas.json`:

- **development**: internal distribution with a development client.
- **preview**: internal distribution for reviewer or QA builds.
- **production**: production build profile with auto-increment enabled.

Android builds can be started with:

```bash
npm run build:android
```

The checked-in Android project supports `npm run android` for local native runs. iOS builds require a macOS environment with Xcode and the appropriate Apple credentials. Production release builds require real bundle identifiers, signing credentials, production AdMob app IDs/ad-unit IDs, RevenueCat products, and backend secrets configured outside Git.

## Screenshots and Demo

Add screenshots or GIFs here when preparing a portfolio submission:

- **Main story screen**: Show the open-book story view, animated text history, location panel, relationship summary, and choice buttons.
- **Relationships ledger**: Show relationship scores and available character interactions.
- **Crowns screen**: Show wallet balance, rewarded advert option, subscription options, Crown Purse top-up, and restore purchases.
- **Settings screen**: Show sound, notification preference, text size, font selection, and access to Crowns.
- **AI report modal**: Show the structured report options for scene or choice quality feedback.

Demo video placeholder: `<add demo video link>`

## Known Limitations

- Private Supabase Edge Function implementations are not included.
- OpenAI/model calls are not made directly by this repository; they are represented by the backend contract and local fallback.
- Production service-role keys, OpenAI keys, RevenueCat production keys, AdMob production IDs, and store credentials are removed.
- Supabase Auth UI is not implemented. The demo uses a generated anonymous user ID for local/backend sync.
- Notification scheduling is not implemented. The settings screen stores a notification preference for future reminder prompts.
- Automated tests are not yet present.
- Some production wallet enforcement would need to happen server-side in the private backend; the public demo includes local fallback logic so review remains possible.
- The app currently uses a simple app-level bridge object to avoid deep prop drilling. It is pragmatic for this demo but could be replaced with a formal provider/context layer as the app grows.

## Roadmap

- Add Jest and React Native Testing Library coverage for services and screens.
- Add E2E smoke tests for core mobile flows.
- Add CI/CD for linting, tests, EAS build validation, and dependency checks.
- Provide a Docker/local Supabase backend profile with sample Edge Functions and seed data for reviewers.
- Improve accessibility: labels, focus order, dynamic type handling, reduced-motion options, and screen reader review.
- Expand offline support with clearer conflict handling between local wallet/settings state and backend state.
- Add richer error recovery for failed AI turns, ad loading, and purchase setup.
- Add performance profiling for long story histories and large relationship ledgers.
- Add privacy-preserving analytics for funnel, retention, AI quality, and monetization events.
- Migrate high-risk service/domain modules to TypeScript for stronger compile-time guarantees.

## For Technical Reviewers

Recommended files to review first:

- `App.js`: Root orchestration for app screen state, AdMob setup, RevenueCat configuration, anonymous identity, wallet hydration, settings sync, and shared banner rendering.
- `src/screens/GameScreen.js`: Core game loop, story history, choice handling, AI turn requests, scene rendering, relationship state, local persistence, audio/haptic feedback, and reporting modal.
- `src/services/aiStoryService.js`: Supabase Edge Function contract, AI request sanitization, scene validation, backend error handling, wallet/report/settings API calls, and local AI fallback.
- `src/services/crowns.js`: Wallet model, daily free Crowns, rewarded-ad caps, subscription grants, and spend order.
- `src/services/appConfig.js`: Public-safe configuration loading, Supabase function URL construction, function auth headers, and development AdMob overrides.
- `src/services/storage.js`: AsyncStorage persistence boundary and error logging.
- `src/screens/RemoveAdvertsScreen.js`: RevenueCat products, entitlements, purchase/restore flows, rewarded ads, and commercial fallback UX.
- `src/screens/RelationshipsScreen.js`: Relationship ledger, weighted interaction options, per-character score updates, and persisted state updates.
- `src/components/MessageBubble.js`: Animated message display and dynamic highlighting of character/place names.

These files show the important engineering decisions: external services are isolated behind service modules, sensitive AI/provider work is kept server-side by design, game state is normalized before rendering, local persistence is explicit, and monetization logic is separated from the story UI.
