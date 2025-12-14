import { getRoot, Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import { ExerciseSetFieldKey } from "./ExerciseStore"

export const SET_TYPES = {
  WARMUP: { name: "Warmup" },
  WORKING: { name: "Working" },
  DROPSET: { name: "Drop Set" },
} as const

export type SetTypeId = "warmup" | "working" | "dropset"

const SET_TYPE_IDS: readonly SetTypeId[] = ["warmup", "working", "dropset"] as const

export type SetData = {
  setType: SetTypeId | string
  weight?: number
  reps?: number
  time?: number
  distance?: number
  restTime?: number
}

export type SetValidationResult = { ok: true } | { ok: false; error: string }

const FIELD_RANGES: Record<ExerciseSetFieldKey, { min: number; max: number }> = {
  weight: { min: 0, max: 500 },
  reps: { min: 0, max: 100 },
  time: { min: 0, max: 24 * 60 * 60 },
  distance: { min: 0, max: 100000 },
  restTime: { min: 0, max: 3600 },
}

type RootWithExerciseStore = {
  exerciseStore: {
    hasExercise(id: string): boolean
    getRequiredFieldsForExercise(id: string): readonly ExerciseSetFieldKey[]
  }
}

export const SetStoreModel = types.model("SetStore", {}).actions((self) => ({
  getAvailableSetTypes(): Array<{ id: SetTypeId; name: string }> {
    return [
      { id: "warmup", name: SET_TYPES.WARMUP.name },
      { id: "working", name: SET_TYPES.WORKING.name },
      { id: "dropset", name: SET_TYPES.DROPSET.name },
    ]
  },

  validateSetData(exerciseId: string, setData: Partial<SetData> | null | undefined): SetValidationResult {
    if (!setData) return { ok: false, error: "Set data is required" }

    const setType = setData.setType
    if (typeof setType !== "string" || !SET_TYPE_IDS.includes(setType as SetTypeId)) {
      return { ok: false, error: "Invalid setType" }
    }

    let root: RootWithExerciseStore
    try {
      root = getRoot<RootWithExerciseStore>(self)
    } catch {
      return { ok: false, error: "SetStore is not attached" }
    }

    if (!root.exerciseStore.hasExercise(exerciseId)) {
      return { ok: false, error: "Invalid exerciseId" }
    }

    const requiredFields = root.exerciseStore.getRequiredFieldsForExercise(exerciseId)

    const fields: ExerciseSetFieldKey[] = ["weight", "reps", "time", "distance", "restTime"]
    for (const field of fields) {
      const value = setData[field]
      const isRequired = requiredFields.includes(field)

      if (value === undefined) {
        if (isRequired) return { ok: false, error: `${field} is required` }
        continue
      }

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { ok: false, error: isRequired ? `${field} is required` : `${field} must be a finite number` }
      }

      const { min, max } = FIELD_RANGES[field]
      if (value < min || value > max) {
        return { ok: false, error: `${field} must be between ${min} and ${max}` }
      }
    }

    return { ok: true }
  },
}))

export interface SetStore extends Instance<typeof SetStoreModel> {}
export interface SetStoreSnapshotIn extends SnapshotIn<typeof SetStoreModel> {}
export interface SetStoreSnapshotOut extends SnapshotOut<typeof SetStoreModel> {}
