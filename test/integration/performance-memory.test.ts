import { RootStore } from "../../app/models/RootStore"
import {
  createTestRootStore,
  markAllSetsComplete,
  simulateTime,
  assertPerformanceMemoryRecorded,
} from "./helpers"

describe("Integration: Performance Memory Flow", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root = createTestRootStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Memory recording and retrieval", () => {
    it("completes workout → records memory → retrieves placeholders in next session", () => {
      // Session 1: Complete workout with specific values
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      markAllSetsComplete(root, benchId)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Session 2: Start new workout
      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)

      // Verify placeholders match Session 1 values for each set order
      const placeholders1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(placeholders1.weight).toBe("0") // First set was default set with weight 0
      expect(placeholders1.reps).toBe("0")

      const placeholders2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(placeholders2.weight).toBe("135")
      expect(placeholders2.reps).toBe("8")

      const placeholders3 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 3,
      })
      expect(placeholders3.weight).toBe("135")
      expect(placeholders3.reps).toBe("8")
    })
  })

  describe("Multi-session memory progression", () => {
    it("tracks progressive overload across 3 sessions", () => {
      // Session 1: bench 135x8
      expect(root.workoutStore.startNewSession()).toBe(true)
      const bench1Id = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(bench1Id, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      markAllSetsComplete(root, bench1Id)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory recorded for session 1
      let memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memory.weight).toBe("135")

      // Session 2: bench 140x8 (using placeholder from S1)
      jest.setSystemTime(new Date("2025-01-03T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)
      const bench2Id = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(bench2Id, {
        setType: "working",
        weight: 140,
        reps: 8,
      })
      markAllSetsComplete(root, bench2Id)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory updated for session 2
      memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memory.weight).toBe("140")

      // Session 3: bench 145x8 (using placeholder from S2)
      jest.setSystemTime(new Date("2025-01-05T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)
      const bench3Id = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(bench3Id, {
        setType: "working",
        weight: 145,
        reps: 8,
      })
      markAllSetsComplete(root, bench3Id)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory progression tracked correctly
      memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memory.weight).toBe("145")
      expect(memory.reps).toBe("8")

      // Verify PR tracked
      const pr = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(pr?.maxWeight).toBe(145)
    })
  })

  describe("Set type independence", () => {
    it("maintains separate memory for warmup/working/dropset sets", () => {
      // Complete workout with warmup, working, drop sets
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      // Update default set to warmup
      const exercise = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)
      const defaultSetId = exercise?.sets[0]?.id
      if (defaultSetId) {
        root.workoutStore.updateSetInWorkoutExercise(benchId, defaultSetId, {
          setType: "warmup",
          weight: 95,
          reps: 10,
        })
      }

      // Add working set
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      // Add drop set
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "dropset",
        weight: 115,
        reps: 10,
      })

      markAllSetsComplete(root, benchId)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Start new workout and verify placeholders differ by set type and order
      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)

      const warmupPlaceholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "warmup",
        order: 1,
      })
      expect(warmupPlaceholders.weight).toBe("95")
      expect(warmupPlaceholders.reps).toBe("10")

      const workingPlaceholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(workingPlaceholders.weight).toBe("135")
      expect(workingPlaceholders.reps).toBe("8")

      const dropPlaceholders = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "dropset",
        order: 1,
      })
      expect(dropPlaceholders.weight).toBe("115")
      expect(dropPlaceholders.reps).toBe("10")
    })
  })

  describe("Personal record tracking", () => {
    it("updates PRs only when exceeded, persists across sessions", () => {
      // Session 1: bench 135x8 → PR set
      expect(root.workoutStore.startNewSession()).toBe(true)
      let benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      markAllSetsComplete(root, benchId)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      let pr = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(pr?.maxWeight).toBe(135)
      expect(pr?.maxReps).toBe(8)

      // Session 2: bench 130x10 → PR not updated for weight, but updated for reps
      jest.setSystemTime(new Date("2025-01-03T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)
      benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 130,
        reps: 10,
      })
      markAllSetsComplete(root, benchId)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      pr = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(pr?.maxWeight).toBe(135) // Not updated (130 < 135)
      expect(pr?.maxReps).toBe(10) // Updated (10 > 8)

      // Session 3: bench 140x8 → PR updated for weight
      jest.setSystemTime(new Date("2025-01-05T00:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)
      benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 140,
        reps: 8,
      })
      markAllSetsComplete(root, benchId)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify PR state after session 3
      pr = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(pr?.maxWeight).toBe(140) // Updated (140 > 135)
      expect(pr?.maxReps).toBe(10) // Still 10 from session 2
    })
  })

  describe("Mixed exercise categories", () => {
    it("handles STRENGTH, BODYWEIGHT, TIMED, CARDIO memory correctly", () => {
      // Complete workout with all 4 categories
      expect(root.workoutStore.startNewSession()).toBe(true)

      // STRENGTH exercise
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      // BODYWEIGHT exercise
      const pullupId = root.workoutStore.addExerciseToSession("pull-up")!
      root.workoutStore.addSetToWorkoutExercise(pullupId, {
        setType: "working",
        reps: 10,
      })

      // TIMED exercise
      const plankId = root.workoutStore.addExerciseToSession("plank")!
      root.workoutStore.addSetToWorkoutExercise(plankId, {
        setType: "working",
        time: 60,
      })

      // CARDIO exercise
      const runId = root.workoutStore.addExerciseToSession("running")!
      root.workoutStore.addSetToWorkoutExercise(runId, {
        setType: "working",
        time: 1800,
        distance: 5000,
      })

      markAllSetsComplete(root, benchId)
      markAllSetsComplete(root, pullupId)
      markAllSetsComplete(root, plankId)
      markAllSetsComplete(root, runId)

      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory stores appropriate fields per category
      const strengthMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(strengthMemory.weight).toBe("135")
      expect(strengthMemory.reps).toBe("8")

      const bodyweightMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "pull-up",
        category: "BODYWEIGHT",
        setType: "working",
        order: 2,
      })
      expect(bodyweightMemory.reps).toBe("10")
      expect(bodyweightMemory.weight).toBe("-") // Not applicable for bodyweight

      const timedMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "plank",
        category: "TIMED",
        setType: "working",
        order: 2,
      })
      expect(timedMemory.time).toBe("60")

      const cardioMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "running",
        category: "CARDIO",
        setType: "working",
        order: 2,
      })
      expect(cardioMemory.time).toBe("1800")
      expect(cardioMemory.distance).toBe("5000")
    })
  })

  describe("Memory with incomplete sets", () => {
    it("ignores incomplete sets, only records isDone=true", () => {
      // Add 5 sets, mark 3 as done
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 140,
        reps: 7,
      })
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 140,
        reps: 7,
      })

      const exercise = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)
      expect(exercise?.sets).toHaveLength(5) // Default + 4 added

      // Mark only first 3 sets as done (indices 0, 1, 2)
      exercise?.sets.slice(0, 3).forEach((set) => {
        root.workoutStore.updateSetInWorkoutExercise(benchId, set.id, { isDone: true })
      })

      // Complete workout
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory only contains 3 entries
      const memory1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memory1.weight).not.toBe("-")

      const memory3 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 3,
      })
      expect(memory3.weight).not.toBe("-")

      // 4th and 5th sets should not be recorded (incomplete)
      const memory4 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 4,
      })
      expect(memory4.weight).toBe("-")

      const memory5 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 5,
      })
      expect(memory5.weight).toBe("-")
    })
  })
})
