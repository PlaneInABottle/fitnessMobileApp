import { createContext, ReactNode, useContext } from "react"

import { RootStore } from "./RootStore"

const RootStoreContext = createContext<RootStore | null>(null)

export function RootStoreProvider(props: { value: RootStore; children: ReactNode }) {
  return <RootStoreContext.Provider value={props.value}>{props.children}</RootStoreContext.Provider>
}

export function useStores(): RootStore {
  const rootStore = useContext(RootStoreContext)
  if (!rootStore) throw new Error("useStores must be used within a RootStoreProvider")
  return rootStore
}
