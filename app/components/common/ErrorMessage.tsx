import { TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "../Button"
import { Text } from "../Text"

export interface ErrorMessageProps {
  message: string
  actionLabel?: string
  onActionPress?: () => void
}

export function ErrorMessage({ message, actionLabel, onActionPress }: ErrorMessageProps) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($container)}>
      <Text text={message} style={themed($text)} />
      {!!actionLabel && !!onActionPress && (
        <Button text={actionLabel} preset="default" onPress={onActionPress} />
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.error,
  borderRadius: 8,
  gap: spacing.sm,
})

const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
