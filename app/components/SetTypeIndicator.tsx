import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export type SetType = "warmup" | "working" | "dropset" | "failure"

export interface SetTypeIndicatorProps {
  /** Type of set */
  type: SetType
  /** Optional set index (1-based) for numbered display */
  index?: number
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/** Map set types to display letters */
const SET_TYPE_LETTERS: Record<SetType, string> = {
  warmup: "W",
  working: "",
  dropset: "D",
  failure: "F",
}

/**
 * Badge component for displaying set type in workout logging.
 * Colors: W=yellow, D=cyan, F=red, numbers=white
 */
export function SetTypeIndicator(props: SetTypeIndicatorProps) {
  const { type, index, style: $styleOverride } = props
  const { themed, getSetTypeColor } = useAppTheme()

  const displayText =
    type === "working" && index !== undefined ? index.toString() : SET_TYPE_LETTERS[type]

  const color = getSetTypeColor(type)

  return (
    <View style={[themed($container), $styleOverride]}>
      <Text weight="bold" size="xs" style={[themed($text), { color }]}>
        {displayText}
      </Text>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 28,
  height: 28,
  borderRadius: 6,
  backgroundColor: colors.cardSecondary,
  justifyContent: "center",
  alignItems: "center",
})

const $text: ThemedStyle<TextStyle> = () => ({
  fontWeight: "700",
})
