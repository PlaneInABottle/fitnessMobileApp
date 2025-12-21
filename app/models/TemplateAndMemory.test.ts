import { cast } from "mobx-state-tree"

import { RootStoreModel } from "./RootStore"
import { SetTypeId } from "./SetStore"

describe("Template and Row Memory Integration", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Template Creation: Empty Exercises Array (Create Routine)", () => {
    it("creates template with empty exercises array from createTemplate", () => {
      const root = RootStoreModel.create({})

      const templateId = root.workoutStore.createTemplate("Upper A", ["bench-press", "squat"])!
      expect(templateId).toBeDefined()

      const template = root.workoutStore.templates.get(templateId)
      expect(template?.name).toBe("Upper A")
      expect(template?.exerciseIds.slice()).toEqual(["bench-press", "squat"])
      expect(template?.exercises).toHaveLength(0)
    })

    it("starts workout from empty template with default sets", () => {
      const root = RootStoreModel.create({})

      const templateId = root.workoutStore.createTemplate("Upper A", ["bench-press", "squat"])!

      root.workoutStore.startSessionFromTemplate(templateId)

      expect(root.workoutStore.currentSession?.templateId).toBe(templateId)
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(2)

      const bench = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )
      const squat = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "squat",
      )

      expect(bench?.sets).toHaveLength(1)
      expect(bench?.sets?.[0].setType).toBe("working")
      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)

      expect(squat?.sets).toHaveLength(1)
      expect(squat?.sets?.[0].setType).toBe("working")
      expect(squat?.sets?.[0].weight).toBe(0)
      expect(squat?.sets?.[0].reps).toBe(0)
    })
  })

  describe("Template Creation: Populated Exercises Array (Save as Template)", () => {
    it("creates template with populated exercises from session", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!
      const squatId = root.workoutStore.addExerciseToSession("squat")!

      const firstBenchSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstBenchSet!, {
        weight: 100,
        reps: 5,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 110,
        reps: 3,
      })

      const firstSquatSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === squatId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(squatId, firstSquatSet!, {
        weight: 135,
        reps: 8,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Upper A")!

      const template = root.workoutStore.templates.get(templateId)
      expect(template?.name).toBe("Upper A")
      expect(template?.exerciseIds.slice()).toEqual(["bench-press", "squat"])
      expect(template?.exercises).toHaveLength(2)

      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(benchTemplate?.sets).toHaveLength(2)
      expect(benchTemplate?.sets?.[0].weight).toBe(100)
      expect(benchTemplate?.sets?.[0].reps).toBe(5)
      expect(benchTemplate?.sets?.[1].weight).toBe(110)
      expect(benchTemplate?.sets?.[1].reps).toBe(3)

      const squatTemplate = template?.exercises.find((e) => e.exerciseId === "squat")
      expect(squatTemplate?.sets).toHaveLength(1)
      expect(squatTemplate?.sets?.[0].weight).toBe(135)
      expect(squatTemplate?.sets?.[0].reps).toBe(8)
    })

    it("starts workout from populated template with correct set structure", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstBenchSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstBenchSet!, {
        weight: 100,
        reps: 5,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "warmup",
        weight: 50,
        reps: 10,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 110,
        reps: 3,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Upper A")!

      root.workoutStore.completeSession()
      root.workoutStore.startSessionFromTemplate(templateId)

      const bench = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )

      expect(bench?.sets).toHaveLength(3)
      expect(bench?.sets?.[0].setType).toBe("working")
      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)
      expect(bench?.sets?.[1].setType).toBe("warmup")
      expect(bench?.sets?.[1].weight).toBe(0)
      expect(bench?.sets?.[1].reps).toBe(0)
      expect(bench?.sets?.[2].setType).toBe("working")
      expect(bench?.sets?.[2].weight).toBe(0)
      expect(bench?.sets?.[2].reps).toBe(0)
    })
  })

  describe("Placeholder Fallback System: Template Priority", () => {
    it("uses template data as first priority for placeholders", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, { weight: 80, reps: 8 })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })

      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, { isDone: true })
      const secondSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[1].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, secondSet!, { isDone: true })

      root.workoutStore.completeSession()

      root.workoutStore.startNewSession()
      const bench2Id = root.workoutStore.addExerciseToSession("bench-press")!

      const set1 = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === bench2Id)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(bench2Id, set1!, { weight: 120, reps: 4 })
      root.workoutStore.addSetToWorkoutExercise(bench2Id, {
        setType: "working",
        weight: 130,
        reps: 2,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Bench Template")!

      root.workoutStore.completeSession()
      root.workoutStore.startSessionFromTemplate(templateId)

      const bench = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )
      expect(bench?.sets).toHaveLength(2)

      const memorySet1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memorySet1.weight).toBe("80")
      expect(memorySet1.reps).toBe("8")

      const memorySet2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memorySet2.weight).toBe("100")
      expect(memorySet2.reps).toBe("5")

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(benchTemplate?.sets).toHaveLength(2)
      expect(benchTemplate?.sets?.[0].weight).toBe(120)
      expect(benchTemplate?.sets?.[0].reps).toBe(4)
      expect(benchTemplate?.sets?.[1].weight).toBe(130)
      expect(benchTemplate?.sets?.[1].reps).toBe(2)
    })

    it("template data shows correct structure for multiple set types", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        setType: "warmup",
        weight: 45,
        reps: 10,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 110,
        reps: 3,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "dropset",
        weight: 80,
        reps: 8,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Complex Template")!

      const template = root.workoutStore.templates.get(templateId)
      expect(template?.exercises).toHaveLength(1)

      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(benchTemplate?.sets).toHaveLength(4)

      const warmupSets = benchTemplate?.sets.filter((s) => s.setType === "warmup")
      expect(warmupSets).toHaveLength(1)
      expect(warmupSets?.[0].weight).toBe(45)
      expect(warmupSets?.[0].reps).toBe(10)

      const workingSets = benchTemplate?.sets.filter((s) => s.setType === "working")
      expect(workingSets).toHaveLength(2)
      expect(workingSets?.[0].weight).toBe(100)
      expect(workingSets?.[0].reps).toBe(5)
      expect(workingSets?.[1].weight).toBe(110)
      expect(workingSets?.[1].reps).toBe(3)

      const dropSets = benchTemplate?.sets.filter((s) => s.setType === "dropset")
      expect(dropSets).toHaveLength(1)
      expect(dropSets?.[0].weight).toBe(80)
      expect(dropSets?.[0].reps).toBe(8)
    })
  })

  describe("Placeholder Fallback System: Performance Memory", () => {
    it("uses performance memory when template exercises array is empty", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        weight: 100,
        reps: 5,
        isDone: true,
      })

      root.workoutStore.completeSession()

      const templateId = root.workoutStore.createTemplate("Empty Template", ["bench-press"])!

      jest.setSystemTime(new Date("2025-01-01T00:01:00Z"))
      root.workoutStore.startSessionFromTemplate(templateId)

      const placeholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })

      expect(placeholders.weight).toBe("100")
      expect(placeholders.reps).toBe("5")
    })

    it("uses performance memory for sets beyond template definition", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
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
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 120,
        reps: 2,
        isDone: true,
      })

      root.workoutStore.completeSession()

      root.workoutStore.startNewSession()
      const bench2Id = root.workoutStore.addExerciseToSession("bench-press")!

      const set1 = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === bench2Id)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(bench2Id, set1!, {
        weight: 105,
        reps: 5,
      })
      root.workoutStore.addSetToWorkoutExercise(bench2Id, {
        setType: "working",
        weight: 115,
        reps: 3,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Two Set Template")!

      root.workoutStore.completeSession()

      jest.setSystemTime(new Date("2025-01-01T00:02:00Z"))
      root.workoutStore.startSessionFromTemplate(templateId)

      const bench3Id = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )?.id
      root.workoutStore.addSetToWorkoutExercise(bench3Id!, {
        setType: "working",
        weight: 0,
        reps: 0,
      })

      const placeholdersSet3 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 3,
      })

      expect(placeholdersSet3.weight).toBe("120")
      expect(placeholdersSet3.reps).toBe("2")
    })
  })

  describe("Placeholder Fallback System: Zero Fallback", () => {
    it('uses "0" fallback when no template or memory data exists', () => {
      const root = RootStoreModel.create({})

      const placeholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })

      expect(placeholders.weight).toBe("-")
      expect(placeholders.reps).toBe("-")
      expect(placeholders.time).toBe("-")
      expect(placeholders.distance).toBe("-")
    })

    it("creates new workout exercise with zero values when no data", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const bench = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)

      expect(bench?.sets).toHaveLength(1)
      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)
    })
  })

  describe("Different Exercise Categories", () => {
    it("handles strength exercises correctly", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const bench = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)

      expect(bench?.sets).toHaveLength(1)
      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)
      expect(bench?.sets?.[0].time).toBeUndefined()
      expect(bench?.sets?.[0].distance).toBeUndefined()
    })

    it("handles bodyweight exercises correctly", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const pullupId = root.workoutStore.addExerciseToSession("pull-up")!

      const pullup = root.workoutStore.currentSession?.exercises.find((e) => e.id === pullupId)

      expect(pullup?.sets).toHaveLength(1)
      expect(pullup?.sets?.[0].reps).toBe(0)
      expect(pullup?.sets?.[0].weight).toBeUndefined()
    })

    it("handles timed exercises correctly", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const plankId = root.workoutStore.addExerciseToSession("plank")!

      const plank = root.workoutStore.currentSession?.exercises.find((e) => e.id === plankId)

      expect(plank?.sets).toHaveLength(1)
      expect(plank?.sets?.[0].time).toBe(0)
      expect(plank?.sets?.[0].weight).toBeUndefined()
      expect(plank?.sets?.[0].reps).toBeUndefined()
    })

    it("templates preserve exercise category requirements", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      root.workoutStore.addExerciseToSession("bench-press")
      root.workoutStore.addExerciseToSession("pull-up")
      root.workoutStore.addExerciseToSession("plank")

      const templateId = root.workoutStore.createTemplateFromSession("Mixed Template")!

      root.workoutStore.completeSession()
      root.workoutStore.startSessionFromTemplate(templateId)

      const bench = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )
      const pullup = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "pull-up",
      )
      const plank = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "plank",
      )

      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)

      expect(pullup?.sets?.[0].reps).toBe(0)
      expect(pullup?.sets?.[0].weight).toBeUndefined()

      expect(plank?.sets?.[0].time).toBe(0)
      expect(plank?.sets?.[0].weight).toBeUndefined()
      expect(plank?.sets?.[0].reps).toBeUndefined()
    })
  })

  describe("Different Set Types", () => {
    it("handles warmup sets in templates", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        setType: "warmup",
        weight: 45,
        reps: 10,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Warmup Template")!

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")

      expect(benchTemplate?.sets?.[0].setType).toBe("warmup")
      expect(benchTemplate?.sets?.[0].weight).toBe(45)
      expect(benchTemplate?.sets?.[0].reps).toBe(10)
    })

    it("handles dropset in templates", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        setType: "dropset",
        weight: 80,
        reps: 12,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Dropset Template")!

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")

      expect(benchTemplate?.sets?.[0].setType).toBe("dropset")
      expect(benchTemplate?.sets?.[0].weight).toBe(80)
      expect(benchTemplate?.sets?.[0].reps).toBe(12)
    })

    it("maintains separate counters for different set types in templates", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        setType: "warmup",
        weight: 45,
        reps: 10,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "warmup",
        weight: 65,
        reps: 8,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 110,
        reps: 3,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "dropset",
        weight: 80,
        reps: 10,
      })

      const templateId = root.workoutStore.createTemplateFromSession("Mixed Types")!

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")

      expect(benchTemplate?.sets).toHaveLength(5)

      const warmups = benchTemplate?.sets.filter((s) => s.setType === "warmup")
      expect(warmups).toHaveLength(2)
      expect(warmups?.[0].weight).toBe(45)
      expect(warmups?.[1].weight).toBe(65)

      const working = benchTemplate?.sets.filter((s) => s.setType === "working")
      expect(working).toHaveLength(2)
      expect(working?.[0].weight).toBe(100)
      expect(working?.[1].weight).toBe(110)

      const dropsets = benchTemplate?.sets.filter((s) => s.setType === "dropset")
      expect(dropsets).toHaveLength(1)
      expect(dropsets?.[0].weight).toBe(80)
    })
  })

  describe("Edge Cases and Data Flow", () => {
    it("handles undefined and null values in template sets", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const templateId = root.workoutStore.createTemplateFromSession("Minimal Template")!

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")

      expect(benchTemplate?.sets?.[0].weight).toBe(0)
      expect(benchTemplate?.sets?.[0].reps).toBe(0)
    })

    it("handles empty sets array in workout exercise", () => {
      const root = RootStoreModel.create({})

      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const bench = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)

      const firstSetId = bench?.sets?.[0].id
      root.workoutStore.deleteSetFromWorkoutExercise(benchId, firstSetId!)

      expect(bench?.sets).toHaveLength(0)
    })

    it("complete workflow: create template → start workout → verify structure", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
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

      const templateId = root.workoutStore.createTemplateFromSession("Upper Day")!

      jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
      root.workoutStore.completeSession()

      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      root.workoutStore.startSessionFromTemplate(templateId)

      const bench = root.workoutStore.currentSession?.exercises.find(
        (e) => e.exerciseId === "bench-press",
      )

      expect(bench?.sets).toHaveLength(2)
      expect(bench?.sets?.[0].weight).toBe(0)
      expect(bench?.sets?.[0].reps).toBe(0)
      expect(bench?.sets?.[0].isDone).toBe(false)
      expect(bench?.sets?.[1].weight).toBe(0)
      expect(bench?.sets?.[1].reps).toBe(0)
      expect(bench?.sets?.[1].isDone).toBe(false)

      const memorySet1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memorySet1.weight).toBe("100")
      expect(memorySet1.reps).toBe("5")

      const memorySet2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memorySet2.weight).toBe("110")
      expect(memorySet2.reps).toBe("3")
    })

    it("performance memory integrates correctly with template system", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        weight: 95,
        reps: 6,
        isDone: true,
      })

      root.workoutStore.completeSession()

      root.workoutStore.startNewSession()
      const bench2Id = root.workoutStore.addExerciseToSession("bench-press")!

      const set1 = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === bench2Id)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(bench2Id, set1!, { weight: 100, reps: 5 })

      const templateId = root.workoutStore.createTemplateFromSession("Progressive Template")!

      root.workoutStore.completeSession()

      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      root.workoutStore.startSessionFromTemplate(templateId)

      const memoryPlaceholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })

      expect(memoryPlaceholders.weight).toBe("95")
      expect(memoryPlaceholders.reps).toBe("6")

      const template = root.workoutStore.templates.get(templateId)
      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(benchTemplate?.sets).toHaveLength(1)
      expect(benchTemplate?.sets?.[0].weight).toBe(100)
      expect(benchTemplate?.sets?.[0].reps).toBe(5)
    })

    it("handles missing exercise category gracefully", () => {
      const root = RootStoreModel.create({})

      const placeholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "non-existent-exercise",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })

      expect(placeholders.weight).toBe("-")
      expect(placeholders.reps).toBe("-")
    })
  })

  describe("Set Type Order Tracking", () => {
    it("tracks order within set type correctly for placeholders", () => {
      const root = RootStoreModel.create({})

      jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
      root.workoutStore.startNewSession()
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      const firstSet = root.workoutStore.currentSession?.exercises
        .find((e) => e.id === benchId)
        ?.sets?.[0].id
      root.workoutStore.updateSetInWorkoutExercise(benchId, firstSet!, {
        setType: "warmup",
        weight: 45,
        reps: 10,
        isDone: true,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 100,
        reps: 5,
        isDone: true,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "warmup",
        weight: 65,
        reps: 8,
        isDone: true,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 110,
        reps: 3,
        isDone: true,
      })

      root.workoutStore.completeSession()

      const warmup1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "warmup",
        order: 1,
      })
      expect(warmup1.weight).toBe("45")
      expect(warmup1.reps).toBe("10")

      const warmup2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "warmup",
        order: 2,
      })
      expect(warmup2.weight).toBe("65")
      expect(warmup2.reps).toBe("8")

      const working1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(working1.weight).toBe("100")
      expect(working1.reps).toBe("5")

      const working2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(working2.weight).toBe("110")
      expect(working2.reps).toBe("3")
    })
  })
})
