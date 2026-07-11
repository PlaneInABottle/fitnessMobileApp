import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"
import { Text } from "./Text"

export interface RoutineCardProps {
  /** Title of the routine */
  title: string
  /** Preview text showing exercises in the routine */
  exercisePreview: string
  /** Callback when "Start Routine" is pressed */
  onStart: () => void
  /** Optional callback for opening routine details */
  onOpen?: () => void
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * Compact routine row with separate detail and start actions.
 */
export function RoutineCard(props: RoutineCardProps) {
  const { title, exercisePreview, onStart, onOpen, style: $styleOverride } = props
  const { themed, theme } = useAppTheme()

  return (
    <View style={[themed($container), $styleOverride]}>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? "button" : undefined}
        accessibilityLabel={onOpen ? `Open ${title}` : undefined}
        style={({ pressed }) => [themed($details), pressed && themed($detailsPressed)]}
      >
        <View style={$copy}>
          <Text weight="semiBold" style={themed($title)} numberOfLines={1}>
            {title}
          </Text>
          <Text size="xs" style={themed($exercisePreview)} numberOfLines={2} ellipsizeMode="tail">
            {exercisePreview}
          </Text>
        </View>
        {onOpen && <Icon icon="caretRight" size={18} color={theme.colors.textDim} />}
      </Pressable>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [themed($startButton), pressed && themed($startButtonPressed)]}
        accessibilityRole="button"
        accessibilityLabel={`Start ${title}`}
      >
        <Ionicons name="play" size={16} color="#FFFFFF" />
        <Text text="Start" size="xs" weight="semiBold" style={$startButtonText} />
      </Pressable>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  minHeight: 76,
  overflow: "hidden",
  paddingRight: spacing.sm,
})

const $details: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flex: 1,
  flexDirection: "row",
  gap: spacing.sm,
  minHeight: 76,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $detailsPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.cardSecondary,
})

const $copy: ViewStyle = { flex: 1, gap: 3 }

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flex: 1,
})

const $exercisePreview: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $startButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.tint,
  borderRadius: 6,
  flexDirection: "row",
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 44,
  paddingHorizontal: spacing.sm,
})

const $startButtonPressed: ThemedStyle<ViewStyle> = () => ({ opacity: 0.78 })

const $startButtonText: TextStyle = {
  color: "#FFFFFF",
}
