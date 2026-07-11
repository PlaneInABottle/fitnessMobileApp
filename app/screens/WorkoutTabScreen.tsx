import { FC, useState } from "react"
import { Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { RoutineCard } from "@/components/RoutineCard"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const WorkoutTabScreen: FC<WorkoutStackScreenProps<"WorkoutTab">> = observer(
  function WorkoutTabScreen({ navigation }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed, theme } = useAppTheme()
    const [isStarting, setIsStarting] = useState(false)

    const hasActiveSession = !!workoutStore.currentSession

    const recentTemplates = Array.from(workoutStore.templates.values())
      .slice()
      .sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))
      .slice(0, 5)

    function handlePrimaryWorkoutAction() {
      if (workoutStore.currentSession) {
        navigation.navigate("ActiveWorkout")
        return
      }

      if (isStarting) return
      setIsStarting(true)
      try {
        if (workoutStore.startNewSession()) {
          navigation.navigate("ExerciseLibrary", { newWorkout: true })
        }
      } finally {
        setIsStarting(false)
      }
    }

    function handleStartFromTemplate(templateId: string) {
      if (isStarting) return
      setIsStarting(true)
      try {
        if (workoutStore.startSessionFromTemplate(templateId)) navigation.navigate("ActiveWorkout")
      } finally {
        setIsStarting(false)
      }
    }

    function getExercisePreview(exerciseIds: string[]): string {
      const names = exerciseIds
        .slice(0, 4)
        .map((id) => exerciseStore.getExercise(id)?.name ?? "Unknown")
      if (exerciseIds.length > 4) {
        return names.join(", ") + ` +${exerciseIds.length - 4} more`
      }
      return names.join(", ") || "No exercises"
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        {/* Header */}
        <View style={themed($header)}>
          <View style={$headerLeft}>
            <Text preset="heading" style={themed($headerTitle)}>
              Workout
            </Text>
          </View>
        </View>

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
          {/* Error Display */}
          {!!workoutStore.lastError && (
            <View style={themed($errorContainer)}>
              <Text text={workoutStore.lastError} style={themed($errorText)} />
              <Button text="Clear" preset="default" onPress={workoutStore.clearError} />
            </View>
          )}

          {/* Primary workout action */}
          <Button
            text={hasActiveSession ? "Resume workout" : "Start workout"}
            preset="filled"
            onPress={handlePrimaryWorkoutAction}
            style={themed($startButton)}
            textStyle={themed($startButtonText)}
          />
          <Button
            text="Browse exercise library"
            onPress={() => navigation.navigate("ExerciseLibrary", { browseOnly: true })}
          />

          {/* Routines Section */}
          <View style={themed($section)}>
            <View style={$sectionHeader}>
              <Text preset="subheading" style={themed($sectionTitle)}>
                Routines
              </Text>
              <Pressable
                onPress={() => navigation.navigate("CreateRoutine")}
                style={themed($createRoutineAction)}
                accessibilityRole="button"
                accessibilityLabel="Create routine"
              >
                <Ionicons name="add" size={18} color={theme.colors.tint} />
                <Text text="Create" size="sm" weight="semiBold" style={themed($createText)} />
              </Pressable>
            </View>

            {/* Routine Cards */}
            {recentTemplates.length === 0 ? (
              <View style={themed($emptyRoutines)}>
                <Ionicons name="list-outline" size={28} color={theme.colors.textDim} />
                <View style={$emptyCopy}>
                  <Text text="No routines yet" weight="semiBold" />
                  <Text
                    text="Save repeat workouts for faster logging."
                    size="sm"
                    style={themed($emptyText)}
                  />
                </View>
              </View>
            ) : (
              <View style={themed($routinesList)}>
                {recentTemplates.map((t) => (
                  <RoutineCard
                    key={t.id}
                    title={t.name}
                    exercisePreview={getExercisePreview([...t.exerciseIds])}
                    onStart={() => handleStartFromTemplate(t.id)}
                    onOpen={() => navigation.navigate("RoutineDetail", { templateId: t.id })}
                  />
                ))}
              </View>
            )}
          </View>
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
})

const $headerLeft: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
}

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $scrollView: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  gap: spacing.lg,
  paddingBottom: spacing.xl,
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.error,
  borderRadius: 8,
  gap: spacing.sm,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
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

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 4,
}

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $createRoutineAction: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.xs,
  minHeight: 44,
  paddingHorizontal: spacing.xs,
})

const $createText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $emptyRoutines: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.md,
  padding: spacing.lg,
})

const $emptyCopy: ViewStyle = { flex: 1, gap: 3 }

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $routinesList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})
