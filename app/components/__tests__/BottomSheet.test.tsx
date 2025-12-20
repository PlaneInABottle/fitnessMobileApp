import { NavigationContainer } from "@react-navigation/native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "../../theme/context"
import { BottomSheet } from "../BottomSheet"
import { Text } from "../Text"

function renderBottomSheet(props: {
  visible: boolean
  onClose: jest.Mock
  title?: string
  children?: React.ReactNode
}) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <BottomSheet {...props}>{props.children ?? <Text>Test Content</Text>}</BottomSheet>
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("BottomSheet", () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    ;(globalThis as any).__SAFE_AREA_INSETS__ = undefined
  })

  afterEach(() => {
    ;(globalThis as any).__SAFE_AREA_INSETS__ = undefined
  })

  describe("visibility", () => {
    it("renders when visible is true", () => {
      const { getByText } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
      })

      expect(getByText("Test Content")).toBeTruthy()
    })

    it("does not render content when visible is false", () => {
      const { queryByText } = renderBottomSheet({
        visible: false,
        onClose: mockOnClose,
      })

      expect(queryByText("Test Content")).toBeNull()
    })
  })

  describe("title", () => {
    it("renders title when provided", () => {
      const { getByText } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
        title: "Sheet Title",
      })

      expect(getByText("Sheet Title")).toBeTruthy()
    })

    it("does not render title when not provided", () => {
      const { queryByText } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
      })

      expect(queryByText("Sheet Title")).toBeNull()
    })
  })

  describe("backdrop interaction", () => {
    it("calls onClose when backdrop is pressed", () => {
      const { getByTestId } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
      })

      fireEvent.press(getByTestId("bottom-sheet-backdrop"))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe("safe area", () => {
    it("adds bottom inset padding to avoid overlapping system UI", () => {
      ;(globalThis as any).__SAFE_AREA_INSETS__ = { top: 0, bottom: 20, left: 0, right: 0 }

      const { toJSON } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
      })

      function hasPaddingBottom(node: any, paddingBottom: number): boolean {
        if (!node) return false
        const style = node.props?.style
        const styles = Array.isArray(style) ? style : style ? [style] : []
        if (styles.some((s) => s && typeof s === "object" && (s as any).paddingBottom === paddingBottom)) return true
        const children = node.children ?? []
        return children.some((c: any) => (typeof c === "object" ? hasPaddingBottom(c, paddingBottom) : false))
      }

      // spacing.lg (24) + bottom inset (20)
      expect(hasPaddingBottom(toJSON(), 44)).toBe(true)
    })
  })

  describe("children", () => {
    it("renders custom children", () => {
      const { getByText } = renderBottomSheet({
        visible: true,
        onClose: mockOnClose,
        children: <Text>Custom Child Content</Text>,
      })

      expect(getByText("Custom Child Content")).toBeTruthy()
    })
  })
})
