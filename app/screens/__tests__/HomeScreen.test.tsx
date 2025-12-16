import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { render } from "@testing-library/react-native"

import { RootStoreModel, RootStoreProvider } from "@/models"
import type { HomeStackParamList } from "@/navigators/navigationTypes"
import { HomeScreen } from "@/screens/HomeScreen"
import { ThemeProvider } from "@/theme/context"

const Stack = createNativeStackNavigator<HomeStackParamList>()

function renderHomeScreen(store = RootStoreModel.create({})) {
  const result = render(
    <RootStoreProvider value={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeTab" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </RootStoreProvider>,
  )

  return { store, ...result }
}

describe("HomeScreen", () => {
  it("renders correctly with header", () => {
    const { getByText } = renderHomeScreen()

    expect(getByText("Ev")).toBeTruthy()
  })

  it("shows welcome message", () => {
    const { getByText } = renderHomeScreen()

    expect(getByText("Hoş Geldiniz! 👋")).toBeTruthy()
    expect(getByText("Bugünkü antrenmanınıza hazır mısınız?")).toBeTruthy()
  })

  it("shows stats section with placeholders", () => {
    const { getByText } = renderHomeScreen()

    expect(getByText("Özet")).toBeTruthy()
    expect(getByText("Toplam Antrenman")).toBeTruthy()
    expect(getByText("Bu Hafta")).toBeTruthy()
    expect(getByText("Toplam Hacim")).toBeTruthy()
  })

  it("shows stat values initialized to zero", () => {
    const { getAllByText } = renderHomeScreen()

    // Multiple "0" values for stats
    const zeroValues = getAllByText("0")
    expect(zeroValues.length).toBe(2)

    // Volume shows "0 kg"
    expect(getAllByText("0 kg").length).toBe(1)
  })

  it("shows placeholder section for future features", () => {
    const { getByText } = renderHomeScreen()

    expect(getByText("Yakında daha fazla özellik eklenecek")).toBeTruthy()
  })
})
