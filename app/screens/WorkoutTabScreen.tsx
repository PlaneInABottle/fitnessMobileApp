import { FC, useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ListItem } from "@/components/ListItem"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

export const WorkoutTabScreen: FC<WorkoutStackScreenProps<"WorkoutTab">> = observer(
  function WorkoutTabScreen({ navigation }) {
    const { workoutStore } = useStores()
    const { themed } = useAppTheme()
    const [isStarting, setIsStarting] = useState(false)

    const hasActiveSession = !!workoutStore.currentSession

    const recentTemplates = Array.from(workoutStore.templates.values())
      .slice()
      .sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))
      .slice(0, 3)

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

    return (
      <Screen preset="scroll" contentContainerStyle={themed($content)}>
        <Text text="Workout" preset="heading" />

        {!!workoutStore.lastError && (
          <View style={themed($errorContainer)}>
            <Text text={workoutStore.lastError} style={themed($errorText)} />
            <Button text="Clear" preset="default" onPress={workoutStore.clearError} />
          </View>
        )}

        {hasActiveSession ? (
          <Button
            text="Resume Workout"
            preset="filled"
            onPress={() => navigation.navigate("ActiveWorkout")}
          />
        ) : (
          <Button text="Start Empty Workout" preset="filled" onPress={handleStartEmptyWorkout} />
        )}

        <View style={themed($section)}>
          <Text text="Recent Templates" preset="subheading" />

          {recentTemplates.length === 0 ? (
            <Text text="No templates yet." />
          ) : (
            <View style={themed($listContainer)}>
              {recentTemplates.map((t, index) => (
                <ListItem
                  key={t.id}
                  text={t.name}
                  rightIcon="caretRight"
                  topSeparator={index === 0}
                  bottomSeparator
                  onPress={() => handleStartFromTemplate(t.id)}
                />
              ))}
            </View>
          )}
        </View>

        <Button
          text="Browse All Templates"
          preset="default"
          onPress={() => navigation.navigate("ExerciseLibrary")}
        />
      </Screen>
    )
  },
)

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  ...$styles.flex1,
  padding: spacing.lg,
  gap: spacing.md,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  borderRadius: 8,
  overflow: "hidden",
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.angry500,
  borderRadius: 8,
  gap: spacing.sm,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.angry500,
})
