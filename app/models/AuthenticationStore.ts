import { Instance, SnapshotIn, types } from "mobx-state-tree"

/**
 * Example authentication store; expand as needed.
 */
export const AuthenticationStoreModel = types
  .model("AuthenticationStore", {
    accessToken: types.maybe(types.string),
  })
  .actions((self) => ({
    setAccessToken(token?: string) {
      self.accessToken = token
    },
    logout() {
      self.accessToken = undefined
    },
  }))

export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> {}
export interface AuthenticationStoreSnapshotIn extends SnapshotIn<
  typeof AuthenticationStoreModel
> {}
