import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface WorkoutStatsBarProps {
  /** Elapsed time in seconds */
  timeSeconds: number
  /** Total volume in kg */
  volumeKg: number
  /** Number of completed sets */
  setsCount: number
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * Formats seconds into HH:MM:SS or MM:SS format
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Horizontal stats bar for displaying workout metrics.
 * Shows time, volume, sets count, and anatomy placeholder.
 */
export function WorkoutStatsBar(props: WorkoutStatsBarProps) {
  const { timeSeconds, volumeKg, setsCount, style: $styleOverride } = props
  const { themed } = useAppTheme()

  return (
    <View style={[themed($container), $styleOverride]}>
      <View style={$statItem}>
        <Text size="xxs" style={themed($label)}>
          Süre
        </Text>
        <Text
          weight="bold"
          size="sm"
          style={themed($valueBlue)}
          accessibilityLabel="workout-stats-time-value"
        >
          {formatTime(timeSeconds)}
        </Text>
      </View>
      <View style={themed($separator)} />
      <View style={$statItem}>
        <Text size="xxs" style={themed($label)}>
          Hacim
        </Text>
        <Text
          weight="bold"
          size="sm"
          style={themed($value)}
          accessibilityLabel="workout-stats-volume-value"
        >
          {volumeKg.toLocaleString()} kg
        </Text>
      </View>
      <View style={themed($separator)} />
      <View style={$statItem}>
        <Text size="xxs" style={themed($label)}>
          Sets
        </Text>
        <Text
          weight="bold"
          size="sm"
          style={themed($value)}
          accessibilityLabel="workout-stats-sets-value"
        >
          {setsCount}
        </Text>
      </View>
      <View style={themed($separator)} />
      <View style={$statItem}>
        <View style={themed($anatomyPlaceholder)}>
          <Text size="xxs" style={themed($anatomyIcon)}>
            🏋️
          </Text>
        </View>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-around",
  backgroundColor: colors.card,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
})

const $statItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $separator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 1,
  height: 24,
  backgroundColor: colors.separator,
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginBottom: 2,
})

const $value: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $valueBlue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $anatomyPlaceholder: ThemedStyle<ViewStyle> = () => ({
  width: 32,
  height: 32,
  justifyContent: "center",
  alignItems: "center",
})

const $anatomyIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
})
