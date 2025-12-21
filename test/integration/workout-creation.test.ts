import { RootStore } from "../../app/models/RootStore"
import {
  createTestRootStore,
  markAllSetsComplete,
  simulateTime,
  expectNoErrors,
} from "./helpers"

describe("Integration: Workout Creation Flow", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root = createTestRootStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Basic workout creation and completion", () => {
    it("creates workout → adds exercises → completes sets → saves to history and memory", () => {
      // 1. Start session
      expect(root.workoutStore.startNewSession()).toBe(true)
      expect(root.workoutStore.currentSession).toBeDefined()
      expectNoErrors(root)

      // 2. Add exercises
      const benchId = root.workoutStore.addExerciseToSession("bench-press")
      const squatId = root.workoutStore.addExerciseToSession("squat")
      expect(benchId).toBeDefined()
      expect(squatId).toBeDefined()

      // 3. Verify default sets created
      const benchExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === benchId!,
      )
      expect(benchExercise?.sets).toHaveLength(1)
      expect(benchExercise?.sets[0].setType).toBe("working")

      // 4. Add and update sets with actual data
      root.workoutStore.addSetToWorkoutExercise(benchId!, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      root.workoutStore.addSetToWorkoutExercise(squatId!, {
        setType: "working",
        weight: 185,
        reps: 10,
      })

      // 5. Mark sets as complete
      markAllSetsComplete(root, benchId!)
      markAllSetsComplete(root, squatId!)

      // 6. Advance time and complete workout
      simulateTime(600000) // 10 minutes
      expect(root.workoutStore.completeSession()).toBe(true)

      // 7. Verify cross-store state - WorkoutStore
      expect(root.workoutStore.currentSession).toBeUndefined()
      expect(root.workoutStore.sessionHistory).toHaveLength(1)
      expect(root.workoutStore.sessionHistory[0].exercises).toHaveLength(2)

      // 8. Verify PerformanceMemoryStore recorded data
      const benchMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(benchMemory.weight).toBe("135")
      expect(benchMemory.reps).toBe("8")

      const squatMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "squat",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(squatMemory.weight).toBe("185")
      expect(squatMemory.reps).toBe("10")

      // 9. Verify PRs updated
      const benchPR = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(benchPR?.maxWeight).toBe(135)

      const squatPR = root.performanceMemoryStore.getPersonalRecord("squat")
      expect(squatPR?.maxWeight).toBe(185)
    })
  })

  describe("Multi-set type workflow", () => {
    it("handles warmup → working → dropset flow with correct memory storage", () => {
      // Start session
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

      // Add working sets
      const result1 = root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      expect(result1).toBe(true)

      const result2 = root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 140,
        reps: 7,
      })
      expect(result2).toBe(true)

      // Add drop set (must have the "drop" setType defined)
      const result3 = root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "dropset",
        weight: 115,
        reps: 10,
      })
      expect(result3).toBe(true)

      // Verify we have 4 sets total
      const updatedExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === benchId,
      )
      expect(updatedExercise?.sets).toHaveLength(4)

      // Mark all sets complete
      markAllSetsComplete(root, benchId)

      // Complete workout
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify memory stores different set types separately (each type has its own order counter)
      const warmupMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "warmup",
        order: 1,
      })
      expect(warmupMemory.weight).toBe("95")
      expect(warmupMemory.reps).toBe("10")

      const workingMemory1 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(workingMemory1.weight).toBe("135")
      expect(workingMemory1.reps).toBe("8")

      const workingMemory2 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(workingMemory2.weight).toBe("140")
      expect(workingMemory2.reps).toBe("7")

      const dropMemory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "dropset",
        order: 1,
      })
      expect(dropMemory.weight).toBe("115")
      expect(dropMemory.reps).toBe("10")
    })
  })

  describe("Incomplete workout handling", () => {
    it("discards incomplete workout without polluting history/memory", () => {
      // Start workout and add exercises
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      // Don't mark sets as complete - just discard
      expect(root.workoutStore.discardSession()).toBe(true)

      // Verify no history entry
      expect(root.workoutStore.sessionHistory).toHaveLength(0)
      expect(root.workoutStore.currentSession).toBeUndefined()

      // Verify no memory pollution
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memory.weight).toBe("-")
      expect(memory.reps).toBe("-")
    })
  })

  describe("Partial set completion", () => {
    it("records only completed sets in memory, ignores incomplete", () => {
      // Start workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      // Add 5 sets
      for (let i = 0; i < 4; i++) {
        root.workoutStore.addSetToWorkoutExercise(benchId, {
          setType: "working",
          weight: 135 + i * 5,
          reps: 8,
        })
      }

      // Mark only first 3 sets as done
      const exercise = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)
      expect(exercise?.sets).toHaveLength(5)

      exercise?.sets.slice(0, 3).forEach((set) => {
        root.workoutStore.updateSetInWorkoutExercise(benchId, set.id, { isDone: true })
      })

      // Complete workout
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify only 3 sets recorded in memory
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

      // 4th and 5th set should not be recorded (incomplete)
      const memory4 = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 4,
      })
      expect(memory4.weight).toBe("-")
    })
  })

  describe("Exercise with invalid data", () => {
    it("allows workout with incomplete set data but records completed sets in memory", () => {
      // Start workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      // Add set with valid data and mark it done
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      // Mark only the second set as done (the one with valid data)
      const exercise = root.workoutStore.currentSession?.exercises.find((e) => e.id === benchId)
      if (exercise?.sets[1]) {
        root.workoutStore.updateSetInWorkoutExercise(benchId, exercise.sets[1].id, {
          isDone: true,
        })
      }

      // Complete workout (default set with weight 0 won't be recorded since isDone=false)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify workout completed
      expect(root.workoutStore.sessionHistory).toHaveLength(1)

      // Verify only the completed set with valid data is recorded (order 1 since it's the first completed working set)
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memory.weight).toBe("135")
      expect(memory.reps).toBe("8")
    })
  })

  describe("Session timing", () => {
    it("tracks workout duration correctly across time advances", () => {
      // Start workout at specific time
      jest.setSystemTime(new Date("2025-01-01T10:00:00Z"))
      expect(root.workoutStore.startNewSession()).toBe(true)

      const startTime = root.workoutStore.currentSession?.startedAt
      expect(startTime?.toISOString()).toBe("2025-01-01T10:00:00.000Z")

      // Add exercise and complete sets
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      markAllSetsComplete(root, benchId)

      // Advance time 45 minutes
      simulateTime(45 * 60 * 1000)
      jest.setSystemTime(new Date("2025-01-01T10:45:00Z"))

      // Complete workout
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify completion time
      const completedAt = root.workoutStore.sessionHistory[0].completedAt
      expect(completedAt?.toISOString()).toBe("2025-01-01T10:45:00.000Z")
    })
  })

  describe("Empty workout edge case", () => {
    it("allows completing workout with no exercises (records empty session)", () => {
      // Start session without adding exercises
      expect(root.workoutStore.startNewSession()).toBe(true)

      // Complete empty workout (system allows this)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify history entry created (even though empty)
      expect(root.workoutStore.sessionHistory).toHaveLength(1)
      expect(root.workoutStore.sessionHistory[0].exercises).toHaveLength(0)
      expect(root.workoutStore.currentSession).toBeUndefined()
    })
  })
})
