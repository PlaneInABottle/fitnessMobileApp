import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon, IconTypes } from "./Icon"
import { Text } from "./Text"

export interface TabBarIconProps {
  /** Icon name from the icon registry */
  name: IconTypes
  /** Label text below the icon */
  label: string
  /** Whether this tab is currently focused/active */
  focused: boolean
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * Bottom tab bar icon component with icon and label.
 * Blue when active, gray when inactive.
 */
export function TabBarIcon(props: TabBarIconProps) {
  const { name, label, focused, style: $styleOverride } = props
  const { themed, theme } = useAppTheme()

  const iconColor = focused ? theme.colors.tint : theme.colors.tintInactive

  return (
    <View style={[themed($container), $styleOverride]}>
      <Icon icon={name} size={24} color={iconColor} />
      <Text
        size="xxs"
        weight={focused ? "medium" : "normal"}
        style={[themed($label), { color: iconColor }]}
      >
        {label}
      </Text>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  justifyContent: "center",
  paddingTop: 8,
})

const $label: ThemedStyle<TextStyle> = () => ({
  marginTop: 4,
})
