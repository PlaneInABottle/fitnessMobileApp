import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface AnatomyVisualizationProps {
  /** Array of muscle group names to highlight (for future implementation) */
  highlightedMuscles?: string[]
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * Placeholder component for muscle visualization.
 * Shows front and back body silhouettes side by side.
 * Future: will highlight specific muscles based on exercises.
 */
export function AnatomyVisualization(props: AnatomyVisualizationProps) {
  const { highlightedMuscles = [], style: $styleOverride } = props
  const { themed } = useAppTheme()

  return (
    <View style={[themed($container), $styleOverride]}>
      <View style={themed($bodyContainer)}>
        <View style={themed($body)}>
          <Text style={themed($bodyIcon)}>🧍</Text>
          <Text size="xxs" style={themed($label)}>
            Front
          </Text>
        </View>
        <View style={themed($body)}>
          <Text style={themed($bodyIcon)}>🧍</Text>
          <Text size="xxs" style={themed($label)}>
            Back
          </Text>
        </View>
      </View>
      {highlightedMuscles.length > 0 && (
        <Text size="xxs" style={themed($muscleText)} numberOfLines={1}>
          {highlightedMuscles.join(", ")}
        </Text>
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  alignItems: "center",
})

const $bodyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
})

const $body: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  padding: 8,
  backgroundColor: colors.cardSecondary,
  borderRadius: 8,
})

const $bodyIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 40,
  opacity: 0.6,
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 4,
})

const $muscleText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
  textAlign: "center",
})
