import { FC, useCallback, useLayoutEffect, useMemo, useState } from "react"
import { Alert, BackHandler, TextStyle, View, ViewStyle } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const WorkoutCompleteScreen: FC<WorkoutStackScreenProps<"WorkoutComplete">> = observer(
  function WorkoutCompleteScreen({ navigation }) {
    const { workoutStore } = useStores()
    const { themed, theme } = useAppTheme()

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

    const { durationMinutes, exerciseCount, totalSets, totalVolume } = useMemo(() => {
      if (!session) return { durationMinutes: 0, exerciseCount: 0, totalSets: 0, totalVolume: 0 }

      const ms = Date.now() - session.startedAt.getTime()
      const minutes = Math.max(0, Math.round(ms / 60000))

      let completedSets = 0
      let volume = 0
      
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          if (!set.isDone) continue
          
          completedSets++
          const weight = set.weight ?? 0
          const reps = set.reps ?? 0
          volume += weight * reps
        }
      }

      return {
        durationMinutes: minutes,
        exerciseCount: session.exercises.length,
        totalSets: completedSets,
        totalVolume: volume,
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
      if (!ok) {
        // Session completion failed but template was created - navigate anyway
        // to avoid leaving user stuck on this screen
        navigation.popToTop()
        return
      }
      navigation.popToTop()
    }

    function handleDontSave() {
      workoutStore.clearError()

      const templateId = session?.templateId
      const summary = templateId ? workoutStore.getTemplateUpdateSummary(templateId) : undefined
      const hasChanges =
        !!summary &&
        (summary.addedExerciseIds.length > 0 ||
          summary.removedExerciseIds.length > 0 ||
          summary.addedSets > 0 ||
          summary.removedSets > 0)

      if (templateId && hasChanges) {
        Alert.alert(
          "Şablonu güncelle?",
          `Egzersiz: +${summary!.addedExerciseIds.length} / -${summary!.removedExerciseIds.length}\nSet: +${summary!.addedSets} / -${summary!.removedSets}`,
          [
            { text: "İptal", style: "cancel" },
            {
              text: "Atla",
              style: "default",
              onPress: () => {
                const ok = workoutStore.completeSession(true)
                if (ok) navigation.popToTop()
              },
            },
            {
              text: "Güncelle",
              style: "default",
              onPress: () => {
                const ok = workoutStore.completeSession(false)
                if (ok) navigation.popToTop()
              },
            },
          ],
        )
        return
      }

      const ok = workoutStore.completeSession()
      if (ok) navigation.popToTop()
    }

    return (
      <Screen preset="scroll" ScrollViewProps={{ stickyHeaderIndices: [0] }}>
        <WorkoutHeader title="Antrenman Tamamlandı" />

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

              {/* Celebration Section */}
              <View style={themed($celebrationSection)}>
                <View style={themed($celebrationIcon)}>
                  <Icon icon="check" size={48} color={theme.colors.success} />
                </View>
                <Text text="Harika iş!" preset="heading" style={themed($celebrationTitle)} />
                <Text
                  text="Antrenmanını başarıyla tamamladın"
                  style={themed($celebrationSubtitle)}
                />
              </View>

              {/* Stats Card */}
              <View style={themed($statsCard)}>
                <View style={themed($statRow)}>
                  <View style={$statItem}>
                    <Text text="Süre" size="xs" style={themed($statLabel)} />
                    <Text
                      text={`${durationMinutes} dk`}
                      weight="bold"
                      size="lg"
                      style={themed($statValue)}
                    />
                  </View>
                  <View style={themed($statDivider)} />
                  <View style={$statItem}>
                    <Text text="Hacim" size="xs" style={themed($statLabel)} />
                    <Text
                      text={`${totalVolume.toLocaleString()} kg`}
                      weight="bold"
                      size="lg"
                      style={themed($statValue)}
                    />
                  </View>
                </View>
                <View style={themed($statRowSecond)}>
                  <View style={$statItem}>
                    <Text text="Egzersiz" size="xs" style={themed($statLabel)} />
                    <Text
                      testID="workoutComplete.exerciseCount"
                      text={exerciseCount.toString()}
                      weight="bold"
                      size="lg"
                      style={themed($statValue)}
                    />
                  </View>
                  <View style={themed($statDivider)} />
                  <View style={$statItem}>
                    <Text text="Set" size="xs" style={themed($statLabel)} />
                    <Text
                      testID="workoutComplete.totalSets"
                      text={totalSets.toString()}
                      weight="bold"
                      size="lg"
                      style={themed($statValue)}
                    />
                  </View>
                </View>
              </View>

              {showTemplateSave ? (
                <View style={themed($templateSection)}>
                  <Text
                    text="Şablon olarak kaydet"
                    weight="semiBold"
                    style={themed($templateTitle)}
                  />
                  <TextField
                    value={templateName}
                    onChangeText={setTemplateName}
                    placeholder="Şablon adı"
                    autoCapitalize="words"
                    returnKeyType="done"
                  />

                  <View style={$actionsRow}>
                    <Button
                      text="Kaydet"
                      preset="filled"
                      onPress={handleConfirmSaveTemplate}
                      style={themed($actionButton)}
                    />
                    <Button
                      text="İptal"
                      preset="default"
                      onPress={handleCancelSaveTemplate}
                      style={themed($actionButton)}
                    />
                  </View>
                </View>
              ) : (
                <View style={themed($actions)}>
                  <Button
                    text="Şablon Olarak Kaydet"
                    preset="default"
                    onPress={handleStartSaveTemplate}
                    style={themed($saveTemplateButton)}
                  />
                  <Button
                    text="Bitti"
                    preset="filled"
                    onPress={handleDontSave}
                    style={themed($doneButton)}
                  />
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

const $celebrationSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.lg,
})

const $celebrationIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.successBackground,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
})

const $celebrationTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 4,
})

const $celebrationSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $statsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
})

const $statRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-around",
  marginBottom: 16,
}

const $statRowSecond: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-around",
}

const $statItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $statDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 1,
  backgroundColor: colors.separator,
})

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginBottom: 4,
})

const $statValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $templateSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $templateTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 4,
})

const $actionsRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 8,
}

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  minHeight: 44,
})

const $saveTemplateButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  borderWidth: 1,
  minHeight: 48,
})

const $doneButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  minHeight: 48,
})
