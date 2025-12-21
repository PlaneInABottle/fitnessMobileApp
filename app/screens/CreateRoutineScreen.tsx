import { FC, useCallback, useState } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ExerciseListItem } from "@/components/ExerciseListItem"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
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
          existingTemplate.name = title.trim()
          existingTemplate.exerciseIds.replace(selectedExerciseIds)
          navigation.goBack()
        } else {
          // Create new template
          const templateId = workoutStore.createTemplate(title.trim(), selectedExerciseIds)
          if (templateId) {
            navigation.goBack()
          }
        }
      } finally {
        setIsSaving(false)
      }
    }, [canSave, isSaving, editTemplateId, existingTemplate, workoutStore, title, selectedExerciseIds, navigation])

    const handleAddExercise = useCallback(() => {
      navigation.navigate("ExerciseLibrary", { fromCreateRoutine: true })
    }, [navigation])

    const handleRemoveExercise = useCallback((exerciseId: string) => {
      setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId))
    }, [])

    return (
      <Screen preset="scroll" safeAreaEdges={["top"]}>
        {/* Header */}
        <View style={themed($header)}>
          <Pressable onPress={handleCancel} accessibilityRole="button" accessibilityLabel="İptal">
            <Text weight="medium" style={themed($cancelText)}>
              İptal
            </Text>
          </Pressable>

          <Text weight="semiBold" size="lg" style={themed($headerTitle)}>
            Rutin Oluştur
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            accessibilityRole="button"
            accessibilityLabel="Kaydet"
          >
            <Text
              weight="semiBold"
              style={[themed($saveText), !canSave && themed($saveTextDisabled)]}
            >
              Kaydet
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={themed($content)}>
          {/* Title Input */}
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder="Rutin başlığı"
            autoCapitalize="sentences"
            autoCorrect={false}
            containerStyle={themed($titleInput)}
          />

          {/* Exercise List or Empty State */}
          {selectedExerciseIds.length === 0 ? (
            <View style={themed($emptyState)}>
              <Icon icon="dumbbell" size={64} color={theme.colors.textDim} />
              <Text size="lg" style={themed($emptyTitle)}>
                Rutininize bir egzersiz ekleyerek başlayın
              </Text>
              <Button
                text="+ Egzersiz ekle"
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
                  Egzersizler ({selectedExerciseIds.length})
                </Text>
              </View>

              {selectedExerciseIds.map((exerciseId) => {
                const exercise = exerciseStore.exercises.get(exerciseId)
                if (!exercise) return null

                return (
                  <ExerciseListItem
                    key={exerciseId}
                    title={exercise.name}
                    subtitle={exercise.muscleGroups.join(", ") || exercise.category}
                    onPress={() => handleRemoveExercise(exerciseId)}
                    onAdd={() => handleRemoveExercise(exerciseId)}
                    addLabel="−"
                  />
                )
              })}

              <Button
                text="+ Egzersiz ekle"
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
  gap: spacing.lg,
  paddingVertical: spacing.xxl,
})

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
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
  borderRadius: 8,
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
  borderRadius: 8,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  flex: 1,
})

const $clearErrorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
})
