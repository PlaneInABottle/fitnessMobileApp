import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { HomeStackParamList } from "@/navigators/navigationTypes"
import { HomeScreen } from "@/screens/HomeScreen"
import { WorkoutHistoryScreen } from "@/screens/WorkoutHistoryScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<HomeStackParamList>()

function renderHomeScreen(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeTab" component={HomeScreen} />
            <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] })
    jest.setSystemTime(new Date("2026-07-09T12:00:00Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders correctly with header", () => {
    const { getByText } = renderHomeScreen()

    expect(getByText("Fitness Tracker")).toBeTruthy()
    expect(getByText("Thursday, July 9")).toBeTruthy()
  })

  it("shows an actionable empty state", () => {
    const { store, getByText, getByTestId } = renderHomeScreen()

    expect(getByText("Ready to train?")).toBeTruthy()
    expect(getByTestId("home-start-workout")).toBeTruthy()
    expect(getByText("No completed workouts yet")).toBeTruthy()

    fireEvent.press(getByTestId("home-start-workout"))
    expect(store.workoutStore.currentSession).toBeDefined()
  })

  it("does not count sessions without completed sets as workouts", () => {
    const store = RootStoreModel.create({
      workoutStore: {
        sessionHistory: [
          {
            id: "empty-history",
            startedAt: new Date("2026-07-08T10:00:00Z").getTime(),
            completedAt: new Date("2026-07-08T10:01:00Z").getTime(),
            exercises: [],
          },
        ],
      },
    })
    const { getByText, getByTestId } = renderHomeScreen(store)

    expect(getByTestId("home-total-workouts").props.children).toBe("0")
    expect(getByText("No completed workouts yet")).toBeTruthy()
  })

  it("derives summary and recent activity from completed sessions", () => {
    const store = RootStoreModel.create({
      workoutStore: {
        sessionHistory: [
          {
            id: "history-1",
            startedAt: new Date("2026-07-08T10:00:00Z").getTime(),
            completedAt: new Date("2026-07-08T10:45:00Z").getTime(),
            exercises: [
              {
                id: "history-exercise-1",
                exerciseId: "bench-press",
                sets: [
                  {
                    id: "history-set-1",
                    setType: "working",
                    weight: 100,
                    reps: 5,
                    isDone: true,
                  },
                  {
                    id: "history-set-2",
                    setType: "working",
                    weight: 80,
                    reps: 5,
                    isDone: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      performanceMemoryStore: {
        schemaVersion: 2,
        personalRecords: {
          "bench-press": {
            maxWeight: 100,
            maxReps: 5,
            updatedAt: new Date("2026-07-08T10:45:00Z").getTime(),
          },
        },
      },
    })
    const { getByText, getByTestId } = renderHomeScreen(store)

    expect(getByTestId("home-total-workouts").props.children).toBe("1")
    expect(getByTestId("home-week-workouts").props.children).toBe("1")
    expect(getByTestId("home-total-volume").props.children).toBe("500")
    expect(getByTestId("home-total-minutes").props.children).toBe("45")
    expect(getByText("1 exercise with personal records")).toBeTruthy()
    expect(getByText("Bench Press")).toBeTruthy()
    expect(getByText("1 set")).toBeTruthy()
    expect(getByText("500 kg")).toBeTruthy()
  })

  it("opens completed workout details", async () => {
    const store = RootStoreModel.create({
      workoutStore: {
        sessionHistory: [
          {
            id: "history-details",
            startedAt: new Date("2026-07-08T10:00:00Z").getTime(),
            completedAt: new Date("2026-07-08T10:45:00Z").getTime(),
            exercises: [
              {
                id: "history-exercise-details",
                exerciseId: "bench-press",
                sets: [
                  {
                    id: "history-set-details",
                    setType: "working",
                    weight: 100,
                    reps: 5,
                    isDone: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const { getByText, getByTestId } = renderHomeScreen(store)

    fireEvent.press(getByTestId("workout-history-history-details"))

    await waitFor(() => expect(getByText("Workout details")).toBeTruthy())
    expect(getByText("Bench Press")).toBeTruthy()
    expect(getByText(/100 kg.*5 reps/)).toBeTruthy()
    expect(getByText("Working")).toBeTruthy()
  })
})
