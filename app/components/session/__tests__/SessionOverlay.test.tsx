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
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native")
  return {
    ...actualNav,
    useNavigation: () => ({
      dispatch: mockNavigate,
    }),
  }
})

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
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("visibility", () => {
    it("is hidden when no active session", () => {
      const { queryByText } = renderSessionOverlay()

      expect(queryByText("Continue")).toBeNull()
      expect(queryByText("Discard")).toBeNull()
    })

    it("renders when session is active", () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("Continue")).toBeTruthy()
      expect(getByText("Discard")).toBeTruthy()
    })

    it("displays exercise count correctly", () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()
      store.workoutStore.addExerciseToSession("bench-press")
      store.workoutStore.addExerciseToSession("squat")

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("2 exercises")).toBeTruthy()
    })

    it("displays singular exercise label for one exercise", () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()
      store.workoutStore.addExerciseToSession("bench-press")

      const { getByText } = renderSessionOverlay(store)

      expect(getByText("1 exercise")).toBeTruthy()
    })
  })

  describe("continue button", () => {
    it("dispatches navigation to ActiveWorkout when pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Continue"))

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
    it("shows discard modal when Discard is pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Discard"))

      await waitFor(() => {
        expect(getByText("Discard Workout?")).toBeTruthy()
        expect(getByText("You will lose all progress from this workout session.")).toBeTruthy()
      })
    })

    it("hides modal when Cancel is pressed", async () => {
      const store = RootStoreModel.create({})
      store.workoutStore.startNewSession()

      const { getByText, queryByText, getByLabelText } = renderSessionOverlay(store)

      fireEvent.press(getByText("Discard"))

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

      fireEvent.press(getByText("Discard"))

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
})
