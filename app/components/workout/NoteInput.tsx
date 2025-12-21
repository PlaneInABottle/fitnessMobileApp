import { TextStyle, ViewStyle } from "react-native"

import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface NoteInputProps {
  value: string
  onChangeText: (value: string) => void
}

export function NoteInput({ value, onChangeText }: NoteInputProps) {
  const { themed } = useAppTheme()

  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder="Buraya not ekleyin..."
      multiline
      borderless
      accessibilityLabel="Exercise note"
      containerStyle={themed($container)}
      inputWrapperStyle={themed($inputWrapper)}
      style={themed($inputIndent)}
    />
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({})

const $inputWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 0,
  minHeight: 56,
  paddingVertical: spacing.xs,
})

const $inputIndent: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginHorizontal: spacing.lg,
})
