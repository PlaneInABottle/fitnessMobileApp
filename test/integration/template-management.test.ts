import { RootStore } from "../../app/models/RootStore"
import {
  createTestRootStore,
  markAllSetsComplete,
  simulateTime,
  expectNoErrors,
} from "./helpers"

describe("Integration: Template Management Flow", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    root = createTestRootStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Empty template creation (Create Routine path)", () => {
    it("creates empty template → starts workout → auto-populates with default sets", () => {
      // 1. Create template with exercise IDs only
      const templateId = root.workoutStore.createTemplate("Upper A", ["bench-press", "squat"])
      expect(templateId).toBeDefined()
      expectNoErrors(root)

      // 2. Verify template structure
      const template = root.workoutStore.templates.get(templateId!)
      expect(template).toBeDefined()
      expect(template?.exercises).toHaveLength(0)
      expect(template?.exerciseIds).toEqual(["bench-press", "squat"])
      expect(template?.name).toBe("Upper A")

      // 3. Start workout from template
      expect(root.workoutStore.startSessionFromTemplate(templateId!)).toBe(true)
      const session = root.workoutStore.currentSession
      expect(session).toBeDefined()
      expect(session?.templateId).toBe(templateId)

      // 4. Verify workout exercises have default sets
      expect(session?.exercises).toHaveLength(2)

      const bench = session?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(bench?.sets).toHaveLength(1)
      expect(bench?.sets[0].weight).toBe(0)
      expect(bench?.sets[0].reps).toBe(0)
      expect(bench?.sets[0].setType).toBe("working")

      const squat = session?.exercises.find((e) => e.exerciseId === "squat")
      expect(squat?.sets).toHaveLength(1)
      expect(squat?.sets[0].weight).toBe(0)
      expect(squat?.sets[0].reps).toBe(0)
    })
  })

  describe("Template from session (Save as Template path)", () => {
    it("creates template from active session → preserves sets and structure", () => {
      // Start workout, add exercises with custom sets
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!
      const squatId = root.workoutStore.addExerciseToSession("squat")!

      // Add sets with specific values
      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      root.workoutStore.addSetToWorkoutExercise(squatId, {
        setType: "working",
        weight: 185,
        reps: 10,
      })

      // Call createTemplateFromSession()
      const templateId = root.workoutStore.createTemplateFromSession("Push Day")
      expect(templateId).toBeDefined()

      // Verify template has populated exercises array with set data
      const template = root.workoutStore.templates.get(templateId!)
      expect(template).toBeDefined()
      expect(template?.name).toBe("Push Day")
      expect(template?.exercises).toHaveLength(2)

      const benchTemplate = template?.exercises.find((e) => e.exerciseId === "bench-press")
      expect(benchTemplate).toBeDefined()
      expect(benchTemplate?.sets).toHaveLength(2) // Default + added set

      const squatTemplate = template?.exercises.find((e) => e.exerciseId === "squat")
      expect(squatTemplate).toBeDefined()
      expect(squatTemplate?.sets).toHaveLength(2)

      // Verify exerciseIds populated
      expect(template?.exerciseIds).toEqual(["bench-press", "squat"])
    })
  })

  describe("Template auto-update on workout completion", () => {
    it("completes workout from template → auto-updates template with new values", () => {
      // 1. Create template from session with specific weights
      expect(root.workoutStore.startNewSession()).toBe(true)
      const benchId = root.workoutStore.addExerciseToSession("bench-press")!

      root.workoutStore.addSetToWorkoutExercise(benchId, {
        setType: "working",
        weight: 135,
        reps: 8,
      })
      markAllSetsComplete(root, benchId)

      const templateId = root.workoutStore.createTemplateFromSession("Bench Day")
      expect(templateId).toBeDefined()

      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // 2. Start new session from template
      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      expect(root.workoutStore.startSessionFromTemplate(templateId!)).toBe(true)

      // 3. Modify weights and complete workout
      const session2Exercise = root.workoutStore.currentSession?.exercises[0]
      expect(session2Exercise).toBeDefined()

      const set1Id = session2Exercise?.sets[0]?.id
      const set2Id = session2Exercise?.sets[1]?.id

      if (set1Id) {
        root.workoutStore.updateSetInWorkoutExercise(session2Exercise!.id, set1Id, {
          weight: 140,
          reps: 8,
          isDone: true,
        })
      }
      if (set2Id) {
        root.workoutStore.updateSetInWorkoutExercise(session2Exercise!.id, set2Id, {
          weight: 145,
          reps: 7,
          isDone: true,
        })
      }

      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // 4. Verify template exercises array updated with new values
      const updatedTemplate = root.workoutStore.templates.get(templateId!)
      expect(updatedTemplate?.exercises).toHaveLength(1)
      expect(updatedTemplate?.exercises[0].sets).toHaveLength(2)

      // 5. Verify exerciseIds remain unchanged
      expect(updatedTemplate?.exerciseIds).toEqual(["bench-press"])

      // 6. Verify lastUsedAt timestamp updated
      expect(updatedTemplate?.lastUsedAt.toISOString()).toBe("2025-01-02T00:10:00.000Z")
    })
  })

  describe("Template edit after completion", () => {
    it("edits template after completion → next session reflects updated exerciseIds", () => {
      const templateId = root.workoutStore.createTemplate("Editable", ["bench-press", "squat"])
      expect(templateId).toBeDefined()

      // Start + complete workout so template.exercises gets populated.
      expect(root.workoutStore.startSessionFromTemplate(templateId!)).toBe(true)
      root.workoutStore.currentSession?.exercises.forEach((we) => {
        markAllSetsComplete(root, we.id)
      })
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      const populatedTemplate = root.workoutStore.templates.get(templateId!)
      expect(populatedTemplate?.exercises.length).toBeGreaterThan(0)

      // Edit: remove bench, reorder, and add deadlift.
      expect(root.workoutStore.updateTemplate(templateId!, "Editable", ["squat", "deadlift"]))
        .toBe(true)

      const updatedTemplate = root.workoutStore.templates.get(templateId!)
      expect(updatedTemplate?.exerciseIds).toEqual(["squat", "deadlift"])
      expect(updatedTemplate?.exercises.map((e) => e.exerciseId)).toEqual(["squat", "deadlift"])

      // Next session should reflect edited routine, even when template.exercises is present.
      expect(root.workoutStore.startSessionFromTemplate(templateId!)).toBe(true)
      expect(root.workoutStore.currentSession?.exercises.map((e) => e.exerciseId)).toEqual([
        "squat",
        "deadlift",
      ])

      const deadlift = root.workoutStore.currentSession?.exercises.find((e) => e.exerciseId === "deadlift")
      expect(deadlift?.sets).toHaveLength(1)
      expect(deadlift?.sets[0].setType).toBe("working")
    })
  })

  describe("Template with invalid exercises", () => {
    it("prevents template creation with non-existent exercise IDs", () => {
      // Attempt to create template with invalid exerciseId
      const templateId = root.workoutStore.createTemplate("Bad Template", [
        "bench-press",
        "non-existent-exercise",
      ])

      // Verify error from ExerciseStore validation
      expect(templateId).toBeUndefined()
      expect(root.workoutStore.lastError).toBeDefined()

      // Verify template not created
      expect(root.workoutStore.templates.size).toBe(0)
    })
  })

  describe("Template start with deleted exercise", () => {
    it("handles template exercise removal gracefully", () => {
      // 1. Create a custom exercise
      const customId = root.exerciseStore.addExercise({
        name: "Custom Exercise",
        category: "STRENGTH",
        muscleGroups: ["Chest"],
      })
      expect(customId).toBeDefined()

      // 2. Create template with custom exercise
      const templateId = root.workoutStore.createTemplate("Custom Template", [customId!])
      expect(templateId).toBeDefined()

      // 3. Delete the custom exercise
      expect(root.exerciseStore.removeExercise(customId!)).toBe(true)

      // 4. Attempt to start workout from template
      const result = root.workoutStore.startSessionFromTemplate(templateId!)

      // 5. Verify error handling across WorkoutStore ↔ ExerciseStore
      expect(result).toBe(false)
      expect(root.workoutStore.lastError).toBeDefined()
      expect(root.workoutStore.currentSession).toBeUndefined()
    })
  })

  describe("Multiple template workflow", () => {
    it("creates multiple templates → starts from different templates → maintains independence", () => {
      // Create Template 1: Upper Body
      const upperTemplateId = root.workoutStore.createTemplate("Upper A", ["bench-press"])
      expect(upperTemplateId).toBeDefined()

      // Create Template 2: Lower Body
      const lowerTemplateId = root.workoutStore.createTemplate("Lower A", ["squat", "deadlift"])
      expect(lowerTemplateId).toBeDefined()

      // Verify templates exist independently
      expect(root.workoutStore.templates.size).toBe(2)

      const upperTemplate = root.workoutStore.templates.get(upperTemplateId!)
      expect(upperTemplate?.exerciseIds).toEqual(["bench-press"])

      const lowerTemplate = root.workoutStore.templates.get(lowerTemplateId!)
      expect(lowerTemplate?.exerciseIds).toEqual(["squat", "deadlift"])

      // Start workout from Upper template
      expect(root.workoutStore.startSessionFromTemplate(upperTemplateId!)).toBe(true)
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(1)
      expect(root.workoutStore.currentSession?.exercises[0].exerciseId).toBe("bench-press")

      // Complete workout
      markAllSetsComplete(root, root.workoutStore.currentSession!.exercises[0].id)
      simulateTime(600000)
      expect(root.workoutStore.completeSession()).toBe(true)

      // Start workout from Lower template
      jest.setSystemTime(new Date("2025-01-02T00:00:00Z"))
      expect(root.workoutStore.startSessionFromTemplate(lowerTemplateId!)).toBe(true)
      expect(root.workoutStore.currentSession?.exercises).toHaveLength(2)
      expect(root.workoutStore.currentSession?.exercises[0].exerciseId).toBe("squat")
      expect(root.workoutStore.currentSession?.exercises[1].exerciseId).toBe("deadlift")

      // Verify templates remain independent
      expect(root.workoutStore.templates.size).toBe(2)
    })
  })
})
