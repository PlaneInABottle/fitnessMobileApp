import { useEffect, useMemo, useRef, useState } from "react"
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

import { SetTypeIndicator, SetType } from "../SetTypeIndicator"
import { Text } from "../Text"

export type SetRowMode = "header" | "completed" | "edit"

type EditableFieldKey = "weight" | "reps" | "time" | "distance"

type FieldConfig = { key?: EditableFieldKey; label: string; header?: string }

export interface SetRowProps {
  category: ExerciseCategory
  mode: SetRowMode
  value?: Partial<SetData>
  /** Previous workout data for reference */
  previousValue?: { weight?: number; reps?: number; time?: number; distance?: number }
  placeholders?: Partial<Record<EditableFieldKey, string>>
  touched?: Partial<Record<EditableFieldKey | "setType", boolean>>
  availableSetTypes?: Array<{ id: SetTypeId; name: string; letter?: string }>
  onChange?: (next: Partial<SetData>, touchedKey?: EditableFieldKey | "setType") => void
  onDone?: (completionPatch?: Partial<SetData>) => void
  doneButtonLabel?: string
  onPressSetType?: () => void
  /**
   * When false, empty numeric inputs are coerced to 0 (keeps persisted sets valid).
   * Keep true for draft/new-set entry.
   */
  allowEmptyNumbers?: boolean
  /** 1-based set index for display (working sets only) */
  index?: number
  /** 0-based row index for styling (all set types) */
  rowIndex?: number
  /** Exercise context used by screen readers. */
  exerciseName?: string
  /** 1-based set number used by screen readers. */
  setNumber?: number
  isDone?: boolean
  onLongPress?: () => void
}

function getFields(category: ExerciseCategory): [FieldConfig, FieldConfig] {
  switch (category) {
    case "STRENGTH":
      return [
        { key: "weight", label: "Kg", header: "KG" },
        { key: "reps", label: "Reps", header: "REPS" },
      ]
    case "BODYWEIGHT":
      return [
        { key: "reps", label: "Reps", header: "REPS" },
        { label: "", header: "" },
      ]
    case "TIMED":
      return [
        { key: "time", label: "Sec", header: "TIME" },
        { label: "", header: "" },
      ]
    case "CARDIO":
      return [
        { key: "time", label: "Sec", header: "TIME" },
        { key: "distance", label: "m", header: "DISTANCE" },
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
  previousValue,
  placeholders,
  touched,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  availableSetTypes: _availableSetTypes,
  onChange,
  onDone,
  doneButtonLabel,
  onPressSetType,
  allowEmptyNumbers = true,
  index,
  rowIndex,
  exerciseName,
  setNumber,
  isDone,
  onLongPress,
}: SetRowProps) {
  const {
    theme: { colors, typography },
    themed,
  } = useAppTheme()

  const [field1, field2] = useMemo(() => getFields(category), [category])
  const [localTouched, setLocalTouched] = useState<Partial<Record<EditableFieldKey, boolean>>>({})
  const [draftText, setDraftText] = useState<Partial<Record<EditableFieldKey, string>>>({})
  const [focusedField, setFocusedField] = useState<EditableFieldKey | null>(null)
  const inputRefs = useRef<Partial<Record<EditableFieldKey, TextInput | null>>>({})

  // Track set type to detect when set type changes (need to reset state)
  const prevSetTypeRef = useRef(value?.setType)

  useEffect(() => {
    // Only reset state when set type changes, not on every value change
    if (prevSetTypeRef.current !== value?.setType) {
      prevSetTypeRef.current = value?.setType
      setLocalTouched({})
      setDraftText({})
      setFocusedField(null)
    }
  }, [value?.setType])

  const setTypeId = (value?.setType as SetTypeId | undefined) ?? "working"

  /** Format previous value for display */
  function formatPrevious(): string {
    if (!previousValue) return "-"
    if (category === "STRENGTH") {
      const w = previousValue.weight ?? 0
      const r = previousValue.reps ?? 0
      return `${w} × ${r}`
    }
    if (category === "BODYWEIGHT") {
      return `${previousValue.reps ?? 0}`
    }
    if (category === "TIMED") {
      return `${previousValue.time ?? 0}s`
    }
    if (category === "CARDIO") {
      return `${previousValue.time ?? 0}s · ${previousValue.distance ?? 0}m`
    }
    return "-"
  }

  function getFieldAccessibilityLabel(field: FieldConfig): string {
    if (!exerciseName || !setNumber || !field.key) return field.label

    const fieldName: Record<EditableFieldKey, string> = {
      weight: "weight in kilograms",
      reps: "repetitions",
      time: "time in seconds",
      distance: "distance in meters",
    }
    return `${exerciseName}, set ${setNumber}, ${fieldName[field.key]}`
  }

  function handlePressSetType() {
    if (onPressSetType) return onPressSetType()
  }

  function handlePressDone() {
    if (mode !== "edit" || !onDone) return

    // Only convert placeholder -> actual values when marking a set as done.
    let completionPatch: Partial<SetData> | undefined
    if (!isDone && onChange && placeholders) {
      const keys = [field1.key, field2.key].filter(Boolean) as EditableFieldKey[]

      let didPatch = false
      const next: Partial<SetData> = { ...(value ?? {}) }

      keys.forEach((k) => {
        const placeholder = placeholders[k]
        if (placeholder === undefined) return

        const n = Number(String(placeholder).trim())
        if (!Number.isFinite(n)) return

        const current = (value as any)?.[k] as number | undefined
        const isTouched = !!touched?.[k] || !!localTouched[k]
        const isZeroOrUndefined = current === 0 || current === undefined

        if (!isTouched && isZeroOrUndefined) {
          ;(next as any)[k] = n
          didPatch = true
        }
      })

      if (didPatch) completionPatch = next
    }

    onDone(completionPatch)
  }

  function renderFieldCell(field: FieldConfig) {
    if (!field.label) return <View style={$cell} />

    const key = field.key
    const current = key ? value?.[key] : undefined

    if (mode === "edit") {
      if (!key || !onChange) return <View style={$cell} />

      const isTouched = !!touched?.[key] || !!localTouched[key]
      const isKgOrReps = key === "weight" || key === "reps"
      const nextFieldKey = key === field1.key ? field2.key : undefined
      const normalizedCurrent =
        typeof current === "number" && Number.isFinite(current) ? current : undefined
      const isZeroOrUndefined = normalizedCurrent === 0 || normalizedCurrent === undefined

      const shouldForceDoneZero = !!isDone && isKgOrReps && !isTouched && isZeroOrUndefined

      const shouldShowPlaceholder = !shouldForceDoneZero && !isTouched && isZeroOrUndefined

      const inputValue = shouldShowPlaceholder
        ? ""
        : shouldForceDoneZero
          ? "0"
          : toText(normalizedCurrent)

      const displayValue = focusedField === key ? (draftText[key] ?? "") : inputValue

      const hasEnteredValue = isKgOrReps
        ? shouldForceDoneZero ||
          (isTouched
            ? inputValue !== ""
            : !shouldShowPlaceholder && normalizedCurrent !== undefined && normalizedCurrent !== 0)
        : false
      const isSuggested = !isTouched && current !== undefined

      return (
        <View style={$cell}>
          <TextInput
            ref={(input) => {
              inputRefs.current[key] = input
            }}
            value={displayValue}
            accessibilityLabel={getFieldAccessibilityLabel(field)}
            placeholder={placeholders?.[key] ?? "0"}
            placeholderTextColor={colors.textDim}
            keyboardType="numeric"
            returnKeyType={nextFieldKey ? "next" : "done"}
            blurOnSubmit={!nextFieldKey}
            underlineColorAndroid="transparent"
            onFocus={() => {
              setFocusedField(key)
              setDraftText((prev) => ({ ...prev, [key]: inputValue }))
            }}
            onChangeText={(t) => {
              setLocalTouched((prev) => ({ ...prev, [key]: true }))
              setDraftText((prev) => ({ ...prev, [key]: t }))

              if (!t.trim()) return

              const parsed = toNumberOrUndefined(t, true)
              if (parsed === undefined) return

              onChange({ ...value, [key]: parsed }, key)
            }}
            onBlur={() => {
              const t = (draftText[key] ?? "").trim()

              if (!t) {
                onChange({ ...value, [key]: allowEmptyNumbers ? undefined : 0 }, key)
              } else {
                const parsed = toNumberOrUndefined(t, true)
                if (parsed !== undefined) onChange({ ...value, [key]: parsed }, key)
              }

              setFocusedField((prev) => (prev === key ? null : prev))
              setDraftText((prev) => ({ ...prev, [key]: undefined }))
            }}
            onSubmitEditing={() => {
              if (nextFieldKey) inputRefs.current[nextFieldKey]?.focus()
            }}
            style={[
              themed($input),
              isKgOrReps &&
                !hasEnteredValue && {
                  color: colors.textDim,
                  fontFamily: typography.primary.medium,
                },
              isKgOrReps &&
                hasEnteredValue && { color: colors.text, fontFamily: typography.primary.bold },
              !isKgOrReps &&
                isSuggested && { color: colors.textDim, fontFamily: typography.primary.medium },
              !isKgOrReps &&
                isTouched && { color: colors.text, fontFamily: typography.primary.bold },
              shouldForceDoneZero && { color: colors.text, fontFamily: typography.primary.bold },
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

  const rowStyle: ThemedStyle<ViewStyle> = ({ colors, isDark }) => {
    const base = {
      paddingVertical: 10,
    }

    if (isDone) {
      return {
        ...base,
        backgroundColor: colors.successBackground,
      }
    }

    const evenBg = isDark ? colors.palette.neutral100 : colors.card
    const oddBg = isDark ? colors.palette.neutral200 : colors.cardSecondary

    if (typeof rowIndex === "number") {
      return {
        ...base,
        backgroundColor: rowIndex % 2 === 0 ? evenBg : oddBg,
      }
    }

    if (mode === "completed" && typeof index === "number") {
      return {
        ...base,
        backgroundColor: index % 2 === 0 ? evenBg : oddBg,
      }
    }

    return {
      ...base,
      backgroundColor: "transparent",
    }
  }

  if (mode === "header") {
    return (
      <View style={themed([$styles.row, $row, $headerRow])}>
        <View style={$setTypeCell}>
          <Text text="SET" size="xxs" weight="semiBold" style={themed($headerText)} />
        </View>
        <View style={$previousCell}>
          <Text text="LAST" size="xxs" weight="semiBold" style={themed($headerText)} />
        </View>
        <View style={$cell}>
          <Text
            text={field1.header || field1.label}
            size="xxs"
            weight="semiBold"
            style={themed($headerText)}
          />
        </View>
        {field2.label ? (
          <View style={$cell}>
            <Text
              text={field2.header || field2.label}
              size="xxs"
              weight="semiBold"
              style={themed($headerText)}
            />
          </View>
        ) : null}
        <View style={$doneCell}>
          <Text text="✓" size="xxs" weight="semiBold" style={themed($headerText)} />
        </View>
      </View>
    )
  }

  const rowContent = (
    <View style={themed([$styles.row, $row, rowStyle])}>
      {/* Set Type Indicator */}
      <View style={$setTypeCell}>
        <Pressable
          onPress={handlePressSetType}
          style={$setTypeButton}
          accessibilityRole="button"
          accessibilityLabel={
            exerciseName && setNumber
              ? `Set type for ${exerciseName}, set ${setNumber}: ${setTypeId}`
              : `Set type: ${setTypeId}`
          }
        >
          <SetTypeIndicator
            type={setTypeId as SetType}
            index={setTypeId === "working" ? index : undefined}
          />
        </Pressable>
      </View>

      {/* Previous Value */}
      <View style={$previousCell}>
        <Text text={formatPrevious()} size="xxs" style={themed($previousText)} numberOfLines={1} />
      </View>

      {/* Field 1 (Weight/Time) */}
      {renderFieldCell(field1)}

      {/* Field 2 (Reps/Distance) */}
      {field2.label ? renderFieldCell(field2) : null}

      {/* Done Checkmark */}
      <View style={$doneCell}>
        <Pressable
          onPress={handlePressDone}
          style={$doneButtonHitArea}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!isDone }}
          accessibilityLabel={
            doneButtonLabel ??
            (exerciseName && setNumber
              ? `Mark ${exerciseName}, set ${setNumber} ${isDone ? "incomplete" : "complete"}`
              : "Done")
          }
        >
          {({ pressed }) => (
            <View
              style={[
                themed($doneButton),
                isDone && themed($doneButtonDone),
                pressed && themed($doneButtonPressed),
              ]}
            >
              <Text
                text="✓"
                size="xs"
                weight="semiBold"
                style={[themed($doneText), isDone && themed($doneTextDone)]}
              />
            </View>
          )}
        </Pressable>
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
  paddingHorizontal: 16,
}

const $headerRow: ViewStyle = {
  paddingVertical: 4,
  marginBottom: 0,
}

const $setTypeCell: ViewStyle = {
  width: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $setTypeButton: ViewStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $previousCell: ViewStyle = {
  flex: 0.8,
  paddingHorizontal: 4,
}

const $cell: ViewStyle = {
  flex: 1,
  paddingHorizontal: 4,
}

const $doneCell: ViewStyle = {
  width: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $cellText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $previousText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $input: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  height: 44,
  borderWidth: 0,
  borderRadius: 6,
  paddingVertical: 0,
  paddingHorizontal: 0,
  backgroundColor: "transparent",
  color: colors.text,
  fontFamily: typography.primary.medium,
  fontSize: 14,
  textAlign: "center",
})

const $doneButtonHitArea: ViewStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $doneButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: colors.cardSecondary,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.cardSecondary,
})

const $doneButtonDone: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.success,
  backgroundColor: colors.success,
})

const $doneButtonPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.72,
})

const $doneText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
})

const $doneTextDone: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
})
