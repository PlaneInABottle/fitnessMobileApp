import { RootStore, RootStoreModel } from "../../app/models/RootStore"

/**
 * Creates a fresh RootStore instance for integration tests
 */
export function createTestRootStore(): RootStore {
  return RootStoreModel.create({})
}

/**
 * Creates a test exercise and returns its ID
 */
export function createTestExercise(
  root: RootStore,
  data: {
    name: string
    category: "STRENGTH" | "BODYWEIGHT" | "TIMED" | "CARDIO"
    muscleGroups?: string[]
  },
): string | undefined {
  return root.exerciseStore.addExercise(data)
}

/**
 * Advances time by specified milliseconds using fake timers
 */
export function simulateTime(milliseconds: number): void {
  jest.advanceTimersByTime(milliseconds)
}

/**
 * Helper to mark all sets in a workout exercise as done
 */
export function markAllSetsComplete(root: RootStore, workoutExerciseId: string): void {
  const exercise = root.workoutStore.currentSession?.exercises.find(
    (e) => e.id === workoutExerciseId,
  )

  if (!exercise) {
    throw new Error(`Workout exercise ${workoutExerciseId} not found`)
  }

  exercise.sets.forEach((set) => {
    root.workoutStore.updateSetInWorkoutExercise(workoutExerciseId, set.id, { isDone: true })
  })
}

/**
 * Helper to create a workout with exercises and sets
 */
export function createWorkoutWithExercises(
  root: RootStore,
  exerciseIds: string[],
  setsPerExercise: number = 3,
): { workoutExerciseIds: string[] } {
  root.workoutStore.startNewSession()

  const workoutExerciseIds: string[] = []

  exerciseIds.forEach((exerciseId) => {
    const weId = root.workoutStore.addExerciseToSession(exerciseId)
    if (!weId) {
      throw new Error(`Failed to add exercise ${exerciseId} to session`)
    }
    workoutExerciseIds.push(weId)

    // Add additional sets beyond the default one
    for (let i = 1; i < setsPerExercise; i++) {
      root.workoutStore.addSetToWorkoutExercise(weId, {
        setType: "working",
        weight: 0,
        reps: 0,
      })
    }
  })

  return { workoutExerciseIds }
}

/**
 * Helper to complete all sets in the current session with specific values
 */
export function completeAllSetsInSession(
  root: RootStore,
  setData?: Array<{ workoutExerciseId: string; weight?: number; reps?: number; time?: number }>,
): void {
  const session = root.workoutStore.currentSession
  if (!session) {
    throw new Error("No active session")
  }

  session.exercises.forEach((exercise) => {
    const data = setData?.find((d) => d.workoutExerciseId === exercise.id)

    exercise.sets.forEach((set, setIndex) => {
      const updates: any = { isDone: true }

      if (data) {
        if (data.weight !== undefined) updates.weight = data.weight + setIndex
        if (data.reps !== undefined) updates.reps = data.reps
        if (data.time !== undefined) updates.time = data.time
      }

      root.workoutStore.updateSetInWorkoutExercise(exercise.id, set.id, updates)
    })
  })
}

/**
 * Assert that performance memory was recorded correctly
 */
export function assertPerformanceMemoryRecorded(
  root: RootStore,
  exerciseId: string,
  expectedValues: { weight?: string; reps?: string; time?: string },
): void {
  const category = root.exerciseStore.getExerciseCategory(exerciseId)
  if (!category) {
    throw new Error(`Exercise ${exerciseId} not found`)
  }

  const placeholders = root.performanceMemoryStore.getPlaceholdersForSet({
    exerciseId,
    category,
    setType: "working",
    order: 2,
  })

  if (expectedValues.weight !== undefined) {
    expect(placeholders.weight).toBe(expectedValues.weight)
  }
  if (expectedValues.reps !== undefined) {
    expect(placeholders.reps).toBe(expectedValues.reps)
  }
  if (expectedValues.time !== undefined) {
    expect(placeholders.time).toBe(expectedValues.time)
  }
}

/**
 * Asserts no errors exist in any store
 */
export function expectNoErrors(root: RootStore): void {
  expect(root.workoutStore.lastError).toBeUndefined()
  expect(root.exerciseStore.lastError).toBeUndefined()
}

/**
 * Helper to get a workout exercise by ID
 */
export function getWorkoutExercise(root: RootStore, workoutExerciseId: string) {
  return root.workoutStore.currentSession?.exercises.find((e) => e.id === workoutExerciseId)
}
