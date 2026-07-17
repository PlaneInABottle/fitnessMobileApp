import { FlatList, ScrollView } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

describe("ExerciseLibraryScreen scrolling", () => {
  it("uses fixed header and scrollable exercise list", () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()

    const { UNSAFE_getAllByType, UNSAFE_getByType, getByPlaceholderText, getByText } = render(
      <RootStoreProvider value={store}>
        <ThemeProvider>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName="ExerciseLibrary"
            >
              <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </RootStoreProvider>,
    )

    const scrollViews = UNSAFE_getAllByType(ScrollView)
    expect(scrollViews.some((scrollView) => scrollView.props.horizontal)).toBe(true)

    const exerciseList = UNSAFE_getByType(FlatList)
    expect(exerciseList.props.data).toHaveLength(873)
    expect(exerciseList.props.initialNumToRender).toBe(10)
    expect(exerciseList.props.windowSize).toBe(5)

    fireEvent.changeText(
      getByPlaceholderText("Search exercises"),
      "barbell bench press medium grip",
    )
    expect(getByText("1 exercise")).toBeTruthy()
  })
})
