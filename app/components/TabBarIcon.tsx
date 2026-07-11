import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface TabBarIconProps {
  name: "home" | "barbell"
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
  const iconName = focused ? name : (`${name}-outline` as const)

  return (
    <View style={[themed($container), $styleOverride]}>
      <Ionicons name={iconName} size={23} color={iconColor} />
      <Text
        size="xxs"
        weight={focused ? "medium" : "normal"}
        numberOfLines={1}
        ellipsizeMode="tail"
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
  paddingTop: 6,
  paddingBottom: 2,
  minWidth: 72,
  maxWidth: 120,
})

const $label: ThemedStyle<TextStyle> = () => ({
  marginTop: 2,
  maxWidth: 110,
})
