import { FC, useEffect, useMemo, useState } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ExerciseCard } from "@/components/workout/ExerciseCard"
import { SetOptionsBottomSheet } from "@/components/workout/SetOptionsBottomSheet"
import { SetRow } from "@/components/workout/SetRow"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { useStores } from "@/models/RootStoreContext"
import type { SetData } from "@/models/SetStore"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const ActiveWorkoutScreen: FC<WorkoutStackScreenProps<"ActiveWorkout">> = observer(
  function ActiveWorkoutScreen({ navigation }) {
    const { workoutStore, exerciseStore, setStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession
    const availableSetTypes = useMemo(() => setStore.getAvailableSetTypes(), [setStore])

    const [selectedSetInfo, setSelectedSetInfo] = useState<{
      workoutExerciseId: string
      setId: string
      setType: string
    } | null>(null)

    const [doneSetIds, setDoneSetIds] = useState<Record<string, boolean>>({})

    useEffect(() => {
      // Reset UI-only done state when session changes.
      setDoneSetIds({})
      setSelectedSetInfo(null)
    }, [session?.id])

    function handleOpenSetOptions(workoutExerciseId: string, setId: string, setType: string) {
      setSelectedSetInfo({ workoutExerciseId, setId, setType })
    }

    function handleCloseSetOptions() {
      setSelectedSetInfo(null)
    }

    function handleToggleDone(setId: string) {
      setDoneSetIds((prev) => ({ ...prev, [setId]: !prev[setId] }))
    }

    function handleUpdateSet(workoutExerciseId: string, setId: string, patch: Partial<SetData>) {
      workoutStore.updateSetInWorkoutExercise(workoutExerciseId, setId, patch)
    }

    function handleDeleteSet() {
      if (!selectedSetInfo) return
      workoutStore.deleteSetFromWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
      )
      setDoneSetIds((prev) => {
        const next = { ...prev }
        delete next[selectedSetInfo.setId]
        return next
      })
      setSelectedSetInfo(null)
    }

    function handleChangeSetType() {
      if (!selectedSetInfo || !availableSetTypes.length) return

      const current = selectedSetInfo.setType
      const idx = availableSetTypes.findIndex((s) => s.id === (current as any))
      const next =
        availableSetTypes[(idx + 1 + availableSetTypes.length) % availableSetTypes.length]

      workoutStore.updateSetInWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
        {
          setType: next.id,
        },
      )
      setSelectedSetInfo(null)
    }

    function buildDefaultSetData(exerciseId: string): Partial<SetData> {
      const required = exerciseStore.getRequiredFieldsForExercise(exerciseId)
      const base: Partial<SetData> = { setType: "working" }
      required.forEach((k) => {
        ;(base as any)[k] = 0
      })
      return base
    }

    function handleAddSet(workoutExerciseId: string, exerciseId: string) {
      workoutStore.clearError()
      workoutStore.addSetToWorkoutExercise(workoutExerciseId, buildDefaultSetData(exerciseId))
    }

    return (
      <Screen preset="scroll" ScrollViewProps={{ stickyHeaderIndices: [0] }}>
        <WorkoutHeader
          title="Workout"
          rightActionLabel="End"
          onRightActionPress={() => navigation.navigate("WorkoutComplete")}
        />

        <View style={themed($content)}>
          {!session ? (
            <ErrorMessage
              message="No active workout session."
              actionLabel="Start Workout"
              onActionPress={() => navigation.popToTop()}
            />
          ) : session.exercises.length === 0 ? (
            <EmptyState
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

              {session.exercises.map((we) => {
                const exercise = exerciseStore.exercises.get(we.exerciseId)
                if (!exercise) return null

                return (
                  <View key={we.id} style={themed($exerciseSection)}>
                    <ExerciseCard exercise={exercise} />

                    <View style={themed($setsContainer)}>
                      <SetRow category={exercise.category} mode="header" />

                      {we.sets.map((s, idx) => (
                        <SetRow
                          key={s.id}
                          category={exercise.category}
                          mode="edit"
                          availableSetTypes={availableSetTypes}
                          allowEmptyNumbers={false}
                          index={idx}
                          isDone={!!doneSetIds[s.id]}
                          onPressSetType={() => handleOpenSetOptions(we.id, s.id, s.setType)}
                          onChange={(next) => handleUpdateSet(we.id, s.id, next)}
                          onDone={() => handleToggleDone(s.id)}
                          doneButtonLabel="Toggle done"
                          value={{
                            setType: s.setType,
                            weight: s.weight,
                            reps: s.reps,
                            time: s.time,
                            distance: s.distance,
                          }}
                        />
                      ))}

                      <Button
                        text="Add Set"
                        preset="default"
                        onPress={() => handleAddSet(we.id, we.exerciseId)}
                      />
                    </View>
                  </View>
                )
              })}

              <Button
                text="Add Exercise"
                preset="filled"
                onPress={() => navigation.navigate("ExerciseLibrary")}
              />
            </>
          )}
        </View>

        <SetOptionsBottomSheet
          visible={!!selectedSetInfo}
          onClose={handleCloseSetOptions}
          onDelete={handleDeleteSet}
          onChangeType={handleChangeSetType}
          setTypeName={
            availableSetTypes.find((t) => t.id === (selectedSetInfo?.setType as any))?.name ??
            "Working"
          }
        />
      </Screen>
    )
  },
)

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $setsContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral300,
  borderRadius: 8,
  padding: spacing.sm,
  gap: spacing.sm,
})
