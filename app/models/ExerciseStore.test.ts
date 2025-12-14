import { getSnapshot } from "mobx-state-tree"

import { ExerciseStoreModel } from "./ExerciseStore"

describe("ExerciseStore", () => {
  it("adds default exercises on create when empty", () => {
    const store = ExerciseStoreModel.create({})
    expect(store.hasSeededDefaults).toBe(true)
    expect(store.exercises.size).toBeGreaterThan(0)
    expect(store.exercises.get("bench-press")?.name).toBe("Bench Press")

    expect(store.exercises.get("bench-press")?.category).toBe("STRENGTH")
    expect(store.exercises.get("pull-up")?.category).toBe("BODYWEIGHT")
    expect(store.exercises.get("plank")?.category).toBe("TIMED")
    expect(store.exercises.get("running")?.category).toBe("CARDIO")
  })

  it("does not overwrite existing exercises on create", () => {
    const store = ExerciseStoreModel.create({
      exercises: {
        custom: {
          id: "custom",
          name: "Custom",
          category: "STRENGTH",
          muscleGroups: ["back"],
        },
      },
    })

    expect(store.hasSeededDefaults).toBe(true)
    expect(store.exercises.size).toBe(1)
    expect(store.exercises.get("custom")?.name).toBe("Custom")
  })

  it("can add, update, search, and remove exercises", () => {
    const store = ExerciseStoreModel.create({ exercises: {}, hasSeededDefaults: true })

    const id = store.addExercise({
      name: "  Push   Up ",
      category: "BODYWEIGHT",
      muscleGroups: [" chest ", "triceps"],
    })

    expect(store.exercises.get(id)?.name).toBe("Push Up")

    store.updateExercise(id, { name: "Push-Up", instructions: "  Do it  " })
    expect(store.exercises.get(id)?.instructions).toBe("Do it")

    expect(store.searchExercises("push").map((e) => e.id)).toContain(id)

    const removed = store.removeExercise(id)
    expect(removed).toBe(true)
    expect(store.exercises.has(id)).toBe(false)
  })

  it("does not reseed defaults after exercises are cleared", () => {
    const store = ExerciseStoreModel.create({})

    Array.from(store.exercises.keys()).forEach((id) => store.removeExercise(id))
    expect(store.exercises.size).toBe(0)

    const rehydrated = ExerciseStoreModel.create(getSnapshot(store))
    expect(rehydrated.hasSeededDefaults).toBe(true)
    expect(rehydrated.exercises.size).toBe(0)
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
})
