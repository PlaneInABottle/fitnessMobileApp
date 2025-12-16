import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { CreateRoutineScreen } from "@/screens/CreateRoutineScreen"
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

    expect(getByLabelText("Geri")).toBeTruthy()
  })

  it("shows creator text", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("panout tarafından oluşturuldu")).toBeTruthy()
  })

  it("shows start routine button", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Rutini Başlat")).toBeTruthy()
  })

  it("shows analytics placeholder section", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("15k kg")).toBeTruthy()
    expect(getByText("Son 30 gün")).toBeTruthy()
  })

  it("shows analytics tabs", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Hacim")).toBeTruthy()
    expect(getByText("Tekrar")).toBeTruthy()
    expect(getByText("Süre")).toBeTruthy()
  })

  it("shows exercise list with count", () => {
    const { getByText } = renderRoutineDetailScreen()

    expect(getByText("Egzersizler (2)")).toBeTruthy()
    expect(getByText("Bench Press")).toBeTruthy()
    expect(getByText("Overhead Press")).toBeTruthy()
  })

  it("shows edit routine link", () => {
    const { getByLabelText } = renderRoutineDetailScreen()

    expect(getByLabelText("Rutini Düzenle")).toBeTruthy()
  })

  it("shows not found message for non-existent template", () => {
    const store = RootStoreModel.create({})
    const { getByText } = renderRoutineDetailScreen(store, "non-existent-id")

    expect(getByText("Rutin bulunamadı")).toBeTruthy()
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
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("RoutineDetailScreen navigation", () => {
  it("navigates to detail when more options pressed from workout tab", async () => {
    const store = createStoreWithTemplate()
    const { getByText, getByLabelText } = renderFromWorkoutTab(store)

    // Wait for routine card to show
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })

    // Click on "More options" to navigate to detail
    fireEvent.press(getByLabelText("More options"))

    // Wait for detail screen
    await waitFor(() => {
      expect(getByText("Rutini Başlat")).toBeTruthy()
      expect(getByText("panout tarafından oluşturuldu")).toBeTruthy()
    })
  })

  it("start routine button starts workout and navigates to active workout", async () => {
    const store = createStoreWithTemplate()
    const { getByText, getByLabelText } = renderFromWorkoutTab(store)

    // Navigate to routine detail
    await waitFor(() => {
      expect(getByText("Upper Body A")).toBeTruthy()
    })
    fireEvent.press(getByLabelText("More options"))

    await waitFor(() => {
      expect(getByText("Rutini Başlat")).toBeTruthy()
    })

    fireEvent.press(getByText("Rutini Başlat"))

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
    fireEvent.press(getByLabelText("More options"))

    await waitFor(() => {
      expect(getByLabelText("Rutini Düzenle")).toBeTruthy()
    })

    fireEvent.press(getByLabelText("Rutini Düzenle"))

    await waitFor(() => {
      expect(getByText("Rutin Oluştur")).toBeTruthy()
    })
  })
})

describe("RoutineDetailScreen analytics tabs", () => {
  it("can switch between analytics tabs", () => {
    const { getByText } = renderRoutineDetailScreen()

    // Click on Tekrar tab
    fireEvent.press(getByText("Tekrar"))

    // Click on Süre tab
    fireEvent.press(getByText("Süre"))

    // Click back to Hacim tab
    fireEvent.press(getByText("Hacim"))

    // All tabs should still be visible
    expect(getByText("Hacim")).toBeTruthy()
    expect(getByText("Tekrar")).toBeTruthy()
    expect(getByText("Süre")).toBeTruthy()
  })
})
