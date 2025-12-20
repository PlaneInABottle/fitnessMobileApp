import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { BottomSheet } from "@/components/BottomSheet"
import { Text } from "@/components/Text"
import { SetTypeId } from "@/models/SetStore"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SetTypeOption {
  id: SetTypeId | "remove"
  letter: string
  label: string
  color: string
}

export interface SetOptionsBottomSheetProps {
  visible: boolean
  onClose: () => void
  onSelectType: (typeId: SetTypeId) => void
  onDelete: () => void
  currentTypeId?: SetTypeId
}

const SET_TYPE_OPTIONS: Omit<SetTypeOption, "color">[] = [
  { id: "warmup", letter: "W", label: "Isınma Seti" },
  { id: "working", letter: "#", label: "Normal Set" },
  { id: "failure", letter: "F", label: "Tükeniş Seti" },
  { id: "dropset", letter: "D", label: "Drop Set" },
  { id: "remove", letter: "X", label: "Seti Kaldır" },
]

export function SetOptionsBottomSheet({
  visible,
  onClose,
  onSelectType,
  onDelete,
  currentTypeId,
}: SetOptionsBottomSheetProps) {
  const { themed, getSetTypeColor, theme } = useAppTheme()

  function getOptionColor(id: SetTypeOption["id"]): string {
    if (id === "remove") return theme.colors.error
    if (id === "working") return theme.colors.text
    return getSetTypeColor(id as any)
  }

  function handleSelect(option: Omit<SetTypeOption, "color">) {
    if (option.id === "remove") {
      onClose()
      onDelete()
    } else {
      onClose()
      onSelectType(option.id as SetTypeId)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Set Türünü Seç">
      <View style={themed($optionsContainer)}>
        {SET_TYPE_OPTIONS.map((option) => {
          const color = getOptionColor(option.id)
          const isSelected = option.id === currentTypeId
          const isRemove = option.id === "remove"

          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                themed($optionRow),
                isSelected && themed($optionRowSelected),
                pressed && themed($optionRowPressed),
              ]}
              onPress={() => handleSelect(option)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[themed($letterBadge), { borderColor: color }]}>
                <Text weight="bold" style={[themed($letterText), { color }]}>
                  {option.letter}
                </Text>
              </View>
              <Text
                weight={isSelected ? "semiBold" : "normal"}
                style={[themed($optionLabel), isRemove && { color: theme.colors.error }]}
              >
                {option.label}
              </Text>
              <Pressable
                style={$helpButton}
                accessibilityRole="button"
                accessibilityLabel={`Help for ${option.label}`}
              >
                <Text style={themed($helpIcon)}>?</Text>
              </Pressable>
            </Pressable>
          )
        })}
      </View>
    </BottomSheet>
  )
}

const $optionsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  gap: spacing.xs,
})

const $optionRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.cardSecondary,
})

const $optionRowSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary100,
  borderWidth: 1,
  borderColor: colors.tint,
})

const $optionRowPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.8,
})

const $letterBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 6,
  borderWidth: 2,
  backgroundColor: colors.card,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
})

const $letterText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "700",
})

const $optionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.text,
  fontSize: 15,
})

const $helpButton: ViewStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
  justifyContent: "center",
  alignItems: "center",
}

const $helpIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 16,
  fontWeight: "600",
})
