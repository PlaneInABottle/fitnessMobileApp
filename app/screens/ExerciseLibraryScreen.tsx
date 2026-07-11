import { FC, useCallback, useState } from "react"
import { FlatList, ListRenderItem, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { BottomSheet } from "@/components/BottomSheet"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { EmptyState } from "@/components/EmptyState"
import { ExerciseListItem } from "@/components/ExerciseListItem"
import { FilterChip } from "@/components/FilterChip"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import {
  CATALOG_EQUIPMENT,
  CATALOG_LEVELS,
  CATALOG_SOURCE_CATEGORIES,
} from "@/data/exerciseCatalog"
import { getExerciseImages } from "@/data/exerciseMedia"
import {
  EXERCISE_CATEGORY_VALUES,
  MUSCLE_GROUPS,
  type ExerciseCategory,
  type Exercise,
} from "@/models/ExerciseStore"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const ExerciseLibraryScreen: FC<WorkoutStackScreenProps<"ExerciseLibrary">> = observer(
  function ExerciseLibraryScreen({ navigation, route }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed } = useAppTheme()

    const fromCreateRoutine = !!route.params?.fromCreateRoutine
    const session = workoutStore.currentSession

    const [query, setQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null)
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
    const [selectedSourceCategory, setSelectedSourceCategory] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const exercises = (() => {
      let result = exerciseStore.searchExercises(query)
      if (selectedCategory) {
        result = result.filter((e) => e.category === selectedCategory)
      }
      if (selectedMuscle) {
        result = result.filter((e) =>
          e.muscleGroups.some((muscle) => muscle.toLowerCase() === selectedMuscle.toLowerCase()),
        )
      }
      if (selectedEquipment) result = result.filter((e) => e.equipment === selectedEquipment)
      if (selectedLevel) result = result.filter((e) => e.level === selectedLevel)
      if (selectedSourceCategory) {
        result = result.filter((e) => e.sourceCategory === selectedSourceCategory)
      }
      return result.slice().sort((a, b) => a.name.localeCompare(b.name))
    })()

    function handleClearFilters() {
      setQuery("")
      setSelectedCategory(null)
      setSelectedMuscle(null)
      setSelectedEquipment(null)
      setSelectedLevel(null)
      setSelectedSourceCategory(null)
    }

    const handleAddExercise = useCallback(
      (exerciseId: string) => {
        if (fromCreateRoutine) {
          workoutStore.setPendingRoutineExerciseId(exerciseId)
          navigation.goBack()
          return
        }

        workoutStore.clearError()
        const workoutExerciseId = workoutStore.addExerciseToSession(exerciseId)
        if (workoutExerciseId) navigation.goBack()
      },
      [fromCreateRoutine, navigation, workoutStore],
    )

    function handleSelectMuscle(muscle: string) {
      setSelectedMuscle(muscle === selectedMuscle ? null : muscle)
    }

    const activeFilterCount = [
      selectedMuscle,
      selectedEquipment,
      selectedLevel,
      selectedSourceCategory,
    ].filter(Boolean).length

    const renderExercise: ListRenderItem<Exercise> = useCallback(
      ({ item }) => (
        <ExerciseListItem
          title={item.name}
          subtitle={
            item.primaryMuscles?.join(", ") || item.muscleGroups.join(", ") || item.category
          }
          imageSource={item.imageUrl ?? getExerciseImages(item.id)?.[0]}
          onPress={() =>
            navigation.navigate("ExerciseDetail", {
              exerciseId: item.id,
              selectionContext: fromCreateRoutine ? "routine" : "workout",
            })
          }
          onAdd={() => handleAddExercise(item.id)}
        />
      ),
      [fromCreateRoutine, handleAddExercise, navigation],
    )

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title="Add Exercise"
          leftActionLabel="Cancel"
          onLeftActionPress={navigation.goBack}
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
              label={activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
              active={activeFilterCount > 0}
              onPress={() => setShowFilters(true)}
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

        {!session && !fromCreateRoutine ? (
          <View style={themed($messageContainer)}>
            <ErrorMessage
              message="No active workout session."
              actionLabel="Start New"
              onActionPress={() => navigation.popToTop()}
            />
          </View>
        ) : (
          <View style={$listContainer}>
            {!fromCreateRoutine && !!workoutStore.lastError && (
              <ErrorMessage
                message={workoutStore.lastError}
                actionLabel="Clear"
                onActionPress={workoutStore.clearError}
              />
            )}
            <Text size="xs" style={themed($resultCount)}>
              {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
            </Text>
            <FlatList
              data={exercises}
              renderItem={renderExercise}
              keyExtractor={(exercise) => exercise.id}
              contentContainerStyle={themed($content)}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={14}
              maxToRenderPerBatch={14}
              windowSize={7}
              getItemLayout={(_, index) => ({
                length: EXERCISE_ROW_HEIGHT,
                offset: EXERCISE_ROW_HEIGHT * index,
                index,
              })}
              ListEmptyComponent={
                <EmptyState
                  heading="No exercises found"
                  content="Try a different search or filter."
                  button="Clear filters"
                  buttonOnPress={handleClearFilters}
                />
              }
            />
          </View>
        )}

        <BottomSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filter Exercises"
          snapPoints={["85%"]}
        >
          <ScrollView contentContainerStyle={themed($filterSheetContent)}>
            <Text weight="semiBold" style={themed($filterTitle)}>
              Muscle
            </Text>
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
            <Text weight="semiBold" style={themed($filterTitle)}>
              Equipment
            </Text>
            <View style={themed($filterOptions)}>
              {CATALOG_EQUIPMENT.map((equipment) => (
                <FilterChip
                  key={equipment}
                  label={equipment}
                  active={selectedEquipment === equipment}
                  onPress={() =>
                    setSelectedEquipment(selectedEquipment === equipment ? null : equipment)
                  }
                />
              ))}
            </View>
            <Text weight="semiBold" style={themed($filterTitle)}>
              Difficulty
            </Text>
            <View style={themed($filterOptions)}>
              {CATALOG_LEVELS.map((level) => (
                <FilterChip
                  key={level}
                  label={level}
                  active={selectedLevel === level}
                  onPress={() => setSelectedLevel(selectedLevel === level ? null : level)}
                />
              ))}
            </View>
            <Text weight="semiBold" style={themed($filterTitle)}>
              Type
            </Text>
            <View style={themed($filterOptions)}>
              {CATALOG_SOURCE_CATEGORIES.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={selectedSourceCategory === category}
                  onPress={() =>
                    setSelectedSourceCategory(selectedSourceCategory === category ? null : category)
                  }
                />
              ))}
            </View>
          </ScrollView>
        </BottomSheet>
      </Screen>
    )
  },
)

const EXERCISE_ROW_HEIGHT = 72

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

const $listContainer: ViewStyle = { flex: 1 }

const $messageContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })

const $resultCount: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
  paddingBottom: spacing.xxl,
})

const $filterSheetContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
})

const $filterTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
})

const $filterOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
})
