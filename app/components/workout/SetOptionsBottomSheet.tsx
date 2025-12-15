import { useEffect, useRef } from "react"
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SetOptionsBottomSheetProps {
  visible: boolean
  onClose: () => void
  onDelete: () => void
  onChangeType: () => void
  setTypeName: string
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

export function SetOptionsBottomSheet({
  visible,
  onClose,
  onDelete,
  onChangeType,
  setTypeName,
}: SetOptionsBottomSheetProps) {
  const { themed, theme } = useAppTheme()
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start()
    } else {
      slideAnim.setValue(SCREEN_HEIGHT)
    }
  }, [visible, slideAnim])

  function handleClose(afterClose?: () => void) {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose()
      if (typeof afterClose === "function") {
        afterClose()
      }
    })
  }

  function handleDelete() {
    handleClose(onDelete)
  }

  function handleChangeType() {
    handleClose(onChangeType)
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable testID="backdrop" style={themed($backdrop)} onPress={handleClose}>
        <Animated.View
          style={[themed($sheet), { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={$handle} />

          <Pressable
            style={themed($option)}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete set"
          >
            <Text text="Delete Set" style={[themed($optionText), { color: theme.colors.error }]} />
          </Pressable>

          <Pressable
            style={themed($option)}
            onPress={handleChangeType}
            accessibilityRole="button"
            accessibilityLabel={`Change set type, currently ${setTypeName}`}
          >
            <Text text={`Change Type (${setTypeName})`} style={themed($optionText)} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.overlay50,
  justifyContent: "flex-end",
})

const $sheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: spacing.lg,
  paddingBottom: spacing.xl,
  gap: spacing.md,
})

const $handle: ViewStyle = {
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: "#978F8A",
  alignSelf: "center",
  marginBottom: 8,
}

const $option: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral300,
})

const $optionText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.text,
  fontFamily: typography.primary.medium,
  fontSize: 16,
  textAlign: "center",
})
