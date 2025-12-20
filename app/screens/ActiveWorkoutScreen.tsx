import { FC, useEffect, useMemo, useRef, useState } from "react"
import { ScrollView, View, ViewStyle } from "react-native"
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
import type { SetData, SetTypeId } from "@/models/SetStore"
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
      setType: SetTypeId
    } | null>(null)

    const [doneSetIds, setDoneSetIds] = useState<Record<string, boolean>>({})

    // Timer state
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
      // Start timer when session exists
      if (session) {
        const startTime = session.startedAt.getTime()
        const updateTimer = () => {
          const now = Date.now()
          setElapsedSeconds(Math.floor((now - startTime) / 1000))
        }
        updateTimer()
        timerRef.current = setInterval(updateTimer, 1000)
      }
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id])

    useEffect(() => {
      // Reset UI-only done state when session changes.
      setDoneSetIds({})
      setSelectedSetInfo(null)
    }, [session?.id])

    // Calculate completed sets count (only sets marked as done in UI)
    const completedSetsCount = useMemo(() => {
      return Object.values(doneSetIds).filter(Boolean).length
    }, [doneSetIds])

    function handleOpenSetOptions(workoutExerciseId: string, setId: string, setType: SetTypeId) {
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

    function handleSelectSetType(typeId: SetTypeId) {
      if (!selectedSetInfo) return
      workoutStore.updateSetInWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
        { setType: typeId },
      )
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
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title="Antrenman Kaydet"
          leftActionLabel="Back"
          onLeftActionPress={() => navigation.goBack()}
          rightActionLabel="Bitir"
          onRightActionPress={() => navigation.navigate("WorkoutComplete")}
          showStats
          timeSeconds={elapsedSeconds}
          volumeKg={workoutStore.totalVolume}
          setsCount={completedSetsCount}
        />

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
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
                    <ExerciseCard
                      exercise={exercise}
                      note="Aynı devam"
                      onPress={() => {}}
                      onMenuPress={() => {}}
                    />

                    <View style={themed($setsContainer)}>
                      <SetRow category={exercise.category} mode="header" />

                      {(() => {
                        let workingIndex = 0

                        return we.sets.map((s, i) => {
                          const setType = (s.setType as SetTypeId | undefined) ?? "working"
                          const isWorking = setType === "working"
                          const displayIndex = isWorking ? ++workingIndex : undefined

                          return (
                            <SetRow
                              key={s.id}
                              category={exercise.category}
                              mode="edit"
                              availableSetTypes={availableSetTypes}
                              allowEmptyNumbers={false}
                              index={displayIndex}
                              rowIndex={i}
                              isDone={!!doneSetIds[s.id]}
                              onPressSetType={() => handleOpenSetOptions(we.id, s.id, setType)}
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
                          )
                        })
                      })()}

                      <Button
                        text="+ Set Ekle"
                        preset="default"
                        onPress={() => handleAddSet(we.id, we.exerciseId)}
                        style={themed($addSetButton)}
                      />
                    </View>
                  </View>
                )
              })}

              <Button
                text="+ Egzersiz Ekle"
                preset="filled"
                onPress={() => navigation.navigate("ExerciseLibrary")}
                style={themed($addExerciseButton)}
              />
            </>
          )}
        </ScrollView>

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

const $scrollView: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  gap: spacing.lg,
  paddingBottom: spacing.xl,
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  gap: spacing.sm,
})

const $setsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $addSetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: "transparent",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  marginTop: spacing.sm,
})

const $addExerciseButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
})
