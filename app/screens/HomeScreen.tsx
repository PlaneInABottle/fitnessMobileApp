import { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { HomeStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const HomeScreen: FC<HomeStackScreenProps<"HomeTab">> = observer(function HomeScreen() {
  const { themed, theme } = useAppTheme()

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      {/* Header */}
      <View style={themed($header)}>
        <Text preset="heading" style={themed($headerTitle)}>
          Ev
        </Text>
      </View>

      {/* Content */}
      <View style={themed($content)}>
        {/* Welcome Section */}
        <View style={themed($welcomeSection)}>
          <Text preset="subheading" style={themed($welcomeText)}>
            Hoş Geldiniz! 👋
          </Text>
          <Text style={themed($subtitleText)}>Bugünkü antrenmanınıza hazır mısınız?</Text>
        </View>

        {/* Quick Stats Placeholder */}
        <View style={themed($statsContainer)}>
          <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
            Özet
          </Text>

          <View style={themed($statsGrid)}>
            <View style={themed($statCard)}>
              <Icon icon="more" size={24} color={theme.colors.tint} />
              <Text weight="bold" size="xl" style={themed($statValue)}>
                0
              </Text>
              <Text size="sm" style={themed($statLabel)}>
                Toplam Antrenman
              </Text>
            </View>

            <View style={themed($statCard)}>
              <Icon icon="bell" size={24} color={theme.colors.success} />
              <Text weight="bold" size="xl" style={themed($statValue)}>
                0
              </Text>
              <Text size="sm" style={themed($statLabel)}>
                Bu Hafta
              </Text>
            </View>

            <View style={themed($statCard)}>
              <Icon icon="check" size={24} color={theme.colors.warning} />
              <Text weight="bold" size="xl" style={themed($statValue)}>
                0 kg
              </Text>
              <Text size="sm" style={themed($statLabel)}>
                Toplam Hacim
              </Text>
            </View>
          </View>
        </View>

        {/* Placeholder for future content */}
        <View style={themed($placeholderSection)}>
          <Icon icon="home" size={48} color={theme.colors.textDim} />
          <Text style={themed($placeholderText)}>Yakında daha fazla özellik eklenecek</Text>
        </View>
      </View>
    </Screen>
  )
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
  gap: spacing.lg,
})

const $welcomeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $welcomeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $subtitleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $statsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $statsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $statCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  alignItems: "center",
  gap: spacing.xs,
})

const $statValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $placeholderSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.md,
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.xl,
})

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})
