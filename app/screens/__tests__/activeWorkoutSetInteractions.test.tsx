import { StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native"

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
  it("keeps the add-exercise action above the device navigation inset", async () => {
    ;(globalThis as any).__SAFE_AREA_INSETS__ = { top: 0, right: 0, bottom: 34, left: 0 }
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")

    try {
      const { getByTestId, getByText } = renderActiveWorkout(store)
      await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

      expect(StyleSheet.flatten(getByTestId("active-workout-footer").props.style)).toMatchObject({
        paddingBottom: 34,
      })
    } finally {
      delete (globalThis as any).__SAFE_AREA_INSETS__
    }
  })

  it("renders set type indicators with working set indices", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!

    const defaultSetId = store.workoutStore.currentSession?.exercises.find((e) => e.id === weId)
      ?.sets?.[0]?.id
    expect(defaultSetId).toBeDefined()
    store.workoutStore.deleteSetFromWorkoutExercise(weId, defaultSetId!)

    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "warmup", weight: 40, reps: 10 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 80, reps: 8 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "dropset", weight: 60, reps: 12 })
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 90, reps: 6 })

    const { getByText, getAllByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    const warmupButtons = getAllByLabelText("Set type for Bench Press, set 1: warmup")
    expect(within(warmupButtons[0]).getByText("W")).toBeTruthy()

    const dropsetButtons = getAllByLabelText("Set type for Bench Press, set 3: dropset")
    expect(within(dropsetButtons[0]).getByText("D")).toBeTruthy()

    const workingButtons = getAllByLabelText(/Set type for Bench Press, set (2|4): working/)
    expect(workingButtons).toHaveLength(2)
    expect(within(workingButtons[0]).getByText("1")).toBeTruthy()
    expect(within(workingButtons[1]).getByText("2")).toBeTruthy()
  })

  it("converts template placeholders to real values when marking done (and persists to history)", async () => {
    const store = RootStoreModel.create({})

    // Create a template with stored set values
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!
    const setId = store.workoutStore.currentSession?.exercises.find((e) => e.id === weId)?.sets?.[0]
      ?.id
    expect(setId).toBeDefined()
    store.workoutStore.updateSetInWorkoutExercise(weId, setId!, { weight: 100, reps: 5 })

    const templateId = store.workoutStore.createTemplateFromSession("Bench Template")!
    act(() => {
      store.workoutStore.completeSession()
    })

    // Start from template (session values start at 0; template values are placeholders)
    store.workoutStore.startSessionFromTemplate(templateId)

    expect(store.workoutStore.currentSession?.exercises[0]?.sets?.[0]?.weight).toBe(0)
    expect(store.workoutStore.currentSession?.exercises[0]?.sets?.[0]?.reps).toBe(0)

    const { getByText, getAllByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // Mark set done: placeholder values should be copied into the set data.
    fireEvent.press(getAllByLabelText("Mark Bench Press, set 1 complete")[0])

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets?.[0]?.weight).toBe(100)
      expect(store.workoutStore.currentSession?.exercises[0]?.sets?.[0]?.reps).toBe(5)
    })

    act(() => {
      store.workoutStore.completeSession()
    })

    const last = store.workoutStore.sessionHistory[store.workoutStore.sessionHistory.length - 1]
    expect(last.exercises[0]?.sets[0]?.weight).toBe(100)
    expect(last.exercises[0]?.sets[0]?.reps).toBe(5)
  })

  it("updates header stats immediately when toggling a set done/undone", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!

    const setId = store.workoutStore.currentSession?.exercises.find((e) => e.id === weId)?.sets?.[0]
      ?.id
    expect(setId).toBeDefined()
    store.workoutStore.updateSetInWorkoutExercise(weId, setId!, { weight: 100, reps: 5 })

    const { getByText, getAllByLabelText, getByLabelText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    const readText = (node: any) => {
      const c = node.props.children
      return Array.isArray(c) ? c.join("") : String(c)
    }

    expect(readText(getByLabelText("workout-stats-volume-value"))).toBe("0 kg")
    expect(readText(getByLabelText("workout-stats-sets-value"))).toBe("0")

    fireEvent.press(getAllByLabelText("Mark Bench Press, set 1 complete")[0])

    await waitFor(() => {
      expect(readText(getByLabelText("workout-stats-volume-value"))).toBe("500 kg")
      expect(readText(getByLabelText("workout-stats-sets-value"))).toBe("1")
    })

    fireEvent.press(getAllByLabelText("Mark Bench Press, set 1 incomplete")[0])

    await waitFor(() => {
      expect(readText(getByLabelText("workout-stats-volume-value"))).toBe("0 kg")
      expect(readText(getByLabelText("workout-stats-sets-value"))).toBe("0")
    })
  })

  it("opens set options on set type tap and keeps set row editable when toggling done", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const weId = store.workoutStore.addExerciseToSession("bench-press")!
    store.workoutStore.addSetToWorkoutExercise(weId, { setType: "working", weight: 100, reps: 5 })

    const { getByText, getAllByLabelText, queryByText } = renderActiveWorkout(store)

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    expect(queryByText("Select Set Type")).toBeNull()

    // Press on the set type indicator (opens SetOptionsBottomSheet)
    fireEvent.press(getAllByLabelText("Set type for Bench Press, set 1: working")[0])
    await waitFor(() => expect(getByText("Select Set Type")).toBeTruthy())

    fireEvent.press(getAllByLabelText("Mark Bench Press, set 1 complete")[0])

    // Still editable (inputs remain) - labels updated to match new SetRow design
    expect(getAllByLabelText(/weight in kilograms/).length).toBeGreaterThan(0)
    expect(getAllByLabelText(/repetitions/).length).toBeGreaterThan(0)
  })

  it("starts the selected rest timer only when a set transitions to done", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    const exerciseId = store.workoutStore.addExerciseToSession("bench-press")!
    const set = store.workoutStore.currentSession!.exercises[0].sets[0]
    store.workoutStore.updateSetInWorkoutExercise(exerciseId, set.id, { weight: 100, reps: 5 })

    const { getByLabelText, getByText, queryByText, unmount } = renderActiveWorkout(store)

    try {
      await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())
      expect(getByLabelText("Rest timer for Bench Press: off")).toBeTruthy()
      expect(
        getByLabelText("Rest timer for Bench Press: 90 seconds").props.accessibilityState,
      ).toEqual({ selected: true })
      expect(getByLabelText("Rest timer for Bench Press: 120 seconds")).toBeTruthy()
      expect(getByLabelText("Rest timer for Bench Press: 180 seconds")).toBeTruthy()
      fireEvent.press(getByLabelText("Rest timer for Bench Press: 60 seconds"))
      expect(store.workoutStore.currentSession?.exercises[0].restTime).toBe(60)

      fireEvent.press(getByLabelText("Mark Bench Press, set 1 complete"))
      expect(store.workoutStore.currentSession?.restTimerEndsAt?.toISOString()).toBe(
        "2025-01-01T00:01:00.000Z",
      )
      expect(getByText("1:00")).toBeTruthy()

      jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
      fireEvent.press(getByLabelText("Mark Bench Press, set 1 incomplete"))
      expect(store.workoutStore.currentSession?.restTimerEndsAt?.toISOString()).toBe(
        "2025-01-01T00:01:00.000Z",
      )

      fireEvent.press(getByLabelText("Add 30 seconds to rest timer"))
      expect(store.workoutStore.currentSession?.restTimerEndsAt?.toISOString()).toBe(
        "2025-01-01T00:01:30.000Z",
      )
      fireEvent.press(getByLabelText("Skip rest timer"))
      expect(queryByText("Rest timer")).toBeNull()
    } finally {
      unmount()
      jest.useRealTimers()
    }
  })
})
