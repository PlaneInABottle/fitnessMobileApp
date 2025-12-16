import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "./Button"
import { Icon } from "./Icon"
import { Text } from "./Text"

export interface RoutineCardProps {
  /** Title of the routine */
  title: string
  /** Preview text showing exercises in the routine */
  exercisePreview: string
  /** Callback when "Start Routine" is pressed */
  onStart: () => void
  /** Optional callback for the menu button */
  onMenu?: () => void
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * Card component displaying a workout routine with title,
 * exercise preview, and start button.
 */
export function RoutineCard(props: RoutineCardProps) {
  const { title, exercisePreview, onStart, onMenu, style: $styleOverride } = props
  const { themed, theme } = useAppTheme()

  return (
    <View style={[themed($container), $styleOverride]}>
      <View style={$header}>
        <Text weight="bold" size="lg" style={themed($title)}>
          {title}
        </Text>
        {onMenu && (
          <Pressable
            onPress={onMenu}
            style={$menuButton}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Icon icon="more" size={20} color={theme.colors.textDim} />
          </Pressable>
        )}
      </View>
      <Text size="sm" style={themed($exercisePreview)} numberOfLines={2} ellipsizeMode="tail">
        {exercisePreview}
      </Text>
      <Button
        text="Start Routine"
        preset="filled"
        onPress={onStart}
        style={themed($startButton)}
        textStyle={themed($startButtonText)}
      />
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
})

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flex: 1,
})

const $menuButton: ViewStyle = {
  padding: 4,
}

const $exercisePreview: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginBottom: 16,
})

const $startButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  minHeight: 44,
})

const $startButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontWeight: "600",
})
