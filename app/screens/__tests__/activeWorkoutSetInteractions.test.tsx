import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render, waitFor, within } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderActiveWorkout(store = RootStoreModel.create({})) {
  return render(
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
}

describe("ActiveWorkoutScreen - Set interactions", () => {
  it("renders set type indicators with working set indices", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!

    const defaultSetId = store.workoutStore.currentSession?.exercises.find((e) => e.id === weId)
      ?.sets?.[0]?.id
    expect(defaultSetId).toBeDefined()
    store.workoutStore.deleteSetFromWorkoutExercise(weId, defaultSetId!)

    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "warmup", weight: 40, reps: 10 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 80, reps: 8 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "dropset", weight: 60, reps: 12 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 90, reps: 6 })

    const { getByText, getAllByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    const warmupButtons = getAllByLabelText("Set type: warmup")
    expect(within(warmupButtons[0]).getByText("W")).toBeTruthy()

    const dropsetButtons = getAllByLabelText("Set type: dropset")
    expect(within(dropsetButtons[0]).getByText("D")).toBeTruthy()

    const workingButtons = getAllByLabelText("Set type: working")
    expect(workingButtons).toHaveLength(2)
    expect(within(workingButtons[0]).getByText("1")).toBeTruthy()
    expect(within(workingButtons[1]).getByText("2")).toBeTruthy()
  })

  it("opens set options on set type tap and keeps set row editable when toggling done", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    const { getByText, getAllByLabelText, queryByText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    expect(queryByText("Set Türünü Seç")).toBeNull()

    // Press on the set type indicator (opens SetOptionsBottomSheet)
    fireEvent.press(getAllByLabelText("Set type: working")[0])
    await waitFor(() => expect(getByText("Set Türünü Seç")).toBeTruthy())

    fireEvent.press(getAllByLabelText("Toggle done")[0])

    // Still editable (inputs remain) - labels updated to match new SetRow design
    expect(getAllByLabelText("Kg").length).toBeGreaterThan(0)
    expect(getAllByLabelText("Reps").length).toBeGreaterThan(0)
  })
})
