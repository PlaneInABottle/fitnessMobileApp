import { NavigationContainer } from "@react-navigation/native"
import { render, fireEvent } from "@testing-library/react-native"

import { FilterChip } from "../FilterChip"
import { ThemeProvider } from "../../theme/context"

function renderFilterChip(props: {
  label: string
  active?: boolean
  icon?: "check" | "menu" | "more"
  onPress?: jest.Mock
}) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <FilterChip {...props} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("FilterChip", () => {
  const mockOnPress = jest.fn()

  beforeEach(() => {
    mockOnPress.mockClear()
  })

  describe("rendering", () => {
    it("renders label text", () => {
      const { getByText } = renderFilterChip({
        label: "All Exercises",
      })

      expect(getByText("All Exercises")).toBeTruthy()
    })

    it("renders with active styling when active is true", () => {
      const { getByRole } = renderFilterChip({
        label: "Chest",
        active: true,
      })

      // Check accessibility state
      const chip = getByRole("button")
      expect(chip.props.accessibilityState.selected).toBe(true)
    })

    it("renders with inactive styling when active is false", () => {
      const { getByRole } = renderFilterChip({
        label: "Back",
        active: false,
      })

      const chip = getByRole("button")
      expect(chip.props.accessibilityState.selected).toBe(false)
    })
  })

  describe("interaction", () => {
    it("calls onPress when pressed", () => {
      const { getByText } = renderFilterChip({
        label: "Legs",
        onPress: mockOnPress,
      })

      fireEvent.press(getByText("Legs"))

      expect(mockOnPress).toHaveBeenCalledTimes(1)
    })

    it("does not crash when onPress is not provided", () => {
      const { getByText } = renderFilterChip({
        label: "Arms",
      })

      // Should not throw
      expect(() => fireEvent.press(getByText("Arms"))).not.toThrow()
    })
  })

  describe("accessibility", () => {
    it("has button role", () => {
      const { getByRole } = renderFilterChip({
        label: "Test",
      })

      expect(getByRole("button")).toBeTruthy()
    })

    it("has correct selected state for active chip", () => {
      const { getByRole } = renderFilterChip({
        label: "Active Chip",
        active: true,
      })

      const chip = getByRole("button")
      expect(chip.props.accessibilityState.selected).toBe(true)
    })

    it("has correct selected state for inactive chip", () => {
      const { getByRole } = renderFilterChip({
        label: "Inactive Chip",
        active: false,
      })

      const chip = getByRole("button")
      expect(chip.props.accessibilityState.selected).toBe(false)
    })
  })
})
