import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SessionOverlayBarProps {
  duration: string
  exerciseCount: number
  onContinue: () => void
  onDiscard: () => void
}

/**
 * Session overlay bar with dark theme styling (#1C1C1E background).
 * Displays "Antrenman Devam Ediyor" (Workout in Progress) with
 * blue "Devam" (Resume) button and red "Sil" (Delete) button.
 */
export function SessionOverlayBar({
  duration,
  exerciseCount,
  onContinue,
  onDiscard,
}: SessionOverlayBarProps) {
  const { themed, theme } = useAppTheme()

  const exerciseLabel = exerciseCount === 1 ? "egzersiz" : "egzersiz"

  return (
    <View style={themed($container)}>
      <View style={themed($headerSection)}>
        <Text
          text="Antrenman Devam Ediyor"
          weight="semiBold"
          size="sm"
          style={themed($titleText)}
        />
        <Text
          text={`${duration} • ${exerciseCount} ${exerciseLabel}`}
          size="xxs"
          style={themed($subtitleText)}
        />
      </View>

      <View style={themed($actions)}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Continue current workout session"
          accessibilityRole="button"
        >
          <Icon icon="caretRight" size={14} color={theme.colors.tint} />
          <Text text="Devam" weight="medium" size="xs" style={themed($resumeText)} />
        </Pressable>

        <Pressable
          onPress={onDiscard}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Discard current workout session"
          accessibilityRole="button"
        >
          <Icon icon="x" size={14} color={theme.colors.error} />
          <Text text="Sil" weight="medium" size="xs" style={themed($deleteText)} />
        </Pressable>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200, // #1C1C1E in dark mode
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $headerSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingRight: spacing.sm,
})

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $subtitleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 2,
  paddingHorizontal: spacing.xs,
  gap: 4,
})

const $actionButtonPressed: ViewStyle = {
  opacity: 0.7,
}

const $resumeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $deleteText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
