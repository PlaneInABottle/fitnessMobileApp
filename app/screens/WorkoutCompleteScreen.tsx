import { FC, useCallback, useLayoutEffect, useMemo, useState } from "react"
import { BackHandler, View, ViewStyle } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

export const WorkoutCompleteScreen: FC<WorkoutStackScreenProps<"WorkoutComplete">> = observer(
  function WorkoutCompleteScreen({ navigation }) {
    const { workoutStore } = useStores()
    const { themed } = useAppTheme()

    const session = workoutStore.currentSession

    const [showTemplateSave, setShowTemplateSave] = useState(false)
    const [templateName, setTemplateName] = useState("")

    useLayoutEffect(() => {
      navigation.setOptions({ gestureEnabled: false })
    }, [navigation])

    useFocusEffect(
      useCallback(() => {
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => true)
        return () => subscription.remove()
      }, []),
    )

    const { durationMinutes, exerciseCount, totalSets } = useMemo(() => {
      if (!session) return { durationMinutes: 0, exerciseCount: 0, totalSets: 0 }

      const ms = Date.now() - session.startedAt.getTime()
      const minutes = Math.max(0, Math.round(ms / 60000))

      return {
        durationMinutes: minutes,
        exerciseCount: session.exercises.length,
        totalSets: session.exercises.reduce((sum, we) => sum + we.sets.length, 0),
      }
    }, [session])

    function handleStartSaveTemplate() {
      workoutStore.clearError()
      setTemplateName("")
      setShowTemplateSave(true)
    }

    function handleCancelSaveTemplate() {
      workoutStore.clearError()
      setShowTemplateSave(false)
      setTemplateName("")
    }

    function handleConfirmSaveTemplate() {
      const id = workoutStore.createTemplateFromSession(templateName)
      if (!id) return

      const ok = workoutStore.completeSession()
      if (ok) navigation.popToTop()
    }

    function handleDontSave() {
      workoutStore.clearError()
      const ok = workoutStore.completeSession()
      if (ok) navigation.popToTop()
    }

    return (
      <Screen preset="scroll" ScrollViewProps={{ stickyHeaderIndices: [0] }}>
        <WorkoutHeader title="Workout Complete" />

        <View style={themed($content)}>
          {!session ? (
            <ErrorMessage
              message="No active workout session."
              actionLabel="Go Home"
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

              <View style={themed($stats)}>
                <Text text={`Duration: ${durationMinutes} min`} preset="subheading" />
                <Text text={`Exercises: ${exerciseCount}`} />
                <Text text={`Total sets: ${totalSets}`} />
              </View>

              {showTemplateSave ? (
                <View style={themed($templateSection)}>
                  <TextField
                    value={templateName}
                    onChangeText={setTemplateName}
                    placeholder="Template name"
                    autoCapitalize="words"
                    returnKeyType="done"
                  />

                  <View style={themed([$styles.row, $actionsRow])}>
                    <Button text="Confirm" preset="filled" onPress={handleConfirmSaveTemplate} />
                    <Button text="Cancel" preset="default" onPress={handleCancelSaveTemplate} />
                  </View>
                </View>
              ) : (
                <View style={themed($actions)}>
                  <Button text="Save as Template" preset="filled" onPress={handleStartSaveTemplate} />
                  <Button text="Don't Save" preset="default" onPress={handleDontSave} />
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

const $stats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $templateSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $actionsRow: ViewStyle = {
  justifyContent: "space-between",
  gap: 12,
}
