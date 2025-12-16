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
            <Text text={title} weight="semiBold" size="lg" style={themed($titleText)} />
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
  gap: 4,
}

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $titleTextCenter: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  textAlign: "center",
  color: colors.text,
})

const $rightActions: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $timerButton: ViewStyle = {
  padding: 8,
}

const $finishButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  minHeight: 36,
  paddingHorizontal: 16,
  paddingVertical: 8,
})

const $finishButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
  fontWeight: "600",
  fontSize: 14,
})

const $statsBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})
