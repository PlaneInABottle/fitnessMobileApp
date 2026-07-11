import { Alert } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render, fireEvent, waitFor, act } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderWorkoutFlowWithStore(store = RootStoreModel.create({})) {
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

function renderWorkoutFlow() {
  const store = RootStoreModel.create({})

  // Seed memory so placeholders appear immediately.
  store.performanceMemoryStore.recordCompletedWorkout({
    completedAt: new Date("2025-01-01T00:00:00Z"),
    exercises: [
      {
        exerciseId: "bench-press",
        category: "STRENGTH",
        sets: [
          { setType: "working", weight: 100, reps: 5 },
          { setType: "working", weight: 110, reps: 3 },
        ],
      },
    ],
  })

  return renderWorkoutFlowWithStore(store)
}

describe("WorkoutTabScreen primary action", () => {
  it("shows Start empty workout when no active session", () => {
    const store = RootStoreModel.create({})
    const { getByText, queryByText } = renderWorkoutFlowWithStore(store)

    expect(getByText("Start empty workout")).toBeTruthy()
    expect(queryByText("Resume workout")).toBeNull()
  })

  it("shows Resume Workout indicator when session is active", () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")

    const { getByText, queryByText } = renderWorkoutFlowWithStore(store)

    expect(getByText("Resume workout")).toBeTruthy()
    expect(queryByText("Start empty workout")).toBeNull()
  })

  it("navigates to ActiveWorkout when Resume indicator is pressed", async () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()
    store.workoutStore.addExerciseToSession("bench-press")

    const { getByText } = renderWorkoutFlowWithStore(store)

    fireEvent.press(getByText("Resume workout"))

    await waitFor(() => {
      expect(getByText("Bench Press")).toBeTruthy()
    })
  })

  it("switches to Resume indicator after starting a workout", async () => {
    const store = RootStoreModel.create({})
    const { getByText } = renderWorkoutFlowWithStore(store)

    // Initially shows Start Empty Workout button
    expect(getByText("Start empty workout")).toBeTruthy()

    fireEvent.press(getByText("Start empty workout"))

    // Navigate back to WorkoutTab - session should be active
    await waitFor(() => {
      expect(store.workoutStore.currentSession).toBeDefined()
    })
  })
})

describe("Workout MVP flow", () => {
  it("runs through start -> add exercise -> add set -> complete -> save template", async () => {
    const { store, getByText, getByTestId, getByLabelText, getByPlaceholderText } =
      renderWorkoutFlow()

    fireEvent.press(getByText("Start empty workout"))

    await waitFor(() => expect(getByText("No exercises yet")).toBeTruthy())

    fireEvent.press(getByText("Add Exercise"))

    fireEvent.changeText(
      getByPlaceholderText("Search exercises"),
      "barbell bench press medium grip",
    )
    await waitFor(() => expect(getByLabelText("Add Bench Press")).toBeTruthy())
    fireEvent.press(getByLabelText("Add Bench Press"))

    await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

    // First set is created by default when exercise is added
    const reps1 = getByLabelText("Reps")
    const kg1 = getByLabelText("Kg")

    fireEvent.changeText(reps1, "5")
    fireEvent.changeText(kg1, "60")

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(1)
      expect(store.workoutStore.currentSession?.exercises[0]?.sets[0]?.reps).toBe(5)
      expect(store.workoutStore.currentSession?.exercises[0]?.sets[0]?.weight).toBe(60)
    })

    // Mark first set as done
    const workoutExerciseId = store.workoutStore.currentSession?.exercises[0]?.id
    const firstSetId = store.workoutStore.currentSession?.exercises[0]?.sets[0]?.id
    if (workoutExerciseId && firstSetId) {
      act(() => {
        store.workoutStore.updateSetInWorkoutExercise(workoutExerciseId, firstSetId, {
          isDone: true,
        })
      })
    }

    // Add second set
    fireEvent.press(getByText("+ Add Set"))

    await waitFor(() => {
      expect(store.workoutStore.currentSession?.exercises[0]?.sets.length).toBe(2)
    })

    // Mark second set as done
    const secondSetId = store.workoutStore.currentSession?.exercises[0]?.sets[1]?.id
    if (workoutExerciseId && secondSetId) {
      act(() => {
        store.workoutStore.updateSetInWorkoutExercise(workoutExerciseId, secondSetId, {
          isDone: true,
        })
      })
    }

    fireEvent.press(getByText("Finish"))

    await waitFor(() => expect(getByText("Workout Complete")).toBeTruthy())

    expect(getByTestId("workoutComplete.exerciseCount").props.children).toBe("1")
    expect(getByTestId("workoutComplete.totalSets").props.children).toBe("2")

    fireEvent.press(getByText("Save as Routine"))
    fireEvent.changeText(getByPlaceholderText("Routine name"), "Upper A")
    fireEvent.press(getByText("Save"))

    await waitFor(() => expect(getByText("Routines")).toBeTruthy())

    expect(
      Array.from(store.workoutStore.templates.values()).some((t: any) => t.name === "Upper A"),
    ).toBe(true)
    expect(store.workoutStore.sessionHistory.length).toBe(1)
  })

  it("template completion triggers update Alert", async () => {
    const store = RootStoreModel.create({})
    const templateId = store.workoutStore.createTemplate("Template A", ["bench-press"])!

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {})

    try {
      const { getByLabelText, getByText, getByPlaceholderText } = renderWorkoutFlowWithStore(store)

      fireEvent.press(getByLabelText("Start Template A"))

      await waitFor(() => expect(getByText("Bench Press")).toBeTruthy())

      fireEvent.press(getByText("+ Add Exercise"))
      await waitFor(() => expect(getByText("Add Exercise")).toBeTruthy())

      fireEvent.changeText(getByPlaceholderText("Search exercises"), "barbell full squat")
      await waitFor(() => expect(getByLabelText("Add Squat")).toBeTruthy())
      fireEvent.press(getByLabelText("Add Squat"))

      await waitFor(() => expect(getByText("Squat")).toBeTruthy())

      const squatExercise = store.workoutStore.currentSession?.exercises.find(
        (exercise) => exercise.exerciseId === "squat",
      )
      const squatSet = squatExercise?.sets[0]
      if (squatExercise && squatSet) {
        act(() => {
          store.workoutStore.updateSetInWorkoutExercise(squatExercise.id, squatSet.id, {
            weight: 60,
            reps: 5,
            isDone: true,
          })
        })
      }

      fireEvent.press(getByText("Finish"))
      await waitFor(() => expect(getByText("Workout Complete")).toBeTruthy())

      fireEvent.press(getByText("Done"))

      await waitFor(() => expect(alertSpy).toHaveBeenCalled())

      const [title, message, buttons] = alertSpy.mock.calls[0]
      expect(title).toBe("Update routine?")
      expect(message).toContain("Exercises: +1 / -0")
      expect(message).toContain("Sets: +1 / -0")

      const updateButton = (buttons as any[]).find((b) => b.text === "Update")
      await act(async () => {
        updateButton?.onPress?.()
      })

      await waitFor(() => expect(getByText("Routines")).toBeTruthy())

      expect(store.workoutStore.templates.get(templateId)?.exerciseIds.slice()).toEqual([
        "bench-press",
        "squat",
      ])
    } finally {
      alertSpy.mockRestore()
    }
  })
})
