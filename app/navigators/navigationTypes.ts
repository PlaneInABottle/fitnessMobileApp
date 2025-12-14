import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

export type WorkoutStackParamList = {
  WorkoutTab: undefined
  ActiveWorkout: undefined
  ExerciseLibrary: undefined
  WorkoutComplete: undefined
}

export type AppStackParamList = {
  Workout: NavigatorScreenParams<WorkoutStackParamList>
}

export type WorkoutStackScreenProps<T extends keyof WorkoutStackParamList> = NativeStackScreenProps<
  WorkoutStackParamList,
  T
>

export type AppTabScreenProps<T extends keyof AppStackParamList> = BottomTabScreenProps<
  AppStackParamList,
  T
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
