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

    const defaultSets = root.workoutStore.currentSession?.exercises.find(
      (e) => e.id === workoutExerciseId!,
    )?.sets
    expect(defaultSets).toHaveLength(1)
    expect(defaultSets?.[0].setType).toBe("working")
    expect(defaultSets?.[0].weight).toBe(0)
    expect(defaultSets?.[0].reps).toBe(0)

    root.workoutStore.addSetToWorkoutExercise(workoutExerciseId!, {
      setType: "working",
      weight: 100,
      reps: 5,
    })

    // Mark both sets as done before completing the workout
    const exercise = root.workoutStore.currentSession?.exercises.find(
      (e) => e.id === workoutExerciseId!,
    )

    // Mark first set (default set with weight 0) as done
    const firstSetId = exercise?.sets[0]?.id
    if (firstSetId) {
      root.workoutStore.updateSetInWorkoutExercise(workoutExerciseId!, firstSetId, { isDone: true })
    }

    // Mark second set (the one we just added with weight 100) as done
    const secondSetId = exercise?.sets[1]?.id
    if (secondSetId) {
      root.workoutStore.updateSetInWorkoutExercise(workoutExerciseId!, secondSetId, {
        isDone: true,
      })
    }

    jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
    root.workoutStore.completeSession()

    expect(root.workoutStore.currentSession).toBeUndefined()
    expect(root.workoutStore.sessionHistory).toHaveLength(1)
    expect(root.workoutStore.sessionHistory[0].completedAt?.toISOString()).toBe(
      "2025-01-01T00:00:10.000Z",
    )

    const placeholders = root.performanceMemoryStore.getPlaceholdersForSet({
      exerciseId: "bench-press",
      category: "STRENGTH",
      setType: "working",
      order: 2,
    })
    expect(placeholders.weight).toBe("100")
    expect(placeholders.reps).toBe("5")

    // New session starts with a default working set; UI can offer suggestions from memory after a set is completed.
    jest.setSystemTime(new Date("2025-01-01T00:01:00Z"))
    root.workoutStore.startNewSession()
    const we2 = root.workoutStore.addExerciseToSession("bench-press")
    expect(we2).toBeDefined()

    const sets = root.workoutStore.currentSession?.exercises.find((e) => e.id === we2!)?.sets
    expect(sets).toHaveLength(1)
    expect(sets?.[0].setType).toBe("working")
    expect(sets?.[0].weight).toBe(0)
    expect(sets?.[0].reps).toBe(0)
  })

  it("updates workout exercise notes and keeps them on the session model", () => {
    const root = RootStoreModel.create({})

    root.workoutStore.startNewSession()
    const workoutExerciseId = root.workoutStore.addExerciseToSession("bench-press")!

    const workoutExercise = root.workoutStore.currentSession?.exercises.find(
      (e) => e.id === workoutExerciseId,
    )
    expect(workoutExercise?.notes).toBe("")

    root.workoutStore.updateWorkoutExerciseNotes(workoutExerciseId, "Some note")
    expect(workoutExercise?.notes).toBe("Some note")

    root.workoutStore.completeSession()

    // Notes are not persisted into history.
    expect(root.workoutStore.sessionHistory[0].exercises[0].notes).toBe("")
  })

  it("creates default sets for non-strength exercises", () => {
    const root = RootStoreModel.create({})

    root.workoutStore.startNewSession()

    const pullupId = root.workoutStore.addExerciseToSession("pull-up")!
    const pullupSets = root.workoutStore.currentSession?.exercises.find(
      (e) => e.id === pullupId,
    )?.sets
    expect(pullupSets).toHaveLength(1)
    expect(pullupSets?.[0].setType).toBe("working")
    expect(pullupSets?.[0].reps).toBe(0)

    const plankId = root.workoutStore.addExerciseToSession("plank")!
    const plankSets = root.workoutStore.currentSession?.exercises.find(
      (e) => e.id === plankId,
    )?.sets
    expect(plankSets).toHaveLength(1)
    expect(plankSets?.[0].setType).toBe("working")
    expect(plankSets?.[0].time).toBe(0)
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

    expect(template?.exercises).toHaveLength(2)
    const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
    const squatTemplate = template?.exercises.find((e) => e.exerciseId === "squat")
    expect(benchTemplate?.sets).toHaveLength(1)
    expect(benchTemplate?.sets?.[0].setType).toBe("working")
    expect(benchTemplate?.sets?.[0].weight).toBe(0)
    expect(benchTemplate?.sets?.[0].reps).toBe(0)
    expect(squatTemplate?.sets).toHaveLength(1)
    expect(squatTemplate?.sets?.[0].setType).toBe("working")
    expect(squatTemplate?.sets?.[0].weight).toBe(0)
    expect(squatTemplate?.sets?.[0].reps).toBe(0)

    root.workoutStore.completeSession()
    root.workoutStore.startSessionFromTemplate(templateId!)
    expect(root.workoutStore.currentSession?.templateId).toBe(templateId)
    expect(root.workoutStore.currentSession?.exercises.map((e) => e.exerciseId)).toEqual([
      "bench-press",
      "squat",
    ])

    const bench = root.workoutStore.currentSession?.exercises.find(
      (e) => e.exerciseId === "bench-press",
    )
    const squat = root.workoutStore.currentSession?.exercises.find((e) => e.exerciseId === "squat")
    expect(bench?.sets).toHaveLength(1)
    expect(bench?.sets?.[0].setType).toBe("working")
    expect(bench?.sets?.[0].weight).toBe(0)
    expect(bench?.sets?.[0].reps).toBe(0)
    expect(squat?.sets).toHaveLength(1)
    expect(squat?.sets?.[0].setType).toBe("working")
    expect(squat?.sets?.[0].weight).toBe(0)
    expect(squat?.sets?.[0].reps).toBe(0)
  })

  it("can update a template from the current session", () => {
    const root = RootStoreModel.create({})

    const templateId = root.workoutStore.createTemplate("A", ["bench-press"])!

    root.workoutStore.startSessionFromTemplate(templateId)
    root.workoutStore.addExerciseToSession("squat")

    const ok = root.workoutStore.updateTemplateFromCurrentSession(templateId)
    expect(ok).toBe(true)

    expect(root.workoutStore.templates.get(templateId)?.exerciseIds.slice()).toEqual([
      "bench-press",
      "squat",
    ])
  })

  it("persists sets when creating and updating templates from session", () => {
    const root = RootStoreModel.create({})

    root.workoutStore.startNewSession()
    const weId = root.workoutStore.addExerciseToSession("bench-press")!

    const firstSetId = root.workoutStore.currentSession?.exercises.find((e) => e.id === weId)
      ?.sets?.[0].id
    expect(firstSetId).toBeDefined()

    root.workoutStore.updateSetInWorkoutExercise(weId, firstSetId!, { weight: 100, reps: 5 })
    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 50, reps: 10 })

    const templateId = root.workoutStore.createTemplateFromSession("Bench")!

    const templateBefore = root.workoutStore.templates.get(templateId)
    expect(
      templateBefore?.exercises.find((e) => e.exerciseId === "bench-press")?.sets,
    ).toHaveLength(2)

    root.workoutStore.completeSession()
    root.workoutStore.startSessionFromTemplate(templateId)

    const bench1 = root.workoutStore.currentSession?.exercises.find(
      (e) => e.exerciseId === "bench-press",
    )
    expect(bench1?.sets).toHaveLength(2)
    // When starting from a template, sets start as 0 so template numbers can be shown as placeholders.
    expect(bench1?.sets?.[0].weight).toBe(0)
    expect(bench1?.sets?.[0].reps).toBe(0)
    expect(bench1?.sets?.[1].weight).toBe(0)
    expect(bench1?.sets?.[1].reps).toBe(0)

    root.workoutStore.addSetToWorkoutExercise(bench1!.id, {
      setType: "working",
      weight: 120,
      reps: 3,
    })
    expect(root.workoutStore.updateTemplateFromCurrentSession(templateId)).toBe(true)

    root.workoutStore.completeSession()
    root.workoutStore.startSessionFromTemplate(templateId)

    const bench2 = root.workoutStore.currentSession?.exercises.find(
      (e) => e.exerciseId === "bench-press",
    )
    expect(bench2?.sets).toHaveLength(3)
    expect(bench2?.sets?.[0].weight).toBe(0)
    expect(bench2?.sets?.[0].reps).toBe(0)
    expect(bench2?.sets?.[1].weight).toBe(0)
    expect(bench2?.sets?.[1].reps).toBe(0)
    expect(bench2?.sets?.[2].weight).toBe(0)
    expect(bench2?.sets?.[2].reps).toBe(0)
  })

  it("uses template set counts as baseline for update summary", () => {
    const root = RootStoreModel.create({})

    root.workoutStore.startNewSession()
    const weId = root.workoutStore.addExerciseToSession("bench-press")!
    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 50, reps: 10 })

    const templateId = root.workoutStore.createTemplateFromSession("Bench")!

    expect(root.workoutStore.getTemplateUpdateSummary(templateId)).toEqual({
      addedExerciseIds: [],
      removedExerciseIds: [],
      addedSets: 0,
      removedSets: 0,
    })

    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 60, reps: 8 })
    expect(root.workoutStore.getTemplateUpdateSummary(templateId)?.addedSets).toBe(1)
    expect(root.workoutStore.getTemplateUpdateSummary(templateId)?.removedSets).toBe(0)

    const extraSetId = root.workoutStore.currentSession?.exercises[0].sets[2].id
    root.workoutStore.deleteSetFromWorkoutExercise(weId, extraSetId!)
    expect(root.workoutStore.getTemplateUpdateSummary(templateId)).toEqual({
      addedExerciseIds: [],
      removedExerciseIds: [],
      addedSets: 0,
      removedSets: 0,
    })

    const setToDelete = root.workoutStore.currentSession?.exercises[0].sets[1].id
    root.workoutStore.deleteSetFromWorkoutExercise(weId, setToDelete!)
    expect(root.workoutStore.getTemplateUpdateSummary(templateId)?.addedSets).toBe(0)
    expect(root.workoutStore.getTemplateUpdateSummary(templateId)?.removedSets).toBe(1)
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

  it("automatically updates template on workout completion", () => {
    const root = RootStoreModel.create({})

    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))

    // Create template from workout with specific values
    root.workoutStore.startNewSession()
    const benchId = root.workoutStore.addExerciseToSession("bench-press")!

    const firstSetId = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)
      ?.sets?.[0].id
    root.workoutStore.updateSetInWorkoutExercise(benchId, firstSetId!, {
      weight: 100,
      reps: 5,
      isDone: true,
    })
    root.workoutStore.addSetToWorkoutExercise(benchId, {
      setType: "working",
      weight: 110,
      reps: 3,
      isDone: true,
    })

    const templateId = root.workoutStore.createTemplateFromSession("Bench Template")!

    // Verify initial template values
    let template = root.workoutStore.templates.get(templateId)
    expect(template?.exercises).toHaveLength(1)
    expect(template?.exercises[0].sets).toHaveLength(2)
    expect(template?.exercises[0].sets[0].weight).toBe(100)
    expect(template?.exercises[0].sets[0].reps).toBe(5)
    expect(template?.exercises[0].sets[1].weight).toBe(110)
    expect(template?.exercises[0].sets[1].reps).toBe(3)

    root.workoutStore.completeSession()

    // Start new workout from template
    jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
    root.workoutStore.startSessionFromTemplate(templateId)

    // Update with new values
    const bench2Id = root.workoutStore.currentSession?.exercises.find(
      (e) => e.exerciseId === "bench-press",
    )?.id
    const set1Id = root.workoutStore.currentSession?.exercises.find((e) => e.id === bench2Id)
      ?.sets?.[0].id
    const set2Id = root.workoutStore.currentSession?.exercises.find((e) => e.id === bench2Id)
      ?.sets?.[1].id

    root.workoutStore.updateSetInWorkoutExercise(bench2Id!, set1Id!, {
      weight: 105,
      reps: 5,
      isDone: true,
    })
    root.workoutStore.updateSetInWorkoutExercise(bench2Id!, set2Id!, {
      weight: 115,
      reps: 3,
      isDone: true,
    })

    // Complete workout - template should auto-update
    root.workoutStore.completeSession()

    // Verify template was automatically updated with new values
    template = root.workoutStore.templates.get(templateId)
    expect(template?.exercises).toHaveLength(1)
    expect(template?.exercises[0].sets).toHaveLength(2)
    expect(template?.exercises[0].sets[0].weight).toBe(105)
    expect(template?.exercises[0].sets[0].reps).toBe(5)
    expect(template?.exercises[0].sets[1].weight).toBe(115)
    expect(template?.exercises[0].sets[1].reps).toBe(3)
    expect(template?.lastUsedAt?.toISOString()).toBe("2025-01-02T00:00:00.000Z")
  })

  it("sets lastError and returns false/undefined on failures", () => {
    const root = RootStoreModel.create({})

    expect(root.workoutStore.addExerciseToSession("bench-press")).toBeUndefined()
    expect(root.workoutStore.lastError).toBe("No active session")

    root.workoutStore.clearError()
    expect(root.workoutStore.lastError).toBeUndefined()

    expect(
      root.workoutStore.addSetToWorkoutExercise("nope", {
        setType: "working",
        weight: 100,
        reps: 5,
      }),
    ).toBe(false)
    expect(root.workoutStore.lastError).toBe("No active session")
  })

  describe("discardSession", () => {
    it("clears currentSession when active", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      root.workoutStore.addExerciseToSession("bench-press")
      expect(root.workoutStore.currentSession).toBeDefined()

      const result = root.workoutStore.discardSession()
      expect(result).toBe(true)
      expect(root.workoutStore.currentSession).toBeUndefined()
      expect(root.workoutStore.lastError).toBeUndefined()
    })

    it("returns false when no session", () => {
      const root = RootStoreModel.create({})

      const result = root.workoutStore.discardSession()
      expect(result).toBe(false)
      expect(root.workoutStore.lastError).toBe("No active session")
    })

    it("does not add to sessionHistory", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      root.workoutStore.addExerciseToSession("bench-press")
      root.workoutStore.discardSession()

      expect(root.workoutStore.sessionHistory).toHaveLength(0)
    })
  })

  describe("deleteSetFromWorkoutExercise", () => {
    it("removes a set from a workout exercise", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const weId = root.workoutStore.addExerciseToSession("bench-press")!
      root.workoutStore.addSetToWorkoutExercise(weId, {
        setType: "warmup",
        weight: 50,
        reps: 10,
      })
      root.workoutStore.addSetToWorkoutExercise(weId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })

      const sets = root.workoutStore.currentSession?.exercises.find((e) => e.id === weId)?.sets
      expect(sets).toHaveLength(3)
      const setToDelete = sets!.find((s) => s.setType === "warmup")!.id

      const result = root.workoutStore.deleteSetFromWorkoutExercise(weId, setToDelete)
      expect(result).toBe(true)

      const updatedSets = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === weId,
      )?.sets
      expect(updatedSets).toHaveLength(2)
      expect(updatedSets?.some((s) => s.setType === "working")).toBe(true)
    })

    it("returns false when set not found", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const weId = root.workoutStore.addExerciseToSession("bench-press")!
      root.workoutStore.addSetToWorkoutExercise(weId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })

      const result = root.workoutStore.deleteSetFromWorkoutExercise(weId, "nonexistent")
      expect(result).toBe(false)
      expect(root.workoutStore.lastError).toBe("Set not found")
    })

    it("returns false when no active session", () => {
      const root = RootStoreModel.create({})

      const result = root.workoutStore.deleteSetFromWorkoutExercise("weId", "setId")
      expect(result).toBe(false)
      expect(root.workoutStore.lastError).toBe("No active session")
    })
  })
})
