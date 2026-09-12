# Application architecture

## Frontend

- `App.js` owns lifecycle initialization, screen routing, shared settings, wallet state, ad state, and app-level notifications.
- `src/context/AppContext.js` provides shared navigation and app actions to screens.
- `src/screens/GameScreen.js` owns story state, scene rendering, choices, typing, recovery, relationships, and story feedback.
- `src/screens/RelationshipsScreen.js` owns the relationship ledger and contextual interactions.
- `src/screens/SettingsScreen.js` owns local display preferences.
- `src/screens/RemoveAdvertsScreen.js` owns Crown balance and purchase-related controls.
- `src/services/` contains persistence, configuration, story generation, wallet rules, and logging.
- `src/styles/appStyles.js` contains shared visual treatment for the manuscript, panels, controls, modals, and settings.

## Story state

Game state is persisted through `src/services/storage.js`. Saved state includes the player profile, story history, current choices, locations, relationships, recurring characters, memory summaries, hidden story stats, and the latest story source. State normalization must preserve older saved-state shapes.

Story turns are validated before they update the screen. The local story path remains available when the backend is not configured. Player-name references are filtered from backend story payloads and scene character lists.

## Backend boundary

The mobile app calls the configured Edge Functions through `src/services/appConfig.js` and `src/services/aiStoryService.js`. The backend owns privileged database writes, story audit records, wallet synchronization, settings synchronization, and outcome reports. The mobile client never contains server-side keys.

The database contract is defined by `supabase/migrations/20260525000000_initial_schema.sql` and `supabase/seed.sql`. Changes to tables or payloads should update the migration, function code, and client service together.

## Native boundary

The Android project is checked in for local development. Native code configures the React Native host and generated Expo modules; it does not own story generation, persistence, or backend calls. JavaScript remains the owner of game state and narrative behavior.
