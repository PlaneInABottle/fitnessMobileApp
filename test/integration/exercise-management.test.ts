import { RootStore } from "../../app/models/RootStore"
import { createTestRootStore, markAllSetsComplete, simulateTime } from "./helpers"

describe("Integration: Exercise Management Flow", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root = createTestRootStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Custom exercise lifecycle", () => {
    it("adds custom exercise → uses in workout → validates set fields", () => {
      // 1. Add custom STRENGTH exercise
      const exerciseId = root.exerciseStore.addExercise({
        name: "Bulgarian Split Squat",
        category: "STRENGTH",
        muscleGroups: ["Quads", "Glutes"],
      })
      expect(exerciseId).toBeDefined()

      // Verify exercise stored
      expect(root.exerciseStore.hasExercise(exerciseId!)).toBe(true)
      const exercise = root.exerciseStore.searchExercises("Bulgarian Split Squat")[0]
      expect(exercise?.name).toBe("Bulgarian Split Squat")
      expect(exercise?.category).toBe("STRENGTH")

      // 2. Start workout and add custom exercise
      expect(root.workoutStore.startNewSession()).toBe(true)
      const weId = root.workoutStore.addExerciseToSession(exerciseId!)
      expect(weId).toBeDefined()

      // 3. Verify default set has required fields for STRENGTH
      const workoutExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === weId!,
      )
      expect(workoutExercise).toBeDefined()
      expect(workoutExercise?.sets[0].weight).toBeDefined()
      expect(workoutExercise?.sets[0].reps).toBeDefined()
      expect(workoutExercise?.sets[0].setType).toBe("working")

      // 4. Add a set with values and complete
      root.workoutStore.addSetToWorkoutExercise(weId!, {
        setType: "working",
        weight: 50,
        reps: 10,
      })

      markAllSetsComplete(root, weId!)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // 5. Verify memory records custom exercise
      const memory = root.performanceMemoryStore.getPersonalRecord(exerciseId!)
      expect(memory).toBeDefined()
      expect(memory?.maxWeight).toBe(50)
      expect(memory?.maxReps).toBe(10)
    })
  })

  describe("Exercise category validation", () => {
    it("enforces required fields based on exercise category", () => {
      // Add CARDIO exercise
      const cardioId = root.exerciseStore.addExercise({
        name: "Cycling",
        category: "CARDIO",
        muscleGroups: ["Legs"],
      })
      expect(cardioId).toBeDefined()

      // Start workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      const weId = root.workoutStore.addExerciseToSession(cardioId!)!

      // Verify default set has CARDIO-appropriate fields (time, not weight/reps)
      const workoutExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === weId,
      )
      expect(workoutExercise).toBeDefined()
      expect(workoutExercise?.sets[0].time).toBeDefined()

      // Test BODYWEIGHT exercise
      const bodyweightId = root.exerciseStore.addExercise({
        name: "Push-ups",
        category: "BODYWEIGHT",
        muscleGroups: ["Chest"],
      })

      const weId2 = root.workoutStore.addExerciseToSession(bodyweightId!)!
      const bodyweightExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === weId2,
      )
      expect(bodyweightExercise?.sets[0].reps).toBeDefined()
      // Bodyweight doesn't require weight

      // Test TIMED exercise
      const timedId = root.exerciseStore.addExercise({
        name: "Wall Sit",
        category: "TIMED",
        muscleGroups: ["Quads"],
      })

      const weId3 = root.workoutStore.addExerciseToSession(timedId!)!
      const timedExercise = root.workoutStore.currentSession?.exercises.find((e) => e.id === weId3)
      expect(timedExercise?.sets[0].time).toBeDefined()
    })
  })

  describe("Exercise deletion with active references", () => {
    it("handles exercise deletion while in active workout", () => {
      // Add custom exercise
      const customId = root.exerciseStore.addExercise({
        name: "Custom Exercise",
        category: "STRENGTH",
        muscleGroups: ["Back"],
      })!

      // Start workout with exercise
      expect(root.workoutStore.startNewSession()).toBe(true)
      const weId = root.workoutStore.addExerciseToSession(customId)!
      expect(weId).toBeDefined()

      // Delete exercise from ExerciseStore
      expect(root.exerciseStore.removeExercise(customId)).toBe(true)
      expect(root.exerciseStore.hasExercise(customId)).toBe(false)

      // Verify workout exercise still exists (no cascade delete)
      const workoutExercise = root.workoutStore.currentSession?.exercises.find(
        (e) => e.id === weId,
      )
      expect(workoutExercise).toBeDefined()
      expect(workoutExercise?.exerciseId).toBe(customId)

      // Attempt to add another set (should work - workout is decoupled)
      const addResult = root.workoutStore.addSetToWorkoutExercise(weId, {
        setType: "working",
        weight: 100,
        reps: 5,
      })
      expect(addResult).toBe(false) // Should fail validation since exercise doesn't exist

      // Verify graceful error handling
      expect(root.workoutStore.lastError).toBeDefined()
    })
  })

  describe("Exercise search and filtering", () => {
    it("finds exercises by name and category across built-in and custom", () => {
      // Add some custom exercises
      const customId1 = root.exerciseStore.addExercise({
        name: "Custom Bench Press",
        category: "STRENGTH",
        muscleGroups: ["Chest"],
      })
      expect(customId1).toBeDefined()

      const customId2 = root.exerciseStore.addExercise({
        name: "Custom Row",
        category: "STRENGTH",
        muscleGroups: ["Back"],
      })
      expect(customId2).toBeDefined()

      const customId3 = root.exerciseStore.addExercise({
        name: "Yoga Flow",
        category: "TIMED",
        muscleGroups: ["Core"],
      })
      expect(customId3).toBeDefined()

      // Verify built-in exercises exist
      expect(root.exerciseStore.hasExercise("bench-press")).toBe(true)
      expect(root.exerciseStore.hasExercise("squat")).toBe(true)

      // Test getting exercises by category
      const strengthExercises = root.exerciseStore.getExercisesByCategory("STRENGTH")
      expect(strengthExercises.length).toBeGreaterThan(3) // Built-ins + 2 custom

      const timedExercises = root.exerciseStore.getExercisesByCategory("TIMED")
      expect(timedExercises.length).toBeGreaterThan(0)

      // Verify custom exercises are retrievable
      const custom1 = root.exerciseStore.searchExercises("Custom Bench Press")[0]
      expect(custom1?.name).toBe("Custom Bench Press")

      // Verify all exercises work in workout
      expect(root.workoutStore.startNewSession()).toBe(true)
      expect(root.workoutStore.addExerciseToSession("bench-press")).toBeDefined() // Built-in
      expect(root.workoutStore.addExerciseToSession(customId1!)).toBeDefined() // Custom
      expect(root.workoutStore.addExerciseToSession(customId3!)).toBeDefined() // Custom TIMED

      expect(root.workoutStore.currentSession?.exercises).toHaveLength(3)
    })
  })
})
