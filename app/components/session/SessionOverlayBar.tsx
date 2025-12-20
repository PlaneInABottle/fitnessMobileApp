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
export function SessionOverlayBar({ onContinue, onDiscard }: SessionOverlayBarProps) {
  const { themed, theme } = useAppTheme()

  return (
    <View style={themed($container)}>
      <View style={themed($headerSection)}>
        <Text text="workout continues" weight="semiBold" size="sm" style={themed($titleText)} />
      </View>

      <View style={themed($actions)}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Continue current workout session"
          accessibilityRole="button"
        >
          <Icon icon="caretRight" size={14} color={theme.colors.tint} />
          <Text text="Devam" weight="medium" size="sm" style={themed($resumeText)} />
        </Pressable>

        <Pressable
          onPress={onDiscard}
          style={({ pressed }) => [themed($actionButton), pressed && $actionButtonPressed]}
          accessibilityLabel="Discard current workout session"
          accessibilityRole="button"
        >
          <Icon icon="x" size={14} color={theme.colors.error} />
          <Text text="Sil" weight="medium" size="sm" style={themed($deleteText)} />
        </Pressable>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200, // #1C1C1E in dark mode
  paddingHorizontal: spacing.md,
  paddingVertical: 4,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
})

const $headerSection: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: 4,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.lg,
})

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 32,
  minWidth: 96,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 4,
  paddingHorizontal: spacing.md,
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
