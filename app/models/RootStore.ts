import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import { AuthenticationStoreModel } from "./AuthenticationStore"
import { ExerciseStoreModel } from "./ExerciseStore"
import { PerformanceMemoryStoreModel } from "./PerformanceMemoryStore"
import { SetStoreModel } from "./SetStore"
import { WorkoutStoreModel } from "./WorkoutStore"

export const RootStoreModel = types.model("RootStore", {
  authenticationStore: types.optional(AuthenticationStoreModel, {}),
  exerciseStore: types.optional(ExerciseStoreModel, {}),
  setStore: types.optional(SetStoreModel, {}),
  performanceMemoryStore: types.optional(PerformanceMemoryStoreModel, {}),
  workoutStore: types.optional(WorkoutStoreModel, {}),
})

export interface RootStore extends Instance<typeof RootStoreModel> {}
export interface RootStoreSnapshotOut extends SnapshotOut<typeof RootStoreModel> {}
export interface RootStoreSnapshotIn extends SnapshotIn<typeof RootStoreModel> {}
