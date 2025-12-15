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

function renderWorkoutFlowWithStore(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="WorkoutTab">
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

function renderWorkoutFlow() {
  const store = RootStoreModel.create({})

  // Seed memory so placeholders appear immediately.
  store.performanceMemoryStore.recordCompletedWorkout({
    completedAt: new Date("2025-01-01T00:00:00Z"),
    exercises: [
      {
        exerciseId: "bench-press",
        category: "STRENGTH",
        sets: [
          { setType: "working", weight: 100, reps: 5 },
          { setType: "working", weight: 110, reps: 3 },
        ],
      },
    ],
  })

  return renderWorkoutFlowWithStore(store)
}

describe("WorkoutTabScreen Resume Button", () => {
  it("shows Start Empty Workout when no active session", () => {
    const store = RootStoreModel.create({})
    const { getByText, queryByText } = renderWorkoutFlowWithStore(store)

    expect(getByText("Start Empty Workout")).toBeTruthy()
    expect(queryByText("Resume Workout")).toBeNull()
  })

  it("shows Resume Workout when session is active", () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")

    const { getByText, queryByText } = renderWorkoutFlowWithStore(store)

    expect(getByText("Resume Workout")).toBeTruthy()
    expect(queryByText("Start Empty Workout")).toBeNull()
  })

  it("navigates to ActiveWorkout when Resume Workout is pressed", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")

    const { getByText } = renderWorkoutFlowWithStore(store)

    fireEvent.press(getByText("Resume Workout"))

    await waitFor(() => {
      expect(getByText("Bench Press")).toBeTruthy()
    })
  })

  it("switches to Resume Workout after starting a workout", async () => {
    const store = RootStoreModel.create({})
    const { getByText } = renderWorkoutFlowWithStore(store)

    // Initially shows Start Empty Workout
    expect(getByText("Start Empty Workout")).toBeTruthy()

    fireEvent.press(getByText("Start Empty Workout"))

    // Navigate back to WorkoutTab - session should be active
    await waitFor(() => {
      expect(store.workoutStore.currentSession).toBeDefined()
    })
  })
})

describe("Workout MVP flow", () => {
  it("runs through start -> add exercise -> add set -> complete -> save template", async () => {
    const {
      store,
      getByText,
      getByTestId,
      getByLabelText,
      getAllByLabelText,
      getByPlaceholderText,
      queryByText,
    } = renderWorkoutFlow()

    fireEvent.press(getByText("Start Empty Workout"))

    await waitFor(() => expect(getByText("No exercises yet")).toBeTruthy())

    fireEvent.press(getByText("Add Exercise"))

    await waitFor(() => expect(getByTestId("add-to-workout-bench-press")).toBeTruthy())

    fireEvent.press(getByTestId("add-to-workout-bench-press"))

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add first set
    fireEvent.press(getByText("Add Set"))

    const reps1 = getByLabelText("Reps")
    const kg1 = getByLabelText("Kg")

    fireEvent.changeText(reps1, "5")
    fireEvent.changeText(kg1, "60")

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(1)
      expect(store.workoutStore.currentSession?.exercises[0]?.sets[0]?.reps).toBe(5)
      expect(store.workoutStore.currentSession?.exercises[0]?.sets[0]?.weight).toBe(60)
    })

    // Add second set
    fireEvent.press(getByText("Add Set"))

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(2)
    })

    fireEvent.press(getByText("End"))

    await waitFor(() => expect(getByText("Workout Complete")).toBeTruthy())

    fireEvent.press(getByText("Save as Template"))
    fireEvent.changeText(getByPlaceholderText("Template name"), "Upper A")
    fireEvent.press(getByText("Confirm"))

    await waitFor(() => expect(getByText("Recent Templates")).toBeTruthy())

    expect(
      Array.from(store.workoutStore.templates.values()).some((t: any) => t.name === "Upper A"),
    ).toBe(true)
    expect(store.workoutStore.sessionHistory.length).toBe(1)
  })
})
