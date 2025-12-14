import { useEffect, useState } from "react"
import { applySnapshot, IDisposer, onSnapshot } from "mobx-state-tree"

import * as storage from "@/utils/storage"

import { RootStore, RootStoreModel, RootStoreSnapshotIn, RootStoreSnapshotOut } from "./RootStore"

export const ROOT_STORE_PERSISTENCE_KEY = "ROOT_STORE"

export async function setupRootStore(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  const rootStore = RootStoreModel.create({})

  const persistedState = storage.load<RootStoreSnapshotIn>(ROOT_STORE_PERSISTENCE_KEY)
  if (persistedState) {
    try {
      applySnapshot(rootStore, persistedState)
    } catch {
      storage.remove(ROOT_STORE_PERSISTENCE_KEY)
    }
  }

  const dispose = onSnapshot(rootStore, (snapshot) => {
    // Avoid persisting sensitive auth tokens into plain MMKV.
    const snapshotToPersist: RootStoreSnapshotOut = {
      ...snapshot,
      authenticationStore: {
        ...snapshot.authenticationStore,
        accessToken: undefined,
      },
    }
    storage.save(ROOT_STORE_PERSISTENCE_KEY, snapshotToPersist)
  })

  return { rootStore, dispose }
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
