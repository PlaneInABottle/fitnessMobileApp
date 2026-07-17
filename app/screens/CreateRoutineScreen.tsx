import { FC, useCallback, useEffect, useRef, useState } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useFocusEffect } from "@react-navigation/native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ExerciseListItem } from "@/components/ExerciseListItem"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { getExerciseImages } from "@/data/exerciseMedia"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const CreateRoutineScreen: FC<WorkoutStackScreenProps<"CreateRoutine">> = observer(
  function CreateRoutineScreen({ navigation, route }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed, theme } = useAppTheme()

    const editTemplateId = route.params?.editTemplateId
    const existingTemplate = editTemplateId ? workoutStore.templates.get(editTemplateId) : null

    const [title, setTitle] = useState(existingTemplate?.name ?? "")
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(
      existingTemplate ? [...existingTemplate.exerciseIds] : [],
    )
    const [isSaving, setIsSaving] = useState(false)

    const isMountedRef = useRef(true)
    useEffect(() => {
      return () => {
        isMountedRef.current = false
      }
    }, [])

    useFocusEffect(
      useCallback(() => {
        const selectedExerciseId = workoutStore.consumePendingRoutineExerciseId()
        if (!selectedExerciseId) return

        setSelectedExerciseIds((prev) =>
          prev.includes(selectedExerciseId) ? prev : [...prev, selectedExerciseId],
        )
      }, [workoutStore]),
    )

    const canSave = title.trim().length > 0 && selectedExerciseIds.length > 0

    const handleCancel = useCallback(() => {
      navigation.goBack()
    }, [navigation])

    const handleSave = useCallback(() => {
      if (!canSave || isSaving) return
      setIsSaving(true)

      try {
        if (editTemplateId && existingTemplate) {
          // Update existing template
          const ok = workoutStore.updateTemplate(editTemplateId, title.trim(), selectedExerciseIds)
          if (ok) navigation.goBack()
        } else {
          // Create new template
          const templateId = workoutStore.createTemplate(title.trim(), selectedExerciseIds)
          if (templateId) {
            navigation.goBack()
          }
        }
      } finally {
        if (isMountedRef.current) setIsSaving(false)
      }
    }, [
      canSave,
      isSaving,
      editTemplateId,
      existingTemplate,
      workoutStore,
      title,
      selectedExerciseIds,
      navigation,
    ])

    const handleAddExercise = useCallback(() => {
      navigation.navigate("ExerciseLibrary", { fromCreateRoutine: true })
    }, [navigation])

    const handleRemoveExercise = useCallback((exerciseId: string) => {
      setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId))
    }, [])

    return (
      <Screen preset="scroll" safeAreaEdges={["top", "bottom"]}>
        {/* Header */}
        <View style={themed($header)}>
          <Pressable
            onPress={handleCancel}
            style={$headerAction}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text weight="medium" style={themed($cancelText)}>
              Cancel
            </Text>
          </Pressable>

          <Text weight="semiBold" size="lg" style={themed($headerTitle)}>
            Create Routine
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={$headerAction}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{ disabled: !canSave || isSaving }}
          >
            <Text
              weight="semiBold"
              style={[themed($saveText), (!canSave || isSaving) && themed($saveTextDisabled)]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={themed($content)}>
          {/* Title Input */}
          <TextField
            label="Routine name"
            value={title}
            onChangeText={setTitle}
            placeholder="Routine title"
            autoCapitalize="sentences"
            autoCorrect={false}
            containerStyle={themed($titleInput)}
          />

          {/* Exercise List or Empty State */}
          {selectedExerciseIds.length === 0 ? (
            <View style={themed($emptyState)}>
              <View style={themed($emptyIcon)}>
                <Ionicons name="barbell-outline" size={32} color={theme.colors.textDim} />
              </View>
              <Text size="lg" weight="semiBold" style={themed($emptyTitle)}>
                No exercises yet
              </Text>
              <Text size="sm" style={themed($emptyCopy)}>
                Add exercises in the order you want to train them.
              </Text>
              <Button
                text="+ Add Exercise"
                preset="filled"
                onPress={handleAddExercise}
                style={themed($addButton)}
                textStyle={themed($addButtonText)}
              />
            </View>
          ) : (
            <View style={themed($exerciseList)}>
              <View style={$sectionHeader}>
                <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
                  Exercises ({selectedExerciseIds.length})
                </Text>
              </View>

              <View style={themed($exerciseRows)}>
                {selectedExerciseIds.map((exerciseId) => {
                  const exercise = exerciseStore.getExercise(exerciseId)
                  if (!exercise) return null

                  return (
                    <ExerciseListItem
                      key={exerciseId}
                      title={exercise.name}
                      subtitle={exercise.muscleGroups.join(", ") || exercise.category}
                      imageSource={exercise.imageUrl ?? getExerciseImages(exercise.id)?.[0]}
                      onPress={() => navigation.navigate("ExerciseDetail", { exerciseId })}
                      onAdd={() => handleRemoveExercise(exerciseId)}
                      actionIcon="remove"
                    />
                  )
                })}
              </View>

              <Button
                text="+ Add Exercise"
                preset="default"
                onPress={handleAddExercise}
                style={themed($addMoreButton)}
                textStyle={themed($addMoreButtonText)}
              />
            </View>
          )}

          {/* Error Display */}
          {!!workoutStore.lastError && (
            <View style={themed($errorContainer)}>
              <Text style={themed($errorText)}>{workoutStore.lastError}</Text>
              <Pressable onPress={workoutStore.clearError}>
                <Text style={themed($clearErrorText)}>Clear</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Screen>
    )
  },
)

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  minHeight: 56,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $headerAction: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 56,
}

const $cancelText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $saveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $saveTextDisabled: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
  gap: spacing.lg,
})

const $titleInput: ThemedStyle<ViewStyle> = () => ({})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
  paddingVertical: spacing.xxl,
})

const $emptyIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  backgroundColor: colors.card,
  borderRadius: 32,
  height: 64,
  justifyContent: "center",
  marginBottom: 4,
  width: 64,
})

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  textAlign: "center",
})

const $emptyCopy: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  maxWidth: 280,
  textAlign: "center",
})

const $addButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  paddingHorizontal: 24,
  paddingVertical: 12,
})

const $addButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
  fontWeight: "600",
})

const $exerciseList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $exerciseRows: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 12,
  borderWidth: 1,
  overflow: "hidden",
})

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $addMoreButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  paddingVertical: 12,
  marginTop: 8,
})

const $addMoreButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.md,
  backgroundColor: colors.errorBackground,
  borderRadius: 12,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  flex: 1,
})

const $clearErrorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
})
