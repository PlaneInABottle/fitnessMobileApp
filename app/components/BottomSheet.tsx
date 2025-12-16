import { ReactNode } from "react"
import { Modal, Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface BottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean
  /** Callback when the sheet is closed */
  onClose: () => void
  /** Optional title displayed at the top */
  title?: string
  /** Content to display inside the sheet */
  children: ReactNode
  /** Optional style override for the content container */
  style?: StyleProp<ViewStyle>
}

/**
 * A reusable bottom sheet modal component with slide up animation,
 * handle indicator, and backdrop overlay.
 */
export function BottomSheet(props: BottomSheetProps) {
  const { visible, onClose, title, children, style: $styleOverride } = props
  const { themed } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={themed($overlay)}>
        <Pressable style={themed($backdrop)} onPress={onClose} />
        <View style={[themed($container), $styleOverride]}>
          <View style={$handleContainer}>
            <View style={themed($handle)} />
          </View>
          {title && (
            <View style={themed($titleContainer)}>
              <Text weight="bold" size="lg" style={themed($title)}>
                {title}
              </Text>
            </View>
          )}
          <View style={$content}>{children}</View>
        </View>
      </View>
    </Modal>
  )
}

const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "flex-end",
})

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  ...StyleSheet.absoluteFillObject,
  backgroundColor: colors.palette.overlay50,
})

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingBottom: spacing.lg,
  maxHeight: "90%",
})

const $handleContainer: ViewStyle = {
  alignItems: "center",
  paddingTop: 12,
  paddingBottom: 8,
}

const $handle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 5,
  borderRadius: 2.5,
  backgroundColor: colors.palette.neutral500,
})

const $titleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.1)",
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  textAlign: "center",
})

const $content: ViewStyle = {
  paddingTop: 8,
}
