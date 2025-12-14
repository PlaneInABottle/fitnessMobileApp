import { View, ViewStyle, ActivityIndicator, TextStyle } from "react-native"

import { useAppTheme } from "@/theme/context"

import { Text } from "../Text"

export interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  const {
    theme: { colors, spacing },
  } = useAppTheme()

  return (
    <View style={[$container, { gap: spacing.sm }]}>
      <ActivityIndicator color={colors.tint} />
      {!!text && <Text text={text} style={[$text, { color: colors.textDim }]} />}
    </View>
  )
}

const $container: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
}

const $text: TextStyle = {
  textAlign: "center",
}
