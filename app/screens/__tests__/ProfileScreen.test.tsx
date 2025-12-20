import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { ProfileStackParamList } from "@/navigators/navigationTypes"
import { ProfileScreen } from "@/screens/ProfileScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<ProfileStackParamList>()

function renderProfileScreen(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileTab" component={ProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("ProfileScreen", () => {
  it("renders correctly with header", () => {
    const { getByText } = renderProfileScreen()

    expect(getByText("Profil")).toBeTruthy()
  })

  it("shows profile placeholder with user info", () => {
    const { getByText } = renderProfileScreen()

    expect(getByText("Kullanıcı")).toBeTruthy()
    expect(getByText("kullanici@email.com")).toBeTruthy()
  })

  it("shows settings section with items", () => {
    const { getByText, getByLabelText } = renderProfileScreen()

    expect(getByText("Ayarlar")).toBeTruthy()
    expect(getByLabelText("Genel Ayarlar")).toBeTruthy()
    expect(getByLabelText("Bildirimler")).toBeTruthy()
    expect(getByLabelText("Gizlilik")).toBeTruthy()
    expect(getByLabelText("Görünüm")).toBeTruthy()
  })

  it("shows app version info", () => {
    const { getByText } = renderProfileScreen()

    expect(getByText("Fitness App v1.0.0")).toBeTruthy()
  })
})
