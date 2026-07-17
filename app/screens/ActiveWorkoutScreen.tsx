import { FC, useCallback, useEffect, useRef, useState } from "react"
import { Alert, ScrollView, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ActiveWorkoutExerciseSection } from "@/components/workout/ActiveWorkoutExerciseSection"
import { RestTimerBar } from "@/components/workout/RestTimerBar"
import { SetOptionsBottomSheet } from "@/components/workout/SetOptionsBottomSheet"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { useStores } from "@/models/RootStoreContext"
import type { SetTypeId } from "@/models/SetStore"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ActiveWorkoutHeaderProps {
  onBack: () => void
  onFinish: () => void
}

const ActiveWorkoutHeader = observer(function ActiveWorkoutHeader({
  onBack,
  onFinish,
}: ActiveWorkoutHeaderProps) {
  const { workoutStore } = useStores()
  const session = workoutStore.currentSession
  const sessionId = session?.id
  const startedAt = session?.startedAt.getTime()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (startedAt !== undefined) {
      const updateTimer = () => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
      }

      updateTimer()
      timerRef.current = setInterval(updateTimer, 1000)
    } else {
      setElapsedSeconds(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [sessionId, startedAt])

  return (
    <WorkoutHeader
      title="Log Workout"
      leftActionLabel="Back"
      onLeftActionPress={onBack}
      rightActionLabel="Finish"
      onRightActionPress={onFinish}
      showStats
      timeSeconds={elapsedSeconds}
      volumeKg={workoutStore.completedVolumeKg}
      setsCount={workoutStore.completedSetsCount}
    />
  )
})

const ActiveWorkoutRestTimer = observer(function ActiveWorkoutRestTimer() {
  const { workoutStore } = useStores()
  const endsAt = workoutStore.currentSession?.restTimerEndsAt

  if (!endsAt) return null

  return (
    <RestTimerBar
      endsAt={endsAt}
      onAddThirty={() => workoutStore.addRestTimerSeconds(30)}
      onSkip={workoutStore.skipRestTimer}
      onExpire={workoutStore.consumeRestTimerExpiry}
    />
  )
})

export const ActiveWorkoutScreen: FC<WorkoutStackScreenProps<"ActiveWorkout">> = observer(
  function ActiveWorkoutScreen({ navigation }) {
    const { workoutStore } = useStores()
    const { themed, theme } = useAppTheme()
    const insets = useSafeAreaInsets()
    const session = workoutStore.currentSession
    const sessionId = session?.id

    const [selectedSetInfo, setSelectedSetInfo] = useState<{
      workoutExerciseId: string
      setId: string
      setType: SetTypeId
    } | null>(null)

    useEffect(() => {
      setSelectedSetInfo(null)
    }, [sessionId])

    const handleOpenSetOptions = useCallback(
      (workoutExerciseId: string, setId: string, setType: SetTypeId) => {
        setSelectedSetInfo({ workoutExerciseId, setId, setType })
      },
      [],
    )

    const handleOpenExercise = useCallback(
      (exerciseId: string) => navigation.navigate("ExerciseDetail", { exerciseId }),
      [navigation],
    )

    function handleCloseSetOptions() {
      setSelectedSetInfo(null)
    }

    function handleDeleteSet() {
      if (!selectedSetInfo) return
      workoutStore.deleteSetFromWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
      )
      setSelectedSetInfo(null)
    }

    function handleSelectSetType(typeId: SetTypeId) {
      if (!selectedSetInfo) return
      workoutStore.updateSetInWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
        { setType: typeId },
      )
    }

    function handleGoBack() {
      const returnToWorkoutTab = () => {
        if (navigation.canGoBack()) {
          navigation.goBack()
          return
        }

        navigation.reset({ index: 0, routes: [{ name: "WorkoutTab" }] })
      }

      const currentSession = workoutStore.currentSession
      if (currentSession && currentSession.exercises.length > 0) {
        Alert.alert(
          "Discard workout?",
          "Are you sure you want to leave? This workout will be deleted.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                workoutStore.discardSession()
                returnToWorkoutTab()
              },
            },
          ],
        )
      } else {
        workoutStore.discardSession()
        returnToWorkoutTab()
      }
    }

    function handleFinish() {
      if (workoutStore.completedSetsCount === 0) {
        const hasExercises = !!workoutStore.currentSession?.exercises.length
        Alert.alert(
          "Complete a set first",
          hasExercises
            ? "Mark at least one set as done before finishing this workout."
            : "Add an exercise and complete at least one set before finishing this workout.",
        )
        return
      }

      navigation.navigate("WorkoutComplete")
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <ActiveWorkoutHeader onBack={handleGoBack} onFinish={handleFinish} />
        <ActiveWorkoutRestTimer />

        <ScrollView
          testID="active-workout-scroll"
          style={themed($scrollView)}
          contentContainerStyle={themed($content)}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
        >
          {!session ? (
            <ErrorMessage
              message="No active workout session."
              actionLabel="Start Workout"
              onActionPress={() => navigation.reset({ index: 0, routes: [{ name: "WorkoutTab" }] })}
            />
          ) : session.exercises.length === 0 ? (
            <EmptyState
              preset="workout"
              heading="No exercises yet"
              content="Add an exercise to start tracking sets."
              button="Add Exercise"
              buttonOnPress={() => navigation.navigate("ExerciseLibrary")}
            />
          ) : (
            <>
              {!!workoutStore.lastError && (
                <ErrorMessage
                  message={workoutStore.lastError}
                  actionLabel="Clear"
                  onActionPress={workoutStore.clearError}
                />
              )}

              {session.exercises.map((workoutExercise) => (
                <ActiveWorkoutExerciseSection
                  key={workoutExercise.id}
                  workoutExerciseId={workoutExercise.id}
                  onOpenExercise={handleOpenExercise}
                  onOpenSetOptions={handleOpenSetOptions}
                />
              ))}
            </>
          )}
        </ScrollView>

        {!!session && session.exercises.length > 0 && (
          <View
            testID="active-workout-footer"
            style={[themed($footer), { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}
          >
            <Button
              text="+ Add Exercise"
              preset="filled"
              onPress={() => navigation.navigate("ExerciseLibrary")}
            />
          </View>
        )}

        <SetOptionsBottomSheet
          visible={!!selectedSetInfo}
          onClose={handleCloseSetOptions}
          onDelete={handleDeleteSet}
          onSelectType={handleSelectSetType}
          currentTypeId={selectedSetInfo?.setType}
        />
      </Screen>
    )
  },
)

const $scrollView: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
  paddingHorizontal: 0,
  gap: 0,
  paddingBottom: spacing.md,
})

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  padding: spacing.md,
})
