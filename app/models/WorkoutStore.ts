import { cast, getRoot, Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import { ExerciseSetFieldKey } from "./ExerciseStore"
import { SetData, SetTypeId } from "./SetStore"
import { calculateTotalVolume } from "./utils/calculations"
import { generateId, sanitizeText, toFiniteNumber } from "./utils/common"
import { SET_TYPE_IDS } from "./utils/constants"

export const REST_TIME_OPTIONS = [0, 60, 90, 120, 180] as const
export type RestTimeSeconds = (typeof REST_TIME_OPTIONS)[number]
export const DEFAULT_REST_TIME_SECONDS: RestTimeSeconds = 90

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
      options?: { allowIncomplete?: boolean },
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
        notes?: string
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
  restTime: types.optional(types.number, DEFAULT_REST_TIME_SECONDS),
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
  restTimerEndsAt: types.maybe(types.Date),
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
  notes: types.optional(types.string, ""),
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
  .volatile(() => ({
    pendingRoutineExerciseId: undefined as string | undefined,
    lastAlertedRestTimerEndMs: undefined as number | undefined,
  }))
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

    getRestTimerRemainingSeconds(now: number = Date.now()): number {
      const endsAt = self.currentSession?.restTimerEndsAt
      if (!endsAt) return 0
      return Math.max(0, Math.ceil((endsAt.getTime() - now) / 1000))
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

    function requireRestTime(value: number): RestTimeSeconds {
      if (!REST_TIME_OPTIONS.includes(value as RestTimeSeconds)) {
        throw new Error("Invalid rest time")
      }
      return value as RestTimeSeconds
    }

    function buildDefaultWorkingSetSnapshot(
      exerciseId: string,
      root: RootWithWorkoutDeps,
      restTime: RestTimeSeconds = DEFAULT_REST_TIME_SECONDS,
    ): ExerciseSetSnapshotIn {
      const setData = { ...buildDefaultWorkingSetData(exerciseId, root), restTime }
      return {
        id: generateId(),
        ...buildSetSnapshot(setData),
      }
    }

    function buildTemplateExercisesFromSession(
      session: WorkoutSession,
      existingTemplate?: WorkoutTemplate,
    ): TemplateExerciseSnapshotIn[] {
      return session.exercises.map((we) => {
        const existingNotes = existingTemplate?.exercises.find(
          (e) => e.exerciseId === we.exerciseId,
        )?.notes

        const notes = we.notes.trim().length > 0 ? we.notes : (existingNotes ?? "")

        return {
          exerciseId: we.exerciseId,
          notes,
          sets: (we.sets ?? []).map((s) => ({
            setType: s.setType as SetTypeId,
            weight: toFiniteNumber(s.weight),
            reps: toFiniteNumber(s.reps),
            time: toFiniteNumber(s.time),
            distance: toFiniteNumber(s.distance),
            restTime: toFiniteNumber(s.restTime),
          })),
        }
      })
    }

    function buildWorkoutExercisesFromTemplate(
      template: WorkoutTemplate,
      root: RootWithWorkoutDeps,
    ): WorkoutExerciseSnapshotIn[] {
      return (template.exercises ?? []).map((te) => {
        if (!root.exerciseStore.hasExercise(te.exerciseId)) throw new Error("Invalid exerciseId")

        const restTime = requireRestTime(
          te.sets.find((set) => REST_TIME_OPTIONS.includes(set.restTime as RestTimeSeconds))
            ?.restTime ?? DEFAULT_REST_TIME_SECONDS,
        )

        const sets = te.sets.length
          ? te.sets.map((s) => {
              const setData: Partial<SetData> = {
                ...buildDefaultWorkingSetData(te.exerciseId, root),
                setType: s.setType as SetTypeId,
                restTime,
              }

              const validation = root.setStore.validateSetData(te.exerciseId, setData)
              if (!validation.ok) throw new Error(validation.error)

              return {
                id: generateId(),
                ...buildSetSnapshot(setData),
              }
            })
          : [buildDefaultWorkingSetSnapshot(te.exerciseId, root, restTime)]

        return {
          id: generateId(),
          exerciseId: te.exerciseId,
          restTime,
          sets,
        }
      })
    }

    function setError(error: unknown) {
      self.lastError = error instanceof Error ? error.message : String(error)
    }

    function startNewSessionUnsafe() {
      if (self.currentSession) throw new Error("Session already active")
      self.lastAlertedRestTimerEndMs = undefined

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
          restTime: DEFAULT_REST_TIME_SECONDS,
          sets: [buildDefaultWorkingSetSnapshot(exerciseId, root, DEFAULT_REST_TIME_SECONDS)],
        }),
      )
      return workoutExerciseId
    }

    function startSessionFromTemplateUnsafe(templateId: string) {
      if (self.currentSession) throw new Error("Session already active")
      self.lastAlertedRestTimerEndMs = undefined

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
      const setDataWithRest = {
        ...setData,
        restTime: setData.restTime ?? workoutExercise.restTime,
      }

      const validation = root.setStore.validateSetData(workoutExercise.exerciseId, setDataWithRest)
      if (!validation.ok) throw new Error(validation.error)

      workoutExercise.sets.push({
        id: generateId(),
        ...buildSetSnapshot(setDataWithRest),
      })
    }

    function updateWorkoutExerciseNotesUnsafe(workoutExerciseId: string, notes: string) {
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      workoutExercise.notes = notes
    }

    function setExerciseRestTimeUnsafe(workoutExerciseId: string, restTime: number) {
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      const nextRestTime = requireRestTime(restTime)

      workoutExercise.restTime = nextRestTime
      workoutExercise.sets.forEach((set) => {
        set.restTime = nextRestTime
      })

      if (nextRestTime === 0) requireCurrentSession().restTimerEndsAt = undefined
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
      const wasDone = set.isDone

      const hasPatch = (key: keyof SetData) => Object.prototype.hasOwnProperty.call(patch, key)
      const merged: Partial<SetData> = {
        setType: patch.setType !== undefined ? patch.setType : set.setType,
        weight: hasPatch("weight") ? patch.weight : set.weight,
        reps: hasPatch("reps") ? patch.reps : set.reps,
        time: hasPatch("time") ? patch.time : set.time,
        distance: hasPatch("distance") ? patch.distance : set.distance,
        restTime: hasPatch("restTime") ? patch.restTime : set.restTime,
        isDone: patch.isDone !== undefined ? patch.isDone : set.isDone,
      }

      const validation = root.setStore.validateSetData(workoutExercise.exerciseId, merged, {
        allowIncomplete: !merged.isDone,
      })
      if (!validation.ok) throw new Error(validation.error)

      set.setType = merged.setType as SetTypeId
      set.weight = merged.weight as any
      set.reps = merged.reps as any
      set.time = merged.time as any
      set.distance = merged.distance as any
      set.restTime = merged.restTime as any
      set.isDone = merged.isDone as any

      if (!wasDone && set.isDone && (set.restTime ?? workoutExercise.restTime) > 0) {
        requireCurrentSession().restTimerEndsAt = new Date(
          Date.now() + (set.restTime ?? workoutExercise.restTime) * 1000,
        )
      }
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

            const notes = we.notes
            const hasNotes = typeof notes === "string" && notes.trim().length > 0

            // Skip exercises only if there is no completed work and no notes.
            if (completedSets.length === 0 && !hasNotes) return undefined

            return {
              exerciseId: we.exerciseId,
              category,
              sets: completedSets,
              notes,
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      })

      // Auto-update template with completed workout values
      if (!skipTemplateUpdate && session.templateId) {
        const template = self.templates.get(session.templateId)
        if (template) {
          template.exercises = cast(buildTemplateExercisesFromSession(session, template))
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

    function updateTemplateUnsafe(templateId: string, name: string, exerciseIds: string[]): void {
      const root = getAttachedRoot()
      const template = self.templates.get(templateId)
      if (!template) throw new Error("Template not found")

      const sanitizedName = sanitizeText(name)
      if (!sanitizedName) throw new Error("Template name is required")

      const sanitizedExerciseIds = exerciseIds.map((id) => sanitizeText(id)).filter(Boolean)
      sanitizedExerciseIds.forEach((id) => {
        if (!root.exerciseStore.hasExercise(id)) throw new Error("Invalid exerciseId")
      })

      template.name = sanitizedName
      template.exerciseIds.replace(sanitizedExerciseIds)

      // If the template already has per-exercise data (from completing a workout),
      // keep it consistent with the edited exerciseIds.
      if (template.exercises.length > 0) {
        const existingById = new Map(template.exercises.map((e) => [e.exerciseId, e]))

        template.exercises = cast(
          sanitizedExerciseIds.map((exerciseId) => {
            const existing = existingById.get(exerciseId)
            if (existing) {
              return {
                exerciseId,
                notes: existing.notes,
                sets: existing.sets.map((s) => ({
                  setType: s.setType,
                  weight: s.weight,
                  reps: s.reps,
                  time: s.time,
                  distance: s.distance,
                  restTime: s.restTime,
                })),
              }
            }
            return { exerciseId, notes: "", sets: [] }
          }),
        )
      }
    }

    function deleteSetFromWorkoutExerciseUnsafe(workoutExerciseId: string, setId: string) {
      const workoutExercise = requireWorkoutExercise(workoutExerciseId)
      const setIndex = workoutExercise.sets.findIndex((s) => s.id === setId)
      if (setIndex === -1) throw new Error("Set not found")
      workoutExercise.sets.splice(setIndex, 1)
    }

    function addRestTimerSecondsUnsafe(seconds: number) {
      const session = requireCurrentSession()
      if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Invalid timer extension")

      const currentEnd = session.restTimerEndsAt?.getTime() ?? 0
      session.restTimerEndsAt = new Date(Math.max(Date.now(), currentEnd) + seconds * 1000)
    }

    function skipRestTimerUnsafe() {
      requireCurrentSession().restTimerEndsAt = undefined
    }

    return {
      clearError() {
        self.lastError = undefined
      },

      setPendingRoutineExerciseId(exerciseId: string) {
        self.pendingRoutineExerciseId = exerciseId
      },

      consumePendingRoutineExerciseId(): string | undefined {
        const exerciseId = self.pendingRoutineExerciseId
        self.pendingRoutineExerciseId = undefined
        return exerciseId
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

      setExerciseRestTime(workoutExerciseId: string, restTime: number): boolean {
        try {
          setExerciseRestTimeUnsafe(workoutExerciseId, restTime)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      addRestTimerSeconds(seconds: number): boolean {
        try {
          addRestTimerSecondsUnsafe(seconds)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      skipRestTimer(): boolean {
        try {
          skipRestTimerUnsafe()
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
        }
      },

      consumeRestTimerExpiry(): boolean {
        const endMs = self.currentSession?.restTimerEndsAt?.getTime()
        if (endMs === undefined || endMs > Date.now() || self.lastAlertedRestTimerEndMs === endMs) {
          return false
        }

        self.lastAlertedRestTimerEndMs = endMs
        return true
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

      updateTemplate(templateId: string, name: string, exerciseIds: string[]): boolean {
        try {
          updateTemplateUnsafe(templateId, name, exerciseIds)
          self.lastError = undefined
          return true
        } catch (e) {
          setError(e)
          return false
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
          template.exercises = cast(buildTemplateExercisesFromSession(session, template))
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
