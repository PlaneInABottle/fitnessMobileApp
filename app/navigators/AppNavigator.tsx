/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { useAppTheme } from "@/theme/context"

import type { AppStackParamList, NavigationProps, WorkoutStackParamList } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

// Documentation: https://reactnavigation.org/docs/bottom-tab-navigator
const Tab = createBottomTabNavigator<AppStackParamList>()

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>()

const WorkoutStackNavigator = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <WorkoutStack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <WorkoutStack.Screen name="WorkoutTab" component={WorkoutTabScreen} />
      <WorkoutStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <WorkoutStack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <WorkoutStack.Screen name="WorkoutComplete" component={WorkoutCompleteScreen} />
    </WorkoutStack.Navigator>
  )
}

const AppTabs = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="Workout" component={WorkoutStackNavigator} options={{ title: "Workout" }} />
    </Tab.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  const exitRouteNames = [...exitRoutes, "WorkoutTab"]
  useBackButtonHandler((routeName) => exitRouteNames.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppTabs />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
