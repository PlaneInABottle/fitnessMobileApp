# i18n Best Practices

This document outlines the workflow and conventions for managing internationalization in the Fitness Tracker App.

## Naming Conventions

- **Keys**: Use camelCase for keys (e.g., `headerTitle`).
- **Sections**: Use camelCase for top-level sections (e.g., `captureScreen`).
- **Clarity**: Key names should be descriptive of their location or function (e.g., `submitButtonLabel`).

## Workflow Steps for Adding New Text

### 1. Add to `en.ts`
Always start by adding the string to the source English file.

```typescript
// app/i18n/en.ts
const en = {
  // ...
  newFeature: {
    title: "Awesome Feature",
  }
}
```

### 2. Update Other Languages
Add the same key to all other language files (`ja.ts`, `ko.ts`, etc.) to avoid missing translation warnings. If you don't have the translation yet, use the English string as a placeholder.

### 3. Use in Component
Use the `tx` prop where possible, or the `translate` helper.

```tsx
// Using tx prop
<Text tx="newFeature:title" />

// Using translate helper
const title = translate("newFeature:title")
```

## RTL (Right-to-Left) Support

The app detects RTL languages (like Arabic) and adjusts the layout automatically.

- Use flexbox properties that respect direction (e.g., `alignItems: 'flex-start'` instead of `left`).
- In components that don't support `tx`, you may need to check `isRTL` from `@/i18n`.

## Common Pitfalls

1. **Concatenation**: NEVER concatenate translated strings (e.g., `t("hello") + " " + t("world")`). Use interpolation instead (`t("hello_world", { first: "hello", second: "world" })`).
2. **Missing Keys**: TypeScript will help catch missing keys in the code, but ensure the structure is mirrored across all language files.
3. **Hardcoded Strings**: Avoid using hardcoded strings in components. If a string is visible to the user, it belongs in i18n files.
4. **Context**: Sometimes the same word needs different translations based on context. Create specific keys like `common:save_as_verb` and `common:save_as_noun` if necessary.
5. **Formatting**: For dates, numbers, and currencies, use standard formatting libraries (like `date-fns` or native `Intl` API) instead of custom translatable strings where possible.
