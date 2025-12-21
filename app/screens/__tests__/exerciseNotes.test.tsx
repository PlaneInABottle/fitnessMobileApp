import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render, waitFor } from "@testing-library/react-native"

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

describe("ActiveWorkoutScreen - Exercise notes", () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  it("shows the Turkish notes placeholder and persists note edits in the session", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!

    store.workoutStore.updateWorkoutExerciseNotes(weId, "Önceki not")

    const { getByText, getByPlaceholderText, getByDisplayValue } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Previous notes display
    expect(getByDisplayValue("Önceki not")).toBeTruthy()

    // Placeholder is Turkish
    const input = getByPlaceholderText("Buraya not ekleyin...")

    fireEvent.changeText(input, "Yeni not")

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.notes).toBe("Yeni not")
    })
  })
})
