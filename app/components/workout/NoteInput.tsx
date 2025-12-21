import { ViewStyle } from "react-native"

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
      accessibilityLabel="Exercise note"
      containerStyle={themed($container)}
      inputWrapperStyle={themed($inputWrapper)}
    />
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginHorizontal: spacing.md,
})

const $inputWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 56,
  paddingVertical: spacing.xs,
})
