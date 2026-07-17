import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  ImageStyle,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useEvent } from "expo"
import { Image } from "expo-image"
import { useVideoPlayer, VideoView } from "expo-video"
import Ionicons from "@expo/vector-icons/Ionicons"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
    const insets = useSafeAreaInsets()
    const exercise = exerciseStore.getExercise(route.params.exerciseId)
    const images = useMemo(
      () => (exercise ? getExerciseImages(exercise.id) : undefined),
      [exercise],
    )
    const video = useMemo(() => (exercise ? getExerciseVideo(exercise.id) : undefined), [exercise])
    const [mediaMode, setMediaMode] = useState<MediaMode>(video ? "demo" : "start")
    const selectedImage = exercise?.imageUrl ?? images?.[mediaMode === "finish" ? 1 : 0]
    const player = useVideoPlayer(video?.source ?? null, (instance) => {
      instance.loop = true
      instance.muted = true
    })
    const { status: videoStatus } = useEvent(player, "statusChange", {
      status: player.status,
    })
    const { isPlaying } = useEvent(player, "playingChange", {
      isPlaying: player.playing,
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
      if (!workoutStore.addExerciseToSession(exercise.id)) return
      if (route.params.returnToActiveWorkout) {
        navigation.reset({
          index: 1,
          routes: [{ name: "WorkoutTab" }, { name: "ActiveWorkout" }],
        })
      } else {
        navigation.pop(2)
      }
    }

    function togglePlayback() {
      if (isPlaying) player.pause()
      else player.play()
    }

    const retryDemo = useCallback(async () => {
      if (!video) return

      try {
        await player.replaceAsync(video.source)
        player.play()
      } catch {
        // The status event keeps the retry UI visible if native loading fails again.
      }
    }, [player, video])

    const [hasAutoRetried, setHasAutoRetried] = useState(false)

    useEffect(() => {
      if (!video || videoStatus !== "error" || hasAutoRetried) return

      setHasAutoRetried(true)
      void retryDemo()
    }, [hasAutoRetried, retryDemo, video, videoStatus])

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <WorkoutHeader
          title="Exercise details"
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
            <ScrollView
              style={$scrollView}
              contentContainerStyle={[
                themed($content),
                !route.params.selectionContext && {
                  paddingBottom: theme.spacing.xxl + insets.bottom,
                },
              ]}
            >
              <View style={themed($mediaContainer)}>
                {video && mediaMode === "demo" ? (
                  <VideoView
                    player={player}
                    style={$exerciseVideo}
                    contentFit="contain"
                    nativeControls={false}
                    pointerEvents="none"
                    accessibilityLabel={`${exercise.name} movement demonstration`}
                  />
                ) : selectedImage ? (
                  <Image
                    source={selectedImage}
                    style={$exerciseImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    recyclingKey={`${exercise.id}:${mediaMode}`}
                    transition={150}
                    accessibilityLabel={`${exercise.name}, ${mediaMode === "finish" ? "finish" : "start"} position`}
                  />
                ) : (
                  <View style={$mediaFallback}>
                    <Ionicons name="barbell-outline" size={56} color={theme.colors.textDim} />
                  </View>
                )}
                {video && mediaMode === "demo" && videoStatus !== "readyToPlay" ? (
                  <View
                    style={themed($videoStatusOverlay)}
                    pointerEvents={videoStatus === "error" ? "auto" : "none"}
                  >
                    {videoStatus === "error" ? (
                      <>
                        <Ionicons name="alert-circle-outline" size={28} color={theme.colors.text} />
                        <Text size="sm">Demo unavailable</Text>
                        <Pressable
                          onPress={() => void retryDemo()}
                          style={({ pressed }) => [
                            themed($retryButton),
                            pressed && $playbackControlPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Retry exercise demo"
                        >
                          <Text size="xs" weight="semiBold" style={themed($retryButtonText)}>
                            Retry demo
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <ActivityIndicator color={theme.colors.tint} />
                        <Text size="sm">Loading demo…</Text>
                      </>
                    )}
                  </View>
                ) : null}
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
                  {video && mediaMode === "demo" && videoStatus === "readyToPlay" ? (
                    <Pressable
                      onPress={togglePlayback}
                      style={({ pressed }) => [
                        themed($playbackControl),
                        pressed && $playbackControlPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? "Pause exercise demo" : "Play exercise demo"}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={14}
                        color={theme.colors.tint}
                      />
                      <Text size="xs" weight="semiBold" style={themed($playbackControlText)}>
                        {isPlaying ? "Pause" : "Play"}
                      </Text>
                    </Pressable>
                  ) : null}
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

              {video && (
                <View style={themed($creditsSection)}>
                  <Text size="xs" weight="semiBold" style={themed($creditsLabel)}>
                    Video credits
                  </Text>
                  <View style={themed($creditsRow)}>
                    <Pressable
                      onPress={() => openLinkInBrowser(video.sourceUrl)}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${video.sourceName} source`}
                    >
                      <Text size="xs" style={themed($creditsLink)}>
                        {video.attribution} via {video.sourceName}
                      </Text>
                    </Pressable>
                    <Text size="xs" style={themed($creditsSeparator)}>
                      ·
                    </Text>
                    <Pressable
                      onPress={() => openLinkInBrowser(video.licenseUrl)}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${video.licenseName} license`}
                    >
                      <Text size="xs" style={themed($creditsLink)}>
                        {video.licenseName}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>

            {!!route.params.selectionContext && (
              <View
                testID="exercise-detail-footer"
                style={[
                  themed($footer),
                  { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
                ]}
              >
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
  aspectRatio: 1.6,
  backgroundColor: colors.cardSecondary,
  overflow: "hidden",
})
const $exerciseImage: ImageStyle = { width: "100%", height: "100%" }
const $exerciseVideo: ViewStyle = { width: "100%", height: "100%" }
const $mediaFallback: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center" }
const $videoStatusOverlay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.cardSecondary,
  gap: spacing.sm,
  justifyContent: "center",
  ...StyleSheet.absoluteFill,
})
const $playbackControl: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderLeftColor: colors.separator,
  borderLeftWidth: 1,
  flexDirection: "row",
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 44,
  minWidth: 76,
  paddingHorizontal: spacing.sm,
})
const $playbackControlPressed: ViewStyle = { opacity: 0.75 }
const $playbackControlText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})
const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.tint,
  borderRadius: 999,
  justifyContent: "center",
  minHeight: 44,
  paddingHorizontal: spacing.lg,
})
const $retryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})
const $segmentedControl: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  padding: 3,
  borderRadius: 10,
  backgroundColor: colors.cardSecondary,
})
const $segment: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  paddingHorizontal: spacing.sm,
})
const $segmentActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
})
const $segmentText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
const $segmentTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $creditsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  gap: spacing.xs,
  marginTop: spacing.md,
  padding: spacing.md,
})
const $creditsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.xs,
})
const $creditsLabel: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
const $creditsLink: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.tint })
const $creditsSeparator: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
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
  borderRadius: 999,
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
  gap: 12,
  marginBottom: 16,
}
const $instructionNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary100,
  borderRadius: 12,
  color: colors.tint,
  height: 24,
  lineHeight: 24,
  overflow: "hidden",
  textAlign: "center",
  width: 24,
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
