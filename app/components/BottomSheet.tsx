import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react"
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalT,
} from "@gorhom/bottom-sheet"

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
  /** Optional snap points for the bottom sheet */
  snapPoints?: Array<string | number>
}

/**
 * Bottom sheet built on @gorhom/bottom-sheet.
 * NOTE: In tests we render a simplified version for deterministic assertions.
 */
export function BottomSheet(props: BottomSheetProps) {
  const { visible, onClose, title, children, style: $styleOverride, snapPoints: snapPointsProp } = props
  const { themed } = useAppTheme()

  const snapPoints = useMemo(() => snapPointsProp ?? ["50%"], [snapPointsProp])
  const bottomSheetRef = useRef<BottomSheetModalT>(null)

  useEffect(() => {
    if (!bottomSheetRef.current) return
    if (visible) bottomSheetRef.current.present()
    else bottomSheetRef.current.dismiss()
  }, [visible])

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        pressBehavior="close"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  )

  if (global.__TEST__) {
    if (!visible) return null
    return (
      <View style={themed($testOverlay)}>
        <Pressable testID="bottom-sheet-backdrop" style={themed($testBackdrop)} onPress={onClose} />
        <View style={[themed($testContainer), $styleOverride]}>
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
    )
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={themed($background)}
      handleIndicatorStyle={themed($handleIndicator)}
    >
      <BottomSheetView style={[themed($container), $styleOverride]}>
        {title && (
          <View style={themed($titleContainer)}>
            <Text weight="bold" size="lg" style={themed($title)}>
              {title}
            </Text>
          </View>
        )}
        <View style={$content}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const $background: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
})

const $handleIndicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral500,
})

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.lg,
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

const $testOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "flex-end",
})

const $testBackdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
  backgroundColor: colors.palette.overlay50,
})

const $testContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingBottom: spacing.lg,
  maxHeight: "90%",
})
