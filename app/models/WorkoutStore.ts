import {
  cast,
  getRoot,
  getSnapshot,
  Instance,
  SnapshotIn,
  SnapshotOut,
  types,
} from "mobx-state-tree"

import { ExerciseSetFieldKey } from "./ExerciseStore"
import { SetData, SetTypeId } from "./SetStore"

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const SET_TYPE_IDS: readonly SetTypeId[] = ["warmup", "working", "dropset"] as const

type RootWithWorkoutDeps = {
  exerciseStore: {
    hasExercise(id: string): boolean
    getRequiredFieldsForExercise(id: string): readonly ExerciseSetFieldKey[]
    getExerciseCategory(id: string): "STRENGTH" | "BODYWEIGHT" | "TIMED" | "CARDIO" | undefined
  }
  setStore: {
    validateSetData(
      exerciseId: string,
      setData: Partial<SetData> | null | undefined,
    ):
      | { ok: true }
      | {
          ok: false
          error: string
        }
  }
  performanceMemoryStore: {
    recordCompletedWorkout(workout: {
      completedAt: Date
      exercises: Array<{
        exerciseId: string
        category: "STRENGTH" | "BODYWEIGHT" | "TIMED" | "CARDIO"
        sets: Array<{
          setType: SetTypeId
          weight?: number
          reps?: number
          time?: number
          distance?: number
          restTime?: number
        }>
      }>
    }): void
  }
}

export const ExerciseSetModel = types.model("ExerciseSet", {
  id: types.identifier,
  setType: types.enumeration("SetType", [...SET_TYPE_IDS]),
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
})

export interface ExerciseSet extends Instance<typeof ExerciseSetModel> {}
export interface ExerciseSetSnapshotIn extends SnapshotIn<typeof ExerciseSetModel> {}
export interface ExerciseSetSnapshotOut extends SnapshotOut<typeof ExerciseSetModel> {}

export const WorkoutExerciseModel = types.model("WorkoutExercise", {
  id: types.identifier,
  exerciseId: types.string,
  sets: types.optional(types.array(ExerciseSetModel), []),
})

export interface WorkoutExercise extends Instance<typeof WorkoutExerciseModel> {}
export interface WorkoutExerciseSnapshotIn extends SnapshotIn<typeof WorkoutExerciseModel> {}
export interface WorkoutExerciseSnapshotOut extends SnapshotOut<typeof WorkoutExerciseModel> {}

export const WorkoutSessionModel = types.model("WorkoutSession", {
  id: types.identifier,
  exercises: types.optional(types.array(WorkoutExerciseModel), []),
  startedAt: types.Date,
  completedAt: types.maybe(types.Date),
})

export interface WorkoutSession extends Instance<typeof WorkoutSessionModel> {}
export interface WorkoutSessionSnapshotIn extends SnapshotIn<typeof WorkoutSessionModel> {}
export interface WorkoutSessionSnapshotOut extends SnapshotOut<typeof WorkoutSessionModel> {}

export const WorkoutTemplateModel = types.model("WorkoutTemplate", {
  id: types.identifier,
  name: types.string,
  exerciseIds: types.optional(types.array(types.string), []),
  lastUsedAt: types.maybe(types.Date),
})

export interface WorkoutTemplate extends Instance<typeof WorkoutTemplateModel> {}
export interface WorkoutTemplateSnapshotIn extends SnapshotIn<typeof WorkoutTemplateModel> {}
export interface WorkoutTemplateSnapshotOut extends SnapshotOut<typeof WorkoutTemplateModel> {}

export const WorkoutStoreModel = types
  .model("WorkoutStore", {
    currentSession: types.maybe(WorkoutSessionModel),
    templates: types.optional(types.map(WorkoutTemplateModel), {}),
    sessionHistory: types.optional(types.array(WorkoutSessionModel), []),
    lastError: types.maybe(types.string),
  })
  .actions((self) => {
    function requireCurrentSession(): WorkoutSession {
      if (!self.currentSession) throw new Error("No active session")
      return self.currentSession
    }

    function getAttachedRoot(): RootWithWorkoutDeps {
      try {
        return getRoot<RootWithWorkoutDeps>(self)
      } catch {
        throw new Error("WorkoutStore is not attached")
      }
    }

    function requireWorkoutExercise(id: string): WorkoutExercise {
      const session = requireCurrentSession()
      const exercise = session.exercises.find((e) => e.id === id)
      if (!exercise) throw new Error("Invalid workoutExerciseId")
      return exercise
    }

    function buildSetSnapshot(setData: Partial<SetData>): Omit<ExerciseSetSnapshotIn, "id"> {
      return {
        setType: setData.setType as SetTypeId,
        weight: toFiniteNumber(setData.weight),
        reps: toFiniteNumber(setData.reps),
        time: toFiniteNumber(setData.time),
        distance: toFiniteNumber(setData.distance),
        restTime: toFiniteNumber(setData.restTime),
      }
    }

    function setError(error: unknown) {
      self.lastError = error instanceof Error ? error.message : String(error)
    }

    function startNewSessionUnsafe() {
      if (self.currentSession) throw new Error("Session already active")

      self.currentSession = cast({
        id: generateId(),
        exercises: [],
        startedAt: new Date(),
      })
    }

    function addExerciseToSessionUnsafe(exerciseId: string): string {
      const root = getAttachedRoot()
      if (!root.exerciseStore.hasExercise(exerciseId)) throw new Error("Invalid exerciseId")

      const session = requireCurrentSession()
      const workoutExerciseId = generateId()

      session.exercises.push(
        cast({
          id: workoutExerciseId,
          exerciseId,
          sets: [],
        }),
      )
      return workoutExerciseId
    }

    function startSessionFromTemplateUnsafe(templateId: string) {
      if (self.currentSession) throw new Error("Session already active")

      const root = getAttachedRoot()
      const template = self.templates.get(templateId)
      if (!template) throw new Error("Invalid templateId")

      const ids = template.exerciseIds.slice()
      ids.forEach((exerciseId) => {
        if (!root.exerciseStore.hasExercise(exerciseId)) throw new Error("Invalid exerciseId")
      })

      self.currentSession = cast({
        id: generateId(),
        exercises: [],
        startedAt: new Date(),
      })

      ids.forEach((exerciseId) => {
        addExerciseToSessionUnsafe(exerciseId)
      })
    }

    function addSetToWorkoutExerciseUnsafe(workoutExerciseId: string, setData: Partial<SetData>) {
      const root = getAttachedRoot()
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)

      const validation = root.setStore.validateSetData(workoutExercise.exerciseId, setData)
      if (!validation.ok) throw new Error(validation.error)

      workoutExercise.sets.push({
        id: generateId(),
        ...buildSetSnapshot(setData),
      })
    }

    function completeSessionUnsafe() {
      const root = getAttachedRoot()
      const session = requireCurrentSession()

      const now = new Date()
      session.completedAt = now

      const snapshot = getSnapshot(session)

      root.performanceMemoryStore.recordCompletedWorkout({
        completedAt: now,
        exercises: (snapshot.exercises ?? [])
          .map((we) => {
            const category = root.exerciseStore.getExerciseCategory(we.exerciseId)
            if (!category) return undefined

            return {
              exerciseId: we.exerciseId,
              category,
              sets: (we.sets ?? []).map((s) => ({
                setType: s.setType,
                weight: s.weight,
                reps: s.reps,
                time: s.time,
                distance: s.distance,
                restTime: s.restTime,
              })),
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      })

      self.currentSession = undefined
      self.sessionHistory.push(cast(snapshot))
    }

    function createTemplateUnsafe(name: string, exerciseIds: string[]): string {
      const root = getAttachedRoot()
      const sanitizedName = sanitizeText(name)
      if (!sanitizedName) throw new Error("Template name is required")

      const sanitizedExerciseIds = exerciseIds.map(sanitizeText).filter(Boolean)
      sanitizedExerciseIds.forEach((id) => {
        if (!root.exerciseStore.hasExercise(id)) throw new Error("Invalid exerciseId")
      })

      let id = generateId()
      while (self.templates.has(id)) id = generateId()

      self.templates.set(id, {
        id,
        name: sanitizedName,
        exerciseIds: sanitizedExerciseIds,
        lastUsedAt: new Date(),
      })

      return id
    }

    function createTemplateFromSessionUnsafe(name: string): string {
      const session = requireCurrentSession()
      return createTemplateUnsafe(
        name,
        session.exercises.map((we) => we.exerciseId),
      )
    }

    return {
      clearError() {
        self.lastError = undefined
      },

      startNewSession(): boolean {
        try {
          startNewSessionUnsafe()
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      startSessionFromTemplate(templateId: string): boolean {
        try {
          startSessionFromTemplateUnsafe(templateId)

          const template = self.templates.get(templateId)
          if (template) template.lastUsedAt = new Date()

          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      addExerciseToSession(exerciseId: string): string | undefined {
        try {
          const id = addExerciseToSessionUnsafe(exerciseId)
          self.lastError = undefined
          return id
        } catch (e) {
          setError(e)
          return undefined
        }
      },

      addSetToWorkoutExercise(workoutExerciseId: string, setData: Partial<SetData>): boolean {
        try {
          addSetToWorkoutExerciseUnsafe(workoutExerciseId, setData)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      completeSession(): boolean {
        try {
          completeSessionUnsafe()
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      createTemplate(name: string, exerciseIds: string[]): string | undefined {
        try {
          const id = createTemplateUnsafe(name, exerciseIds)
          self.lastError = undefined
          return id
        } catch (e) {
          setError(e)
          return undefined
        }
      },

      createTemplateFromSession(name: string): string | undefined {
        try {
          const id = createTemplateFromSessionUnsafe(name)
          self.lastError = undefined
          return id
        } catch (e) {
          setError(e)
          return undefined
        }
      },

      discardSession(): boolean {
        try {
          if (!self.currentSession) throw new Error("No active session")
          self.currentSession = undefined
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },
    }
  })

export interface WorkoutStore extends Instance<typeof WorkoutStoreModel> {}
export interface WorkoutStoreSnapshotIn extends SnapshotIn<typeof WorkoutStoreModel> {}
export interface WorkoutStoreSnapshotOut extends SnapshotOut<typeof WorkoutStoreModel> {}
