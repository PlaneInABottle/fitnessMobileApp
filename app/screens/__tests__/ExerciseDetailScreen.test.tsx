import { StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ExerciseDetailScreen } from "@/screens/ExerciseDetailScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderExerciseDetail(exerciseId: string, selectionContext?: "workout" | "routine") {
  const store = RootStoreModel.create({})
  return render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="ExerciseDetail"
              component={ExerciseDetailScreen}
              initialParams={{ exerciseId, selectionContext }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )
}

describe("ExerciseDetailScreen", () => {
  it("shows a demonstration, pose images, instructions, and attribution", () => {
    const { getByLabelText, getByText } = renderExerciseDetail("bench-press")

    expect(getByLabelText("Bench Press movement demonstration").props.pointerEvents).toBe("none")
    expect(getByText("Demo")).toBeTruthy()
    expect(getByText("Start")).toBeTruthy()
    expect(getByText("Finish")).toBeTruthy()
    expect(getByLabelText("Pause exercise demo")).toBeTruthy()
    expect(getByText("Video credits")).toBeTruthy()
    expect(getByText("YMove via YMove")).toBeTruthy()
    expect(getByText("Royalty-free commercial use")).toBeTruthy()
    expect(getByText("Instructions")).toBeTruthy()

    fireEvent.press(getByText("Finish"))
    expect(getByLabelText("Bench Press, finish position")).toBeTruthy()
  })

  it("falls back to pose images when no demonstration is available", () => {
    const { getByLabelText, getByText, queryByText } = renderExerciseDetail("3_4_Sit-Up")

    expect(queryByText("Demo")).toBeNull()
    expect(getByText("Start")).toBeTruthy()
    expect(getByText("Finish")).toBeTruthy()
    expect(getByLabelText("3/4 Sit-Up, start position")).toBeTruthy()
  })

  it("automatically retries a transient demo failure and keeps a manual retry action", async () => {
    const replaceAsync = jest.fn().mockResolvedValue(undefined)
    ;(globalThis as any).__VIDEO_STATUS__ = "error"
    ;(globalThis as any).__VIDEO_REPLACE_ASYNC__ = replaceAsync

    try {
      const { getByLabelText, getByText } = renderExerciseDetail("bench-press")

      expect(getByText("Demo unavailable")).toBeTruthy()
      await waitFor(() => expect(replaceAsync).toHaveBeenCalledWith(expect.anything()))

      fireEvent.press(getByLabelText("Retry exercise demo"))
      await waitFor(() => expect(replaceAsync).toHaveBeenCalledTimes(2))
    } finally {
      delete (globalThis as any).__VIDEO_STATUS__
      delete (globalThis as any).__VIDEO_REPLACE_ASYNC__
    }
  })

  it("keeps the add action above the device navigation inset", () => {
    ;(globalThis as any).__SAFE_AREA_INSETS__ = { top: 0, right: 0, bottom: 34, left: 0 }

    try {
      const { getByTestId } = renderExerciseDetail("bench-press", "workout")

      expect(StyleSheet.flatten(getByTestId("exercise-detail-footer").props.style)).toMatchObject({
        paddingBottom: 34,
      })
    } finally {
      delete (globalThis as any).__SAFE_AREA_INSETS__
    }
  })
})
