import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { CreateRoutineScreen } from "@/screens/CreateRoutineScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { RoutineDetailScreen } from "@/screens/RoutineDetailScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function createStoreWithTemplate() {
  const store = RootStoreModel.create({})
  // Create a template to test with
  store.workoutStore.createTemplate("Upper Body A", ["bench-press", "overhead-press"])
  return store
}

function renderRoutineDetailScreen(store = createStoreWithTemplate(), templateId?: string) {
  // Get the first template ID if not provided
  const templates = Array.from(store.workoutStore.templates.values())
  const targetTemplateId = templateId || (templates[0] as any)?.id || "non-existent"

  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="RoutineDetail">
            <Stack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
            <Stack.Screen
              name="RoutineDetail"
              component={RoutineDetailScreen}
              initialParams={{ templateId: targetTemplateId }}
            />
            <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, templateId: targetTemplateId, ...result }
}

describe("RoutineDetailScreen", () => {
  it("renders routine details with title", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Upper Body A")).toBeTruthy()
  })

  it("shows back button", () => {
    const { getByLabelText } = renderRoutineDetailScreen()

    expect(getByLabelText("Back")).toBeTruthy()
  })

  it("shows start routine button", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Start Routine")).toBeTruthy()
  })

  it("shows exercise list with count", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Exercises (2)")).toBeTruthy()
    expect(getByText("Bench Press")).toBeTruthy()
    expect(getByText("Overhead Press")).toBeTruthy()
  })

  it("shows edit routine link", () => {
    const { getByLabelText } = renderRoutineDetailScreen()

    expect(getByLabelText("Edit routine")).toBeTruthy()
  })

  it("shows not found message for non-existent template", () => {
    const store = RootStoreModel.create({})
    const { getByText } = renderRoutineDetailScreen(store, "non-existent-id")

    expect(getByText("Routine not found")).toBeTruthy()
  })
})

function renderFromWorkoutTab(store = createStoreWithTemplate()) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="WorkoutTab">
            <Stack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
            <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
            <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
            <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("RoutineDetailScreen navigation", () => {
  it("navigates to detail when a routine row is pressed", async () => {
    const store = createStoreWithTemplate()
    const { getByText, getByLabelText } = renderFromWorkoutTab(store)

    // Wait for routine card to show
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })

    fireEvent.press(getByLabelText("Open Upper Body A"))

    // Wait for detail screen
    await waitFor(() => {
      expect(getByText("Start Routine")).toBeTruthy()
    })
  })

  it("start routine button starts workout and navigates to active workout", async () => {
    const store = createStoreWithTemplate()
    const { getByText, getByLabelText } = renderFromWorkoutTab(store)

    // Navigate to routine detail
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Open Upper Body A"))

    await waitFor(() => {
      expect(getByText("Start Routine")).toBeTruthy()
    })

    fireEvent.press(getByText("Start Routine"))

    await waitFor(() => {
      // Should navigate to ActiveWorkoutScreen which shows exercises
      expect(getByText("Bench Press")).toBeTruthy()
      expect(store.workoutStore.currentSession).toBeDefined()
    })
  })

  it("edit routine button navigates to create routine screen", async () => {
    const store = createStoreWithTemplate()
    const { getByLabelText, getByText } = renderFromWorkoutTab(store)

    // Navigate to routine detail
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Open Upper Body A"))

    await waitFor(() => {
      expect(getByLabelText("Edit routine")).toBeTruthy()
    })

    fireEvent.press(getByLabelText("Edit routine"))

    await waitFor(() => {
      expect(getByText("Create Routine")).toBeTruthy()
    })
  })

  it("can add exercises while editing a routine without starting a session", async () => {
    const store = createStoreWithTemplate()
    const { getByLabelText, getByText, getByPlaceholderText } = renderFromWorkoutTab(store)

    // Navigate to routine detail
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Open Upper Body A"))

    await waitFor(() => {
      expect(getByLabelText("Edit routine")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Edit routine"))

    await waitFor(() => {
      expect(getByText("Exercises (2)")).toBeTruthy()
    })

    fireEvent.press(getByText("+ Add Exercise"))

    await waitFor(() => {
      expect(getByText("Add Exercise")).toBeTruthy()
    })

    fireEvent.changeText(getByPlaceholderText("Search exercises"), "barbell deadlift")
    await waitFor(() => expect(getByLabelText("Add Deadlift")).toBeTruthy())
    fireEvent.press(getByLabelText("Add Deadlift"))

    await waitFor(() => {
      expect(getByText("Exercises (3)")).toBeTruthy()
      expect(getByText("Deadlift")).toBeTruthy()
    })

    expect(store.workoutStore.currentSession).toBeUndefined()
  })

  it("save persists edits and returns to routine detail", async () => {
    const store = RootStoreModel.create({})
    const templateId = store.workoutStore.createTemplate("Upper Body A", [
      "bench-press",
      "overhead-press",
    ])!

    const { getByLabelText, getByText, getByPlaceholderText } = renderFromWorkoutTab(store)

    // Navigate to routine detail
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Open Upper Body A"))

    await waitFor(() => {
      expect(getByLabelText("Edit routine")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("Edit routine"))

    await waitFor(() => {
      expect(getByText("Create Routine")).toBeTruthy()
    })

    const titleInput = getByPlaceholderText("Routine title")
    expect(titleInput.props.value).toBe("Upper Body A")

    // Add an exercise via ExerciseLibrary (routine mode)
    fireEvent.press(getByText("+ Add Exercise"))
    await waitFor(() => {
      expect(getByText("Add Exercise")).toBeTruthy()
    })

    fireEvent.changeText(getByPlaceholderText("Search exercises"), "barbell deadlift")
    await waitFor(() => expect(getByLabelText("Add Deadlift")).toBeTruthy())
    fireEvent.press(getByLabelText("Add Deadlift"))

    await waitFor(() => {
      expect(getByText("Exercises (3)")).toBeTruthy()
      expect(getByText("Deadlift")).toBeTruthy()
    })

    fireEvent.changeText(titleInput, "Upper Body A Updated")
    fireEvent.press(getByLabelText("Save"))

    await waitFor(() => {
      expect(getByText("Start Routine")).toBeTruthy()
      expect(getByText("Upper Body A Updated")).toBeTruthy()
      expect(getByText("Exercises (3)")).toBeTruthy()
    })

    expect(store.workoutStore.templates.get(templateId)?.name).toBe("Upper Body A Updated")
    expect(store.workoutStore.templates.get(templateId)?.exerciseIds.slice()).toEqual([
      "bench-press",
      "overhead-press",
      "deadlift",
    ])

    expect(store.workoutStore.currentSession).toBeUndefined()
    expect(store.workoutStore.sessionHistory).toHaveLength(0)
  })
})
