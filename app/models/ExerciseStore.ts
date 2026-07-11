import { getSnapshot, Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

import {
  CATALOG_MUSCLE_GROUPS,
  EXERCISE_CATALOG,
  getCatalogExercise,
  type CatalogExercise,
} from "@/data/exerciseCatalog"

import { generateId, sanitizeText } from "./utils/common"

export const EXERCISE_CATEGORY_VALUES = ["STRENGTH", "BODYWEIGHT", "TIMED", "CARDIO"] as const
export type ExerciseCategory = (typeof EXERCISE_CATEGORY_VALUES)[number]

export const MUSCLE_GROUPS = CATALOG_MUSCLE_GROUPS
export type MuscleGroup = string

export type ExerciseSetFieldKey = "weight" | "reps" | "time" | "distance" | "restTime"

// Set fields required/optional based on exercise category.
export const EXERCISE_CATEGORIES = {
  STRENGTH: { required: ["weight", "reps"], optional: ["restTime"] },
  BODYWEIGHT: { required: ["reps"], optional: ["restTime"] },
  TIMED: { required: ["time"], optional: ["restTime"] },
  CARDIO: { required: ["time"], optional: ["distance"] },
} as const satisfies Record<
  ExerciseCategory,
  { required: readonly ExerciseSetFieldKey[]; optional: readonly ExerciseSetFieldKey[] }
>

const MAX_EXERCISE_NAME_LENGTH = 80
const MAX_EXERCISE_INSTRUCTIONS_LENGTH = 2000
const MAX_EXERCISE_IMAGE_URL_LENGTH = 2048

function sanitizeImageUrl(value: string): string {
  const sanitized = sanitizeText(value, MAX_EXERCISE_IMAGE_URL_LENGTH)
  if (!sanitized) throw new Error("Invalid imageUrl")
  if (!/^https?:\/\//i.test(sanitized) || /\s/.test(sanitized)) throw new Error("Invalid imageUrl")
  return sanitized
}

function normalizeSearchText(value: string): string {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export const ExerciseModel = types.model("Exercise", {
  id: types.identifier,
  name: types.string,
  category: types.enumeration("ExerciseCategory", [...EXERCISE_CATEGORY_VALUES]),
  muscleGroups: types.optional(types.array(types.string), []),
  instructions: types.maybe(types.string),
  imageUrl: types.maybe(types.string),
})

export interface Exercise {
  id: string
  sourceId?: string
  name: string
  category: ExerciseCategory
  muscleGroups: readonly string[]
  instructions?: string
  imageUrl?: string
  sourceCategory?: string
  primaryMuscles?: readonly string[]
  secondaryMuscles?: readonly string[]
  equipment?: string
  level?: string
  force?: string
  mechanic?: string
  instructionSteps?: readonly string[]
  hasImages?: boolean
}

export interface CustomExercise extends Instance<typeof ExerciseModel> {}
export interface ExerciseSnapshotIn extends SnapshotIn<typeof ExerciseModel> {}
export interface ExerciseSnapshotOut extends SnapshotOut<typeof ExerciseModel> {}

export type ExerciseInput = Omit<Partial<ExerciseSnapshotIn>, "id"> & {
  id?: string
  name: string
  category: ExerciseCategory
  muscleGroups?: string[]
}

const LEGACY_DEFAULT_IDS = [
  "bench-press",
  "squat",
  "deadlift",
  "overhead-press",
  "pull-up",
  "plank",
  "running",
] as const

const LEGACY_DEFAULT_SNAPSHOTS: Record<string, ExerciseSnapshotIn> = {
  "bench-press": {
    id: "bench-press",
    name: "Bench Press",
    category: "STRENGTH",
    muscleGroups: ["chest", "triceps", "shoulders"],
  },
  "squat": {
    id: "squat",
    name: "Squat",
    category: "STRENGTH",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
  },
  "deadlift": {
    id: "deadlift",
    name: "Deadlift",
    category: "STRENGTH",
    muscleGroups: ["back", "glutes", "hamstrings"],
  },
  "overhead-press": {
    id: "overhead-press",
    name: "Overhead Press",
    category: "STRENGTH",
    muscleGroups: ["shoulders", "triceps"],
  },
  "pull-up": {
    id: "pull-up",
    name: "Pull Up",
    category: "BODYWEIGHT",
    muscleGroups: ["back", "biceps"],
  },
  "plank": {
    id: "plank",
    name: "Plank",
    category: "TIMED",
    muscleGroups: ["core"],
  },
  "running": { id: "running", name: "Running", category: "CARDIO", muscleGroups: [] },
}

function isUnmodifiedLegacyDefault(id: string, value: any): boolean {
  const expected = LEGACY_DEFAULT_SNAPSHOTS[id]
  if (!expected || !value || typeof value !== "object") return false
  return (
    value.id === expected.id &&
    value.name === expected.name &&
    value.category === expected.category &&
    JSON.stringify(value.muscleGroups ?? []) === JSON.stringify(expected.muscleGroups ?? []) &&
    value.instructions == null &&
    value.imageUrl == null
  )
}

function mergeCatalogOverride(
  catalogExercise: CatalogExercise,
  override?: CustomExercise,
): Exercise {
  if (!override) return catalogExercise
  return { ...catalogExercise, ...getSnapshot(override) }
}

export const ExerciseStoreModel = types
  .model("ExerciseStore", {
    customExercises: types.optional(types.map(ExerciseModel), {}),
    hiddenCatalogExerciseIds: types.optional(types.array(types.string), []),
  })
  .views((self) => ({
    get exercises(): ReadonlyMap<string, Exercise> {
      const hidden = new Set(self.hiddenCatalogExerciseIds)
      const exercises = new Map<string, Exercise>()

      EXERCISE_CATALOG.forEach((catalogExercise) => {
        if (hidden.has(catalogExercise.id)) return
        exercises.set(
          catalogExercise.id,
          mergeCatalogOverride(catalogExercise, self.customExercises.get(catalogExercise.id)),
        )
      })

      self.customExercises.forEach((customExercise, id) => {
        const exerciseId = String(id)
        if (!getCatalogExercise(exerciseId)) exercises.set(exerciseId, customExercise)
      })
      return exercises
    },

    get allExercises(): Exercise[] {
      return Array.from(this.exercises.values())
    },

    getExercise(id: string): Exercise | undefined {
      if (self.hiddenCatalogExerciseIds.includes(id)) return undefined
      const customExercise = self.customExercises.get(id)
      const catalogExercise = getCatalogExercise(id)
      if (catalogExercise) return mergeCatalogOverride(catalogExercise, customExercise)
      return customExercise
    },

    hasExercise(id: string): boolean {
      return this.getExercise(id) !== undefined
    },

    getExerciseCategory(id: string): ExerciseCategory | undefined {
      if (self.hiddenCatalogExerciseIds.includes(id)) return undefined
      return self.customExercises.get(id)?.category ?? getCatalogExercise(id)?.category
    },

    getExercisesByCategory(category: ExerciseCategory): Exercise[] {
      return this.allExercises.filter((exercise) => exercise.category === category)
    },

    searchExercises(query: string): Exercise[] {
      const q = normalizeSearchText(query)
      if (!q) return this.allExercises

      return this.allExercises.filter((exercise) => {
        if (normalizeSearchText(exercise.name).includes(q)) return true
        if (exercise.sourceId && normalizeSearchText(exercise.sourceId).includes(q)) return true
        if (normalizeSearchText(exercise.category).includes(q)) return true
        if (exercise.sourceCategory && normalizeSearchText(exercise.sourceCategory).includes(q)) {
          return true
        }
        if (exercise.equipment && normalizeSearchText(exercise.equipment).includes(q)) return true
        return exercise.muscleGroups.some((muscle) => normalizeSearchText(muscle).includes(q))
      })
    },

    getRequiredFieldsForExercise(id: string): readonly ExerciseSetFieldKey[] {
      const category =
        self.customExercises.get(id)?.category ??
        (self.hiddenCatalogExerciseIds.includes(id) ? undefined : getCatalogExercise(id)?.category)
      return category ? EXERCISE_CATEGORIES[category].required : []
    },
  }))
  .actions((self) => ({
    addExercise(exercise: ExerciseInput): string {
      const providedId = sanitizeText(exercise.id ?? "")
      let id = providedId || generateId()
      const idExists = (candidate: string) =>
        self.customExercises.has(candidate) || getCatalogExercise(candidate) !== undefined

      if (providedId) {
        let suffix = 1
        while (idExists(id)) {
          id = `${providedId}-${suffix++}`
        }
      } else {
        let attempts = 0
        const maxAttempts = 100
        while (idExists(id)) {
          if (++attempts >= maxAttempts) {
            throw new Error("Failed to generate unique exercise ID after maximum attempts")
          }
          id = generateId()
        }
      }

      const name = sanitizeText(exercise.name, MAX_EXERCISE_NAME_LENGTH)
      if (!name) throw new Error("Exercise name is required")

      self.customExercises.set(id, {
        id,
        name,
        category: exercise.category,
        muscleGroups: (exercise.muscleGroups ?? []).map(sanitizeText).filter(Boolean),
        instructions: exercise.instructions
          ? sanitizeText(exercise.instructions, MAX_EXERCISE_INSTRUCTIONS_LENGTH)
          : undefined,
        imageUrl: exercise.imageUrl ? sanitizeImageUrl(exercise.imageUrl) : undefined,
      })

      return id
    },

    updateExercise(id: string, patch: Partial<Omit<ExerciseInput, "id">>): boolean {
      let exercise = self.customExercises.get(id)
      if (!exercise) {
        const catalogExercise = getCatalogExercise(id)
        if (!catalogExercise || self.hiddenCatalogExerciseIds.includes(id)) return false
        self.customExercises.set(id, {
          id,
          name: catalogExercise.name,
          category: catalogExercise.category,
          muscleGroups: [...catalogExercise.muscleGroups],
        })
        exercise = self.customExercises.get(id)
      }
      if (!exercise) return false

      if (patch.name !== undefined) {
        const name = sanitizeText(patch.name, MAX_EXERCISE_NAME_LENGTH)
        if (!name) throw new Error("Exercise name is required")
        exercise.name = name
      }

      if (patch.category !== undefined) {
        exercise.category = patch.category
      }

      if (patch.muscleGroups !== undefined) {
        exercise.muscleGroups.replace(patch.muscleGroups.map(sanitizeText).filter(Boolean))
      }

      if (patch.instructions !== undefined) {
        exercise.instructions = patch.instructions
          ? sanitizeText(patch.instructions, MAX_EXERCISE_INSTRUCTIONS_LENGTH)
          : undefined
      }

      if (patch.imageUrl !== undefined) {
        exercise.imageUrl = patch.imageUrl ? sanitizeImageUrl(patch.imageUrl) : undefined
      }

      return true
    },

    removeExercise(id: string): boolean {
      if (self.hiddenCatalogExerciseIds.includes(id)) return false
      if (getCatalogExercise(id)) {
        self.customExercises.delete(id)
        self.hiddenCatalogExerciseIds.push(id)
        return true
      }
      return self.customExercises.delete(id)
    },
  }))

export function migrateExerciseStoreSnapshot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const candidate = value as Record<string, any>

  if (candidate.customExercises && typeof candidate.customExercises === "object") {
    return {
      customExercises: candidate.customExercises,
      hiddenCatalogExerciseIds: Array.isArray(candidate.hiddenCatalogExerciseIds)
        ? candidate.hiddenCatalogExerciseIds.filter((id: unknown) => typeof id === "string")
        : [],
    }
  }

  const oldExercises =
    candidate.exercises && typeof candidate.exercises === "object" ? candidate.exercises : {}
  const customExercises = Object.fromEntries(
    Object.entries(oldExercises).filter(
      ([id, exercise]) => !isUnmodifiedLegacyDefault(id, exercise),
    ),
  )
  const hiddenCatalogExerciseIds = candidate.hasSeededDefaults
    ? LEGACY_DEFAULT_IDS.filter((id) => !(id in oldExercises))
    : []

  return { customExercises, hiddenCatalogExerciseIds }
}

export interface ExerciseStore extends Instance<typeof ExerciseStoreModel> {}
export interface ExerciseStoreSnapshotIn extends SnapshotIn<typeof ExerciseStoreModel> {}
export interface ExerciseStoreSnapshotOut extends SnapshotOut<typeof ExerciseStoreModel> {}
