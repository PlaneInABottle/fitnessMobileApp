# Root Store Integration Guide

This guide explains how to properly integrate new stores into the RootStore for dependency injection and cross-store communication.

## RootStore Structure

The RootStore is the top-level store that combines all feature stores and provides the environment for dependency injection.

```typescript
// app/models/RootStore.ts
export const RootStoreModel = types
  .model("RootStore", {
    // All stores are optional with empty object defaults
    userStore: types.optional(UserStoreModel, {}),
    uiStore: types.optional(UiStoreModel, {}),
    workoutsStore: types.optional(WorkoutStoreModel, {}),
    statsStore: types.optional(StatsStoreModel, {}),
    stickerStore: types.optional(StickerStoreModel, {}),

    // Add new stores here
    // newStore: types.optional(NewStoreModel, {}),
  })
```

## Adding a New Store

### Step 1: Create the Store Model

First, create your store model following the established patterns (see STORE_TEMPLATES.md).

### Step 2: Import in RootStore

```typescript
import { NewStoreModel } from "./NewStore"
```

### Step 3: Add to RootStore Model

```typescript
export const RootStoreModel = types
  .model("RootStore", {
    // ... existing stores
    newStore: types.optional(NewStoreModel, {}),
  })
```

### Step 4: Update TypeScript Interface

The `IRootStore` interface is automatically updated via the Instance type, so no manual changes needed.

## Accessing RootStore from Stores

Stores can access the RootStore using `getRoot<IRootStore>(self)`:

```typescript
import { getRoot } from "mobx-state-tree"
import type { IRootStore } from "./RootStore"

.actions((self) => ({
  someAction() {
    const rootStore = getRoot<IRootStore>(self)

    // Access other stores
    rootStore.statsStore.recordEvent("something")
    rootStore.uiStore.setLoading(true)
  },
}))
```

## RootStore Actions

### afterCreate()

Called after the store is created. Use for initialization:

```typescript
.actions((self) => ({
  afterCreate() {
    // Initialize data
    if (self.newStore.needsInitialization) {
      self.newStore.initialize()
    }
  },
}))
```

### reset()

Called to reset all stores to initial state:

```typescript
.actions((self) => ({
  reset() {
    self.userStore.logout()
    self.uiStore.clearError()
    self.workoutsStore.clearAll()
    self.statsStore.reset()

    // Add reset for new store if applicable
    // self.newStore.reset()
  },
}))
```

## Store Dependencies

### Direct Dependencies

If your store needs direct access to another store's data or actions, use RootStore injection:

```typescript
// In your store action
const rootStore = getRoot<IRootStore>(self)
const userData = rootStore.userStore.userData
```

### Indirect Dependencies

For loosely coupled stores, consider using events or callbacks instead of direct dependencies.

## Testing with RootStore

When testing stores that access RootStore:

```typescript
import { RootStoreModel } from "./RootStore"

describe("Store with Root Access", () => {
  it("should access root store", () => {
    const rootStore = RootStoreModel.create()
    const store = rootStore.myStore // Access via root

    // Test interactions
    store.doSomething()
    expect(rootStore.otherStore.someState).toBe("expected")
  })
})
```

## Common Patterns

### Stats Tracking

Many stores update stats when data changes:

```typescript
.actions((self) => ({
  addItem(item) {
    self.items.put(item)

    // Record in stats
    const rootStore = getRoot<IRootStore>(self)
    rootStore.statsStore.recordAddition(item.type)
  },
}))
```

### UI State Updates

Stores often update loading/error states:

```typescript
.actions((self) => ({
  async loadData: flow(function* () {
    const rootStore = getRoot<IRootStore>(self)
    rootStore.uiStore.setLoading(true)

    try {
      const data = yield apiCall()
      self.setData(data)
    } catch (error) {
      rootStore.uiStore.setError(error.message)
    } finally {
      rootStore.uiStore.setLoading(false)
    }
  }),
}))
```

## Best Practices

1. **Keep stores focused**: Each store should have a single responsibility
2. **Use RootStore injection**: Avoid importing stores directly
3. **Document dependencies**: Comment when stores interact
4. **Test integrations**: Ensure cross-store interactions work
5. **Handle initialization**: Use afterCreate for setup logic