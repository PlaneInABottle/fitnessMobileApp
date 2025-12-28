# Storage Implementation Patterns

This document outlines the patterns for implementing storage in the Fitness Tracker App.

## Helper Functions Reference

The following helpers are available in `app/utils/storage/index.ts`:

### `save(key: string, value: unknown): boolean`
Serializes `value` to JSON and saves it to MMKV.

### `load<T>(key: string): T | null`
Loads a string from MMKV and parses it as JSON. Returns `null` if the key doesn't exist or parsing fails.

### `saveString(key: string, value: string): boolean`
Saves a raw string to MMKV.

### `loadString(key: string): string | null`
Loads a raw string from MMKV.

### `remove(key: string): void`
Deletes a specific key from MMKV.

### `clear(): void`
Deletes all keys from the MMKV instance.

## Best Practices

1. **JSON Overhead**: For large arrays or objects, be aware that `JSON.stringify` and `JSON.parse` have a performance cost. For performance-critical data, consider using MMKV's direct methods if appropriate.
2. **Key Collisions**: Always use unique, descriptive keys. Consider prefixing keys if multiple features share the same storage instance.
3. **Data Validation**: When loading data, never assume the format is correct. Use type guards or validation libraries (like Zod) if the data structure is complex.
4. **Error Handling**: The helpers catch and handle basic errors, but complex storage logic should include its own try-catch blocks.
5. **Persistence in Stores**: When persisting MST stores, use `onSnapshot` to automatically save changes, and `applySnapshot` during initialization.

## Example: Persistent User Preference Store

```typescript
.actions((self) => ({
  afterCreate() {
    const persisted = load<UserPrefs>("user_prefs")
    if (persisted) {
      applySnapshot(self, persisted)
    }
    
    onSnapshot(self, (snapshot) => {
      save("user_prefs", snapshot)
    })
  }
}))
```
