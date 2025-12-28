# Navigator Setup Patterns

This document details the configuration and setup of navigators in the Fitness Tracker App.

## App Stack Navigator (Native Stack)

The `AppStack` handles global flows and modals.

```tsx
// app/navigators/AppNavigator.tsx
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = observer(() => {
  const { theme: { colors } } = useAppTheme()
  const { userStore } = useStores()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Conditional rendering based on auth/onboarding */}
      {!userStore.hasCompletedOnboarding && (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      )}

      {/* Nested Tabs */}
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      {/* Modals */}
      <Stack.Screen
        name="RoutineEdit"
        component={RoutineEditScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  )
})
```

## Main Tab Navigator (Bottom Tabs)

The `MainTabNavigator` provides the core app navigation.

```tsx
// app/navigators/MainTabNavigator.tsx
const Tab = createBottomTabNavigator<MainTabParamList>()

export const MainTabNavigator = () => {
  const { theme: { colors } } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.palette.neutral100,
          borderTopColor: colors.separator,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: $tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
```

## Navigation Utilities

We use `navigationRef` for navigating without props (e.g., from outside components or services).

```typescript
// app/navigators/navigationUtilities.ts
export const navigationRef = createNavigationContainerRef<AppStackParamList>()

export function navigate(name: keyof AppStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any)
  }
}
```

## Screen Options Best Practices

1. **Header Visibility**: Usually `headerShown: false` globally, implemented custom in screens with `Header` component.
2. **Safe Area Insets**: Use `useSafeAreaInsets` to adjust `tabBarStyle` height and padding.
3. **Presentation**: Use `presentation: "modal"` or `fullScreenModal` for transient screens like editing or detail views.
4. **Theme Integration**: Pass theme colors to `screenOptions` for a consistent look.
