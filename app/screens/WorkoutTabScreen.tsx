import { FC, useState } from "react"
import { Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
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

    function handleStartEmptyWorkout() {
      if (isStarting) return
      setIsStarting(true)
      try {
        if (workoutStore.startNewSession()) navigation.navigate("ActiveWorkout")
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
        .map((id) => exerciseStore.exercises.get(id)?.name ?? "Unknown")
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
              Antrenman
            </Text>
          </View>
          <Pressable
            onPress={() => {}}
            style={$settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Icon icon="settings" size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
          {/* Error Display */}
          {!!workoutStore.lastError && (
            <View style={themed($errorContainer)}>
              <Text text={workoutStore.lastError} style={themed($errorText)} />
              <Button text="Clear" preset="default" onPress={workoutStore.clearError} />
            </View>
          )}

          {/* Start Empty Workout Button */}
          <Button
            text="+ Boş Antrenmana Başla"
            preset="filled"
            onPress={handleStartEmptyWorkout}
            style={themed($startButton)}
            textStyle={themed($startButtonText)}
          />

          {/* Routines Section */}
          <View style={themed($section)}>
            <View style={$sectionHeader}>
              <Text preset="subheading" style={themed($sectionTitle)}>
                Rutinler
              </Text>
              <Pressable
                onPress={() => navigation.navigate("CreateRoutine")}
                style={$addButton}
                accessibilityRole="button"
                accessibilityLabel="Add routine"
              >
                <Text weight="bold" size="lg" style={{ color: theme.colors.tint }}>
                  +
                </Text>
              </Pressable>
            </View>

            {/* Filter Pills */}
            <View style={$pillsRow}>
              <Pressable style={themed($pill)} onPress={() => navigation.navigate("CreateRoutine")}>
                <Text weight="medium" size="sm" style={themed($pillText)}>
                  Yeni Rutin
                </Text>
              </Pressable>
              <Pressable style={themed($pill)}>
                <Text weight="medium" size="sm" style={themed($pillText)}>
                  Keşfet
                </Text>
              </Pressable>
            </View>

            {/* Routine Cards */}
            {recentTemplates.length === 0 ? (
              <View style={themed($emptyRoutines)}>
                <Text style={themed($emptyText)}>No routines yet. Create your first one!</Text>
              </View>
            ) : (
              <View style={themed($routinesList)}>
                {recentTemplates.map((t) => (
                  <RoutineCard
                    key={t.id}
                    title={t.name}
                    exercisePreview={getExercisePreview([...t.exerciseIds])}
                    onStart={() => handleStartFromTemplate(t.id)}
                    onMenu={() => navigation.navigate("RoutineDetail", { templateId: t.id })}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Resume Workout Indicator */}
        {hasActiveSession && (
          <Pressable
            style={themed($resumeBar)}
            onPress={() => navigation.navigate("ActiveWorkout")}
          >
            <View style={$resumeContent}>
              <Icon icon="caretRight" size={20} color="#FFFFFF" />
              <Text weight="semiBold" style={themed($resumeText)}>
                Devam Eden Antrenman
              </Text>
            </View>
            <Icon icon="caretRight" size={20} color="#FFFFFF" />
          </Pressable>
        )}
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


const $settingsButton: ViewStyle = {
  padding: 8,
}

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
}

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $addButton: ViewStyle = {
  padding: 4,
}

const $pillsRow: ViewStyle = {
  flexDirection: "row",
  gap: 8,
}

const $pill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  backgroundColor: colors.cardSecondary,
})

const $pillText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $emptyRoutines: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.lg,
  backgroundColor: colors.card,
  borderRadius: 12,
  alignItems: "center",
})

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $routinesList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $resumeBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.tint,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
})

const $resumeContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
}

const $resumeText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
})
