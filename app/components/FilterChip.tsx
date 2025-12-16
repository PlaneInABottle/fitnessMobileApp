import { Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes } from "./Icon"
import { Text } from "./Text"

export interface FilterChipProps {
  /** Label text for the chip */
  label: string
  /** Whether the chip is currently active/selected */
  active?: boolean
  /** Optional icon to display before the label */
  icon?: IconTypes
  /** Callback when the chip is pressed */
  onPress?: () => void
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * A pill-shaped filter button component for filtering content.
 * Used for category selection, filter toggles, etc.
 */
export function FilterChip(props: FilterChipProps) {
  const { label, active = false, icon, onPress, style: $styleOverride } = props
  const { themed, theme } = useAppTheme()

  return (
    <Pressable
      style={({ pressed }) => [
        themed($container),
        active && themed($containerActive),
        pressed && themed($containerPressed),
        $styleOverride,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon && (
        <Icon
          icon={icon}
          size={16}
          color={active ? theme.colors.tint : theme.colors.text}
          containerStyle={$iconContainer}
        />
      )}
      <Text
        size="sm"
        weight={active ? "medium" : "normal"}
        style={[themed($text), active && themed($textActive)]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 20,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: "transparent",
})

const $containerActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.palette.primary100,
})

const $containerPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  opacity: 0.8,
  backgroundColor: colors.cardSecondary,
})

const $iconContainer: ViewStyle = {
  marginRight: 6,
}

const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $textActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})
