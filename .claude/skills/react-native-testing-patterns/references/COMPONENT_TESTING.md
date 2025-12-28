# Component Testing Patterns

This document outlines the patterns for testing React Native components using React Testing Library (RTL).

## Wrap with Providers

Always wrap components with the necessary providers (Theme, Navigation, etc.).

```tsx
import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"
import { NavigationContainer } from "@react-navigation/native"

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        {ui}
      </NavigationContainer>
    </ThemeProvider>
  )
}
```

## Testing Interactions

Use `fireEvent` to simulate user actions.

```tsx
import { fireEvent } from "@testing-library/react-native"

it("calls onPress when clicked", () => {
  const onPress = jest.fn()
  const { getByText } = renderWithProviders(<Button text="Submit" onPress={onPress} />)
  
  fireEvent.press(getByText("Submit"))
  expect(onPress).toHaveBeenCalled()
})
```

## Async Component Testing

Use `waitFor` for elements that appear after an async operation.

```tsx
import { waitFor } from "@testing-library/react-native"

it("shows data after loading", async () => {
  const { getByText, queryByText } = renderWithProviders(<DataLoader />)
  
  expect(queryByText("Loaded Data")).toBeNull()
  
  await waitFor(() => {
    expect(getByText("Loaded Data")).toBeDefined()
  })
})
```

## Mocking Components

Mock complex sub-components or native views to simplify the test.

```tsx
jest.mock("@/components/Icon", () => ({
  Icon: () => "MockIcon"
}))
```

## Best Practices

1. **Avoid Implementation Details**: Test what the user sees, not the internal state of the component.
2. **Accessible Queries**: Prefer `getByText`, `getByLabelText`, or `getByRole` over `testID`.
3. **Keep Tests Focused**: One file per component, covering the main render and interaction cases.
4. **Clean Mocking**: Clear mocks between tests using `jest.clearAllMocks()`.
