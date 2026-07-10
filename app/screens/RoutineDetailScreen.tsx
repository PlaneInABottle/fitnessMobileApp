import { FC, useCallback, useState } from "react"
import { Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ExerciseListItem } from "@/components/ExerciseListItem"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const RoutineDetailScreen: FC<WorkoutStackScreenProps<"RoutineDetail">> = observer(
  function RoutineDetailScreen({ navigation, route }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed, theme } = useAppTheme()

    const { templateId } = route.params
    const template = workoutStore.templates.get(templateId)

    const [isStarting, setIsStarting] = useState(false)

    const handleGoBack = useCallback(() => {
      navigation.goBack()
    }, [navigation])

    const handleStartRoutine = useCallback(() => {
      if (isStarting || !template) return
      setIsStarting(true)

      try {
        if (workoutStore.startSessionFromTemplate(templateId)) {
          navigation.navigate("ActiveWorkout")
        }
      } finally {
        setIsStarting(false)
      }
    }, [isStarting, template, workoutStore, templateId, navigation])

    const handleEditRoutine = useCallback(() => {
      navigation.navigate("CreateRoutine", { editTemplateId: templateId })
    }, [navigation, templateId])

    if (!template) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <View style={themed($header)}>
            <Pressable
              onPress={handleGoBack}
              style={$backButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Icon icon="caretLeft" size={20} color={theme.colors.tint} />
              <Text weight="semiBold" style={themed($backText)}>
                Routine
              </Text>
            </Pressable>
          </View>
          <View style={themed($notFoundContainer)}>
            <Text style={themed($notFoundText)}>Routine not found</Text>
          </View>
        </Screen>
      )
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        {/* Header */}
        <View style={themed($header)}>
          <Pressable
            onPress={handleGoBack}
            style={$backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon icon="caretLeft" size={20} color={theme.colors.tint} />
            <Text weight="semiBold" style={themed($backText)}>
              Routine
            </Text>
          </Pressable>
        </View>

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
          {/* Routine Info */}
          <View style={themed($routineInfo)}>
            <Text weight="bold" size="xxl" style={themed($routineName)}>
              {template.name}
            </Text>
          </View>

          {/* Start Button */}
          <Button
            text="Start Routine"
            preset="filled"
            onPress={handleStartRoutine}
            disabled={isStarting}
            style={themed($startButton)}
            textStyle={themed($startButtonText)}
          />

          {/* Exercise List */}
          <View style={themed($exerciseSection)}>
            <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
              Exercises ({template.exerciseIds.length})
            </Text>

            {template.exerciseIds.map((exerciseId) => {
              const exercise = exerciseStore.exercises.get(exerciseId)
              if (!exercise) return null
              const plannedSetCount =
                template.exercises.find((item) => item.exerciseId === exerciseId)?.sets.length ?? 0

              return (
                <ExerciseListItem
                  key={exerciseId}
                  title={exercise.name}
                  subtitle={`${plannedSetCount} ${plannedSetCount === 1 ? "set" : "sets"} planned`}
                />
              )
            })}
          </View>

          {/* Edit Routine Link */}
          <Pressable
            onPress={handleEditRoutine}
            style={themed($editLink)}
            accessibilityRole="button"
            accessibilityLabel="Edit routine"
          >
            <Text weight="semiBold" style={themed($editLinkText)}>
              Edit Routine
            </Text>
          </Pressable>
        </ScrollView>
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

const $backButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
}

const $backText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $scrollView: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  gap: spacing.lg,
  paddingBottom: spacing.xxl,
})

const $routineInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $routineName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $startButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  paddingVertical: 14,
})

const $startButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "600",
})

const $exerciseSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $editLink: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.md,
})

const $editLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $notFoundContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
})

const $notFoundText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
