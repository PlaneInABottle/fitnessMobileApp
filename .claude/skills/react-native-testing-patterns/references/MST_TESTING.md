# MobX State Tree Testing Patterns

This document outlines the patterns for testing MST models and stores in the Fitness Tracker App.

## Snapshot Testing

Use snapshots to verify the data structure after actions.

```typescript
import { getSnapshot } from "mobx-state-tree"
import { MyStore } from "@/models/MyStore"

it("matches snapshot after adding item", () => {
  const store = MyStore.create()
  store.addItem({ id: "1", title: "Test" })
  expect(getSnapshot(store)).toMatchSnapshot()
})
```

## Computed Views Testing

Verify that views update correctly when underlying data changes.

```typescript
it("updates computed count", () => {
  const store = MyStore.create()
  expect(store.count).toBe(0)
  store.addItem({ id: "1" })
  expect(store.count).toBe(1)
})
```

## Flow (Async) Testing

Use `process.nextTick` or `waitFor` if necessary for async flows.

```typescript
it("handles async fetch", async () => {
  const store = MyStore.create({}, { api: mockApi })
  await store.fetchData()
  expect(store.items.length).toBeGreaterThan(0)
})
```

## Root Store Context

If a store depends on the RootStore, create it within a RootStore instance.

```typescript
import { RootStoreModel } from "@/models/RootStore"

it("interacts with other stores", () => {
  const rootStore = RootStoreModel.create()
  const { userStore, workoutStore } = rootStore
  
  userStore.setLoggedIn(true)
  expect(workoutStore.canCreate).toBe(true)
})
```

## Best Practices

1. **Isolation**: Test models in isolation when possible.
2. **Environment Injection**: Pass mock services (API, Storage) through the MST environment.
3. **Data Variations**: Test with various input data (empty, full, invalid).
4. **Action Consistency**: Verify that actions only modify the intended part of the state.
