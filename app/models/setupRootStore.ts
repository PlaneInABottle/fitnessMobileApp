import { useEffect, useState } from "react"
import { applySnapshot, IDisposer, onSnapshot } from "mobx-state-tree"

import * as storage from "@/utils/storage"
import * as secureStorage from "@/utils/storage/secure"

import { migratePerformanceMemoryStoreSnapshotToV2 } from "./PerformanceMemoryStore"
import { RootStore, RootStoreModel, RootStoreSnapshotIn, RootStoreSnapshotOut } from "./RootStore"

export const ROOT_STORE_PERSISTENCE_KEY = "ROOT_STORE"
export const ROOT_STORE_SECURE_PERSISTENCE_KEY = "ROOT_STORE_SECURE"

let setupPromise: Promise<{ rootStore: RootStore; dispose: IDisposer }> | null = null

async function setupRootStoreImpl(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  const rootStore = RootStoreModel.create({})

  const persistedState = storage.load<RootStoreSnapshotIn>(ROOT_STORE_PERSISTENCE_KEY)
  const persistedSecureState = secureStorage.load<Partial<RootStoreSnapshotIn>>(
    ROOT_STORE_SECURE_PERSISTENCE_KEY,
  )

  const merged = {
    ...(persistedState ?? {}),
    ...(persistedSecureState ?? {}),
    authenticationStore: {
      ...(persistedState?.authenticationStore ?? {}),
      accessToken: undefined,
    },
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

  if (persistedState || persistedSecureState) {
    try {
      applySnapshot(rootStore, merged)
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
      } catch (finalError) {
        console.error("Failed to restore root store, clearing storage", finalError)
        storage.remove(ROOT_STORE_PERSISTENCE_KEY)
        secureStorage.remove(ROOT_STORE_SECURE_PERSISTENCE_KEY)
      }
    }
  }

  const dispose = onSnapshot(rootStore, (snapshot) => {
    // Keep exercises in plain storage; put performance/workouts into encrypted MMKV.
    secureStorage.save(ROOT_STORE_SECURE_PERSISTENCE_KEY, {
      performanceMemoryStore: snapshot.performanceMemoryStore,
      workoutStore: snapshot.workoutStore,
    })

    // Avoid persisting sensitive auth tokens into plain MMKV.
    const snapshotToPersist: RootStoreSnapshotOut = {
      ...snapshot,
      authenticationStore: {
        ...snapshot.authenticationStore,
        accessToken: undefined,
      },
      // Never persist workout/memory to plain MMKV; keep it encrypted.
      performanceMemoryStore: {
        schemaVersion: 2,
        patternMemories: {},
        personalRecords: {},
        exerciseNotes: {},
      },
      workoutStore: {
        currentSession: undefined,
        templates: {},
        sessionHistory: [],
        lastError: undefined,
      },
    }

    storage.save(ROOT_STORE_PERSISTENCE_KEY, snapshotToPersist)
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
