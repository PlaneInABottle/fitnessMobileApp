# MST Store Templates

Copy these templates to create new stores following Fitness Tracker patterns.

## Domain Model Template

```typescript
import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

/**
 * Description of what this model represents
 */
export const ${ModelName}Model = types
  .model("${ModelName}", {
    id: types.identifier,

    // Add your properties here
    name: types.string,
    description: types.maybe(types.string),

    // Example optional array
    tags: types.optional(types.array(types.string), []),

    // Example nested model
    // metadata: types.optional(MetadataModel, {}),
  })
  .views((self) => ({
    /**
     * Computed property example
     */
    get displayName() {
      return self.name || "Unnamed"
    },

    /**
     * Boolean check example
     */
    get hasDescription() {
      return !!self.description && self.description.length > 0
    },

    /**
     * Derived data example
     */
    get tagCount() {
      return self.tags.length
    },
  }))
  .actions((self) => ({
    /**
     * Update name
     */
    setName(name: string) {
      self.name = name
    },

    /**
     * Set description
     */
    setDescription(description: string) {
      self.description = description
    },

    /**
     * Add tag
     */
    addTag(tag: string) {
      if (!self.tags.includes(tag)) {
        self.tags.push(tag)
      }
    },

    /**
     * Remove tag
     */
    removeTag(tag: string) {
      const index = self.tags.indexOf(tag)
      if (index > -1) {
        self.tags.splice(index, 1)
      }
    },
  }))

export interface I${ModelName} extends Instance<typeof ${ModelName}Model> {}
export interface I${ModelName}SnapshotIn extends SnapshotIn<typeof ${ModelName}Model> {}
export interface I${ModelName}SnapshotOut extends SnapshotOut<typeof ${ModelName}Model> {}
```

## Collection Store Template

```typescript
import { Instance, SnapshotIn, SnapshotOut, types, getRoot } from "mobx-state-tree"
import type { IRootStore } from "./RootStore"

import { ${ModelName}Model } from "./${ModelName}"

/**
 * Store for managing collection of ${ModelName}
 */
export const ${StoreName}Model = types
  .model("${StoreName}", {
    ${collectionName}: types.optional(types.map(${ModelName}Model), {}),

    // Store-specific metadata
    // lastUpdated: types.maybe(types.number),
  })
  .views((self) => ({
    /**
     * Get all items as sorted array
     */
    get ${collectionName}Array() {
      return Array.from(self.${collectionName}.values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    },

    /**
     * Find item by ID
     */
    getById(id: string) {
      return self.${collectionName}.get(id)
    },

    /**
     * Get total count
     */
    get count() {
      return self.${collectionName}.size
    },

    /**
     * Filter example
     */
    get activeItems() {
      return this.${collectionName}Array.filter(item => item.isActive)
    },

    /**
     * Search example
     */
    getItemsByName(name: string) {
      return this.${collectionName}Array.filter(item =>
        item.name.toLowerCase().includes(name.toLowerCase())
      )
    },
  }))
  .actions((self) => ({
    /**
     * Add new ${ModelName.lower()}
     */
    add${ModelName}(item: SnapshotIn<typeof ${ModelName}Model>) {
      self.${collectionName}.put(item)

      // Update stats if needed
      // const rootStore = getRoot<IRootStore>(self)
      // rootStore.statsStore.recordAddition(item.type)
    },

    /**
     * Update existing item
     */
    update${ModelName}(id: string, updates: Partial<SnapshotIn<typeof ${ModelName}Model>>) {
      const item = self.${collectionName}.get(id)
      if (item) {
        Object.assign(item, updates)
      }
    },

    /**
     * Remove item
     */
    remove${ModelName}(id: string) {
      self.${collectionName}.delete(id)
    },

    /**
     * Clear all items
     */
    clearAll() {{
      self.${collectionName}.clear()
    }},
  }}))

export interface I${StoreName} extends Instance<typeof ${StoreName}Model> {}
export interface I${StoreName}SnapshotIn extends SnapshotIn<typeof ${StoreName}Model> {}
export interface I${StoreName}SnapshotOut extends SnapshotOut<typeof ${StoreName}Model> {}
```

## Singleton Store Template

```typescript
import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

/**
 * Store for managing ${purpose}
 */
export const ${StoreName}Model = types
  .model("${StoreName}", {{
    // Configuration properties
    setting1: types.optional(types.boolean, false),
    setting2: types.optional(types.string, "default"),

    // State properties
    isLoading: false,
    error: types.maybe(types.string),

    // Data properties
    // data: types.optional(types.array(types.string), []),
  }})
  .views((self) => ({{
    /**
     * Computed readiness state
     */
    get isReady() {{
      return !self.isLoading && !self.error
    }},

    /**
     * Display message based on state
     */
    get statusMessage() {{
      if (self.error) return `Error: ${{self.error}}`
      if (self.isLoading) return "Loading..."
      return "Ready"
    }},

    // Add computed views specific to your store's purpose
  }}))
  .actions((self) => ({{
    /**
     * Set loading state
     */
    setLoading(loading: boolean) {{
      self.isLoading = loading
    }},

    /**
     * Set error state
     */
    setError(error: string | undefined) {{
      self.error = error
    }},

    /**
     * Clear error
     */
    clearError() {{
      self.error = undefined
    }},

    // Add actions specific to your store's purpose

    /**
     * Example async action
     */
    // async performOperation: flow(function* () {{
    //   self.setLoading(true)
    //   self.setError(undefined)
    //
    //   try {{
    //     // Perform async operation
    //     const result = yield someApiCall()
    //     // Process result
    //   }} catch (error) {{
    //     self.setError(error.message)
    //   }} finally {{
    //     self.setLoading(false)
    //   }}
    // }}),
  }}))

export interface I${{StoreName}} extends Instance<typeof ${{StoreName}}Model> {{}}
export interface I${{StoreName}}SnapshotIn extends SnapshotIn<typeof ${{StoreName}}Model> {{}}
export interface I${{StoreName}}SnapshotOut extends SnapshotOut<typeof ${{StoreName}}Model> {{}}
```

## Root Store Integration Template

To add a new store to RootStore:

1. Import the new store model:
```typescript
import { ${NewStoreName}Model } from "./${NewStoreName}"
```

2. Add it to the RootStore model:
```typescript
export const RootStoreModel = types
  .model("RootStore", {
    // ... existing stores
    ${newStoreName}: types.optional(${NewStoreName}Model, {}),
  })
```

3. Update the reset action if needed:
```typescript
.actions((self) => ({
  reset() {
    // ... existing resets
    self.${newStoreName}.reset() // if applicable
  },
}))
```

## Testing Template

```typescript
import { ${StoreName}Model } from "./${StoreName}"

describe("${StoreName}", () => {
  it("should create store with defaults", () => {
    const store = ${StoreName}Model.create()
    expect(store).toBeDefined()
  })

  // Add specific tests for your store's functionality

  it("should perform action correctly", () => {
    const store = ${StoreName}Model.create()

    // Test action
    store.someAction("test")

    // Assert result
    expect(store.someProperty).toBe("expected")
  })
})
```

## Usage in Components

```typescript
import { observer } from "mobx-react-lite"
import { useStores } from "@/models"

export const MyComponent = observer(function MyComponent() {
  const { ${storeName} } = useStores()

  // Use store in component
  return (
    <View>
      <Text>Count: {${storeName}.count}</Text>
    </View>
  )
})
```