import React from "react"
import { render } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { ScrollView, StyleSheet } from "react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ThemeProvider } from "@/theme/context"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

describe("ExerciseLibraryScreen scrolling", () => {
  it("uses sticky header and does not pin ScrollView contentContainerStyle to flex:1", () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()

    const { UNSAFE_getByType } = render(
      <RootStoreProvider value={store}>
        <ThemeProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="ExerciseLibrary">
              <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </RootStoreProvider>,
    )

    const scrollView = UNSAFE_getByType(ScrollView)
    const flattened = StyleSheet.flatten(scrollView.props.contentContainerStyle)

    expect(scrollView.props.stickyHeaderIndices).toEqual([0])
    expect(flattened?.flex).toBeUndefined()
  })
})
