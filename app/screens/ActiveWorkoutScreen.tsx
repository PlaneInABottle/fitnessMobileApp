import { FC, useEffect, useMemo, useRef, useState } from "react"
import { Alert, ScrollView, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ExerciseCard } from "@/components/workout/ExerciseCard"
import { NoteInput } from "@/components/workout/NoteInput"
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
    const { workoutStore, exerciseStore, setStore, performanceMemoryStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession
    const template = session?.templateId
      ? workoutStore.templates.get(session.templateId)
      : undefined
    const availableSetTypes = useMemo(() => setStore.getAvailableSetTypes(), [setStore])

    const [selectedSetInfo, setSelectedSetInfo] = useState<{
      workoutExerciseId: string
      setId: string
      setType: SetTypeId
    } | null>(null)

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
      } else {
        setElapsedSeconds(0)
      }

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }, [session?.id, session?.startedAt])

    useEffect(() => {
      // Reset state when session changes.
      setSelectedSetInfo(null)
    }, [session?.id])

    const completedSetsCount = workoutStore.completedSetsCount
    const completedVolumeKg = workoutStore.completedVolumeKg

    function handleOpenSetOptions(workoutExerciseId: string, setId: string, setType: SetTypeId) {
      setSelectedSetInfo({ workoutExerciseId, setId, setType })
    }

    function handleCloseSetOptions() {
      setSelectedSetInfo(null)
    }

    function handleToggleDone(workoutExerciseId: string, setId: string) {
      const exercise = session?.exercises.find((e) => e.id === workoutExerciseId)
      const set = exercise?.sets.find((s) => s.id === setId)
      if (!set) return

      workoutStore.updateSetInWorkoutExercise(workoutExerciseId, setId, {
        isDone: !set.isDone,
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
      workoutStore.addSetToWorkoutExercise(
        workoutExerciseId,
        workoutStore.buildDefaultSetData(exerciseId),
      )
    }

    function handleGoBack() {
      const hasData = session && session.exercises.length > 0
      if (hasData) {
        Alert.alert(
          "Antrenmanı kaydetmediniz",
          "Çıkmak istediğinizden emin misiniz? Tüm veriler kaybolacak.",
          [
            { text: "İptal", style: "cancel" },
            {
              text: "Çık",
              style: "destructive",
              onPress: () => {
                workoutStore.discardSession()
                navigation.goBack()
              },
            },
          ],
        )
      } else {
        workoutStore.discardSession()
        navigation.goBack()
      }
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title="Antrenman Kaydet"
          leftActionLabel="Back"
          onLeftActionPress={handleGoBack}
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

                const templateExercise = template?.exercises.find(
                  (x) => x.exerciseId === we.exerciseId,
                )

                const notePlaceholder = (() => {
                  const templateNote = templateExercise?.notes?.trim()
                  if (templateNote) return templateNote

                  const previousNote = performanceMemoryStore.getPreviousNotes(we.exerciseId)?.trim()
                  if (previousNote) return previousNote

                  return undefined
                })()

                // Pre-group template sets by type to avoid O(n²) filtering in render
                const templateSetsByType: Partial<Record<SetTypeId, Array<any>>> | null = templateExercise
                  ? (() => {
                      const grouped: Partial<Record<SetTypeId, Array<any>>> = {}
                      templateExercise.sets.forEach((ts) => {
                        const type = (ts.setType as SetTypeId) ?? "working"
                        if (!grouped[type]) grouped[type] = []
                        grouped[type]!.push(ts)
                      })
                      return grouped
                    })()
                  : null

                return (
                  <View key={we.id} style={themed($exerciseSection)}>
                    <ExerciseCard exercise={exercise} showBottomSeparator={false} />

                    <NoteInput
                      value={we.notes}
                      placeholder={notePlaceholder}
                      onChangeText={(value) =>
                        workoutStore.updateWorkoutExerciseNotes(we.id, value)
                      }
                    />

                    <View style={themed($setsContainer)}>
                      <SetRow category={exercise.category} mode="header" />

                      {(() => {
                        let workingIndex = 0
                        const templateTypeCounters: Partial<Record<SetTypeId, number>> = {}

                        return we.sets.map((s, i) => {
                          const setType = (s.setType as SetTypeId | undefined) ?? "working"
                          const isWorking = setType === "working"
                          const displayIndex = isWorking ? ++workingIndex : undefined

                          const orderWithinType = (templateTypeCounters[setType] =
                            (templateTypeCounters[setType] ?? 0) + 1)
                          const templateSet = templateSetsByType?.[setType]?.[orderWithinType - 1]

                          const placeholders = (() => {
                            if (templateSet) {
                              return {
                                weight:
                                  templateSet.weight !== undefined
                                    ? String(templateSet.weight)
                                    : undefined,
                                reps:
                                  templateSet.reps !== undefined ? String(templateSet.reps) : undefined,
                                time:
                                  templateSet.time !== undefined ? String(templateSet.time) : undefined,
                                distance:
                                  templateSet.distance !== undefined
                                    ? String(templateSet.distance)
                                    : undefined,
                              }
                            }

                            const memoryPlaceholders = performanceMemoryStore.getPlaceholdersForSet({
                              exerciseId: we.exerciseId,
                              category: exercise.category,
                              setType,
                              order: orderWithinType,
                            })

                            return {
                              weight: memoryPlaceholders.weight !== "-" ? memoryPlaceholders.weight : undefined,
                              reps: memoryPlaceholders.reps !== "-" ? memoryPlaceholders.reps : undefined,
                              time: memoryPlaceholders.time !== "-" ? memoryPlaceholders.time : undefined,
                              distance:
                                memoryPlaceholders.distance !== "-"
                                  ? memoryPlaceholders.distance
                                  : undefined,
                            }
                          })()

                          const previousValue = performanceMemoryStore.getPreviousSetData({
                            exerciseId: we.exerciseId,
                            category: exercise.category,
                            setType,
                            order: orderWithinType,
                          })

                          return (
                            <SetRow
                              key={s.id}
                              category={exercise.category}
                              mode="edit"
                              availableSetTypes={availableSetTypes}
                              allowEmptyNumbers={false}
                              index={displayIndex}
                              rowIndex={i}
                              isDone={s.isDone}
                              placeholders={placeholders}
                              previousValue={previousValue}
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
  gap: 0,
  paddingBottom: spacing.xl,
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 0,
  padding: 0,
  gap: 0,
  marginBottom: spacing.lg,
})

const $setsContainer: ThemedStyle<ViewStyle> = () => ({
  gap: 0,
})

const $addSetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.cardSecondary,
  borderWidth: 0,
  borderRadius: 8,
  minHeight: 44,
  marginTop: spacing.sm,
  marginBottom: spacing.md,
  marginHorizontal: spacing.md,
})

const $addExerciseButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  marginTop: spacing.lg,
})
