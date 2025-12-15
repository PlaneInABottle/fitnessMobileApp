import React from "react"
import { render } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { ScrollView, StyleSheet } from "react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ThemeProvider } from "@/theme/context"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"

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
  it("ActiveWorkout uses sticky header and does not pin ScrollView contentContainerStyle to flex:1", () => {
    const { UNSAFE_getByType } = renderScrollScreen("ActiveWorkout", ActiveWorkoutScreen)
    const scrollView = UNSAFE_getByType(ScrollView)

    expect(scrollView.props.stickyHeaderIndices).toEqual([0])

    const flattened = StyleSheet.flatten(scrollView.props.contentContainerStyle)
    expect(flattened?.flex).toBeUndefined()
  })

  it("WorkoutComplete uses sticky header and does not pin ScrollView contentContainerStyle to flex:1", () => {
    const { UNSAFE_getByType } = renderScrollScreen("WorkoutComplete", WorkoutCompleteScreen)
    const scrollView = UNSAFE_getByType(ScrollView)

    expect(scrollView.props.stickyHeaderIndices).toEqual([0])

    const flattened = StyleSheet.flatten(scrollView.props.contentContainerStyle)
    expect(flattened?.flex).toBeUndefined()
  })
})
