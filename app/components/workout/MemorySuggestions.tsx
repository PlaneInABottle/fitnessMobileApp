import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import type { SetData } from "@/models/SetStore"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "../Text"

export type MemorySuggestion = {
  id: string
  label: string
  setData: Partial<SetData>
}

export interface MemorySuggestionsProps {
  suggestions: MemorySuggestion[]
  onUseSuggestion: (setData: Partial<SetData>) => void
}

export function MemorySuggestions({ suggestions, onUseSuggestion }: MemorySuggestionsProps) {
  const { themed } = useAppTheme()

  if (!suggestions.length) return null

  return (
    <View style={themed($container)}>
      <Text text="Suggestions" style={themed($title)} />
      <View style={themed($chips)}>
        {suggestions.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onUseSuggestion(s.setData)}
            style={themed($chip)}
            accessibilityRole="button"
          >
            <Text text={s.label} style={themed($chipText)} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
})

const $chips: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  backgroundColor: colors.palette.neutral100,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 999,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 13,
})
