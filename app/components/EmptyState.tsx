import { Image, ImageProps, ImageStyle, StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button, ButtonProps } from "./Button"
import { Icon, IconTypes } from "./Icon"
import { Text, TextProps } from "./Text"

const sadFace = require("@assets/images/sad-face.png")

interface EmptyStateProps {
  /**
   * An optional prop that specifies the text/image set to use for the empty state.
   * "generic" - default sad face
   * "workout" - dumbbell icon for workout-related empty states
   */
  preset?: "generic" | "workout"
  /**
   * Optional icon to display instead of image (takes precedence over imageSource)
   */
  icon?: IconTypes
  /**
   * Style override for the container.
   */
  style?: StyleProp<ViewStyle>
  /**
   * An Image source to be displayed above the heading.
   */
  imageSource?: ImageProps["source"]
  /**
   * Style overrides for image.
   */
  imageStyle?: StyleProp<ImageStyle>
  /**
   * Pass any additional props directly to the Image component.
   */
  ImageProps?: Omit<ImageProps, "source">
  /**
   * The heading text to display if not using `headingTx`.
   */
  heading?: TextProps["text"]
  /**
   * Heading text which is looked up via i18n.
   */
  headingTx?: TextProps["tx"]
  /**
   * Optional heading options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  headingTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for heading text.
   */
  headingStyle?: StyleProp<TextStyle>
  /**
   * Pass any additional props directly to the heading Text component.
   */
  HeadingTextProps?: TextProps
  /**
   * The content text to display if not using `contentTx`.
   */
  content?: TextProps["text"]
  /**
   * Content text which is looked up via i18n.
   */
  contentTx?: TextProps["tx"]
  /**
   * Optional content options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  contentTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for content text.
   */
  contentStyle?: StyleProp<TextStyle>
  /**
   * Pass any additional props directly to the content Text component.
   */
  ContentTextProps?: TextProps
  /**
   * The button text to display if not using `buttonTx`.
   */
  button?: TextProps["text"]
  /**
   * Button text which is looked up via i18n.
   */
  buttonTx?: TextProps["tx"]
  /**
   * Optional button options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  buttonTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for button.
   */
  buttonStyle?: ButtonProps["style"]
  /**
   * Style overrides for button text.
   */
  buttonTextStyle?: ButtonProps["textStyle"]
  /**
   * Called when the button is pressed.
   */
  buttonOnPress?: ButtonProps["onPress"]
  /**
   * Pass any additional props directly to the Button component.
   */
  ButtonProps?: ButtonProps
}

interface EmptyStatePresetItem {
  imageSource?: ImageProps["source"]
  icon?: IconTypes
  heading: TextProps["text"]
  content: TextProps["text"]
  button: TextProps["text"]
}

/**
 * A component to use when there is no data to display. It can be utilized to direct the user what to do next.
 * Supports presets: "generic" (sad face), "workout" (dumbbell icon)
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/EmptyState/}
 * @param {EmptyStateProps} props - The props for the `EmptyState` component.
 * @returns {JSX.Element} The rendered `EmptyState` component.
 */
export function EmptyState(props: EmptyStateProps) {
  const {
    theme,
    themed,
    theme: { spacing },
  } = useAppTheme()

  const EmptyStatePresets: Record<string, EmptyStatePresetItem> = {
    generic: {
      imageSource: sadFace,
      heading: translate("emptyStateComponent:generic.heading"),
      content: translate("emptyStateComponent:generic.content"),
      button: translate("emptyStateComponent:generic.button"),
    },
    workout: {
      icon: "dumbbell",
      heading: "Henüz Antrenman Yok",
      content: "İlk antrenmanını başlat ve ilerlemeni takip et",
      button: "Antrenman Başlat",
    },
  }

  const preset = EmptyStatePresets[props.preset ?? "generic"]

  const {
    icon = preset.icon,
    button = preset.button,
    buttonTx,
    buttonOnPress,
    buttonTxOptions,
    content = preset.content,
    contentTx,
    contentTxOptions,
    heading = preset.heading,
    headingTx,
    headingTxOptions,
    imageSource = preset.imageSource,
    style: $containerStyleOverride,
    buttonStyle: $buttonStyleOverride,
    buttonTextStyle: $buttonTextStyleOverride,
    contentStyle: $contentStyleOverride,
    headingStyle: $headingStyleOverride,
    imageStyle: $imageStyleOverride,
    ButtonProps,
    ContentTextProps,
    HeadingTextProps,
    ImageProps,
  } = props

  const isIconPresent = !!icon
  const isImagePresent = !isIconPresent && !!imageSource
  const isHeadingPresent = !!(heading || headingTx)
  const isContentPresent = !!(content || contentTx)
  const isButtonPresent = !!(button || buttonTx)

  const $containerStyles = [themed($container), $containerStyleOverride]
  const $imageStyles = [
    $image,
    (isHeadingPresent || isContentPresent || isButtonPresent) && { marginBottom: spacing.md },
    $imageStyleOverride,
    ImageProps?.style,
  ]
  const $headingStyles = [
    themed($heading),
    (isImagePresent || isIconPresent) && { marginTop: spacing.sm },
    (isContentPresent || isButtonPresent) && { marginBottom: spacing.xs },
    $headingStyleOverride,
    HeadingTextProps?.style,
  ]
  const $contentStyles = [
    themed($content),
    (isImagePresent || isHeadingPresent || isIconPresent) && { marginTop: spacing.xs },
    isButtonPresent && { marginBottom: spacing.xs },
    $contentStyleOverride,
    ContentTextProps?.style,
  ]
  const $buttonStyles = [
    (isImagePresent || isHeadingPresent || isContentPresent || isIconPresent) && {
      marginTop: spacing.lg,
    },
    $buttonStyleOverride,
    ButtonProps?.style,
  ]

  return (
    <View style={$containerStyles}>
      {isIconPresent && (
        <View style={themed($iconContainer)}>
          <Icon icon={icon} size={48} color={theme.colors.textDim} />
        </View>
      )}

      {isImagePresent && (
        <Image
          source={imageSource}
          {...ImageProps}
          style={$imageStyles}
          tintColor={theme.colors.textDim}
        />
      )}

      {isHeadingPresent && (
        <Text
          preset="subheading"
          text={heading}
          tx={headingTx}
          txOptions={headingTxOptions}
          {...HeadingTextProps}
          style={$headingStyles}
        />
      )}

      {isContentPresent && (
        <Text
          text={content}
          tx={contentTx}
          txOptions={contentTxOptions}
          {...ContentTextProps}
          style={$contentStyles}
        />
      )}

      {isButtonPresent && (
        <Button
          onPress={buttonOnPress}
          text={button}
          tx={buttonTx}
          txOptions={buttonTxOptions}
          textStyle={$buttonTextStyleOverride}
          preset="filled"
          {...ButtonProps}
          style={$buttonStyles}
        />
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.cardSecondary,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.md,
})

const $image: ImageStyle = { alignSelf: "center" }
const $heading: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  paddingHorizontal: spacing.lg,
  color: colors.text,
})
const $content: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  paddingHorizontal: spacing.lg,
  color: colors.textDim,
})
