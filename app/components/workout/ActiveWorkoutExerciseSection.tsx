import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ExerciseCard } from "@/components/workout/ExerciseCard"
import { NoteInput } from "@/components/workout/NoteInput"
import { SetRow } from "@/components/workout/SetRow"
import { useStores } from "@/models/RootStoreContext"
import type { SetData, SetTypeId } from "@/models/SetStore"
import type { RestTimeSeconds, TemplateSet } from "@/models/WorkoutStore"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { playSetCompletedHaptic } from "@/utils/haptics"

interface ActiveWorkoutExerciseSectionProps {
  workoutExerciseId: string
  onOpenExercise: (exerciseId: string) => void
  onOpenSetOptions: (workoutExerciseId: string, setId: string, setType: SetTypeId) => void
}

interface ActiveWorkoutSetRowProps {
  workoutExerciseId: string
  setId: string
  rowIndex: number
  displayIndex?: number
  orderWithinType: number
  templateSet?: TemplateSet
  onOpenSetOptions: ActiveWorkoutExerciseSectionProps["onOpenSetOptions"]
}

const ActiveWorkoutSetRow = observer(function ActiveWorkoutSetRow({
  workoutExerciseId,
  setId,
  rowIndex,
  displayIndex,
  orderWithinType,
  templateSet,
  onOpenSetOptions,
}: ActiveWorkoutSetRowProps) {
  const { workoutStore, exerciseStore, performanceMemoryStore } = useStores()
  const workoutExercise = workoutStore.currentSession?.exercises.find(
    (item) => item.id === workoutExerciseId,
  )
  const set = workoutExercise?.sets.find((item) => item.id === setId)
  const exercise = workoutExercise
    ? exerciseStore.getExercise(workoutExercise.exerciseId)
    : undefined

  if (!workoutExercise || !set || !exercise) return null

  const currentSet = set
  const setType = (currentSet.setType as SetTypeId | undefined) ?? "working"
  const memoryPlaceholders = templateSet
    ? undefined
    : performanceMemoryStore.getPlaceholdersForSet({
        exerciseId: workoutExercise.exerciseId,
        category: exercise.category,
        setType,
        order: orderWithinType,
      })
  const placeholders = templateSet
    ? {
        weight: templateSet.weight !== undefined ? String(templateSet.weight) : undefined,
        reps: templateSet.reps !== undefined ? String(templateSet.reps) : undefined,
        time: templateSet.time !== undefined ? String(templateSet.time) : undefined,
        distance: templateSet.distance !== undefined ? String(templateSet.distance) : undefined,
      }
    : {
        weight: memoryPlaceholders?.weight !== "-" ? memoryPlaceholders?.weight : undefined,
        reps: memoryPlaceholders?.reps !== "-" ? memoryPlaceholders?.reps : undefined,
        time: memoryPlaceholders?.time !== "-" ? memoryPlaceholders?.time : undefined,
        distance: memoryPlaceholders?.distance !== "-" ? memoryPlaceholders?.distance : undefined,
      }
  const previousValue = performanceMemoryStore.getPreviousSetData({
    exerciseId: workoutExercise.exerciseId,
    category: exercise.category,
    setType,
    order: orderWithinType,
  })

  function handleChange(next: Partial<SetData>) {
    workoutStore.updateSetInWorkoutExercise(workoutExerciseId, setId, next)
  }

  function handleDone(completionPatch?: Partial<SetData>) {
    const nextIsDone = !currentSet.isDone
    const didUpdate = workoutStore.updateSetInWorkoutExercise(workoutExerciseId, setId, {
      ...completionPatch,
      isDone: nextIsDone,
    })

    if (didUpdate && nextIsDone) playSetCompletedHaptic()
  }

  return (
    <SetRow
      category={exercise.category}
      mode="edit"
      allowEmptyNumbers={false}
      index={displayIndex}
      rowIndex={rowIndex}
      exerciseName={exercise.name}
      setNumber={rowIndex + 1}
      isDone={currentSet.isDone}
      placeholders={placeholders}
      previousValue={previousValue}
      onPressSetType={() => onOpenSetOptions(workoutExerciseId, setId, setType)}
      onChange={handleChange}
      onDone={handleDone}
      value={{
        setType: currentSet.setType,
        weight: currentSet.weight,
        reps: currentSet.reps,
        time: currentSet.time,
        distance: currentSet.distance,
      }}
    />
  )
})

export const ActiveWorkoutExerciseSection = observer(function ActiveWorkoutExerciseSection({
  workoutExerciseId,
  onOpenExercise,
  onOpenSetOptions,
}: ActiveWorkoutExerciseSectionProps) {
  const { workoutStore, exerciseStore, performanceMemoryStore } = useStores()
  const { themed } = useAppTheme()
  const session = workoutStore.currentSession
  const workoutExercise = session?.exercises.find((item) => item.id === workoutExerciseId)
  const exercise = workoutExercise
    ? exerciseStore.getExercise(workoutExercise.exerciseId)
    : undefined

  if (!session || !workoutExercise || !exercise) return null

  const templateExercise = session.templateId
    ? workoutStore.templates
        .get(session.templateId)
        ?.exercises.find((item) => item.exerciseId === workoutExercise.exerciseId)
    : undefined
  const templateNote = templateExercise?.notes?.trim()
  const previousNote = performanceMemoryStore.getPreviousNotes(workoutExercise.exerciseId)?.trim()
  const notePlaceholder = templateNote || previousNote || undefined
  const templateSetsByType: Partial<Record<SetTypeId, TemplateSet[]>> = {}

  templateExercise?.sets.forEach((templateSet) => {
    const type = (templateSet.setType as SetTypeId | undefined) ?? "working"
    if (!templateSetsByType[type]) templateSetsByType[type] = []
    templateSetsByType[type]!.push(templateSet)
  })

  let workingIndex = 0
  const templateTypeCounters: Partial<Record<SetTypeId, number>> = {}

  return (
    <View style={themed($exerciseSection)}>
      <ExerciseCard
        exercise={exercise}
        showBottomSeparator={false}
        restTime={workoutExercise.restTime as RestTimeSeconds}
        onRestTimeChange={(seconds) => workoutStore.setExerciseRestTime(workoutExerciseId, seconds)}
        onPress={() => onOpenExercise(exercise.id)}
      />

      <NoteInput
        value={workoutExercise.notes}
        placeholder={notePlaceholder}
        onChangeText={(value) => workoutStore.updateWorkoutExerciseNotes(workoutExerciseId, value)}
      />

      <View style={$setsContainer}>
        <SetRow category={exercise.category} mode="header" />

        {workoutExercise.sets.map((set, rowIndex) => {
          const setType = (set.setType as SetTypeId | undefined) ?? "working"
          const displayIndex = setType === "working" ? ++workingIndex : undefined
          const orderWithinType = (templateTypeCounters[setType] =
            (templateTypeCounters[setType] ?? 0) + 1)

          return (
            <ActiveWorkoutSetRow
              key={set.id}
              workoutExerciseId={workoutExerciseId}
              setId={set.id}
              rowIndex={rowIndex}
              displayIndex={displayIndex}
              orderWithinType={orderWithinType}
              templateSet={templateSetsByType[setType]?.[orderWithinType - 1]}
              onOpenSetOptions={onOpenSetOptions}
            />
          )
        })}

        <Button
          text="+ Add Set"
          preset="default"
          onPress={() => {
            workoutStore.clearError()
            workoutStore.addSetToWorkoutExercise(
              workoutExerciseId,
              workoutStore.buildDefaultSetData(workoutExercise.exerciseId),
            )
          }}
          style={themed($addSetButton)}
        />
      </View>
    </View>
  )
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 12,
  borderWidth: 1,
  padding: 0,
  gap: 0,
  marginHorizontal: spacing.md,
  marginBottom: spacing.lg,
})

const $setsContainer: ViewStyle = {
  gap: 0,
}

const $addSetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.cardSecondary,
  borderWidth: 0,
  borderRadius: 10,
  minHeight: 44,
  marginTop: spacing.sm,
  marginBottom: spacing.md,
  marginHorizontal: spacing.md,
})
