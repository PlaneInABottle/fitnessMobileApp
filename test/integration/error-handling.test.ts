import { RootStore } from "../../app/models/RootStore"
import { createTestRootStore, markAllSetsComplete, simulateTime } from "./helpers"

describe("Integration: Error Handling Flow", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root = createTestRootStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Concurrent session prevention", () => {
    it("prevents starting new session while one is active", () => {
      // Start first session
      expect(root.workoutStore.startNewSession()).toBe(true)
      expect(root.workoutStore.currentSession).toBeDefined()

      // Attempt to start second session
      expect(root.workoutStore.startNewSession()).toBe(false)
      expect(root.workoutStore.lastError).toBeDefined()
      expect(root.workoutStore.lastError).toContain("already active")

      // Verify only one session exists
      expect(root.workoutStore.currentSession).toBeDefined()
    })
  })

  describe("Invalid exercise ID cascade", () => {
    it("handles invalid exerciseId across all store operations", () => {
      const invalidId = "non-existent-exercise-id"

      // Attempt to add invalid exercise to workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      const weId = root.workoutStore.addExerciseToSession(invalidId)
      expect(weId).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Verify session still exists but has no exercises
      expect(root.workoutStore.currentSession).toBeDefined()
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(0)

      // Attempt to create template with invalid exercise
      const templateId = root.workoutStore.createTemplate("Bad Template", [invalidId])
      expect(templateId).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Attempt to retrieve memory for invalid exercise
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: invalidId,
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      // Memory returns placeholders even for invalid exercises (no error)
      expect(memory.weight).toBe("-")
      expect(memory.reps).toBe("-")

      // Verify all stores handle error gracefully
      expect(root.workoutStore.currentSession).toBeDefined() // Session not corrupted
    })
  })

  describe("State recovery after error", () => {
    it("maintains consistent state after failed operations", () => {
      // Start workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!
      expect(benchId).toBeDefined()

      // Attempt invalid operation (add invalid exercise)
      const invalidWeId = root.workoutStore.addExerciseToSession("invalid-exercise")
      expect(invalidWeId).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Verify workout state unchanged (still has bench-press)
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(1)
      expect(root.workoutStore.currentSession?.exercises[0].exerciseId).toBe("bench-press")

      // Continue with valid operations
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      markAllSetsComplete(root, benchId)

      // Verify workflow completes successfully
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)
      expect(root.workoutStore.sessionHistory).toHaveLength(1)

      // Verify memory recorded correctly despite earlier error
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      })
      expect(memory.weight).toBe("135")
      expect(memory.reps).toBe("8")
    })
  })

  describe("Template operations error handling", () => {
    it("handles template errors without corrupting store state", () => {
      // Create valid template
      const templateId = root.workoutStore.createTemplate("Valid Template", ["bench-press"])
      expect(templateId).toBeDefined()

      // Attempt to create template with empty name
      const badTemplate1 = root.workoutStore.createTemplate("", ["squat"])
      expect(badTemplate1).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Attempt to create template with invalid exercise
      const badTemplate2 = root.workoutStore.createTemplate("Bad Template", ["invalid-id"])
      expect(badTemplate2).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Verify original template still exists and functional
      expect(root.workoutStore.templates.has(templateId!)).toBe(true)
      expect(root.workoutStore.templates.size).toBe(1)

      // Verify can still use valid template
      expect(root.workoutStore.startSessionFromTemplate(templateId!)).toBe(true)
      expect(root.workoutStore.currentSession).toBeDefined()
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(1)
    })
  })

  describe("Memory retrieval with missing data", () => {
    it("returns placeholder '-' when no memory exists", () => {
      // Request placeholders for exercise never performed
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "deadlift",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })

      // Verify all placeholders return "-"
      expect(memory.weight).toBe("-")
      expect(memory.reps).toBe("-")
      expect(memory.time).toBe("-")
      expect(memory.distance).toBe("-")
      expect(memory.restTime).toBe("-")

      // Verify no errors thrown
      expect(root.performanceMemoryStore).toBeDefined()

      // Verify personal record is undefined
      const pr = root.performanceMemoryStore.getPersonalRecord("deadlift")
      expect(pr).toBeUndefined()
    })
  })

  describe("Workout completion edge cases", () => {
    it("handles workout with no completed sets gracefully", () => {
      // Start workout and add exercise
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      // Add sets but don't mark any as done
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })

      // Complete workout without marking sets done
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Verify history entry created
      expect(root.workoutStore.sessionHistory).toHaveLength(1)

      // Verify no memory recorded (no completed sets)
      const memory = root.performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      })
      expect(memory.weight).toBe("-")

      // Verify PR not set
      const pr = root.performanceMemoryStore.getPersonalRecord("bench-press")
      expect(pr).toBeUndefined()
    })
  })
})
