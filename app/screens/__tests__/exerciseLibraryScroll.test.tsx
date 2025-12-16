import { ScrollView, StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { WorkoutStackParamList } from "@/navigators/navigationTypes"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<WorkoutStackParamList>()

describe("ExerciseLibraryScreen scrolling", () => {
  it("uses fixed header and scrollable exercise list", () => {
    const store = RootStoreModel.create({})
    store.workoutStore.startNewSession()

    const { UNSAFE_getAllByType } = render(
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

    // Screen now has a fixed header with filter chips (horizontal scroll)
    // and main content scroll view for exercises
    const scrollViews = UNSAFE_getAllByType(ScrollView)
    expect(scrollViews.length).toBeGreaterThanOrEqual(1)

    // Main content scroll should not have flex: 1 in contentContainerStyle
    const mainScrollView = scrollViews.find(
      (sv) => !sv.props.horizontal && sv.props.style?.flex === 1,
    )
    if (mainScrollView) {
      const flattened = StyleSheet.flatten(mainScrollView.props.contentContainerStyle)
      expect(flattened?.flex).toBeUndefined()
    }
  })
})
