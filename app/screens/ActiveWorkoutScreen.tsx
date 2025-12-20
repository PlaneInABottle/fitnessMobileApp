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
    const [doneSetVolumes, setDoneSetVolumes] = useState<Record<string, number>>({})

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
      setDoneSetVolumes({})
      setSelectedSetInfo(null)
    }, [session?.id])

    // Calculate completed sets count (only sets marked as done in UI)
    const completedSetsCount = useMemo(() => {
      return Object.values(doneSetIds).filter(Boolean).length
    }, [doneSetIds])

    const completedVolumeKg = useMemo(() => {
      return Object.values(doneSetVolumes).reduce((sum, v) => sum + v, 0)
    }, [doneSetVolumes])

    function handleOpenSetOptions(workoutExerciseId: string, setId: string, setType: SetTypeId) {
      setSelectedSetInfo({ workoutExerciseId, setId, setType })
    }

    function handleCloseSetOptions() {
      setSelectedSetInfo(null)
    }

    function handleToggleDone(workoutExerciseId: string, setId: string) {
      const isCurrentlyDone = !!doneSetIds[setId]

      setDoneSetIds((prev) => ({ ...prev, [setId]: !prev[setId] }))
      setDoneSetVolumes((prev) => {
        const next = { ...prev }

        if (isCurrentlyDone) {
          delete next[setId]
          return next
        }

        const exercise = session?.exercises.find((e) => e.id === workoutExerciseId)
        const set = exercise?.sets.find((s) => s.id === setId)

        next[setId] = set?.weight !== undefined && set?.reps !== undefined ? set.weight * set.reps : 0
        return next
      })
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
      setDoneSetVolumes((prev) => {
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

    function handleAddSet(workoutExerciseId: string, exerciseId: string) {
      workoutStore.clearError()
      workoutStore.addSetToWorkoutExercise(workoutExerciseId, workoutStore.buildDefaultSetData(exerciseId))
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
          volumeKg={completedVolumeKg}
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
                    <ExerciseCard exercise={exercise} note="Aynı devam" />

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
                              onDone={() => handleToggleDone(we.id, s.id)}
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

const $scrollView: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
  paddingHorizontal: 0,
  gap: spacing.lg,
  paddingBottom: spacing.xl,
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 0,
  padding: 0,
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
