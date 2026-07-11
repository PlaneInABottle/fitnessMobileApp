import { getSnapshot } from "mobx-state-tree"

import { ExerciseStoreModel, migrateExerciseStoreSnapshot } from "./ExerciseStore"

describe("ExerciseStore", () => {
  it("exposes the static catalog without persisting it", () => {
    const store = ExerciseStoreModel.create({})
    expect(store.exercises.size).toBe(873)
    expect(store.customExercises.size).toBe(0)
    expect(store.exercises.get("bench-press")?.name).toBe("Bench Press")

    expect(store.exercises.get("bench-press")?.category).toBe("STRENGTH")
    expect(store.exercises.get("pull-up")?.category).toBe("BODYWEIGHT")
    expect(store.exercises.get("plank")?.category).toBe("TIMED")
    expect(store.exercises.get("running")?.category).toBe("CARDIO")
  })

  it("merges custom exercises with the static catalog", () => {
    const store = ExerciseStoreModel.create({
      customExercises: {
        custom: {
          id: "custom",
          name: "Custom",
          category: "STRENGTH",
          muscleGroups: ["back"],
        },
      },
    })

    expect(store.exercises.size).toBe(874)
    expect(store.exercises.get("custom")?.name).toBe("Custom")
  })

  it("can add, update, search, and remove exercises", () => {
    const store = ExerciseStoreModel.create({})

    const id = store.addExercise({
      name: "  Push   Up ",
      category: "BODYWEIGHT",
      muscleGroups: [" chest ", "triceps"],
    })

    expect(store.exercises.get(id)?.name).toBe("Push Up")

    store.updateExercise(id, { name: "Push-Up", instructions: "  Do it  " })
    expect(store.exercises.get(id)?.instructions).toBe("Do it")

    expect(store.searchExercises("push").map((e) => e.id)).toContain(id)
    expect(store.searchExercises("barbell deadlift").map((e) => e.id)).toContain("deadlift")
    expect(store.searchExercises("barbell bench press medium grip").map((e) => e.id)).toContain(
      "bench-press",
    )

    const removed = store.removeExercise(id)
    expect(removed).toBe(true)
    expect(store.exercises.has(id)).toBe(false)
  })

  it("persists hidden catalog exercises", () => {
    const store = ExerciseStoreModel.create({})

    expect(store.removeExercise("bench-press")).toBe(true)
    expect(store.hasExercise("bench-press")).toBe(false)

    const rehydrated = ExerciseStoreModel.create(getSnapshot(store))
    expect(rehydrated.hasExercise("bench-press")).toBe(false)
    expect(rehydrated.exercises.size).toBe(872)
  })

  it("does not overwrite existing ids when adding an exercise", () => {
    const store = ExerciseStoreModel.create({})
    const original = store.exercises.get("bench-press")?.name

    const id = store.addExercise({
      id: "bench-press",
      name: "My Bench",
      category: "STRENGTH",
      muscleGroups: ["chest"],
    })

    expect(id).not.toBe("bench-press")
    expect(store.exercises.get("bench-press")?.name).toBe(original)
    expect(store.exercises.get(id)?.name).toBe("My Bench")
  })

  it("returns required set fields per category", () => {
    const store = ExerciseStoreModel.create({})
    expect(store.getRequiredFieldsForExercise("running")).toEqual(["time"])
    expect(store.getRequiredFieldsForExercise("bench-press")).toEqual(["weight", "reps"])
    expect(store.getRequiredFieldsForExercise("pull-up")).toEqual(["reps"])
    expect(store.getRequiredFieldsForExercise("plank")).toEqual(["time"])
  })

  it("keeps the static catalog out of snapshots", () => {
    const store = ExerciseStoreModel.create({})
    store.addExercise({ name: "Custom Carry", category: "STRENGTH" })

    const snapshot = getSnapshot(store)
    expect(Object.keys(snapshot.customExercises)).toHaveLength(1)
    expect(JSON.stringify(snapshot)).not.toContain("Barbell Bench Press")
  })

  it("migrates legacy defaults while preserving custom exercises and removals", () => {
    const migrated = migrateExerciseStoreSnapshot({
      exercises: {
        "bench-press": {
          id: "bench-press",
          name: "Bench Press",
          category: "STRENGTH",
          muscleGroups: ["chest", "triceps", "shoulders"],
        },
        "custom": {
          id: "custom",
          name: "Custom",
          category: "STRENGTH",
          muscleGroups: [],
        },
      },
      hasSeededDefaults: true,
    }) as any

    expect(migrated.customExercises).toEqual({
      custom: expect.objectContaining({ name: "Custom" }),
    })
    expect(migrated.hiddenCatalogExerciseIds).toContain("squat")
    expect(migrated.hiddenCatalogExerciseIds).not.toContain("bench-press")
  })
})
