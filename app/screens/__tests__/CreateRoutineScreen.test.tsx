import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { CreateRoutineScreen } from "@/screens/CreateRoutineScreen"
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

    expect(getByText("Rutin Oluştur")).toBeTruthy()
    expect(getByPlaceholderText("Rutin başlığı")).toBeTruthy()
    expect(getByText("Rutininize bir egzersiz ekleyerek başlayın")).toBeTruthy()
  })

  it("shows header with cancel and save buttons", () => {
    const { getByLabelText } = renderCreateRoutineScreen()

    expect(getByLabelText("İptal")).toBeTruthy()
    expect(getByLabelText("Kaydet")).toBeTruthy()
  })

  it("can enter routine title", () => {
    const { getByPlaceholderText } = renderCreateRoutineScreen()

    const titleInput = getByPlaceholderText("Rutin başlığı")
    fireEvent.changeText(titleInput, "My Upper Body Routine")

    expect(titleInput.props.value).toBe("My Upper Body Routine")
  })

  it("shows add exercise button in empty state", () => {
    const { getByText } = renderCreateRoutineScreen()

    expect(getByText("+ Egzersiz ekle")).toBeTruthy()
  })

  it("add exercise button navigates to library", async () => {
    const { getByText } = renderCreateRoutineScreen()

    fireEvent.press(getByText("+ Egzersiz ekle"))

    // ExerciseLibraryScreen should show the header
    await waitFor(() => {
      expect(getByText("Egzersiz Ekle")).toBeTruthy()
    })
  })

  it("selecting an exercise returns to routine and adds it", async () => {
    const { getByText, getAllByLabelText } = renderCreateRoutineScreen()

    fireEvent.press(getByText("+ Egzersiz ekle"))

    await waitFor(() => {
      expect(getByText("Egzersiz Ekle")).toBeTruthy()
    })

    // Select first exercise from the library
    await waitFor(() => expect(getAllByLabelText("Add exercise").length).toBeGreaterThan(0))
    fireEvent.press(getAllByLabelText("Add exercise")[0])

    await waitFor(() => {
      expect(getByText("Egzersizler (1)")).toBeTruthy()
      expect(getByText("Bench Press")).toBeTruthy()
    })
  })

  it("save button is disabled when title is empty", () => {
    const { getByLabelText } = renderCreateRoutineScreen()

    // Save button exists but should be disabled (visually indicated by color)
    const saveButton = getByLabelText("Kaydet")
    expect(saveButton).toBeTruthy()
    expect(saveButton.props.accessibilityState?.disabled).toBe(true)
  })

  it("save button is disabled when no exercises are selected", () => {
    const { getByPlaceholderText, getByLabelText } = renderCreateRoutineScreen()

    // Enter title but don't add exercises
    const titleInput = getByPlaceholderText("Rutin başlığı")
    fireEvent.changeText(titleInput, "My Routine")

    // Save button should still be disabled
    const saveButton = getByLabelText("Kaydet")
    expect(saveButton).toBeTruthy()
    expect(saveButton.props.accessibilityState?.disabled).toBe(true)
  })
})

describe("CreateRoutineScreen navigation from WorkoutTab", () => {
  it("navigates to create routine when add button pressed", async () => {
    const { getByLabelText, getByText } = renderFromWorkoutTab()

    // Press the "+" button to add routine
    fireEvent.press(getByLabelText("Add routine"))

    await waitFor(() => {
      expect(getByText("Rutin Oluştur")).toBeTruthy()
    })
  })

  it("cancel button navigates back to workout tab", async () => {
    const { getByLabelText, getByText } = renderFromWorkoutTab()

    // Navigate to CreateRoutine
    fireEvent.press(getByLabelText("Add routine"))

    await waitFor(() => {
      expect(getByText("Rutin Oluştur")).toBeTruthy()
    })

    // Press cancel
    fireEvent.press(getByLabelText("İptal"))

    // Should go back to workout tab
    await waitFor(() => {
      expect(getByText("Rutinler")).toBeTruthy()
    })
  })

  it("can navigate via Yeni Rutin pill", async () => {
    const { getByText } = renderFromWorkoutTab()

    // Press "Yeni Rutin" pill
    fireEvent.press(getByText("Yeni Rutin"))

    await waitFor(() => {
      expect(getByText("Rutin Oluştur")).toBeTruthy()
    })
  })
})
