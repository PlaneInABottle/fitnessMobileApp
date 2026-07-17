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
    <View style={[themed($container), $styleOverride]}>
      <Pressable
        style={({ pressed }) => [themed($mainAction), pressed && themed($containerPressed)]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}${hasVideo ? ". Video demonstration available" : ""}`}
      >
        <View style={themed($thumbnail)}>
          <Ionicons name="barbell-outline" size={24} color={theme.colors.textDim} />
          {imageSource ? (
            <Image
              source={imageSource}
              style={$thumbnailImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              recyclingKey={`${title}:${String(imageSource)}`}
            />
          ) : null}
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
      </Pressable>
      {onAdd && (
        <Pressable
          onPress={onAdd}
          style={themed($addButton)}
          accessibilityRole="button"
          accessibilityLabel={`${actionIcon === "add" ? "Add" : "Remove"} ${title}`}
        >
          <View style={themed($addIconContainer)}>
            <Ionicons name={actionIcon === "add" ? "add" : "remove"} size={22} color="#FFFFFF" />
          </View>
        </Pressable>
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  height: 72,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomColor: colors.separator,
  borderBottomWidth: 1,
})

const $mainAction: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  flex: 1,
  flexDirection: "row",
  minWidth: 0,
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
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
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
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 44,
  marginLeft: spacing.xs,
})

const $addIconContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
})
