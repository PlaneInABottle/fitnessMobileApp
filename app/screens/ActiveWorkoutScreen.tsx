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

type TouchedMap = Partial<Record<"setType" | "weight" | "reps" | "time" | "distance", boolean>>

export const ActiveWorkoutScreen: FC<WorkoutStackScreenProps<"ActiveWorkout">> = observer(
  function ActiveWorkoutScreen({ navigation }) {
    const { workoutStore, exerciseStore, setStore, performanceMemoryStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession
    const availableSetTypes = useMemo(() => setStore.getAvailableSetTypes(), [setStore])

    const [editingWorkoutExerciseId, setEditingWorkoutExerciseId] = useState<string | null>(null)
    const [draftSetData, setDraftSetData] = useState<Partial<SetData>>({ setType: "working" })
    const [draftTouched, setDraftTouched] = useState<TouchedMap>({})
    const [inlineError, setInlineError] = useState<string | undefined>(undefined)
    const [selectedSetInfo, setSelectedSetInfo] = useState<{
      workoutExerciseId: string
      setIndex: number
      setId: string
      setType: string
    } | null>(null)
    const [undoableSet, setUndoableSet] = useState<{
      workoutExerciseId: string
      setId: string
      timestamp: number
    } | null>(null)

    // Auto-expiry effect for undo
    useEffect(() => {
      if (!undoableSet) return

      const elapsed = Date.now() - undoableSet.timestamp
      const remaining = Math.max(0, 5000 - elapsed)

      const timeout = setTimeout(() => {
        setUndoableSet(null)
      }, remaining)

      return () => clearTimeout(timeout)
    }, [undoableSet])

    function handleStartAddSet(workoutExerciseId: string, setType?: SetData["setType"]) {
      setUndoableSet(null) // Clear any pending undo
      setEditingWorkoutExerciseId(workoutExerciseId)
      setDraftSetData({ setType: (setType as any) ?? "working" })
      setDraftTouched({})
      setInlineError(undefined)
      workoutStore.clearError()
    }

    function handleCancelAddSet() {
      setEditingWorkoutExerciseId(null)
      setDraftSetData({ setType: "working" })
      setDraftTouched({})
      setInlineError(undefined)
      workoutStore.clearError()
    }

    function handleDraftChange(next: Partial<SetData>, touchedKey?: keyof TouchedMap) {
      setDraftSetData(next)
      if (touchedKey) setDraftTouched((prev) => ({ ...prev, [touchedKey]: true }))
    }

    function handleDoneAddSet(workoutExerciseId: string) {
      const exerciseId = session?.exercises.find((e) => e.id === workoutExerciseId)?.exerciseId
      if (!exerciseId) {
        setInlineError("Invalid workout exercise")
        return
      }

      const validation = setStore.validateSetData(exerciseId, draftSetData)
      if (!validation.ok) {
        setInlineError(validation.error)
        return
      }

      const ok = workoutStore.addSetToWorkoutExercise(workoutExerciseId, draftSetData)
      if (!ok) {
        setInlineError(workoutStore.lastError ?? "Could not add set")
        return
      }

      // Get the newly added set ID (last set in the array)
      const workoutExercise = session?.exercises.find((e) => e.id === workoutExerciseId)
      const newSetId = workoutExercise?.sets[workoutExercise.sets.length - 1]?.id

      if (newSetId) {
        setUndoableSet({
          workoutExerciseId,
          setId: newSetId,
          timestamp: Date.now(),
        })
      }

      setEditingWorkoutExerciseId(null)
      setDraftSetData({ setType: "working" })
      setDraftTouched({})
      setInlineError(undefined)
    }

    function handleSetLongPress(
      workoutExerciseId: string,
      setIndex: number,
      setId: string,
      setType: string,
    ) {
      setSelectedSetInfo({ workoutExerciseId, setIndex, setId, setType })
    }

    function handleCloseSetOptions() {
      setSelectedSetInfo(null)
    }

    function handleEditSet() {
      // Edit functionality - would need more complex state management
      // For now, just close the sheet
      setSelectedSetInfo(null)
    }

    function handleDeleteSet() {
      if (!selectedSetInfo) return
      workoutStore.deleteSetFromWorkoutExercise(
        selectedSetInfo.workoutExerciseId,
        selectedSetInfo.setId,
      )
      // Clear undo if this was the undoable set
      if (
        undoableSet &&
        undoableSet.workoutExerciseId === selectedSetInfo.workoutExerciseId &&
        undoableSet.setId === selectedSetInfo.setId
      ) {
        setUndoableSet(null)
      }
      setSelectedSetInfo(null)
    }

    function handleChangeSetType() {
      // Change type functionality - would cycle through set types
      // For now, just close the sheet
      setSelectedSetInfo(null)
    }

    function handleUndoLastSet() {
      if (!undoableSet) return
      workoutStore.deleteSetFromWorkoutExercise(undoableSet.workoutExerciseId, undoableSet.setId)
      setUndoableSet(null)
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
              {!!workoutStore.lastError && !inlineError && (
                <ErrorMessage
                  message={workoutStore.lastError}
                  actionLabel="Clear"
                  onActionPress={workoutStore.clearError}
                />
              )}

              {session.exercises.map((we) => {
                const exercise = exerciseStore.exercises.get(we.exerciseId)
                if (!exercise) return null

                const lastSet = we.sets.length ? we.sets[we.sets.length - 1] : undefined

                return (
                  <View key={we.id} style={themed($exerciseSection)}>
                    <ExerciseCard exercise={exercise} />

                    <View style={themed($setsContainer)}>
                      <SetRow category={exercise.category} mode="header" />

                      {we.sets.map((s, idx) => (
                        <SetRow
                          key={s.id}
                          category={exercise.category}
                          mode="completed"
                          availableSetTypes={availableSetTypes}
                          index={idx}
                          onLongPress={() => handleSetLongPress(we.id, idx, s.id, s.setType)}
                          value={{
                            setType: s.setType,
                            weight: s.weight,
                            reps: s.reps,
                            time: s.time,
                            distance: s.distance,
                          }}
                        />
                      ))}

                      {/* Undo button - shows briefly after adding a set */}
                      {undoableSet?.workoutExerciseId === we.id && (
                        <Button
                          text="Undo Last Set"
                          preset="default"
                          onPress={handleUndoLastSet}
                          style={themed($undoButton)}
                        />
                      )}

                      {editingWorkoutExerciseId === we.id ? (
                        <>
                          <SetRow
                            category={exercise.category}
                            mode="edit"
                            availableSetTypes={availableSetTypes}
                            value={draftSetData}
                            placeholders={performanceMemoryStore.getPlaceholdersForSet({
                              exerciseId: we.exerciseId,
                              category: exercise.category,
                              setType: (draftSetData.setType as any) ?? "working",
                              order:
                                we.sets.filter(
                                  (s) => s.setType === ((draftSetData.setType as any) ?? "working"),
                                ).length + 1,
                            })}
                            touched={draftTouched}
                            onChange={handleDraftChange}
                            onDone={() => handleDoneAddSet(we.id)}
                          />

                          {!!inlineError && <ErrorMessage message={inlineError} />}

                          <Button text="Cancel" preset="default" onPress={handleCancelAddSet} />
                        </>
                      ) : (
                        <Button
                          text="Add Set"
                          preset="default"
                          onPress={() => handleStartAddSet(we.id, lastSet?.setType)}
                        />
                      )}
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
          onEdit={handleEditSet}
          onDelete={handleDeleteSet}
          onChangeType={handleChangeSetType}
          setTypeName={selectedSetInfo?.setType ?? "Working"}
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

const $undoButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.accent300,
  borderWidth: 1,
  paddingVertical: spacing.xs,
})
