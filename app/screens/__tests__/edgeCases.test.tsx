import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderActiveWorkout(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="ActiveWorkout">
            <Stack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
            <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            <Stack.Screen name="WorkoutComplete" component={WorkoutCompleteScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

function createStoreWithSession() {
  const store = RootStoreModel.create({})
  store.workoutStore.startNewSession()
  return store
}

describe("Edge Cases - Empty Session State", () => {
  it("shows 'No exercises yet' for empty session", async () => {
    const store = createStoreWithSession()
    const { getByText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("No exercises yet")).toBeTruthy())
  })

  it("can end empty session and complete workout", async () => {
    const store = createStoreWithSession()
    const { getByText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("No exercises yet")).toBeTruthy())

    fireEvent.press(getByText("End"))

    // Workout Complete screen should show
    await waitFor(() => expect(getByText("Workout Complete")).toBeTruthy())
  })
})

describe("Edge Cases - Multiple Exercises with Sets", () => {
  it("handles multiple exercises each with sets", async () => {
    const store = createStoreWithSession()
    store.workoutStore.addExerciseToSession("bench-press")
    store.workoutStore.addExerciseToSession("squat")

    const { getByText, getAllByText, getByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())
    expect(getByText("Squat")).toBeTruthy()

    // Add set to first exercise
    const addSetButtons = getAllByText("Add Set")
    fireEvent.press(addSetButtons[0])

    // Fill in set values
    fireEvent.changeText(getByLabelText("Reps"), "5")
    fireEvent.changeText(getByLabelText("Kg"), "60")
    fireEvent.press(getByText("✓"))

    // Verify set was added to correct exercise
    const benchExercise = store.workoutStore.currentSession?.exercises[0]
    const squatExercise = store.workoutStore.currentSession?.exercises[1]

    expect(benchExercise?.sets.length).toBe(1)
    expect(squatExercise?.sets.length).toBe(0)
  })

  it("shows sets count per exercise via store", async () => {
    const store = createStoreWithSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!
    store.workoutStore.addSetToWorkoutExercise(weId, {
      setType: "working",
      weight: 100,
      reps: 5,
    })
    store.workoutStore.addSetToWorkoutExercise(weId, {
      setType: "working",
      weight: 100,
      reps: 5,
    })

    const { getByText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())
    // Should show 2 completed sets
    expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(2)
  })
})

describe("Edge Cases - Validation", () => {
  it("accepts valid input values", async () => {
    const store = createStoreWithSession()
    store.workoutStore.addExerciseToSession("bench-press")

    const { getByText, getByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add set with valid values
    fireEvent.press(getByText("Add Set"))
    fireEvent.changeText(getByLabelText("Reps"), "10")
    fireEvent.changeText(getByLabelText("Kg"), "100")
    fireEvent.press(getByText("✓"))

    // Should save successfully
    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(1)
    })
  })
})

describe("Edge Cases - Model Validation", () => {
  it("validates strength sets require weight + reps", () => {
    const root = RootStoreModel.create({})
    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 5 }).ok,
    ).toBe(true)
    expect(root.setStore.validateSetData("bench-press", { setType: "working", reps: 5 }).ok).toBe(
      false,
    )
    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 100 }).ok,
    ).toBe(false)
  })

  it("validates bodyweight sets require reps only", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("pull-up", { setType: "working", reps: 10 }).ok).toBe(true)
    expect(root.setStore.validateSetData("pull-up", { setType: "working" }).ok).toBe(false)
  })

  it("validates timed sets require time", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("plank", { setType: "warmup", time: 60 }).ok).toBe(true)
    expect(root.setStore.validateSetData("plank", { setType: "warmup" }).ok).toBe(false)
  })

  it("validates numeric ranges", () => {
    const root = RootStoreModel.create({})
    // Max weight exceeded
    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 501, reps: 5 }).ok,
    ).toBe(false)
    // Max reps exceeded
    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 101 })
        .ok,
    ).toBe(false)
    // Valid ranges
    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 500, reps: 100 })
        .ok,
    ).toBe(true)
  })
})

describe("Edge Cases - Workout Store Operations", () => {
  it("deleteSetFromWorkoutExercise removes correct set", () => {
    const root = RootStoreModel.create({})
    root.workoutStore.startNewSession()
    const weId = root.workoutStore.addExerciseToSession("bench-press")!

    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "warmup", weight: 50, reps: 10 })
    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    const sets = root.workoutStore.currentSession?.exercises[0]?.sets
    expect(sets?.length).toBe(2)

    const setToDelete = sets![0].id
    root.workoutStore.deleteSetFromWorkoutExercise(weId, setToDelete)

    const remainingSets = root.workoutStore.currentSession?.exercises[0]?.sets
    expect(remainingSets?.length).toBe(1)
    expect(remainingSets![0].setType).toBe("working")
  })

  it("discardSession clears current session without saving to history", () => {
    const root = RootStoreModel.create({})
    root.workoutStore.startNewSession()
    root.workoutStore.addExerciseToSession("bench-press")

    expect(root.workoutStore.currentSession).toBeDefined()
    expect(root.workoutStore.sessionHistory.length).toBe(0)

    root.workoutStore.discardSession()

    expect(root.workoutStore.currentSession).toBeUndefined()
    expect(root.workoutStore.sessionHistory.length).toBe(0)
  })

  it("completeSession saves to history and clears current session", () => {
    const root = RootStoreModel.create({})
    root.workoutStore.startNewSession()
    const weId = root.workoutStore.addExerciseToSession("bench-press")!
    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    expect(root.workoutStore.currentSession).toBeDefined()
    expect(root.workoutStore.sessionHistory.length).toBe(0)

    root.workoutStore.completeSession()

    expect(root.workoutStore.currentSession).toBeUndefined()
    expect(root.workoutStore.sessionHistory.length).toBe(1)
  })
})

describe("Edge Cases - Error Handling", () => {
  it("returns error when adding set without active session", () => {
    const root = RootStoreModel.create({})

    const result = root.workoutStore.addSetToWorkoutExercise("some-id", {
      setType: "working",
      weight: 100,
      reps: 5,
    })

    expect(result).toBe(false)
    expect(root.workoutStore.lastError).toBe("No active session")
  })

  it("returns error when deleting non-existent set", () => {
    const root = RootStoreModel.create({})
    root.workoutStore.startNewSession()
    const weId = root.workoutStore.addExerciseToSession("bench-press")!
    root.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    const result = root.workoutStore.deleteSetFromWorkoutExercise(weId, "non-existent-id")

    expect(result).toBe(false)
    expect(root.workoutStore.lastError).toBe("Set not found")
  })

  it("clearError resets lastError", () => {
    const root = RootStoreModel.create({})

    // Cause an error
    root.workoutStore.addExerciseToSession("bench-press")
    expect(root.workoutStore.lastError).toBe("No active session")

    root.workoutStore.clearError()
    expect(root.workoutStore.lastError).toBeUndefined()
  })
})
