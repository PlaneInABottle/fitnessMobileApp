import { TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "../Button"
import { Text } from "../Text"

export interface WorkoutHeaderProps {
  title: string
  leftActionLabel?: string
  onLeftActionPress?: () => void
  rightActionLabel?: string
  onRightActionPress?: () => void
}

export function WorkoutHeader({
  title,
  leftActionLabel,
  onLeftActionPress,
  rightActionLabel,
  onRightActionPress,
}: WorkoutHeaderProps) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($container)}>
      <View style={themed([$styles.row, $row])}>
        {!!leftActionLabel && !!onLeftActionPress ? (
          <Button text={leftActionLabel} preset="default" onPress={onLeftActionPress} style={$button} />
        ) : (
          <View style={$leftFiller} />
        )}

        <Text text={title} preset="heading" style={themed($title)} />

        {!!rightActionLabel && !!onRightActionPress ? (
          <Button text={rightActionLabel} preset="default" onPress={onRightActionPress} style={$button} />
        ) : (
          <View style={$rightFiller} />
        )}
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
})

const $row: ViewStyle = {
  alignItems: "center",
  justifyContent: "space-between",
}

const $title: ThemedStyle<TextStyle> = () => ({
  flex: 1,
  textAlign: "center",
})

const $button: ViewStyle = {
  minHeight: 40,
  paddingHorizontal: 12,
}

const $leftFiller: ViewStyle = {
  width: 72,
}

const $rightFiller: ViewStyle = {
  width: 72,
}
