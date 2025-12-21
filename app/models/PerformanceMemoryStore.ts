import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import { EXERCISE_CATEGORY_VALUES, type ExerciseCategory } from "./ExerciseStore"
import type { SetTypeId } from "./SetStore"

const SET_TYPE_IDS: readonly SetTypeId[] = ["warmup", "working", "dropset", "failure"] as const

export type SetFieldKey = "weight" | "reps" | "time" | "distance" | "restTime"

export type PlaceholderValue = string

export type PlaceholderResult = Readonly<{
  reps: PlaceholderValue
  weight: PlaceholderValue
  time: PlaceholderValue
  distance: PlaceholderValue
  restTime: PlaceholderValue
}>

export interface PlaceholderQuery {
  exerciseId: string
  category: ExerciseCategory
  setType: SetTypeId
  order: number // 1-based order within the setType
}

export type CompletedSet = {
  setType: SetTypeId
  weight?: number
  reps?: number
  time?: number
  distance?: number
  restTime?: number
}

export type CompletedExercise = {
  exerciseId: string
  category: ExerciseCategory
  sets: CompletedSet[]
}

export type CompletedWorkout = {
  completedAt: Date
  exercises: CompletedExercise[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

function toPlaceholder(value: unknown): string {
  return isFiniteNumber(value) ? String(value) : "-"
}

function buildKey(query: PlaceholderQuery): string {
  return `${query.exerciseId}::${query.category}|${query.setType}|${query.order}`
}

export const PatternMemoryEntryModel = types.model("PatternMemoryEntry", {
  exerciseId: types.string,
  category: types.enumeration("ExerciseCategory", [...EXERCISE_CATEGORY_VALUES]),
  setType: types.enumeration("SetType", [...SET_TYPE_IDS]),
  order: types.number,
  performedAt: types.Date,
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
})

export interface PatternMemoryEntry extends Instance<typeof PatternMemoryEntryModel> {}
export interface PatternMemoryEntrySnapshotIn extends SnapshotIn<typeof PatternMemoryEntryModel> {}
export interface PatternMemoryEntrySnapshotOut extends SnapshotOut<
  typeof PatternMemoryEntryModel
> {}

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
    schemaVersion: types.optional(types.number, 2),
    patternMemories: types.optional(types.map(PatternMemoryEntryModel), {}),
    personalRecords: types.optional(types.map(PersonalRecordModel), {}),
  })
  .views((self) => ({
    getPersonalRecord(exerciseId: string): PersonalRecord | undefined {
      return self.personalRecords.get(exerciseId)
    },

    getPlaceholderForField(query: PlaceholderQuery, field: SetFieldKey): PlaceholderValue {
      if (!query.exerciseId || !query.category || !query.setType) return "-"
      if (!isFiniteNumber(query.order) || query.order <= 0) return "-"

      const entry = self.patternMemories.get(buildKey(query))
      if (!entry) return "-"

      switch (field) {
        case "weight":
          return toPlaceholder(entry.weight)
        case "reps":
          return toPlaceholder(entry.reps)
        case "time":
          return toPlaceholder(entry.time)
        case "distance":
          return toPlaceholder(entry.distance)
        case "restTime":
          return toPlaceholder(entry.restTime)
      }
    },

    getPlaceholdersForSet(query: PlaceholderQuery): PlaceholderResult {
      return {
        reps: this.getPlaceholderForField(query, "reps"),
        weight: this.getPlaceholderForField(query, "weight"),
        time: this.getPlaceholderForField(query, "time"),
        distance: this.getPlaceholderForField(query, "distance"),
        restTime: this.getPlaceholderForField(query, "restTime"),
      }
    },

    getPreviousSetData(query: PlaceholderQuery): { weight?: number; reps?: number; time?: number; distance?: number } | undefined {
      if (!query.exerciseId || !query.category || !query.setType) return undefined
      if (!isFiniteNumber(query.order) || query.order <= 0) return undefined
      
      const entry = self.patternMemories.get(buildKey(query))
      if (!entry) return undefined
      
      return {
        weight: entry.weight,
        reps: entry.reps,
        time: entry.time,
        distance: entry.distance,
      }
    },
  }))
  .actions((self) => {
    function updatePersonalRecord(exerciseId: string, performance: CompletedSet, now: Date) {
      const current = self.personalRecords.get(exerciseId)

      const maxWeight = isFiniteNumber(performance.weight) ? performance.weight : undefined
      const maxReps = isFiniteNumber(performance.reps) ? performance.reps : undefined
      // KISS: treat `time` as duration (higher is better).
      const maxTime = isFiniteNumber(performance.time) ? performance.time : undefined
      const maxDistance = isFiniteNumber(performance.distance) ? performance.distance : undefined

      if (!current) {
        if (
          maxWeight === undefined &&
          maxReps === undefined &&
          maxTime === undefined &&
          maxDistance === undefined
        )
          return

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

      if (
        maxWeight !== undefined &&
        (current.maxWeight === undefined || maxWeight > current.maxWeight)
      ) {
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

      if (
        maxDistance !== undefined &&
        (current.maxDistance === undefined || maxDistance > current.maxDistance)
      ) {
        current.maxDistance = maxDistance
        didUpdate = true
      }

      if (didUpdate) {
        current.updatedAt = now
      }
    }

    return {
      recordCompletedWorkout(workout: CompletedWorkout) {
        const now = workout?.completedAt instanceof Date ? workout.completedAt : new Date()

        workout?.exercises?.forEach((exercise) => {
          const counters: Partial<Record<SetTypeId, number>> = {}

          exercise?.sets?.forEach((set) => {
            const setType = set?.setType
            if (typeof setType !== "string" || !SET_TYPE_IDS.includes(setType as SetTypeId)) return

            counters[setType] = (counters[setType] ?? 0) + 1
            const order = counters[setType]!

            self.patternMemories.set(
              buildKey({
                exerciseId: exercise.exerciseId,
                category: exercise.category,
                setType,
                order,
              }),
              {
                exerciseId: exercise.exerciseId,
                category: exercise.category,
                setType,
                order,
                performedAt: now,
                weight: isFiniteNumber(set.weight) ? set.weight : undefined,
                reps: isFiniteNumber(set.reps) ? set.reps : undefined,
                time: isFiniteNumber(set.time) ? set.time : undefined,
                distance: isFiniteNumber(set.distance) ? set.distance : undefined,
                restTime: isFiniteNumber(set.restTime) ? set.restTime : undefined,
              },
            )

            updatePersonalRecord(exercise.exerciseId, set, now)
          })
        })
      },
    }
  })

export function migratePerformanceMemoryStoreSnapshotToV2(
  input: unknown,
  exerciseStoreSnapshot: any,
): PerformanceMemoryStoreSnapshotIn {
  const base: PerformanceMemoryStoreSnapshotIn = {
    schemaVersion: 2,
    patternMemories: {},
    personalRecords: {},
  }

  const maybe = input as any

  const categories = new Set(EXERCISE_CATEGORY_VALUES)

  const personalRecords: Record<string, any> = {}
  const prs = maybe?.personalRecords
  if (prs && typeof prs === "object") {
    Object.entries(prs).forEach(([exerciseId, pr]) => {
      if (!exerciseId) return
      const updatedAt = toDate((pr as any)?.updatedAt)
      if (!updatedAt) return

      personalRecords[exerciseId] = {
        maxWeight: isFiniteNumber((pr as any)?.maxWeight) ? (pr as any).maxWeight : undefined,
        maxReps: isFiniteNumber((pr as any)?.maxReps) ? (pr as any).maxReps : undefined,
        maxTime: isFiniteNumber((pr as any)?.maxTime) ? (pr as any).maxTime : undefined,
        maxDistance: isFiniteNumber((pr as any)?.maxDistance) ? (pr as any).maxDistance : undefined,
        updatedAt,
      }
    })
  }

  if (
    maybe?.schemaVersion === 2 &&
    maybe?.patternMemories &&
    typeof maybe.patternMemories === "object"
  ) {
    const v2PatternMemories: Record<string, any> = {}
    Object.entries(maybe.patternMemories).forEach(([key, entry]) => {
      const e = entry as any
      if (!key || typeof key !== "string") return
      if (!e || typeof e !== "object") return

      if (typeof e.exerciseId !== "string" || !e.exerciseId) return
      if (typeof e.category !== "string" || !categories.has(e.category)) return
      if (typeof e.setType !== "string" || !SET_TYPE_IDS.includes(e.setType as SetTypeId)) return
      if (!isFiniteNumber(e.order) || e.order <= 0) return
      const performedAt = toDate(e.performedAt)
      if (!performedAt) return

      v2PatternMemories[key] = {
        exerciseId: e.exerciseId,
        category: e.category,
        setType: e.setType,
        order: e.order,
        performedAt,
        weight: isFiniteNumber(e.weight) ? e.weight : undefined,
        reps: isFiniteNumber(e.reps) ? e.reps : undefined,
        time: isFiniteNumber(e.time) ? e.time : undefined,
        distance: isFiniteNumber(e.distance) ? e.distance : undefined,
        restTime: isFiniteNumber(e.restTime) ? e.restTime : undefined,
      }
    })

    return {
      schemaVersion: 2,
      patternMemories: v2PatternMemories,
      personalRecords,
    }
  }

  const patternMemories: Record<string, any> = {}

  const exerciseMemories = maybe?.exerciseMemories
  if (exerciseMemories && typeof exerciseMemories === "object") {
    Object.entries(exerciseMemories).forEach(([exerciseId, exerciseMemory]) => {
      if (!exerciseId) return

      const category = exerciseStoreSnapshot?.exercises?.[exerciseId]?.category
      if (typeof category !== "string" || !categories.has(category as any)) return

      const setMemories = (exerciseMemory as any)?.setMemories
      if (!setMemories || typeof setMemories !== "object") return

      Object.entries(setMemories).forEach(([setType, memories]) => {
        if (typeof setType !== "string" || !SET_TYPE_IDS.includes(setType as SetTypeId)) return
        if (!Array.isArray(memories)) return

        memories.forEach((m: any) => {
          const performedAt = toDate(m?.performedAt)
          const typeOrder = m?.typeOrder
          if (!performedAt || !isFiniteNumber(typeOrder)) return

          const order = typeOrder + 1
          if (!Number.isFinite(order) || order <= 0) return

          const key = `${exerciseId}::${category}|${setType}|${order}`

          const existing = patternMemories[key]
          const existingAt =
            existing?.performedAt instanceof Date ? existing.performedAt : undefined
          if (existingAt && existingAt.getTime() >= performedAt.getTime()) return

          patternMemories[key] = {
            exerciseId,
            category,
            setType,
            order,
            performedAt,
            weight: isFiniteNumber(m?.weight) ? m.weight : undefined,
            reps: isFiniteNumber(m?.reps) ? m.reps : undefined,
            time: isFiniteNumber(m?.time) ? m.time : undefined,
            distance: isFiniteNumber(m?.distance) ? m.distance : undefined,
            restTime: undefined,
          }
        })
      })
    })
  }

  return {
    ...base,
    patternMemories,
    personalRecords,
  }
}

export interface PerformanceMemoryStore extends Instance<typeof PerformanceMemoryStoreModel> {}
export interface PerformanceMemoryStoreSnapshotIn extends SnapshotIn<
  typeof PerformanceMemoryStoreModel
> {}
export interface PerformanceMemoryStoreSnapshotOut extends SnapshotOut<
  typeof PerformanceMemoryStoreModel
> {}
