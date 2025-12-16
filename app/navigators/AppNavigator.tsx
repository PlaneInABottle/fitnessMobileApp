/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { View, ViewStyle } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { SessionOverlay } from "@/components/session"
import { TabBarIcon } from "@/components/TabBarIcon"
import Config from "@/config"
import { ActiveWorkoutScreen } from "@/screens/ActiveWorkoutScreen"
import { CreateRoutineScreen } from "@/screens/CreateRoutineScreen"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { ExerciseLibraryScreen } from "@/screens/ExerciseLibraryScreen"
import { HomeScreen } from "@/screens/HomeScreen"
import { ProfileScreen } from "@/screens/ProfileScreen"
import { RoutineDetailScreen } from "@/screens/RoutineDetailScreen"
import { WorkoutCompleteScreen } from "@/screens/WorkoutCompleteScreen"
import { WorkoutTabScreen } from "@/screens/WorkoutTabScreen"
import { useAppTheme } from "@/theme/context"

import type {
  AppStackParamList,
  HomeStackParamList,
  NavigationProps,
  ProfileStackParamList,
  WorkoutStackParamList,
} from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

// Documentation: https://reactnavigation.org/docs/bottom-tab-navigator
const Tab = createBottomTabNavigator<AppStackParamList>()

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const HomeStack = createNativeStackNavigator<HomeStackParamList>()
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>()
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>()

const HomeStackNavigator = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <HomeStack.Screen name="HomeTab" component={HomeScreen} />
    </HomeStack.Navigator>
  )
}

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
      <WorkoutStack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
      <WorkoutStack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
    </WorkoutStack.Navigator>
  )
}

const ProfileStackNavigator = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <ProfileStack.Screen name="ProfileTab" component={ProfileScreen} />
    </ProfileStack.Navigator>
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
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.separator,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" label="Ev" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="dumbbell" label="Antrenman" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="person" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  const exitRouteNames = [...exitRoutes, "WorkoutTab", "HomeTab", "ProfileTab"]
  useBackButtonHandler((routeName) => exitRouteNames.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <View style={$container}>
          <AppTabs />
          <SessionOverlay />
        </View>
      </ErrorBoundary>
    </NavigationContainer>
  )
}

const $container: ViewStyle = {
  flex: 1,
}
