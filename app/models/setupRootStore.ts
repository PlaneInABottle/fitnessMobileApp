import { useEffect, useState } from "react"
import { applySnapshot, getSnapshot, IDisposer, onSnapshot } from "mobx-state-tree"

import * as storage from "@/utils/storage"

import { migratePerformanceMemoryStoreSnapshotToV2 } from "./PerformanceMemoryStore"
import { RootStore, RootStoreModel, RootStoreSnapshotIn, RootStoreSnapshotOut } from "./RootStore"

export const ROOT_STORE_PERSISTENCE_KEY = "ROOT_STORE"
const LEGACY_ROOT_STORE_SECURE_PERSISTENCE_KEY = "ROOT_STORE_SECURE"

let setupPromise: Promise<{ rootStore: RootStore; dispose: IDisposer }> | null = null

function sanitizePersistedRootStoreSnapshot(value: unknown): Partial<RootStoreSnapshotIn> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const candidate = value as Record<string, unknown>
  const snapshot: Record<string, unknown> = {}

  for (const key of ["exerciseStore", "setStore", "performanceMemoryStore", "workoutStore"]) {
    const child = candidate[key]
    if (child && typeof child === "object" && !Array.isArray(child)) snapshot[key] = child
  }

  return snapshot as Partial<RootStoreSnapshotIn>
}

async function setupRootStoreImpl(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  const rootStore = RootStoreModel.create({})

  const persistedState = storage.load<unknown>(ROOT_STORE_PERSISTENCE_KEY)
  const legacySecureState = storage.loadLegacySecure<unknown>(
    LEGACY_ROOT_STORE_SECURE_PERSISTENCE_KEY,
  )

  const merged = {
    ...sanitizePersistedRootStoreSnapshot(persistedState),
    ...sanitizePersistedRootStoreSnapshot(legacySecureState),
  } as RootStoreSnapshotIn

  // Non-persistent UI state; drop it from older persisted snapshots to avoid restore failures.
  if ((merged as any).workoutStore?.pendingRoutineExerciseId != null) {
    delete (merged as any).workoutStore.pendingRoutineExerciseId
  }

  try {
    ;(merged as any).performanceMemoryStore = migratePerformanceMemoryStoreSnapshotToV2(
      (merged as any).performanceMemoryStore,
      (merged as any).exerciseStore,
    )
  } catch {
    ;(merged as any).performanceMemoryStore = {
      schemaVersion: 2,
      patternMemories: {},
      personalRecords: {},
      exerciseNotes: {},
    }
  }

  let didRestorePersistedState = false

  if (persistedState || legacySecureState) {
    try {
      applySnapshot(rootStore, merged)
      didRestorePersistedState = true
    } catch (error) {
      console.warn("Failed to restore root store, attempting with clean performance memory", error)
      try {
        applySnapshot(rootStore, {
          ...merged,
          performanceMemoryStore: {
            schemaVersion: 2,
            patternMemories: {},
            personalRecords: {},
            exerciseNotes: {},
          },
        } as any)
        didRestorePersistedState = true
      } catch (finalError) {
        console.error("Failed to restore root store, clearing storage", finalError)
        storage.remove(ROOT_STORE_PERSISTENCE_KEY)
        storage.removeLegacySecure(LEGACY_ROOT_STORE_SECURE_PERSISTENCE_KEY)
      }
    }
  }

  if (didRestorePersistedState) {
    storage.save(ROOT_STORE_PERSISTENCE_KEY, getSnapshot(rootStore))
    storage.removeLegacySecure(LEGACY_ROOT_STORE_SECURE_PERSISTENCE_KEY)
  }

  const dispose = onSnapshot(rootStore, (snapshot) => {
    storage.save(ROOT_STORE_PERSISTENCE_KEY, snapshot as RootStoreSnapshotOut)
  })

  return { rootStore, dispose }
}

export async function setupRootStore(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  if (!setupPromise) {
    setupPromise = setupRootStoreImpl()
  }
  return setupPromise
}

export function useInitialRootStore(): { rootStore: RootStore | null; rehydrated: boolean } {
  const [rootStore, setRootStore] = useState<RootStore | null>(null)
  const [rehydrated, setRehydrated] = useState(false)

  useEffect(() => {
    let disposer: IDisposer | undefined
    let canceled = false

    ;(async () => {
      const { rootStore, dispose } = await setupRootStore()

      if (canceled) {
        dispose()
        return
      }

      disposer = dispose
      setRootStore(rootStore)
      setRehydrated(true)
    })()

    return () => {
      canceled = true
      disposer?.()
    }
  }, [])

  return { rootStore, rehydrated }
}
