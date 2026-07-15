import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ExerciseDetailScreen } from "@/screens/ExerciseDetailScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderExerciseDetail(exerciseId: string) {
  const store = RootStoreModel.create({})
  return render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="ExerciseDetail"
              component={ExerciseDetailScreen}
              initialParams={{ exerciseId }}
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

    expect(getByLabelText("Bench Press movement demonstration")).toBeTruthy()
    expect(getByText("Demo")).toBeTruthy()
    expect(getByText("Start")).toBeTruthy()
    expect(getByText("Finish")).toBeTruthy()
    expect(getByText(/Modified demo by YMove via YMove/)).toBeTruthy()
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
})
