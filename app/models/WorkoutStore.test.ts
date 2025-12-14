import { RootStoreModel } from "./RootStore"

describe("WorkoutStore", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("creates a session, adds a set, completes, and updates memory + history", () => {
    const root = RootStoreModel.create({})

    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root.workoutStore.startNewSession()

    const workoutExerciseId = root.workoutStore.addExerciseToSession("bench-press")
    expect(workoutExerciseId).toBeDefined()
    root.workoutStore.addSetToWorkoutExercise(workoutExerciseId!, { setType: "working", weight: 100, reps: 5 })

    jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
    root.workoutStore.completeSession()

    expect(root.workoutStore.currentSession).toBeUndefined()
    expect(root.workoutStore.sessionHistory).toHaveLength(1)
    expect(root.workoutStore.sessionHistory[0].completedAt?.toISOString()).toBe("2025-01-01T00:00:10.000Z")

    const memories = root.performanceMemoryStore.getSetMemories("bench-press")
    expect(memories[0]?.weight).toBe(100)
    expect(memories[0]?.reps).toBe(5)

    // New session starts with no prefilled sets; UI can offer suggestions from memory after a set is completed.
    jest.setSystemTime(new Date("2025-01-01T00:01:00Z"))
    root.workoutStore.startNewSession()
    const we2 = root.workoutStore.addExerciseToSession("bench-press")
    expect(we2).toBeDefined()

    const sets = root.workoutStore.currentSession?.exercises.find((e) => e.id === we2!)?.sets
    expect(sets).toHaveLength(0)
  })

  it("creates a template from a session and can start a session from it", () => {
    const root = RootStoreModel.create({})

    root.workoutStore.startNewSession()
    root.workoutStore.addExerciseToSession("bench-press")
    root.workoutStore.addExerciseToSession("squat")

    const templateId = root.workoutStore.createTemplateFromSession("  Upper A  ")
    expect(templateId).toBeDefined()

    const template = root.workoutStore.templates.get(templateId!)
    expect(template?.name).toBe("Upper A")
    expect(template?.exerciseIds.slice()).toEqual(["bench-press", "squat"])

    root.workoutStore.completeSession()
    root.workoutStore.startSessionFromTemplate(templateId!)
    expect(root.workoutStore.currentSession?.exercises.map((e) => e.exerciseId)).toEqual([
      "bench-press",
      "squat",
    ])
  })

  it("tracks template lastUsedAt", () => {
    const root = RootStoreModel.create({})

    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    const a = root.workoutStore.createTemplate("A", ["bench-press"])!

    expect(root.workoutStore.templates.get(a)?.lastUsedAt?.toISOString()).toBe(
      "2025-01-01T00:00:00.000Z",
    )

    jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
    root.workoutStore.startSessionFromTemplate(a)

    expect(root.workoutStore.templates.get(a)?.lastUsedAt?.toISOString()).toBe(
      "2025-01-01T00:00:10.000Z",
    )
  })

  it("sets lastError and returns false/undefined on failures", () => {
    const root = RootStoreModel.create({})

    expect(root.workoutStore.addExerciseToSession("bench-press")).toBeUndefined()
    expect(root.workoutStore.lastError).toBe("No active session")

    root.workoutStore.clearError()
    expect(root.workoutStore.lastError).toBeUndefined()

    expect(root.workoutStore.addSetToWorkoutExercise("nope", { setType: "working", weight: 100, reps: 5 })).toBe(
      false,
    )
    expect(root.workoutStore.lastError).toBe("No active session")
  })
})
