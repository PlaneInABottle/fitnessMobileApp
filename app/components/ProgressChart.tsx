import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export type ChartType = "volume" | "reps" | "duration"

export interface ProgressChartProps {
  /** Type of chart to display */
  type: ChartType
  /** Optional data points for the chart (for future implementation) */
  data?: number[]
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/** Chart type labels */
const CHART_LABELS: Record<ChartType, string> = {
  volume: "Volume Progress",
  reps: "Reps Progress",
  duration: "Duration Progress",
}

/**
 * Placeholder component for analytics charts.
 * Shows a simple placeholder box with chart type indication.
 */
export function ProgressChart(props: ProgressChartProps) {
  const { type, data = [], style: $styleOverride } = props
  const { themed } = useAppTheme()

  return (
    <View style={[themed($container), $styleOverride]}>
      <View style={themed($chartArea)}>
        <View style={themed($chartLine)} />
        <View style={[themed($chartLine), $chartLineSecond]} />
        <View style={[themed($chartLine), $chartLineThird]} />
        <View style={themed($trendLine)} />
      </View>
      <Text weight="medium" size="sm" style={themed($label)}>
        {CHART_LABELS[type]}
      </Text>
      {data.length > 0 && (
        <Text size="xxs" style={themed($dataInfo)}>
          {data.length} data points
        </Text>
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  alignItems: "center",
})

const $chartArea: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "100%",
  height: 120,
  justifyContent: "flex-end",
  alignItems: "flex-end",
  marginBottom: spacing.sm,
  position: "relative",
})

const $chartLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  height: 1,
  backgroundColor: colors.separator,
})

const $chartLineSecond: ViewStyle = {
  bottom: "33%",
}

const $chartLineThird: ViewStyle = {
  bottom: "66%",
}

const $trendLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  left: "10%",
  right: "10%",
  bottom: "20%",
  height: 3,
  backgroundColor: colors.tint,
  borderRadius: 2,
  transform: [{ rotate: "-10deg" }],
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $dataInfo: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 4,
})
