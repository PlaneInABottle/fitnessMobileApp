import { Modal, Pressable, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SessionDiscardModalProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SessionDiscardModal({ visible, onConfirm, onCancel }: SessionDiscardModalProps) {
  const { themed, theme } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={themed($backdrop)} onPress={onCancel}>
        <Pressable style={themed($content)} onPress={(e) => e.stopPropagation()}>
          <Text text="Discard Workout?" preset="subheading" />
          <Text text="You will lose all progress from this workout session." />
          <View style={themed($buttons)}>
            <Button
              text="Cancel"
              preset="default"
              onPress={onCancel}
              style={themed($button)}
              accessibilityLabel="Cancel and keep workout"
            />
            <Button
              text="Discard"
              preset="filled"
              onPress={onConfirm}
              style={themed($button)}
              textStyle={{ color: theme.colors.error }}
              accessibilityLabel="Confirm discard workout"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.overlay50,
  justifyContent: "center",
  alignItems: "center",
})

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 12,
  padding: spacing.lg,
  margin: spacing.lg,
  gap: spacing.md,
  maxWidth: 320,
  width: "100%",
})

const $buttons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.sm,
})

const $button: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})
