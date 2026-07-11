import { FC, useEffect, useState } from "react"
import { ImageStyle, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { Image } from "expo-image"
import { useVideoPlayer, VideoView } from "expo-video"
import Ionicons from "@expo/vector-icons/Ionicons"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { getExerciseImages, getExerciseVideo } from "@/data/exerciseMedia"
import { useStores } from "@/models/RootStoreContext"
import type { WorkoutStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { openLinkInBrowser } from "@/utils/openLinkInBrowser"

type MediaMode = "demo" | "start" | "finish"

export const ExerciseDetailScreen: FC<WorkoutStackScreenProps<"ExerciseDetail">> = observer(
  function ExerciseDetailScreen({ navigation, route }) {
    const { exerciseStore, workoutStore } = useStores()
    const { themed, theme } = useAppTheme()
    const exercise = exerciseStore.getExercise(route.params.exerciseId)
    const images = exercise ? getExerciseImages(exercise.id) : undefined
    const video = exercise ? getExerciseVideo(exercise.id) : undefined
    const [mediaMode, setMediaMode] = useState<MediaMode>(video ? "demo" : "start")
    const selectedImage = exercise?.imageUrl ?? images?.[mediaMode === "finish" ? 1 : 0]
    const player = useVideoPlayer(video?.source ?? null, (instance) => {
      instance.loop = true
      instance.muted = true
    })

    useEffect(() => {
      if (!video) return
      if (mediaMode === "demo") player.play()
      else player.pause()
    }, [mediaMode, player, video])

    function handleAddExercise() {
      if (!exercise || !route.params.selectionContext) return
      if (route.params.selectionContext === "routine") {
        workoutStore.setPendingRoutineExerciseId(exercise.id)
        navigation.pop(2)
        return
      }

      workoutStore.clearError()
      if (workoutStore.addExerciseToSession(exercise.id)) navigation.pop(2)
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title={exercise?.name ?? "Exercise"}
          leftActionLabel="Back"
          onLeftActionPress={navigation.goBack}
        />

        {!exercise ? (
          <View style={themed($errorContainer)}>
            <ErrorMessage
              message="Exercise not found."
              actionLabel="Back"
              onActionPress={navigation.goBack}
            />
          </View>
        ) : (
          <>
            <ScrollView style={$scrollView} contentContainerStyle={themed($content)}>
              <View style={themed($mediaContainer)}>
                {video && mediaMode === "demo" ? (
                  <VideoView
                    player={player}
                    style={$exerciseVideo}
                    contentFit="contain"
                    nativeControls={false}
                    accessibilityLabel={`${exercise.name} movement demonstration`}
                  />
                ) : selectedImage ? (
                  <Image
                    source={selectedImage}
                    style={$exerciseImage}
                    contentFit="contain"
                    transition={150}
                    accessibilityLabel={`${exercise.name}, ${mediaMode} position`}
                  />
                ) : (
                  <View style={$mediaFallback}>
                    <Ionicons name="barbell-outline" size={56} color={theme.colors.textDim} />
                  </View>
                )}
              </View>

              {(video || images) && (
                <View style={themed($segmentedControl)}>
                  {(
                    [
                      ...(video ? ["demo"] : []),
                      ...(images ? ["start", "finish"] : []),
                    ] as MediaMode[]
                  ).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setMediaMode(value)}
                      style={themed([$segment, mediaMode === value && $segmentActive])}
                      accessibilityRole="button"
                      accessibilityState={{ selected: mediaMode === value }}
                    >
                      <Text
                        weight="semiBold"
                        style={themed(mediaMode === value ? $segmentTextActive : $segmentText)}
                      >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {video && (
                <View style={themed($attributionRow)}>
                  <Pressable
                    onPress={() => openLinkInBrowser(video.sourceUrl)}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${video.sourceName} source`}
                  >
                    <Text size="xs" style={themed($attributionText)}>
                      Demo by {video.attribution} via {video.sourceName}
                    </Text>
                  </Pressable>
                  <Text size="xs" style={themed($attributionSeparator)}>
                    ·
                  </Text>
                  <Pressable
                    onPress={() => openLinkInBrowser(video.licenseUrl)}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${video.licenseName} license`}
                  >
                    <Text size="xs" style={themed($attributionText)}>
                      {video.licenseName}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={themed($metadataSection)}>
                <Text weight="bold" size="xl" style={themed($title)}>
                  {exercise.name}
                </Text>
                <Text style={themed($summary)}>
                  {[exercise.sourceCategory, exercise.equipment, exercise.level]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <View style={themed($muscleRow)}>
                  {exercise.muscleGroups.map((muscle) => (
                    <View key={muscle} style={themed($muscleChip)}>
                      <Text size="xs" weight="medium" style={themed($muscleText)}>
                        {muscle}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {!!exercise.instructionSteps?.length && (
                <View style={themed($instructionsSection)}>
                  <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
                    Instructions
                  </Text>
                  {exercise.instructionSteps.map((step, index) => (
                    <View key={`${exercise.id}-${index}`} style={$instructionRow}>
                      <Text weight="semiBold" style={themed($instructionNumber)}>
                        {index + 1}
                      </Text>
                      <Text style={themed($instructionText)}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {!!route.params.selectionContext && (
              <View style={themed($footer)}>
                <Button text="Add Exercise" preset="filled" onPress={handleAddExercise} />
              </View>
            )}
          </>
        )}
      </Screen>
    )
  },
)

const $scrollView: ViewStyle = { flex: 1 }
const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({ paddingBottom: spacing.xxl })
const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $mediaContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  aspectRatio: 1.25,
  backgroundColor: colors.cardSecondary,
})
const $exerciseImage: ImageStyle = { width: "100%", height: "100%" }
const $exerciseVideo: ViewStyle = { width: "100%", height: "100%" }
const $mediaFallback: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center" }
const $segmentedControl: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  padding: 3,
  borderRadius: 6,
  backgroundColor: colors.cardSecondary,
})
const $segment: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  minHeight: 36,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4,
  paddingHorizontal: spacing.sm,
})
const $segmentActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
})
const $segmentText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
const $segmentTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $attributionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
})
const $attributionText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.tint })
const $attributionSeparator: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
const $metadataSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $title: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $summary: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
})
const $muscleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginTop: spacing.md,
})
const $muscleChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 6,
  backgroundColor: colors.cardSecondary,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})
const $muscleText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $instructionsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
})
const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  marginBottom: spacing.md,
})
const $instructionRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 14,
}
const $instructionNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  width: 28,
})
const $instructionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flex: 1,
  lineHeight: 22,
})
const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  padding: spacing.md,
  backgroundColor: colors.background,
})
