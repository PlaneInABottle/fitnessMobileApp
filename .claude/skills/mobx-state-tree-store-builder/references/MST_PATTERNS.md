# MobX State Tree Patterns in Fitness Tracker

This document outlines the established MST patterns used in the Fitness Tracker App.

## Domain Model Pattern

```typescript
import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

/**
 * Description of the model
 */
export const ModelName = types
  .model("ModelName", {
    id: types.identifier,
    // Required properties
    property1: types.string,
    property2: types.number,

    // Optional properties
    optionalProperty: types.maybe(types.string),

    // Arrays
    tags: types.optional(types.array(types.string), []),

    // Nested models
    nestedData: types.optional(NestedModel, {}),
  })
  .views((self) => ({
    // Computed properties
    get computedProperty() {
      return self.property1.length
    },

    // Boolean checks
    get hasData() {
      return !!self.optionalProperty
    },
  }))
  .actions((self) => ({
    // Property setters (auto-generated for simple properties)
    setProperty1(value: string) {
      self.property1 = value
    },

    // Complex actions
    addTag(tag: string) {
      if (!self.tags.includes(tag)) {
        self.tags.push(tag)
      }
    },

    removeTag(tag: string) {
      const index = self.tags.indexOf(tag)
      if (index > -1) {
        self.tags.splice(index, 1)
      }
    },
  }))

// TypeScript interfaces
export interface IModelName extends Instance<typeof ModelName> {}
export interface IModelNameSnapshotIn extends SnapshotIn<typeof ModelName> {}
export interface IModelNameSnapshotOut extends SnapshotOut<typeof ModelName> {}
```

## Collection Store Pattern

```typescript
import { Instance, SnapshotIn, SnapshotOut, types, getRoot } from "mobx-state-tree"
import type { IRootStore } from "./RootStore"

/**
 * Collection store for managing arrays of domain models
 */
export const CollectionStoreModel = types
  .model("CollectionStore", {
    items: types.optional(types.map(DomainModel), {}),
    metadata: types.optional(types.string, ""),
  })
  .views((self) => ({
    // Array access
    get itemsArray() {
      return Array.from(self.items.values()).sort((a, b) => b.timestamp - a.timestamp)
    },

    // Finders
    getById(id: string) {
      return self.items.get(id)
    },

    // Filters
    get filteredItems() {
      return this.itemsArray.filter(item => item.someCondition)
    },

    // Counts
    get count() {
      return self.items.size
    },
  }))
  .actions((self) => ({
    // Add item
    addItem(item: SnapshotIn<typeof DomainModel>) {
      self.items.put(item)

      // Update related stores via root
      const rootStore = getRoot<IRootStore>(self)
      rootStore.statsStore.recordAddition(item.type)
    },

    // Remove item
    removeItem(id: string) {
      self.items.delete(id)
    },

    // Clear all
    clearAll() {
      self.items.clear()
    },
  }))

export interface ICollectionStore extends Instance<typeof CollectionStoreModel> {}
export interface ICollectionStoreSnapshotIn extends SnapshotIn<typeof CollectionStoreModel> {}
export interface ICollectionStoreSnapshotOut extends SnapshotOut<typeof CollectionStoreModel> {}
```

## Singleton Store Pattern

```typescript
import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

/**
 * Singleton store for global app state
 */
export const SingletonStoreModel = types
  .model("SingletonStore", {
    // Configuration properties
    setting1: types.optional(types.boolean, false),
    setting2: types.optional(types.string, "default"),

    // State properties
    isLoading: false,
    error: types.maybe(types.string),
  })
  .views((self) => ({
    // Computed state
    get isReady() {
      return !self.isLoading && !self.error
    },

    // Display message based on state
    get displayMessage() {
      if (self.error) return `Error: ${self.error}`
      if (self.isLoading) return "Loading..."
      return "Ready"
    },
  }))
  .actions((self) => ({
    // State setters
    setLoading(loading: boolean) {
      self.isLoading = loading
    },

    setError(error: string | undefined) {
      self.error = error
    },

    // Complex actions
    async performOperation() {
      self.setLoading(true)
      self.setError(undefined)

      try {
        // Perform operation
        await someAsyncFunction()
      } catch (error) {
        self.setError(error.message)
      } finally {
        self.setLoading(false)
      }
    },
  }))

export interface ISingletonStore extends Instance<typeof SingletonStoreModel> {}
export interface ISingletonStoreSnapshotIn extends SnapshotIn<typeof SingletonStoreModel> {}
export interface ISingletonStoreSnapshotOut extends SnapshotOut<typeof SingletonStoreModel> {}
```

## Root Store Pattern

```typescript
import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

// Import all store models
import { ExerciseStoreModel } from "./ExerciseStore"
import { UserStoreModel } from "./UserStore"
// ... other imports

export const RootStoreModel = types
  .model("RootStore", {
    // All stores as optional with defaults
    userStore: types.optional(UserStoreModel, {}),
    exerciseStore: types.optional(ExerciseStoreModel, {}),
    // ... other stores
  })
  .actions((self) => ({
    // Initialization
    afterCreate() {
      // Initialize data if needed
      if (self.exerciseStore.count === 0) {
        // Load initial data
      }
    },

    // Global reset
    reset() {
      self.userStore.logout()
      self.exerciseStore.clearAll()
      // Reset other stores
    },
  }))

export interface IRootStore extends Instance<typeof RootStoreModel> {}
export interface IRootStoreSnapshotIn extends SnapshotIn<typeof RootStoreModel> {}
export interface IRootStoreSnapshotOut extends SnapshotOut<typeof RootStoreModel> {}
```

## Common Model Types

### Photo References
```typescript
const Photo = types.model("Photo", {
  original: types.string,    // File path to original
  thumbnail: types.string,   // File path to thumbnail
})
```

### ExerciseCategory Data
```typescript
const ExerciseCategory = types.model("ExerciseCategory", {
  type: types.enumeration(["none", "manual", "gps"]),
  label: types.maybe(types.string),
  muscles: types.maybe(types.model({
    primary: types.number,
    secondary: types.number,
  })),
})
```

### Timestamp Handling
```typescript
.views((self) => ({
  get formattedDate() {
    return new Date(self.timestamp).toLocaleDateString()
  },

  get formattedTime() {
    return new Date(self.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  },
}))
```

## Testing Patterns

```typescript
import { ExerciseStoreModel } from "./ExerciseStore"

describe("ExerciseStore", () => {
  it("should add exercise", () => {
    const store = ExerciseStoreModel.create()

    store.addExercise({
      id: "1",
      timestamp: Date.now(),
      photos: { original: "path", thumbnail: "thumb" },
      category: "STRENGTH",
      location: { type: "none" },
    })

    expect(store.count).toBe(1)
  })

  it("should remove exercise", () => {
    const store = ExerciseStoreModel.create({
      exercises: {
        "1": {
          id: "1",
          timestamp: Date.now(),
          photos: { original: "path", thumbnail: "thumb" },
          category: "STRENGTH",
          location: { type: "none" },
        }
      }
    })

    store.removeExercise("1")
    expect(store.count).toBe(0)
  })
})
```

## Best Practices

1. **Use meaningful names**: Model names should reflect domain concepts
2. **Keep models focused**: Single responsibility principle
3. **Use proper types**: Leverage MST's type system for runtime safety
4. **Document complex logic**: Comments for non-obvious computations
5. **Test thoroughly**: Cover all actions and views
6. **Use snapshots**: For data import/export and persistence