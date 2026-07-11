import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

// Home stack screens
export type HomeStackParamList = {
  HomeTab: undefined
}

// Workout stack screens
export type WorkoutStackParamList = {
  WorkoutTab: undefined
  ActiveWorkout: undefined
  ExerciseLibrary: { fromCreateRoutine?: boolean } | undefined
  ExerciseDetail: {
    exerciseId: string
    selectionContext?: "workout" | "routine"
  }
  WorkoutComplete: undefined
  CreateRoutine: { editTemplateId?: string } | undefined
  RoutineDetail: { templateId: string }
}

// Main tab navigation
export type AppStackParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>
  Workout: NavigatorScreenParams<WorkoutStackParamList>
}

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>

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
