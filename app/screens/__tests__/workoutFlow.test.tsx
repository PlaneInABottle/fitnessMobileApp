import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ThemeProvider } from "@/theme/context"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderWorkoutFlow() {
  const store = RootStoreModel.create({})

  // Seed memory so suggestions can appear after the first set.
  store.performanceMemoryStore.updateSetMemory("bench-press", "working", 0, { weight: 100, reps: 5 })

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

describe("Workout MVP flow", () => {
  it("runs through start -> add exercise -> add set -> complete -> save template", async () => {
    const { store, getByText, getByTestId, getByPlaceholderText, queryByText } = renderWorkoutFlow()

    fireEvent.press(getByText("Start Empty Workout"))

    await waitFor(() => expect(getByText("No exercises yet")).toBeTruthy())

    fireEvent.press(getByText("Add Exercise"))

    await waitFor(() => expect(getByTestId("add-to-workout-bench-press")).toBeTruthy())

    fireEvent.press(getByTestId("add-to-workout-bench-press"))

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Add first set
    fireEvent.press(getByText("Add Set"))

    fireEvent.changeText(getByPlaceholderText("Reps"), "5")
    fireEvent.changeText(getByPlaceholderText("Kg"), "60")

    fireEvent.press(getByText("✓"))

    await waitFor(() => expect(queryByText("weight is required")).toBeNull())

    // Add second set; memory UI should now be enabled for this exercise.
    fireEvent.press(getByText("Add Set"))

    await waitFor(() => expect(getByText("Suggestions")).toBeTruthy())

    fireEvent.press(getByText("End"))

    await waitFor(() => expect(getByText("Workout Complete")).toBeTruthy())

    fireEvent.press(getByText("Save as Template"))
    fireEvent.changeText(getByPlaceholderText("Template name"), "Upper A")
    fireEvent.press(getByText("Confirm"))

    await waitFor(() => expect(getByText("Recent Templates")).toBeTruthy())

    expect(Array.from(store.workoutStore.templates.values()).some((t: any) => t.name === "Upper A")).toBe(true)
    expect(store.workoutStore.sessionHistory.length).toBe(1)
  })
})
