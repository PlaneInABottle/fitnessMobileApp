import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { CreateRoutineScreen } from "@/screens/CreateRoutineScreen"
import { ExerciseDetailScreen } from "@/screens/ExerciseDetailScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderCreateRoutineScreen(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="CreateRoutine">
            <Stack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
            <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
            <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

function renderFromWorkoutTab(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="WorkoutTab">
            <Stack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
            <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
            <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("CreateRoutineScreen", () => {
  it("renders with empty state", () => {
    const { getByText, getByPlaceholderText } = renderCreateRoutineScreen()

    expect(getByText("Create Routine")).toBeTruthy()
    expect(getByPlaceholderText("Routine title")).toBeTruthy()
    expect(getByText("No exercises yet")).toBeTruthy()
    expect(getByText("Add exercises in the order you want to train them.")).toBeTruthy()
  })

  it("shows header with cancel and save buttons", () => {
    const { getByLabelText } = renderCreateRoutineScreen()

    expect(getByLabelText("Cancel")).toBeTruthy()
    expect(getByLabelText("Save")).toBeTruthy()
  })

  it("can enter routine title", () => {
    const { getByPlaceholderText } = renderCreateRoutineScreen()

    const titleInput = getByPlaceholderText("Routine title")
    fireEvent.changeText(titleInput, "My Upper Body Routine")

    expect(titleInput.props.value).toBe("My Upper Body Routine")
  })

  it("shows add exercise button in empty state", () => {
    const { getByText } = renderCreateRoutineScreen()

    expect(getByText("+ Add Exercise")).toBeTruthy()
  })

  it("add exercise button navigates to library", async () => {
    const { getByText } = renderCreateRoutineScreen()

    fireEvent.press(getByText("+ Add Exercise"))

    // ExerciseLibraryScreen should show the header
    await waitFor(() => {
      expect(getByText("Add Exercise")).toBeTruthy()
    })
  })

  it("selecting an exercise returns to routine and adds it", async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = renderCreateRoutineScreen()

    fireEvent.press(getByText("+ Add Exercise"))

    await waitFor(() => {
      expect(getByText("Add Exercise")).toBeTruthy()
    })

    fireEvent.changeText(
      getByPlaceholderText("Search exercises"),
      "barbell bench press medium grip",
    )
    await waitFor(() => expect(getByLabelText("Add Bench Press")).toBeTruthy())
    fireEvent.press(getByLabelText("Add Bench Press"))

    await waitFor(() => {
      expect(getByText("Exercises (1)")).toBeTruthy()
      expect(getByText("Bench Press")).toBeTruthy()
    })
  })

  it("opens exercise details when the selected exercise row is pressed", async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = renderCreateRoutineScreen()

    fireEvent.press(getByText("+ Add Exercise"))
    await waitFor(() => expect(getByPlaceholderText("Search exercises")).toBeTruthy())

    fireEvent.changeText(
      getByPlaceholderText("Search exercises"),
      "barbell bench press medium grip",
    )
    await waitFor(() => expect(getByLabelText("Add Bench Press")).toBeTruthy())
    fireEvent.press(getByLabelText("Add Bench Press"))

    await waitFor(() => expect(getByText("Exercises (1)")).toBeTruthy())
    fireEvent.press(getByText("Bench Press"))

    await waitFor(() => expect(getByText("Exercise details")).toBeTruthy())
  })

  it("save button is disabled when title is empty", () => {
    const { getByLabelText } = renderCreateRoutineScreen()

    // Save button exists but should be disabled (visually indicated by color)
    const saveButton = getByLabelText("Save")
    expect(saveButton).toBeTruthy()
    expect(saveButton.props.accessibilityState?.disabled).toBe(true)
  })

  it("save button is disabled when no exercises are selected", () => {
    const { getByPlaceholderText, getByLabelText } = renderCreateRoutineScreen()

    // Enter title but don't add exercises
    const titleInput = getByPlaceholderText("Routine title")
    fireEvent.changeText(titleInput, "My Routine")

    // Save button should still be disabled
    const saveButton = getByLabelText("Save")
    expect(saveButton).toBeTruthy()
    expect(saveButton.props.accessibilityState?.disabled).toBe(true)
  })
})

describe("CreateRoutineScreen navigation from WorkoutTab", () => {
  it("navigates to create routine when add button pressed", async () => {
    const { getByLabelText, getByText } = renderFromWorkoutTab()

    fireEvent.press(getByLabelText("Create routine"))

    await waitFor(() => {
      expect(getByText("Create Routine")).toBeTruthy()
    })
  })

  it("cancel button navigates back to workout tab", async () => {
    const { getByLabelText, getByText } = renderFromWorkoutTab()

    // Navigate to CreateRoutine
    fireEvent.press(getByLabelText("Create routine"))

    await waitFor(() => {
      expect(getByText("Create Routine")).toBeTruthy()
    })

    // Press cancel
    fireEvent.press(getByLabelText("Cancel"))

    // Should go back to workout tab
    await waitFor(() => {
      expect(getByText("Routines")).toBeTruthy()
    })
  })

  it("exposes one clear routine creation action", async () => {
    const { getAllByLabelText, getByText } = renderFromWorkoutTab()

    const createActions = getAllByLabelText("Create routine")
    expect(createActions).toHaveLength(1)
    fireEvent.press(createActions[0])

    await waitFor(() => {
      expect(getByText("Create Routine")).toBeTruthy()
    })
  })
})
