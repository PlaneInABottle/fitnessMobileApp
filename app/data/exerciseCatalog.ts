import catalogJson from "./exerciseCatalog.generated.json"

export interface CatalogExercise {
  id: string
  sourceId: string
  name: string
  category: "STRENGTH" | "BODYWEIGHT" | "TIMED" | "CARDIO"
  sourceCategory: string
  muscleGroups: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string
  level: string
  force?: string
  mechanic?: string
  instructionSteps: string[]
  hasImages: boolean
}

export const EXERCISE_CATALOG = Object.freeze(catalogJson as CatalogExercise[])

const catalogById = new Map(EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]))

export function getCatalogExercise(id: string): CatalogExercise | undefined {
  return catalogById.get(id)
}

export const CATALOG_MUSCLE_GROUPS = Object.freeze(
  [...new Set(EXERCISE_CATALOG.flatMap((exercise) => exercise.muscleGroups))].sort(),
)

export const CATALOG_EQUIPMENT = Object.freeze(
  [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.equipment))].sort(),
)

export const CATALOG_LEVELS = Object.freeze(
  [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.level))].sort(),
)

export const CATALOG_SOURCE_CATEGORIES = Object.freeze(
  [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.sourceCategory))].sort(),
)
