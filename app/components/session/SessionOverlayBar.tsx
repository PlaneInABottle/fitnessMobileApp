import { View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SessionOverlayBarProps {
  duration: string
  exerciseCount: number
  onContinue: () => void
  onDiscard: () => void
}

export function SessionOverlayBar({
  duration,
  exerciseCount,
  onContinue,
  onDiscard,
}: SessionOverlayBarProps) {
  const { themed, theme } = useAppTheme()

  const exerciseLabel = exerciseCount === 1 ? "exercise" : "exercises"

  return (
    <View style={themed($container)}>
      <View style={themed($info)}>
        <Text text={duration} preset="bold" size="md" />
        <Text text={`${exerciseCount} ${exerciseLabel}`} size="xs" />
      </View>
      <View style={themed($actions)}>
        <Button
          text="Discard"
          preset="default"
          onPress={onDiscard}
          style={themed($discardButton)}
          textStyle={{ color: theme.colors.error }}
          accessibilityLabel="Discard current workout session"
        />
        <Button
          text="Continue"
          preset="reversed"
          onPress={onContinue}
          style={themed($continueButton)}
          accessibilityLabel="Continue current workout session"
        />
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.neutral300,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
})

const $info: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "column",
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
})

const $discardButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 40,
})

const $continueButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 40,
})
