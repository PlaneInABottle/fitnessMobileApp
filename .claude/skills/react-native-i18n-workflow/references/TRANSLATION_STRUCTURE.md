# Translation Structure Patterns

This document outlines the organization and formatting of translation files in the Fitness Tracker App.

## Root i18n Configuration

The configuration lives in `app/i18n/index.ts`. It handles:
1. Importing language files.
2. Detecting system locale via `expo-localization`.
3. Initializing `i18next` with `react-i18next`.
4. Handling RTL logic for `react-native`.

## Key Path Conventions

We use a specific format for key paths to support nesting and type safety:

- **Top-level categories**: `common`, `homeScreen`, `profileScreen`.
- **Primary separator**: `:` (e.g., `common:ok`).
- **Nested separator**: `.` (e.g., `homeScreen:emptyState.title`).

## Language File Template

```typescript
// app/i18n/[lang].ts
import { Translations } from "./en"

const [lang]: Translations = {
  common: {
    ok: "...",
    cancel: "...",
    // must match en.ts structure exactly
  },
  // ...
}
export default [lang]
```

## Pluralization Patterns

i18next uses suffixes for pluralization. In our TypeScript-based setup, we often define them explicitly:

```typescript
// en.ts
const en = {
  workouts_one: "{{count}} workout",
  workouts_other: "{{count}} workouts",
}

// usage
t("workouts", { count: 1 }) // "1 workout"
t("workouts", { count: 5 }) // "5 workouts"
```

## Interpolation Patterns

Use double curly braces for dynamic values:

```typescript
// en.ts
const en = {
  deleteConfirmation: "Delete this {{name}}?",
}

// usage
t("deleteConfirmation", { name: "Whiskers" }) // "Delete this Whiskers?"
```

## Best Practices for Translation Files

1. **Alphabetical Order**: Keep keys sorted alphabetically within sections for easier lookup.
2. **Reuse Common Strings**: Use the `common` section for strings like "Save", "Cancel", "Back".
3. **Avoid Logic in Translations**: Keep translations as simple strings or simple interpolations.
4. **Consistency**: Use the same punctuation and casing style across all language files.
5. **No Placeholders**: Never leave English strings in other language files; use empty strings if untranslated.
