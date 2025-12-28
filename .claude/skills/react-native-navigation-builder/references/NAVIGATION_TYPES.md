# Navigation Type Patterns

This document outlines the type-safe navigation patterns used in the Fitness Tracker App.

## Composite Screen Props

When a screen is inside a nested navigator, use `CompositeScreenProps` to allow navigation to screens in parent navigators.

```typescript
// app/navigators/navigationTypes.ts

export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    AppStackScreenProps<keyof AppStackParamList>
  >
```

## Parameter Passing

### Undefined for No Params
```typescript
Home: undefined
```

### Required Object Params
```typescript
RoutineDetail: { routineId: string }
```

### Optional or Partial Params
```typescript
Capture: { editedPhotoUri?: string } | undefined
```

## Using Props in Components

### Functional Component with Props
```tsx
import { observer } from "mobx-react-lite"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

export const MyScreen = observer(function MyScreen(
  props: AppStackScreenProps<"MyScreenName">
) {
  const { navigation, route } = props
  const { someParam } = route.params
  
  return (
    <Button onPress={() => navigation.navigate("OtherScreen")} />
  )
})
```

### Accessing Navigation Hook
If props are not available, use `useNavigation` with types:

```tsx
import { useNavigation } from "@react-navigation/native"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

const navigation = useNavigation<AppStackScreenProps<"MyScreenName">["navigation"]>()
```

## Best Practices

1. **Keep Param Lists Centralized**: All `ParamList` types should live in `navigationTypes.ts`.
2. **Avoid Deep Nesting**: Try to keep navigation as flat as possible for better performance and simpler types.
3. **Use NavigatorScreenParams**: For nested navigators, use `NavigatorScreenParams` in the parent `ParamList`.
4. **Export Props Interfaces**: Always export `IProps` or use the `ScreenProps` helpers for better IDE support.
