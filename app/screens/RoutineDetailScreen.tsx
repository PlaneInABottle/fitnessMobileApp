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

type AnalyticsTab = "volume" | "reps" | "duration"

export const RoutineDetailScreen: FC<WorkoutStackScreenProps<"RoutineDetail">> = observer(
  function RoutineDetailScreen({ navigation, route }) {
    const { workoutStore, exerciseStore } = useStores()
    const { themed, theme } = useAppTheme()

    const { templateId } = route.params
    const template = workoutStore.templates.get(templateId)

    const [selectedTab, setSelectedTab] = useState<AnalyticsTab>("volume")
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
              accessibilityLabel="Geri"
            >
              <Icon icon="caretLeft" size={20} color={theme.colors.tint} />
              <Text weight="semiBold" style={themed($backText)}>
                Rutin
              </Text>
            </Pressable>
          </View>
          <View style={themed($notFoundContainer)}>
            <Text style={themed($notFoundText)}>Rutin bulunamadı</Text>
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
            accessibilityLabel="Geri"
          >
            <Icon icon="caretLeft" size={20} color={theme.colors.tint} />
            <Text weight="semiBold" style={themed($backText)}>
              Rutin
            </Text>
          </Pressable>
        </View>

        <ScrollView style={themed($scrollView)} contentContainerStyle={themed($content)}>
          {/* Routine Info */}
          <View style={themed($routineInfo)}>
            <Text weight="bold" size="xxl" style={themed($routineName)}>
              {template.name}
            </Text>
            <Text size="sm" style={themed($creatorText)}>
              panout tarafından oluşturuldu
            </Text>
          </View>

          {/* Start Button */}
          <Button
            text="Rutini Başlat"
            preset="filled"
            onPress={handleStartRoutine}
            disabled={isStarting}
            style={themed($startButton)}
            textStyle={themed($startButtonText)}
          />

          {/* Analytics Section */}
          <View style={themed($analyticsSection)}>
            {/* Large Metric Display */}
            <View style={themed($metricDisplay)}>
              <Text weight="bold" style={themed($metricValue)}>
                15k kg
              </Text>
              <View style={$metricSubtitle}>
                <Text size="sm" style={themed($metricDate)}>
                  Son 30 gün
                </Text>
                <Icon icon="caretRight" size={14} color={theme.colors.textDim} />
              </View>
            </View>

            {/* Progress Chart Placeholder */}
            <View style={themed($chartPlaceholder)}>
              <View style={themed($chartBars)}>
                {[0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8].map((height, index) => (
                  <View
                    key={index}
                    style={[
                      themed($chartBar),
                      { height: `${height * 100}%` },
                      index === 4 && { backgroundColor: theme.colors.tint },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Tab Buttons */}
            <View style={themed($tabContainer)}>
              <Pressable
                onPress={() => setSelectedTab("volume")}
                style={[themed($tabButton), selectedTab === "volume" && themed($tabButtonActive)]}
              >
                <Text
                  weight={selectedTab === "volume" ? "semiBold" : "normal"}
                  style={[themed($tabText), selectedTab === "volume" && themed($tabTextActive)]}
                >
                  Hacim
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedTab("reps")}
                style={[themed($tabButton), selectedTab === "reps" && themed($tabButtonActive)]}
              >
                <Text
                  weight={selectedTab === "reps" ? "semiBold" : "normal"}
                  style={[themed($tabText), selectedTab === "reps" && themed($tabTextActive)]}
                >
                  Tekrar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedTab("duration")}
                style={[themed($tabButton), selectedTab === "duration" && themed($tabButtonActive)]}
              >
                <Text
                  weight={selectedTab === "duration" ? "semiBold" : "normal"}
                  style={[themed($tabText), selectedTab === "duration" && themed($tabTextActive)]}
                >
                  Süre
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Exercise List */}
          <View style={themed($exerciseSection)}>
            <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
              Egzersizler ({template.exerciseIds.length})
            </Text>

            {template.exerciseIds.map((exerciseId) => {
              const exercise = exerciseStore.exercises.get(exerciseId)
              if (!exercise) return null

              return (
                <ExerciseListItem
                  key={exerciseId}
                  title={exercise.name}
                  subtitle={`${3} set planlandı`}
                  onPress={() => {}}
                />
              )
            })}
          </View>

          {/* Edit Routine Link */}
          <Pressable
            onPress={handleEditRoutine}
            style={themed($editLink)}
            accessibilityRole="button"
            accessibilityLabel="Rutini Düzenle"
          >
            <Text weight="semiBold" style={themed($editLinkText)}>
              Rutini Düzenle
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

const $creatorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
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

const $analyticsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  gap: spacing.md,
})

const $metricDisplay: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $metricValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 32,
})

const $metricSubtitle: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
}

const $metricDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $chartPlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 120,
  backgroundColor: colors.cardSecondary,
  borderRadius: 8,
  justifyContent: "flex-end",
  padding: 8,
})

const $chartBars: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-end",
  justifyContent: "space-around",
  height: "100%",
  gap: 8,
})

const $chartBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.textDim,
  borderRadius: 4,
  minHeight: 8,
})

const $tabContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $tabButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
  backgroundColor: colors.cardSecondary,
  alignItems: "center",
})

const $tabButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
})

const $tabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $tabTextActive: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
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
