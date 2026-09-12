# Regency Era Game development guidance

## Core goals

- Keep the game a polished interactive, text-based Regency-era adventure.
- Preserve the protagonist, branching narrative, recurring characters, relationships, and location themes.
- Prefer small, focused changes that preserve existing state and data flow.
- Keep `App.js` responsible for lifecycle, shared state, screen routing, and service setup. Screens own screen state and interactions; reusable presentation belongs in `src/components/`; integrations belong in `src/services/`.
- Use `AppContext` for shared app actions and state.

## Story and domain data

- Keep static scenes in `src/data/scenes.js`.
- Keep domain lists in `src/types/`.
- Give new scenes unique IDs, clear choices, valid destinations, and consistent narrative voice.
- Keep relationship scores within the constants defined in `src/constants/game.js`.

## UI and UX

- Preserve the manuscript presentation, location themes, relationship ledger, responsive choice area, and settings controls.
- Keep text-size and font preferences applied to story text.
- Keep loading, retry, and error states visible and actionable.
- Reuse shared styles and components before adding new visual dependencies.

## Expo and native development

- Keep `expo start` and the checked-in Android development workflow working.
- Keep `app.json` as the source of truth for the application identity and native plugins.
- Do not add account-specific build identifiers, signing files, or credentials to source control.
- Use Java 17 or newer for Android builds.
- After native dependency or app configuration changes, review the generated native diff and reinstall the development build.

## Backend and secrets

- Keep server-side keys in the backend environment. Client-exposed variables must contain only public connection values.
- Keep the SQL migration and seed files synchronized with the Edge Function data contracts.
- Keep local fallback behavior usable when optional services are unavailable.

## Quality

- Run lint, typecheck, tests, and `git diff --check` for relevant changes.
- Remove unused imports and functions rather than suppressing warnings.
- Comment only on non-obvious logic, using short comments.
