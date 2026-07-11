import { ImageStyle, Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface ExerciseListItemProps {
  /** Title/name of the exercise */
  title: string
  /** Subtitle - typically muscle group */
  subtitle: string
  /** Local asset module or remote URL for the exercise thumbnail. */
  imageSource?: number | string
  /** Whether a motion demonstration is available. */
  hasVideo?: boolean
  /** Callback when the row is pressed */
  onPress?: () => void
  /** Optional callback for the add button */
  onAdd?: () => void
  /** Icon for the trailing action. */
  actionIcon?: "add" | "remove"
  /** Optional style override */
  style?: StyleProp<ViewStyle>
}

/**
 * List item component for displaying exercises in the exercise library.
 * Shows thumbnail, title, subtitle, and optional add button.
 */
export function ExerciseListItem(props: ExerciseListItemProps) {
  const {
    title,
    subtitle,
    imageSource,
    hasVideo = false,
    onPress,
    onAdd,
    actionIcon = "add",
    style: $styleOverride,
  } = props
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
      accessibilityLabel={`${title}. ${subtitle}${hasVideo ? ". Video demonstration available" : ""}`}
    >
      <View style={themed($thumbnail)}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={$thumbnailImage}
            contentFit="contain"
            transition={120}
          />
        ) : (
          <Ionicons name="barbell-outline" size={24} color={theme.colors.textDim} />
        )}
        {hasVideo ? (
          <View style={themed($videoBadge)}>
            <Ionicons name="play" size={10} color={theme.colors.palette.neutral100} />
          </View>
        ) : null}
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
          onPress={() => onAdd()}
          style={themed($addButton)}
          accessibilityRole="button"
          accessibilityLabel={`${actionIcon === "add" ? "Add" : "Remove"} ${title}`}
        >
          <View style={themed($addIconContainer)}>
            <Ionicons name={actionIcon === "add" ? "add" : "remove"} size={22} color="#FFFFFF" />
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
  width: 56,
  height: 56,
  borderRadius: 6,
  backgroundColor: colors.cardSecondary,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
  overflow: "hidden",
})

const $videoBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  backgroundColor: colors.tint,
  borderRadius: 8,
  bottom: 4,
  height: 20,
  justifyContent: "center",
  position: "absolute",
  right: 4,
  width: 20,
})

const $thumbnailImage: ImageStyle = {
  width: 56,
  height: 56,
  borderRadius: 6,
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
