import { useEffect, useMemo, useState } from "react"
import { AppState, Pressable, TextStyle, Vibration, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface RestTimerBarProps {
  endsAt?: Date
  onAddThirty: () => void
  onSkip: () => void
  onExpire: () => boolean
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, "0")}`
}

export function RestTimerBar(props: RestTimerBarProps) {
  return <RestTimerClock key={props.endsAt?.getTime() ?? "no-deadline"} {...props} />
}

function RestTimerClock({ endsAt, onAddThirty, onSkip, onExpire }: RestTimerBarProps) {
  const { themed } = useAppTheme()
  const endMs = endsAt?.getTime()
  // This clock sample seeds an absolute-deadline countdown; subsequent reads happen in subscriptions.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (endMs === undefined) return

    const interval = setInterval(() => {
      const currentNow = Date.now()
      setNow(currentNow)
      if (currentNow >= endMs) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [endMs])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now())
    })
    return () => subscription.remove()
  }, [])

  const remainingSeconds = useMemo(
    () => (endMs === undefined ? 0 : Math.max(0, Math.ceil((endMs - now) / 1000))),
    [endMs, now],
  )
  const isComplete = endMs !== undefined && now >= endMs

  useEffect(() => {
    if (isComplete && onExpire()) Vibration.vibrate(200)
  }, [isComplete, onExpire])

  if (endMs === undefined) return null

  return (
    <View style={themed($container)} accessibilityRole="timer">
      <View style={$status}>
        <Text
          text={isComplete ? "✓ Rest complete" : "Rest timer"}
          weight="semiBold"
          size="sm"
          style={themed($label)}
          accessibilityLiveRegion="polite"
        />
        <Text
          text={isComplete ? "Ready" : formatRemaining(remainingSeconds)}
          weight="bold"
          size="lg"
          style={themed($time)}
          accessibilityLabel={
            isComplete ? "Rest complete" : `${remainingSeconds} seconds rest remaining`
          }
        />
      </View>
      <View style={$actions}>
        <Pressable
          onPress={onAddThirty}
          accessibilityRole="button"
          accessibilityLabel="Add 30 seconds to rest timer"
          style={themed($action)}
        >
          <Text
            text="+30"
            weight="semiBold"
            size="xs"
            numberOfLines={1}
            style={themed($actionText)}
          />
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={isComplete ? "Dismiss rest timer" : "Skip rest timer"}
          style={themed($action)}
        >
          <Text
            text={isComplete ? "Dismiss" : "Skip"}
            weight="semiBold"
            size="xs"
            numberOfLines={1}
            style={themed($actionText)}
          />
        </Pressable>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minHeight: 64,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  backgroundColor: colors.card,
})
const $status: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 1,
  gap: 12,
}

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })

const $time: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.tint })

const $actions: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }

const $action: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minWidth: 52,
  minHeight: 44,
  paddingHorizontal: 12,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.cardSecondary,
})

const $actionText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
