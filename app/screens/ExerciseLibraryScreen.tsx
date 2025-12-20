import { FC, useMemo, useState } from "react"
import { ScrollView, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { BottomSheet } from "@/components/BottomSheet"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { ExerciseListItem } from "@/components/ExerciseListItem"
import { FilterChip } from "@/components/FilterChip"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import {
  EXERCISE_CATEGORY_VALUES,
  MUSCLE_GROUPS,
  type ExerciseCategory,
} from "@/models/ExerciseStore"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const ExerciseLibraryScreen: FC<WorkoutStackScreenProps<"ExerciseLibrary">> = observer(
  function ExerciseLibraryScreen({ navigation }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession

    const [query, setQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null)
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
    const [showMuscleFilter, setShowMuscleFilter] = useState(false)
    const [showEquipmentFilter, setShowEquipmentFilter] = useState(false)

    const exercises = useMemo(() => {
      let result = exerciseStore.searchExercises(query)
      if (selectedCategory) {
        result = result.filter((e) => e.category === selectedCategory)
      }
      if (selectedMuscle) {
        result = result.filter((e) => e.muscleGroups.includes(selectedMuscle))
      }
      return result.slice().sort((a, b) => a.name.localeCompare(b.name))
    }, [exerciseStore, query, selectedCategory, selectedMuscle])

    function handleClearFilters() {
      setQuery("")
      setSelectedCategory(null)
      setSelectedMuscle(null)
    }

    function handleAddExercise(exerciseId: string) {
      workoutStore.clearError()
      const workoutExerciseId = workoutStore.addExerciseToSession(exerciseId)
      if (workoutExerciseId) navigation.goBack()
    }

    function handleSelectMuscle(muscle: string) {
      setSelectedMuscle(muscle === selectedMuscle ? null : muscle)
      setShowMuscleFilter(false)
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title="Egzersiz Ekle"
          leftActionLabel="İptal"
          onLeftActionPress={navigation.goBack}
          rightActionLabel="Oluştur"
          onRightActionPress={() => {}}
        />

        <View style={themed($searchContainer)}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            containerStyle={themed($searchField)}
          />

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={themed($filtersRow)}
          >
            <FilterChip
              label={selectedMuscle || "Tüm Kaslar"}
              active={!!selectedMuscle}
              onPress={() => setShowMuscleFilter(true)}
            />
            <FilterChip
              label="Tüm Ekipmanlar"
              active={false}
              onPress={() => setShowEquipmentFilter(true)}
            />
            {EXERCISE_CATEGORY_VALUES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              />
            ))}
          </ScrollView>
        </View>

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
          {!session ? (
            <ErrorMessage
              message="No active workout session."
              actionLabel="Start New"
              onActionPress={() => navigation.popToTop()}
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
                    <ExerciseListItem
                      key={exercise.id}
                      title={exercise.name}
                      subtitle={exercise.muscleGroups.join(", ") || exercise.category}
                      onPress={() => {}}
                      onAdd={() => handleAddExercise(exercise.id)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Muscle Filter Bottom Sheet */}
        <BottomSheet
          visible={showMuscleFilter}
          onClose={() => setShowMuscleFilter(false)}
          title="Kas Grubu Seç"
        >
          <View style={themed($filterOptions)}>
            {MUSCLE_GROUPS.map((muscle) => (
              <FilterChip
                key={muscle}
                label={muscle}
                active={selectedMuscle === muscle}
                onPress={() => handleSelectMuscle(muscle)}
              />
            ))}
          </View>
        </BottomSheet>

        {/* Equipment Filter Bottom Sheet */}
        <BottomSheet
          visible={showEquipmentFilter}
          onClose={() => setShowEquipmentFilter(false)}
          title="Ekipman Seç"
        >
          <View style={themed($filterOptions)}>
            <FilterChip
              label="Barbell"
              active={false}
              onPress={() => setShowEquipmentFilter(false)}
            />
            <FilterChip
              label="Dumbbell"
              active={false}
              onPress={() => setShowEquipmentFilter(false)}
            />
            <FilterChip
              label="Machine"
              active={false}
              onPress={() => setShowEquipmentFilter(false)}
            />
            <FilterChip
              label="Bodyweight"
              active={false}
              onPress={() => setShowEquipmentFilter(false)}
            />
            <FilterChip
              label="Cable"
              active={false}
              onPress={() => setShowEquipmentFilter(false)}
            />
          </View>
        </BottomSheet>
      </Screen>
    )
  },
)

const $searchContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingTop: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $searchField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $filtersRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  paddingRight: spacing.md,
})

const $scrollView: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
})

const $list: ThemedStyle<ViewStyle> = () => ({})

const $filterOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
})
