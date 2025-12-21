import { Pressable, Switch, TextStyle, View, ViewStyle } from "react-native"

import type { Exercise } from "@/models/ExerciseStore"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "../Icon"
import { Text } from "../Text"

export interface ExerciseCardProps {
  exercise: Exercise
  /** Note text like "Aynı devam" (Same as before) */
  note?: string
  /** Whether to show the bottom separator line */
  showBottomSeparator?: boolean
  /** Whether rest timer is enabled */
  restTimerEnabled?: boolean
  /** Callback when rest timer toggle changes */
  onRestTimerChange?: (enabled: boolean) => void
  /** Callback when exercise name is pressed */
  onPress?: () => void
  /** Callback for context menu */
  onMenuPress?: () => void
}

export function ExerciseCard({
  exercise,
  note,
  showBottomSeparator = true,
  restTimerEnabled = false,
  onRestTimerChange,
  onPress,
  onMenuPress,
}: ExerciseCardProps) {
  const { themed, theme } = useAppTheme()

  const _muscles = exercise.muscleGroups.length ? exercise.muscleGroups.join(", ") : "—"

  return (
    <View style={themed([$container, !showBottomSeparator && $containerNoSeparator])}>
      {/* Header Row */}
      <View style={$styles.row}>
        {/* Thumbnail */}
        <View style={themed($thumbnail)}>
          <Icon icon="ladybug" size={24} color={theme.colors.textDim} />
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

      {/* Rest Timer Toggle */}
      {onRestTimerChange && (
        <View style={themed($restTimerRow)}>
          <Text size="sm" style={themed($restTimerLabel)}>
            Dinlenme:
          </Text>
          <Text
            size="sm"
            weight="medium"
            style={themed(restTimerEnabled ? $restTimerValueOn : $restTimerValueOff)}
          >
            {restTimerEnabled ? "AÇIK" : "KAPALI"}
          </Text>
          <Switch
            value={restTimerEnabled}
            onValueChange={onRestTimerChange}
            trackColor={{ false: theme.colors.border, true: theme.colors.tint }}
            thumbColor="#FFFFFF"
            style={$switch}
          />
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
  paddingLeft: 56,
  gap: spacing.xs,
})

const $restTimerLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $restTimerValueOff: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $restTimerValueOn: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.success,
})

const $switch: ViewStyle = {
  marginLeft: 4,
  transform: [{ scale: 0.8 }],
}
