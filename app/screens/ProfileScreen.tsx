import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"

import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface SettingsItemProps {
  icon: "settings" | "bell" | "lock" | "view"
  label: string
  onPress?: () => void
}

function SettingsItem({ icon, label, onPress }: SettingsItemProps) {
  const { themed, theme } = useAppTheme()

  return (
    <Pressable
      style={themed($settingsItem)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={$settingsItemLeft}>
        <Icon icon={icon} size={20} color={theme.colors.textDim} />
        <Text size="md" style={themed($settingsItemText)}>
          {label}
        </Text>
      </View>
      <Icon icon="caretRight" size={16} color={theme.colors.textDim} />
    </Pressable>
  )
}

export const ProfileScreen: FC<ProfileStackScreenProps<"ProfileTab">> = observer(
  function ProfileScreen() {
    const { themed, theme } = useAppTheme()

    return (
      <Screen preset="scroll" safeAreaEdges={["top"]}>
        {/* Header */}
        <View style={themed($header)}>
          <Text preset="heading" style={themed($headerTitle)}>
            Profil
          </Text>
        </View>

        {/* Content */}
        <View style={themed($content)}>
          {/* Avatar and User Info */}
          <View style={themed($userSection)}>
            <View style={themed($avatar)}>
              <Icon icon="person" size={40} color={theme.colors.textDim} />
            </View>
            <Text weight="bold" size="xl" style={themed($userName)}>
              Kullanıcı
            </Text>
            <Text size="sm" style={themed($userEmail)}>
              kullanici@email.com
            </Text>
          </View>

          {/* Settings List */}
          <View style={themed($settingsSection)}>
            <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
              Ayarlar
            </Text>

            <View style={themed($settingsCard)}>
              <SettingsItem icon="settings" label="Genel Ayarlar" onPress={() => {}} />
              <SettingsItem icon="bell" label="Bildirimler" onPress={() => {}} />
              <SettingsItem icon="lock" label="Gizlilik" onPress={() => {}} />
              <SettingsItem icon="view" label="Görünüm" onPress={() => {}} />
            </View>
          </View>

          {/* App Info */}
          <View style={themed($infoSection)}>
            <Text size="sm" style={themed($infoText)}>
              Fitness App v1.0.0
            </Text>
          </View>
        </View>
      </Screen>
    )
  },
)

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
  padding: spacing.md,
  gap: spacing.lg,
})

const $userSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
  paddingVertical: spacing.lg,
})

const $avatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.card,
  alignItems: "center",
  justifyContent: "center",
})

const $userName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $userEmail: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $settingsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $settingsCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  overflow: "hidden",
})

const $settingsItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $settingsItemLeft: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $settingsItemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $infoSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.lg,
})

const $infoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
