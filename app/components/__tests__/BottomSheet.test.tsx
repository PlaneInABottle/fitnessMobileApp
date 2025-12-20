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
