import { Modal } from "react-native"
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
  it("opens set options on set type tap and keeps set row editable when toggling done", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    const { getByText, getByLabelText, UNSAFE_getByType } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    expect(UNSAFE_getByType(Modal).props.visible).toBe(false)

    // Press on the set type indicator (now uses SetTypeIndicator component)
    fireEvent.press(getByLabelText("Set type: working"))
    await waitFor(() => expect(UNSAFE_getByType(Modal).props.visible).toBe(true))

    fireEvent.press(getByLabelText("Toggle done"))

    // Still editable (inputs remain) - labels updated to match new SetRow design
    expect(getByLabelText("Kg")).toBeTruthy()
    expect(getByLabelText("Reps")).toBeTruthy()
  })
})
