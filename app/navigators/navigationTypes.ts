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
  WorkoutComplete: undefined
  CreateRoutine: { editTemplateId?: string } | undefined
  RoutineDetail: { templateId: string }
}

// Profile stack screens
export type ProfileStackParamList = {
  ProfileTab: undefined
}

// Main tab navigation
export type AppStackParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>
  Workout: NavigatorScreenParams<WorkoutStackParamList>
  Profile: NavigatorScreenParams<ProfileStackParamList>
}

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>

export type WorkoutStackScreenProps<T extends keyof WorkoutStackParamList> = NativeStackScreenProps<
  WorkoutStackParamList,
  T
>

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = NativeStackScreenProps<
  ProfileStackParamList,
  T
>

export type AppTabScreenProps<T extends keyof AppStackParamList> = BottomTabScreenProps<
  AppStackParamList,
  T
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
