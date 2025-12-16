import { Image, ImageStyle, Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Icon } from "./Icon"
import { Text } from "./Text"

export interface ExerciseListItemProps {
  /** Title/name of the exercise */
  title: string
  /** Subtitle - typically muscle group */
  subtitle: string
  /** Optional image URL for the exercise thumbnail */
  imageUrl?: string
  /** Callback when the row is pressed */
  onPress?: () => void
  /** Optional callback for the add button */
  onAdd?: () => void
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * List item component for displaying exercises in the exercise library.
 * Shows thumbnail, title, subtitle, and optional add button.
 */
export function ExerciseListItem(props: ExerciseListItemProps) {
  const { title, subtitle, imageUrl, onPress, onAdd, style: $styleOverride } = props
  const { themed, theme } = useAppTheme()

  return (
    <Pressable
      style={({ pressed }) => [
        themed($container),
        pressed && themed($containerPressed),
        $styleOverride,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={themed($thumbnail)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={$thumbnailImage} />
        ) : (
          <Icon icon="ladybug" size={24} color={theme.colors.textDim} />
        )}
      </View>
      <View style={$content}>
        <Text weight="medium" size="sm" style={themed($title)} numberOfLines={1}>
          {title}
        </Text>
        <Text size="xs" style={themed($subtitle)} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {onAdd && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onAdd()
          }}
          style={themed($addButton)}
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
        >
          <View style={themed($addIconContainer)}>
            <Text style={themed($addIcon)}>+</Text>
          </View>
        </Pressable>
      )}
    </Pressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
})

const $containerPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.cardSecondary,
})

const $thumbnail: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.cardSecondary,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
})

const $thumbnailImage: ImageStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
}

const $content: ViewStyle = {
  flex: 1,
  justifyContent: "center",
}

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 2,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $addButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
})

const $addIconContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
})

const $addIcon: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "600",
  lineHeight: 22,
})
