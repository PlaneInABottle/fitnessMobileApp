import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "../Button"
import { Icon } from "../Icon"
import { Text } from "../Text"
import { WorkoutStatsBar } from "../WorkoutStatsBar"

export interface WorkoutHeaderProps {
  title: string
  leftActionLabel?: string
  onLeftActionPress?: () => void
  rightActionLabel?: string
  onRightActionPress?: () => void
  /** Show stats bar with workout metrics */
  showStats?: boolean
  /** Elapsed time in seconds for stats */
  timeSeconds?: number
  /** Total volume in kg for stats */
  volumeKg?: number
  /** Number of completed sets for stats */
  setsCount?: number
  /** Callback when timer icon is pressed */
  onTimerPress?: () => void
}

export function WorkoutHeader({
  title,
  leftActionLabel,
  onLeftActionPress,
  rightActionLabel,
  onRightActionPress,
  showStats = false,
  timeSeconds = 0,
  volumeKg = 0,
  setsCount = 0,
  onTimerPress,
}: WorkoutHeaderProps) {
  const { themed, theme } = useAppTheme()

  return (
    <View style={themed($container)}>
      {/* Title Row */}
      <View style={themed([$styles.row, $row])}>
        {!!leftActionLabel && !!onLeftActionPress ? (
          <Pressable
            onPress={onLeftActionPress}
            style={$leftAction}
            accessibilityRole="button"
            accessibilityLabel={leftActionLabel}
          >
            <Icon icon="caretLeft" size={20} color={theme.colors.tint} />
            <Text
              text={title}
              weight="semiBold"
              size="lg"
              numberOfLines={1}
              style={themed($titleText)}
            />
          </Pressable>
        ) : (
          <Text text={title} preset="heading" style={themed($titleTextCenter)} />
        )}

        <View style={$rightActions}>
          {onTimerPress && (
            <Pressable
              onPress={onTimerPress}
              style={$timerButton}
              accessibilityRole="button"
              accessibilityLabel="Timer"
            >
              <Icon icon="bell" size={22} color={theme.colors.text} />
            </Pressable>
          )}

          {!!rightActionLabel && !!onRightActionPress && (
            <Button
              text={rightActionLabel}
              preset="filled"
              onPress={onRightActionPress}
              style={themed($finishButton)}
              textStyle={themed($finishButtonText)}
            />
          )}
        </View>
      </View>

      {/* Stats Bar */}
      {showStats && (
        <WorkoutStatsBar
          timeSeconds={timeSeconds}
          volumeKg={volumeKg}
          setsCount={setsCount}
          style={themed($statsBar)}
        />
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $row: ViewStyle = {
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 44,
}

const $leftAction: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  gap: 4,
}

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flexShrink: 1,
})

const $titleTextCenter: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  textAlign: "center",
  color: colors.text,
})

const $rightActions: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 0,
  gap: 12,
}

const $timerButton: ViewStyle = {
  alignItems: "center",
  height: 44,
  justifyContent: "center",
  width: 44,
}

const $finishButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 10,
  minHeight: 44,
  paddingHorizontal: 16,
  paddingVertical: 8,
})

const $finishButtonText: ThemedStyle<TextStyle> = ({ typography }) => ({
  color: "#FFFFFF",
  fontFamily: typography.primary.semiBold,
  fontSize: 14,
  lineHeight: 20,
})

const $statsBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})
