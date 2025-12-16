import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
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
 * blue "Devam et" (Resume) button and red "Sil" (Delete) button.
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
      {/* Header text */}
      <View style={$headerSection}>
        <Text
          text="Antrenman Devam Ediyor"
          weight="semiBold"
          size="md"
          style={themed($titleText)}
        />
        <Text
          text={`${duration} • ${exerciseCount} ${exerciseLabel}`}
          size="xs"
          style={themed($subtitleText)}
        />
      </View>

      {/* Action buttons */}
      <View style={[$styles.row, $actions]}>
        {/* Resume button */}
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Continue current workout session"
          accessibilityRole="button"
        >
          <Icon icon="caretRight" size={16} color={theme.colors.tint} />
          <Text text="Devam et" weight="medium" size="sm" style={themed($resumeText)} />
        </Pressable>

        {/* Delete button */}
        <Pressable
          onPress={onDiscard}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Discard current workout session"
          accessibilityRole="button"
        >
          <Icon icon="x" size={16} color={theme.colors.error} />
          <Text text="Sil" weight="medium" size="sm" style={themed($deleteText)} />
        </Pressable>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200, // #1C1C1E in dark mode
  borderRadius: 12,
  marginHorizontal: spacing.md,
  marginBottom: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 8,
})

const $headerSection: ViewStyle = {
  marginBottom: 8,
}

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 2,
})

const $subtitleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $actions: ViewStyle = {
  gap: 16,
}

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 8,
  gap: 6,
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
