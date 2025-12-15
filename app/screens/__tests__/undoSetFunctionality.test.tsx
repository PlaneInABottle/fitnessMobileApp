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

function renderActiveWorkoutWithStore(store = RootStoreModel.create({})) {
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

function createStoreWithExercise() {
  const store = RootStoreModel.create({})
  store.workoutStore.startNewSession()
  store.workoutStore.addExerciseToSession("bench-press")
  return store
}

describe("ActiveWorkoutScreen - Undo Set Functionality", () => {
  it("shows Undo button after adding a set", async () => {
    const store = createStoreWithExercise()
    const { getByText, getByLabelText, queryByText } = renderActiveWorkoutWithStore(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Initially no undo button
    expect(queryByText("Undo Last Set")).toBeNull()

    // Add a set
    fireEvent.press(getByText("Add Set"))
    fireEvent.changeText(getByLabelText("Reps"), "5")
    fireEvent.changeText(getByLabelText("Kg"), "60")
    fireEvent.press(getByText("✓"))

    // Undo button should appear
    await waitFor(() => expect(getByText("Undo Last Set")).toBeTruthy())
  })

  it("removes set when Undo is pressed", async () => {
    const store = createStoreWithExercise()
    const { getByText, getByLabelText, queryByText } = renderActiveWorkoutWithStore(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add a set
    fireEvent.press(getByText("Add Set"))
    fireEvent.changeText(getByLabelText("Reps"), "5")
    fireEvent.changeText(getByLabelText("Kg"), "60")
    fireEvent.press(getByText("✓"))

    // Verify set was added
    const workoutExercise = store.workoutStore.currentSession?.exercises[0]
    expect(workoutExercise?.sets.length).toBe(1)

    // Press undo
    await waitFor(() => expect(getByText("Undo Last Set")).toBeTruthy())
    fireEvent.press(getByText("Undo Last Set"))

    // Verify set was removed
    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(0)
      expect(queryByText("Undo Last Set")).toBeNull()
    })
  })

  it("hides Undo button when starting to add another set", async () => {
    const store = createStoreWithExercise()
    const { getByText, getByLabelText, queryByText } = renderActiveWorkoutWithStore(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add a set
    fireEvent.press(getByText("Add Set"))
    fireEvent.changeText(getByLabelText("Reps"), "5")
    fireEvent.changeText(getByLabelText("Kg"), "60")
    fireEvent.press(getByText("✓"))

    await waitFor(() => expect(getByText("Undo Last Set")).toBeTruthy())

    // Start adding another set
    fireEvent.press(getByText("Add Set"))

    // Undo button should disappear
    await waitFor(() => expect(queryByText("Undo Last Set")).toBeNull())
  })

  it("tracks undo for only the current exercise", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")
    store.workoutStore.addExerciseToSession("squat")

    const { getByText, getAllByText, getByLabelText } = renderActiveWorkoutWithStore(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add a set to Bench Press
    const addSetButtons = getAllByText("Add Set")
    fireEvent.press(addSetButtons[0]) // First exercise
    fireEvent.changeText(getByLabelText("Reps"), "5")
    fireEvent.changeText(getByLabelText("Kg"), "60")
    fireEvent.press(getByText("✓"))

    // Verify undo appears for the exercise that had set added
    await waitFor(() => expect(getByText("Undo Last Set")).toBeTruthy())
    expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(1)
    expect(store.workoutStore.currentSession?.exercises[1]?.sets.length).toBe(0)
  })
})
