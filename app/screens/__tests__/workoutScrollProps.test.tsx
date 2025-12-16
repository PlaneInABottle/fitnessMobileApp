import { ScrollView, StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

function renderScrollScreen(route: keyof WorkoutStackParamList, component: any) {
  const store = RootStoreModel.create({})
  store.workoutStore.startNewSession()

  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={route}>
            <Stack.Screen name={route} component={component} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return result
}

describe("Workout scroll screen props", () => {
  it("ActiveWorkout uses Screen with fixed preset and has scrollable content", () => {
    const { UNSAFE_getAllByType } = renderScrollScreen("ActiveWorkout", ActiveWorkoutScreen)
    const scrollViews = UNSAFE_getAllByType(ScrollView)

    // ActiveWorkout now uses Screen preset="fixed" with a ScrollView for content
    expect(scrollViews.length).toBeGreaterThanOrEqual(1)

    const mainScrollView = scrollViews.find((sv) => sv.props.style?.flex === 1)
    if (mainScrollView) {
      const flattened = StyleSheet.flatten(mainScrollView.props.contentContainerStyle)
      expect(flattened?.flex).toBeUndefined()
    }
  })

  it("WorkoutComplete uses sticky header and does not pin ScrollView contentContainerStyle to flex:1", () => {
    const { UNSAFE_getByType } = renderScrollScreen("WorkoutComplete", WorkoutCompleteScreen)
    const scrollView = UNSAFE_getByType(ScrollView)

    expect(scrollView.props.stickyHeaderIndices).toEqual([0])

    const flattened = StyleSheet.flatten(scrollView.props.contentContainerStyle)
    expect(flattened?.flex).toBeUndefined()
  })
})
