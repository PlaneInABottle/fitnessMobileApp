import { cast, getRoot, Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import { ExerciseSetFieldKey } from "./ExerciseStore"
import { SetData, SetTypeId } from "./SetStore"
import { generateId, sanitizeText, toFiniteNumber } from "./utils/common"
import { calculateTotalVolume } from "./utils/calculations"
import { SET_TYPE_IDS } from "./utils/constants"

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
  isDone: types.optional(types.boolean, false),
})

export interface ExerciseSet extends Instance<typeof ExerciseSetModel> {}
export interface ExerciseSetSnapshotIn extends SnapshotIn<typeof ExerciseSetModel> {}
export interface ExerciseSetSnapshotOut extends SnapshotOut<typeof ExerciseSetModel> {}

export const WorkoutExerciseModel = types.model("WorkoutExercise", {
  id: types.identifier,
  exerciseId: types.string,
  notes: types.optional(types.string, ""),
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
  templateId: types.maybe(types.string),
})

export interface WorkoutSession extends Instance<typeof WorkoutSessionModel> {}
export interface WorkoutSessionSnapshotIn extends SnapshotIn<typeof WorkoutSessionModel> {}
export interface WorkoutSessionSnapshotOut extends SnapshotOut<typeof WorkoutSessionModel> {}

export const TemplateSetModel = types.model("TemplateSet", {
  setType: types.enumeration("TemplateSetType", [...SET_TYPE_IDS]),
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
})

export interface TemplateSet extends Instance<typeof TemplateSetModel> {}
export interface TemplateSetSnapshotIn extends SnapshotIn<typeof TemplateSetModel> {}
export interface TemplateSetSnapshotOut extends SnapshotOut<typeof TemplateSetModel> {}

export const TemplateExerciseModel = types.model("TemplateExercise", {
  exerciseId: types.string,
  sets: types.optional(types.array(TemplateSetModel), []),
})

export interface TemplateExercise extends Instance<typeof TemplateExerciseModel> {}
export interface TemplateExerciseSnapshotIn extends SnapshotIn<typeof TemplateExerciseModel> {}
export interface TemplateExerciseSnapshotOut extends SnapshotOut<typeof TemplateExerciseModel> {}

export const WorkoutTemplateModel = types.model("WorkoutTemplate", {
  id: types.identifier,
  name: types.string,
  exerciseIds: types.optional(types.array(types.string), []),
  exercises: types.optional(types.array(TemplateExerciseModel), []),
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
  .views((self) => ({
    /**
     * Calculate total volume (kg) for the current session
     * Volume = sum of (weight * reps) for all sets (both completed and incomplete)
     */
    get totalVolume(): number {
      if (!self.currentSession) return 0
      return self.currentSession.exercises.reduce(
        (total, exercise) => total + calculateTotalVolume(exercise.sets),
        0,
      )
    },

    /**
     * Count of all sets in the current session
     */
    get totalSetsCount(): number {
      if (!self.currentSession) return 0
      return self.currentSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    },

    /**
     * Count of completed sets (isDone) in the current session.
     */
    get completedSetsCount(): number {
      if (!self.currentSession) return 0
      return self.currentSession.exercises.reduce((count, exercise) => {
        return count + exercise.sets.filter((set) => set.isDone).length
      }, 0)
    },

    /**
     * Total volume (kg) for completed sets in the current session.
     * Volume = sum of (weight * reps) for all sets where isDone === true.
     */
    get completedVolumeKg(): number {
      if (!self.currentSession) return 0
      return self.currentSession.exercises.reduce(
        (total, exercise) => total + calculateTotalVolume(exercise.sets, true),
        0,
      )
    },

    /**
     * Get the template associated with the current session, if any
     */
    get currentTemplate(): WorkoutTemplate | undefined {
      if (!self.currentSession?.templateId) return undefined
      return self.templates.get(self.currentSession.templateId)
    },

    /**
     * Get templates sorted by most recently used
     */
    get recentTemplates(): WorkoutTemplate[] {
      return Array.from(self.templates.values()).sort((a, b) => {
        const aTime = a.lastUsedAt?.getTime() ?? 0
        const bTime = b.lastUsedAt?.getTime() ?? 0
        return bTime - aTime
      })
    },
  }))
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
        isDone: setData.isDone ?? false,
      }
    }

    function buildDefaultWorkingSetData(
      exerciseId: string,
      root: RootWithWorkoutDeps,
    ): Partial<SetData> {
      const required = root.exerciseStore.getRequiredFieldsForExercise(exerciseId)
      const base: Partial<SetData> = { setType: "working" }
      required.forEach((k) => {
        ;(base as any)[k] = 0
      })
      return base
    }

    function buildDefaultWorkingSetSnapshot(
      exerciseId: string,
      root: RootWithWorkoutDeps,
    ): ExerciseSetSnapshotIn {
      const setData = buildDefaultWorkingSetData(exerciseId, root)
      return {
        id: generateId(),
        ...buildSetSnapshot(setData),
      }
    }

    function buildTemplateExercisesFromSession(
      session: WorkoutSession,
    ): TemplateExerciseSnapshotIn[] {
      return session.exercises.map((we) => ({
        exerciseId: we.exerciseId,
        sets: (we.sets ?? []).map((s) => ({
          setType: s.setType as SetTypeId,
          weight: toFiniteNumber(s.weight),
          reps: toFiniteNumber(s.reps),
          time: toFiniteNumber(s.time),
          distance: toFiniteNumber(s.distance),
          restTime: toFiniteNumber(s.restTime),
        })),
      }))
    }

    function buildWorkoutExercisesFromTemplate(
      template: WorkoutTemplate,
      root: RootWithWorkoutDeps,
    ): WorkoutExerciseSnapshotIn[] {
      return (template.exercises ?? []).map((te) => {
        if (!root.exerciseStore.hasExercise(te.exerciseId)) throw new Error("Invalid exerciseId")

        const sets = te.sets.length
          ? te.sets.map((s) => {
              const setData: Partial<SetData> = {
                ...buildDefaultWorkingSetData(te.exerciseId, root),
                setType: s.setType as SetTypeId,
              }

              const validation = root.setStore.validateSetData(te.exerciseId, setData)
              if (!validation.ok) throw new Error(validation.error)

              return {
                id: generateId(),
                ...buildSetSnapshot(setData),
              }
            })
          : [buildDefaultWorkingSetSnapshot(te.exerciseId, root)]

        return {
          id: generateId(),
          exerciseId: te.exerciseId,
          sets,
        }
      })
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
          sets: [buildDefaultWorkingSetSnapshot(exerciseId, root)],
        }),
      )
      return workoutExerciseId
    }

    function startSessionFromTemplateUnsafe(templateId: string) {
      if (self.currentSession) throw new Error("Session already active")

      const root = getAttachedRoot()
      const template = self.templates.get(templateId)
      if (!template) throw new Error("Invalid templateId")

      if (template.exercises.length > 0) {
        self.currentSession = cast({
          id: generateId(),
          templateId,
          exercises: buildWorkoutExercisesFromTemplate(template, root),
          startedAt: new Date(),
        })
        return
      }

      const ids = template.exerciseIds.slice()
      ids.forEach((exerciseId) => {
        if (!root.exerciseStore.hasExercise(exerciseId)) throw new Error("Invalid exerciseId")
      })

      self.currentSession = cast({
        id: generateId(),
        templateId,
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

    function updateWorkoutExerciseNotesUnsafe(workoutExerciseId: string, notes: string) {
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      workoutExercise.notes = notes
    }

    function updateSetInWorkoutExerciseUnsafe(
      workoutExerciseId: string,
      setId: string,
      patch: Partial<SetData>,
    ) {
      const root = getAttachedRoot()
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      const set = workoutExercise.sets.find((s) => s.id === setId)
      if (!set) throw new Error("Set not found")

      const merged: Partial<SetData> = {
        setType: patch.setType !== undefined ? patch.setType : set.setType,
        weight: patch.weight !== undefined ? patch.weight : set.weight,
        reps: patch.reps !== undefined ? patch.reps : set.reps,
        time: patch.time !== undefined ? patch.time : set.time,
        distance: patch.distance !== undefined ? patch.distance : set.distance,
        restTime: patch.restTime !== undefined ? patch.restTime : set.restTime,
        isDone: patch.isDone !== undefined ? patch.isDone : set.isDone,
      }

      const validation = root.setStore.validateSetData(workoutExercise.exerciseId, merged)
      if (!validation.ok) throw new Error(validation.error)

      set.setType = merged.setType as SetTypeId
      set.weight = merged.weight as any
      set.reps = merged.reps as any
      set.time = merged.time as any
      set.distance = merged.distance as any
      set.restTime = merged.restTime as any
      set.isDone = merged.isDone as any
    }

    function completeSessionUnsafe(skipTemplateUpdate: boolean = false) {
      const root = getAttachedRoot()
      const session = requireCurrentSession()

      const now = new Date()
      session.completedAt = now

      // Build workout data without getSnapshot for performance
      root.performanceMemoryStore.recordCompletedWorkout({
        completedAt: now,
        exercises: session.exercises
          .map((we) => {
            const category = root.exerciseStore.getExerciseCategory(we.exerciseId)
            if (!category) return undefined

            // Filter to only completed sets
            const completedSets = we.sets
              .filter((s) => s.isDone)
              .map((s) => ({
                setType: s.setType,
                weight: s.weight,
                reps: s.reps,
                time: s.time,
                distance: s.distance,
                restTime: s.restTime,
              }))

            // Skip exercises with no completed sets
            if (completedSets.length === 0) return undefined

            return {
              exerciseId: we.exerciseId,
              category,
              sets: completedSets,
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      })

      // Auto-update template with completed workout values
      if (!skipTemplateUpdate && session.templateId) {
        const template = self.templates.get(session.templateId)
        if (template) {
          template.exercises = cast(buildTemplateExercisesFromSession(session))
          template.exerciseIds = cast(session.exercises.map((we) => we.exerciseId))
          template.lastUsedAt = now
        }
      }

      // Build history entry without notes (for UX only)
      const historyEntry = {
        id: session.id,
        templateId: session.templateId,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        exercises: session.exercises.map((we) => ({
          id: we.id,
          exerciseId: we.exerciseId,
          notes: "", // Notes are for active session UX only
          sets: we.sets.map((s) => ({
            id: s.id,
            setType: s.setType,
            weight: s.weight,
            reps: s.reps,
            time: s.time,
            distance: s.distance,
            restTime: s.restTime,
            isDone: s.isDone,
          })),
        })),
      }

      self.currentSession = undefined
      self.sessionHistory.push(cast(historyEntry))
    }

    function createTemplateUnsafe(name: string, exerciseIds: string[]): string {
      const root = getAttachedRoot()
      const sanitizedName = sanitizeText(name)
      if (!sanitizedName) throw new Error("Template name is required")

      const sanitizedExerciseIds = exerciseIds.map((id) => sanitizeText(id)).filter(Boolean)
      sanitizedExerciseIds.forEach((id) => {
        if (!root.exerciseStore.hasExercise(id)) throw new Error("Invalid exerciseId")
      })

      let id = generateId()
      while (self.templates.has(id)) id = generateId()

      self.templates.set(id, {
        id,
        name: sanitizedName,
        exerciseIds: sanitizedExerciseIds,
        exercises: [],
        lastUsedAt: new Date(),
      })

      return id
    }

    function createTemplateFromSessionUnsafe(name: string): string {
      const session = requireCurrentSession()
      const id = createTemplateUnsafe(
        name,
        session.exercises.map((we) => we.exerciseId),
      )

      const template = self.templates.get(id)
      if (template) template.exercises = cast(buildTemplateExercisesFromSession(session))

      return id
    }

    function deleteSetFromWorkoutExerciseUnsafe(workoutExerciseId: string, setId: string) {
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      const setIndex = workoutExercise.sets.findIndex((s) => s.id === setId)
      if (setIndex === -1) throw new Error("Set not found")
      workoutExercise.sets.splice(setIndex, 1)
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

      buildDefaultSetData(exerciseId: string): Partial<SetData> {
        const root = getAttachedRoot()
        return buildDefaultWorkingSetData(exerciseId, root)
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

      updateSetInWorkoutExercise(
        workoutExerciseId: string,
        setId: string,
        patch: Partial<SetData>,
      ): boolean {
        try {
          updateSetInWorkoutExerciseUnsafe(workoutExerciseId, setId, patch)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      updateWorkoutExerciseNotes(workoutExerciseId: string, notes: string): boolean {
        try {
          updateWorkoutExerciseNotesUnsafe(workoutExerciseId, notes)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      completeSession(skipTemplateUpdate: boolean = false): boolean {
        try {
          completeSessionUnsafe(skipTemplateUpdate)
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

      getTemplateUpdateSummary(templateId: string):
        | {
            addedExerciseIds: string[]
            removedExerciseIds: string[]
            addedSets: number
            removedSets: number
          }
        | undefined {
        const session = self.currentSession
        const template = self.templates.get(templateId)
        if (!session || !template) return undefined

        const sessionExerciseIds = session.exercises.map((we) => we.exerciseId)
        const templateExerciseIds = template.exerciseIds.slice()

        const sessionSet = new Set(sessionExerciseIds)
        const templateSet = new Set(templateExerciseIds)

        const addedExerciseIds = Array.from(sessionSet).filter((id) => !templateSet.has(id))
        const removedExerciseIds = Array.from(templateSet).filter((id) => !sessionSet.has(id))

        const sessionSetCounts = new Map<string, number>()
        for (const we of session.exercises) {
          sessionSetCounts.set(
            we.exerciseId,
            (sessionSetCounts.get(we.exerciseId) ?? 0) + we.sets.length,
          )
        }

        let addedSets = 0
        let removedSets = 0

        // Added exercises: baseline is 0 sets; count all session sets as added.
        for (const exerciseId of addedExerciseIds) {
          addedSets += sessionSetCounts.get(exerciseId) ?? 0
        }

        const templateBaselineSetCounts = new Map<string, number>()
        for (const exerciseId of templateExerciseIds) {
          const storedCount = template.exercises
            .filter((e) => e.exerciseId === exerciseId)
            .reduce((sum, e) => sum + e.sets.length, 0)
          templateBaselineSetCounts.set(exerciseId, storedCount > 0 ? storedCount : 1)
        }

        // Removed exercises: baseline is template set count when available, else 1.
        for (const exerciseId of removedExerciseIds) {
          removedSets += templateBaselineSetCounts.get(exerciseId) ?? 1
        }

        // Exercises present in both: baseline is template set count when available, else 1.
        for (const exerciseId of Array.from(sessionSet).filter((id) => templateSet.has(id))) {
          const baselineCount = templateBaselineSetCounts.get(exerciseId) ?? 1
          const sessionCount = sessionSetCounts.get(exerciseId) ?? 0
          if (sessionCount > baselineCount) addedSets += sessionCount - baselineCount
          if (sessionCount < baselineCount) removedSets += baselineCount - sessionCount
        }

        return { addedExerciseIds, removedExerciseIds, addedSets, removedSets }
      },

      updateTemplateFromCurrentSession(templateId: string): boolean {
        try {
          const session = requireCurrentSession()
          const template = self.templates.get(templateId)
          if (!template) throw new Error("Invalid templateId")

          template.exerciseIds = cast(session.exercises.map((we) => we.exerciseId))
          template.exercises = cast(buildTemplateExercisesFromSession(session))
          template.lastUsedAt = new Date()

          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      deleteSetFromWorkoutExercise(workoutExerciseId: string, setId: string): boolean {
        try {
          deleteSetFromWorkoutExerciseUnsafe(workoutExerciseId, setId)
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
