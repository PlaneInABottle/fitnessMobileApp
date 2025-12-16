import { useMemo } from "react"
import {
  Pressable,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import type { ExerciseCategory } from "@/models/ExerciseStore"
import type { SetData, SetTypeId } from "@/models/SetStore"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "../Text"

export type SetRowMode = "header" | "completed" | "edit"

type EditableFieldKey = "weight" | "reps" | "time" | "distance"

type FieldConfig = { key?: EditableFieldKey; label: string }

export interface SetRowProps {
  category: ExerciseCategory
  mode: SetRowMode
  value?: Partial<SetData>
  placeholders?: Partial<Record<EditableFieldKey, string>>
  touched?: Partial<Record<EditableFieldKey | "setType", boolean>>
  availableSetTypes?: Array<{ id: SetTypeId; name: string }>
  onChange?: (next: Partial<SetData>, touchedKey?: EditableFieldKey | "setType") => void
  onDone?: () => void
  doneButtonLabel?: string
  onPressSetType?: () => void
  /**
   * When false, empty numeric inputs are coerced to 0 (keeps persisted sets valid).
   * Keep true for draft/new-set entry.
   */
  allowEmptyNumbers?: boolean
  index?: number
  isDone?: boolean
  onLongPress?: () => void
}

function getFields(category: ExerciseCategory): [FieldConfig, FieldConfig] {
  switch (category) {
    case "STRENGTH":
      return [
        { key: "reps", label: "Reps" },
        { key: "weight", label: "Kg" },
      ]
    case "BODYWEIGHT":
      return [{ key: "reps", label: "Reps" }, { label: "" }]
    case "TIMED":
      return [{ key: "time", label: "Sec" }, { label: "" }]
    case "CARDIO":
      return [
        { key: "time", label: "Sec" },
        { key: "distance", label: "m" },
      ]
  }
}

function toText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function toNumberOrUndefined(text: string, allowEmpty: boolean): number | undefined {
  const trimmed = text.trim()
  if (!trimmed) return allowEmpty ? undefined : 0
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

export function SetRow({
  category,
  mode,
  value,
  placeholders,
  touched,
  availableSetTypes,
  onChange,
  onDone,
  doneButtonLabel,
  onPressSetType,
  allowEmptyNumbers = true,
  index,
  isDone,
  onLongPress,
}: SetRowProps) {
  const {
    theme: { colors, typography },
    themed,
  } = useAppTheme()

  const [field1, field2] = useMemo(() => getFields(category), [category])

  const setTypeName = useMemo(() => {
    const id = value?.setType as SetTypeId | undefined
    const found = id && availableSetTypes?.find((s) => s.id === id)
    return found?.name ?? (typeof value?.setType === "string" ? value?.setType : "")
  }, [availableSetTypes, value?.setType])

  function cycleSetType() {
    if (!onChange || !availableSetTypes?.length) return
    const current = (value?.setType as SetTypeId | undefined) ?? "working"
    const idx = availableSetTypes.findIndex((s) => s.id === current)
    const next = availableSetTypes[(idx + 1 + availableSetTypes.length) % availableSetTypes.length]
    onChange({ ...value, setType: next.id }, "setType")
  }

  function handlePressSetType() {
    if (onPressSetType) return onPressSetType()
    cycleSetType()
  }

  function renderFieldCell(field: FieldConfig) {
    if (!field.label) return <View style={$cell} />

    const key = field.key
    const current = key ? value?.[key] : undefined

    if (mode === "edit") {
      if (!key || !onChange) return <View style={$cell} />

      const isTouched = !!touched?.[key]
      const isSuggested = !isTouched && current !== undefined

      return (
        <View style={$cell}>
          <TextInput
            value={toText(current)}
            accessibilityLabel={field.label}
            placeholder={placeholders?.[key] ?? "0"}
            placeholderTextColor={colors.textDim}
            keyboardType="numeric"
            onChangeText={(t) =>
              onChange({ ...value, [key]: toNumberOrUndefined(t, allowEmptyNumbers) }, key)
            }
            style={[
              themed($input),
              isSuggested && { color: colors.textDim, fontFamily: typography.primary.medium },
              isTouched && { color: colors.text, fontFamily: typography.primary.bold },
            ]}
          />
        </View>
      )
    }

    return (
      <View style={$cell}>
        <Text text={toText(current) || "—"} style={themed($cellText)} />
      </View>
    )
  }

  const rowStyle: ThemedStyle<ViewStyle> = ({ colors }) => {
    if (isDone) {
      return {
        backgroundColor: colors.palette.success100,
        borderRadius: 6,
        paddingVertical: 6,
      }
    }
    if (mode === "completed" && typeof index === "number") {
      return {
        backgroundColor: index % 2 === 0 ? colors.palette.neutral300 : colors.palette.neutral200,
        borderRadius: 6,
        paddingVertical: 6,
      }
    }
    return {
      backgroundColor: "transparent",
      borderRadius: 6,
      paddingVertical: 6,
    }
  }

  if (mode === "header") {
    return (
      <View style={themed([$styles.row, $row, $headerRow])}>
        <View style={$cell}>
          <Text text="Type" style={themed($headerText)} />
        </View>
        <View style={$cell}>
          <Text text={field1.label} style={themed($headerText)} />
        </View>
        <View style={$cell}>
          <Text text={field2.label} style={themed($headerText)} />
        </View>
        <View style={$doneCell}>
          <Text text="Done" style={themed($headerText)} />
        </View>
      </View>
    )
  }

  const isSetTypeTouched = !!touched?.setType
  const isSetTypeSuggested = mode === "edit" && !isSetTypeTouched && !!value?.setType

  const rowContent = (
    <View style={themed([$styles.row, $row, rowStyle])}>
      <View style={$cell}>
        {mode === "edit" ? (
          <Pressable
            onPress={handlePressSetType}
            style={themed($typePill)}
            accessibilityRole="button"
            accessibilityLabel={`Set type: ${setTypeName || "Working"}`}
          >
            <Text
              text={setTypeName || "Working"}
              style={themed([
                $typeText,
                isSetTypeSuggested && (({ colors }) => ({ color: colors.textDim })),
                isSetTypeTouched && (({ typography }) => ({ fontFamily: typography.primary.bold })),
              ])}
            />
          </Pressable>
        ) : (
          <Text text={setTypeName || "—"} style={themed($cellText)} />
        )}
      </View>

      {renderFieldCell(field1)}
      {renderFieldCell(field2)}

      <View style={$doneCell}>
        {mode === "edit" ? (
          <Pressable
            onPress={onDone}
            style={[themed($doneButton), isDone && themed($doneButtonDone)]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!isDone }}
            accessibilityLabel={doneButtonLabel ?? "Done"}
          >
            <Text text="✓" style={[themed($doneText), isDone && themed($doneTextDone)]} />
          </Pressable>
        ) : (
          <Text text="✓" style={themed($completedDoneText)} />
        )}
      </View>
    </View>
  )

  if (mode === "completed" && onLongPress) {
    return (
      <Pressable onLongPress={onLongPress} delayLongPress={500} accessibilityRole="button">
        {rowContent}
      </Pressable>
    )
  }

  return rowContent
}

const $row: ViewStyle = {
  alignItems: "center",
}

const $headerRow: ViewStyle = {
  paddingVertical: 4,
}

const $cell: ViewStyle = {
  flex: 1,
  paddingHorizontal: 6,
}

const $doneCell: ViewStyle = {
  width: 52,
  alignItems: "center",
  justifyContent: "center",
}

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
})

const $cellText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 14,
})

const $input: ThemedStyle<TextStyle> = ({ colors, spacing, typography }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  borderRadius: 6,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.xs,
  backgroundColor: colors.palette.neutral100,
  color: colors.text,
  fontFamily: typography.primary.medium,
  fontSize: 14,
})

const $typePill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  borderRadius: 999,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  alignSelf: "flex-start",
})

const $typeText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.text,
  fontFamily: typography.primary.medium,
  fontSize: 13,
})

const $doneButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.tint,
})

const $doneButtonDone: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.palette.success500,
  backgroundColor: colors.palette.success200,
})

const $doneText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.tint,
  fontFamily: typography.primary.bold,
  fontSize: 18,
  lineHeight: 18,
})

const $doneTextDone: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.success500,
})

const $completedDoneText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.palette.success500,
  fontFamily: typography.primary.bold,
  fontSize: 18,
  lineHeight: 18,
})
