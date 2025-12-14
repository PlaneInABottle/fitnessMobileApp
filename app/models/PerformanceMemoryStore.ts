import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

export type SetPerformanceInput = {
  weight?: number
  reps?: number
  time?: number
  distance?: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export const SetMemoryModel = types.model("SetMemory", {
  setType: types.string,
  typeOrder: types.number,
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  performedAt: types.Date,
})

export interface SetMemory extends Instance<typeof SetMemoryModel> {}
export interface SetMemorySnapshotIn extends SnapshotIn<typeof SetMemoryModel> {}
export interface SetMemorySnapshotOut extends SnapshotOut<typeof SetMemoryModel> {}

export const ExerciseMemoryModel = types.model("ExerciseMemory", {
  exerciseId: types.identifier,
  setMemories: types.optional(types.map(types.array(SetMemoryModel)), {}),
})

export interface ExerciseMemory extends Instance<typeof ExerciseMemoryModel> {}
export interface ExerciseMemorySnapshotIn extends SnapshotIn<typeof ExerciseMemoryModel> {}
export interface ExerciseMemorySnapshotOut extends SnapshotOut<typeof ExerciseMemoryModel> {}

export const PersonalRecordModel = types.model("PersonalRecord", {
  maxWeight: types.maybe(types.number),
  maxReps: types.maybe(types.number),
  maxTime: types.maybe(types.number),
  maxDistance: types.maybe(types.number),
  updatedAt: types.Date,
})

export interface PersonalRecord extends Instance<typeof PersonalRecordModel> {}
export interface PersonalRecordSnapshotIn extends SnapshotIn<typeof PersonalRecordModel> {}
export interface PersonalRecordSnapshotOut extends SnapshotOut<typeof PersonalRecordModel> {}

export const PerformanceMemoryStoreModel = types
  .model("PerformanceMemoryStore", {
    exerciseMemories: types.optional(types.map(ExerciseMemoryModel), {}),
    personalRecords: types.optional(types.map(PersonalRecordModel), {}),
  })
  .views((self) => ({
    getSetMemories(exerciseId: string): SetMemory[] {
      const exerciseMemory = self.exerciseMemories.get(exerciseId)
      if (!exerciseMemory) return []

      const allMemories: SetMemory[] = []
      exerciseMemory.setMemories.forEach((arr) => {
        allMemories.push(...arr.slice())
      })

      allMemories.sort((a: SetMemory, b: SetMemory) => b.performedAt.getTime() - a.performedAt.getTime())
      return allMemories.slice(0, 5)
    },

    getPersonalRecord(exerciseId: string): PersonalRecord | undefined {
      return self.personalRecords.get(exerciseId)
    },
  }))
  .actions((self) => {
    function updatePersonalRecord(exerciseId: string, performance: SetPerformanceInput, now: Date) {
      const current = self.personalRecords.get(exerciseId)

      const maxWeight = isFiniteNumber(performance.weight) ? performance.weight : undefined
      const maxReps = isFiniteNumber(performance.reps) ? performance.reps : undefined
      // KISS: treat `time` as duration (higher is better).
      const maxTime = isFiniteNumber(performance.time) ? performance.time : undefined
      const maxDistance = isFiniteNumber(performance.distance) ? performance.distance : undefined

      if (!current) {
        if (maxWeight === undefined && maxReps === undefined && maxTime === undefined && maxDistance === undefined) return

        self.personalRecords.set(exerciseId, {
          maxWeight,
          maxReps,
          maxTime,
          maxDistance,
          updatedAt: now,
        })
        return
      }

      let didUpdate = false

      if (maxWeight !== undefined && (current.maxWeight === undefined || maxWeight > current.maxWeight)) {
        current.maxWeight = maxWeight
        didUpdate = true
      }

      if (maxReps !== undefined && (current.maxReps === undefined || maxReps > current.maxReps)) {
        current.maxReps = maxReps
        didUpdate = true
      }

      if (maxTime !== undefined && (current.maxTime === undefined || maxTime > current.maxTime)) {
        current.maxTime = maxTime
        didUpdate = true
      }

      if (maxDistance !== undefined && (current.maxDistance === undefined || maxDistance > current.maxDistance)) {
        current.maxDistance = maxDistance
        didUpdate = true
      }

      if (didUpdate) {
        current.updatedAt = now
      }
    }

    function ensureExerciseMemory(exerciseId: string): ExerciseMemory {
      const existing = self.exerciseMemories.get(exerciseId)
      if (existing) return existing

      self.exerciseMemories.set(exerciseId, {
        exerciseId,
        setMemories: {},
      })
      return self.exerciseMemories.get(exerciseId)!
    }

    return {
      updateSetMemory(exerciseId: string, setType: string, typeOrder: number, performance: SetPerformanceInput) {
        if (!exerciseId) throw new Error("exerciseId is required")
        if (!setType) throw new Error("setType is required")
        if (!isFiniteNumber(typeOrder)) throw new Error("typeOrder must be a finite number")

        const now = new Date()
        const exerciseMemory = ensureExerciseMemory(exerciseId)

        if (!exerciseMemory.setMemories.has(setType)) {
          exerciseMemory.setMemories.set(setType, [])
        }

        const memories = exerciseMemory.setMemories.get(setType)!
        memories.push({
          setType,
          typeOrder,
          weight: isFiniteNumber(performance.weight) ? performance.weight : undefined,
          reps: isFiniteNumber(performance.reps) ? performance.reps : undefined,
          time: isFiniteNumber(performance.time) ? performance.time : undefined,
          distance: isFiniteNumber(performance.distance) ? performance.distance : undefined,
          performedAt: now,
        })

        while (memories.length > 20) memories.shift()

        updatePersonalRecord(exerciseId, performance, now)
      },
    }
  })

export interface PerformanceMemoryStore extends Instance<typeof PerformanceMemoryStoreModel> {}
export interface PerformanceMemoryStoreSnapshotIn extends SnapshotIn<typeof PerformanceMemoryStoreModel> {}
export interface PerformanceMemoryStoreSnapshotOut extends SnapshotOut<typeof PerformanceMemoryStoreModel> {}
