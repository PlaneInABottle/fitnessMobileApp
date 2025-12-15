import { FC, useMemo, useState } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { ExerciseCard } from "@/components/workout/ExerciseCard"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { EXERCISE_CATEGORY_VALUES, type ExerciseCategory } from "@/models/ExerciseStore"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

export const ExerciseLibraryScreen: FC<WorkoutStackScreenProps<"ExerciseLibrary">> = observer(
  function ExerciseLibraryScreen({ navigation }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession

    const [query, setQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null)

    const exercises = useMemo(() => {
      const byQuery = exerciseStore.searchExercises(query)
      const filtered = selectedCategory
        ? byQuery.filter((e) => e.category === selectedCategory)
        : byQuery
      return filtered.slice().sort((a, b) => a.name.localeCompare(b.name))
    }, [exerciseStore, query, selectedCategory])

    function handleToggleCategory(category: ExerciseCategory) {
      setSelectedCategory((prev) => (prev === category ? null : category))
    }

    function handleClearFilters() {
      setQuery("")
      setSelectedCategory(null)
    }

    function handleAddExercise(exerciseId: string) {
      workoutStore.clearError()
      const workoutExerciseId = workoutStore.addExerciseToSession(exerciseId)
      if (workoutExerciseId) navigation.goBack()
    }

    return (
      <Screen preset="scroll" ScrollViewProps={{ stickyHeaderIndices: [0] }}>
        <WorkoutHeader title="Add Exercise" leftActionLabel="Back" onLeftActionPress={navigation.goBack} />

        <View style={themed($content)}>
          {!session ? (
            <ErrorMessage message="No active workout session." actionLabel="Back" onActionPress={navigation.goBack} />
          ) : (
            <>
              {!!workoutStore.lastError && (
                <ErrorMessage
                  message={workoutStore.lastError}
                  actionLabel="Clear"
                  onActionPress={workoutStore.clearError}
                />
              )}

              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />

              <View style={themed([$styles.row, $styles.flexWrap, $filters])}>
                {EXERCISE_CATEGORY_VALUES.map((cat) => {
                  const active = selectedCategory === cat
                  return (
                    <Button
                      key={cat}
                      text={cat}
                      preset={active ? "filled" : "default"}
                      onPress={() => handleToggleCategory(cat)}
                      style={themed($chip)}
                      textStyle={themed($chipText)}
                    />
                  )
                })}
              </View>

              {exercises.length === 0 ? (
                <EmptyState
                  heading="No exercises found"
                  content="Try a different search or category."
                  button="Clear filters"
                  buttonOnPress={handleClearFilters}
                />
              ) : (
                <View style={themed($list)}>
                  {exercises.map((exercise) => (
                    <View key={exercise.id} style={themed($exerciseRow)}>
                      <ExerciseCard exercise={exercise} />
                      <Button
                        text="Add to Workout"
                        preset="filled"
                        testID={`add-to-workout-${exercise.id}`}
                        onPress={() => handleAddExercise(exercise.id)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </Screen>
    )
  },
)

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  gap: spacing.md,
})

const $filters: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $chip: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 32,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 16,
})

const $chipText: ThemedStyle<any> = ({ typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 14,
  lineHeight: 16,
})

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $exerciseRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})
