import { ImageStyle, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"

import { getExerciseImages } from "@/data/exerciseMedia"
import type { Exercise } from "@/models/ExerciseStore"
import { REST_TIME_OPTIONS, type RestTimeSeconds } from "@/models/WorkoutStore"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "../Icon"
import { Text } from "../Text"

export interface ExerciseCardProps {
  exercise: Exercise
  /** Note text such as "Same as before". */
  note?: string
  /** Whether to show the bottom separator line */
  showBottomSeparator?: boolean
  /** Rest duration inherited by new sets for this exercise. */
  restTime?: RestTimeSeconds
  /** Callback when the exercise rest duration changes. */
  onRestTimeChange?: (seconds: RestTimeSeconds) => void
  /** Callback when exercise name is pressed */
  onPress?: () => void
  /** Callback for context menu */
  onMenuPress?: () => void
}

export function ExerciseCard({
  exercise,
  note,
  showBottomSeparator = true,
  restTime,
  onRestTimeChange,
  onPress,
  onMenuPress,
}: ExerciseCardProps) {
  const { themed, theme } = useAppTheme()

  const _muscles = exercise.muscleGroups.length ? exercise.muscleGroups.join(", ") : "—"
  const imageSource = exercise.imageUrl ?? getExerciseImages(exercise.id)?.[0]

  return (
    <View style={themed([$container, !showBottomSeparator && $containerNoSeparator])}>
      {/* Header Row */}
      <View style={$styles.row}>
        {/* Thumbnail */}
        <View style={themed($thumbnail)}>
          {imageSource ? (
            <Image source={imageSource} style={$thumbnailImage} contentFit="contain" />
          ) : (
            <Ionicons name="barbell-outline" size={24} color={theme.colors.textDim} />
          )}
        </View>

        {/* Exercise Info */}
        <View style={$infoContainer}>
          <Pressable onPress={onPress} disabled={!onPress}>
            <Text weight="semiBold" size="md" style={themed($exerciseName)} numberOfLines={1}>
              {exercise.name}
            </Text>
          </Pressable>
          {note && (
            <Text size="xs" style={themed($noteText)}>
              {note}
            </Text>
          )}
        </View>

        {/* Menu Button */}
        {onMenuPress && (
          <Pressable
            onPress={onMenuPress}
            style={$menuButton}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Icon icon="more" size={20} color={theme.colors.textDim} />
          </Pressable>
        )}
      </View>

      {onRestTimeChange && restTime !== undefined && (
        <View style={themed($restTimerRow)}>
          <Text size="xs" weight="medium" style={themed($restTimerLabel)}>
            Rest
          </Text>
          <View style={$restOptions}>
            {REST_TIME_OPTIONS.map((seconds) => {
              const selected = restTime === seconds
              const valueLabel = seconds === 0 ? "Off" : `${seconds}s`
              const accessibilityValue = seconds === 0 ? "off" : `${seconds} seconds`

              return (
                <Pressable
                  key={seconds}
                  onPress={() => onRestTimeChange(seconds)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rest timer for ${exercise.name}: ${accessibilityValue}`}
                  accessibilityState={{ selected }}
                  style={themed([$restOption, selected && $restOptionSelected])}
                >
                  <Text
                    text={valueLabel}
                    size="xxs"
                    weight={selected ? "bold" : "medium"}
                    style={themed(selected ? $restOptionTextSelected : $restOptionText)}
                  />
                </Pressable>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $containerNoSeparator: ViewStyle = {
  borderBottomWidth: 0,
}

const $thumbnail: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 44,
  height: 44,
  borderRadius: 8,
  backgroundColor: colors.cardSecondary,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
})

const $thumbnailImage: ImageStyle = {
  width: 44,
  height: 44,
  borderRadius: 8,
}

const $infoContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
}

const $exerciseName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $noteText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 2,
})

const $menuButton: ViewStyle = {
  padding: 8,
}

const $restTimerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $restTimerLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $restOptions: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  justifyContent: "space-between",
}

const $restOption: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 44,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.cardSecondary,
})

const $restOptionSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint,
})

const $restOptionText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })

const $restOptionTextSelected: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})
