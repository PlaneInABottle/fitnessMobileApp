import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"

export const EXERCISE_CATEGORY_VALUES = ["STRENGTH", "BODYWEIGHT", "TIMED", "CARDIO"] as const
export type ExerciseCategory = (typeof EXERCISE_CATEGORY_VALUES)[number]

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

function sanitizeText(value: string, maxLength?: number): string {
  const sanitized = value.trim().replace(/\s+/g, " ")
  return maxLength ? sanitized.slice(0, maxLength) : sanitized
}

function sanitizeImageUrl(value: string): string {
  const sanitized = sanitizeText(value, MAX_EXERCISE_IMAGE_URL_LENGTH)
  if (!sanitized) throw new Error("Invalid imageUrl")
  if (!/^https?:\/\//i.test(sanitized) || /\s/.test(sanitized)) throw new Error("Invalid imageUrl")
  return sanitized
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export const ExerciseModel = types.model("Exercise", {
  id: types.identifier,
  name: types.string,
  category: types.enumeration("ExerciseCategory", [...EXERCISE_CATEGORY_VALUES]),
  muscleGroups: types.optional(types.array(types.string), []),
  instructions: types.maybe(types.string),
  imageUrl: types.maybe(types.string),
})

export interface Exercise extends Instance<typeof ExerciseModel> {}
export interface ExerciseSnapshotIn extends SnapshotIn<typeof ExerciseModel> {}
export interface ExerciseSnapshotOut extends SnapshotOut<typeof ExerciseModel> {}

export type ExerciseInput = Omit<Partial<ExerciseSnapshotIn>, "id"> & {
  id?: string
  name: string
  category: ExerciseCategory
  muscleGroups?: string[]
}

const DEFAULT_EXERCISES: ExerciseSnapshotIn[] = [
  {
    id: "bench-press",
    name: "Bench Press",
    category: "STRENGTH",
    muscleGroups: ["chest", "triceps", "shoulders"],
  },
  {
    id: "squat",
    name: "Squat",
    category: "STRENGTH",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    category: "STRENGTH",
    muscleGroups: ["back", "glutes", "hamstrings"],
  },
  {
    id: "overhead-press",
    name: "Overhead Press",
    category: "STRENGTH",
    muscleGroups: ["shoulders", "triceps"],
  },
  {
    id: "pull-up",
    name: "Pull Up",
    category: "BODYWEIGHT",
    muscleGroups: ["back", "biceps"],
  },
  {
    id: "plank",
    name: "Plank",
    category: "TIMED",
    muscleGroups: ["core"],
  },
  {
    id: "running",
    name: "Running",
    category: "CARDIO",
    muscleGroups: [],
  },
]

export const ExerciseStoreModel = types
  .model("ExerciseStore", {
    exercises: types.optional(types.map(ExerciseModel), {}),
    hasSeededDefaults: types.optional(types.boolean, false),
  })
  .views((self) => ({
    hasExercise(id: string): boolean {
      return self.exercises.has(id)
    },

    getExercisesByCategory(category: ExerciseCategory): Exercise[] {
      return Array.from(self.exercises.values()).filter((exercise) => exercise.category === category)
    },

    searchExercises(query: string): Exercise[] {
      const q = sanitizeText(query).toLowerCase()
      if (!q) return Array.from(self.exercises.values())

      return Array.from(self.exercises.values()).filter((exercise) => {
        if (exercise.name.toLowerCase().includes(q)) return true
        if (exercise.category.toLowerCase().includes(q)) return true
        return exercise.muscleGroups.some((mg) => mg.toLowerCase().includes(q))
      })
    },

    getRequiredFieldsForExercise(id: string): readonly ExerciseSetFieldKey[] {
      const exercise = self.exercises.get(id)
      if (!exercise) return []
      return EXERCISE_CATEGORIES[exercise.category].required
    },
  }))
  .actions((self) => ({
    afterCreate() {
      if (self.hasSeededDefaults) return

      if (self.exercises.size === 0) {
        DEFAULT_EXERCISES.forEach((exercise) => self.exercises.set(exercise.id, exercise))
      }

      self.hasSeededDefaults = true
    },

    addExercise(exercise: ExerciseInput): string {
      const providedId = sanitizeText(exercise.id ?? "")
      let id = providedId || generateId()

      if (providedId) {
        let suffix = 1
        while (self.exercises.has(id)) {
          id = `${providedId}-${suffix++}`
        }
      } else {
        while (self.exercises.has(id)) {
          id = generateId()
        }
      }

      const name = sanitizeText(exercise.name, MAX_EXERCISE_NAME_LENGTH)
      if (!name) throw new Error("Exercise name is required")

      self.exercises.set(id, {
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
      const exercise = self.exercises.get(id)
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
      return self.exercises.delete(id)
    },
  }))

export interface ExerciseStore extends Instance<typeof ExerciseStoreModel> {}
export interface ExerciseStoreSnapshotIn extends SnapshotIn<typeof ExerciseStoreModel> {}
export interface ExerciseStoreSnapshotOut extends SnapshotOut<typeof ExerciseStoreModel> {}
