// eslint-disable-next-line no-restricted-imports
import { View, Text as RNText } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import { ThemeProvider } from "@/theme/context"

import { SessionOverlay } from "../SessionOverlay"

const Stack = createNativeStackNavigator()

// Mock navigation
const mockNavigate = jest.fn()
const mockIsReady = jest.fn(() => true)
const mockGetRootState = jest.fn(() => ({
  index: 0,
  routes: [{ name: "WorkoutTab" }],
}))
const mockAddListener = jest.fn(() => jest.fn())

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native")
  return {
    ...actualNav,
    useNavigation: () => ({
      dispatch: mockNavigate,
    }),
  }
})

jest.mock("@/navigators/navigationUtilities", () => ({
  navigationRef: {
    isReady: () => mockIsReady(),
    getRootState: () => mockGetRootState(),
    addListener: () => mockAddListener(),
  },
  getActiveRouteName: (state: { routes: { name: string }[]; index?: number }) => {
    const route = state.routes[state.index ?? 0]
    return route.name
  },
}))

function MockScreen() {
  return (
    <View>
      <RNText>Mock Screen</RNText>
      <SessionOverlay />
    </View>
  )
}

function renderSessionOverlay(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MockScreen" component={MockScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("SessionOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Default to WorkoutTab route (where overlay should be visible)
    mockIsReady.mockReturnValue(true)
    mockGetRootState.mockReturnValue({
      index: 0,
      routes: [{ name: "WorkoutTab" }],
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("visibility", () => {
    it("is hidden when no active session", () => {
      const { queryByText } = renderSessionOverlay()

      expect(queryByText("Devam")).toBeNull()
      expect(queryByText("Sil")).toBeNull()
    })

    it("renders when session is active", () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("Devam")).toBeTruthy()
      expect(getByText("Sil")).toBeTruthy()
    })
  })

  describe("continue button", () => {
    it("dispatches navigation to ActiveWorkout when pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Devam"))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "NAVIGATE",
            payload: expect.objectContaining({
              name: "Workout",
              params: { screen: "ActiveWorkout" },
            }),
          }),
        )
      })
    })
  })

  describe("discard confirmation flow", () => {
    it("shows discard modal when Sil is pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Sil"))

      await waitFor(() => {
        expect(getByText("Discard Workout?")).toBeTruthy()
        expect(getByText("You will lose all progress from this workout session.")).toBeTruthy()
      })
    })

    it("hides modal when Cancel is pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText, queryByText, getByLabelText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Sil"))

      await waitFor(() => {
        expect(getByText("Discard Workout?")).toBeTruthy()
      })

      fireEvent.press(getByLabelText("Cancel and keep workout"))

      await waitFor(() => {
        expect(queryByText("Discard Workout?")).toBeNull()
      })

      // Session should still be active
      expect(store.workoutStore.currentSession).toBeDefined()
    })

    it("discards session when confirmed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()
      store.workoutStore.addExerciseToSession("bench-press")

      const { getByText, queryByText, getByLabelText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Sil"))

      await waitFor(() => {
        expect(getByText("Discard Workout?")).toBeTruthy()
      })

      fireEvent.press(getByLabelText("Confirm discard workout"))

      await waitFor(() => {
        expect(queryByText("Discard Workout?")).toBeNull()
      })

      // Session should be discarded
      expect(store.workoutStore.currentSession).toBeUndefined()
    })
  })

  describe("route-based visibility", () => {
    it("hides overlay on ActiveWorkout screen", () => {
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ name: "ActiveWorkout" }],
      })

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { queryByText } = renderSessionOverlay(store)

      expect(queryByText("Devam")).toBeNull()
      expect(queryByText("Sil")).toBeNull()
    })

    it("hides overlay on ExerciseLibrary screen", () => {
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ name: "ExerciseLibrary" }],
      })

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { queryByText } = renderSessionOverlay(store)

      expect(queryByText("Devam")).toBeNull()
      expect(queryByText("Sil")).toBeNull()
    })

    it("hides overlay on WorkoutComplete screen", () => {
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ name: "WorkoutComplete" }],
      })

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { queryByText } = renderSessionOverlay(store)

      expect(queryByText("Devam")).toBeNull()
      expect(queryByText("Sil")).toBeNull()
    })

    it("shows overlay on WorkoutTab screen", () => {
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ name: "WorkoutTab" }],
      })

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("Devam")).toBeTruthy()
      expect(getByText("Sil")).toBeTruthy()
    })

    it("shows overlay on other tab screens", () => {
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ name: "ProfileTab" }],
      })

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("Devam")).toBeTruthy()
      expect(getByText("Sil")).toBeTruthy()
    })

    it("subscribes to navigation state changes", () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      renderSessionOverlay(store)

      expect(mockAddListener).toHaveBeenCalled()
    })

    it("handles navigation ref not ready gracefully", () => {
      mockIsReady.mockReturnValue(false)

      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      // Should not throw error when navigationRef is not ready
      const { getByText } = renderSessionOverlay(store)

      // Since route is empty string (not in hidden routes), overlay should show
      expect(getByText("Devam")).toBeTruthy()
    })
  })
})
